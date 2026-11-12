/**
 * src/lib/terra/docs/editor-dom.ts
 * DOM selection, clipboard, and HTML conversion for the Docs editor.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { warn } from '../runtime/runtime.js';

// COMPONENTS
import * as TerraQualityRegex from '../regex.mjs';

// TYPES
import type { EditorSel } from '../runtime/types.js';
import type { EditorView } from '@codemirror/view';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

export const document: Document =
  typeof globalThis !== 'undefined' && typeof globalThis.document !== 'undefined'
    ? globalThis.document
    : (undefined as unknown as Document);

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Reads the browser's current selection when it is a collapsed caret.
 *
 * @return The active zero-width selection range, or `null` when there is no browser selection or it spans text.
 */
export function getCollapsedRange(): Range | null {
  if (typeof window === 'undefined') return null;
  const sel = window.getSelection();
  if (!sel?.rangeCount || !sel.isCollapsed) return null;
  return sel.getRangeAt(0);
}

/**
 * Captures child-node indexes from a root node to a target so the target can be found after DOM updates.
 *
 * @param root - DOM node whose child tree defines the path origin.
 * @param tgt - Descendant node to locate, or `null` when no selection node exists.
 *
 * @return The sequence of child indexes from the root, or `null` when the target is not inside it.
 */
export function captureNodePath(root: Node, tgt: Node | null): number[] | null {
  if (!tgt) return null;
  const path: number[] = [];
  let cur: Node | null = tgt;
  while (cur && cur !== root) {
    if (!cur.parentNode) return null;
    const i = Array.from(cur.parentNode.childNodes).findIndex((c) => c === cur);
    if (i === -1) return null;
    path.unshift(i);
    cur = cur.parentNode;
  }
  return cur === root ? path : null;
}

/**
 * Converts a DOM text position into its character offset within the editor's complete text flow.
 *
 * @param root - Editor element whose text nodes define the linear text flow.
 * @param node - Selected DOM node whose position should be measured.
 * @param offset - Character offset within a text node or child index within an element node.
 *
 * @return The character offset from the beginning of the editor, or `null` if the node is absent or outside it.
 */
export function captureLinearOffset(
  root: HTMLElement,
  node: Node | null,
  offset = 0,
): number | null {
  if (!node) return null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let total = 0;
  let cur = walker.nextNode();
  while (cur) {
    if (cur === (node instanceof Text ? node : (node.childNodes[offset] ?? node)))
      return total + Math.min(offset, cur.textContent?.length ?? 0);
    total += cur.textContent?.length ?? 0;
    cur = walker.nextNode();
  }
  return null;
}

/**
 * Waits for the editor to settle across two animation frames before inserting Markdown in a browser.
 * Outside a browser, insertion runs immediately.
 * @param insert Editor operation that inserts the prepared Markdown.
 * @param md Markdown source to insert.
 * @param selection Saved editor selection to restore before insertion, when available.
 */
export function pasteMd(
  insert: (md: string, rootEnd?: boolean, selection?: EditorSel | null) => void,
  md: string,
  selection?: EditorSel | null,
): void {
  if (typeof window !== 'undefined') {
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => {
        insert(md, false, selection ?? null);
      }),
    );
    return;
  }
  insert(md, false, selection ?? null);
}

/**
 * Finds the CodeMirror view belonging to the currently focused Docs code block.
 *
 * @return The active embedded CodeMirror view, or `null` when focus is elsewhere or the editor is not mounted.
 */
export function codeViewOf(): EditorView | null {
  if (typeof document === 'undefined') return null;
  return (
    (
      (document.activeElement instanceof Element
        ? document.activeElement.closest<HTMLElement>('.docs-code-block .cm-editor')
        : null) as (HTMLElement & { cmView?: { view?: EditorView } }) | null
    )?.cmView?.view ?? null
  );
}

/**
 * Converts raw HTML into structured md, maintaining basic formatting constraints.
 *
 * @param html - Raw HTML to convert into the editor's Markdown representation.
 *
 * @return Markdown text with supported block and inline formatting preserved.
 */
export function htmlToMd(html: string): string {
  if (typeof window === 'undefined') {
    warn('htmlToMd', 'Window context unavailable; returning raw markup.');
    return html;
  }
  const root = new DOMParser().parseFromString(html, 'text/html').body;
  const rendered = new Map<Node, string>();
  const pending: Array<{ node: Node; visited: boolean }> = [{ node: root, visited: false }];
  while (pending.length > 0) {
    const curr = pending.pop()!;
    if (curr.node.nodeType === Node.TEXT_NODE) {
      let text = curr.node.textContent || '';
      // Preserve embedded leaf structure tokens as separate Markdown blocks.
      if (text.includes('|||'))
        text = text.replace(TerraQualityRegex.REGEX_G_REGEX_33(), '\n\n|||\n\n');
      rendered.set(curr.node, text);
      continue;
    }
    if (curr.node.nodeType !== Node.ELEMENT_NODE) {
      rendered.set(curr.node, '');
      continue;
    }
    const element = curr.node as HTMLElement;
    if (!curr.visited) {
      pending.push({ node: curr.node, visited: true });
      for (let i = element.childNodes.length - 1; i >= 0; i--) {
        const child = element.childNodes[i];
        if (child) pending.push({ node: child, visited: false });
      }
      continue;
    }
    const tag = element.tagName.toLowerCase();
    const children = Array.from(element.childNodes)
      .map((c) => rendered.get(c) || '')
      .join('');
    let text = children;
    switch (tag) {
      case 'table':
      case 'thead':
      case 'tbody':
      case 'tfoot':
      case 'tr':
        text = `<${tag}${Array.from(element.attributes)
          .map((a) => ` ${a.name}="${a.value}"`)
          .join('')}>\n${children}\n</${tag}>`;
        break;
      case 'th':
      case 'td':
        text = `<${tag}${Array.from(element.attributes)
          .map((a) => ` ${a.name}="${a.value}"`)
          .join('')}>\n${children.trim()}\n</${tag}>`;
        break;
      case 'h1':
      case 'h2':
        text = `\n## ${children}\n\n`;
        break;
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        text = `\n### ${children}\n\n`;
        break;
      case 'p':
      case 'div':
        text = element.closest('td, th') ? `\n${children}\n` : `\n${children}\n\n`;
        break;
      case 'strong':
      case 'b':
        text = `**${children}**`;
        break;
      case 'em':
      case 'i':
        text = `_${children}_`;
        break;
      case 'u':
        text = `<u>${children}</u>`;
        break;
      case 'del':
      case 's':
        text = `~~${children}~~`;
        break;
      case 'a':
        text = `[${children}](${element.getAttribute('href') || ''})`;
        break;
      case 'code':
        text = element.closest('pre') ? children : `\`${children}\``;
        break;
      case 'pre': {
        const match = element
          .querySelector('code')
          ?.className.match(TerraQualityRegex.REGEX_LANGUAGE_A_Z0_9_I_REGEX());
        text = `\n\`\`\`${match ? match[1] : 'text'}\n${children.trim()}\n\`\`\`\n`;
        break;
      }
      case 'blockquote':
        text = `\n> ${children}\n\n`;
        break;
      case 'ul':
      case 'ol':
        text = `\n${children}\n`;
        break;
      case 'li':
        text = `${element.closest('ul, ol')?.tagName.toLowerCase() === 'ol' ? '1. ' : '- '}${children.trim()}\n`;
        break;
      case 'br':
        text = '\n';
        break;
      case 'img':
        text = `![${element.getAttribute('alt') || 'image'}](${element.getAttribute('src') || ''})`;
        break;
    }
    rendered.set(curr.node, text);
  }
  return (rendered.get(root) || '').replace(TerraQualityRegex.REGEX_N_3_G_REGEX(), '\n\n').trim();
}

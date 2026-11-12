/**
 * src/lib/terra/docs/workspace.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { actions } from '../runtime/action-proxy.js';
import { getHue } from '@terra-symposium/styling';
import { errorMessage, warn } from '../runtime/runtime.js';

// COMPONENTS
import * as TerraQualityRegex from '../regex.mjs';

// TYPES
import type { DocBody, EditorSel, Tree as TreeType } from '../runtime/types.js';
import type { EditorView } from '@codemirror/view';

/*//////////////////////////////////////////////////
GENERAL
//////////////////////////////////////////////////*/

export const ASIDES = ['note', 'tip', 'info', 'example', 'caution', 'danger'];
const ASSET_CHUNK_SIZE_BYTES = 0.9 * 1024 * 1024;
export const document: Document =
  typeof globalThis !== 'undefined' && typeof globalThis.document !== 'undefined'
    ? globalThis.document
    : (undefined as unknown as Document);
/**
 * Converts a display name into the lowercase path segment used by Docs routes.
 *
 * @param name - Document name used to construct the canonical path.
 *
 * @return The lowercase name with each run of non-alphanumeric characters replaced by a hyphen.
 */
export const sanitizeName = (name: string): string =>
  name.replace(TerraQualityRegex.REGEX_A_Z0_9_GI_REGEX(), '-').toLowerCase();
/**
 * Checks whether a Docs path points to an `index.md` or `index.mdx` file.
 *
 * @param path - Docs path to inspect.
 *
 * @return Whether the path ends in an index Markdown filename.
 */
export const isIndexFile = (path: string): boolean =>
  TerraQualityRegex.REGEX_INDEX_MD_MDX_I_REGEX().test(path || '');

/** Subscribes React to an external store and returns its latest snapshot. */
export { useAtom } from './state.js';

/** Runs a remote mutation behind the shared circuit breaker and transition lock. */
export { runMutation } from './mutations.js';

/*//////////////////////////////////////////////////
TREE UTILS
//////////////////////////////////////////////////*/

/**
 * Handles get hue.
 *
 * @param title - Label displayed for the generated colour group.
 * @param hue - Base hue used to derive the colour group.
 */
export { getHue };

/**
 * Returns the original route name for a branch or leaf.
 *
 * @param node - Docs tree node whose key is needed by the rendered tree.
 *
 * @return The original name for branches and leaves, or a generated key for other node types.
 */
export const getStableKey = (node: TreeType): string => {
  if (node.type === 'branch') return node.origName;
  if (node.type === 'leaf') return node.origName;
  return Math.random().toString();
};

/*//////////////////////////////////////////////////
FUNCTIONS
//////////////////////////////////////////////////*/

/**
 * Uploads an asset in bounded chunks and reports progress while the server assembles it.
 *
 * @param file - Browser file to upload.
 * @param dPath - Destination Docs path that owns the uploaded asset.
 * @param opts - Optional image transforms, preview destination, and per-chunk progress callback.
 *
 * @return The saved asset path or URL and any available compression or filename metadata.
 */
export async function uploadAssetChunked(
  file: File,
  dPath: string,
  opts?: {
    resize?: boolean;
    grayscale?: boolean;
    previewAssetPath?: string;
    onProgress?: (data: {
      bytes: number;
      currentChunk: number;
      totalChunks: number;
      message?: string;
    }) => void;
  },
): Promise<{ path?: string; src?: string; compressedSize?: number; name?: string }> {
  const totalChunks = Math.ceil(file.size / ASSET_CHUNK_SIZE_BYTES) || 1;
  let finalAsset: { path?: string; src?: string; compressedSize?: number; name?: string } | null =
    null;
  for (let c = 0; c < totalChunks; c++) {
    const chunk = file.slice(c * ASSET_CHUNK_SIZE_BYTES, (c + 1) * ASSET_CHUNK_SIZE_BYTES);
    const formData = new FormData();
    formData.append('file', new File([chunk], file.name, { type: file.type }));
    formData.append('path', dPath);
    formData.append(
      'fileId',
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    );
    formData.append('chunkIndex', String(c));
    formData.append('totalChunks', String(totalChunks));
    if (opts?.resize) formData.append('resize', 'true');
    if (opts?.grayscale) formData.append('grayscale', 'true');
    if (opts?.previewAssetPath) formData.append('assetPath', opts.previewAssetPath);
    try {
      // native Astro Actions client automatically handles multipart/form-data encoding and routing!
      const { data, error } = await actions.write.asset.upload(formData);
      if (error) throw new Error(errorMessage(error, 'Action rejected the payload'));
      if (c === totalChunks - 1)
        finalAsset = data as {
          path?: string;
          src?: string;
          compressedSize?: number;
          name?: string;
        };
      if (opts?.onProgress)
        opts.onProgress({ bytes: chunk.size, currentChunk: c + 1, totalChunks });
    } catch (err) {
      console.error(`[uploadAssetChunked] Error on chunk ${c}:`, err);
      throw err;
    }
  }
  if (!finalAsset) throw new Error('Upload failed to return final attachment.');
  return finalAsset;
}

/**
 * Handles download.
 *
 * @param filename - Filename input supplied to download's operation.
 * @param content - Content input supplied to download's operation.
 * @param type - Type input supplied to download's operation.
 */
export function download(
  filename: string,
  content: string | ArrayBuffer | Blob,
  type = 'text/plain',
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    warn('download', 'Bypass requested execution; environment window context is dead.');
    return;
  }
  let dlName = filename;
  if (
    type === 'text/markdown' &&
    !dlName.toLowerCase().endsWith('.md') &&
    !dlName.toLowerCase().endsWith('.mdx')
  )
    dlName += '.mdx';
  const href = URL.createObjectURL(
    content instanceof Blob ? content : new Blob([content], { type }),
  );
  const link = document.createElement('a');
  link.href = href;
  link.download = dlName;
  link.click();
  URL.revokeObjectURL(href);
}

/**
 * Reads the browser selection when it is a collapsed caret, such as the Docs editor insertion point.
 *
 * @return The active collapsed range, or `null` when there is no browser selection or the selection spans content.
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
 * Finds the DOM caret range at a character offset in the editor's text flow.
 *
 * @param root - Editor element whose text nodes should be traversed.
 * @param i - Character offset from the start of the editor.
 *
 * @return A collapsed range at the requested offset, or `null` for an invalid or out-of-range offset.
 */
export function resolveLinearOffset(root: HTMLElement, i?: number): Range | null {
  if (typeof i !== 'number' || i < 0) return null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let cur = walker.nextNode();
  let remaining = i;
  while (cur) {
    const len = cur.textContent?.length ?? 0;
    if (remaining <= len) {
      const range = document.createRange();
      range.setStart(cur, Math.min(remaining, len));
      range.collapse(true);
      return range;
    }
    remaining -= len;
    cur = walker.nextNode();
  }
  return null;
}

/**
 * Handles paste md.
 *
 * @param insert - Insert input supplied to paste md's operation.
 * @param md - Md input supplied to paste md's operation.
 * @param selection - Selection input supplied to paste md's operation.
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
 * Adds an import statement when equivalent syntax is not already present in the source text.
 *
 * @param md - Markdown or source text that should receive the import.
 * @param statement - Complete import statement to add when no matching import exists.
 *
 * @return The original text when the import is already present, otherwise the text with the import prepended.
 */
export function withImport(md: string, statement: string): string {
  if (md.includes(statement)) return md;
  // Flexible duplicate protection
  const baseStatementMatch = statement.match(/import\s+(.*?)\s+from\s+['"](.*?)['"]/);
  if (baseStatementMatch) {
    const [, cmp, path] = baseStatementMatch;
    if (new RegExp(`import\\s+${cmp}\\s+from\\s+['"]${path}['"]`).test(md)) return md;
  }
  // Unconditionally append right at the very top of the evaluated string or just below fm boundaries
  if (md.startsWith('---')) {
    const parts = md.split('---');
    // parts[0] is empty, parts[1] is fm, parts[2] is body
    if (parts.length >= 3) {
      parts[2] = `\n${statement}\n` + parts[2];
      return parts.join('---');
    }
  }
  return `${statement}\n\n${md}`;
}

/**
 * Locates the CodeMirror view in the code block that currently has keyboard focus.
 *
 * @return The mounted editor view, or `null` during SSR or when the editor is not mounted.
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

/*//////////////////////////////////////////////////
STORES
//////////////////////////////////////////////////*/

/** Shared attachment types accepted by the docs editor. */
export { ATTCH_TYPES } from './attachments.js';
/** Persistent attachment filter state used by Docs surfaces. */
export { $attachmentFilter } from './attachments.js';

/** Current docs editor mode, persisted across sessions. */
export { $mode } from './state.js';
/** Shares the active leaf title across Docs surfaces. */
export { $leafTitle } from './state.js';
/** Global transition flag for docs navigation and mutations. */
export { $transition } from './state.js';
/** Current toolbar state shared across overlays. */
export { $toolbar } from './state.js';
/** Hydration counter for docs editor widgets. */
export { $hydrating } from './state.js';
/** Surface readiness state for docs editing. */
export { $surfaceReady } from './state.js';
export { $editReadyPath } from './state.js';
/** Shared cursor state used by toolbar focus. */
export { $cursor } from './state.js';
/** Persisted caret snapshot used for the simulated cursor overlay. */
export { $cursorGhost } from './state.js';
/** Linear caret bookmark used by the simulated cursor. */
export { $cursorTrack } from './state.js';
/** Cursor position snapshot for the docs editor. */
export { $cursorPosition } from './state.js';
/** Unsaved docs draft flags, keyed by document id. */
export { $unsavedDrafts } from './state.js';
/** In-memory docs draft cache. */
export { memoryDrafts } from './state.js';
/** Sidebar visibility state for the docs editor. */
export { $sidebar } from './state.js';

/** Shared transition store for Docs UI coordination. */
export { transitionStore } from './state.js';
/** Sets the active Docs transition state. */
export { setTransition } from './state.js';
/** Clears the active Docs transition state. */
export { clearTransition } from './state.js';
/** Subscribes to the current Docs transition state. */
export { useTransitionState } from './state.js';
/** Shared editor transition context. */
export { TransitionCtx } from './state.js';
/** Context for Docs edit state. */
export { EditStateCtx } from './state.js';
/** Context for the Docs editor surface. */
export { EditorSurfaceCtx } from './state.js';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

// UTILITIES
/**
 * Handles extract all node ids.
 *
 * @param nodes - Graph nodes rendered and updated by extract all node ids.
 *
 * @return All unique ids discovered in the tree.
 *
 * @remarks Collects every node identifier from a tree of docs entries.
 */
export function extractAllNodeIds(nodes: TreeType[]): string[] {
  const ids: string[] = [];
  const pending = [...nodes].reverse();
  while (pending.length > 0) {
    const node = pending.pop()!;
    if (node.origName) ids.push(node.origName);
    if (node.type === 'leaf' && node.path) ids.push(node.path);
    if (node.type === 'branch' && node.children) {
      for (let i = node.children.length - 1; i >= 0; i--) {
        const child = node.children[i];
        if (child) pending.push(child);
      }
    }
  }
  return [...new Set(ids)];
}

/*//////////////////////////////////////////////////
READINESS
//////////////////////////////////////////////////*/

/** Tracks expected and mounted editor blocks for the active document. */
export { $editorMounts } from './state.js';
/** Resets editor mount tracking for a document. */
export { resetEditorMounts } from './state.js';
/** Records an editor block mount for the active document. */
export { setEditorMount } from './state.js';

/*//////////////////////////////////////////////////
NAVIGATION
//////////////////////////////////////////////////*/

/**
 * Preserves a current route when the proposed route is one of its deeper descendants.
 *
 * @param curr - Current Docs route.
 * @param n - Proposed Docs route.
 *
 * @return The current route when it contains the proposed route as a suffix; otherwise the proposed route.
 */
export const keepDeepPath = (curr: string, n: string): string => {
  // prettier-ignore
  const cur = curr.replace(TerraQualityRegex.REGEX_DOCS_REGEX(), '').replace(TerraQualityRegex.REGEX_PATTERN_REGEX_3(), '').split('/').filter(Boolean);
  // prettier-ignore
  const nxt = n.replace(TerraQualityRegex.REGEX_DOCS_REGEX(), '').replace(TerraQualityRegex.REGEX_PATTERN_REGEX_3(), '').split('/').filter(Boolean);
  if (!nxt.length) return n;
  if (cur.length > nxt.length && cur.slice(cur.length - nxt.length).join('/') === nxt.join('/'))
    return curr;
  return n;
};

/**
 * Checks whether a value is an array of Portable Text document blocks.
 *
 * @param val - Value to validate.
 *
 * @return Whether every array item is an object with a Portable Text `_type` field.
 */
export const isDocBody = (val: unknown): val is DocBody =>
  Array.isArray(val) && val.every((b) => b && typeof b === 'object' && '_type' in b);

/*//////////////////////////////////////////////////
TOOLBAR
//////////////////////////////////////////////////*/

const VAL_BY_KIND: Record<string, string> = {
  Aside: 'aside',
  DocsTable: 'table',
  Nodes: 'nodes',
  attachment: 'attachment',
  callout: 'aside',
  component: 'component',
  math: 'math',
  table: 'table',
  tsdocs: 'tsdocs',
};

/**
 * Determines which Docs toolbar block is active at the current editor selection.
 *
 * @param el - Focused element inside the active Docs editor.
 * @param vals - Supported block kinds that may be returned for custom content.
 *
 * @return The active block kind, or `null` when the selection is outside a supported block.
 */
export function toolbarFocusValue(el: Element, vals: readonly string[]): string | null {
  const text = el.closest('h1, h2, h3, h4, h5, h6, p');
  if (text) return text.tagName.toLowerCase();
  if (el.closest('td, th')?.closest('[data-docs-editor-block="DocsTable"], [data-block="table"]'))
    return 'p';
  const block = el.closest(
    '[data-docs-editor-block], [data-block], .docs-math-wrapper, [data-math-code], [data-docs-view-root="true"]',
  );
  if (!block) return null;
  const kind =
    block.getAttribute('data-docs-editor-block') ?? block.getAttribute('data-block') ?? '';
  if (kind && VAL_BY_KIND[kind]) return VAL_BY_KIND[kind];
  if (kind && vals.includes(kind.toLowerCase())) return kind.toLowerCase();
  if (block.matches('.docs-math-wrapper, [data-math-code]')) return 'math';
  return block.matches('[data-docs-view-root="true"]') ? 'component' : null;
}

/**
 * src/components/terra/editor/docs/_CodeBlock.tsx
 * Shared Docs CodeMirror renderer.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { $hydrating, $transition } from '../../../../lib/terra/docs/state.js';
import { cn, isDarkMode, logErr } from '../../../../lib/terra/runtime/runtime.js';
import {
  copyLineDown,
  copyLineUp,
  cursorLineBoundaryBackward,
  cursorLineBoundaryForward,
  history,
  historyKeymap,
  indentWithTab,
  moveLineDown,
  moveLineUp,
  selectLineBoundaryBackward,
  selectLineBoundaryForward,
  standardKeymap,
} from '@codemirror/commands';
import { drawSelection, keymap, lineNumbers, placeholder as cmPlaceholder } from '@codemirror/view';
import { githubLight } from '@uiw/codemirror-theme-github';
import { htmlToMd } from '../../../../lib/terra/docs/editor-dom.js';
import { indentUnit } from '@codemirror/language';
import { isEndpointVal } from '../../../../lib/terra/runtime/shared.js';
import { languages } from '@codemirror/language-data';
import { markdown } from '@codemirror/lang-markdown';
import {
  mdTableToHtml,
  stringifyCodeValue,
} from '../../../../lib/terra/runtime/content/markdown.js';
import { oneDark } from '@codemirror/theme-one-dark';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// COMPONENTS
import * as TerraQualityRegex from '../../../../lib/terra/regex.mjs';
import {
  AlertError,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@terra-symposium/styling/ui';
import { Checkmark as CheckIcon, Copy as CopyIcon } from '@carbon/icons-react';
import { Compartment, EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { ErrorBoundary } from '../../ui.js';

// TYPES
import type { Extension } from '@codemirror/state';
import type { JSX } from 'react';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/**
 * Supported programming languages for code blocks.
 *
 * @remarks Used to initialize the CodeMirror environment correctly.
 */
const LANGS = [
  'text',
  'astro',
  'bash',
  'css',
  'html',
  'javascript',
  'json',
  'jsx',
  'math',
  'mdx',
  'shell',
  'typescript',
  'tsx',
  'yaml',
] as const;
const light = [githubLight] satisfies Extension[];
const dark = [oneDark] satisfies Extension[];
const codeSrcCache = new Map<string, Promise<string>>();
/**
 * Re-measures a CodeMirror view so it expands to fit its rendered content.
 *
 * @param v - The target CodeMirror view reference.
 *
 * @return No value; the view's content height is applied to its editor and scroll surface.
 *
 * @remarks Hidden editors can report zero dimensions until visible, so this requests a fresh measurement.
 */
const expand = (v: EditorView | null): void => {
  if (!v) return;
  // Keep the code block editor's measured viewport aligned with its rendered content.
  if ((v as EditorView & { viewState?: { printing: boolean } }).viewState)
    (v as EditorView & { viewState?: { printing: boolean } }).viewState!.printing = true;
  v.requestMeasure({
    read: (v) => Math.ceil(v.contentHeight),
    write: (h, v) => {
      v.dom.style.height = `${h}px`;
      v.scrollDOM.style.height = `${h}px`;
    },
  });
};

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Reserves space for a Docs code block while its remote source is loading.
 *
 * @param src Optional source identifier copied to the placeholder for deferred-block matching.
 *
 * @return The loading placeholder.
 */
function BlockSkeleton({ source: src }: { source?: string }): JSX.Element {
  return (
    <div
      className="h-24 w-full animate-pulse rounded-sm bg-primary-3"
      data-docs-block-skeleton
      data-docs-code-source={src}
    />
  );
}

/**
 * Normalizes a language name for CodeMirror, using plain text when no name is supplied.
 *
 * @param v - The unformatted language identifier.
 *
 * @return The resolved language name string.
 *
 * @remarks The normalized value is used for editor extensions and language comparisons.
 */
function langOf(v: string): string {
  return v?.trim().toLowerCase() || 'text';
}

/**
 * Renders Docs code as a read-only preview or an editable CodeMirror surface with optional remote-source controls.
 *
 * @param blockOptions Code content, language, display mode, remote-source, and editing options.
 * @param blockOptions.code Source text or serialized code value to display.
 * @param blockOptions.language CodeMirror language identifier for the source.
 * @param blockOptions.tone Selects a read-only preview or editable CodeMirror controls.
 * @param blockOptions.source Optional endpoint used to load remote code.
 * @param blockOptions.className Optional classes applied to the block container.
 * @param blockOptions.placeholder Placeholder shown when the editor has no code.
 * @param blockOptions.docsSource Enables normalization of embedded Docs `<Code>` source.
 * @param blockOptions.expandAll Expands every source line in the editable view.
 * @param blockOptions.fullHeight Lets the editor fill the available vertical space.
 * @param blockOptions.languageEditable Controls whether edit mode can change the selected language.
 * @param blockOptions.readOnly Blocks edits even when the selected tone is editable.
 * @param blockOptions.onCodeChange Receives each change made to the source text.
 * @param blockOptions.onCommit Receives a committed source and language pair.
 * @param blockOptions.onLanguageChange Receives a language selection and current code value.
 *
 * @return A code block with highlighted preview content or interactive CodeMirror controls.
 *
 * @remarks View mode can resolve remote sources through the host adapter. Remote responses remain separate from authored source until converted, and edit mode commits only through caller callbacks.
 */
export function CodeBlock(
  blockOptions:
    | {
        className?: string;
        code?: unknown;
        docsSource?: boolean;
        language: string;
        source?: string;
        tone: 'edit';
        placeholder?: string;
        expandAll?: boolean;
        fullHeight?: boolean;
        languageEditable?: boolean;
        readOnly?: boolean;
        onCodeChange?: (code: string) => void;
        onCommit?: (code: string, language: string) => void;
        onLanguageChange?: (language: string, code: string) => void;
      }
    | {
        className?: string;
        code?: unknown;
        docsSource?: boolean;
        language: string;
        source?: string;
        tone: 'view';
        placeholder?: string;
      },
): JSX.Element {
  // STATES
  const src =
    blockOptions.source?.trim() ||
    (typeof blockOptions.code === 'string' && isEndpointVal(blockOptions.code)
      ? blockOptions.code.trim()
      : '');
  const locked = blockOptions.tone === 'view' || blockOptions.readOnly === true;
  const docsSrc = blockOptions.docsSource === true;
  // Keep intentional leading/trailing newlines. Stripping them here causes a
  // controlled Docs editor to undo a CodeMirror Enter transaction on rerender.
  // Portable Text `code.value` is already the authored source. Decoding escape
  // sequences here changes valid code such as `"Hello\\n"` into multiple
  // rendered lines. Only the Docs source serializer needs the legacy unwrapping.
  const code =
    typeof blockOptions.code === 'string' && !blockOptions.docsSource
      ? blockOptions.code
      : stringifyCodeValue(blockOptions.code);
  const viewCode = docsSrc
    ? code.replace(
        /<Code\b([\s\S]*?)>(?:\s*\{`((?:\\.|[^`])*)`\}\s*|\s*([\s\S]*?)\s*)<\/Code>/g,
        (_match, p, e, v) => {
          return `\n<Code${p}>\n${/* prettier-ignore */ e !== undefined ? e.replace(TerraQualityRegex.REGEX_G_REGEX_11(), '$1').replace(TerraQualityRegex.REGEX_N_G_REGEX_2(), '\n') : (v || '').trim()}\n</Code>\n`;
        },
      )
    : code;
  const [copied, setCopied] = useState(false);
  const [resCode, setResCode] = useState(() => viewCode);
  const [receivedState, setReceivedState] = useState<'error' | 'loading' | 'received'>(
    src ? 'loading' : 'received',
  );
  const [receivedErr, setReceivedErr] = useState('');

  // REFS
  const host = useRef<HTMLDivElement>(null);
  const received = useRef<HTMLElement>(null);
  const view = useRef<EditorView | null>(null);
  const theme = useRef(new Compartment());
  /**
   * Returns the displayed code.
   *
   * @return Current displayed code.
   */
  const codeVal = (): string => viewCode;
  const codeRef = useRef(resCode);
  const langRef = useRef(langOf(blockOptions.language));
  const chgRef = useRef(blockOptions.tone === 'edit' ? blockOptions.onCodeChange : undefined);
  const cmtRef = useRef(blockOptions.tone === 'edit' ? blockOptions.onCommit : undefined);

  // SYNC REFS
  chgRef.current = blockOptions.tone === 'edit' ? blockOptions.onCodeChange : undefined;
  cmtRef.current = blockOptions.tone === 'edit' ? blockOptions.onCommit : undefined;
  codeRef.current = resCode;
  langRef.current = langOf(blockOptions.language);

  // DERIVED
  const curLang = langOf(blockOptions.language);
  const expAll = 'expandAll' in blockOptions && blockOptions.expandAll === true;
  const fullHeight = blockOptions.tone === 'edit' && blockOptions.fullHeight === true;

  // RENDER HELPERS

  // EFFECTS
  useEffect(() => {
    const n = codeVal();
    if (!src) {
      setResCode(n);
      setReceivedState('received');
      setReceivedErr('');
      return;
    }
    setResCode(n);
    setReceivedState('loading');
    setReceivedErr('');
    let a = true;
    const req =
      codeSrcCache.get(src) ??
      fetch(new URL(src, window.location.origin).toString(), {
        headers: { Accept: 'application/json, text/plain, */*' },
      }).then(async (r) => {
        const text = (await r.text()).trimEnd();
        if (!r.ok) {
          throw new Error(
            (() => {
              try {
                const val = JSON.parse(text) as { error?: unknown };
                return typeof val.error === 'string'
                  ? val.error
                  : `Endpoint request failed: ${r.status}`;
              } catch {
                return text || `Endpoint request failed: ${r.status}`;
              }
            })(),
          );
        }
        return text;
      });
    codeSrcCache.set(src, req);
    if (codeSrcCache.size > 32 && codeSrcCache.keys().next().value !== undefined)
      codeSrcCache.delete(codeSrcCache.keys().next().value as string);
    void req.then(
      (t) => {
        if (!a) return;
        setResCode(t);
        setReceivedState('received');
      },
      (e) => {
        codeSrcCache.delete(src);
        if (!a) return;
        const msg = e instanceof Error ? e.message : 'Unable to receive the API value.';
        logErr('DocsCode', `Failed to receive ${src}`, { message: msg });
        setResCode(n);
        setReceivedErr(msg);
        setReceivedState('error');
      },
    );
    return () => {
      a = false;
    };
  }, [docsSrc, blockOptions.code, blockOptions.source, src]);
  useEffect(() => {
    if (blockOptions.tone === 'view') return;
    let a = true;
    let aEnterHandler: ((event: KeyboardEvent) => void) | undefined;
    $hydrating.set($hydrating.get() + 1);
    const hydration = {
      finished: false,
      fallback: undefined as ReturnType<typeof setTimeout> | undefined,
      release: () => {
        if (hydration.finished) return;
        hydration.finished = true;
        if (hydration.fallback) clearTimeout(hydration.fallback);
        hydration.fallback = undefined;
        $hydrating.set(Math.max(0, $hydrating.get() - 1));
      },
    };
    hydration.fallback = setTimeout(() => hydration.release(), 3000);
    void (async () => {
      if (src) {
        hydration.release();
        return;
      }
      if (!host.current) return;
      const n = host.current;
      let exts: Promise<Extension[]> | Extension[] = (async (): Promise<Extension[]> => {
        const lang = langOf(langRef.current);
        if (lang === 'md' || lang === 'markdown' || lang === 'mdx') return [markdown()];
        const parser = languages.find(
          (e) =>
            e.name.toLowerCase() === lang ||
            e.extensions.some((extension) => extension.toLowerCase() === lang),
        );
        if (!parser) return [];
        try {
          return [await parser.load()];
        } catch {
          return [];
        }
      })();
      exts = await exts;
      if (!a) return;
      view.current?.destroy();
      n.replaceChildren();
      const editorView = new EditorView({
        parent: n,
        state: EditorState.create({
          doc: codeRef.current,
          extensions: [
            theme.current.of(isDarkMode() ? dark : light),
            drawSelection(),
            history(),
            lineNumbers(),
            indentUnit.of('\t'),
            EditorState.allowMultipleSelections.of(true),
            ...(blockOptions.placeholder ? [cmPlaceholder(blockOptions.placeholder)] : []),
            keymap.of([
              ...standardKeymap,
              ...historyKeymap,
              {
                key: 'Mod-ArrowLeft',
                run: cursorLineBoundaryBackward,
                shift: selectLineBoundaryBackward,
              },
              {
                key: 'Mod-ArrowRight',
                run: cursorLineBoundaryForward,
                shift: selectLineBoundaryForward,
              },
              {
                key: 'Mod-Shift-l',
                run: (view) => {
                  const selectedLines = new Set<number>();
                  for (const range of view.state.selection.ranges) {
                    for (
                      let line = view.state.doc.lineAt(range.from).number;
                      line <=
                      view.state.doc.lineAt(
                        range.empty ? range.to : Math.max(range.to - 1, range.from),
                      ).number;
                      line++
                    )
                      selectedLines.add(line);
                  }
                  if (
                    !selectedLines.size ||
                    (selectedLines.size === 1 &&
                      view.state.selection.ranges.length === 1 &&
                      view.state.selection.main.empty)
                  )
                    return false;
                  view.dispatch({
                    selection: EditorSelection.create(
                      Array.from(selectedLines, (line) =>
                        EditorSelection.cursor(view.state.doc.line(line).to),
                      ),
                    ),
                    scrollIntoView: true,
                    userEvent: 'select',
                  });
                  return true;
                },
              },
              { key: 'Alt-ArrowUp', run: (view) => moveLineUp(view) },
              { key: 'Alt-ArrowDown', run: (view) => moveLineDown(view) },
              { key: 'Shift-Alt-ArrowUp', run: (view) => copyLineUp(view) },
              { key: 'Shift-Alt-ArrowDown', run: (view) => copyLineDown(view) },
              indentWithTab,
            ]),
            ...(locked || src
              ? [EditorState.readOnly.of(true), EditorView.editable.of(false)]
              : []),
            ...(Array.isArray(exts) ? exts : []),
            EditorView.updateListener.of((u) => {
              const lineSet = new Set<number>();
              for (const r of u.state.selection.ranges) {
                for (
                  let n = u.state.doc.lineAt(r.from).number - 1;
                  n <= u.state.doc.lineAt(r.empty ? r.to : Math.max(r.to - 1, r.from)).number - 1;
                  n++
                )
                  lineSet.add(n);
              }
              if (lineSet.size > 1) {
                u.view.dom.setAttribute(
                  'data-docs-multicursor',
                  JSON.stringify({
                    lines: Array.from(lineSet).sort((a, b) => a - b),
                  }),
                );
              } else u.view.dom.removeAttribute('data-docs-multicursor');
              if (!u.docChanged || blockOptions.tone !== 'edit' || src || blockOptions.readOnly)
                return;
              codeRef.current = u.state.doc.toString();
              chgRef.current?.(codeRef.current);
            }),
            EditorView.domEventHandlers({
              blur: () => {
                if (blockOptions.tone !== 'edit' || blockOptions.readOnly) return;
                cmtRef.current?.(codeRef.current, langRef.current);
              },
              paste: (evt, v) => {
                if (blockOptions.tone !== 'edit' || blockOptions.readOnly) return false;
                if (!evt.clipboardData) return false;
                const html = evt.clipboardData.getData('text/html'),
                  plain = evt.clipboardData.getData('text/plain'),
                  types = Array.from(evt.clipboardData.types ?? []),
                  isVSCode = types.includes('vscode-editor-data');
                if (html && !isVSCode) {
                  const md = htmlToMd(html);
                  if (md && md !== plain) {
                    evt.preventDefault();
                    v.dispatch({
                      changes: {
                        from: v.state.selection.main.from,
                        to: v.state.selection.main.to,
                        insert: md,
                      },
                      selection: {
                        anchor: v.state.selection.main.from + md.length,
                      },
                      scrollIntoView: true,
                    });
                    return true;
                  }
                }
                if (plain) {
                  let transformed = plain,
                    changed = false;
                  if (transformed.includes('/`/`/`')) {
                    transformed = transformed.replaceAll('/`/`/`', '```');
                    changed = true;
                  }
                  if (transformed.includes('&grave;')) {
                    transformed = transformed.replaceAll('&grave;', '&amp;grave;');
                    changed = true;
                  }
                  const table = mdTableToHtml(transformed);
                  if (table) {
                    transformed = table;
                    changed = true;
                  }
                  if (changed) {
                    evt.preventDefault();
                    v.dispatch({
                      changes: {
                        from: v.state.selection.main.from,
                        to: v.state.selection.main.to,
                        insert: transformed,
                      },
                      selection: {
                        anchor: v.state.selection.main.from + transformed.length,
                      },
                      scrollIntoView: true,
                    });
                    return true;
                  }
                }
                return false;
              },
            }),
          ],
        }),
      });
      /**
       * Inserts a newline directly into CodeMirror when Enter reaches the editable surface.
       *
       * @param event Keyboard event used to detect and consume Enter.
       * @returns No value; ignored keys pass through to CodeMirror's normal handlers.
       */
      const onCodeEnter = (event: KeyboardEvent): void => {
        if (event.key !== 'Enter' || blockOptions.tone !== 'edit' || blockOptions.readOnly || src)
          return;
        const aView = view.current;
        if (!aView) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const { from, to } = aView.state.selection.main;
        aView.dispatch({
          changes: { from, to, insert: '\n' },
          selection: { anchor: from + 1 },
          scrollIntoView: true,
          userEvent: 'input.type',
        });
      };
      aEnterHandler = onCodeEnter;
      editorView.contentDOM.addEventListener('keydown', onCodeEnter, true);
      view.current = editorView;
      (editorView.dom as HTMLDivElement & { cmView?: { view: EditorView } }).cmView = {
        view: editorView,
      };
      if (expAll) {
        expand(view.current);
        queueMicrotask(() => {
          expand(view.current);
        });
        requestAnimationFrame(() => {
          expand(view.current);
          view.current?.requestMeasure();
          setTimeout(() => {
            expand(view.current);
            view.current?.requestMeasure();
          }, 250);
        });
      } else requestAnimationFrame(() => view.current?.requestMeasure());
      if (document.fonts) {
        try {
          await document.fonts.ready;
        } catch {
          // Font readiness is an optional measurement optimization.
        }
      }
      if (a) view.current?.requestMeasure();
      hydration.release();
    })();
    return () => {
      a = false;
      hydration.release();
      if (view.current) {
        if (aEnterHandler)
          view.current.contentDOM.removeEventListener('keydown', aEnterHandler, true);
        delete (view.current.dom as HTMLDivElement & { cmView?: { view: EditorView } }).cmView;
      }
      view.current?.destroy();
      view.current = null;
    };
  }, [expAll, locked, blockOptions.language, blockOptions.tone, src]);
  useEffect(() => {
    return $transition.listen((i) => {
      if (!i && view.current)
        requestAnimationFrame(() => {
          if (expAll) expand(view.current);
          view.current?.requestMeasure();
          setTimeout(() => {
            if (expAll) expand(view.current);
            view.current?.requestMeasure();
          }, 250);
        });
    });
  }, [expAll]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    /**
     * Synchronises the editor theme with the system preference.
     *
     * @return Nothing.
     */
    const m = window.matchMedia('(prefers-color-scheme: dark)'),
      sync = (): void => {
        if (!view.current) return;
        view.current.dispatch({
          effects: theme.current.reconfigure(isDarkMode() ? dark : light),
        });
      };
    sync();
    m.addEventListener('change', sync);
    return () => {
      m.removeEventListener('change', sync);
    };
  }, []);
  useEffect(() => {
    const n = codeVal();
    if (!view.current || view.current?.state.doc.toString() === n) return;
    view.current.dispatch({
      changes: { from: 0, to: view.current.state.doc.length, insert: n },
    });
    codeRef.current = n;
    if (expAll) expand(view.current);
    view.current.requestMeasure();
  }, [expAll, blockOptions.code]);
  useEffect(() => {
    if (!src || !view.current || view.current?.state.doc.toString() === resCode) return;
    view.current.dispatch({
      changes: { from: 0, to: view.current.state.doc.length, insert: resCode },
    });
    codeRef.current = resCode;
    if (expAll) expand(view.current);
    view.current.requestMeasure();
  }, [expAll, resCode, src]);
  useLayoutEffect(() => {
    if (received.current && received.current.textContent !== resCode)
      received.current.textContent = resCode;
  }, [resCode]);
  useEffect(() => {
    if (!host.current || typeof ResizeObserver === 'undefined') return;
    let frame = 0;
    const obs = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => view.current?.requestMeasure());
    });
    obs.observe(host.current);
    return () => {
      cancelAnimationFrame(frame);
      obs.disconnect();
    };
  }, []);

  // RENDER
  return (
    <ErrorBoundary name="CodeBlock">
      <div
        className={cn(
          'docs-code-block relative mb-10 mt-0 flow-root w-full max-w-full overflow-hidden rounded-sm border border-primary-6 bg-primary-1',
          '[&_.cm-editor]:!h-auto [&_.cm-editor]:!max-h-none [&_.cm-editor]:!bg-primary-1',
          '[&_.cm-scroller]:!h-auto [&_.cm-scroller]:!max-h-none [&_.cm-scroller]:overflow-x-auto [&_.cm-scroller]:overflow-y-hidden',
          '[&_.cm-scroller]:!text-[13px] [&_.cm-scroller]:!leading-[16px]',
          '[&_.cm-content]:!my-0 [&_.cm-content]:!min-h-0 [&_.cm-content]:whitespace-pre [&_.cm-content]:break-normal',
          '[&_.cm-line]:!min-h-[16px]',
          '[&_.cm-gutters]:!border-r [&_.cm-gutters]:!border-r-primary-6 [&_.cm-gutters]:!bg-primary-1 [&_.cm-gutters]:!text-primary-10',
          '[&_.cm-gutterElement]:!font-mono [&_.cm-gutterElement]:!text-[13px] [&_.cm-gutterElement]:!tabular-nums',
          fullHeight &&
            'flex min-h-[50vh] flex-col [&_.cm-editor]:!min-h-[calc(50vh-1.75rem)] [&_.cm-scroller]:!min-h-[calc(50vh-1.75rem)]',
          'transition-all duration-200',
          blockOptions.className,
        )}
        data-docs-code-block={blockOptions.tone}
        data-docs-code-editor
        data-docs-code-source={src || 'local'}
        contentEditable={blockOptions.tone === 'edit' ? false : undefined}
        suppressContentEditableWarning
      >
        <div className="docs-code-block-header flex items-center justify-between gap-2 border-b border-primary-6 bg-primary-2 px-2 py-px">
          {blockOptions.tone === 'view' ||
          !(blockOptions.tone === 'edit'
            ? blockOptions.languageEditable !== false && !src
            : false) ? (
            <p className="!my-0 text-xs font-medium text-primary-11">{langOf(curLang)}</p>
          ) : (
            <Select
              size="xs"
              value={curLang}
              onValueChange={(v) => {
                langRef.current = langOf(v);
                blockOptions.onLanguageChange?.(langRef.current, codeRef.current);
              }}
            >
              <SelectTrigger aria-label="Select code language">
                <span aria-label={curLang}>{langOf(curLang)}</span>
              </SelectTrigger>
              <SelectContent align="start">
                {(LANGS.includes(langOf(blockOptions.language) as (typeof LANGS)[number])
                  ? LANGS
                  : [...LANGS, langOf(blockOptions.language)]
                ).map((v) => (
                  <SelectItem key={v} value={v}>
                    {langOf(v)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            size="xs"
            className="aspect-square size-6"
            aria-label={copied ? 'Copied' : 'Copy'}
            title={copied ? 'Copied' : 'Copy'}
            onClick={() => {
              void navigator.clipboard
                .writeText(src ? received.current?.textContent || resCode : resCode)
                .then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1200);
                });
            }}
          >
            {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
          </Button>
        </div>
        <div
          {...(!src && { ref: host })}
          className={cn(
            'docs-code-block-body w-full max-w-full overflow-x-auto overflow-y-hidden text-inherit',
            fullHeight && 'min-h-0 flex-1',
          )}
        >
          {src ? (
            <div
              className="min-w-0 max-w-full"
              data-docs-code-source={src}
              data-state={receivedState}
            >
              <div hidden={receivedState !== 'loading'} className="p-3">
                <BlockSkeleton source={src} />
              </div>
              <div hidden={receivedState !== 'error'}>
                <AlertError title="API value unavailable" description={receivedErr} />
              </div>
              <code
                ref={received}
                hidden={receivedState !== 'received'}
                className="block whitespace-pre p-3"
                data-docs-code-received
                data-docs-code-source={src}
                data-state={receivedState}
              />
            </div>
          ) : (
            <div className="min-w-0 max-w-full overflow-x-auto overflow-y-hidden">
              {
                /* prettier-ignore */ blockOptions.tone === 'view' ? (
		<div className='docs-code-block-fb m-0 flex max-w-full flex-col overflow-x-auto overflow-y-hidden bg-transparent p-0 text-sm leading-6' data-docs-code-fb='true'>
			{(blockOptions.tone === 'view' ? resCode.replace(TerraQualityRegex.REGEX_R_N_G_REGEX(), '\n').split('\n') : []).map((l, i) => (
				<div key={i} className='docs-code-block-fallback-line flex min-w-full text-sm leading-6'>
					<div className='min-w-10 shrink-0 select-none border-r border-primary-6 px-2 text-right font-mono tabular-nums leading-6 text-primary-10'>{i + 1}</div>
					<span className='block whitespace-pre px-1 leading-6 text-inherit'>{l || ' '}</span>
				</div>
			))}
		</div>
	) : <div className='docs-code-block-fb m-0 max-w-full overflow-x-auto overflow-y-hidden whitespace-pre bg-transparent p-0 text-inherit' data-docs-code-fb='true'>{resCode}</div>
              }
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
Object.assign(BlockSkeleton, { displayName: 'DocsCodeBlockSkeleton' });

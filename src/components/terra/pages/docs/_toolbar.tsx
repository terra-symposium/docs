/**
 * src/components/terra/pages/docs/_toolbar.tsx
 * Shared UI components, toolbars, and context menus for the visual MDX Editor.
 * Folder boundary: editor chrome and commands; document state, block rendering, and navigation remain outside this module.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { $attachmentFilter } from '../../../../lib/terra/docs/attachments.js';
import { $createHeadingNode } from '@lexical/rich-text';
import { $createParagraphNode, $getNearestNodeFromDOMNode, $isElementNode } from 'lexical';
import { actions } from '../../../../lib/terra/runtime/action-proxy.js';
import { clearTransition, setTransition, useAtom } from '../../../../lib/terra/docs/state.js';
import { cn, notify } from '../../../../lib/terra/runtime/runtime.js';
import { codeViewOf } from '../../../../lib/terra/docs/editor-dom.js';
import { components as repoComponents } from '../../../../lib/terra/custom-components.js';
import { dirname, docsRootPath } from '../../../../lib/terra/runtime/shared.js';
import { getDocsHostAdapter } from '../../../../lib/host-runtime.js';
import { isDocBody } from '../../../../lib/terra/runtime/types.js';
import { redo, redoDepth, undo, undoDepth } from '@codemirror/commands';
import { stringifyDocBody } from '../../../../lib/terra/runtime/content/document-markdown.js';
import { DOCS_LAYOUT_CLASSES } from '../../../../lib/terra/layout-classes.js';
import { toast } from 'sonner';
import { toolbarFocusValue } from '../../../../lib/terra/docs/toolbar.js';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useDocsQuizContext } from '../../../quiz.js';
import type { JSX } from 'react';

// COMPONENTS
import * as TerraQualityRegex from '../../../../lib/terra/regex.mjs';
import React from 'react';
import {
  ArrowLeft as LeftArrowIcon,
  ArrowRight as RightArrowIcon,
  ArrowUpRight as PopOutIcon,
  ButtonCentered as FullWordIcon,
  CaretDown as CaretDownIcon,
  CharacterPatterns as ReplaceIcon,
  CharacterSentenceCase as CaseIcon,
  DataShare as ShareIcon,
  Image as ImageIcon,
  Link as LinkIcon,
  ListBulleted as BulletListIcon,
  ListNumbered as NumberListIcon,
  Paste as PasteIcon,
  Redo as RedoIcon,
  RepoSourceCode as ModuleIcon,
  Search as SearchIcon,
  Task as CheckListIcon,
  TextBold as BoldIcon,
  TextFont as TextFontIcon,
  TextItalic as ItalicIcon,
  TextStrikethrough as StrikethroughIcon,
  TextUnderline as UnderlineIcon,
  Undo as UndoIcon,
} from '@carbon/icons-react';
import {
  Button as UiButton,
  ButtonGroup,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SearchEmpty,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  TextTooltip,
  Textarea,
  Toggle,
  ToggleGroup,
  ToggleGroupItem,
  TooltipProvider,
} from '@terra-symposium/styling/ui';
import { CodeBlock } from '../../editor/docs/_CodeBlock.js';
import { DocsQuizGenerator } from '../../../quiz.js';
import { EditStateCtx } from '../../../../lib/terra/docs/state.js';
import { ErrorBoundary } from '../../ui.js';

// DATA
import { ATTCH_TYPES } from '../../../../lib/terra/docs/attachments.js';
import { DOCS_BLOCK_ICONS } from './_icons.js';
import { EMPTY_NODES } from '../../../../lib/terra/runtime/nodes.js';

// TYPES
import type {
  AttchType,
  BlockOpt,
  DocBody,
  DocVer,
  EditorToolbarAdapter,
  Md,
  MenuTree,
  Mode as ToolbarMode,
  RepoComponentWithLabel,
  ToolbarState,
  Tree,
} from '../../../../lib/terra/runtime/types.js';
import type { LexicalEditor, LexicalNode } from 'lexical';
import type { ComponentType, MouseEvent, ReactNode } from 'react';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const FIND_WORD = String.raw`[\p{L}\p{N}_]`;
const BLIND_REGEX = [
  TerraQualityRegex.REGEX_GU_REGEX_2(),
  TerraQualityRegex.REGEX_T_1_6_D_T_GMU_REGEX(),
  TerraQualityRegex.REGEX_N_GU_REGEX(),
  TerraQualityRegex.REGEX_GU_REGEX(),
  TerraQualityRegex.REGEX_S_GU_REGEX(),
] as const;
const ICON_CLASS = 'size-4 text-primary-11';
const SECONDARY_TEXT_CLASS = 'text-xs text-primary-11';
const MENU_GAP_CLASS = 'gap-2';
const FIELD_GAP_CLASS = 'space-y-1.5';
const MENU_WIDTH_CLASS = 'w-56';

/**
 * Renders a block icon supplied either as an existing React node or a component.
 *
 * @param icon - Host-provided icon node or component constructor.
 * @returns The icon node, or `null` when the value cannot render an icon.
 */
const blockIcon = (icon: BlockOpt['icon']): ReactNode =>
  React.isValidElement(icon)
    ? icon
    : typeof icon === 'function'
      ? React.createElement(icon, { className: ICON_CLASS })
      : null;

/**
 * Narrows a host block to entries the toolbar can turn into a source import.
 *
 * @param c - Host-provided block metadata to validate.
 *
 * @returns Whether `component.path` is a non-empty module path.
 */
function hasComponentPath(
  c: (typeof repoComponents)[number],
): c is (typeof repoComponents)[number] & { path: string } {
  return typeof c.path === 'string' && c.path.length > 0;
}

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Prevents the active selection range from being lost when clicking toolbar buttons.
 *
 * @param {MouseEvent<HTMLElement>} e - The triggered mouse event.
 *
 * @return Nothing; the browser's default mouse action is cancelled so toolbar commands retain the editor selection.
 */
function preserveSel(e: MouseEvent<HTMLElement>): void {
  e.preventDefault();
}

/**
 * Normalizes a saved document version into its structured body and preview representations.
 *
 * @param ver - Saved revision to parse, or `undefined` before history is available.
 *
 * @return The parsed body, original JSON text, and Markdown preview; empty values are returned when no version is available or parsing fails.
 */
function parseVerBody(ver: DocVer | undefined): {
  body: DocBody;
  json: string;
  markdown: string;
} {
  if (!ver) return { body: [], json: '', markdown: '' };
  const json = typeof ver.contentJson === 'string' ? ver.contentJson : '';
  if (!json.trim()) return { body: [], json, markdown: '' };
  try {
    const parsed = JSON.parse(json) as unknown;
    const body = isDocBody(parsed) ? parsed : [];
    return { body, json, markdown: stringifyDocBody(body) };
  } catch (_err) {
    console.error('[Toolbar:versions:preview.parseVersionBody.fail]', {
      savedAt: ver.savedAt,
      title: ver.title,
      message: _err instanceof Error ? _err.message : String(_err),
      jsonHead: json.slice(0, 400),
      jsonTail: json.slice(-400),
    });
    return { body: [], json, markdown: '' };
  }
}

/**
 * Detects long JSON-like text that should be treated as structured source rather than ordinary prose.
 *
 * @param val - Source text to check for JSON delimiters and a minimum payload length.
 *
 * @return `true` when the text has JSON-like boundaries and content; otherwise `false`.
 */
function looksLikeJsonBlob(val: string): boolean {
  const v = val.trim();
  // prettier-ignore
  return ([['{', '}'], ['[', ']']] as const).some(([s, e]) => v.startsWith(s) && v.endsWith(e)) && v.length > 80;
}

/*//////////////////////////////////////////////////
COMPONENTS
//////////////////////////////////////////////////*/

const Button = React.forwardRef<
  HTMLButtonElement,
  Omit<React.ComponentPropsWithoutRef<typeof UiButton>, 'children' | 'size' | 'variant'> & {
    active?: boolean;
    children: ReactNode;
    lbl: string;
    shortcut?: string;
  }
>(
  /**
   * Renders the toolbar's compact button with its label and optional shortcut hint.
   *
   * @param x Button content, label, shortcut, active state, and native button attributes.
   * @param n Forwarded reference attached to the rendered button.
   *
   * @return The styled button wrapped in its tooltip.
   */
  function Button(x, n): JSX.Element {
    const {
      children: c,
      className: v,
      disabled: d,
      lbl: l,
      shortcut: s,
      onClick: o,
      onMouseDown: r,
      active: a,
      ...p
    } = x;
    void a;
    return (
      <TextTooltip content={s ? `${l} (${s})` : l} side="top" align="center" delayDuration={400}>
        <UiButton
          ref={n}
          variant="ghost"
          size="xs"
          aria-label={l}
          disabled={d}
          onClick={o}
          onMouseDown={r}
          className={cn('inline-flex h-6 !p-0.5 shadow-none', v)}
          {...p}
        >
          {c}
        </UiButton>
      </TextTooltip>
    );
  },
);
Button.displayName = 'Button';

/**
 * Mode control for the document viewer, visual editor, and attachment browser.
 *
 * @param mode - Currently selected workspace mode.
 * @param onModeChange - Applies a user-selected mode to the owning workspace.
 * @param disabled - Prevents mode changes while the workspace is busy.
 * @param editable - Includes edit mode only when the current user can write.
 * @param size - Styling size for the shared Select control.
 *
 * @returns The Select control containing the modes available to this user.
 */
function Mode({
  mode,
  onModeChange,
  disabled,
  editable,
  size = 'xs',
}: {
  mode: ToolbarMode;
  onModeChange: (val: ToolbarMode) => void;
  disabled?: boolean;
  editable: boolean;
  size?: 'sm' | 'xs';
}): JSX.Element {
  return (
    <Select
      size={size}
      disabled={disabled}
      value={mode}
      onValueChange={(v) => {
        const n = (v || 'view') as ToolbarMode;
        if (mode === n) return;
        setTransition(`to-${n}`);
        onModeChange(n);
      }}
    >
      <SelectTrigger aria-label="Mode" width="fit">
        <SelectValue placeholder="Mode" />
      </SelectTrigger>
      {/* prettier-ignore */}
      <SelectContent align='start'>
        {(editable ? ['view', 'edit', 'attachments'] : ['view', 'attachments']).map(o => <SelectItem key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</SelectItem>)}
			</SelectContent>
    </Select>
  );
}
const { DocsToolbarActions, Toolbar, GlobalComponentMenuNode, BlockType, Undo, Uploader, Custom } =
  {
    /**
     * Adds Docs-specific mode, history, save, and version controls beside the editor toolbar.
     *
     * @param aMode - Active workspace mode used to select the history actions.
     * @param editable - Whether the current host allows document changes.
     * @param size - Shared control size used by the toolbar buttons.
     * @param toolbar - Document actions and saved-state data, or `null` before editor setup.
     *
     * @returns The Docs history and save controls, or `null` when no edit actions are available.
     */
    DocsToolbarActions({
      activeMode: aMode,
      editable,
      size = 'xs',
      toolbar,
    }: {
      activeMode: ToolbarMode;
      editable: boolean;
      size?: 'sm' | 'xs';
      toolbar: ToolbarState | null;
    }): JSX.Element | null {
      const edit = useContext(EditStateCtx);
      const [versions, setVersions] = useState<DocVer[]>([]);
      const [historyOpen, setHistoryOpen] = useState(false);
      const [selectedVersionId, setSelectedVersionId] = useState('');
      const historyEnabled = getDocsHostAdapter()?.capabilities.history !== false;
      const selectedVersion = versions.find((v) => v.savedAt === selectedVersionId);
      const preview = useMemo(() => parseVerBody(selectedVersion), [selectedVersion]);
      useEffect(() => {
        let live = true;
        if (!editable || !historyEnabled || !toolbar?.path || !historyOpen) {
          setVersions([]);
          return;
        }
        const path = toolbar.path;
        const id =
          path.split('/').pop()?.replace(TerraQualityRegex.REGEX_MDX_I_REGEX(), '') || path;
        void (async () => {
          try {
            const result = await actions.write.doc.versions.get({ path });
            if (result.error) throw result.error;
            let data = result.data;
            if (Array.isArray(data) && data.length === 0 && path !== id) {
              const fallback = await actions.write.doc.versions.get({ path: id });
              if (fallback.error) throw fallback.error;
              if (Array.isArray(fallback.data) && fallback.data.length > 0) data = fallback.data;
            }
            if (live && Array.isArray(data)) setVersions(data as DocVer[]);
          } catch (err) {
            console.error('[Toolbar:versions] load-failed', { path, error: err });
            toast.error(err instanceof Error ? err.message : 'Failed to load doc versions.');
          }
        })();
        return () => {
          live = false;
        };
      }, [editable, historyEnabled, historyOpen, toolbar?.path]);
      useEffect(() => {
        if (historyOpen && !selectedVersionId && versions[0])
          setSelectedVersionId(versions[0].savedAt);
      }, [historyOpen, selectedVersionId, versions]);
      /**
       * Saves the current document while preventing the toolbar form's default submission.
       *
       * @param event Form event whose browser submission must be cancelled.
       *
       * @return A promise that settles after the save callback finishes or reports an error.
       */
      const save = async (event: { preventDefault: () => void }): Promise<void> => {
        event.preventDefault();
        if (!toolbar?.save) return;
        try {
          await Promise.resolve(toolbar.save());
        } catch (err) {
          console.error('[Docs:save] failed', err);
          toast.error(err instanceof Error ? err.message : 'Unable to save document.');
        }
      };
      useEffect(() => {
        if (aMode === 'view') return;
        /**
         * Saves the document when the user presses the platform save shortcut.
         *
         * @param event Keyboard event dispatched by the document.
         *
         * @return Nothing; matching shortcuts delegate to the save handler.
         */
        const onKeyDown = (event: KeyboardEvent): void => {
          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') void save(event);
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
      }, [aMode, toolbar]);
      if (!editable) return null;
      return (
        <TooltipProvider>
          <div className={DOCS_LAYOUT_CLASSES.compactRow} data-docs-toolbar-actions>
            <Mode
              editable={editable}
              mode={aMode}
              size={size}
              disabled={!toolbar}
              onModeChange={(m) => {
                if (!toolbar) return;
                void toolbar.setMode(m).catch((error) => {
                  console.error('[Toolbar:mode] change-failed', { mode: m, error });
                  toast.error(error instanceof Error ? error.message : 'Failed to change mode.');
                  clearTransition();
                });
              }}
            />
            {aMode === 'edit' && (
              <ButtonGroup>
                <TextTooltip content="Save (⌘S)" side="top" align="center" delayDuration={400}>
                  <UiButton
                    size={size}
                    disabled={!toolbar || !toolbar.dirty}
                    loading={toolbar?.busy === 'saving'}
                    onMouseDown={preserveSel}
                    onClick={(e) => void save(e)}
                  >
                    Save
                  </UiButton>
                </TextTooltip>
                {historyEnabled && (
                  <TextTooltip
                    content="Version History"
                    side="top"
                    align="center"
                    delayDuration={400}
                  >
                    <UiButton
                      size={size}
                      className="px-0.5"
                      disabled={!toolbar}
                      aria-label="Version History"
                      onMouseDown={preserveSel}
                      onClick={() => {
                        const firstVersion = versions[0];
                        if (firstVersion && !selectedVersionId)
                          setSelectedVersionId(firstVersion.savedAt);
                        setHistoryOpen(true);
                      }}
                    >
                      <CaretDownIcon />
                    </UiButton>
                  </TextTooltip>
                )}
                <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Version History</DialogTitle>
                      <DialogDescription className="sr-only">
                        Select a version to preview and restore.
                      </DialogDescription>
                      <Select value={selectedVersionId} onValueChange={setSelectedVersionId}>
                        <SelectTrigger className="h-14" aria-label="Select a version">
                          <SelectValue placeholder="Select a version" />
                        </SelectTrigger>
                        <SelectContent>
                          {versions.map((v) => (
                            <SelectItem key={v.savedAt} value={v.savedAt}>
                              <span className="flex flex-col text-left">
                                <span>
                                  {v.title} ({new Date(v.savedAt).toLocaleString()})
                                </span>
                                <span className={SECONDARY_TEXT_CLASS}>{v.description}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </DialogHeader>
                    <div className={DOCS_LAYOUT_CLASSES.flexScrollArea}>
                      <CodeBlock
                        tone="view"
                        language="mdx"
                        docsSource
                        code={preview.markdown.trim() || ' '}
                      />
                    </div>
                    <DialogFooter>
                      <UiButton variant="ghost" onClick={() => setHistoryOpen(false)}>
                        Cancel
                      </UiButton>
                      <UiButton
                        disabled={!selectedVersion}
                        onClick={() => {
                          if (!edit || !selectedVersionId) return;
                          edit.update({
                            content: preview.body,
                            description: selectedVersion?.description || '',
                            source: preview.markdown,
                            title: selectedVersion?.title || '',
                          });
                          (edit.setCode ?? edit.setSrc)?.(preview.markdown);
                          setHistoryOpen(false);
                          notify({
                            error: null,
                            fallback: 'Restored version to local draft. Save to apply.',
                          });
                        }}
                      >
                        Restore
                      </UiButton>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </ButtonGroup>
            )}
          </div>
        </TooltipProvider>
      );
    },

    /**
     * Renders undo and redo controls using the host adapter or the active CodeMirror history.
     *
     * @param onMouseDown - Preserves the editor selection when a history button receives focus.
     * @param disabled - Prevents history actions while the editor is unavailable.
     * @param adapter - Host-provided undo and redo actions and their available-state flags.
     *
     * @returns The paired undo and redo controls.
     */
    Undo({
      onMouseDown,
      disabled,
      adapter,
    }: {
      onMouseDown: (e: MouseEvent<HTMLElement>) => void;
      disabled?: boolean;
      adapter?: EditorToolbarAdapter | undefined;
    }): JSX.Element {
      // STATES
      const [state, setState] = useState<{ redo: boolean; undo: boolean }>({
        redo: false,
        undo: false,
      });

      // INIT
      useEffect(() => {
        let frame = 0;
        /**
         * Reads the active CodeMirror undo and redo depths, clearing both when no view is mounted.
         */
        const sync = (): void => {
          const view = codeViewOf();
          const n = view
            ? { redo: redoDepth(view.state) > 0, undo: undoDepth(view.state) > 0 }
            : { redo: false, undo: false };
          setState((c) => (c.undo === n.undo && c.redo === n.redo ? c : n));
        };
        sync();
        /**
         * Coalesces focus and input events into one next-frame history-depth read.
         */
        const refresh = (): void => {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(sync);
        };
        (['focusin', 'keyup', 'mouseup'] as const).forEach((e) => {
          document.addEventListener(e, refresh, true);
        });
        return () => {
          cancelAnimationFrame(frame);
          (['focusin', 'keyup', 'mouseup'] as const).forEach((e) => {
            document.removeEventListener(e, refresh, true);
          });
        };
      }, []);

      // RENDER
      return (
        <ButtonGroup>
          {[
            {
              lbl: 'Undo',
              canFire: adapter?.undoable ?? state.undo,
              action: adapter?.undo ?? undo,
              icon: UndoIcon,
              shortcut: '⌘Z',
            },
            {
              lbl: 'Redo',
              canFire: adapter?.redoable ?? state.redo,
              action: adapter?.redo ?? redo,
              icon: RedoIcon,
              shortcut: '⌘Y',
            },
          ].map((b) => (
            <Button
              key={b.lbl}
              lbl={b.lbl}
              shortcut={b.shortcut}
              disabled={disabled || !b.canFire}
              onMouseDown={onMouseDown}
              onClick={() => {
                if (adapter) {
                  if (b.lbl === 'Undo') adapter.undo?.();
                  else adapter.redo?.();
                  return;
                }
                const view = codeViewOf();
                if (!view) return;
                b.action(view);
                view.focus();
              }}
            >
              <b.icon />
            </Button>
          ))}
        </ButtonGroup>
      );
    },

    /**
     * Opens the upload dialog and lists attachments already stored beside the active document.
     *
     * @param Icon - Icon rendered by the upload trigger.
     * @param insert - Inserts the selected attachment link or embed into the editor.
     * @param onMouseDown - Preserves the current selection before the dialog opens.
     * @param disabled - Prevents uploads and insertions while the editor is unavailable.
     * @param ctx - Active document path used to fetch sibling attachments.
     *
     * @returns The attachment dialog trigger and its upload/select controls.
     */
    Uploader({
      icon: Icon,
      insert,
      onMouseDown,
      disabled,
      ctx,
    }: {
      icon: React.ElementType;
      insert?: ((md: string, rootEnd?: boolean) => void) | undefined;
      onMouseDown: (e: MouseEvent<HTMLElement>) => void;
      disabled?: boolean;
      ctx?: string | undefined;
    }): JSX.Element {
      // STATES
      const [cfg, setCfg] = useState({
        busy: false,
        open: false,
        attachment: '',
      });
      const [atts, setAtts] = useState<{ path: string; name: string }[]>([]);
      const [insertMode, setInsertMode] = useState<'embed' | 'link'>('embed');

      // EFFECTS
      useEffect(() => {
        let a = true;
        if (cfg.open && ctx) {
          actions.read.doc
            .attachments({ path: ctx })
            .then(({ data: d }) => {
              if (!a || !Array.isArray(d)) return;
              /**
               * Accepts only attachment records with a usable local path.
               *
               * @param item - Value returned by the host attachment action.
               *
               * @returns Whether `item` has a string `path` field.
               */
              const hasPath = (item: unknown): item is { path: string } =>
                Boolean(
                  item &&
                  typeof item === 'object' &&
                  'path' in item &&
                  typeof item.path === 'string',
                );
              setAtts(
                d.filter(hasPath).map((attachment) => ({
                  path: attachment.path,
                  name:
                    'name' in attachment && typeof attachment.name === 'string'
                      ? attachment.name
                      : attachment.path.split('/').pop() || 'attachment',
                })),
              );
            })
            .catch((e) => {
              console.error('[Toolbar:attachments] load-failed', {
                path: ctx,
                error: e,
              });
              toast.error(e instanceof Error ? e.message : 'Failed to load attachments.');
            });
        }
        return () => {
          a = false;
        };
      }, [cfg.open, ctx]);

      // HELPERS
      /** Formats the selected stored attachment as a link, image, or embed and inserts it. */
      const uploaderActions = {
        reset: useCallback(() => {
          setCfg({ busy: false, open: false, attachment: '' });
          setInsertMode('embed');
        }, []),
        submit: async (): Promise<void> => {
          if (!cfg.attachment || cfg.attachment === 'none' || !insert) return;
          setCfg((p) => ({ ...p, busy: true }));
          try {
            const att = atts.find((a) => a.path === cfg.attachment);
            if (!att) throw new Error('Attachment not found');
            const lbl =
              att.name
                .split('/')
                .pop()
                ?.split('.')[0]
                ?.replace(TerraQualityRegex.REGEX_G_REGEX_7(), ' ')
                .replace(TerraQualityRegex.REGEX_B_W_G_REGEX(), (c) => c.toUpperCase()) ||
              'attachment';
            const c = (att.path.startsWith('http') ? att.path : att.name).replace(
              TerraQualityRegex.REGEX_G_REGEX(),
              '%20',
            );
            let fmt = '';
            if (insertMode === 'link') fmt = `[${lbl}](<${c}>)`;
            else {
              if (TerraQualityRegex.REGEX_PNG_JPE_G_GIF_WEBP_SVG_AVIF_I_REGEX_2().test(att.name))
                fmt = `\n![${lbl}](<${c}>)\n`;
              else fmt = `\n<Embed src="${c}" title="${lbl}" />\n`;
            }
            insert(fmt);
            uploaderActions.reset();
          } catch {
            setCfg((p) => ({ ...p, busy: false }));
          }
        },
      };

      // RENDER
      return (
        <Popover
          open={cfg.open}
          onOpenChange={(o) => {
            if (!o) uploaderActions.reset();
            else setCfg((p) => ({ ...p, open: o }));
          }}
        >
          {/* TRIGGER */}
          <PopoverTrigger asChild>
            <Button disabled={disabled} lbl={'Insert attachment'} onMouseDown={onMouseDown}>
              <Icon />
            </Button>
          </PopoverTrigger>
          {/* POPOVER */}
          <PopoverContent align="start" className="w-80 space-y-4">
            {/* ATTACHMENTS */}
            <div className={FIELD_GAP_CLASS}>
              <Label className={SECONDARY_TEXT_CLASS}>Document Attachments</Label>
              <Select
                value={cfg.attachment}
                onValueChange={(p) => {
                  setCfg((v) => ({ ...v, attachment: p }));
                }}
              >
                <SelectTrigger aria-label="Document Attachment">
                  <SelectValue placeholder="Select an attachment" />
                </SelectTrigger>
                {/* prettier-ignore */}
                <SelectContent>
							{atts.length === 0 ? (<SelectItem value='none' disabled>No attachments found</SelectItem>
							) : (atts.map(a => (<SelectItem key={a.path} value={a.path}>{a.name}</SelectItem>)))}
						</SelectContent>
              </Select>
            </div>
            {/* FORMAT (EMBED VS LINK) */}
            {/* prettier-ignore */}
            <div className={FIELD_GAP_CLASS}>
					<Label>Format</Label>
					<ToggleGroup type='single' value={insertMode} onValueChange={v => v && setInsertMode(v as 'embed' | 'link')} className='justify-start'>
						{([['embed', 'Visual Embed'], ['link', 'Text Link']] as const).map(([v, l]) => (
							<ToggleGroupItem key={v} value={v} size='sm' className='h-7 px-3 text-xs'>
								{l}
							</ToggleGroupItem>
						))}
					</ToggleGroup>
				</div>
            {/* INSERT */}
            <UiButton
              className="w-full"
              disabled={!cfg.attachment || cfg.attachment === 'none' || cfg.busy}
              loading={cfg.busy}
              onClick={() => void uploaderActions.submit()}
            >
              Insert
            </UiButton>
          </PopoverContent>
        </Popover>
      );
    },

    /**
     * Renders a component folder and its children as nested import-menu entries.
     *
     * @param name - Folder label shown in the menu.
     * @param tree - Components and subfolders contained by this folder.
     * @param onCopy - Inserts the selected component into the editor when one is chosen.
     *
     * @returns The nested menu trigger and its component or folder entries.
     */
    GlobalComponentMenuNode({
      name,
      tree,
      onCopy,
    }: {
      name: string;
      tree: MenuTree;
      onCopy?: ((component: RepoComponentWithLabel) => void) | undefined;
    }): JSX.Element {
      return (
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="capitalize">
            {name.replace(TerraQualityRegex.REGEX_G_REGEX_7(), ' ')}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {tree.components.map((c) => (
              <DropdownMenuItem
                key={`${c.path}:${c.name}`}
                onMouseDown={preserveSel}
                onSelect={(e) => {
                  e.preventDefault();
                  onCopy?.(c);
                }}
              >
                {(c.displayLabel ?? c.label ?? c.name)
                  .replace(TerraQualityRegex.REGEX_G_REGEX_7(), ' ')
                  .replace(TerraQualityRegex.REGEX_B_W_G_REGEX(), (c) => c.toUpperCase())}
              </DropdownMenuItem>
            ))}
            {Object.entries(tree.folders).map(([f, s]) => (
              <GlobalComponentMenuNode key={f} name={f} tree={s} onCopy={onCopy} />
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      );
    },

    /**
     * Offers local document links, repository components, and saved block templates for insertion.
     *
     * @param onInsert - Adds a component import and its JSX at the current structured editor selection.
     * @param onInsertMd - Inserts Markdown when structured insertion is unavailable.
     * @param onMouseDown - Preserves the editor selection while opening the menu.
     * @param disabled - Prevents opening or using the menu while the editor is unavailable.
     * @param ctx - Current document path used to find nearby pages and attachments.
     *
     * @returns The insertion menu and dialogs for local references and components.
     *
     * @remarks
     * The host remains responsible for file access; this component uses the shared actions to list candidates and insert their references.
     */
    Custom({
      onInsert,
      onInsertMd,
      onMouseDown,
      disabled,
      ctx,
    }: {
      onInsert?: ((statement: string, snippet: string) => void) | undefined;
      onInsertMd?: ((md: string, rootEnd?: boolean) => void) | undefined;
      onMouseDown: (e: MouseEvent<HTMLElement>) => void;
      disabled?: boolean;
      ctx?: string | undefined;
    }): JSX.Element {
      // STATES
      const [sis, setSis] = useState<{ path: string; name: string }[]>([]);
      const [search, setSearch] = useState({
        open: false,
        query: '',
        tree: [] as Tree[],
        busy: false,
      });
      const savedSel = useRef<Range | null>(null);
      const copyLock = useRef<string | null>(null);

      // 1. FETCH LOCAL FILES (Allows ALL leaves as valid attachments)
      useEffect(() => {
        if (!ctx) return;
        const dir = dirname(
          TerraQualityRegex.REGEX_INDEX_MD_MDX_I_REGEX_2().test(ctx.split('/').pop() || '')
            ? dirname(ctx)
            : ctx,
        );
        actions.read.doc
          .list({ type: 'folderEntries', path: dir })
          .then(({ data: d }) => {
            // prettier-ignore
            if (Array.isArray(d)) setSis(d.filter((p: string) => p !== ctx && dirname(p) === dir && /\.(md|mdx|astro|tsx)$/i.test(p.split('/').pop() || '')).map((p: string) => ({ path: p, name: p.split('/').pop() || '' })));
          })
          .catch((e) => {
            console.error('[Toolbar:insert.load-failed]', {
              path: dir,
              error: e,
            });
            toast.error(e instanceof Error ? e.message : 'Failed to load insert targets.');
          });
      }, [ctx]);

      // 2. BUILD GLOBAL COMPONENT TREE
      const componentTree = useMemo(() => {
        const root: MenuTree = { components: [], folders: {} };
        const counts = new Map<string, number>();
        const importableComponents = repoComponents.filter(hasComponentPath);
        importableComponents.forEach((c) => counts.set(c.path, (counts.get(c.path) ?? 0) + 1));
        importableComponents.forEach((c) => {
          const parts = c.path.split('/_custom/');
          if (parts.length <= 1) {
            root.components.push({ ...c, displayLabel: c.name });
            return;
          }
          const segs = parts[1]!.split('/');
          const file = segs.pop()!.replace(TerraQualityRegex.REGEX_PATTERN_REGEX(), '');
          if (file !== 'index' && (counts.get(c.path) ?? 0) > 1) segs.push(file);
          let cur = root;
          segs.forEach((s) => {
            cur = cur.folders[s] ??= { components: [], folders: {} };
          });
          // prettier-ignore
          cur.components.push({ ...c, displayLabel: c.name });
        });
        return root;
      }, []);
      const copyComponent = useCallback(
        async (c: RepoComponentWithLabel): Promise<void> => {
          if (onInsert) {
            onInsert(`import ${c.name} from '${c.path}';`, c.clipboardValue ?? `<${c.name} />`);
            return;
          }
          const text = c.clipboardValue ?? `<${c.name} />`;
          const key = `${c.path}:${c.name}`;
          if (copyLock.current === key) return;
          copyLock.current = key;
          try {
            try {
              await navigator.clipboard.writeText(text);
            } catch {
              const fallback = document.createElement('textarea');
              fallback.value = text;
              fallback.setAttribute('readonly', 'true');
              fallback.style.position = 'fixed';
              fallback.style.opacity = '0';
              document.body.appendChild(fallback);
              fallback.select();
              if (!document.execCommand('copy')) {
                fallback.remove();
                throw new Error('Clipboard write failed');
              }
              fallback.remove();
            }
            window.setTimeout(() => toast.success('Copied to clipboard', { duration: 4000 }), 0);
          } catch {
            toast.error('Failed to copy to clipboard');
          } finally {
            window.setTimeout(() => {
              if (copyLock.current === key) copyLock.current = null;
            }, 0);
          }
        },
        [onInsert],
      );

      // 3. FETCH FULL DOC TREE FOR SEARCH/BROWSE
      useEffect(() => {
        if (!search.open) return;
        let a = true;
        if (search.tree.length === 0) {
          setSearch((s) => ({ ...s, busy: true }));
          actions.read.doc
            .list({ type: 'nav', pathname: docsRootPath() })
            .then(({ data: d }) => {
              if (a)
                setSearch((s) => ({
                  ...s,
                  tree: Array.isArray(d)
                    ? d.filter((n): n is Tree => Boolean(n && typeof n === 'object' && 'type' in n))
                    : [],
                  busy: false,
                }));
            })
            .catch((_err) => {
              console.error(`[Toolbar:Embed] Failed to fetch document tree:`, _err);
              if (a) setSearch((s) => ({ ...s, busy: false }));
            });
        }
        return () => {
          a = false;
        };
      }, [search.open]);

      // 4. FILTER LEAVES ON QUERY (Returns all leaves when query is empty)
      const filteredLeaves = useMemo(() => {
        const leaves: { path: string; title: string; breadcrumb: string }[] = [];
        // Track seen paths to prevent duplicate React key warnings when the nav tree
        // contains the same node referenced from multiple locations.
        const seen = new Set<string>();
        const lowerQuery = search.query.trim().toLowerCase();
        const searchFrames: { nodes: Tree[]; index: number; path: string }[] = [
          { nodes: search.tree, index: 0, path: '' },
        ];
        while (searchFrames.length) {
          const frame = searchFrames[searchFrames.length - 1];
          if (!frame) break;
          if (frame.index >= frame.nodes.length) {
            searchFrames.pop();
            continue;
          }
          const n = frame.nodes[frame.index];
          if (!n) {
            frame.index += 1;
            continue;
          }
          frame.index += 1;
          const currTitle = n.title || n.origName || 'Untitled';
          if (n.type === 'leaf') {
            const nodePath = n.path;
            if (typeof nodePath !== 'string' || seen.has(nodePath)) continue;
            if (
              !lowerQuery ||
              (typeof currTitle === 'string' ? currTitle.toLowerCase() : '').includes(lowerQuery) ||
              (n.path && typeof n.path === 'string' ? n.path.toLowerCase() : '').includes(
                lowerQuery,
              )
            ) {
              seen.add(nodePath);
              leaves.push({
                path: nodePath,
                title: currTitle,
                breadcrumb: frame.path,
              });
            }
          } else if (n.type === 'branch' && n.children) {
            searchFrames.push({
              nodes: n.children,
              index: 0,
              path: frame.path ? `${frame.path} / ${currTitle}` : currTitle,
            });
          }
        }
        return leaves;
      }, [search.query, search.tree]);

      // 5. EMBED OR CREATE LEAF
      /**
       * Creates a page when requested and links the destination into the current document.
       *
       * @param tgtPath Existing destination path, or the initial path for a new page.
       * @param isNew Whether a new page should be created before linking it.
       *
       * @return A promise that settles after the page link is inserted and the editor is restored.
       */
      const embed = async (tgtPath: string, isNew = false) => {
        let finalPath = tgtPath;
        let leafId = tgtPath;
        // 1. Close Modal immediately to prevent multiple submissions
        setSearch((s) => ({ ...s, open: false, busy: true }));
        setTransition('p');
        try {
          if (isNew) {
            // Keep the new page under the current path so its prefix-based `verifyWrite` authorization matches.
            const basePath = ctx ? ctx.replace(TerraQualityRegex.REGEX_PATTERN_REGEX_2(), '') : '';
            const sName = search.query.trim()
              ? search.query.replace(TerraQualityRegex.REGEX_A_Z0_9_GI_REGEX_2(), '-').toLowerCase()
              : 'untitled';
            const nId = basePath
              ? `${basePath}/${sName}-${Date.now()}.mdx`
              : `${sName}-${Date.now()}.mdx`;
            finalPath = nId;
            // create the page purely as a stand-alone document without anchoring to the group
            const writeRes = await actions.write.doc
              .editor({
                path: nId,
                title: search.query,
                source: 'This page is empty.',
              })
              .catch((_err) => ({ data: null, error: _err }));
            if (writeRes.error) {
              console.error(`[Toolbar:Embed] write.doc.editor action failed:`, writeRes.error);
              throw writeRes.error;
            }
            finalPath = (writeRes.data as Md)?.path || finalPath;
          }
          // Link the leaf into the current document and capture the host's attachment metadata when available.
          if (ctx) {
            const attRes = await actions.write.attachment
              .docRef({
                path: ctx,
                refId: finalPath,
                title: search.query || 'Embedded Page',
              })
              .catch((_err) => {
                console.error(`[Toolbar:Embed] write.attachment.docRef action failed:`, _err);
                return { data: null, error: _err };
              });
            if (attRes && attRes.data) {
              // Prefer the reference ID returned by the host when assigning the leaf link target.
              const attachment = {
                leafId:
                  typeof attRes.data === 'object' &&
                  'refId' in attRes.data &&
                  typeof attRes.data.refId === 'string'
                    ? attRes.data.refId
                    : leafId,
                sister: {
                  path: finalPath,
                  name: finalPath.split('/').pop() || finalPath,
                },
              };
              leafId = attachment.leafId;
              setSis((p) => {
                if (!p.some((s) => s.path === finalPath)) return [...p, attachment.sister];
                return p;
              });
            }
          }
          // Let the host finish exposing a newly written page before inserting its reference.
          if (isNew || ctx) await new Promise((r) => setTimeout(r, 1500));
          clearTransition();
          // 2. Yield to event loop to allow DOM reconciliation
          await new Promise((r) => setTimeout(r, 200));
          // 3. Force focus back into the active editor securely
          const aEditor = document.querySelector<HTMLElement>(
            '[contenteditable="true"], .cm-content',
          );
          if (aEditor) {
            aEditor.focus({ preventScroll: true });
            const sel = window.getSelection();
            if (sel && savedSel.current) {
              sel.removeAllRanges();
              sel.addRange(savedSel.current);
              savedSel.current = null; // clear after use
            } else if (!sel || sel.rangeCount === 0) {
              try {
                const range = document.createRange();
                range.selectNodeContents(aEditor);
                range.collapse(false);
                sel?.removeAllRanges();
                sel?.addRange(range);
              } catch {
                // Selection restoration is best effort.
              }
            }
          }
          // clean up busy state and search query now that injection is ready
          setSearch((s) => ({ ...s, query: '', busy: false }));
          await new Promise((r) => requestAnimationFrame(r));
          // 4. Inject purely as AST text (bypassing the import statement injection)
          // This mirrors how globally configured components like <Nodes /> and <DocsMath /> are inserted.
          if (onInsertMd) {
            try {
              onInsertMd(`\n\n<Leaf id="${leafId}" />\n\n`);
            } catch (_err) {
              console.error(
                `[Toolbar:Embed] Exception thrown during onInsertMd AST mutation:`,
                _err,
              );
            }
          } else
            console.error(
              `[Toolbar:Embed] onInsertMd callback is MISSING. Aborting AST injection.`,
            );
        } catch (_err) {
          clearTransition();
          console.error(
            `[Toolbar:Embed] Critical pipeline failure during leaf embed process:`,
            _err,
          );
          notify({
            error: _err instanceof Error ? _err : new Error('Embed failed'),
            fallback: 'Failed to embed leaf.',
          });
          setSearch((s) => ({ ...s, query: '', busy: false }));
        }
      };

      // 6. LOCAL MENUS
      // prettier-ignore
      const menuGroups = {
			globalComponents: componentTree.components,
			globalFolders: componentTree.folders,
			local: [
		{
			label: 'Copy attachments',
			icon: <PasteIcon className={ICON_CLASS} />,
			items: sis,
						onSelect: (s: { path: string }) =>
				actions.read.doc
					.get({ path: s.path })
					.then(({ data: d }) => onInsertMd?.(`\n${(d as Md)?.source || ''}\n`))
					.catch(e => {
						console.error('[Toolbar:insert.partial-load-failed]', { path: s.path, error: e });
						toast.error(e instanceof Error ? e.message : 'Failed to load partial.');
					}),
		},
		{
			label: 'Share attachment',
			icon: <ShareIcon className={ICON_CLASS} />,
			items: sis.filter(s => TerraQualityRegex.REGEX_MD_MDX_I_REGEX().test(s.name)),
						onSelect: (s: { name: string }) => {
              const importName = s.name
                .replace(TerraQualityRegex.REGEX_PATTERN_REGEX(), '')
                .replace(/(^|[-_\s])([a-z])/g, (_match, _prefix, letter: string) =>
                  letter.toUpperCase(),
                )
                .replace(/[-_\s]/g, '');
				onInsert?.(`import ${importName} from '${TerraQualityRegex.REGEX_INDEX_MD_MDX_I_REGEX_2().test(ctx?.split('/').pop() || '') ? '../' : './'}${s.name}';`, `<${importName} />\n`);
			},
		},
			],
		};
      return (
        <>
          <DropdownMenu>
            {/* TRIGGER */}
            <DropdownMenuTrigger asChild>
              <Button disabled={disabled} lbl="Insert component" onMouseDown={onMouseDown}>
                <DOCS_BLOCK_ICONS.code />
              </Button>
            </DropdownMenuTrigger>
            {/* DROPDOWN MENU */}
            <DropdownMenuContent align="start" className={MENU_WIDTH_CLASS}>
              <DropdownMenuItem
                onMouseDown={preserveSel}
                onSelect={(e) => {
                  e.preventDefault();
                  const sel = window.getSelection();
                  if (sel && sel.rangeCount > 0) savedSel.current = sel.getRangeAt(0).cloneRange();
                  setSearch((s) => ({ ...s, open: true }));
                }}
                className={MENU_GAP_CLASS}
              >
                <PopOutIcon className={ICON_CLASS} /> Embed Page
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className={MENU_GAP_CLASS}>
                  <ModuleIcon className={ICON_CLASS} /> Modules
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className={MENU_WIDTH_CLASS}>
                  {menuGroups.globalComponents.map((c) => (
                    <DropdownMenuItem
                      key={c.path}
                      onMouseDown={preserveSel}
                      onSelect={(e) => {
                        e.preventDefault();
                        void copyComponent(c);
                      }}
                    >
                      {(c.displayLabel ?? c.label ?? c.name)
                        .replace(TerraQualityRegex.REGEX_G_REGEX_7(), ' ')
                        .replace(TerraQualityRegex.REGEX_B_W_G_REGEX(), (c) => c.toUpperCase())}
                    </DropdownMenuItem>
                  ))}
                  {Object.entries(menuGroups.globalFolders).map(([f, s]) => (
                    <GlobalComponentMenuNode key={f} name={f} tree={s} onCopy={copyComponent} />
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              {menuGroups.local.map((m) => (
                <React.Fragment key={m.label}>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger disabled={!m.items.length} className={MENU_GAP_CLASS}>
                      {m.icon} {m.label}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {m.items.map((s) => (
                        <DropdownMenuItem
                          key={s.path}
                          onMouseDown={preserveSel}
                          onSelect={(e) => {
                            e.preventDefault();
                            m.onSelect(s);
                          }}
                        >
                          {s.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </React.Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {/* CUSOM DIALOG */}
          <Dialog
            open={search.open}
            onOpenChange={(o) => {
              setSearch((s) => ({ ...s, open: o }));
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Embed Document</DialogTitle>
                <DialogDescription className="sr-only">
                  Browse the document tree or search to embed a page.
                </DialogDescription>
              </DialogHeader>
              {/* prettier-ignore */}
              <div className='space-y-4 pt-2'>
						<Input icon={<SearchIcon className={ICON_CLASS} />} autoFocus placeholder='Search or type to create...' value={search.query} onChange={e => { setSearch(s => ({ ...s, query: e.target.value })); }} />
						<div className='flex max-h-64 min-h-24 flex-col gap-1 overflow-y-auto pr-2'>
							{search.busy && search.tree.length === 0 && <p className='py-4 text-center text-sm text-primary-11'>Loading...</p>}
							{search.query.trim() && (
								<UiButton variant='outline' className='mb-2 flex-col items-start gap-y-0 border-dashed py-6' onClick={() => void embed('', true)} disabled={search.busy}>
								<span className={DOCS_LAYOUT_CLASSES.controlTitle}>{search.busy ? 'Creating...' : `Create "${search.query}"`}</span>
									<span className={SECONDARY_TEXT_CLASS}>Create page and embed as attachment</span>
								</UiButton>
							)}
							{search.query.trim() && !search.busy && filteredLeaves.length === 0 && <SearchEmpty query={search.query} />}
							{filteredLeaves.map(l => (
								<UiButton key={l.path} variant='ghost' className='flex-col items-start gap-y-0 py-6' onClick={() => embed(l.path)}>
									<span className='text-sm font-medium capitalize'>{l.title}</span>
									<span className={SECONDARY_TEXT_CLASS}>{l.breadcrumb ? `${l.breadcrumb} / ` : ''}{l.title}</span>
								</UiButton>
							))}
						</div>
					</div>
            </DialogContent>
          </Dialog>
        </>
      );
    },

    /**
     * Dropdown control for quickly converting a block or inserting a supported block template.
     *
     * @param disabled - Prevents block selection while the editor is unavailable.
     * @param toolbar - Supplies the current insertion action, or `null` without an active editor.
     * @param adapter - Applies block-type changes through the host editor adapter.
     * @param opts - Block type and insertion actions shown in the menu.
     * @param json - Uses structured block insertion when editing serialized document content.
     *
     * @returns The Select control for changing a block or inserting a template.
     */
    BlockType({
      disabled,
      toolbar,
      adapter,
      options: opts,
      json = false,
    }: {
      disabled?: boolean;
      toolbar: ToolbarState | null;
      adapter?: EditorToolbarAdapter | undefined;
      options: BlockOpt[];
      json?: boolean;
    }): JSX.Element {
      // STATES
      const [val, setVal] = useState('p');
      // refs to persist the last known location of the user's cursor
      const savedBlock = useRef<HTMLElement | null>(null);

      // INIT
      useEffect(() => {
        let frame = 0;
        if (disabled || !toolbar) return;
        /**
         * Synchronizes the current view state with the source data.
         *
         */
        const sync = (): void => {
          const view = codeViewOf();
          // 1. Visual Mode (Lexical) - Read from DOM selection safely
          if (!view || view.dom.offsetParent === null) {
            const sel = window.getSelection();
            const blockCursor = document.querySelector<HTMLElement>(
              '[data-docs-block-cursor="true"]',
            );
            if (blockCursor && sel?.anchorNode && !blockCursor.contains(sel.anchorNode)) {
              const blockVal = toolbarFocusValue(
                blockCursor,
                opts.map((o) => o.value),
              );
              if (blockVal) {
                setVal((c) => (c === blockVal ? c : blockVal));
                return;
              }
            }
            // Only update the saved reference if the selection is actively inside the editor.
            // This prevents the dropdown click from overwriting the last known cursor location.
            if (sel && sel.rangeCount > 0 && sel.anchorNode) {
              const node = sel.anchorNode;
              const el = node.nodeType === 3 ? node.parentElement : (node as HTMLElement);
              if (el?.closest('.mdxeditor-root, [contenteditable="true"]')) {
                const textBlock = el?.closest('h1, h2, h3, h4, h5, h6, p') as HTMLElement | null;
                if (textBlock) savedBlock.current = textBlock;
                else if (
                  el
                    ?.closest('td, th')
                    ?.closest('[data-docs-editor-block="DocsTable"], [data-block="table"]')
                )
                  savedBlock.current = null;
                const blockVal = el
                  ? toolbarFocusValue(
                      el,
                      opts.map((o) => o.value),
                    )
                  : null;
                if (blockVal) {
                  setVal((c) => (c === blockVal ? c : blockVal));
                  return;
                }
              }
            }
            return;
          }
          // A focused rich code block uses CodeMirror for its own content.
          const { head } = view.state.selection.main;
          const text = view.state.doc.lineAt(head).text;
          let n = 'p';
          if (TerraQualityRegex.REGEX_S_REGEX_5().test(text)) n = 'h3';
          else if (TerraQualityRegex.REGEX_S_REGEX_6().test(text)) n = 'h4';
          else if (TerraQualityRegex.REGEX_S_REGEX_4().test(text)) n = 'h2';
          setVal((c) => (c === n ? c : n));
        };
        sync();
        /**
         * Rechecks the selected block after the browser has applied the current input or selection event.
         */
        const refresh = (): void => {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(sync);
        };
        /**
         * Updates the menu to the block reported by a Docs selection event.
         *
         * @param e - Event detail containing a selected block or its decorator element.
         */
        const onBlockSelect = (e: Event): void => {
          const { block: selBlock, decorator } =
            (e as CustomEvent<{ block?: unknown; decorator?: unknown }>).detail ?? {};
          const block =
            selBlock instanceof HTMLElement
              ? selBlock
              : decorator instanceof HTMLElement
                ? decorator.querySelector<HTMLElement>(
                    '[data-docs-editor-block], .docs-math-wrapper, [data-math-code], [data-docs-view-root="true"]',
                  )
                : null;
          const blockVal = block
            ? toolbarFocusValue(
                block,
                opts.map((o) => o.value),
              )
            : null;
          if (!blockVal) return;
          savedBlock.current = null;
          setVal((c) => (c === blockVal ? c : blockVal));
        };
        (['focusin', 'keyup', 'mouseup', 'selectionchange'] as const).forEach((e) => {
          document.addEventListener(e, refresh, true);
        });
        document.addEventListener('docs:block-select', onBlockSelect);
        document.addEventListener('docs:block-selected', onBlockSelect);
        return () => {
          cancelAnimationFrame(frame);
          (['focusin', 'keyup', 'mouseup', 'selectionchange'] as const).forEach((e) => {
            document.removeEventListener(e, refresh, true);
          });
          document.removeEventListener('docs:block-select', onBlockSelect);
          document.removeEventListener('docs:block-selected', onBlockSelect);
        };
      }, [disabled, toolbar]);

      // RENDER
      return (
        <Select
          disabled={disabled || !toolbar}
          value={val}
          onValueChange={(v) => {
            const item = opts.find((i) => i.value === v);
            if (!item) return;
            if (item.group === 'type') {
              if (json) {
                window.dispatchEvent(
                  new CustomEvent('docs:json-command', {
                    detail: { type: 'style', style: v === 'p' ? 'normal' : v },
                  }),
                );
                setVal(v);
                return;
              }
              if (adapter?.setBlockType) {
                adapter.setBlockType(v as 'paragraph' | 'h2' | 'h3' | 'h4');
                setVal(v);
                return;
              }
              const view = codeViewOf();
              if (view && view.dom.offsetParent !== null) {
                const { head } = view.state.selection.main;
                const line = view.state.doc.lineAt(head);
                const text = line.text;
                let n: string;
                let prefix = '';
                if (v === 'h2') {
                  prefix = '## ';
                  n =
                    text.replace(TerraQualityRegex.REGEX_S_REGEX_4(), '').trimStart() || 'Heading';
                } else if (v === 'h3') {
                  prefix = '### ';
                  n =
                    text.replace(TerraQualityRegex.REGEX_S_REGEX_5(), '').trimStart() || 'Heading';
                } else if (v === 'h4') {
                  prefix = '#### ';
                  n =
                    text.replace(TerraQualityRegex.REGEX_S_REGEX_6(), '').trimStart() || 'Heading';
                } else n = text.replace(/^#{1,6}\s+/, '').trimStart() || 'Text';
                const replacementStr = `${prefix}${n}`;
                view.dispatch({
                  changes: {
                    from: line.from,
                    to: line.to,
                    insert: replacementStr,
                  },
                  selection: { anchor: line.from + replacementStr.length },
                });
                view.focus();
                setVal(v);
                return;
              }
              try {
                if (savedBlock.current) {
                  const editor = (
                    savedBlock.current.closest<HTMLElement>('[contenteditable="true"]') as
                      (HTMLElement & { __lexicalEditor?: LexicalEditor }) | null
                  )?.__lexicalEditor;
                  if (editor) {
                    editor.update(() => {
                      const lexicalNode = $getNearestNodeFromDOMNode(savedBlock.current!);
                      if (lexicalNode) {
                        let blockNode: LexicalNode | null = lexicalNode;
                        while (blockNode && !$isElementNode(blockNode))
                          blockNode = blockNode.getParent();
                        if (blockNode && $isElementNode(blockNode)) {
                          let replacementNode;
                          if (v === 'p') replacementNode = $createParagraphNode();
                          else if (v === 'h2' || v === 'h3' || v === 'h4')
                            replacementNode = $createHeadingNode(v);
                          if (replacementNode) {
                            blockNode.getChildren().forEach((c) => {
                              replacementNode.append(c);
                            });
                            blockNode.replace(replacementNode);
                            replacementNode.selectStart();
                          }
                        }
                      }
                    });
                  } else
                    console.error(
                      '[BlockType] [VisualMode] ABORTED: Could not locate __lexicalEditor on editorRoot.',
                    );
                } else
                  console.error(
                    '[BlockType] [VisualMode] ABORTED: No saved cursor context. Ensure the cursor was placed inside the editor before selection.',
                  );
              } catch (_err) {
                console.error('[BlockType] [VisualMode] CRITICAL PIPELINE FAILURE:', _err);
              }
              setVal(v);
              return;
            }
            item.onSelect();
          }}
          size="xs"
        >
          <SelectTrigger aria-label="Block type" className="w-40" onMouseDown={preserveSel}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            {/* prettier-ignore */}
            <SelectGroup>
              <SelectLabel>Block Type</SelectLabel>
              {opts
                .filter((o) => o.group === 'type')
                .map(({ value: v, label: l, icon: i }) => (
                  <SelectItem key={v} value={v} icon={blockIcon(i)}>
                    {l}
                  </SelectItem>
                ))}
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Insert Block</SelectLabel>
              {opts
                .filter((o) => o.group === 'insert')
                .map(({ value: v, label: l, icon: i }) => (
                  <SelectItem key={v} value={v} icon={blockIcon(i)}>
                    {l}
                  </SelectItem>
                ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      );
    },

    /**
     * Main floating action bar assembling all text and format mutation interactions into a single cohesive boundary.
     *
     * @param aMode - Explicitly selected workspace mode; defaults to view mode.
     * @param editable - Whether the current user can change the document.
     * @param toolbar - Current editor callbacks and document state, or `null` before setup completes.
     * @param blocks - Optional host-provided block templates available in the insertion menu.
     * @param adapter - Optional host editor actions for formatting, block changes, and history.
     * @param docs - Enables Docs-specific controls such as find, history, and publish.
     *
     * @returns The active toolbar controls, or `null` when this surface has no available actions.
     */
    Toolbar({
      activeMode: aMode,
      editable,
      toolbar,
      blocks,
      adapter,
      docs = true,
    }: {
      activeMode?: ToolbarMode;
      editable: boolean;
      toolbar: ToolbarState | null;
      transitioning?: boolean;
      blocks?: {
        icon: ComponentType<{
          className?: string;
        }>;
        insert: () => string;
        label: string;
        type: string;
      }[];
      adapter?: EditorToolbarAdapter;
      docs?: boolean;
    }): JSX.Element | null {
      // STATES
      const toolbarCtx = {
        edit: useContext(EditStateCtx),
        attachmentFilter: useAtom($attachmentFilter),
      };
      const quizContext = useDocsQuizContext();
      const [quizOpen, setQuizOpen] = useState(false);
      const mode = aMode ?? 'view';
      const [vers, setVers] = useState<DocVer[]>([]);
      const [verDialogOpen, setVerDialogOpen] = useState(false);
      const [selVerId, setSelVerId] = useState<string>('');
      const codeAtEnd = useRef(false);
      const codeSel = useRef<Parameters<NonNullable<ToolbarState['insert']>>[2]>(null);
      const codeLength = useRef(0);
      useEffect(() => {
        /**
         * Stores the CodeMirror cursor range and source length before the toolbar takes focus.
         */
        const sync = (): void => {
          const view = codeViewOf();
          if (!view) return;
          const { from, to } = view.state.selection.main;
          codeLength.current = view.state.doc.length;
          codeSel.current = {
            code: { from: Math.min(from, to), to: Math.max(from, to) },
            dom: null,
            visible: true,
          };
          codeAtEnd.current = false;
        };
        document.addEventListener('selectionchange', sync);
        return () => {
          document.removeEventListener('selectionchange', sync);
        };
      }, []);
      const [endpoint, setEndpoint] = useState('');
      const [endpointOpen, setEndpointOpen] = useState(false);
      const findRef = useRef<HTMLTextAreaElement | null>(null);
      const [findCfg, setFindCfg] = useState({
        blind: false,
        case: false,
        find: '',
        full: false,
        open: false,
        replace: '',
      });
      const [findIndex, setFindIndex] = useState(0);
      const [findContent, setFindContent] = useState('');
      const ready = adapter?.ready ?? !!toolbar;
      const saving = toolbar?.busy ?? null;
      const dirty = toolbar?.dirty ?? false;
      const publishDraft = getDocsHostAdapter()?.publishDraft;
      useEffect(() => {
        if (
          docs ||
          (!findCfg.blind &&
            !findCfg.case &&
            !findCfg.find &&
            !findCfg.full &&
            !findCfg.open &&
            !findCfg.replace &&
            !findContent &&
            findIndex === 0)
        )
          return;
        setFindCfg({ blind: false, case: false, find: '', full: false, open: false, replace: '' });
        setFindIndex(0);
        setFindContent('');
      }, [docs, findCfg, findContent, findIndex]);
      useEffect(() => {
        if (!docs || !findCfg.open || !toolbar) return;
        let live = true;
        void toolbar.readSearchText().then((result) => {
          if (live) setFindContent(result || '');
        });
        return () => {
          live = false;
        };
      }, [docs, findCfg.open, findCfg.find, toolbar]);
      const findSearchable = useMemo(
        () =>
          findCfg.blind
            ? BLIND_REGEX.reduce((value, expression) => value.replace(expression, ''), findContent)
            : findContent,
        [findCfg.blind, findContent],
      );
      const findMatcher = useMemo(() => {
        if (!findCfg.find) return null;
        const value = findCfg.blind
          ? BLIND_REGEX.reduce((text, expression) => text.replace(expression, ''), findCfg.find)
          : findCfg.find;
        if (!value) return null;
        const body = value.replace(TerraQualityRegex.REGEX_G_REGEX_9(), '\\$&');
        return new RegExp(
          findCfg.full ? `(?<!${FIND_WORD})${body}(?!${FIND_WORD})` : body,
          `${findCfg.case ? 'g' : 'gi'}u`,
        );
      }, [findCfg]);
      const findMatches = useMemo(
        () =>
          findMatcher && findSearchable
            ? Array.from(findSearchable.matchAll(findMatcher), (match) => match.index ?? 0)
            : [],
        [findMatcher, findSearchable],
      );
      const findJsonBlocked = looksLikeJsonBlob(findCfg.find) || looksLikeJsonBlob(findCfg.replace);
      /** Focuses and selects the search field after the find popover has opened. */
      const focusFind = (): void => {
        requestAnimationFrame(() => {
          findRef.current?.focus();
          findRef.current?.select();
        });
      };
      /** Opens find and replace with the current browser selection as the initial search text. */
      const openFindSelection = (): void => {
        setFindCfg((p) => ({
          ...p,
          find: window.getSelection()?.toString().replace(/\r\n?/gu, '\n') || p.find,
          open: true,
        }));
        focusFind();
      };
      /**
       * Moves to the next or previous search result and keeps it visible below the toolbar.
       *
       * @param backward - Moves toward earlier matches when `true`.
       */
      const navigateFind = (backward = false): void => {
        const browser = window as Window & {
          find?: (
            value: string,
            caseSensitive?: boolean,
            backward?: boolean,
            wrapAround?: boolean,
            wholeWord?: boolean,
            searchInFrames?: boolean,
            showDialog?: boolean,
          ) => boolean;
        };
        const finder = typeof browser.find === 'function' ? browser.find.bind(browser) : null;
        if (findCfg.find && !findCfg.blind && findMatches.length)
          setFindIndex((p) => (p + (backward ? -1 : 1) + findMatches.length) % findMatches.length);
        if (findCfg.find && !findCfg.blind && finder) {
          finder(findCfg.find, findCfg.case, backward, true, false, true, findCfg.full);
          requestAnimationFrame(() => {
            const selection = window.getSelection();
            if (!selection || !selection.rangeCount) return;
            let rect = selection.getRangeAt(0).getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) {
              const codemirrorSel = document.querySelector(
                '.docs-code-block .cm-selectionBackground, .docs-code-block .cm-search-match',
              );
              if (codemirrorSel) rect = codemirrorSel.getBoundingClientRect();
            }
            if (rect.width === 0 && rect.height === 0) return;
            const toolbarEl = document.querySelector('[data-docs-toolbar-frame]');
            const top = toolbarEl ? toolbarEl.getBoundingClientRect().bottom : 60;
            if (rect.top < top + 40) {
              window.scrollBy({ top: rect.top - top - 60, behavior: 'auto' });
            } else if (rect.bottom > window.innerHeight - 40) {
              window.scrollBy({
                top: rect.bottom - window.innerHeight + 60,
                behavior: 'auto',
              });
            }
          });
        }
      };
      useEffect(() => {
        if (docs && findCfg.open) focusFind();
      }, [docs, findCfg.open]);
      useEffect(() => {
        setFindIndex(0);
      }, [findCfg.find]);
      useEffect(() => {
        if (!findMatches.length) {
          setFindIndex(0);
          return;
        }
        setFindIndex((previous) => Math.min(previous, findMatches.length - 1));
      }, [findMatches.length]);
      useEffect(() => {
        if (!docs || mode === 'view') return;
        /**
         * Routes keyboard shortcuts to the active find controls.
         *
         * @param event - Keyboard event used to detect find and result-navigation shortcuts.
         */
        const onKeyDown = (event: KeyboardEvent): void => {
          if ((event.metaKey || event.ctrlKey) && event.key?.toLowerCase() === 'f') {
            event.preventDefault();
            openFindSelection();
            return;
          }
          if (findCfg.open && event.key === 'Enter') {
            event.preventDefault();
            navigateFind(event.shiftKey);
          }
        };
        document.addEventListener('keydown', onKeyDown, true);
        return () => {
          document.removeEventListener('keydown', onKeyDown, true);
        };
      }, [docs, findCfg, mode]);
      useEffect(() => {
        let live = true;
        if (!docs || !editable || !toolbar?.path || !verDialogOpen) {
          setVers([]);
          return;
        }
        const tgtPath = toolbar.path;
        // prettier-ignore
        const tgtId = tgtPath.split('/').pop()?.replace(TerraQualityRegex.REGEX_MDX_I_REGEX(), '') || tgtPath;
        (async (): Promise<void> => {
          try {
            const res = await actions.write.doc.versions.get({ path: tgtPath });
            if (res.error) throw res.error;
            let resultData = res.data;
            if (Array.isArray(resultData) && resultData.length === 0 && tgtPath !== tgtId) {
              const fallback = await actions.write.doc.versions.get({
                path: tgtId,
              });
              if (fallback.error) throw fallback.error;
              if (Array.isArray(fallback.data) && fallback.data.length > 0)
                resultData = fallback.data;
            }
            if (!live || !Array.isArray(resultData)) return;
            setVers(resultData as DocVer[]);
          } catch (err) {
            console.error('[Toolbar:versions] load-failed', {
              path: tgtPath,
              error: err,
            });
            toast.error(err instanceof Error ? err.message : 'Failed to load doc versions.');
          }
        })();
        return () => {
          live = false;
        };
      }, [docs, editable, toolbar?.path, verDialogOpen]);

      // HANDLERS
      const onSave = toolbar
        ? async (e: { preventDefault: () => void }) => {
            e.preventDefault();
            if (!toolbar.save) return;
            try {
              const res = toolbar.save();
              if (res instanceof Promise) await res;
            } catch (err: unknown) {
              console.error('[Docs:save] failed', err);
              toast.error(err instanceof Error ? err.message : 'Unable to save document.');
            }
          }
        : undefined;
      const selVer = vers.find((v) => v.savedAt === selVerId);
      useEffect(() => {
        if (verDialogOpen && !selVerId && vers[0]) setSelVerId(vers[0].savedAt);
      }, [verDialogOpen, selVerId, vers]);
      const previewPack = useMemo(() => parseVerBody(selVer), [selVer]);
      useEffect(() => {
        previewPack.markdown.trim();
      }, [toolbar?.path, vers, selVer, previewPack.json, previewPack.markdown, previewPack.body]);

      /** Provides the current draft's discard action and the selected version's restore action. */
      const toolbarActions = {
        discard: toolbar
          ? async (e: { preventDefault: () => void }): Promise<void> => {
              e.preventDefault();
              if (!toolbar.discard) return;
              try {
                await Promise.resolve(toolbar.discard());
              } catch (_err: unknown) {
                console.error('[Thundra] Discard failed:', _err);
              }
            }
          : undefined,
        restorePreview: async (): Promise<void> => {
          if (!toolbarCtx.edit || !selVerId) return;
          console.info(
            '[Toolbar:history:restore]',
            JSON.stringify({
              path: toolbar?.path ?? null,
              savedAt: selVerId,
              sourceLength: previewPack.markdown.length,
              sourceHead: previewPack.markdown.slice(0, 120),
              sourceTail: previewPack.markdown.slice(-120),
            }),
          );
          if (toolbarCtx.edit.update)
            toolbarCtx.edit.update({
              content: previewPack.body,
              title: selVer?.title || '',
              description: selVer?.description || '',
              source: previewPack.markdown,
            });
          const setCode = toolbarCtx.edit.setCode ?? toolbarCtx.edit.setSrc;
          if (setCode) setCode(previewPack.markdown);
          setVerDialogOpen(false);
          notify({
            error: null,
            fallback: 'Restored version to local draft. Save to apply.',
          });
        },
      };
      const insert = toolbar?.insert ?? adapter?.insert;
      /**
       * Dispatches a structured text command when the editor is in edit mode.
       *
       * @param detail - Toolbar detail describing the requested document update.
       *
       * @return `true` after dispatching in edit mode, or `false` when the editor is read-only.
       */
      const jsonCmd = (
        detail:
          | { type: 'decorator'; decorator: string }
          | { type: 'insert'; block: Record<string, unknown> }
          | { type: 'list'; list: string },
      ): boolean => {
        if (mode !== 'edit') return false;
        window.dispatchEvent(new CustomEvent('docs:json-command', { detail }));
        return true;
      };
      /**
       * Creates a Portable Text block with a fresh key and the supplied field data.
       *
       * @param _type Portable Text block type assigned by the caller.
       * @param val Block fields copied into the new object.
       *
       * @return A block object with a new `_key`, the requested type, and supplied fields.
       */
      const jsonBlock = (_type: string, val: Record<string, unknown>): Record<string, unknown> => ({
        _key: crypto.randomUUID(),
        _type,
        ...val,
      });

      // SELECTION HANDLER
      /**
       * Reads the editor selection for a toolbar template, falling back to the supplied sample text.
       *
       * @param fallback - Sample text used when the current selection is empty or unavailable.
       * @param isInline - Removes line breaks and Docs delimiters when the result must fit inline markup.
       *
       * @returns Selected text or the fallback, normalized for inline insertion when requested.
       */
      const sSel = (fallback: string, isInline = false): string => {
        let text = '';
        try {
          const view = codeViewOf();
          if (view && view.dom.offsetParent !== null) {
            if (!view.state.selection.main.empty)
              text = view.state.sliceDoc(
                view.state.selection.main.from,
                view.state.selection.main.to,
              );
          } else {
            const winSel = window.getSelection();
            // Ignore collapsed selections so the entire containing block is not captured.
            if (winSel && winSel.rangeCount > 0 && !winSel.isCollapsed) text = winSel.toString();
          }
        } catch {
          // Fall back to the caller-provided text below.
        }
        if (!text.trim()) return fallback;
        // Remove Markdown delimiters and line breaks that would escape inline link or emphasis syntax.
        // prettier-ignore
        if (isInline) return text.replace(/[\r\n]+/g, ' ').replace(/(:::|\|\|\||===|\|)/g, '').replace(/\s{2,}/g, ' ').trim() || fallback;
        return text;
      };

      /**
       * Activates a toolbar control through the same pointer and click events as a user interaction.
       *
       * @param label - Accessible label of the control to activate.
       */
      const clickToolbarButton = (label: string): void => {
        const button = document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
        button?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
        button?.click();
      };

      // prettier-ignore
      const toolbarOpts = {
		blocks: [
		{ group: 'type', value: 'p', label: 'Text', icon: TextFontIcon, 		onSelect: () => undefined },
		{ group: 'type', value: 'h2', label: 'Heading 2', icon: DOCS_BLOCK_ICONS.heading, 		onSelect: () => undefined },
		{ group: 'type', value: 'h3', label: 'Heading 3', icon: DOCS_BLOCK_ICONS.heading, 		onSelect: () => undefined },
		{ group: 'type', value: 'h4', label: 'Heading 4', icon: DOCS_BLOCK_ICONS.heading, 		onSelect: () => undefined },
		{ group: 'insert', value: 'table', label: 'Insert table', icon: DOCS_BLOCK_ICONS.table, 		onSelect: () => jsonCmd({ type: 'insert', block: jsonBlock('table', { header: 'Column 1|Column 2', rows: [jsonBlock('row', { cells: [jsonBlock('cell', { content: [jsonBlock('block', { children: [jsonBlock('span', { marks: [], text: 'Text' })], markDefs: [], style: 'normal' })] }), jsonBlock('cell', { content: [jsonBlock('block', { children: [jsonBlock('span', { marks: [], text: 'Text' })], markDefs: [], style: 'normal' })] })] })] }) }) || insert?.(`\n\n<table>\n\t<thead>\n\t\t<tr>\n\t\t\t<th>Column 1</th>\n\t\t\t<th>Column 2</th>\n\t\t</tr>\n\t</thead>\n\t<tbody>\n\t\t<tr>\n\t\t\t<td>Text</td>\n\t\t\t<td>Text</td>\n\t\t</tr>\n\t</tbody>\n</table>\n\n`,) },
		{ group: 'insert', value: 'nodes', label: 'Insert nodes', icon: DOCS_BLOCK_ICONS.nodes, 		onSelect: () => jsonCmd({ type: 'insert', block: jsonBlock('nodes', { edges: [], nodes: [{ id: 'start', type: 'origin', data: { title: 'Start' } }] }) }) || insert?.(EMPTY_NODES) },
		{ group: 'insert', value: 'code-local', label: 'Insert code block', icon: DOCS_BLOCK_ICONS.code, onSelect: () => insertionActions.insertLocalCode() },
		{ group: 'insert', value: 'code-received', label: 'Receive value', icon: ShareIcon, 		onSelect: () => { setEndpointOpen(true); } },
		{ group: 'insert', value: 'math', label: 'Insert math', icon: DOCS_BLOCK_ICONS.math, 		onSelect: () => jsonCmd({ type: 'insert', block: jsonBlock('math', { code: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}" }) }) || insert?.(`\n\n<DocsMath code="f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}" />\n\n`) },
		{ group: 'insert', value: 'tsdocs', label: 'Insert TypeDoc', icon: DOCS_BLOCK_ICONS.tsDocs, 		onSelect: () => jsonCmd({ type: 'insert', block: jsonBlock('tsDocs', { scope: '' }) }) || insert?.(`\n\n<TsDocs scope="" />\n\n`) },
		{ group: 'insert', value: 'accordion', label: 'Insert accordion', icon: DOCS_BLOCK_ICONS.accordion, onSelect: () => { const markdown = '\n\n===[Accordion Item]\n\n' + sSel('Content...') + '\n\n===\n\n'; if (!jsonCmd({ type: 'insert', block: jsonBlock('raw', { markdown }) })) insert?.(markdown); } },
		{ group: 'insert', value: 'tabs', label: 'Insert tabs', icon: DOCS_BLOCK_ICONS.tabs, onSelect: () => { const markdown = '\n\n|||[Tabs Item]\n\n' + sSel('Content...') + '\n\n|||\n\n'; if (!jsonCmd({ type: 'insert', block: jsonBlock('raw', { markdown }) })) insert?.(markdown); } },
		{ group: 'insert', value: 'aside', label: 'Insert aside', icon: DOCS_BLOCK_ICONS.callout, 		onSelect: () => jsonCmd({ type: 'insert', block: jsonBlock('callout', { content: [jsonBlock('block', { children: [jsonBlock('span', { marks: [], text: sSel('Content...') })], markDefs: [], style: 'normal' })], kind: 'note', title: 'Note' }) }) || insert?.(`\n\n:::note[Note]\n\n${sSel('Content...')}\n\n:::\n\n`) },
		{ group: 'insert', value: 'attachment', label: 'Insert image', icon: DOCS_BLOCK_ICONS.docImage, 		onSelect: () => jsonCmd({ type: 'insert', block: jsonBlock('docImage', { alt: '', url: '' }) }) || clickToolbarButton('Insert attachment') },
		{ group: 'insert', value: 'component', label: 'Insert component', icon: DOCS_BLOCK_ICONS.code, 		onSelect: () => { clickToolbarButton('Insert component'); } },
		...(mode === 'edit' ? [] : (blocks ?? []).map(({ type: v, label: l, icon: i, insert: c }) => ({ group: 'insert' as const, value: v, label: `Insert ${l?.toLowerCase()}`, icon: i, 		onSelect: () => insert?.(c()) }))),
		] as BlockOpt[],
		formats: [
			{ key: 'bold', lbl: 'Bold', icon: BoldIcon, shortcut: '⌘B', format: (v: string): string => `**${v}**` },
			{ key: 'italic', lbl: 'Italic', icon: ItalicIcon, shortcut: '⌘I', format: (v: string): string => `_${v}_` },
			{ key: 'underline', lbl: 'Underline', icon: UnderlineIcon, shortcut: '⌘U', format: (v: string): string => `<u>${v}</u>` },
			{ key: 'strikethrough', lbl: 'Strikethrough', icon: StrikethroughIcon, shortcut: '⌘X', format: (v: string): string => `~~${v}~~` },
			{ key: 'link', lbl: 'Link', icon: LinkIcon, shortcut: '⌘K', format: (v: string): string => `[${v}](url)` },
		],
		};

      // DATA
      const insertionActions = {
        // Inserts a starter text code block in structured or Markdown form.
        insertLocalCode: (): void => {
          if (
            jsonCmd({
              type: 'insert',
              block: jsonBlock('code', { language: 'text', value: 'Code...' }),
            })
          )
            return;
          insert?.(`\n\n<Code language="text">\n{\`\nCode...\n\`}\n</Code>\n\n`);
        },
        // Inserts the local placeholder or serializes a received endpoint value as a JSON code block.
        insertCode: (s: 'local' | 'received', e = ''): void => {
          const code =
            s === 'received'
              ? `\n\n<Code language="json" source=${JSON.stringify(e)} />\n\n`
              : '\n\n<Code language="text">\n{`\nCode...\n`}\n</Code>\n\n';
          if (
            jsonCmd({
              type: 'insert',
              block: jsonBlock(
                'code',
                s === 'received'
                  ? { language: 'json', source: e, value: '' }
                  : { language: 'text', value: 'Code...' },
              ),
            })
          )
            return;
          if (insert) {
            const srcLength = codeLength.current;
            insert(
              code,
              codeAtEnd.current ||
                (srcLength > 0 && (codeSel.current?.code?.to ?? -1) >= srcLength),
              codeSel.current,
            );
            codeAtEnd.current = false;
            codeSel.current = null;
            return;
          }
          const curr = toolbarCtx.edit?.code ?? toolbarCtx.edit?.source ?? '';
          const sel = codeSel.current?.code;
          const range =
            codeAtEnd.current || !sel
              ? { from: curr.length, to: curr.length }
              : {
                  from: Math.min(sel.from, curr.length),
                  to: Math.min(sel.to, curr.length),
                };
          const n = `${curr.slice(0, range.from)}${code}${curr.slice(range.to)}`;
          toolbarCtx.edit?.update({ source: n });
          toolbarCtx.edit?.setCode(n);
          if (toolbarCtx.edit) {
            codeAtEnd.current = false;
            codeSel.current = null;
            return;
          }
          const view = codeViewOf();
          if (view) {
            const range = codeAtEnd.current
              ? { from: view.state.doc.length, to: view.state.doc.length }
              : (codeSel.current?.code ?? view.state.selection.main);
            view.dispatch({
              changes: { from: range.from, insert: code, to: range.to },
              scrollIntoView: true,
              selection: { anchor: range.from + code.length },
            });
            view.focus();
            codeAtEnd.current = false;
            codeSel.current = null;
            return;
          }
          codeAtEnd.current = false;
          codeSel.current = null;
        },
        // Inserts the trimmed endpoint result and closes the receive-value dialog.
        receiveCode: (): void => {
          const src = endpoint.trim();
          if (!src) return;
          insertionActions.insertCode('received', src);
          setEndpoint('');
          setEndpointOpen(false);
        },
      };

      // KEYBOARD SHORTCUTS
      useEffect(() => {
        if (mode === 'view' || !onSave) return;
        /**
         * Saves the current draft when the user presses the platform save shortcut.
         *
         * @param e - Keyboard event used to detect and cancel the browser save action.
         */
        const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.metaKey || e.ctrlKey) && e.key?.toLowerCase() === 's') {
            e.preventDefault();
            void onSave(e);
          }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
          document.removeEventListener('keydown', handleKeyDown);
        };
      }, [mode, onSave]);

      // RENDER
      return (
        <ErrorBoundary name="Toolbar">
          <div
            className="docs-toolbar-scroll not-prose pointer-events-auto sticky top-10 isolate z-50 mx-auto -mt-5 mb-5 !w-full !max-w-full self-start overflow-visible px-6 text-primary-12 print:hidden md:px-10"
            data-docs-toolbar-frame
            data-docs-toolbar-scroll
            data-can-edit={editable ? 'true' : 'false'}
          >
            <div
              aria-hidden="true"
              className="docs-toolbar-backdrop pointer-events-none absolute inset-x-0 -bottom-12 -top-16 z-0"
            />
            <div className="relative z-10 rounded-lg border border-primary-6 bg-primary-3">
              <TooltipProvider>
                <div
                  className="mdxeditor-toolbar not-prose relative z-10 box-border flex !w-full max-w-full min-w-0 flex-wrap items-center justify-between gap-0.5 px-2 py-1 text-primary-12 print:hidden"
                  data-docs-main-toolbar
                >
                  {mode === 'view' ? (
                    <>
                      {docs && (
                        <Mode
                          editable={editable}
                          mode={mode}
                          disabled={!ready}
                          onModeChange={(v) => {
                            if (!toolbar) return;
                            toolbar.setMode(v).catch((e) => {
                              console.error('[Toolbar:mode] change-failed', {
                                mode: v,
                                error: e,
                              });
                              toast.error(
                                e instanceof Error ? e.message : 'Failed to change mode.',
                              );
                              clearTransition();
                            });
                          }}
                        />
                      )}
                      {docs && quizContext?.config.toolbar && (
                        <>
                          <UiButton
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setQuizOpen(true)}
                          >
                            Generate quiz
                          </UiButton>
                          <Dialog open={quizOpen} onOpenChange={setQuizOpen}>
                            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Generate a quiz</DialogTitle>
                                <DialogDescription>
                                  Build a quiz from the current Docs leaf.
                                </DialogDescription>
                              </DialogHeader>
                              <DocsQuizGenerator
                                title={quizContext.title}
                                markdown={quizContext.markdown}
                                generate={quizContext.config.generate}
                              />
                            </DialogContent>
                          </Dialog>
                        </>
                      )}
                    </>
                  ) : mode === 'attachments' ? (
                    // ATTACHMENT FILTERS
                    <>
                      {/* MODE */}
                      {docs && (
                        <Mode
                          editable={editable}
                          mode={mode}
                          disabled={!ready}
                          onModeChange={(v) => {
                            if (!toolbar) return;
                            toolbar.setMode(v).catch((e) => {
                              console.error('[Toolbar:mode] change-failed', {
                                mode: v,
                                error: e,
                              });
                              toast.error(
                                e instanceof Error ? e.message : 'Failed to change mode.',
                              );
                              clearTransition();
                            });
                          }}
                        />
                      )}
                      {/* ATTACHMENTS */}
                      <ToggleGroup
                        type="multiple"
                        value={[...toolbarCtx.attachmentFilter]}
                        onValueChange={(v) => {
                          if (v) $attachmentFilter.set(v as AttchType[]);
                        }}
                        className="ml-auto max-w-full flex-wrap justify-end"
                      >
                        {ATTCH_TYPES.map((f) => (
                          <ToggleGroupItem
                            key={f}
                            value={f}
                            size="sm"
                            className="h-6 px-2 text-xs capitalize"
                            onMouseDown={preserveSel}
                          >
                            {f}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </>
                  ) : (
                    <>
                      {/* BLOCKS */}
                      <ButtonGroup>
                        {/* block select */}
                        <BlockType
                          disabled={!ready}
                          toolbar={toolbar}
                          adapter={adapter}
                          options={toolbarOpts.blocks}
                          json={mode === 'edit'}
                        />
                        {/* format */}
                        {toolbarOpts.formats
                          .map(({ key: k, lbl: l, icon: i, shortcut: s, format: f }) => ({
                            key: k,
                            lbl: l,
                            icon: i,
                            shortcut: s,
                            onClick: () =>
                              jsonCmd({
                                type: 'decorator',
                                decorator: k === 'strikethrough' ? 'strike-through' : k,
                              }) ||
                              (adapter?.format
                                ? adapter.format(
                                    k === 'strikethrough'
                                      ? 'strikethrough'
                                      : (k as 'bold' | 'italic' | 'underline' | 'link'),
                                  )
                                : insert?.(f(sSel('text', true)))),
                          }))
                          .map(({ key: k, lbl: l, icon: i, shortcut: s, onClick: o }) => (
                            <Button
                              key={k}
                              lbl={l}
                              shortcut={s}
                              disabled={!ready}
                              onMouseDown={preserveSel}
                              onClick={o}
                            >
                              {React.createElement(i)}
                            </Button>
                          ))}
                        {/* lists */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button lbl="Insert list" disabled={!ready} onMouseDown={preserveSel}>
                              <BulletListIcon />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {[
                              {
                                key: 'bullet' as const,
                                lbl: 'Bulleted list',
                                icon: BulletListIcon,
                                prefix: '\n- ',
                                fallback: 'Item',
                              },
                              {
                                key: 'number' as const,
                                lbl: 'Numbered list',
                                icon: NumberListIcon,
                                prefix: '\n1. ',
                                fallback: 'Item',
                              },
                              {
                                key: 'check' as const,
                                lbl: 'Checklist',
                                icon: CheckListIcon,
                                prefix: '\n- [ ] ',
                                fallback: 'Task',
                              },
                            ]
                              .map(({ key: k, lbl: l, icon: i, prefix: p, fallback: f }) => ({
                                key: k,
                                lbl: l,
                                icon: i,
                                onClick: () =>
                                  jsonCmd({
                                    type: 'list',
                                    list: k === 'check' ? 'bullet' : k,
                                  }) ||
                                  (adapter?.toggleList
                                    ? adapter.toggleList(k)
                                    : toolbar?.toggleList
                                      ? toolbar.toggleList(k)
                                      : insert?.(`${p}${sSel(f)}\n`)),
                              }))
                              .map(({ key: k, lbl: l, icon: i, onClick: o }) => (
                                <DropdownMenuItem
                                  key={k}
                                  disabled={!ready}
                                  onSelect={() => {
                                    if (o) o();
                                  }}
                                  className={MENU_GAP_CLASS}
                                >
                                  {React.createElement(i, {
                                    className: ICON_CLASS,
                                  })}
                                  <span>{l}</span>
                                </DropdownMenuItem>
                              ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </ButtonGroup>
                      <div className={DOCS_LAYOUT_CLASSES.compactRow}>
                        {/* MODE */}
                        {docs && (
                          <Mode
                            editable={editable}
                            mode={mode}
                            disabled={!ready}
                            onModeChange={(v) => {
                              if (!editable || !toolbar) return;
                              toolbar.setMode(v).catch((e) => {
                                console.error('[Toolbar:mode] change-failed', {
                                  mode: v,
                                  error: e,
                                });
                                toast.error(
                                  e instanceof Error ? e.message : 'Failed to change mode.',
                                );
                                clearTransition();
                              });
                            }}
                          />
                        )}
                        {/* SAVE */}
                        {/* find/replace */}
                        <TextTooltip
                          content="Find (⌘F)"
                          side="top"
                          align="center"
                          delayDuration={400}
                        >
                          {docs && (
                            <Popover
                              open={findCfg.open}
                              onOpenChange={(o) => {
                                setFindCfg((previous) => ({ ...previous, open: o }));
                              }}
                            >
                              <PopoverTrigger asChild>
                                <UiButton
                                  size="xs"
                                  variant="ghost"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                  }}
                                  onClick={openFindSelection}
                                >
                                  <SearchIcon /> Find
                                </UiButton>
                              </PopoverTrigger>
                              <PopoverContent align="end" className="w-80 space-y-2">
                                {[
                                  {
                                    title: 'Find',
                                    value: findCfg.find,
                                    key: 'find',
                                    ref: findRef,
                                    placeholder: 'Search text',
                                  },
                                  {
                                    title: 'Replace',
                                    value: findCfg.replace,
                                    key: 'replace',
                                    placeholder: 'Replace',
                                  },
                                ].map((f) => (
                                  <div key={f.title} className="space-y-1">
                                    <Label>{f.title}</Label>
                                    <Textarea
                                      ref={'ref' in f ? f.ref : undefined}
                                      value={f.value}
                                      onChange={(event) => {
                                        setFindCfg({
                                          ...findCfg,
                                          [f.key]: event.currentTarget?.value ?? '',
                                        });
                                      }}
                                      placeholder={f.placeholder}
                                      rows={Math.max(2, f.value.split('\n').length)}
                                      onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                          event.preventDefault();
                                          navigateFind(event.shiftKey);
                                        }
                                      }}
                                    />
                                  </div>
                                ))}
                                <div className="flex items-center justify-between text-xs text-primary-11">
                                  <span>
                                    {findCfg.find &&
                                      (findMatches.length
                                        ? `Result ${findIndex + 1}/${findMatches.length}`
                                        : 'No matches')}
                                  </span>
                                  {findCfg.blind && <span>Text only</span>}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {[
                                    {
                                      icon: <LeftArrowIcon />,
                                      backward: true,
                                      label: 'Previous match',
                                    },
                                    {
                                      icon: <RightArrowIcon />,
                                      backward: false,
                                      label: 'Next match',
                                    },
                                  ].map((b) => (
                                    <UiButton
                                      key={String(b.backward)}
                                      size="xs"
                                      variant="tonal"
                                      disabled={!findCfg.find || findCfg.blind}
                                      onClick={() => navigateFind(b.backward)}
                                      aria-label={b.label}
                                      title={b.label}
                                    >
                                      {b.icon}
                                    </UiButton>
                                  ))}
                                  {[
                                    { key: 'case', title: 'Case sensitive', content: <CaseIcon /> },
                                    { key: 'full', title: 'Full words', content: <FullWordIcon /> },
                                    { key: 'blind', title: 'Markdown blind', content: 'Blind' },
                                  ].map((t) => (
                                    <Toggle
                                      key={t.key}
                                      size="xs"
                                      variant="tonal"
                                      aria-label={t.title}
                                      title={t.title}
                                      pressed={findCfg[t.key as keyof typeof findCfg] as boolean}
                                      onPressedChange={(value) => {
                                        setFindCfg((previous) => ({
                                          ...previous,
                                          [t.key]: value,
                                        }));
                                      }}
                                    >
                                      {t.content}
                                    </Toggle>
                                  ))}
                                  <UiButton
                                    size="xs"
                                    disabled={
                                      !findMatches.length ||
                                      !toolbar ||
                                      toolbar.busy === 'saving' ||
                                      findCfg.blind ||
                                      findJsonBlocked
                                    }
                                    onClick={() => {
                                      if (findJsonBlocked) {
                                        toast.error(
                                          'Paste markdown, not JSON, into find or replace.',
                                        );
                                        return;
                                      }
                                      if (findMatcher && toolbar)
                                        toolbar.applySearchText(
                                          findContent.replace(findMatcher, findCfg.replace),
                                        );
                                    }}
                                    aria-label="Replace"
                                    title="Replace"
                                  >
                                    <ReplaceIcon />
                                  </UiButton>
                                  {findJsonBlocked && (
                                    <span className="text-red-11 text-xs">JSON input blocked</span>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                        </TextTooltip>
                        {/* undo/redo */}
                        <Undo onMouseDown={preserveSel} disabled={!ready} adapter={adapter} />
                        {docs && (
                          <>
                            {/* discard */}
                            <UiButton
                              size="xs"
                              variant="tonal"
                              disabled={
                                !ready ||
                                !dirty ||
                                saving !== null ||
                                (toolbar?.optimistic ?? false)
                              }
                              onMouseDown={(e) => {
                                e.preventDefault();
                              }}
                              onClick={(e) => void toolbarActions.discard?.(e)}
                            >
                              Discard
                            </UiButton>
                            {/* save */}
                            <ButtonGroup>
                              <TextTooltip
                                content="Save (⌘S)"
                                side="top"
                                align="center"
                                delayDuration={400}
                              >
                                <UiButton
                                  size="xs"
                                  disabled={!ready || !dirty}
                                  loading={saving === 'saving'}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                  }}
                                  onClick={(e) => void onSave?.(e)}
                                >
                                  Save
                                </UiButton>
                              </TextTooltip>
                              <TextTooltip
                                content="Version History"
                                side="top"
                                align="center"
                                delayDuration={400}
                              >
                                <UiButton
                                  size="xs"
                                  className="px-0.5"
                                  disabled={!ready}
                                  aria-label="Version History"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                  }}
                                  onClick={() => {
                                    const firstVersion = vers[0];
                                    if (firstVersion && !selVerId)
                                      setSelVerId(firstVersion.savedAt);
                                    setVerDialogOpen(true);
                                  }}
                                >
                                  <CaretDownIcon />
                                </UiButton>
                              </TextTooltip>
                              <Dialog open={verDialogOpen} onOpenChange={setVerDialogOpen}>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Version History</DialogTitle>
                                    <DialogDescription className="sr-only">
                                      Select a version to preview and restore.
                                    </DialogDescription>
                                    <Select value={selVerId} onValueChange={setSelVerId}>
                                      <SelectTrigger
                                        className="h-14"
                                        aria-label="Select a version..."
                                      >
                                        <SelectValue placeholder="Select a version..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {vers.map((v) => (
                                          <SelectItem key={v.savedAt} value={v.savedAt}>
                                            <span className="flex flex-col text-left">
                                              <span>
                                                {v.title} ({new Date(v.savedAt).toLocaleString()})
                                              </span>
                                              <span className={SECONDARY_TEXT_CLASS}>
                                                {v.description}
                                              </span>
                                            </span>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </DialogHeader>
                                  <div className={DOCS_LAYOUT_CLASSES.flexScrollArea}>
                                    <CodeBlock
                                      tone="view"
                                      language="mdx"
                                      docsSource
                                      code={previewPack.markdown.trim() || ' '}
                                    />
                                  </div>
                                  {/* prettier-ignore */}
                                  <DialogFooter>
														<UiButton variant='ghost' onClick={() => { setVerDialogOpen(false); }}>Cancel</UiButton>
									<UiButton disabled={!selVer} onClick={toolbarActions.restorePreview}>Restore</UiButton>
													</DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </ButtonGroup>
                            {docs && publishDraft && (
                              <UiButton
                                size="xs"
                                disabled={!ready || saving === 'saving'}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  if (!publishDraft || !toolbar?.path) return;
                                  const path = toolbar.path;
                                  void (async () => {
                                    try {
                                      if (dirty && toolbar.save) await toolbar.save();
                                      await publishDraft(path);
                                      toast.success('Published.');
                                    } catch (err) {
                                      toast.error(
                                        err instanceof Error
                                          ? err.message
                                          : 'Unable to publish document.',
                                      );
                                    }
                                  })();
                                }}
                              >
                                Publish
                              </UiButton>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Uploader
                          icon={ImageIcon}
                          insert={insert}
                          onMouseDown={preserveSel}
                          disabled={!ready}
                          ctx={toolbar?.path}
                        />
                        <Custom
                          onInsert={(_statement, v) => insert?.(v, true)}
                          onInsertMd={insert}
                          onMouseDown={preserveSel}
                          disabled={!ready}
                          ctx={toolbar?.path}
                        />
                      </div>
                      <Dialog
                        open={endpointOpen}
                        onOpenChange={(o) => {
                          setEndpointOpen(o);
                          if (!o) setEndpoint('');
                        }}
                      >
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Receive value</DialogTitle>
                            <DialogDescription className="sr-only">
                              Enter an API endpoint to receive code value into the editor.
                            </DialogDescription>
                          </DialogHeader>
                          <Label htmlFor="docs-received-code-endpoint">API endpoint</Label>
                          <Input
                            id="docs-received-code-endpoint"
                            value={endpoint}
                            onChange={(e) => {
                              setEndpoint(e.target.value);
                            }}
                            placeholder="/api/docs?action=testimonials"
                          />
                          {/* prettier-ignore */}
                          <div className={DOCS_LAYOUT_CLASSES.dialogActions}>
										<UiButton variant='outline' onClick={() => { setEndpointOpen(false); }}>Cancel</UiButton>
					<UiButton disabled={!endpoint.trim()} onClick={insertionActions.receiveCode}>Receive value</UiButton>
									</div>
                        </DialogContent>
                      </Dialog>
                    </>
                  )}
                </div>
              </TooltipProvider>
            </div>
          </div>
        </ErrorBoundary>
      );
    },
  };
export { DocsToolbarActions, Toolbar };

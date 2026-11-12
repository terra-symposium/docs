/**
 * src/components/terra/pages/docs/_editable.tsx
 * JSON draft state and persistence provider for Docs View, Edit, and Attachments modes.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import {
  $editReadyPath,
  $editorMounts,
  $hydrating,
  $mode,
  $surfaceReady,
  $toolbar,
  clearTransition,
  transitionStore,
  useAtom,
  useTransitionState,
} from '../../../../lib/terra/docs/state.js';
import { actions } from '../../../../lib/terra/runtime/action-proxy.js';
import { cn } from '../../../../lib/terra/runtime/runtime.js';
import { getDocsHostAdapter } from '../../../../lib/host-runtime.js';
import { isDocBody } from '../../../../lib/terra/runtime/types.js';
import { toast } from 'sonner';
import { uploadAssetChunked } from '../../../../lib/terra/docs/assets.js';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

// COMPONENTS
import React from 'react';
import { EditStateCtx, EditorSurfaceCtx, TransitionCtx } from '../../../../lib/terra/docs/state.js';
import { ErrorBoundary } from '../../ui.js';
import { Progress } from '@terra-symposium/styling/ui';

// TYPES
import type {
  DocBody,
  DocsPermissionLevel as Permission,
  Draft,
  EditorRefs,
  EditorSel,
  EditorSurface,
  Mode,
  ToolbarState,
} from '../../../../lib/terra/runtime/types.js';
import type { ReactNode } from 'react';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Renders the loader component.
 *
 * @param className - Additional classes merged into the loading indicator.
 *
 * @return The accessible loading indicator used by Docs transitions.
 */
export function Loader({ className }: { className?: string }): React.JSX.Element {
  const mounts = useAtom($editorMounts);
  const loadingImg = getDocsHostAdapter()?.assetUrl?.(
    'image-1e365a8f99a0859fa0ad38617b1b399520b32767-984x984',
    1200,
  );
  return (
    <ErrorBoundary name="Loader">
      <div
        aria-live="polite"
        aria-label="Loading document blocks"
        className={cn(
          'flex size-full flex-col items-center justify-center gap-5 bg-primary-1',
          className,
        )}
        data-docs-loading-overlay
        role="status"
      >
        {loadingImg && (
          <img alt="" src={loadingImg} className={cn('size-40', 'max-w-full object-contain')} />
        )}
        <Progress
          className="h-3 w-56"
          value={Math.max(
            8,
            mounts.expected.length ? (mounts.mounted.length / mounts.expected.length) * 100 : 0,
          )}
        />
        <span className="sr-only">
          Loading document blocks: {mounts.mounted.length}/{mounts.expected.length}
        </span>
      </div>
    </ErrorBoundary>
  );
}

/**
 * Orchestrates layout math and hydration visibility to prevent FOUC during navigation.
 *
 * @param children - Child content nested inside transition shell's rendered output.
 * @param className - Additional CSS classes merged into transition shell.
 * @param mode - Mode input supplied to transition shell's operation.
 * @param path - Source or route path resolved for transition shell.
 * @param staticContent Whether the page is static and can skip client editor-mount visibility gating.
 *
 * @return A transition wrapper that keeps page visibility synchronized with route hydration.
 */
export function TransitionShell({
  children,
  className,
  mode,
  path,
  staticContent = false,
}: {
  children: ReactNode;
  className?: string;
  mode: Mode | 'transitioning';
  path?: string;
  staticContent?: boolean;
}): React.JSX.Element {
  // STATE
  const container = useRef<HTMLDivElement | null>(null);
  const mounts = useAtom($editorMounts);
  const transition = useTransitionState();
  const pending = useRef(false);
  const reported = useRef(false);
  const [state, setState] = useState<{
    armed: boolean;
    loading: boolean;
    ready: boolean;
  }>(() => ({ armed: staticContent, loading: !staticContent, ready: staticContent }));

  // LIFECYCLE
  // enforces loading guard during cross-page transitions to prevent layout shifts
  useEffect(() => {
    if (staticContent) {
      reported.current = false;
      pending.current = false;
      setState((p) => ({ ...p, armed: true, loading: false, ready: true }));
      return;
    }
    if (transition === 'idle') return;
    reported.current = false;
    pending.current = true;
    $editReadyPath.set(null);
    $surfaceReady.set(null);
    setState((p) => ({ ...p, armed: false, loading: true, ready: false }));
  }, [staticContent, transition]);
  useEffect(() => {
    if (mode === 'edit') return;
    setState((p) => (p.armed ? p : { ...p, armed: true }));
  }, [mode]);

  // A missing editor readiness event must not leave the document hidden without feedback.
  useEffect(() => {
    if (staticContent || !state.loading || !state.armed) return;
    let a = true;
    window.setTimeout(() => {
      if (!a || reported.current) return;
      reported.current = true;
      toast.error('Document blocks did not finish loading. The available content is shown below.');
      pending.current = false;
      clearTransition();
      setState((p) => ({ ...p, loading: false, ready: true }));
    }, 5_000);
    return () => {
      a = false;
    };
  }, [state.armed, state.loading, staticContent]);

  // releases layout lock once the internal editor or viewer confirms mounting
  useEffect(() => {
    if (transition === 'idle' || !state.ready || pending.current) return;
    const tgt =
      transition === 'local'
        ? null
        : transition === 'p'
          ? '__pending__'
          : ((typeof transition === 'string' ? transition.slice(3) : '') as Mode | 'transitioning');
    if (tgt && tgt !== '__pending__' && tgt !== mode) return;
    const frames: number[] = [];
    frames.push(
      window.requestAnimationFrame(() => {
        frames.push(window.requestAnimationFrame(clearTransition));
      }),
    );
    return (): void => {
      frames.forEach((frame) => window.cancelAnimationFrame(frame));
    };
  }, [mode, state.ready, transition]);

  // SYNCHRONIZATION
  // Keeps the transition lock aligned with the structured editor lifecycle.
  useEffect(() => {
    if (staticContent) return;
    const root = container.current;
    if (!root) return;
    /**
     * Handles check.
     *
     */
    const check = () => {
      const tgt =
        typeof transition === 'string' && transition.startsWith('to-')
          ? (transition.slice(3) as Mode)
          : (mode as Mode);
      const mounts = $editorMounts.get();
      const ready =
        $surfaceReady.get() === tgt &&
        $hydrating.get() === 0 &&
        (tgt !== 'edit' ||
          ($editReadyPath.get() === path &&
            mounts.path === path &&
            mounts.expected.length === mounts.mounted.length &&
            !!root.querySelector('[data-docs-body-editor][data-docs-editor-initialized="true"]')));
      if (ready) pending.current = false;
      setState((p) =>
        p.ready === ready && p.loading === !ready ? p : { ...p, ready, loading: !ready },
      );
    };
    const stop = [
      $surfaceReady.listen(check),
      $editReadyPath.listen(check),
      $editorMounts.listen(check),
      $hydrating.listen(check),
    ];
    check();
    return (): void => {
      for (let i = 0; i < stop.length; i++) stop[i]?.();
    };
  }, [mode, path, staticContent, transition]);

  // restores cursor or scroll position globally once shell unlocks
  useEffect(() => {
    transitionStore.restore?.();
  }, [state.loading, state.ready, transition]);
  const setLoading = useCallback((l: boolean) => {
    setState((p) => (p.loading === l ? p : { ...p, loading: l }));
  }, []);
  const setSrcReady = useCallback((a: boolean): void => {
    setState((p) => (p.armed === a ? p : { ...p, armed: a }));
  }, []);
  const loading = !staticContent && (transition !== 'idle' || state.loading);

  // RENDER
  return (
    <ErrorBoundary name="TransitionShell">
      <TransitionCtx.Provider
        value={useMemo(
          () => ({ setLoading, setSourceReady: setSrcReady }),
          [setLoading, setSrcReady],
        )}
      >
        <div
          ref={container}
          suppressHydrationWarning
          className={cn(
            'visible relative size-full min-w-0 max-w-none overflow-visible text-inherit print:m-0 print:h-auto print:min-h-0 print:w-full print:overflow-visible print:p-0',
            className,
          )}
          data-docs-shell=""
          data-docs-mounted={mounts.mounted.length}
          data-docs-expected={mounts.expected.length}
          data-docs-mode={mode}
          data-loading={loading}
        >
          <div
            aria-hidden={loading ? 'true' : 'false'}
            className={loading ? 'hidden' : 'block'}
            data-docs-transition-content
          >
            {children}
          </div>
          {loading && <Loader className="absolute inset-0 z-10" />}
        </div>
      </TransitionCtx.Provider>
    </ErrorBoundary>
  );
}

/**
 * Renders the editable component.
 *
 * @param children - Child content nested inside editable's rendered output.
 * @param content - Content input supplied to editable's operation.
 * @param description - Supporting text shown in editable.
 * @param path - Source or route path resolved for editable.
 * @param permission - Permission input supplied to editable's operation.
 * @param pathname - Pathname input supplied to editable's operation.
 * @param title - Heading text shown in editable.
 * @param src Markdown source associated with the editor draft.
 *
 * @return The document editor or read-only view configured for the supplied document and permission.
 */
export default function Editable({
  children,
  content = [],
  description = '',
  path,
  permission,
  pathname,
  title = 'Untitled',
  source: src = '',
}: {
  pathname: string;
} & {
  children?: React.ReactNode;
  content?: DocBody;
  description?: string;
  path?: string;
  permission: Permission;
  source?: string;
  title?: string;
}): React.JSX.Element {
  // STATES
  const mode = useAtom($mode);
  const transition = useContext(TransitionCtx);
  const refs = useRef<EditorRefs>({
    blob: null,
    body: null,
    code: '',
    dirty: false,
    editor: null,
    lastMd: '',
    load: { ignoreInitialChange: false, pendingContent: '' },
    norm: { force: false, markdown: '', replay: false, structural: false },
    previews: new Map(),
    reparse: '',
    replacements: new Map(),
    route: { path, pathname },
    saved: '',
    selection: null,
    uploads: new Map(),
    version: null,
  });
  const saving = useRef(false);
  const [err, setErr] = useState<string | null>(null);
  // prettier-ignore
  const [state, setState] = useState<{
    busy: string | null;
    dirty: boolean;
    draft: Draft;
    loaded: boolean;
    optimistic: boolean;
    version: number;
  }>({
    busy: null,
    dirty: false,
    draft: { content, description, path: path || pathname, source: src, title },
    loaded: Boolean(content.length || !src),
    optimistic: false,
    version: 0,
  });
  const draftContent = isDocBody(state.draft.content) ? state.draft.content : [];

  // INIT
  useEffect(() => {
    refs.current.route = { path, pathname };
    setState((p) => ({
      ...p,
      draft: {
        ...p.draft,
        content,
        description,
        path: path || pathname,
        source: src,
        title,
      },
      dirty: false,
      loaded: Boolean(content.length || !src),
      version: p.version + 1,
    }));
  }, [content, description, path, pathname, src, title]);
  useEffect(() => {
    if (content.length || !src) return;
    let a = true;
    void actions.read.source.body({ source: src }).then(({ data: d, error: err }) => {
      if (!a) return;
      if (err || !d) {
        setErr(err instanceof Error ? err.message : 'Unable to convert source to document blocks.');
        setState((p) => ({ ...p, loaded: true }));
      } else if (isDocBody(d))
        setState((p) => ({
          ...p,
          draft: { ...p.draft, content: d },
          loaded: true,
        }));
      else {
        setErr('Converted source did not return valid document blocks.');
        setState((p) => ({ ...p, loaded: true }));
      }
    });
    return () => {
      a = false;
    };
  }, [content.length, src]);
  useEffect(() => {
    transition?.setSourceReady(Boolean(state.loaded || draftContent.length || !state.draft.source));
  }, [draftContent.length, state.draft.source, state.loaded, transition]);
  const update = useCallback((v: Partial<Draft>): void => {
    setState((p) => ({ ...p, dirty: true, draft: { ...p.draft, ...v } }));
  }, []);
  const setCode = useCallback((c: string): void => {
    setState((p) =>
      c === p.draft.source ? p : { ...p, dirty: true, draft: { ...p.draft, source: c } },
    );
  }, []);
  const save = useCallback(async (): Promise<void> => {
    const draft = state.draft;
    if (!draft.path || saving.current) return;
    saving.current = true;
    setState((p) => ({ ...p, busy: 'saving' }));
    try {
      const { data, error: err } = await actions.write.doc.save({
        description: draft.description,
        content: isDocBody(draft.content) ? draft.content : [],
        path: draft.path,
        title: draft.title,
      });
      if (err || !data) throw err || new Error('Unable to save document.');
      const saved = data as { content?: DocBody; source?: string };
      setState((p) => ({
        ...p,
        busy: null,
        dirty: false,
        draft: {
          ...p.draft,
          ...(Array.isArray(saved.content) ? { content: saved.content } : {}),
          ...(typeof saved.source === 'string' ? { source: saved.source } : {}),
        },
      }));
    } catch (err) {
      console.error('[Docs:save] failed', err);
      setState((p) => ({ ...p, busy: null }));
      toast.error(err instanceof Error ? err.message : 'Unable to save document.');
    } finally {
      saving.current = false;
    }
  }, [state.draft]);

  // HELPRES
  const setMode = useCallback(
    async (n: Mode): Promise<void> => {
      if (n === 'edit') {
        const loadDraft = getDocsHostAdapter()?.loadDraft;
        const draftPath = state.draft.path || path || pathname;
        if (loadDraft && draftPath) {
          const hostedDraft = await loadDraft(draftPath);
          if (hostedDraft) {
            const hostedContent = Array.isArray(hostedDraft.content)
              ? (hostedDraft.content as DocBody)
              : [];
            setState((p) => ({
              ...p,
              dirty: false,
              loaded: Boolean(hostedContent.length || !hostedDraft.source),
              draft: {
                ...p.draft,
                content: hostedContent,
                ...(hostedDraft.description !== undefined
                  ? { description: hostedDraft.description }
                  : {}),
                ...(hostedDraft.source !== undefined ? { source: hostedDraft.source } : {}),
                ...(hostedDraft.title !== undefined ? { title: hostedDraft.title } : {}),
              },
            }));
            $mode.set(n);
            return;
          }
        }
      }
      if (n === 'edit' && !draftContent.length && state.draft.source) {
        const { data, error: err } = await actions.read.source.body({
          source: state.draft.source,
        });
        if (err || !data) {
          setErr(
            err instanceof Error ? err.message : 'Unable to convert source to document blocks.',
          );
          return;
        }
        if (!isDocBody(data)) {
          setErr('Converted source did not return valid document blocks.');
          return;
        }
        update({ content: data });
      }
      $mode.set(n);
    },
    [draftContent.length, state.draft.source, update],
  );
  const insert = useCallback(
    (m: string, r = false, s?: EditorSel | null): void => {
      void actions.read.source
        .body({ source: m })
        .then(({ data: d, error: err }) => {
          if (err || !d) {
            toast.error(err instanceof Error ? err.message : 'Unable to convert pasted Markdown.');
            return;
          }
          if (!isDocBody(d)) {
            toast.error('Converted Markdown did not return valid document blocks.');
            return;
          }
          update({
            content:
              !r &&
              Boolean(s?.text?.trim()) &&
              s?.text?.trim().length === (refs.current.body?.innerText.trim() || '').length
                ? d
                : [...draftContent, ...d],
          });
        })
        .catch((e) =>
          toast.error(e instanceof Error ? e.message : 'Unable to convert pasted Markdown.'),
        );
    },
    [draftContent, refs, update],
  );
  const controls = useMemo<ToolbarState>(
    () => ({
      applySearchText: setCode,
      busy: state.busy,
      dirty: state.dirty,
      discard: () => {
        setState((p) => ({ ...p, dirty: false }));
      },
      insert,
      optimistic: state.optimistic,
      path: state.draft.path,
      permission,
      prettier: () => undefined,
      readSearchText: async () => state.draft.source,
      save: () => save(),
      setMode,
      toggleList: () => undefined,
    }),
    [insert, permission, save, setCode, setMode, state],
  );
  useEffect(() => {
    $toolbar.set(controls);
    return () => {
      $toolbar.set(null);
    };
  }, [controls]);
  const onBodyChange = useCallback((c: DocBody): void => {
    setState((p) => {
      if (JSON.stringify(p.draft.content) === JSON.stringify(c)) return p;
      return {
        ...p,
        dirty: true,
        draft: { ...p.draft, content: c, source: '' },
      };
    });
  }, []);
  const attachFiles = useCallback(
    async (v: File[]): Promise<void> => {
      if (!path || !v.length) return;
      await Promise.all(v.map((f) => uploadAssetChunked(f, path)));
      toast.success(`${v.length} attachment${v.length === 1 ? '' : 's'} added.`);
    },
    [path],
  );

  // RENDER
  return (
    <ErrorBoundary name="Editable">
      <EditStateCtx.Provider
        value={useMemo(
          () => ({
            busy: state.busy,
            code: state.draft.source,
            draft: state.draft,
            dirty: state.dirty,
            loaded: state.loaded,
            mark: () => {
              setState((p) => ({ ...p, dirty: true }));
            },
            references: refs,
            save: () => void save(),
            setCode,
            setSrc: setCode,
            source: state.draft.source,
            update,
          }),
          [refs, save, setCode, state, update],
        )}
      >
        <EditorSurfaceCtx.Provider
          value={useMemo<EditorSurface>(
            () => ({
              controls,
              editor: state,
              insert,
              mode,
              onBodyChange,
              onMdChange: setCode,
              onVisualError: (error) => {
                setErr(error instanceof Error ? error.message : String(error));
              },
              parseError: err,
              path,
              pathname,
              refs,
              save,
              setMode,
              attachFiles,
              uploadImage: async () => '',
            }),
            [
              attachFiles,
              controls,
              err,
              insert,
              mode,
              onBodyChange,
              path,
              pathname,
              refs,
              save,
              setCode,
              setMode,
              state,
            ],
          )}
        >
          {children}
        </EditorSurfaceCtx.Provider>
      </EditStateCtx.Provider>
    </ErrorBoundary>
  );
}

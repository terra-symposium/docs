/**
 * src/lib/terra/docs/state.ts
 * Shared state, transitions, contexts, and surface readiness for Docs.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { atom, map } from 'nanostores';
import { createContext, useEffect, useState, useSyncExternalStore } from 'react';
import { validateType } from '../runtime/runtime.js';

// TYPES
import type { EditorSel, EditorSurface, Mode, ToolbarState, Transition } from '../runtime/types.js';
/**
 * Subscribes React to an external store and reads its current value for rendering.
 *
 * @param store - Store that provides a current snapshot and change subscription.
 *
 * @return The current store value, updated when the store notifies React.
 */
export function useAtom<Value>(store: {
  /**
   * Reads the store snapshot used for rendering and server-side hydration.
   *
   * @return The current store value.
   */
  get(): Value;
  /**
   * Registers a change listener and returns the function that removes it.
   *
   * @param listener - Callback invoked after the store changes.
   *
   * @return An unsubscribe function that removes the listener.
   */
  subscribe(listener: (val: Value) => void): () => void;
}): Value {
  return useSyncExternalStore(
    (n) =>
      store.subscribe(() => {
        n();
      }),
    () => store.get(),
    () => store.get(),
  );
}
/**
 * Reads a validated JSON value from local storage, falling back when storage is unavailable or invalid.
 *
 * @param key - Local-storage key containing the serialized value.
 * @param fallback - Value returned when storage cannot be read or validated.
 * @param valid - Type guard that accepts parsed values usable by the caller.
 *
 * @return The parsed value when valid, or the provided fallback.
 */
function readStorage<T>(key: string, fallback: T, valid: (input: unknown) => input is T): T {
  if (validateType(['undefined'], globalThis.window)) return fallback;
  try {
    const v = window.localStorage.getItem(key);
    if (typeof v !== 'string') return fallback;
    try {
      const parsed = JSON.parse(v) as unknown;
      return valid(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  } catch {
    return fallback;
  }
}

/**
 * Writes a value to local storage when available.
 *
 * @param key - Local-storage key under which the serialized value should be saved.
 * @param v - Value to serialise.
 *
 * @remarks Write failures are swallowed because persistence should never block editing.
 */
function writeStorage(key: string, v: unknown): void {
  if (validateType(['undefined'], globalThis.window)) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(v));
  } catch {
    return;
  }
}
export const $mode = atom<Mode>(
  readStorage('docs-mode', 'view', (i): i is Mode =>
    ['view', 'edit', 'attachments'].includes(i as string),
  ),
);
/** Shares the active leaf title across Docs surfaces. */
export const $leafTitle = atom<{ path: string; title: string } | null>(null);
/**
 * Global transition flag for docs navigation and mutations.
 *
 * @remarks This lets the UI disable inputs while a transition is active.
 */
export const $transition = atom<boolean>(false);
/**
 * Current toolbar state.
 *
 * @remarks The toolbar is controlled centrally so overlays can share the same focus state.
 */
export const $toolbar = atom<ToolbarState | null>(null);
/**
 * Hydration counter for docs editor widgets.
 *
 * @remarks This is used to delay interactions until the editor tree is ready.
 */
export const $hydrating = atom<number>(0);
/**
 * Surface readiness state for docs editing.
 *
 * @remarks The value flips once the interactive surface is available.
 */
export const $surfaceReady = atom<Mode | null>(null);
export const $editReadyPath = atom<string | null>(null);
/** Shared cursor state so toolbar focus can preserve the last insertion point visibly. */
export const $cursor = atom<EditorSel | null>(null);
/** Persisted caret snapshot used for the simulated cursor overlay when focus leaves the editor. */
export const $cursorGhost = atom<EditorSel | null>(null);
/** Linear caret bookmark used to simulate the visible cursor without relying on DOM focus. */
export const $cursorTrack = atom<
  | (Pick<EditorSel, 'box' | 'collapsed' | 'visible'> & {
      anchor: number;
      focus: number;
      range: [number, number];
    })
  | null
>(null);
/**
 * Cursor position snapshot for the docs editor.
 *
 * @remarks This duplicates the visible cursor state for consumers that need direct position access.
 */
export const $cursorPosition = atom<EditorSel | null>(null);
/**
 * Unsaved docs draft flags.
 *
 * @remarks This store only tracks presence, not draft content.
 */
export const $unsavedDrafts = map<Record<string, boolean>>({});
/**
 * In-memory docs draft cache.
 *
 * @remarks This cache is process-local and intentionally not persisted.
 */
export const memoryDrafts = new Map<
  string,
  { source: string; draft: unknown; metadata: unknown }
>();
/**
 * Sidebar visibility state for the docs editor.
 *
 * @remarks The default keeps the sidebar open for discoverability.
 */
export const $sidebar = atom<boolean>(
  readStorage('docs-sidebar-open', true, (i): i is boolean => validateType(['boolean'], i)),
);

// HELPERS
if (!validateType(['undefined'], globalThis.window)) {
  $sidebar.listen((v) => {
    writeStorage('docs-sidebar-open', v);
  });
  $mode.listen((v) => {
    writeStorage('docs-mode', v);
  });
  $cursor.listen((v) => {
    if (v) $cursorGhost.set(v);
  });
}

/*//////////////////////////////////////////////////
TRANSITION SYSTEM
//////////////////////////////////////////////////*/

/**
 * Shared transition store for docs UI coordination.
 *
 * @remarks This is kept as a plain object so listeners can subscribe without extra abstractions.
 */
export const transitionStore = {
  transition: 'idle' as Transition,
  restore: null as (() => void) | null,
  listeners: new Set<() => void>(),
};

/**
 * Sets the active docs transition state.
 *
 * @param transition - Next transition state.
 *
 * @remarks The boolean store mirrors the non-idle state for simpler UI consumers.
 */
export function setTransition(transition: Transition): void {
  transitionStore.transition = transition;
  $transition.set(transition !== 'idle');
  transitionStore.listeners.forEach((l) => {
    l();
  });
}

/**
 * Clears the active docs transition state.
 * @remarks Idle is the only state that leaves the transition flag unset.
 */
export function clearTransition(): void {
  if (transitionStore.transition === 'idle') return;
  setTransition('idle');
}

/**
 * Subscribes to the current docs transition state.
 *
 * @return The latest transition value, updated when a transition begins or ends.
 *
 * @remarks This is used by components that need to react to local mutation states.
 */
export function useTransitionState(): Transition {
  const [transition, setTransitionState] = useState(transitionStore.transition);
  useEffect(() => {
    /** Copies the shared transition snapshot into React state after store changes. */
    const update = (): void => {
      setTransitionState(transitionStore.transition);
    };
    transitionStore.listeners.add(update);
    return (): void => {
      transitionStore.listeners.delete(update);
    };
  }, []);
  return transition;
}

/**
 * Shared editor transition context.
 *
 * @remarks The provider keeps layout and loading overlays in sync.
 */
export const TransitionCtx = createContext<{
  setSourceReady: (ready: boolean) => void;
  setLoading: (loading: boolean) => void;
} | null>(null);
export const EditStateCtx = createContext<{
  busy: string | null;
  code: string;
  draft: import('../runtime/types.js').Draft;
  dirty: boolean;
  loaded?: boolean;
  mark?: () => void;
  references?: import('react').MutableRefObject<import('../runtime/types.js').EditorRefs>;
  setSrc?: (val: string) => void;
  source?: string;
  save: (code?: string, opts?: { force?: boolean; format?: boolean }) => void;
  setCode: (val: string) => void;
  update: (patch: Partial<import('../runtime/types.js').Draft>) => void;
} | null>(null);
/**
 * Context for the docs editor surface.
 *
 * @remarks This lets nested components reach the active editor surface without prop drilling.
 */
export const EditorSurfaceCtx = createContext<EditorSurface | null>(null);
export const $editorMounts = atom<{ expected: string[]; mounted: string[]; path: string | null }>({
  expected: [],
  mounted: [],
  path: null,
});
const assignments = new Map<string, string>();

/**
 * Clears the previous mount assignments and declares which editors should mount for the next route.
 *
 * @param path - Route or source path used to associate mount events with this editor session.
 * @param expected - Stable keys for editor instances expected on the selected page.
 */
export function resetEditorMounts(path: string | undefined, expected: string[]): void {
  assignments.clear();
  $editorMounts.set({ expected, mounted: [], path: path || null });
}

/**
 * Records or removes an editor instance and updates readiness when the mounted set changes.
 *
 * @param path - Route or source path reported by the editor instance.
 * @param reporter - Unique reporter key that identifies this mounted instance.
 * @param mounted - Whether the instance has mounted; `false` removes its assignment.
 * @param kind - Optional editor kind used to match the reporter to an expected mount key.
 */
export function setEditorMount(
  path: string | undefined,
  reporter: string | undefined,
  mounted: boolean,
  kind?: string,
): void {
  if (!path || !reporter) return;
  const state = $editorMounts.get();
  if (state.path !== path) return;
  if (mounted && !assignments.has(reporter)) {
    const id = kind
      ? state.expected.find((v) => v.startsWith(`${kind}:`) && !state.mounted.includes(v))
      : reporter;
    if (!id || !state.expected.includes(id)) return;
    assignments.set(reporter, id);
  }
  const id = assignments.get(reporter) || reporter;
  if (!mounted) assignments.delete(reporter);
  const n = mounted ? [...new Set([...state.mounted, id])] : state.mounted.filter((v) => v !== id);
  if (n.length !== state.mounted.length || n.some((v, i) => v !== state.mounted[i]))
    $editorMounts.set({ ...state, mounted: n });
}

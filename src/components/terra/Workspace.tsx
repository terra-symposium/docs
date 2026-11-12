/**
 * src/components/terra/Workspace.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { applyHue } from '@terra-symposium/styling';
import { configureDocsHost } from '../../lib/host-runtime.js';
import { docsHueTheme } from '../../lib/docs-theme.js';
import { useEffect, useRef, useState } from 'react';

// COMPONENTS
import Scaffold from './pages/docs/_main.js';
import { DocsQuizProvider } from '../quiz.js';

// TYPES
import type { DocsWorkspaceProps } from '../../lib/host.js';
import type { JSX } from 'react';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Mounts the shared Docs workspace for a host adapter, synchronizing route state, theme, portals, and page content.
 *
 * @param workspaceOptions Host adapter, navigation, permission, current page, and optional render capabilities.
 * @param workspaceOptions.host Storage, routing, capability, and rendering boundary supplied by the consumer.
 * @param workspaceOptions.tree Navigation tree used to resolve current section metadata.
 * @param workspaceOptions.pathname Current page route selected by the host.
 * @param workspaceOptions.permission Current page permission used by the editor controls.
 * @param workspaceOptions.path Optional source path of the current document.
 * @param workspaceOptions.title Current document title.
 * @param workspaceOptions.description Optional current document description.
 * @param workspaceOptions.contributors Optional people credited on the current document.
 * @param workspaceOptions.updatedAt Optional source update timestamp.
 * @param workspaceOptions.userData Optional signed-in user details shown by the sidebar.
 * @param workspaceOptions.source Optional Markdown source associated with the current document.
 * @param workspaceOptions.content Optional document value rendered by the editor.
 * @param workspaceOptions.renderContent Optional static React content for the canonical View surface.
 * @param workspaceOptions.staticContent Whether host content is static and can skip editor transition guards.
 * @param workspaceOptions.beforeContent Optional host content placed before the document body.
 * @param workspaceOptions.afterContent Optional host content placed after the document body.
 * @param workspaceOptions.standalone Whether to render without the surrounding site shell.
 * @param workspaceOptions.full Whether the workspace should occupy the full available width.
 * @param workspaceOptions.mode Optional explicit view, edit, or attachments mode.
 * @param workspaceOptions.blocks Optional switches controlling shared rich block rendering.
 * @param workspaceOptions.customBlocks Optional host-specific rich block renderers.
 * @param workspaceOptions.quiz Optional host-owned quiz toolbar and generation callback.
 * @return The themed Docs workspace with host-aware navigation, document content, and view or editing controls.
 */
export function DocsWorkspace(workspaceOptions: DocsWorkspaceProps): JSX.Element {
  configureDocsHost(workspaceOptions.host, workspaceOptions.customBlocks);
  const portalThemeRoot = useRef<HTMLDivElement>(null);
  const [aPath, setActivePath] = useState(workspaceOptions.pathname);
  useEffect(() => setActivePath(workspaceOptions.pathname), [workspaceOptions.pathname]);
  useEffect(() => {
    /**
     * Updates the active workspace route after Docs, Astro, or browser history navigation.
     * @param event Optional event carrying an explicit Docs pathname or URL.
     */
    const updatePath = (event?: Event) => {
      const detail = (event as CustomEvent<{ pathname?: unknown; url?: unknown }> | undefined)
        ?.detail;
      setActivePath(
        [detail?.pathname, detail?.url].find(
          (value): value is string => typeof value === 'string' && value.length > 0,
        ) ?? window.location.href,
      );
    };
    document.addEventListener('docs:navigate', updatePath);
    document.addEventListener('astro:after-swap', updatePath);
    window.addEventListener('hashchange', updatePath);
    window.addEventListener('popstate', updatePath);
    return () => {
      document.removeEventListener('docs:navigate', updatePath);
      document.removeEventListener('astro:after-swap', updatePath);
      window.removeEventListener('hashchange', updatePath);
      window.removeEventListener('popstate', updatePath);
    };
  }, []);
  let aRoute;
  try {
    aRoute = workspaceOptions.host.resolveRoute?.(aPath);
  } catch {
    aRoute = undefined;
  }
  let hue = workspaceOptions.host.hue;
  for (const target of [aRoute?.leafId, aRoute?.groupId, aRoute?.sectionId, aRoute?.targetId]) {
    if (!target) continue;
    const pending = workspaceOptions.tree
      .slice()
      .reverse()
      .map((n) => ({ node: n, ancestors: [] as typeof workspaceOptions.tree }));
    let foundTarget = false;
    while (pending.length > 0) {
      const current = pending.pop();
      if (!current) continue;
      if (current.node.origName === target || current.node.path === target) {
        for (const node of [...current.ancestors, current.node]) {
          if (typeof node.hue === 'number') hue = node.hue;
        }
        foundTarget = true;
        break;
      }
      for (const child of [...(current.node.children ?? [])].reverse()) {
        pending.push({ node: child, ancestors: [...current.ancestors, current.node] });
      }
    }
    if (foundTarget) break;
  }
  const theme = hue === undefined ? undefined : docsHueTheme(hue);

  // Terra originally applied Styling's hue palette to the page root. Keep the
  // same behavior for every host so long documents never expose a white canvas
  // below the workspace and route changes recolor the page without a reload.
  useEffect(() => {
    if (hue === undefined || typeof document === 'undefined') return;
    const root = document.documentElement;
    const body = document.body;
    const originalBackgrounds = {
      root: {
        value: root.style.getPropertyValue('background-color'),
        priority: root.style.getPropertyPriority('background-color'),
      },
      body: {
        value: body.style.getPropertyValue('background-color'),
        priority: body.style.getPropertyPriority('background-color'),
      },
    };
    const appliedBackground = 'rgb(var(--primary-1))';
    /** Applies the selected hue to the shared Styling tokens and document canvas. */
    const applyPageHue = () => {
      applyHue(hue);
      root.style.setProperty('background-color', appliedBackground);
      body.style.setProperty('background-color', appliedBackground);
    };
    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
    applyPageHue();
    colorScheme.addEventListener('change', applyPageHue);
    return () => {
      colorScheme.removeEventListener('change', applyPageHue);
      /**
       * Restores the previous inline color only while this effect still owns the applied value.
       * @param element Document element whose background was updated.
       * @param original Original inline value and priority to restore.
       */
      const restore = (element: HTMLElement, original: { value: string; priority: string }) => {
        if (element.style.getPropertyValue('background-color') !== appliedBackground) return;
        if (original.value)
          element.style.setProperty('background-color', original.value, original.priority);
        else element.style.removeProperty('background-color');
      };
      restore(root, originalBackgrounds.root);
      restore(body, originalBackgrounds.body);
    };
  }, [hue]);
  useEffect(() => {
    const workspace = portalThemeRoot.current?.querySelector<HTMLElement>('.docs-workspace');
    if (!workspace || typeof document === 'undefined') return;

    // Radix keeps the original Docs portal behavior and mounts menus/dialogs
    // under body. Mirror only the Docs palette there so those portals inherit
    // the same hue as the inline workspace, as they did when the site applied
    // the hue palette to the document root before extraction.
    const target = document.body;
    const originalValues = new Map<string, { value: string; priority: string }>();
    const appliedValues = new Map<string, string>();
    const originalThemeClasses = {
      dark: target.classList.contains('dark'),
      light: target.classList.contains('light'),
      docsScope: target.classList.contains('docs-theme-scope'),
    };
    const originalBodyFont = {
      value: target.style.getPropertyValue('font-family'),
      priority: target.style.getPropertyPriority('font-family'),
    };
    let appliedBodyFont: string | undefined;
    let appliedThemeClasses: { dark: boolean; light: boolean } | undefined;
    /**
     * Mirrors the Docs palette and typeface onto body-mounted Radix portals.
     * @returns No value; synchronizes body classes, fonts, and custom properties in place.
     */
    const syncPortalTheme = () => {
      const computed = getComputedStyle(workspace);
      // The original Radix primitives portal directly to body. Make that
      // destination a Docs scope so the extracted bundle's scoped variants
      // continue to style menus, selects, dialogs, and popovers there.
      target.classList.add('docs-theme-scope');
      // Sanity's global editor styles supplied Inter on the original Docs route.
      // Keep body-mounted Radix menus and dialogs on that same Docs typeface.
      const docsFont = computed.fontFamily;
      if (docsFont && target.style.fontFamily !== docsFont) {
        target.style.fontFamily = docsFont;
      }
      appliedBodyFont = docsFont;
      for (const token of [
        '--hue',
        '--background',
        '--foreground',
        '--ring',
        ...(['primary', 'gray', 'secondary'] as const).flatMap((family) =>
          Array.from({ length: 12 }, (_, i) => {
            const step = i + 1;
            return [`--${family}-${step}`, `--${family}Light${step}`, `--${family}Dark${step}`];
          }).flat(),
        ),
      ]) {
        const value = computed.getPropertyValue(token).trim();
        if (!value) continue;
        if (!originalValues.has(token)) {
          originalValues.set(token, {
            value: target.style.getPropertyValue(token),
            priority: target.style.getPropertyPriority(token),
          });
        }
        if (target.style.getPropertyValue(token) !== value) target.style.setProperty(token, value);
        appliedValues.set(token, value);
      }
      const explicitTheme = workspace.closest<HTMLElement>('.dark, .light');
      if (explicitTheme) {
        const nClasses = {
          dark: explicitTheme.classList.contains('dark'),
          light: explicitTheme.classList.contains('light'),
        };
        target.classList.toggle('dark', nClasses.dark);
        target.classList.toggle('light', nClasses.light);
        appliedThemeClasses = nClasses;
      }
    };
    syncPortalTheme();
    const observer = new MutationObserver(syncPortalTheme);
    for (
      let element: HTMLElement | null = workspace;
      element && element !== target;
      element = element.parentElement
    ) {
      observer.observe(element, {
        attributes: true,
        attributeFilter: ['class', 'style'],
      });
    }
    const darkPreference = window.matchMedia('(prefers-color-scheme: dark)');
    darkPreference.addEventListener('change', syncPortalTheme);
    return () => {
      observer.disconnect();
      darkPreference.removeEventListener('change', syncPortalTheme);
      for (const [token, original] of originalValues) {
        if (target.style.getPropertyValue(token) !== appliedValues.get(token)) continue;
        if (original.value) target.style.setProperty(token, original.value, original.priority);
        else target.style.removeProperty(token);
      }
      if (appliedBodyFont && target.style.fontFamily === appliedBodyFont) {
        if (originalBodyFont.value) {
          target.style.setProperty(
            'font-family',
            originalBodyFont.value,
            originalBodyFont.priority,
          );
        } else {
          target.style.removeProperty('font-family');
        }
      }
      if (appliedThemeClasses) {
        if (target.classList.contains('dark') === appliedThemeClasses.dark) {
          target.classList.toggle('dark', originalThemeClasses.dark);
        }
        if (target.classList.contains('light') === appliedThemeClasses.light) {
          target.classList.toggle('light', originalThemeClasses.light);
        }
      }
      if (!originalThemeClasses.docsScope) target.classList.remove('docs-theme-scope');
    };
  }, []);
  return (
    <div ref={portalThemeRoot} className="docs-theme-scope" {...(theme ? { style: theme } : {})}>
      <DocsQuizProvider
        config={workspaceOptions.quiz ?? {}}
        title={workspaceOptions.title}
        markdown={workspaceOptions.source ?? ''}
      >
        <Scaffold
          tree={
            workspaceOptions.tree as unknown as import('../../lib/terra/runtime/types.js').Tree[]
          }
          pathname={workspaceOptions.pathname}
          permission={workspaceOptions.permission}
          userData={workspaceOptions.userData ?? null}
          title={workspaceOptions.title}
          {...(workspaceOptions.path ? { path: workspaceOptions.path } : {})}
          {...(workspaceOptions.description ? { description: workspaceOptions.description } : {})}
          {...(workspaceOptions.contributors
            ? { contributors: workspaceOptions.contributors }
            : {})}
          {...(workspaceOptions.updatedAt ? { updatedAt: workspaceOptions.updatedAt } : {})}
          {...(workspaceOptions.source ? { source: workspaceOptions.source } : {})}
          {...(workspaceOptions.content !== undefined
            ? {
                content: workspaceOptions.content as unknown as
                  | string
                  | import('../../lib/terra/runtime/types.js').DocVer[]
                  | import('../../lib/terra/runtime/types.js').DocBody,
              }
            : {})}
          {...(workspaceOptions.renderContent !== undefined
            ? { viewContent: workspaceOptions.renderContent }
            : {})}
          {...(workspaceOptions.staticContent !== undefined
            ? { staticContent: workspaceOptions.staticContent }
            : {})}
          {...(workspaceOptions.beforeContent !== undefined
            ? { beforeContent: workspaceOptions.beforeContent }
            : {})}
          {...(workspaceOptions.afterContent !== undefined
            ? { afterContent: workspaceOptions.afterContent }
            : {})}
          {...(workspaceOptions.standalone !== undefined
            ? { standalone: workspaceOptions.standalone }
            : {})}
          {...(workspaceOptions.full !== undefined ? { full: workspaceOptions.full } : {})}
          {...(workspaceOptions.mode ? { mode: workspaceOptions.mode } : {})}
          {...(workspaceOptions.blocks ? { blocks: workspaceOptions.blocks } : {})}
        />
      </DocsQuizProvider>
    </div>
  );
}

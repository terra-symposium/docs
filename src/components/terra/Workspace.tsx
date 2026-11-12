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
import { isDocBody } from '../../lib/terra/runtime/types.js';
import { useEffect, useRef, useState } from 'react';

// COMPONENTS
import Scaffold from './pages/docs/_main.js';
import { DocsQuizProvider } from '../quiz.js';

// TYPES
import type { DocsHostTreeNode, DocsWorkspaceProps } from '../../lib/host.js';
import type { DocBody, DocVer, Tree } from '../../lib/terra/runtime/types.js';
import type { JSX } from 'react';

/**
 * Converts the portable host tree to the stricter legacy scaffold shape.
 *
 * @param nodes - Host navigation nodes to adapt recursively.
 * @param permission - Workspace permission used when a host node omits its own permission.
 * @param routePath - Optional host route resolver for leaves with a source path but no URL.
 * @returns Scaffold nodes with branch children and leaf URLs normalized.
 */
function toScaffoldTree(
  nodes: DocsHostTreeNode[],
  permission: 'read' | 'write',
  routePath?: (path: string) => string,
): Tree[] {
  return nodes.map((n): Tree => {
    if (n.type === 'branch') {
      const { children, permission: nodePermission, hue, ...branch } = n;
      return {
        ...branch,
        type: 'branch',
        permission: nodePermission ?? permission,
        children: toScaffoldTree(children ?? [], permission, routePath),
        ...(typeof hue === 'number' ? { hue } : {}),
      };
    }
    const { permission: nodePermission, ...leaf } = n;
    return {
      ...leaf,
      type: 'leaf',
      permission: nodePermission ?? permission,
      url: n.url ?? (n.path ? routePath?.(n.path) : undefined) ?? n.path ?? n.origName,
    };
  });
}

/**
 * Validates one saved editor revision before forwarding host content to the scaffold.
 *
 * @param v - Candidate revision received from the host document adapter.
 * @returns `true` when the required revision metadata fields are present.
 */
function isDocVersion(v: unknown): v is DocVer {
  if (!v || typeof v !== 'object') return false;
  const revision = v as Record<string, unknown>;
  return (
    typeof revision.contentJson === 'string' &&
    typeof revision.description === 'string' &&
    typeof revision.title === 'string' &&
    typeof revision.savedAt === 'string'
  );
}

/**
 * Keeps only the content representations accepted by the scaffold's editor contract.
 *
 * @param value - Host content supplied as Markdown, blocks, or revision history.
 * @returns A supported scaffold value, or `undefined` when the host value is malformed.
 */
function toScaffoldContent(value: unknown): string | DocBody | DocVer[] | undefined {
  if (typeof value === 'string' || isDocBody(value)) return value;
  if (Array.isArray(value) && value.every(isDocVersion)) return value;
  return undefined;
}

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Adapts host navigation and content contracts to the shared Docs workspace surface.
 *
 * @param workspace - Host adapter, navigation tree, current document metadata, content, and presentation options.
 * @param workspace.host - Route resolver and host-specific navigation and block configuration.
 * @param workspace.tree - Navigation branches and leaves rendered by the Docs sidebar.
 * @param workspace.pathname - Current browser path used to select the active route.
 * @param workspace.permission - Read or write access applied to the scaffold.
 * @param workspace.path - Optional source path for the current document.
 * @param workspace.title - Current document title.
 * @param workspace.description - Optional description displayed with the document.
 * @param workspace.contributors - Optional contributor names for document metadata.
 * @param workspace.updatedAt - Optional last-updated date for document metadata.
 * @param workspace.userData - Signed-in user details used by workspace controls.
 * @param workspace.source - Original source text provided to the workspace and quiz context.
 * @param workspace.content - Saved content accepted by the scaffold's editor contract.
 * @param workspace.renderContent - Optional host-rendered content supplied for view mode.
 * @param workspace.staticContent - Indicates that the host content is already rendered statically.
 * @param workspace.beforeContent - Optional host content inserted before the document body.
 * @param workspace.afterContent - Optional host content inserted after the document body.
 * @param workspace.standalone - Enables the scaffold's standalone presentation.
 * @param workspace.full - Requests the scaffold's full-width presentation.
 * @param workspace.mode - Initial view, edit, or attachment mode.
 * @param workspace.blocks - Per-document settings for supported shared blocks.
 * @param workspace.customBlocks - Host-specific block renderers registered with the adapter.
 * @param workspace.quiz - Optional host quiz configuration and generation context.
 *
 * @returns The configured Docs scaffold with host routing, content, theme, and quiz behavior.
 */
export function DocsWorkspace(workspace: DocsWorkspaceProps): JSX.Element {
  configureDocsHost(workspace.host, workspace.customBlocks);
  const portalThemeRoot = useRef<HTMLDivElement>(null);
  const [aPath, setActivePath] = useState(workspace.pathname);
  useEffect(() => setActivePath(workspace.pathname), [workspace.pathname]);
  useEffect(() => {
    /**
     * Tracks host navigation, Astro swaps, and browser history changes for route-specific theme resolution.
     *
     * @param event - Optional event whose custom detail may contain the new pathname or URL.
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
    aRoute = workspace.host.resolveRoute?.(aPath);
  } catch {
    aRoute = undefined;
  }
  let hue = workspace.host.hue;
  for (const target of [aRoute?.leafId, aRoute?.groupId, aRoute?.sectionId, aRoute?.targetId]) {
    if (!target) continue;
    const pending = workspace.tree
      .slice()
      .reverse()
      .map((n) => ({ node: n, ancestors: [] as typeof workspace.tree }));
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
  const content = toScaffoldContent(workspace.content);

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
    /** Applies the selected Styling hue palette and matching background to the document root and body. */
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
       * Restores an original background only when the inline value still matches the applied hue.
       *
       * @param element - Document root or body whose background is being restored.
       * @param original - Inline background value and priority saved before applying the Docs hue.
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
     * Copies Docs theme tokens and the font to `body` so body-mounted Radix portals match the workspace.
     *
     * @returns No value; the body receives the current palette, theme classes, and font.
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
        config={workspace.quiz ?? {}}
        title={workspace.title}
        markdown={workspace.source ?? ''}
      >
        <Scaffold
          tree={toScaffoldTree(workspace.tree, workspace.permission, workspace.host.routePath)}
          pathname={workspace.pathname}
          permission={workspace.permission}
          userData={workspace.userData ?? null}
          title={workspace.title}
          {...(workspace.path ? { path: workspace.path } : {})}
          {...(workspace.description ? { description: workspace.description } : {})}
          {...(workspace.contributors ? { contributors: workspace.contributors } : {})}
          {...(workspace.updatedAt ? { updatedAt: workspace.updatedAt } : {})}
          {...(workspace.source ? { source: workspace.source } : {})}
          {...(content === undefined ? {} : { content })}
          {...(workspace.renderContent !== undefined
            ? { viewContent: workspace.renderContent }
            : {})}
          {...(workspace.staticContent !== undefined
            ? { staticContent: workspace.staticContent }
            : {})}
          {...(workspace.beforeContent !== undefined
            ? { beforeContent: workspace.beforeContent }
            : {})}
          {...(workspace.afterContent !== undefined
            ? { afterContent: workspace.afterContent }
            : {})}
          {...(workspace.standalone !== undefined ? { standalone: workspace.standalone } : {})}
          {...(workspace.full !== undefined ? { full: workspace.full } : {})}
          {...(workspace.mode ? { mode: workspace.mode } : {})}
          {...(workspace.blocks ? { blocks: workspace.blocks } : {})}
        />
      </DocsQuizProvider>
    </div>
  );
}

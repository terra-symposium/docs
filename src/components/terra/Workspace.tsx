import { applyHue } from '@terra-symposium/styling';
import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import { docsHueTheme } from '../../lib/docs-theme.js';
import Scaffold from './pages/docs/_main.js';
import { configureDocsHost } from '../../lib/host-runtime.js';
import type { DocsWorkspaceProps } from '../../lib/host.js';
import { DocsQuizProvider } from '../quiz.js';

/** The source-preserving shared Docs workspace used by host route adapters. */
export function DocsWorkspace(props: DocsWorkspaceProps): JSX.Element {
  configureDocsHost(props.host, props.customBlocks);
  const portalThemeRoot = useRef<HTMLDivElement>(null);
  const [aPath, setActivePath] = useState(props.pathname);

  useEffect(() => setActivePath(props.pathname), [props.pathname]);

  useEffect(() => {
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
    aRoute = props.host.resolveRoute?.(aPath);
  } catch {
    aRoute = undefined;
  }
  let hue = props.host.hue;
  for (const target of [aRoute?.leafId, aRoute?.groupId, aRoute?.sectionId, aRoute?.targetId]) {
    if (!target) continue;
    const pending = props.tree
      .slice()
      .reverse()
      .map((node) => ({ node, ancestors: [] as typeof props.tree }));
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
      <DocsQuizProvider config={props.quiz ?? {}} title={props.title} markdown={props.source ?? ''}>
        <Scaffold
          tree={props.tree as any}
          pathname={props.pathname}
          permission={props.permission}
          userData={props.userData ?? null}
          title={props.title}
          {...(props.path ? { path: props.path } : {})}
          {...(props.description ? { description: props.description } : {})}
          {...(props.contributors ? { contributors: props.contributors } : {})}
          {...(props.updatedAt ? { updatedAt: props.updatedAt } : {})}
          {...(props.source ? { source: props.source } : {})}
          {...(props.content !== undefined ? { content: props.content as any } : {})}
          {...(props.renderContent !== undefined ? { viewContent: props.renderContent } : {})}
          {...(props.staticContent !== undefined ? { staticContent: props.staticContent } : {})}
          {...(props.beforeContent !== undefined ? { beforeContent: props.beforeContent } : {})}
          {...(props.afterContent !== undefined ? { afterContent: props.afterContent } : {})}
          {...(props.standalone !== undefined ? { standalone: props.standalone } : {})}
          {...(props.full !== undefined ? { full: props.full } : {})}
          {...(props.mode ? { mode: props.mode } : {})}
          {...(props.blocks ? { blocks: props.blocks } : {})}
        />
      </DocsQuizProvider>
    </div>
  );
}

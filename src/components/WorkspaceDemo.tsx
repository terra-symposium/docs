/**
 * src/components/WorkspaceDemo.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { colors, flattenColors, invert } from '@terra-symposium/styling';
import {
  createWorkspaceDemoHost,
  createWorkspaceDemoSeed,
  readWorkspaceDemoState,
  routeForWorkspaceDocument,
  routedWorkspaceTree,
} from './workspace-demo-fixture.js';
import { useEffect, useMemo, useState } from 'react';

// COMPONENTS
import * as TerraQualityRegex from '../lib/terra/regex.mjs';
import { DocsLocalWorkspace } from './LocalDocsWorkspace.js';
import { DocsWorkspace } from './terra/Workspace.js';

// DATA
import { WORKSPACE_DEMO_PATH } from './workspace-demo-fixture.js';

// TYPES
import type { CSSProperties, JSX } from 'react';
import type { DocsHostTreeNode } from '../lib/host.js';
import type { DocsQuizConfig, DocsQuizGenerationInput } from './quiz.js';
import type { WorkspaceDemoState } from './workspace-demo-fixture.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

// hygiene-ignore single-use -- This quiz generator is the demo host callback boundary and intentionally returns a Promise.
/**
 * Builds a deterministic sample quiz from a document's title and Markdown excerpt.
 *
 * @param v - Document title and source, question count, and allowed question types.
 *
 * @returns Quiz questions whose prompts and answer text come from the selected document.
 */
function genDemoQuiz(v: DocsQuizGenerationInput): Promise<unknown> {
  const excerpt =
    v.markdown
      .replace(/^\s*#+\s*/gm, '')
      .replace(/[*_`>#]/g, ' ')
      .split(/[.!?\n]+/)
      .map((p) => p.trim())
      .find((p) => p.length > 12)
      ?.slice(0, 150) ?? v.title;
  const quizText = {
    excerpt,
    keyword:
      excerpt.split(TerraQualityRegex.REGEX_S_REGEX_2()).find((w) => w.length >= 5) ?? v.title,
  };
  return Promise.resolve({
    title: `${v.title} quiz · sample`,
    questions: Array.from({ length: v.count }, (_, i) => {
      const type = v.types[i % v.types.length];
      if (type === 'keyword')
        return {
          type,
          prompt: `Name a key term from “${v.title}”.`,
          answers: [quizText.keyword.replace(/[^\p{L}\p{N}-]/gu, '') || v.title],
          explanation: 'This sample answer is drawn from the selected leaf.',
        };
      return {
        type,
        prompt: `Which statement appears in “${v.title}”?`,
        opts: [quizText.excerpt, 'The leaf contains no information about this topic.'],
        answer: quizText.excerpt,
        explanation: 'The correct choice comes from the selected leaf text.',
      };
    }),
  });
}

const demoQuiz: DocsQuizConfig = { toolbar: true, generate: genDemoQuiz };

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Reads the current browser route, falling back to the demo seed route during server rendering.
 *
 * @returns The pathname, query, and fragment used to select the active demo document.
 */
function currentLocation(): string {
  if (typeof window === 'undefined') return WORKSPACE_DEMO_PATH;
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

/**
 * Copies a navigation tree while routing every leaf to the local workspace base path.
 *
 * @param nodes - Navigation nodes to copy for the read-only preview.
 * @param routeBase - Local route used by all copied leaf links.
 *
 * @returns A tree with leaf URLs rewritten and nested branches recursively copied.
 */
function withLocalRoute(
  nodes: DocsHostTreeNode[],
  routeBase = '/workspace-readonly/',
): DocsHostTreeNode[] {
  return nodes.map((n) => ({
    ...n,
    ...(n.type === 'leaf' ? { url: routeBase } : {}),
    ...(n.children ? { children: withLocalRoute(n.children, routeBase) } : {}),
  }));
}

/**
 * Renders the local or host-backed Docs workspace with seeded fixture state and demo metadata.
 *
 * @param readOnly - Uses the host-free, read-only workspace adapter.
 * @param quizEnabled - Adds the deterministic sample quiz flow to the workspace.
 * @param routeBase - Root path used for navigation in the local read-only workspace.
 * @param hue - Base hue used to derive the demonstration's primary and secondary palettes.
 * @param siteTitle - Site name shown by the host-backed workspace.
 * @param siteDesc - Supporting site text; `null` or an empty string hides it.
 * @param syncParentOnNavigate - Syncs this fixture with navigation events from a parent Docs shell.
 *
 * @returns The Docs workspace configured for the selected fixture route and mode.
 */
export default function WorkspaceDemo({
  readOnly = false,
  quizEnabled = false,
  routeBase = '/workspace-readonly/',
  hue = 145,
  siteTitle = 'Salesphere Docs',
  siteDescription: siteDesc = 'Product and engineering documentation.',
  syncParentOnNavigate = true,
}: {
  readOnly?: boolean;
  quizEnabled?: boolean;
  routeBase?: string;
  hue?: number | null;
  siteTitle?: string;
  siteDescription?: string | null;
  syncParentOnNavigate?: boolean;
} = {}): JSX.Element {
  const [state, setState] = useState<WorkspaceDemoState>(() => createWorkspaceDemoSeed());
  const [location, setLocation] = useState(WORKSPACE_DEMO_PATH);
  useEffect(() => {
    /**
     * Reloads the fixture and current route after persisted demo or browser history changes.
     */
    const syncFixture = (): void => {
      setState(readWorkspaceDemoState());
      setLocation(currentLocation());
    };
    /**
     * Applies a navigation event from the surrounding Docs shell and reloads its fixture data.
     *
     * @param event - Custom event carrying the target pathname or URL in its detail payload.
     */
    const syncLocation = (event: Event): void => {
      const detail = (event as CustomEvent<{ pathname?: unknown; url?: unknown }>).detail;
      setLocation(
        typeof detail?.pathname === 'string'
          ? detail.pathname
          : typeof detail?.url === 'string'
            ? detail.url
            : currentLocation(),
      );
      setState(readWorkspaceDemoState());
    };
    syncFixture();
    window.addEventListener('docs-fixture-updated', syncFixture);
    window.addEventListener('popstate', syncFixture);
    if (syncParentOnNavigate) document.addEventListener('docs:navigate', syncLocation);
    return () => {
      window.removeEventListener('docs-fixture-updated', syncFixture);
      window.removeEventListener('popstate', syncFixture);
      if (syncParentOnNavigate) document.removeEventListener('docs:navigate', syncLocation);
    };
  }, [syncParentOnNavigate]);
  const selectedDoc =
    state.documents[
      (() => {
        try {
          const requested = new URL(location, 'http://localhost').searchParams.get('leaf');
          if (requested && state.documents[requested]) return requested;
        } catch {
          // The seed leaf is the stable fallback for malformed demo routes.
        }
        return state.documents.salesphere ? 'salesphere' : (Object.keys(state.documents)[0] ?? '');
      })()
    ] ?? state.documents.salesphere;
  const host = useMemo(() => {
    const demoHost = createWorkspaceDemoHost(readOnly);
    if (!siteDesc) delete demoHost.siteDescription;
    return {
      ...demoHost,
      siteTitle,
      ...(siteDesc ? { siteDescription: siteDesc } : {}),
    };
  }, [readOnly, siteDesc, siteTitle]);
  // Keep the parity fixture's palette construction identical to the pinned
  // pre-extraction website fixture. This makes screenshot diffs report UI
  // regressions instead of comparing a different secondary/gray palette.
  const [primary, baseGray] = colors(hue);
  const [secondary, gray] = colors(invert(hue));
  if (!selectedDoc) return <div className="min-h-svh" />;
  const localPage = {
    id: 'salesphere',
    path: selectedDoc.path,
    pathname: routeBase,
    title: selectedDoc.title,
    description: 'A page level description for the Salesphere overview.',
    updatedAt: selectedDoc.updatedAt,
    markdown:
      '# Salesphere\n\nSalesphere helps sales professionals choose a useful next step in a customer relationship and understand why it matters.\n\n## Start with the product\n\nRead [Salesphere’s purpose](/product/purpose/) for the larger aim.',
    attachments: selectedDoc.attachments,
  };
  return (
    <div
      className="workspace-demo-theme min-h-svh bg-primary-1 text-primary-12"
      style={
        {
          ...Object.fromEntries(primary.light.map((r, i) => [`--primary-${i + 1}`, r])),
          ...Object.fromEntries((gray ?? baseGray).light.map((r, i) => [`--gray-${i + 1}`, r])),
          ...Object.fromEntries(
            (secondary ?? baseGray).light.map((r, i) => [`--secondary-${i + 1}`, r]),
          ),
          ...flattenColors('primary', primary),
          ...flattenColors('gray', gray ?? baseGray),
          ...flattenColors('secondary', secondary ?? baseGray),
        } as CSSProperties
      }
    >
      {readOnly ? (
        <DocsLocalWorkspace
          tree={withLocalRoute(routedWorkspaceTree(state, true), routeBase)}
          pages={[localPage]}
          pathname={localPage.pathname}
          title="Salesphere Docs"
          description="Product and engineering documentation."
          rootPath={routeBase}
          homePath={routeBase}
          {...(quizEnabled ? { quiz: demoQuiz } : {})}
        />
      ) : (
        <DocsWorkspace
          tree={routedWorkspaceTree(state, false)}
          host={host}
          pathname={
            location !== WORKSPACE_DEMO_PATH
              ? location
              : routeForWorkspaceDocument(state, selectedDoc.id, host.buildRoute)
          }
          permission="write"
          path={selectedDoc.path}
          title={selectedDoc.title}
          description={selectedDoc.description}
          contributors={selectedDoc.contributors}
          updatedAt={selectedDoc.updatedAt}
          content={selectedDoc.content}
          source={selectedDoc.source}
          {...(quizEnabled ? { quiz: demoQuiz } : {})}
        />
      )}
    </div>
  );
}

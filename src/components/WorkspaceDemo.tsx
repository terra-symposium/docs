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

/**
 * Builds a deterministic sample quiz from selected page text without calling a generation service.
 * @param v Title, Markdown source, question count, and supported formats for the sample quiz.
 * @returns A generated-shape quiz whose questions quote or select terms from the page excerpt.
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
 * Returns the current browser route, including query and fragment, or the demo root during SSR.
 * @returns Current URL path, query, and fragment, or the demo route during server rendering.
 */
function currentLocation(): string {
  if (typeof window === 'undefined') return WORKSPACE_DEMO_PATH;
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

/**
 * Renders the interactive workspace fixture used to preview host integration behavior.
 *
 * @param readOnly Disables demo mutations and switches the fixture to its read-only route.
 * @param quizEnabled Adds the deterministic sample quiz generator to eligible leaves.
 * @param routeBase Route used by the read-only demo workspace.
 * @param hue Primary Styling hue for the workspace palette.
 * @param siteTitle Host title shown in the sidebar and document title.
 * @param siteDescription Supporting host description, or `null` to omit it.
 * @param syncParentOnNavigate Whether route changes update the embedding page's browser history.
 *
 * @return The local Docs workspace demo with its navigation and interaction controls.
 */
export default function WorkspaceDemo({
  readOnly = false,
  quizEnabled = false,
  routeBase = '/workspace-readonly/',
  hue = 145,
  siteTitle = 'Salesphere Docs',
  siteDescription = 'Product and engineering documentation.',
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
    /** Reloads the demo fixture and current URL after storage or history changes. */
    const syncFixture = (): void => {
      setState(readWorkspaceDemoState());
      setLocation(currentLocation());
    };
    /**
     * Applies the route from a parent workspace event and refreshes fixture data.
     * @param event Navigation event whose detail may carry a pathname or URL.
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
  const selectedDocument =
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
    if (!siteDescription) delete demoHost.siteDescription;
    return {
      ...demoHost,
      siteTitle,
      ...(siteDescription ? { siteDescription } : {}),
    };
  }, [readOnly, siteDescription, siteTitle]);
  // Keep the parity fixture's palette construction identical to the pinned
  // pre-extraction website fixture. This makes screenshot diffs report UI
  // regressions instead of comparing a different secondary/gray palette.
  const [primary, baseGray] = colors(hue);
  const [secondary, gray] = colors(invert(hue));
  if (!selectedDocument) return <div className="min-h-svh" />;
  const localPage = {
    id: 'salesphere',
    path: selectedDocument.path,
    pathname: routeBase,
    title: selectedDocument.title,
    description: 'A page level description for the Salesphere overview.',
    updatedAt: selectedDocument.updatedAt,
    markdown:
      '# Salesphere\n\nSalesphere helps sales professionals choose a useful next step in a customer relationship and understand why it matters.\n\n## Start with the product\n\nRead [Salesphere’s purpose](/product/purpose/) for the larger aim.',
    attachments: selectedDocument.attachments,
  };
  /**
   * Points every read-only fixture leaf at the single locally rendered page.
   * @param nodes Navigation subtree whose leaf URLs should be rewritten.
   * @param routeBase Shared route used by the read-only preview.
   * @returns A copied tree with nested branches preserved and leaf URLs replaced.
   */
  const withLocalRoute = (
    nodes: DocsHostTreeNode[],
    routeBase = '/workspace-readonly/',
  ): DocsHostTreeNode[] =>
    nodes.map((n) => ({
      ...n,
      ...(n.type === 'leaf' ? { url: routeBase } : {}),
      ...(n.children ? { children: withLocalRoute(n.children, routeBase) } : {}),
    }));
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
              : routeForWorkspaceDocument(state, selectedDocument.id, host.buildRoute)
          }
          permission="write"
          path={selectedDocument.path}
          title={selectedDocument.title}
          description={selectedDocument.description}
          contributors={selectedDocument.contributors}
          updatedAt={selectedDocument.updatedAt}
          content={selectedDocument.content}
          source={selectedDocument.source}
          {...(quizEnabled ? { quiz: demoQuiz } : {})}
        />
      )}
    </div>
  );
}

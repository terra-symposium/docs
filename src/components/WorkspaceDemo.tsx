import { useEffect, useMemo, useState } from 'react';
import { colors, flattenColors, invert } from '@terra-symposium/styling';
import { DocsLocalWorkspace } from './LocalDocsWorkspace.js';
import { DocsWorkspace } from './terra/Workspace.js';
import {
  createWorkspaceDemoHost,
  createWorkspaceDemoSeed,
  readWorkspaceDemoState,
  routeForWorkspaceDocument,
  routedWorkspaceTree,
  WORKSPACE_DEMO_PATH,
  type WorkspaceDemoState,
} from './workspace-demo-fixture.js';
import type { DocsHostTreeNode } from '../lib/host.js';
import type { DocsQuizConfig, DocsQuizGenerationInput } from './quiz.js';
import type { CSSProperties, JSX } from 'react';
import * as TerraQualityRegex from '../lib/terra/regex.mjs';

function currentLocation(): string {
  if (typeof window === 'undefined') return WORKSPACE_DEMO_PATH;
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

const demoQuiz: DocsQuizConfig = {
  toolbar: true,
  generate: function genDemoQuiz(input: DocsQuizGenerationInput): Promise<unknown> {
    const excerpt =
      input.markdown
        .replace(/^\s*#+\s*/gm, '')
        .replace(/[*_`>#]/g, ' ')
        .split(/[.!?\n]+/)
        .map((part) => part.trim())
        .find((part) => part.length > 12)
        ?.slice(0, 150) ?? input.title;
    const quizText = {
      excerpt,
      keyword:
        excerpt.split(TerraQualityRegex.REGEX_S_REGEX_2()).find((word) => word.length >= 5) ??
        input.title,
    };
    return Promise.resolve({
      title: `${input.title} quiz · sample`,
      questions: Array.from({ length: input.count }, (_, i) => {
        const type = input.types[i % input.types.length];
        if (type === 'keyword')
          return {
            type,
            prompt: `Name a key term from “${input.title}”.`,
            answers: [quizText.keyword.replace(/[^\p{L}\p{N}-]/gu, '') || input.title],
            explanation: 'This sample answer is drawn from the selected leaf.',
          };
        return {
          type,
          prompt: `Which statement appears in “${input.title}”?`,
          opts: [quizText.excerpt, 'The leaf contains no information about this topic.'],
          answer: quizText.excerpt,
          explanation: 'The correct choice comes from the selected leaf text.',
        };
      }),
    });
  },
};

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
    const syncFixture = (): void => {
      setState(readWorkspaceDemoState());
      setLocation(currentLocation());
    };
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

  return (
    <div
      className="workspace-demo-theme min-h-svh bg-primary-1 text-primary-12"
      style={
        {
          ...Object.fromEntries(primary.light.map((rgb, i) => [`--primary-${i + 1}`, rgb])),
          ...Object.fromEntries((gray ?? baseGray).light.map((rgb, i) => [`--gray-${i + 1}`, rgb])),
          ...Object.fromEntries(
            (secondary ?? baseGray).light.map((rgb, i) => [`--secondary-${i + 1}`, rgb]),
          ),
          ...flattenColors('primary', primary),
          ...flattenColors('gray', gray ?? baseGray),
          ...flattenColors('secondary', secondary ?? baseGray),
        } as CSSProperties
      }
    >
      {readOnly ? (
        <DocsLocalWorkspace
          tree={(function withLocalRoute(
            nodes: DocsHostTreeNode[],
            routeBase = '/workspace-readonly/',
          ): DocsHostTreeNode[] {
            return nodes.map((node) => ({
              ...node,
              ...(node.type === 'leaf' ? { url: routeBase } : {}),
              ...(node.children ? { children: withLocalRoute(node.children, routeBase) } : {}),
            }));
          })(routedWorkspaceTree(state, true), routeBase)}
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

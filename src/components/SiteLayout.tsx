/**
 * src/components/SiteLayout.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// COMPONENTS
import { DocsStaticWorkspace } from './StaticWorkspace.js';

// TYPES
import type { DocsAttachment, DocsSection } from '../lib/workspace-types.js';
import type { DocsNavNode } from './navigation.js';
import type { DocsQuizConfig } from './quiz.js';
import type { JSX, ReactNode } from 'react';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Compatibility adapter for static React sites.
 *
 * All navigation, page chrome, modes, and document rendering are delegated to
 * the same DocsWorkspace used by the local and remote host adapters.
 *
 * @param title Site title shown in the shared Docs sidebar.
 * @param homeHref Destination for the site brand link.
 * @param description Optional site summary displayed below the title.
 * @param pageTitle Current page title used by the workspace.
 * @param nodes Navigation tree displayed by the shared sidebar.
 * @param currentPath Current browser path used to select the active page.
 * @param hue Styling hue applied to the shared Docs surface.
 * @param children Optional page body rendered in the shared workspace.
 * @param sections Optional pre-resolved Docs navigation sections.
 * @param attachments Attachments available to the current page.
 * @param rootPath Host Docs root used for fallback route construction.
 * @param markdown Markdown source converted when structured content is absent.
 * @param content Optional pre-parsed content passed to the workspace.
 * @param quiz Optional host-owned quiz toolbar and generation callback.
 *
 * @return Static Docs layout backed by the shared read-only workspace.
 */
export function DocsSiteLayout({
  title,
  homeHref = '/',
  description,
  pageTitle,
  nodes,
  currentPath,
  hue = 145,
  children,
  sections,
  attachments = [],
  rootPath,
  markdown,
  content,
  quiz,
}: {
  title: string;
  homeHref?: string;
  description?: string;
  pageTitle?: string;
  nodes: DocsNavNode[];
  currentPath: string;
  hue?: number | null;
  children?: ReactNode;
  sections?: DocsSection[];
  attachments?: DocsAttachment[];
  rootPath?: string;
  markdown?: string;
  content?: unknown;
  quiz?: DocsQuizConfig;
}): JSX.Element {
  return (
    <DocsStaticWorkspace
      title={title}
      homeHref={homeHref}
      {...(description ? { description } : {})}
      {...(pageTitle ? { pageTitle } : {})}
      hue={hue}
      nodes={nodes}
      {...(sections ? { sections } : {})}
      currentPath={currentPath}
      {...(rootPath ? { rootPath } : {})}
      {...(markdown !== undefined ? { markdown } : {})}
      {...(content !== undefined ? { content } : {})}
      {...(quiz ? { quiz } : {})}
      attachments={attachments}
      {...(children !== undefined ? { renderContent: children } : {})}
    />
  );
}

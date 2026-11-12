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
 * @param title - Product name used by the shared Docs chrome.
 * @param homeHref - Host home route used by the navigation and not-found page.
 * @param description - Optional product description for the shared page chrome.
 * @param pageTitle - Optional title for the selected document page.
 * @param nodes - Host-provided navigation tree.
 * @param currentPath - Current route used to select the active navigation entry.
 * @param hue - Palette hue applied to the workspace.
 * @param children - Optional already-rendered page body.
 * @param sections - Legacy section data passed to the static workspace adapter.
 * @param attachments - Attachments available to the rendered page.
 * @param rootPath - Base route used to build local document links.
 * @param markdown - Markdown source rendered when supplied.
 * @param content - Structured document value used when no Markdown body is supplied.
 * @param quiz - Optional quiz configuration for the current page.
 *
 * @returns The shared static workspace configured for the supplied host page.
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

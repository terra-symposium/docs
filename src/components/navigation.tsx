/**
 * src/components/navigation.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { colors } from '@terra-symposium/styling';
import * as TerraQualityRegex from '../lib/terra/regex.mjs';

// TYPES
import type { CSSProperties, JSX } from 'react';
import type { DocsAttachment } from '../lib/workspace-types.js';
import * as TerraQualityRegex from '../lib/terra/regex.mjs';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/**
 * One entry in the Docs sidebar tree. Sections and groups may nest children; leaves may supply a destination.
 */
export type DocsNavNode = {
  id?: string;
  path?: string;
  title: string;
  href?: string;
  description?: string;
  updatedAt?: string;
  attachments?: DocsAttachment[];
  hue?: number | null;
  children?: DocsNavNode[];
};

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Reduces a URL or route string to the pathname used by active-link matching.
 * Query strings and fragments do not affect which navigation entry is selected.
 *
 * @param value - Relative or absolute link being compared.
 *
 * @returns The normalized pathname, or `/` when the input contains no path.
 */
const pathKey = (value: string): string => {
  try {
    return (
      new URL(value, 'http://docs.local').pathname.replace(
        TerraQualityRegex.REGEX_PATTERN_REGEX_7(),
        '',
      ) || '/'
    );
  } catch {
    return (
      (value.split('#', 1)[0] ?? '').replace(TerraQualityRegex.REGEX_PATTERN_REGEX_7(), '') || '/'
    );
  }
};

/**
 * Checks whether a navigation link names the current page or one of its ancestors.
 * A parent remains active for routes nested below its path.
 *
 * @param href - Navigation destination to compare with the current route.
 * @param currentPath - Current browser or public-site path.
 *
 * @returns Whether the current route is the link target or a descendant route.
 */
const isActivePath = (href: string, currentPath: string): boolean => {
  const target = pathKey(href);
  const current = pathKey(currentPath);
  return current === target || current.startsWith(`${target}/`);
};

/**
 * Renders nested documentation links while marking the current route and its ancestors.
 * Parent links without destinations remain labels and cannot claim the current-page state.
 *
 * @param nodes - Ordered navigation tree supplied by the host.
 * @param currentPath - Current URL or route used to compute active links.
 * @param hue - Styling palette hue used for the navigation accent.
 *
 * @returns An accessible navigation landmark with a nested list of links and labels.
 */
export function DocsNavigation({
  nodes,
  currentPath,
  hue = 210,
}: {
  nodes: DocsNavNode[];
  currentPath: string;
  hue?: number | null;
}): JSX.Element {
  const [accent] = colors(hue);
  const rootItems: JSX.Element[] = [];
  const lists: {
    nodes: DocsNavNode[];
    index: number;
    items: JSX.Element[];
    parent?: { node: DocsNavNode; index: number };
  }[] = [{ nodes, index: 0, items: rootItems }];
  while (lists.length) {
    const list = lists.at(-1);
    if (!list) break;
    if (list.index === list.nodes.length) {
      lists.pop();
      if (list.parent) {
        const parentList = lists.at(-1);
        if (parentList)
          parentList.items.push(
            <li key={`${list.parent.node.href ?? list.parent.node.title}-${list.parent.index}`}>
              {list.parent.node.href ? (
                <a
                  href={list.parent.node.href}
                  aria-current={
                    pathKey(list.parent.node.href) === pathKey(currentPath) ? 'page' : undefined
                  }
                >
                  {list.parent.node.title}
                </a>
              ) : (
                <span>{list.parent.node.title}</span>
              )}
              <ul className="docs-nav-list">{list.items}</ul>
            </li>,
          );
      }
      continue;
    }
    const index = list.index++;
    const node = list.nodes[index];
    if (!node) continue;
    if (node.children?.length) {
      lists.push({
        nodes: node.children,
        index: 0,
        items: [],
        parent: { node, index },
      });
    } else {
      list.items.push(
        <li key={`${node.href ?? node.title}-${index}`}>
          {node.href ? (
            <a
              href={node.href}
              aria-current={isActivePath(node.href, currentPath) ? 'page' : undefined}
            >
              {node.title}
            </a>
          ) : (
            <span>{node.title}</span>
          )}
        </li>,
      );
    }
  }
  return (
    <nav
      className="docs-nav"
      aria-label="Documentation"
      style={{ '--docs-accent': `rgb(${accent.light[8]})` } as CSSProperties}
    >
      <ul className="docs-nav-list">{rootItems}</ul>
    </nav>
  );
}

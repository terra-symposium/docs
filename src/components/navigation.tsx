/**
 * src/components/navigation.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { colors } from '@terra-symposium/styling';

// TYPES
import type { CSSProperties, JSX } from 'react';
import type { DocsAttachment } from '../lib/workspace-types.js';
import * as TerraQualityRegex from '../lib/terra/regex.mjs';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/**
 * One entry in the Docs sidebar tree.
 *
 * A section or group can supply `children` without a destination; a leaf supplies `href` or `path`.
 * Optional description, update time, attachments, and hue carry the metadata shown for that entry.
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
 * Removes query/hash data and trailing slashes before comparing Docs routes.
 *
 * @param value URL or path supplied by the site or current browser route.
 *
 * @return A normalized pathname suitable for exact and parent-route matching.
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
 * Marks a leaf active when the current route is that page or one of its descendants.
 *
 * @param href Navigation destination to compare with the current route.
 * @param currentPath Current browser or public-site path.
 *
 * @return Whether the destination owns the current path.
 */
const isActivePath = (href: string, currentPath: string): boolean => {
  const target = pathKey(href);
  const current = pathKey(currentPath);
  return current === target || current.startsWith(`${target}/`);
};

/**
 * Renders the documentation tree as nested links and non-clickable section labels.
 *
 * @param nodes Navigation nodes to display in their supplied order.
 * @param currentPath Current public URL used to mark the active leaf.
 * @param hue Primary Styling hue used for the navigation accent.
 *
 * @return An accessible navigation landmark containing the nested page tree.
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

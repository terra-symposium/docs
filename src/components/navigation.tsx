import { colors } from '@terra-symposium/styling';
import type { DocsAttachment } from '../lib/workspace-types.js';
import type { CSSProperties, JSX } from 'react';

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
                  aria-current={list.parent.node.href === currentPath ? 'page' : undefined}
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
            <a href={node.href} aria-current={node.href === currentPath ? 'page' : undefined}>
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

import { colors } from '@terra-symposium/styling';
import type { DocsAttachment } from '../lib/workspace-types.js';
import type { CSSProperties, JSX } from 'react';

const pathKey = (value: string): string => {
  try {
    const url = new URL(value, 'http://docs.local');
    return url.pathname.replace(/\/+$/, '') || '/';
  } catch {
    return (value.split('#', 1)[0] ?? '').replace(/\/+$/, '') || '/';
  }
};

const isActivePath = (href: string, currentPath: string): boolean => {
  const target = pathKey(href);
  const current = pathKey(currentPath);
  return current === target || current.startsWith(`${target}/`);
};

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
  const style = { '--docs-accent': `rgb(${accent.light[8]})` } as CSSProperties;
  const render = (items: DocsNavNode[]): JSX.Element => (
    <ul className="docs-nav-list">
      {items.map((node, i) => (
        <li key={`${node.href ?? node.title}-${i}`}>
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
          {node.children?.length ? render(node.children) : null}
        </li>
      ))}
    </ul>
  );
  return (
    <nav className="docs-nav" aria-label="Documentation" style={style}>
      {render(nodes)}
    </nav>
  );
}

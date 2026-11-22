/**
 * site/docs-callouts-remark-plugin.mjs
 *
 * Gives MDX the same titled `:::` callouts used by repository Markdown pages.
 */

const CALLOUT_KINDS = new Set(['note', 'tip', 'caution', 'danger', 'example', 'warning']);

/**
 * Turn supported container directives into the callout HTML shape used by Docs.
 *
 * @return {(tree: object) => void} Remark tree transformer.
 */
export function docsCalloutsRemarkPlugin() {
  return (tree) => {
    transformChildren(tree);
  };
}

function transformChildren(parent) {
  if (!Array.isArray(parent.children)) return;

  for (const node of parent.children) {
    if (node.type === 'containerDirective' && CALLOUT_KINDS.has(node.name)) {
      const labelIndex = node.children.findIndex(
        (child) => child.type === 'paragraph' && child.data?.directiveLabel,
      );
      const label = labelIndex === -1 ? undefined : node.children.splice(labelIndex, 1)[0];
      const kind = node.name;
      node.data = {
        ...node.data,
        hName: 'aside',
        hProperties: {
          ...(node.attributes ?? {}),
          className: ['callout', kind],
          'data-docs-aside': kind,
        },
      };

      if (label?.children?.length) {
        node.children.unshift({
          type: 'paragraph',
          data: {
            hName: 'strong',
            hProperties: { className: 'title' },
          },
          children: label.children,
        });
      }
    }

    transformChildren(node);
  }
}

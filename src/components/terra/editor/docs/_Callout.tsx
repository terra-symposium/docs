/**
 * src/components/terra/editor/docs/_Callout.tsx
 * Docs callout renderer with view and edit modes.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { useEditor } from '@portabletext/editor';

// COMPONENTS
import { ErrorBoundary } from '../../ui.js';
import { Input } from '@terra-symposium/styling/ui';
import { TerraContentEditor } from './_editor.js';

// TYPES
import type { Content as ContentData } from '../../../../lib/terra/runtime/types.js';
import type {
  DocsBlock,
  PortableTextBlockEditorProps,
  PortableTextBlockRendererProps,
} from '../types.js';
import type { JSX } from 'react';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** Sanity Portable Text callout data consumed by the docs editor and renderer. */
type CalloutBlock = DocsBlock<'callout'>;

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Renders a Docs callout and its nested rich-text body.
 *
 * @param block Authored callout fields, including its title, kind, and nested Portable Text content.
 *
 * @return The rendered callout block.
 */
function Callout({ block }: { block: CalloutBlock }): JSX.Element {
  return (
    <ErrorBoundary name="CalloutBlock">
      <aside
        className="docs-block [&>:first-child]:!mt-0 [&>:last-child]:!mb-0"
        data-docs-aside={block.kind ?? 'note'}
      >
        <h4 className="title">{block.title ?? block.kind ?? 'Note'}</h4>
        <TerraContentEditor
          content={(block.content ?? []) as unknown as ContentData}
          docsAttachments={[]}
          nested
          readOnly
        />
      </aside>
    </ErrorBoundary>
  );
}

/**
 * Renders editable Docs callout controls and nested content.
 *
 * @param attrs DOM attributes supplied by the Portable Text editor.
 * @param children Nested editor content rendered after the editable callout fields.
 * @param node Callout block whose title and nested content are being edited.
 * @param path Portable Text path targeted by the title and content updates.
 *
 * @return The editable callout and nested rich-text surface.
 */
function CalloutEditor({
  attributes: attrs,
  children,
  node,
  path,
}: PortableTextBlockEditorProps<CalloutBlock>): React.JSX.Element {
  const editor = useEditor();
  const block = node;
  return (
    <ErrorBoundary name="CalloutEditor">
      <aside
        {...attrs}
        contentEditable={false}
        className="docs-block rounded-md border border-primary-5 p-4"
        data-block="callout"
        data-docs-aside={block.kind ?? 'note'}
      >
        <Input
          aria-label="Callout title"
          className="mb-3 border-0 bg-transparent px-0 text-lg font-bold shadow-none"
          value={block.title ?? block.kind ?? 'Note'}
          onChange={(e) =>
            editor.send({
              type: 'block.set',
              at: path,
              props: { title: e.currentTarget.value },
            })
          }
        />
        <TerraContentEditor
          content={(block.content ?? []) as unknown as ContentData}
          docsAttachments={[]}
          nested
          onChange={(c) =>
            editor.send({
              type: 'block.set',
              at: path,
              props: { content: c as ContentData, markdown: '' },
            })
          }
        />
        {children}
      </aside>
    </ErrorBoundary>
  );
}

/**
 * Adapts Portable Text's block-object contract to the callout renderer.
 *
 * @param attrs DOM attributes supplied by the Portable Text renderer.
 * @param children Nested editor content associated with the callout block.
 * @param node Callout data containing its kind, title, and body.
 * @param path Portable Text path used by the editable renderer.
 * @param readOnly Selects the static callout view when editing is disabled.
 *
 * @return The callout renderer in editable or read-only mode.
 */
export function renderCallout({
  attributes: attrs,
  children,
  node,
  path,
  readOnly,
}: PortableTextBlockRendererProps<CalloutBlock>): React.JSX.Element {
  return readOnly ? (
    <Callout block={node} />
  ) : (
    <CalloutEditor attributes={attrs} children={children} node={node} path={path} />
  );
}
Object.assign(Callout, { displayName: 'DocsCalloutPreview' });
Object.assign(CalloutEditor, { displayName: 'DocsCalloutEditor' });
Object.assign(renderCallout, { displayName: 'DocsCalloutRenderer' });

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

/**
 * Sanity Portable Text callout data consumed by the docs editor and renderer.
 */
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
  const kind = typeof block.kind === 'string' ? block.kind : 'note';
  return (
    <ErrorBoundary name="CalloutBlock">
      <aside className="block [&>:first-child]:!mt-0 [&>:last-child]:!mb-0" data-docs-aside={kind}>
        <h4 className="title">
          {typeof block.title === 'string' ? block.title : kind === 'note' ? 'Note' : kind}
        </h4>
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
}: PortableTextBlockEditorProps<CalloutBlock>): JSX.Element {
  const editor = useEditor();
  const block = node;
  const kind = typeof block.kind === 'string' ? block.kind : 'note';
  return (
    <ErrorBoundary name="CalloutEditor">
      <aside
        {...attrs}
        contentEditable={false}
        className="block rounded-md border border-primary-5 p-4"
        data-block="callout"
        data-docs-aside={kind}
      >
        <Input
          aria-label="Callout title"
          className="mb-3 border-0 bg-transparent px-0 text-lg font-bold shadow-none"
          value={typeof block.title === 'string' ? block.title : kind === 'note' ? 'Note' : kind}
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
 *
 * @docsId asides
 * @docsUseWhen Add one bounded note, tip, warning, or example that changes how nearby content should be read.
 * @docsConstraint Use one aside for one bounded note, tip, caution, warning, danger, or example.
 * @docsConstraint Keep the main explanation and required steps in the reading path.
 * @docsConstraint A callout is not a way to make the page look shorter.
 * @docsDo Choose note for background/definition, tip for practical advice, caution for a pitfall, warning for a serious issue, danger for a forbidden/high-risk action, and example for concrete behavior.
 * @docsDo Give each aside a specific title; keep nested lists, tables, and code inside its boundary.
 * @docsDo Map imported info to note and error to danger.
 * @docsDo Group adjacent callouts of one purpose in titled accordion items, with example asides inside their related item.
 * @docsDont Do not hide a required step in a callout.
 * @docsDont Do not use danger for ordinary background, a vague warning at page end, or a warning for a routine fact.
 * @docsTip Place the aside beside the decision it affects.
 * @docsTip In Edit mode choose + Insert content → Callout, set its kind and title, then check the result in View mode.
 * @docsEditorImage /_docs/assets/consumer/1-usage/2-blocks/insert-callout.png | Docs Insert content menu with Callout highlighted
 * @docsInsertionStep In Edit mode, place the cursor beside the affected explanation and choose + Insert content → Callout.
 * @docsInsertionStep Choose the matching kind, enter a specific title, and write one bounded point.
 * @docsInsertionStep Preview the callout beside the action or decision it affects.
 * @docsSyntax
 * ```mdx
 * :::warning[Save outside the editor]
 *
 * `onChange` reports the updated value. Persist it in the host.
 *
 * :::
 * ```
 * @docsRenderedExample
 * :::warning[Save outside the editor]
 *
 * `onChange` reports the updated value. Persist it in the host.
 *
 * :::
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

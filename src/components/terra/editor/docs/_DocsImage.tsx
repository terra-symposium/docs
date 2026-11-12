/**
 * src/components/terra/editor/docs/_DocsImage.tsx
 */

/*
 * Docs image renderer with view and edit modes.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { useEditor } from '@portabletext/editor';
import type { JSX } from 'react';

// COMPONENTS
import { AlertError, Button, Input } from '@terra-symposium/styling/ui';
import { Empty, ErrorBoundary } from '../../ui.js';
import { Image as ImageIcon, TrashCan as TrashIcon } from '@carbon/icons-react';

// TYPES
import type {
  DocsBlock,
  PortableTextBlockEditorProps,
  PortableTextBlockRendererProps,
} from '../types.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** Sanity Portable Text image fields authored in documentation content. */
type DocsImgBlock = DocsBlock<'docImage'>;
const FIELD_LABEL = 'block text-sm font-medium text-primary-12';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Renders a Docs image block from its authored block.
 *
 * @param block Authored image block containing its URL, dimensions, alt text, and caption.
 *
 * @return The image with its authored caption and alternate text.
 */
function Img({ block }: { block: DocsImgBlock }): JSX.Element {
  const url = typeof block.url === 'string' ? block.url : '';
  const alt = typeof block.alt === 'string' ? block.alt : '';
  const title = typeof block.title === 'string' ? block.title : undefined;
  const width =
    typeof block.width === 'string' || typeof block.width === 'number' ? block.width : undefined;
  const height =
    typeof block.height === 'string' || typeof block.height === 'number' ? block.height : undefined;
  if (!url)
    return (
      <ErrorBoundary name="Image">
        <AlertError title="Image unavailable" description="This image block has no URL." />
      </ErrorBoundary>
    );
  return (
    <ErrorBoundary name="Image">
      <img
        src={url}
        alt={alt}
        className="max-w-full"
        {...(title === undefined ? {} : { title })}
        {...(width === undefined ? {} : { width })}
        {...(height === undefined ? {} : { height })}
      />
    </ErrorBoundary>
  );
}

/**
 * Chooses a read-only image preview or the editor-backed image controls.
 *
 * @param attrs Portable Text attributes applied to the editor wrapper.
 * @param children Nested Portable Text content retained inside the wrapper.
 * @param node Authored image block to display or edit.
 * @param path Editor path used when image metadata changes.
 * @param readOnly Whether the workspace displays or edits this block.
 *
 * @return The image renderer in editable or read-only mode.
 */
export function renderImage({
  attributes: attrs,
  children,
  node,
  path,
  readOnly,
}: PortableTextBlockRendererProps<DocsImgBlock>): JSX.Element {
  return readOnly ? (
    <Img block={node} />
  ) : (
    <ImgEditor attributes={attrs} children={children} node={node} path={path} />
  );
}

/**
 * Saves image metadata edits to the active Portable Text block.
 *
 * @param attrs Attributes applied to the editor wrapper.
 * @param children Nested Portable Text content retained below the image form.
 * @param node Current image block data.
 * @param path Path of the image block in the document.
 *
 * @return The editable image block controls.
 */
function ImgEditor({
  attributes: attrs,
  children,
  node,
  path,
}: PortableTextBlockEditorProps<DocsImgBlock>): JSX.Element {
  const editor = useEditor();
  const url = typeof node.url === 'string' ? node.url : '';
  const alt = typeof node.alt === 'string' ? node.alt : '';
  const title = typeof node.title === 'string' ? node.title : '';
  const width = typeof node.width === 'string' || typeof node.width === 'number' ? node.width : '';
  const height =
    typeof node.height === 'string' || typeof node.height === 'number' ? node.height : '';
  /**
   * Saves one image field to the Portable Text block at the current editor path.
   *
   * @param field - Image metadata field being edited.
   * @param val - New string value for the selected field.
   * @returns No value; the editor action updates the active image block.
   */
  const update = (
    field:
      | /** Image metadata keys edited by the docs image form. */ 'alt'
      | 'height'
      | 'title'
      | 'url'
      | 'width',
    val: string,
  ): void => editor.send({ type: 'block.set', at: path, props: { [field]: val } });
  return (
    <ErrorBoundary name="ImageBlock">
      <section
        {...attrs}
        contentEditable={false}
        className="my-8 rounded-xl border border-secondary-6 bg-secondary-1/40 p-4 shadow-sm sm:p-5"
        data-block="docImage"
      >
        <div className="flex items-center gap-3 border-b border-secondary-5 pb-3 text-primary-12">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary-3 text-secondary-11">
            <ImageIcon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-semibold">Image</h3>
            <p className="text-sm text-primary-11">Docs image block</p>
          </div>
        </div>
        <label className={`mt-4 ${FIELD_LABEL}`}>
          <span>Image URL</span>
          <Input
            className="mt-1.5"
            type="url"
            value={url}
            onChange={(e) => update('url', e.currentTarget.value)}
            placeholder="https://example.com/image.png"
          />
        </label>
        {url ? (
          <figure className="mt-4 overflow-hidden rounded-lg border border-secondary-5 bg-primary-1">
            <img
              src={url}
              alt={alt}
              title={title || undefined}
              className="max-h-[32rem] w-full object-contain"
              {...(width ? { width } : {})}
              {...(height ? { height } : {})}
            />
            {title ? (
              <figcaption className="border-t border-secondary-5 px-3 py-2 text-sm text-primary-11">
                {title}
              </figcaption>
            ) : null}
          </figure>
        ) : (
          <Empty variant="preview">Add an image URL to preview it here.</Empty>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className={FIELD_LABEL}>
            <span>Alternative text</span>
            <Input
              className="mt-1.5"
              value={alt}
              onChange={(e) => update('alt', e.currentTarget.value)}
              placeholder="Describe the image"
            />
          </label>
          <label className={FIELD_LABEL}>
            <span>Caption</span>
            <Input
              className="mt-1.5"
              value={title}
              onChange={(e) => update('title', e.currentTarget.value)}
              placeholder="Optional caption"
            />
          </label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className={FIELD_LABEL}>
            <span>Width</span>
            <Input
              className="mt-1.5"
              value={width}
              onChange={(e) => update('width', e.currentTarget.value)}
              placeholder="e.g. 640px"
            />
          </label>
          <label className={FIELD_LABEL}>
            <span>Height</span>
            <Input
              className="mt-1.5"
              value={height}
              onChange={(e) => update('height', e.currentTarget.value)}
              placeholder="e.g. auto"
            />
          </label>
        </div>
        <p className="mt-3 text-xs leading-5 text-primary-10">
          Use a stable, publicly accessible image URL. Uploading assets is part of real-content
          integration.
        </p>
        <Button
          className="mt-4"
          size="sm"
          variant="destructive"
          onClick={() => editor.send({ type: 'unset', at: path })}
        >
          <TrashIcon aria-hidden="true" /> Delete image
        </Button>
        {children}
      </section>
    </ErrorBoundary>
  );
}
Object.assign(Img, { displayName: 'DocsImagePreview' });
Object.assign(renderImage, { displayName: 'DocsImageRenderer' });
Object.assign(ImgEditor, { displayName: 'DocsImageEditor' });

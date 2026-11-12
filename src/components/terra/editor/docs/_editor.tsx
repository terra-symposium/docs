/**
 * src/components/terra/editor/docs/_editor.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { lazy } from 'react';

// COMPONENTS
import { Suspense } from 'react';

// TYPES
import type { ComponentProps } from 'react';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const LazyTerraContentEditor = lazy(() =>
  import('../ContentEditor.js').then((module) => ({ default: module.ContentEditor })),
);

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Loads the shared Portable Text editor lazily inside a Suspense boundary.
 *
 * @param editorConfiguration Initial content and host options forwarded to ContentEditor.
 * @param editorConfiguration.content Portable Text value used to initialize or replace the editor content.
 * @param editorConfiguration.onChange Optional callback that receives normalized content after edits.
 * @param editorConfiguration.readOnly Whether to render the content without edit controls.
 * @param editorConfiguration.resetKey Key that remounts the editor when the host switches documents.
 * @param editorConfiguration.nested Whether to use compact controls for a nested rich-text block.
 * @param editorConfiguration.toolbar Whether insertion and formatting controls are shown.
 * @param editorConfiguration.docsAttachments Attachments available to insertion and preview controls.
 * @param editorConfiguration.toolbarActions Optional host actions rendered beside the Docs toolbar.
 * @param editorConfiguration.blocks Feature switches that select the rich block types enabled in the editor.
 * @returns The loaded ContentEditor, or the null Suspense fallback while its module loads.
 */
export function TerraContentEditor(
  editorConfiguration: ComponentProps<typeof LazyTerraContentEditor>,
) {
  return (
    <Suspense fallback={null}>
      <LazyTerraContentEditor {...editorConfiguration} />
    </Suspense>
  );
}

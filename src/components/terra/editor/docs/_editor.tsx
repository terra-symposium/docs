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
 * Defers loading the shared Portable Text editor until its client-side surface is mounted.
 *
 * @param editorConfiguration Portable Text value and host controls forwarded to the lazy editor.
 * @param editorConfiguration.content Initial or replacement Portable Text value.
 * @param editorConfiguration.onChange Optional callback receiving accepted editor changes.
 * @param editorConfiguration.readOnly Renders the document without edit controls when true.
 * @param editorConfiguration.resetKey Remount key used when the host switches documents.
 * @param editorConfiguration.nested Selects compact controls for a nested rich block.
 * @param editorConfiguration.toolbar Controls whether insertion and formatting actions are visible.
 * @param editorConfiguration.docsAttachments Attachment records available to the editor controls.
 * @param editorConfiguration.toolbarActions Optional host actions rendered beside the Docs toolbar.
 * @param editorConfiguration.blocks Feature switches controlling which rich blocks the editor accepts.
 * @returns The editor once its module has loaded, or the empty suspense fallback while loading.
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

/**
 * src/components/Docs.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { lazy } from 'react';

// COMPONENTS
import { Suspense } from 'react';

// TYPES
import type { DocsBlockOptions } from './blocks.js';
import type { JSX } from 'react';
import type { PortableTextBlock } from '@portabletext/editor';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const ContentEditor = lazy(() =>
  import('./terra/editor/ContentEditor.js').then((module) => ({ default: module.ContentEditor })),
);
/** Portable Text blocks supplied and retained by the host application. */
export type DocsValue = PortableTextBlock[];
/** Selects editing or read-only rendering. */
export type DocsMode = 'edit' | 'view';
/** Controlled content with editing callbacks available only in edit mode. */
export type DocsProps = {
  value: DocsValue;
  className?: string;
  blocks?: DocsBlockOptions;
} & ({ mode: 'edit'; onChange: (value: DocsValue) => void } | { mode: 'view'; onChange?: never });

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Renders a controlled Docs editor with lazy-loaded content in edit or read-only mode.
 *
 * @param editorOptions Controlled value, rendering mode, and optional block capabilities for one editor surface.
 * @param editorOptions.value Controlled Portable Text document value.
 * @param editorOptions.className Optional class applied to the editor root.
 * @param editorOptions.blocks Optional rich-block capabilities supplied by the host.
 * @param editorOptions.mode Selects editable controls or read-only rendering.
 * @param editorOptions.onChange Required callback in edit mode for updated content.
 *
 * @return The Docs editor surface configured for editing or read-only rendering.
 */
export function Docs(editorOptions: DocsProps): JSX.Element {
  return (
    <div className={['docs', editorOptions.className].filter(Boolean).join(' ')}>
      <Suspense fallback={null}>
        <ContentEditor
          content={editorOptions.value}
          readOnly={editorOptions.mode === 'view'}
          {...(editorOptions.blocks !== undefined ? { blocks: editorOptions.blocks } : {})}
          {...(editorOptions.mode === 'edit'
            ? { onChange: (v: unknown[]) => editorOptions.onChange(v as DocsValue) }
            : {})}
        />
      </Suspense>
    </div>
  );
}

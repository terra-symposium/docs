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
 * Controlled editor surface backed by the canonical Docs editor.
 *
 * The view mode is read-only; edit mode requires an `onChange` handler so the
 * host remains the owner of persisted content.
 *
 * @param value - Portable Text blocks controlled by the host application.
 * @param className - Optional class added to the themed editor wrapper.
 * @param blocks - Optional registry of reusable blocks enabled by the host.
 * @param mode - Selects editable or read-only rendering.
 * @param onChange - Required in edit mode to return changes to the content owner.
 * @returns A lazily loaded editor wrapped in the Docs theme class and a Suspense boundary.
 */
export function Docs({ value, className, blocks, mode, onChange }: DocsProps): JSX.Element {
  return (
    <div className={['docs', className].filter(Boolean).join(' ')}>
      <Suspense fallback={null}>
        <ContentEditor
          content={value}
          readOnly={mode === 'view'}
          {...(blocks !== undefined ? { blocks } : {})}
          {...(mode === 'edit' ? { onChange: (v: unknown[]) => onChange(v as DocsValue) } : {})}
        />
      </Suspense>
    </div>
  );
}

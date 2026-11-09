import { lazy, Suspense, type JSX } from 'react';
import type { DocsBlockOptions } from './blocks.js';
import type { PortableTextBlock } from '@portabletext/editor';

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

/** Controlled editor surface backed by the canonical Docs editor. */
export function Docs(props: DocsProps): JSX.Element {
  return (
    <div className={['docs', props.className].filter(Boolean).join(' ')}>
      <Suspense fallback={null}>
        <ContentEditor
          content={props.value}
          readOnly={props.mode === 'view'}
          {...(props.blocks !== undefined ? { blocks: props.blocks } : {})}
          {...(props.mode === 'edit'
            ? { onChange: (value: unknown[]) => props.onChange(value as DocsValue) }
            : {})}
        />
      </Suspense>
    </div>
  );
}

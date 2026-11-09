import { lazy, Suspense, type ComponentProps } from 'react';

const LazyTerraContentEditor = lazy(() =>
  import('../ContentEditor.js').then((module) => ({ default: module.ContentEditor })),
);

export function TerraContentEditor(props: ComponentProps<typeof LazyTerraContentEditor>) {
  return (
    <Suspense fallback={null}>
      <LazyTerraContentEditor {...props} />
    </Suspense>
  );
}

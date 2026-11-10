/**
 * src/components/terra/ui.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// COMPONENTS
import { Component } from 'react';

// TYPES
import type { ReactNode } from 'react';
export { Empty } from '@terra-symposium/styling/ui';

/** Contains render errors in a local fallback without replacing the surrounding Docs page. */
export class ErrorBoundary extends Component<
  {
    children?: ReactNode;
    name?: string;
    fallback?: (err: Error) => ReactNode;
    resetKey?: unknown;
  },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  /**
   * Stores a render error so the next render can show the boundary fallback.
   *
   * @param err Error thrown while rendering a descendant.
   *
   * @return State containing the error to render in the fallback.
   */
  static getDerivedStateFromError(err: Error) {
    return { error: err };
  }
  /**
   * Renders the caller's fallback or the error message when a child has failed.
   *
   * @return The error fallback after a failure, otherwise the boundary's children.
   */
  render() {
    return this.state.error
      ? (this.props.fallback?.(this.state.error) ?? (
          <div role="alert">{this.state.error.message}</div>
        ))
      : this.props.children;
  }
}

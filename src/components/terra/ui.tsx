/**
 * src/components/terra/ui.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// COMPONENTS
import { Avatar, AvatarFallback, AvatarImage } from '@terra-symposium/styling/ui';
import { Component } from 'react';

// TYPES
import type { ErrorInfo, JSX, ReactNode } from 'react';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

export const IMG_RESPONSIVE = 'max-w-full object-contain';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Displays a user's avatar and name, falling back to initials or a signed-out icon.
 *
 * @param props User identity and optional class name for the rendered row.
 *
 * @return Avatar and label content for the supplied user state.
 */
export default function User({
  user,
  className = '',
}: {
  user?: { name?: string; email?: string; image?: string } | null;
  className?: string;
}): JSX.Element {
  const label = user?.name ?? user?.email ?? 'Signed out';
  const initials =
    (user?.name ?? user?.email ?? '?')
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';
  return (
    <div
      className={`flex min-w-0 items-center gap-2 text-sm text-primary-11 ${className}`}
      title={label}
    >
      <Avatar size="sm" aria-label={label}>
        {user?.image ? <AvatarImage src={user.image} alt={label} /> : null}
        <AvatarFallback>
          {user ? (
            initials
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none">
              <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M5.5 20c.55-3.6 2.9-5.5 6.5-5.5s5.95 1.9 6.5 5.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          )}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 truncate">{label}</span>
    </div>
  );
}
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
   * Receives React's error report after the fallback has been activated.
   *
   * @param _error Error caught by the boundary and stored in state.
   * @param _info React component stack associated with the error.
   *
   * @return Nothing; fallback state is managed by `getDerivedStateFromError`.
   */
  componentDidCatch(_error: Error, _info: ErrorInfo) {}
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

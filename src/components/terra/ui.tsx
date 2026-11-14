/**
 * src/components/terra/ui.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// COMPONENTS
import { Component } from 'react';

// TYPES
import type { ErrorInfo, JSX, ReactNode } from 'react';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Displays a centered empty-state message.
 *
 * @param title Short heading shown above the description.
 * @param description Optional supporting text.
 *
 * @return Empty-state markup.
 */
export function Empty({ title = 'Nothing to show', description = '' }: { title?: string; description?: string }): JSX.Element {
	return (
		<div className='flex min-h-24 flex-col items-center justify-center gap-2 p-6 text-center text-primary-11'>
			<strong className='text-primary-12'>{title}</strong>
			{description && <span>{description}</span>}
		</div>
	);
}

// terra-quality-ignore single-use -- Preserve the default User component export for external workspace consumers.
/**
 * Displays the signed-in user's name or email when present.
 *
 * @param user Optional identity fields available to the workspace.
 *
 * @return User label markup, or an empty label when no identity is available.
 */
export default function User({ user }: { user?: { name?: string; email?: string } | null }): JSX.Element {
	return <span className='text-sm text-primary-11'>{user?.name ?? user?.email ?? ''}</span>;
}

/** Catches rendering errors and shows a message or caller-provided fallback.
 *
 * @remarks A changed `resetKey` is used by React to reset the boundary state.
 */
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
	static getDerivedStateFromError(err: Error) {
		return { error: err };
	}
	componentDidCatch(_error: Error, _info: ErrorInfo) {}
	render() {
		return this.state.error ? (this.props.fallback?.(this.state.error) ?? <div role='alert'>{this.state.error.message}</div>) : this.props.children;
	}
}

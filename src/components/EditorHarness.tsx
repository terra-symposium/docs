/**
 * src/components/EditorHarness.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { configureDocsHost } from '../lib/host-runtime.js';
import { useState } from 'react';

// COMPONENTS
import { TerraContentEditor } from './terra/editor/TerraContentEditor.js';

// TYPES
import type { DocsActionOperation, DocsHostAdapter } from '../lib/host.js';
import type { JSX } from 'react';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

// terra-quality-ignore single-use -- Keep the test host adapter identity stable across EditorHarness renders.
const host: DocsHostAdapter = {
	capabilities: {
		read: true,
		write: true,
		attachments: true,
		reorder: true,
		export: true,
		history: true,
		publish: true,
	},
	async invoke<T = unknown>(op: DocsActionOperation, input?: unknown): Promise<{ data?: T; error?: unknown }> {
		const mock = typeof window === 'undefined' ? undefined : window.__terraDocsMockResponses?.[op];
		if (mock?.error) return { error: new Error(mock.error) };
		const inputKey = input && typeof input === 'object' && 'source' in input ? String((input as { source: unknown }).source) : '';
		return { data: mapContent(inputKey ? (mock?.dataByInput?.[inputKey] ?? mock?.data) : mock?.data) as T };
	},
};

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 *
 * @param v
 *
 * @return
 */
function mapContent(v: unknown): unknown {
	if (Array.isArray(v)) return v.map(mapContent);
	if (!v || typeof v !== 'object') return v;
	const node = v as Record<string, unknown>;
	const type = node._type === 'terraBlock' ? 'block' : node._type;
	return Object.fromEntries(Object.entries(node).map(([k, e]) => [k, k === '_type' ? type : mapContent(e)]));
}

/**
 * Renders the library editor against a configurable in-browser host fixture.
 *
 * @return Editor surface used by the demo and browser tests.
 */
export default function EditorHarness(): JSX.Element {
	configureDocsHost(host);
	const [readOnly] = useState(() => (typeof window === 'undefined' ? false : (window.__terraContentOptions?.readOnly ?? false)));
	const [options] = useState(() => (typeof window === 'undefined' ? {} : (window.__terraContentOptions ?? {})));
	const [content, setContent] = useState(() => {
		const saved = options.persistKey ? sessionStorage.getItem(options.persistKey) : null;
		if (saved) return JSON.parse(saved) as unknown[];
		return (mapContent(typeof window === 'undefined' ? [] : (window.__terraContentFixture ?? [])) as unknown[]) ?? [];
	});
	return (
		<main className='terra-docs-workspace mx-auto min-h-svh max-w-5xl p-6'>
			<TerraContentEditor
				content={content}
				nested={options.nested ?? false}
				readOnly={readOnly}
				toolbar={options.toolbar ?? false}
				onChange={v => {
					setContent(v);
					if (options.persistKey) sessionStorage.setItem(options.persistKey, JSON.stringify(v));
				}}
			/>
			<pre data-testid='editor-output' className='sr-only'>
				{JSON.stringify(content)}
			</pre>
		</main>
	);
}
declare global {
	/** Browser globals used to configure the source-preserving editor fixture. */
	interface Window {
		__terraContentFixture?: unknown[];
		__terraContentOptions?: {
			nested?: boolean;
			persistKey?: string;
			readOnly?: boolean;
			toolbar?: boolean;
		};
		__terraDocsMockResponses?: Record<string, { data?: unknown; dataByInput?: Record<string, unknown>; error?: string }>;
	}
}

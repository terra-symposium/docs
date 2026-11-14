/**
 * test/browser/rich-blocks/embed.case.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { expect, test } from '@playwright/test';
import { openEditor } from '../support/editor.js';

// TYPES
import type { TerraContent } from '../support/editor.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

test(
	'embed.spec: Render title and size without remote requests',
	{ tag: '@viewport:xl', annotation: { type: 'viewport-reason', description: 'Rich-block interactions use the standard desktop editor layout.' } } as const,
	async ({ page: p }) => {
		await openEditor(p, [{ _key: 'embed-under-test', _type: 'embed', src: 'about:blank', title: 'Local example', width: '320px', height: '180px' }] satisfies TerraContent);
		const frame = p.getByTitle('Local example');
		await expect(frame).toHaveAttribute('src', 'about:blank');
		await expect(frame).toHaveCSS('width', '320px');
		await expect(frame).toHaveCSS('height', '180px');
	},
);

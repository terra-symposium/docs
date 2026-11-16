/**
 * test/browser/rich-blocks/raw.case.ts
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
	'raw.spec: Show read-only source',
	{ tag: '@viewport:xl', annotation: { type: 'viewport-reason', description: 'Rich-block interactions use the standard desktop editor layout.' } } as const,
	async ({ page: p }) => {
		await openEditor(p, [{ _key: 'raw-under-test', _type: 'raw', markdown: '# Terra source' }] satisfies TerraContent);
		const src = p.locator('[data-docs-code-block="view"]');
		await expect(src).toContainText('# Terra source');
		await expect(src.getByRole('button', { name: 'Copy' })).toBeVisible();
		await expect(p.getByTestId('editor-output')).toContainText('# Terra source');
	},
);

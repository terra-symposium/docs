/**
 * test/browser/rich-blocks/callout.case.ts
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

const XL_VIEWPORT_TEST = { tag: '@viewport:xl', annotation: { type: 'viewport-reason', description: 'Rich-block interactions use the standard desktop editor layout.' } } as const;
const calloutFixture = [
	{
		_key: 'callout-under-test',
		_type: 'callout',
		kind: 'example',
		title: 'Original example',
		content: [{ _key: 'callout-paragraph', _type: 'terraBlock', style: 'normal', markDefs: [], children: [{ _key: 'callout-text', _type: 'span', marks: [], text: 'Nested explanation' }] }],
	},
] satisfies TerraContent;
test('callout.spec: Render content and emit title edits', XL_VIEWPORT_TEST, async ({ page: p }) => {
	await openEditor(p, calloutFixture);
	const callout = p.locator('[data-terra-block="callout"]');
	await expect(callout).toHaveAttribute('data-docs-aside', 'example');
	await expect(callout).toContainText('Nested explanation');
	await callout.getByRole('textbox', { name: 'Callout title' }).fill('Updated example');
	await expect.poll(async () => JSON.parse((await p.getByTestId('editor-output').textContent()) ?? '[]')[0]?.title).toBe('Updated example');
	await expect(callout).toContainText('Nested explanation');
});
test('callout.spec: Emit nested content edits', XL_VIEWPORT_TEST, async ({ page: p }) => {
	await openEditor(p, calloutFixture);
	await p.locator('[data-terra-block="callout"]').getByRole('textbox', { name: 'Document editor' }).click();
	await p.keyboard.press('End');
	await p.keyboard.type(' updated');
	await expect.poll(async () => JSON.parse((await p.getByTestId('editor-output').textContent()) ?? '[]')[0]?.content?.[0]?.children?.[0]?.text).toBe('Nested explanation updated');
});

/**
 * test/browser/rich-blocks/image.case.ts
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
const imgFixture = [
	{
		_key: 'image-under-test',
		_type: 'docImage',
		url: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',
		alt: 'A one-pixel Terra image',
		title: 'Original caption',
		width: '120',
		height: '80',
	},
] satisfies TerraContent;
test('image.spec: Render metadata and emit field edits', XL_VIEWPORT_TEST, async ({ page: p }) => {
	await openEditor(p, imgFixture);
	const img = p.locator('[data-terra-block="docImage"]');
	await expect(img.getByRole('img', { name: 'A one-pixel Terra image' })).toBeVisible();
	await expect(img.getByText('Original caption')).toBeVisible();
	const updatedURL = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%222%22 height=%222%22/%3E';
	await img.getByRole('textbox', { name: 'Image URL' }).fill(updatedURL);
	await img.getByRole('textbox', { name: 'Alternative text' }).fill('Updated Terra image');
	await img.getByRole('textbox', { name: 'Caption' }).fill('Updated caption');
	await img.getByRole('textbox', { name: 'Width' }).fill('240');
	await img.getByRole('textbox', { name: 'Height' }).fill('160');
	await expect(img.getByRole('img', { name: 'Updated Terra image' })).toHaveAttribute('src', updatedURL);
	await expect(img.getByText('Updated caption')).toBeVisible();
	await expect
		.poll(async () => {
			const [block] = JSON.parse((await p.getByTestId('editor-output').textContent()) ?? '[]') as typeof imgFixture;
			return [block?.url, block?.alt, block?.title, block?.width, block?.height];
		})
		.toEqual([updatedURL, 'Updated Terra image', 'Updated caption', '240', '160']);
});
test('image.spec: Delete only the selected block', XL_VIEWPORT_TEST, async ({ page: p }) => {
	await openEditor(p, imgFixture);
	await p.locator('[data-terra-block="docImage"]').getByRole('button', { name: 'Delete image' }).click();
	await expect(p.locator('[data-terra-block="docImage"]')).toHaveCount(0);
	await expect(p.getByTestId('editor-output')).toContainText('[]');
});

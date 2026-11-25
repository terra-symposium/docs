/**
 * test/browser/support/editor.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// TYPES
import type { Page } from '@playwright/test';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** Portable Text blocks used as editor fixtures in browser tests. */
export type TerraContent = unknown[];

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Opens the editor harness with a fixture and waits for its editor surface.
 *
 * @param page - Playwright page containing the editor harness.
 * @param content - Portable Text fixture loaded before the page opens.
 * @param options - Optional editor behavior and mocked response settings.
 */
export async function openEditor(
	page: Page,
	content: TerraContent,
	options: { nested?: boolean; persistKey?: string; readOnly?: boolean; mockResponses?: Record<string, { data?: unknown; error?: string }>; toolbar?: boolean } = {},
): Promise<void> {
	await page.addInitScript(
		({ fixture: f, settings: s }) => {
			Object.assign(window, { __terraContentFixture: f, __terraContentOptions: s, __terraDocsMockResponses: s.mockResponses });
		},
		{ fixture: content, settings: options },
	);
	await page.goto('/editor-harness/', { waitUntil: 'domcontentloaded' });
	await page.locator('[data-terra-content-editor]').first().waitFor({ state: 'visible' });
}

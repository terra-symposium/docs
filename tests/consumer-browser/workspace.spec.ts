/**
 * test/consumer-browser/workspace.spec.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { expect, test } from '@playwright/test';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const XL_VIEWPORT_TEST = { tag: '@viewport:xl', annotation: { type: 'viewport-reason', description: 'The installed consumer contract uses the standard desktop workspace layout.' } } as const;
const consumerUrls = (process.env.DOCS_CONSUMER_URLS ?? '')
	.split(',')
	.map(v => v.trim())
	.filter(Boolean);
const targetUrls = consumerUrls.length ? consumerUrls : ['http://127.0.0.1:4336/workspace-demo/'];
for (const targetUrl of targetUrls) {
	test(
		`packaged Docs consumer mounts the public workspace with host-provided document data: ${targetUrl === 'http://127.0.0.1:4336/workspace-demo/' ? 'local packaged workspace' : new URL(targetUrl).host + new URL(targetUrl).pathname}`,
		XL_VIEWPORT_TEST,
		async ({ page: p }) => {
			const browserErrs: string[] = [];
			p.on('pageerror', error => browserErrs.push(`pageerror: ${error.message}`));
			p.on('console', message => {
				if (message.type() === 'error') browserErrs.push(`console: ${message.text()}`);
			});
			p.on('response', response => {
				if (response.status() >= 400) browserErrs.push(`HTTP ${response.status()}: ${response.url()}`);
			});
			await p.goto(targetUrl, { waitUntil: 'domcontentloaded' });
			await expect(p.locator('.terra-docs-workspace')).toBeVisible({ timeout: 30_000 });
			await expect(p.locator('.terra-docs-document-header')).toBeVisible();
			await expect(p.locator('[data-docs-toolbar-frame]')).toBeVisible();
			await expect(p.locator('#docs-title')).toBeVisible();
			await expect(p.locator('#docs-description')).toBeVisible();
			await expect(p.locator('[data-sidebar="sidebar"]').filter({ visible: true })).toHaveCount(1);
			await expect(p.getByRole('link', { name: 'Salesphere Docs' })).toBeVisible();
			await expect(p.getByRole('textbox', { name: 'Title' })).toHaveValue('Salesphere');
			expect(browserErrs, `Browser errors in ${targetUrl}`).toEqual([]);
		},
	);
}

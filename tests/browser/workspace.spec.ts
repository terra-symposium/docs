/**
 * test/browser/workspace.spec.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { expect, test } from '@playwright/test';

// TYPES
import type { Page } from '@playwright/test';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const XL_VIEWPORT_TEST = {
	tag: '@viewport:xl',
	annotation: {
		type: 'viewport-reason',
		description: 'Workspace actions need the full desktop navigation and document layout.',
	},
} as const;
const MOBILE_VIEWPORT_TEST = {
	tag: '@viewport:mobile',
	annotation: {
		type: 'viewport-reason',
		description: 'Verify the compact read-only workspace layout at the mobile breakpoint.',
	},
} as const;
const MD_VIEWPORT_TEST = {
	tag: '@viewport:md',
	annotation: {
		type: 'viewport-reason',
		description: 'Verify the desktop navigation at the tablet breakpoint.',
	},
} as const;
const browserErrs = new WeakMap<Page, string[]>();

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 *
 * @param page
 */
async function waitForWorkspaceReady(page: Page): Promise<void> {
	await expect(page.locator('[data-docs-shell]')).toHaveAttribute('data-loading', 'false', {
		timeout: 30_000,
	});
	await expect(page.getByRole('combobox', { name: 'Section' })).toBeVisible();
}
test.beforeEach(async ({ page: p }) => {
	const errs: string[] = [];
	browserErrs.set(p, errs);
	p.on('pageerror', error => errs.push(error.message));
	p.on('console', message => {
		if (message.type() === 'error') errs.push(message.text());
	});
	p.on('requestfailed', request => {
		errs.push(`Request failed: ${request.method()} ${request.url()} (${request.failure()?.errorText ?? 'unknown'})`);
	});
	await p.addInitScript(() => {
		const resetKey = 'terra-docs-fixture-initialized';
		if (sessionStorage.getItem(resetKey) === 'true') return;
		localStorage.removeItem('terra-docs-workspace-demo-v1');
		sessionStorage.setItem(resetKey, 'true');
	});
});
test.afterEach(async ({ page: p }) => {
	expect(browserErrs.get(p) ?? [], 'Unhandled browser errors').toEqual([]);
});
test('standalone Astro pages mount the extracted read-only workspace with their nested navigation', XL_VIEWPORT_TEST, async ({ page: p }) => {
	await p.goto('/');
	await expect(p.getByRole('link', { name: 'Terra Docs', exact: true }).first()).toBeVisible();
	await expect(p.getByRole('link', { name: 'Create an instance' })).toBeVisible();
	await expect(p.getByRole('combobox', { name: 'Section' })).toBeVisible();
	await expect(p.getByRole('combobox', { name: 'Mode' })).toBeVisible();
	await expect(p.getByRole('textbox', { name: 'Search pages' })).toHaveCount(0);
	await expect(p.getByRole('heading', { name: 'Install an instance' })).toBeVisible();
	await p.screenshot({ path: '/tmp/terra-docs-static-desktop.png', fullPage: true });
	await p.getByRole('combobox', { name: 'Section' }).click();
	await p.getByRole('option', { name: 'Configure' }).click();
	await expect(p.getByRole('link', { name: 'Storage providers' })).toBeVisible();
	await p.getByRole('link', { name: 'Storage providers' }).click();
	await expect(p).toHaveURL(/\/storage\//);
	await expect(p.getByRole('textbox', { name: 'Title' })).toHaveValue('Storage providers');
});
test('shared workspace keeps the Terra header, toolbar position, section navigation, and nested leaf actions', XL_VIEWPORT_TEST, async ({ page: p }) => {
	await p.goto('/workspace-demo/?section=overview&group=start-here&leaf=salesphere');
	await expect(p.getByRole('textbox', { name: 'Title' })).toHaveValue('Salesphere');
	await expect(p.getByRole('link', { name: 'Salesphere Docs' })).toBeVisible();
	await expect(p.getByRole('combobox', { name: 'Section' })).toBeVisible();
	await expect(p.getByRole('combobox', { name: 'Mode' })).toBeVisible();
	await expect(p.getByRole('textbox', { name: 'Search pages' })).toHaveCount(0);
	await expect(p.getByText(/Last modified/)).toBeVisible();
	await expect(p.getByRole('button', { name: 'Actions for section Overview' })).toBeVisible();
	await expect(p.getByRole('button', { name: 'Actions for group Start here' })).toBeVisible();
	const toolbarPosition = await p.evaluate(() => {
		const header = document.querySelector('.terra-docs-document-header');
		const toolbar = document.querySelector('[data-docs-toolbar-frame]');
		return {
			followsHeader: !!header && !!toolbar && Boolean(header.compareDocumentPosition(toolbar) & Node.DOCUMENT_POSITION_FOLLOWING),
			modeWidth: document.querySelector<HTMLElement>('[aria-label="Mode"]')?.getBoundingClientRect().width ?? 0,
		};
	});
	expect(toolbarPosition.followsHeader).toBeTruthy();
	expect(toolbarPosition.modeWidth).toBeGreaterThanOrEqual(145);
	expect(toolbarPosition.modeWidth).toBeLessThan(180);
	const hostPalette = await p.evaluate(() => {
		const host = document.querySelector('.workspace-demo-theme');
		const workspace = document.querySelector('.terra-docs-workspace');
		return {
			host: host ? getComputedStyle(host).getPropertyValue('--primary-9').trim() : '',
			workspace: workspace ? getComputedStyle(workspace).getPropertyValue('--primary-9').trim() : '',
		};
	});
	expect(hostPalette.host).not.toBe('');
	expect(hostPalette.workspace).toBe(hostPalette.host);
	await p.getByRole('combobox', { name: 'Section' }).click();
	await p.getByRole('option', { name: 'Configure' }).click();
	await expect(p.getByRole('link', { name: 'Local files' })).toBeVisible();
	await p.getByRole('combobox', { name: 'Section' }).click();
	await p.getByRole('option', { name: 'Overview' }).click();
	const leaf = p.getByRole('link', { name: 'Salesphere', exact: true });
	await p.getByRole('button', { name: 'Actions for section Overview' }).click();
	for (const name of ['Manage attachments', 'Download section', 'Rename section', 'Change color', 'Delete section']) {
		await expect(p.getByRole('menuitem', { name })).toBeVisible();
	}
	await p.keyboard.press('Escape');
	await p.getByRole('button', { name: 'Actions for group Start here' }).click();
	for (const name of ['Add page', 'Manage attachments', 'Download group', 'Rename group', 'Delete group']) {
		await expect(p.getByRole('menuitem', { name })).toBeVisible();
	}
	await p.getByRole('menuitem', { name: 'Manage attachments' }).click();
	await expect(p.getByRole('dialog')).toContainText('Manage Attachments');
	await p.keyboard.press('Escape');
	await p.getByRole('button', { name: 'Actions for group Start here' }).click();
	await expect(p.getByRole('menuitem', { name: 'Add page' })).toBeVisible();
	await p.keyboard.press('Escape');
	await leaf.click({ button: 'right' });
	const contextMenu = p.getByRole('menu');
	await expect(contextMenu).toBeVisible();
	await expect.poll(() => contextMenu.evaluate(menu => menu.closest('[data-radix-popper-content-wrapper]')?.parentElement === document.body)).toBe(true);
	await expect(p.getByRole('menuitem', { name: 'Files' })).toBeVisible();
	await expect(p.getByRole('menuitem', { name: 'Rename page' })).toBeVisible();
	await expect(p.getByRole('menuitem', { name: 'Delete page' })).toBeVisible();
	await expect(p.getByRole('menuitem', { name: 'Duplicate page' })).toBeVisible();
	await p.waitForTimeout(250);
	await p.screenshot({ path: '/tmp/terra-docs-leaf-context-menu.png', fullPage: true });
	await p.keyboard.press('Escape');
	await leaf.hover();
	await expect(p.getByRole('button', { name: 'Reorder item' }).last()).toBeVisible();
	await p.screenshot({ path: '/tmp/terra-docs-shared-desktop.png', fullPage: true });
});
for (const { name, details, display } of [
	{ name: 'mobile', details: MOBILE_VIEWPORT_TEST, display: 'flex' },
	{ name: 'tablet', details: MD_VIEWPORT_TEST, display: 'none' },
	{ name: 'desktop', details: XL_VIEWPORT_TEST, display: 'none' },
]) {
	test(`shared workspace shell uses the expected navigation at the ${name} viewport`, details, async ({ page: p }) => {
		await p.goto('/workspace-demo/');
		await expect(p.locator('[data-docs-shell]')).toHaveAttribute('data-loading', 'false', {
			timeout: 30_000,
		});
		await expect.poll(() => p.locator('.terra-docs-workspace header.md\\:hidden').evaluate(element => getComputedStyle(element).display)).toBe(display);
	});
}
test('view headings keep hover permalinks and the sidebar table of contents behavior', XL_VIEWPORT_TEST, async ({ page: p }) => {
	await p.goto('/workspace-demo/?section=overview&group=start-here&leaf=salesphere');
	await waitForWorkspaceReady(p);
	const heading = p.locator('[data-docs-view-root] h2').filter({ hasText: /^Start with the product$/ });
	await expect(heading).toBeVisible();
	const copy = heading.getByRole('button', { name: 'Copy link to Start with the product' });
	await expect(copy).toHaveCount(1);
	await heading.hover();
	await expect(copy.locator('.heading-anchor-icon')).toBeVisible();
	const origin = new URL(p.url()).origin;
	await p.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
	await copy.click();
	await expect.poll(() => p.evaluate(() => navigator.clipboard.readText())).toBe(`${origin}/workspace-demo/#start-with-the-product`);
	await p.evaluate(() => {
		const key = 'terra-docs-workspace-demo-v1';
		const state = JSON.parse(localStorage.getItem(key) ?? '{}');
		state.documents.salesphere.content.push({
			_key: 'heading-navigation-tail',
			_type: 'block',
			style: 'normal',
			markDefs: [],
			children: [
				{
					_key: 'heading-navigation-tail-text',
					_type: 'span',
					marks: [],
					text: 'Trailing content keeps enough page height to verify heading navigation. '.repeat(80),
				},
			],
		});
		localStorage.setItem(key, JSON.stringify(state));
	});
	await p.reload();
	await waitForWorkspaceReady(p);
	const toc = p.getByRole('navigation', { name: 'Table of contents' });
	await expect(toc).toBeVisible();
	const target = toc.getByRole('link', { name: 'Jump to Find the implementation' });
	await expect(target).toBeVisible();
	await target.click();
	await expect(p).toHaveURL(/#find-the-implementation$/);
	await expect
		.poll(
			async () =>
				(
					await p
						.locator('[data-docs-view-root] h2')
						.filter({ hasText: /^Find the implementation$/ })
						.boundingBox()
				)?.y ?? Number.POSITIVE_INFINITY,
		)
		.toBeLessThan(180);
});
test('shared workspace performs deletion and opens attachment management from its original controls', XL_VIEWPORT_TEST, async ({ page: p }) => {
	await p.goto('/workspace-demo/');
	await expect(p.getByRole('textbox', { name: 'Title' })).toHaveValue('Salesphere');
	await expect(p.locator('[data-docs-shell]')).toHaveAttribute('data-docs-mode', 'view');
	await p.getByRole('link', { name: 'Runtime map', exact: true }).click({ button: 'right' });
	await expect(p.getByRole('menuitem', { name: 'Delete page' })).toBeVisible();
	await p.getByRole('menuitem', { name: 'Delete page' }).click();
	await expect(p.getByRole('dialog')).toContainText('Delete page?');
	await p.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
	await expect
		.poll(() => p.evaluate(() => (window as Window & { __terraDocsActionCalls?: Array<{ operation: string }> }).__terraDocsActionCalls?.some(call => call.operation === 'write.doc.rm')))
		.toBe(true);
	await expect(p.getByRole('link', { name: 'Runtime map', exact: true })).toHaveCount(0);
	await expect(p.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue('Salesphere');
	await p.getByRole('combobox', { name: 'Mode' }).click();
	await p.getByRole('option', { name: 'Attachments' }).click();
	await expect(p.locator('[data-docs-attachments]')).toBeVisible();
	await expect(p.getByText('Product brief.pdf')).toBeVisible();
	await p.locator('[data-docs-attachments]').evaluate(element => element.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, button: 2 })));
	await expect(p.getByRole('dialog')).toContainText('Add Attachment');
	await expect(p.getByRole('button', { name: 'Add Document attachment' })).toBeVisible();
});
test('tree create, rename, duplicate, download, and delete persist through the host adapter', XL_VIEWPORT_TEST, async ({ page: p }) => {
	await p.goto('/workspace-demo/', { waitUntil: 'commit' });
	await expect(p.getByRole('textbox', { name: 'Title' })).toHaveValue('Salesphere');
	await p.getByRole('button', { name: 'Actions for group Start here' }).click();
	await p.getByRole('menuitem', { name: 'Add page', exact: true }).click();
	const createDialog = p.getByRole('dialog', { name: 'Add Page' });
	await createDialog.getByRole('textbox', { name: 'Page title' }).fill('Regression fixture page');
	await createDialog.getByRole('button', { name: 'Save', exact: true }).click();
	const created = p.getByRole('link', { name: 'Regression fixture page', exact: true });
	await expect(created).toBeVisible();
	await created.click({ button: 'right' });
	await p.getByRole('menuitem', { name: 'Rename page', exact: true }).click();
	const renameDialog = p.getByRole('dialog', { name: 'Rename page' });
	await expect(renameDialog).toBeVisible();
	await renameDialog.getByRole('textbox').fill('Regression page renamed');
	await renameDialog.getByRole('button', { name: 'Save', exact: true }).click();
	const renamed = p.getByRole('link', { name: 'Regression page renamed', exact: true });
	await expect(renamed).toBeVisible();
	await renamed.click({ button: 'right' });
	await p.getByRole('menuitem', { name: 'Duplicate page', exact: true }).hover();
	await p.getByRole('menuitem', { name: 'By content (Duplicate leaf)', exact: true }).click();
	const duplicateDialog = p.getByRole('dialog', { name: 'Duplicate by Content' });
	await duplicateDialog.getByRole('textbox', { name: 'New page name' }).fill('Regression page copy');
	await duplicateDialog.getByRole('button', { name: 'Save', exact: true }).click();
	const duplicate = p.getByRole('link', { name: 'Regression page copy', exact: true });
	await expect(duplicate).toBeVisible();
	await duplicate.click({ button: 'right' });
	await p.getByRole('menuitem', { name: 'Download page', exact: true }).click();
	const exportDialog = p.getByRole('dialog');
	await expect(exportDialog).toBeVisible();
	// terra-quality-ignore single-use -- Subscribe to the download event before clicking so a fast download cannot be missed.
	const download = p.waitForEvent('download');
	await exportDialog.getByRole('button', { name: 'Download ZIP', exact: true }).click();
	expect((await download).suggestedFilename()).toMatch(/\.zip$/i);
	await duplicate.click({ button: 'right' });
	await p.getByRole('menuitem', { name: 'Delete page', exact: true }).click();
	await p.getByRole('dialog', { name: 'Delete page?' }).getByRole('button', { name: 'Delete', exact: true }).click();
	await expect(duplicate).toHaveCount(0);
	const storedBeforeReload = await p.evaluate(() => JSON.parse(localStorage.getItem('terra-docs-workspace-demo-v1') ?? '{}'));
	expect(Object.values(storedBeforeReload.documents).map((item: { title: string }) => item.title)).toContain('Regression page renamed');
	expect(Object.values(storedBeforeReload.documents).map((item: { title: string }) => item.title)).not.toContain('Regression page copy');
	await p.goto('/workspace-demo/', { waitUntil: 'commit' });
	await expect(p.getByRole('link', { name: 'Regression page renamed', exact: true })).toBeVisible();
	await expect(p.getByRole('link', { name: 'Regression page copy', exact: true })).toHaveCount(0);
});
test('group create, rename, reorder, and delete use the shared sidebar actions', XL_VIEWPORT_TEST, async ({ page: p }) => {
	await p.goto('/workspace-demo/', { waitUntil: 'commit' });
	await p.getByRole('combobox', { name: 'Mode' }).click();
	await p.getByRole('option', { name: 'Edit' }).click();
	await p.getByRole('combobox', { name: 'Section' }).click();
	await p.getByRole('option', { name: 'Add section', exact: true }).click();
	const sectionDialog = p.getByRole('dialog', { name: 'Add Section' });
	await sectionDialog.getByRole('textbox', { name: 'Section name' }).fill('Group lifecycle');
	await sectionDialog.getByRole('button', { name: 'Save', exact: true }).click();
	await expect
		.poll(async () =>
			p.evaluate(() => {
				return JSON.parse(localStorage.getItem('terra-docs-workspace-demo-v1') ?? '{}').tree.some((node: { title?: string }) => node.title === 'Group lifecycle');
			}),
		)
		.toBe(true);
	await p.reload({ waitUntil: 'commit' });
	await p.getByRole('combobox', { name: 'Section' }).click();
	await p.getByRole('option', { name: 'Group lifecycle', exact: true }).click();
	const sidebarContent = p.locator('[data-sidebar="content"]').filter({ visible: true }).last();
	await expect(sidebarContent).toBeVisible();
	await sidebarContent.dispatchEvent('contextmenu', { button: 2, clientX: 16, clientY: 160 });
	const addGroup = p.getByRole('menuitem', { name: 'Add group', exact: true });
	await expect(addGroup).toBeVisible();
	await addGroup.click();
	const createDialog = p.getByRole('dialog', { name: 'Add Group' });
	await createDialog.getByRole('textbox', { name: 'Group name' }).fill('Regression group');
	await createDialog.getByRole('button', { name: 'Save', exact: true }).click();
	const sectionId = await p.evaluate(() => {
		return JSON.parse(localStorage.getItem('terra-docs-workspace-demo-v1') ?? '{}').tree.find((node: { title?: string }) => node.title === 'Group lifecycle').origName;
	});
	const group = p.locator(`[data-docs-drop^="branch:${sectionId}/"]`).filter({ hasText: 'Regression group' });
	await expect(group).toBeVisible();
	await expect(p.locator('[data-docs-drop^="leaf:"]').filter({ hasText: 'Untitled' })).toBeVisible();
	await group.click({ button: 'right' });
	await p.getByRole('menuitem', { name: 'Rename group', exact: true }).click();
	const renameDialog = p.getByRole('dialog', { name: 'Rename Group' });
	await renameDialog.getByRole('textbox', { name: 'Group name' }).fill('Regression renamed');
	await renameDialog.getByRole('button', { name: 'Save', exact: true }).click();
	const renamedGroup = p.locator(`[data-docs-drop^="branch:${sectionId}/"]`).filter({ hasText: 'Regression renamed' });
	await expect(renamedGroup).toBeVisible();
	// terra-quality-ignore single-use -- Read the persisted target ID before starting the drag interaction.
	const generalGroupId = await p.evaluate(() => {
		return JSON.parse(localStorage.getItem('terra-docs-workspace-demo-v1') ?? '{}')
			.tree.find((node: { title?: string }) => node.title === 'Group lifecycle')
			.children.find((node: { title?: string }) => node.title === 'General').origName;
	});
	await renamedGroup.getByRole('button', { name: 'Reorder item' }).dragTo(p.locator(`[data-docs-drop="branch:${sectionId}/${generalGroupId}"]`), {
		targetPosition: { x: 8, y: 1 },
	});
	await expect
		.poll(async () =>
			p.evaluate(() => {
				return JSON.parse(localStorage.getItem('terra-docs-workspace-demo-v1') ?? '{}')
					.tree.find((node: { title?: string }) => node.title === 'Group lifecycle')
					.children.map((node: { title?: string }) => node.title);
			}),
		)
		.toEqual(['Regression renamed', 'General']);
	await expect(renamedGroup).toBeVisible();
	await p.locator(`[data-docs-drop^="branch:${sectionId}/"]`).filter({ hasText: 'Regression renamed' }).click({ button: 'right' });
	await p.getByRole('menuitem', { name: 'Delete group', exact: true }).click();
	await p
		.getByRole('dialog', { name: /Delete group\?/i })
		.getByRole('button', { name: 'Delete', exact: true })
		.click();
	await expect(p.locator(`[data-docs-drop^="branch:${sectionId}/"]`).filter({ hasText: 'Regression renamed' })).toHaveCount(0);
	const remainingGroups = await p.evaluate(id => {
		return JSON.parse(localStorage.getItem('terra-docs-workspace-demo-v1') ?? '{}').tree.find((node: { origName?: string }) => node.origName === id).children;
	}, sectionId);
	expect(remainingGroups.map((node: { title?: string }) => node.title)).toEqual(['General']);
	expect(remainingGroups[0].children.map((node: { title?: string }) => node.title)).toEqual(['Untitled']);
});
test('leaf reorder is stored and appears in the same order after reload', XL_VIEWPORT_TEST, async ({ page: p }) => {
	await p.goto('/workspace-demo/');
	await p
		.locator('[data-docs-drop]')
		.filter({ hasText: 'Salesphere' })
		.getByRole('button', { name: 'Reorder item' })
		.dragTo(p.locator('[data-docs-drop]').filter({ hasText: 'Runtime map' }));
	await expect
		.poll(() =>
			p.evaluate(() => {
				return JSON.parse(localStorage.getItem('terra-docs-workspace-demo-v1') ?? '{}').tree[0].children[0].children.map((node: { origName: string }) => node.origName);
			}),
		)
		.toEqual(['runtime-map', 'salesphere']);
	await p.reload();
	await expect
		.poll(async () => p.locator('[data-docs-drop^="leaf:"] a').allTextContents(), {
			timeout: 10_000,
		})
		.toEqual(['Runtime map', 'Salesphere']);
});
test('attachment upload, open, download, and deletion persist across reloads', XL_VIEWPORT_TEST, async ({ page: p }) => {
	await p.goto('/workspace-demo/');
	await p.getByRole('combobox', { name: 'Mode' }).click();
	await p.getByRole('option', { name: 'Attachments' }).click();
	await expect(p.locator('[data-docs-attachments]')).toHaveAttribute('data-loading', 'false');
	await expect(p.locator('[data-docs-shell]')).toHaveAttribute('data-loading', 'false');
	const filename = 'workspace-fixture-attachment.bin';
	await p.getByTestId('docs-attachment-upload').setInputFiles({
		name: filename,
		mimeType: 'application/octet-stream',
		buffer: Buffer.from('Persistent attachment fixture content.'),
	});
	await expect
		.poll(() => p.evaluate(() => (window as Window & { __terraDocsActionCalls?: Array<{ operation: string }> }).__terraDocsActionCalls?.some(call => call.operation === 'write.asset.upload')))
		.toBe(true);
	await expect(p.getByText(filename, { exact: true })).toBeVisible();
	await p.getByRole('button', { name: `Attachment ${filename}`, exact: true }).click();
	// terra-quality-ignore single-use -- Subscribe before clicking the asset action to catch an immediate download event.
	const download = p.waitForEvent('download');
	await p.getByRole('button', { name: 'Download Asset', exact: true }).click();
	expect((await download).suggestedFilename()).toBe(filename);
	await p.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
	await p.getByRole('button', { name: `Attachment ${filename}`, exact: true }).click({ button: 'right' });
	const attachmentMenu = p.locator('[data-docs-attachment-menu]');
	await expect(attachmentMenu.getByRole('menuitem', { name: 'Delete', exact: true })).toBeVisible();
	const menuBounds = await attachmentMenu.boundingBox();
	const viewport = p.viewportSize();
	expect(menuBounds).not.toBeNull();
	expect(viewport).not.toBeNull();
	expect(menuBounds!.x).toBeGreaterThanOrEqual(0);
	expect(menuBounds!.y).toBeGreaterThanOrEqual(0);
	expect(menuBounds!.x + menuBounds!.width).toBeLessThanOrEqual(viewport!.width);
	expect(menuBounds!.y + menuBounds!.height).toBeLessThanOrEqual(viewport!.height);
	p.once('dialog', dialog => dialog.accept());
	await attachmentMenu.getByRole('menuitem', { name: 'Delete', exact: true }).click();
	await expect(p.getByText(filename, { exact: true })).toHaveCount(0);
	const stateWithoutAttachment = await p.evaluate(() => JSON.parse(localStorage.getItem('terra-docs-workspace-demo-v1') ?? '{}'));
	expect(stateWithoutAttachment.documents.salesphere.attachments).not.toContainEqual(expect.objectContaining({ name: filename }));
	expect(Object.values(stateWithoutAttachment.assets).map((asset: { name: string }) => asset.name)).not.toContain(filename);
	await p.goto('/workspace-demo/?section=overview&group=start-here&leaf=salesphere');
	await p.getByRole('combobox', { name: 'Mode' }).click();
	await p.getByRole('option', { name: 'Attachments' }).click();
	await expect(p.getByText(filename, { exact: true })).toHaveCount(0);
});
test('visual edits save, reload, and restore a prior revision through history', XL_VIEWPORT_TEST, async ({ page: p }) => {
	await p.goto('/workspace-demo/?section=overview&group=start-here&leaf=salesphere&mode=edit', {
		waitUntil: 'commit',
	});
	const title = p.getByRole('textbox', { name: 'Title', exact: true });
	await title.fill('Salesphere saved title');
	await p.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(title).toHaveValue('Salesphere saved title');
	const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('terra-docs-workspace-demo-v1') ?? '{}'));
	expect(saved.documents.salesphere.title).toBe('Salesphere saved title');
	expect(saved.documents.salesphere.versions).toHaveLength(1);
	await p.reload({ waitUntil: 'commit' });
	await expect(p.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue('Salesphere saved title');
	await p.getByRole('button', { name: 'Version History' }).click();
	const history = p.getByRole('dialog', { name: 'Version History' });
	await expect(history).toBeVisible();
	await history.getByRole('combobox', { name: 'Select a version...' }).click();
	await p.getByRole('option', { name: /Salesphere \(/ }).click();
	await history.getByRole('button', { name: 'Restore', exact: true }).click();
	await expect(p.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue('Salesphere');
	await p.getByRole('button', { name: 'Save', exact: true }).click();
	await p.reload({ waitUntil: 'commit' });
	await expect(p.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue('Salesphere');
});
test('deleting the active leaf switches to the next available page', XL_VIEWPORT_TEST, async ({ page: p }) => {
	await p.goto('/workspace-demo/');
	await expect(p.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue('Salesphere');
	await p.getByRole('link', { name: 'Salesphere', exact: true }).click({ button: 'right' });
	await p.getByRole('menuitem', { name: 'Delete page', exact: true }).click();
	await p.getByRole('dialog', { name: 'Delete page?' }).getByRole('button', { name: 'Delete' }).click();
	await expect(p.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue('Runtime map');
	await expect(p.locator('[data-docs-view-root] h2').filter({ hasText: 'Runtime map' })).toBeVisible();
	await expect(p.getByRole('combobox', { name: 'Mode' })).toBeVisible();
});
test('section creation is retained, and menus remain keyboard accessible and portaled', XL_VIEWPORT_TEST, async ({ page: p }) => {
	await p.goto('/workspace-demo/');
	await p.getByRole('combobox', { name: 'Mode' }).click();
	await expect(p.getByRole('option', { name: 'Edit' })).toBeVisible();
	await p.keyboard.press('Escape');
	const section = p.getByRole('combobox', { name: 'Section' });
	await section.focus();
	await p.keyboard.press('Enter');
	await expect(p.getByRole('listbox')).toBeVisible();
	await expect.poll(() => p.getByRole('listbox').evaluate(listbox => listbox.closest('[data-radix-popper-content-wrapper]')?.parentElement === document.body)).toBe(true);
	await p.keyboard.press('Escape');
	await section.click();
	await p.getByRole('option', { name: 'Add section', exact: true }).click();
	const dialog = p.getByRole('dialog', { name: 'Add Section' });
	await dialog.getByRole('textbox', { name: 'Section name' }).fill('Created from browser');
	await dialog.getByRole('button', { name: 'Save', exact: true }).click();
	await expect
		.poll(async () =>
			p.evaluate(() => {
				return JSON.parse(localStorage.getItem('terra-docs-workspace-demo-v1') ?? '{}').tree.some((node: { title?: string }) => node.title === 'Created from browser');
			}),
		)
		.toBe(true);
	await p.goto('/workspace-demo/');
	await expect(p.getByRole('combobox', { name: 'Section' })).toBeVisible();
	await p.getByRole('combobox', { name: 'Section' }).click();
	await expect(p.getByRole('option', { name: 'Created from browser' })).toBeVisible();
});
test('section rename, hue, and deletion actions persist through the host adapter', XL_VIEWPORT_TEST, async ({ page: p }) => {
	await p.goto('/workspace-demo/', { waitUntil: 'commit' });
	await waitForWorkspaceReady(p);
	await p.getByRole('combobox', { name: 'Section' }).click();
	await p.getByRole('option', { name: 'Add section', exact: true }).click();
	const createDialog = p.getByRole('dialog', { name: 'Add Section' });
	await createDialog.getByRole('textbox', { name: 'Section name' }).fill('Section lifecycle');
	await createDialog.getByRole('button', { name: 'Save', exact: true }).click();
	await p.reload({ waitUntil: 'commit' });
	await waitForWorkspaceReady(p);
	await p.getByRole('combobox', { name: 'Section' }).click();
	await p.getByRole('option', { name: 'Section lifecycle', exact: true }).click();
	let sectionActions = p.getByRole('button', { name: 'Actions for section Section lifecycle' });
	await expect(sectionActions).toBeVisible();
	await sectionActions.click();
	await p.getByRole('menuitem', { name: 'Rename section', exact: true }).click();
	const renameDialog = p.getByRole('dialog', { name: 'Rename Section' });
	await renameDialog.getByRole('textbox', { name: 'Section name' }).fill('Section lifecycle renamed');
	await renameDialog.getByRole('button', { name: 'Save', exact: true }).click();
	sectionActions = p.getByRole('button', {
		name: 'Actions for section Section lifecycle renamed',
	});
	await expect(sectionActions).toBeVisible();
	await sectionActions.click();
	await p.getByRole('menuitem', { name: 'Change color', exact: true }).click();
	const colorDialog = p.getByRole('dialog', { name: 'Section Color' });
	const hue = colorDialog.getByRole('slider');
	await hue.focus();
	await p.keyboard.press('ArrowRight');
	// terra-quality-ignore single-use -- Capture the slider value before saving because the dialog closes afterward.
	const hueValue = Number(await hue.getAttribute('aria-valuenow'));
	await p.clock.install();
	await colorDialog.getByRole('button', { name: 'Save', exact: true }).click();
	await p.clock.runFor(2500);
	await expect
		.poll(
			async () => {
				return (await p.evaluate(() => JSON.parse(localStorage.getItem('terra-docs-workspace-demo-v1') ?? '{}'))).tree.find((node: { title?: string }) => node.title === 'Section lifecycle renamed')
					?.hue;
			},
			{ intervals: [25, 75, 150], timeout: 1500 },
		)
		.toBe(hueValue);
	await sectionActions.click();
	await p.getByRole('menuitem', { name: 'Delete section', exact: true }).click();
	await p
		.getByRole('dialog', { name: /Delete section\?/i })
		.getByRole('button', { name: 'Delete', exact: true })
		.click();
	await expect(sectionActions).toHaveCount(0);
	await expect
		.poll(
			async () =>
				p.evaluate(() => {
					const state = JSON.parse(localStorage.getItem('terra-docs-workspace-demo-v1') ?? '{}');
					return {
						sectionExists: state.tree.some((node: { title?: string }) => node.title === 'Section lifecycle renamed'),
						untitledDocuments: Object.values(state.documents).filter((document: { title: string }) => document.title === 'Untitled').length,
					};
				}),
			{ intervals: [25, 75, 150], timeout: 1500 },
		)
		.toEqual({ sectionExists: false, untitledDocuments: 0 });
});
test('remote editors get visual authoring controls while Code remains document content, not a mode', XL_VIEWPORT_TEST, async ({ page: p }) => {
	await p.goto('/workspace-demo/');
	await p.getByRole('combobox', { name: 'Mode' }).click();
	await expect(p.getByRole('option', { name: 'Edit' })).toBeVisible();
	await expect(p.getByRole('option', { name: 'Code', exact: true })).toHaveCount(0);
	await p.getByRole('option', { name: 'Edit' }).click();
	await expect(p.locator('[data-docs-shell]')).toHaveAttribute('data-docs-mode', 'edit');
	await expect(p.getByRole('button', { name: 'Save' })).toBeVisible();
	await expect(p.getByRole('combobox', { name: 'Block type' })).toBeVisible();
	await expect(p.getByText('e.replace is not a function')).toHaveCount(0);
	await p.screenshot({ path: '/tmp/terra-docs-edit-desktop.png', fullPage: true });
	await p.getByRole('combobox', { name: 'Block type' }).click();
	await expect(p.getByRole('option', { name: 'Insert accordion' })).toBeVisible();
	await expect(p.getByRole('option', { name: 'Insert tabs' })).toBeVisible();
	await expect(p.getByRole('option', { name: 'Insert table' })).toBeVisible();
});
test('local read-only workspaces expose View and Attachments, with leaf files in the Attachments mode', MOBILE_VIEWPORT_TEST, async ({ page: p }) => {
	await p.goto('/workspace-readonly/');
	await p.getByRole('combobox', { name: 'Mode' }).click();
	await expect(p.getByRole('option', { name: 'Edit' })).toHaveCount(0);
	await expect(p.getByRole('option', { name: 'Code', exact: true })).toHaveCount(0);
	await p.getByRole('option', { name: 'Attachments' }).click();
	await expect(p.locator('[data-docs-shell]')).toHaveAttribute('data-docs-mode', 'attachments');
	await expect(p.getByText('Product brief.pdf')).toBeVisible();
	expect(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
	await p.screenshot({ path: '/tmp/terra-docs-shared-mobile.png', fullPage: true });
});
test('host branding stays in the sidebar while leaf metadata stays in the document header', XL_VIEWPORT_TEST, async ({ page: p }) => {
	await p.goto('/workspace-readonly/');
	await expect(p.getByRole('link', { name: 'Salesphere Docs' })).toBeVisible();
	const header = p.locator('.terra-docs-document-header');
	await expect(header).toContainText('Salesphere');
	await expect(header).toContainText('A page level description for the Salesphere overview.');
	await expect(header).not.toContainText('Product and engineering documentation.');
	const description = p.getByRole('textbox', { name: 'Description' });
	await expect(description).toBeDisabled();
	await expect(description).toHaveValue('A page level description for the Salesphere overview.');
	await expect(description).not.toHaveAttribute('class', /min-h-6/);
	await expect(p.getByRole('textbox', { name: 'Search pages' })).toHaveCount(0);
});

import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { basePathRemarkPlugin } from '../site/base-path-remark-plugin.mjs';
import { astroPackageExportAliases, packageDependencyAliases, packageExportAliases, sharedReactAliases, stylingDependencyAliases } from '../site/config/astro.config.mjs';
import { docsContentPlugin, publicRoute } from '../site/docs-content-plugin.mjs';

test('Docs site aliases resolve from the owning package installations', () => {
	assert.ok(packageExportAliases().some(alias => alias.find.test('@terra-symposium/docs/astro')));
	assert.ok(astroPackageExportAliases().some(alias => alias.find.test('astro/config')));
	assert.ok(packageDependencyAliases().some(alias => alias.find.test('@astrojs/mdx')));
	assert.ok(stylingDependencyAliases().some(alias => alias.find.test('@radix-ui/react-popover')));
	assert.ok(sharedReactAliases().some(alias => alias.find.test('react-dom/server')));
});

test('Docs site canonicalizes Markdown routes and adds deployment prefixes', () => {
	assert.equal(publicRoute('/workspace/docs/guide/index.md', '/workspace/docs', '/handbook/'), '/handbook/guide/');
	const tree = {
		type: 'root',
		children: [
			{ type: 'link', url: '/guide/' },
			{ type: 'html', value: '<img src="/diagram.svg">' },
		],
	};
	basePathRemarkPlugin({ base: '/handbook/' })(tree);
	assert.equal(tree.children[0].url, '/handbook/guide/');
	assert.equal(tree.children[1].value, '<img src="/handbook/diagram.svg">');
});

test('Docs site rewrites Markdown routes and assets without changing code examples', async () => {
	const root = await mkdtemp(join(tmpdir(), 'terra-docs-site-'));
	try {
		const docsRoot = join(root, 'docs');
		const srcPath = join(docsRoot, 'guides', 'start.md');
		await mkdir(join(docsRoot, 'guides'), { recursive: true });
		await mkdir(join(docsRoot, 'images'), { recursive: true });
		await writeFile(join(docsRoot, 'guide.md'), '# Guide\n');
		await writeFile(join(docsRoot, 'images', 'diagram.svg'), '<svg />');
		const src = ['[Guide](../guide.md?q=1#section)', '![Diagram](../images/diagram.svg)', '<img src="../images/diagram.svg">', '```md', '[literal](../guide.md)', '```'].join('\n');
		await writeFile(srcPath, src);
		const plugin = docsContentPlugin({ root, base: '/handbook/' });
		assert.equal(plugin.name, 'docs-content-assets');
		const result = plugin.transform(src, srcPath);

		assert.equal(typeof result, 'string');
		assert.match(result, /\[Guide\]\(\/handbook\/guide\/\?q=1#section\)/);
		assert.match(result, /!\[Diagram\]\(\/handbook\/_docs\/assets\/images\/diagram\.svg\)/);
		assert.match(result, /src="\/handbook\/_docs\/assets\/images\/diagram\.svg"/);
		assert.match(result, /\[literal\]\(\.\.\/guide\.md\)/);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import console from 'node:console';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cache = resolve(root, 'dist/cache');
const jsonPath = resolve(cache, 'typedoc-blocks.json');
const outputPath = resolve(cache, 'blocks-api.json');
const sourcePaths = [
  'site/src/lib/catalog.ts',
  'src/lib/markdown-model.ts',
  'src/components/MarkdownContent.tsx',
  'src/components/blocks.tsx',
  'src/components/terra/editor/docs/_CodeBlock.tsx',
  'src/components/terra/editor/docs/_Table.tsx',
  'src/components/terra/editor/docs/_Nodes.tsx',
  'src/components/terra/editor/docs/_Callout.tsx',
  'src/components/terra/editor/docs/_DocsImage.tsx',
  'src/components/terra/editor/docs/_Math.tsx',
  'src/components/quiz.tsx',
  'src/components/terra/editor/docs/_TsDocs.tsx',
].map((path) => resolve(root, path));
const require = createRequire(import.meta.url);
const typedocManifestPath = require.resolve('typedoc/package.json');
const typedocRoot = dirname(typedocManifestPath);
const typedocCli = resolve(typedocRoot, 'bin/typedoc');

await mkdir(cache, { recursive: true });
execFileSync(
  process.execPath,
  [
    typedocCli,
    '--tsconfig',
    'config/typedoc.tsconfig.json',
    '--skipErrorChecking',
    '--logLevel',
    'Error',
    '--json',
    jsonPath,
    ...sourcePaths,
  ],
  { cwd: root, stdio: 'inherit' },
);

const project = JSON.parse(await readFile(jsonPath, 'utf8'));
const orderedIds = [
  'frontmatter',
  'prose',
  'lists-and-links',
  'code',
  'tables',
  'diagrams',
  'tabs',
  'accordions',
  'asides',
  'images',
  'math',
  'embeds-and-custom-blocks',
  'quiz',
  'typescript-docs',
];

function walk(reflection, found = []) {
  if (reflection.comment?.blockTags?.some((tag) => tag.tag === '@docsId')) found.push(reflection);
  for (const child of reflection.children ?? []) walk(child, found);
  for (const signature of reflection.signatures ?? []) walk(signature, found);
  return found;
}

function tags(reflection, name) {
  return (reflection.comment?.blockTags ?? [])
    .filter((tag) => tag.tag === `@${name}`)
    .map((tag) => renderParts(tag.content ?? []).trim())
    .filter(Boolean);
}

function renderParts(parts) {
  return parts
    .map((part) => part.text ?? '')
    .join('')
    .replace(/\r\n/g, '\n')
    .trim();
}

function requiredTag(reflection, name, id) {
  const values = tags(reflection, name);
  if (values.length === 0) throw new Error(`Block "${id}" is missing required @${name} content.`);
  return values;
}

const reflections = walk(project);
const byId = new Map();
for (const reflection of reflections) {
  const ids = tags(reflection, 'docsId');
  for (const id of ids) {
    if (!id) throw new Error(`TypeDoc reflection "${reflection.name}" has an empty @docsId.`);
    if (byId.has(id)) throw new Error(`Duplicate block ID "${id}" in source TSDoc.`);
    byId.set(id, reflection);
  }
}

const missingIds = orderedIds.filter((id) => !byId.has(id));
const unknownIds = [...byId.keys()].filter((id) => !orderedIds.includes(id));
if (missingIds.length || unknownIds.length)
  throw new Error(
    `Block TSDoc IDs do not match the consolidated reference. Missing: ${missingIds.join(', ') || 'none'}. Unknown: ${unknownIds.join(', ') || 'none'}.`,
  );

const blocks = orderedIds.map((id) => {
  const reflection = byId.get(id);
  const [useWhen] = requiredTag(reflection, 'docsUseWhen', id);
  const [syntax] = requiredTag(reflection, 'docsSyntax', id);
  const [renderedExample] = requiredTag(reflection, 'docsRenderedExample', id);
  const [renderKind = 'markdown'] = tags(reflection, 'docsRenderKind');
  const editorImages = tags(reflection, 'docsEditorImage').map((value) => {
    const [src, ...alt] = value.split('|');
    if (!src?.trim() || !alt.join('|').trim())
      throw new Error(`Block "${id}" has an invalid @docsEditorImage; use "path | alt text".`);
    return { src: src.trim(), alt: alt.join('|').trim() };
  });
  const constraints = tags(reflection, 'docsConstraint');
  const dos = tags(reflection, 'docsDo');
  const donts = tags(reflection, 'docsDont');
  const tips = tags(reflection, 'docsTip');
  const insertionSteps = tags(reflection, 'docsInsertionStep');
  const summary = renderParts(reflection.comment?.summary ?? []);
  if (!summary) throw new Error(`Block "${id}" is missing its source TSDoc summary.`);
  if (!constraints.length || !dos.length || !donts.length || !tips.length)
    throw new Error(
      `Block "${id}" needs @docsConstraint, @docsDo, @docsDont, and @docsTip guidance.`,
    );
  if (insertionSteps.length < 2)
    throw new Error(`Block "${id}" needs at least two ordered @docsInsertionStep entries.`);
  if (!renderedExample) throw new Error(`Block "${id}" is missing @docsRenderedExample.`);
  if (!syntax.trim()) throw new Error(`Block "${id}" @docsSyntax must include a source example.`);
  if (!['markdown', 'nodes', 'embed', 'quiz', 'tsdocs'].includes(renderKind))
    throw new Error(`Block "${id}" has invalid @docsRenderKind "${renderKind}".`);
  const code = /```/.test(syntax) ? syntax : `\`\`\`mdx\n${syntax}\n\`\`\``;
  const fenceLanguages = [...code.matchAll(/(?:^|\n)```([A-Za-z][A-Za-z0-9_-]*)/g)].map(
    (match) => match[1],
  );
  if (fenceLanguages.some((language) => language !== 'mdx'))
    throw new Error(`Block "${id}" source examples must use the mdx fence language.`);
  return {
    id,
    symbol: reflection.name,
    useWhen,
    dos: [...dos, ...tips],
    donts: [...constraints, ...donts],
    insertionSteps,
    code,
    renderedExample,
    renderKind,
    editorImages,
  };
});

const byIdOutput = Object.fromEntries(blocks.map(({ id, ...entry }) => [id, entry]));
await writeFile(outputPath, `${JSON.stringify(byIdOutput, null, 2)}\n`);
console.log(`Generated ${outputPath} from ${blocks.length} source TSDoc entries.`);

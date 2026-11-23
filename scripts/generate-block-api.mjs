#!/usr/bin/env node

/**
 * scripts/generate-block-api.mjs
 * Builds the source-backed JSON reference used by the Blocks authoring page.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

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
// hygiene-ignore single-use -- Keep the audited TSDoc input set explicit and pass it as one ordered command argument list.
const srcPaths = [
  'site/src/lib/catalog.ts',
  'src/lib/host.ts',
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
// hygiene-ignore single-use -- Resolve TypeDoc from this package before deriving its CLI path.
const typedocManifestPath = createRequire(import.meta.url).resolve('typedoc/package.json');
// hygiene-ignore single-use -- Keep package-root resolution separate from the manifest lookup for the CLI contract.
const typedocRoot = dirname(typedocManifestPath);
// hygiene-ignore single-use -- Pass the resolved executable to Node so pnpm's PATH layout does not affect generation.
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
    ...srcPaths,
  ],
  { cwd: root, stdio: 'inherit' },
);

// hygiene-ignore single-use -- Parse TypeDoc's JSON once before walking its reflection tree.
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
  'custom-blocks',
  'quiz',
  'typescript-docs',
];

/**
 * Collects reflections that declare a Docs block identifier.
 *
 * @param reflection - TypeDoc reflection to inspect.
 * @param found - Collected reflections to extend.
 *
 * @returns Reflections containing a `@docsId` tag.
 */
function walk(reflection, found = []) {
  if (reflection.comment?.blockTags?.some((tag) => tag.tag === '@docsId')) found.push(reflection);
  for (const child of reflection.children ?? []) walk(child, found);
  for (const signature of reflection.signatures ?? []) walk(signature, found);
  return found;
}

/**
 * Reads rendered text values for one named TypeDoc block tag.
 *
 * @param reflection - TypeDoc reflection with optional block tags.
 * @param name - Tag name without the `@` prefix.
 *
 * @returns Non-empty rendered tag values.
 */
function tags(reflection, name) {
  return (reflection.comment?.blockTags ?? [])
    .filter((tag) => tag.tag === `@${name}`)
    .map((tag) => renderParts(tag.content ?? []).trim())
    .filter(Boolean);
}

/**
 * Converts TypeDoc text parts into normalized Markdown source.
 *
 * @param parts - TypeDoc content parts.
 * @returns Joined text with normalized line endings and surrounding whitespace removed.
 */
function renderParts(parts) {
  return parts
    .map((part) => part.text ?? '')
    .join('')
    .replace(/\r\n/g, '\n')
    .trim();
}

/**
 * Reads a required block tag and reports the owning block when it is missing.
 *
 * @param reflection - TypeDoc reflection to inspect.
 * @param name - Required tag name without the `@` prefix.
 * @param id - Stable Docs block identifier for the error message.
 * @returns Rendered values for the required tag.
 */
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
  // hygiene-ignore single-use -- Validate and normalize every editor image before adding it to the public block record.
  const editorImgs = tags(reflection, 'docsEditorImage').map((value) => {
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
  if (!renderParts(reflection.comment?.summary ?? []))
    throw new Error(`Block "${id}" is missing its source TSDoc summary.`);
  if (!constraints.length || !dos.length || !donts.length || !tips.length)
    throw new Error(
      `Block "${id}" needs @docsConstraint, @docsDo, @docsDont, and @docsTip guidance.`,
    );
  if (insertionSteps.length < 2)
    throw new Error(`Block "${id}" needs at least two ordered @docsInsertionStep entries.`);
  if (!renderedExample) throw new Error(`Block "${id}" is missing @docsRenderedExample.`);
  if (!syntax.trim()) throw new Error(`Block "${id}" @docsSyntax must include a source example.`);
  if (!['markdown', 'nodes', 'embed', 'quiz', 'tsdocs', 'custom'].includes(renderKind))
    throw new Error(`Block "${id}" has invalid @docsRenderKind "${renderKind}".`);
  const code = /```/.test(syntax) ? syntax : `\`\`\`mdx\n${syntax}\n\`\`\``;
  // hygiene-ignore single-use -- Extract all fence languages before rejecting unsupported source examples.
  const fenceLangs = [...code.matchAll(/(?:^|\n)```([A-Za-z][A-Za-z0-9_-]*)/g)].map(
    (match) => match[1],
  );
  if (fenceLangs.some((language) => language !== 'mdx'))
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
    editorImages: editorImgs,
  };
});

// hygiene-ignore single-use -- Strip the internal ID from each record while using it as the generated object's key.
const byIdOutput = Object.fromEntries(blocks.map(({ id, ...entry }) => [id, entry]));
await writeFile(outputPath, `${JSON.stringify(byIdOutput, null, 2)}\n`);
console.log(`Generated ${outputPath} from ${blocks.length} source TSDoc entries.`);

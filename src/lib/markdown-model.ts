import { marked } from 'marked';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { DocsValue } from '../components/Docs.js';
import type { RichBlock } from '../components/blocks.js';
import { enabledDocsBlocks } from '../components/blocks.js';
import type { DocsBlockOptions } from '../components/blocks.js';
import * as TerraQualityRegex from './terra/regex.mjs';
/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/
const G_REGEX = () => /\\/g;
const DOCSMATH_0_9A_F_END_GI_REGEX = () => /DOCSMATH[0-9a-f]+END/gi;
const N_G_REGEX = () => /(?<!\\)\$([^$\n]+)\$/g;
const BR_S_I_REGEX = /^<br\s*\/?>$/i;
const N_G_CLASS_2 = () => /(\$[^$\n]+\$)/g;
const N_REGEX = /^\$[^$\n]+\$$/;
const R_N_REGEX = /\r?\n$/;
const SHARED_REGEX = /^`+/;
const S_REGEX = /\s/;
const S_CLASS_2 = /\/\s*$/;
const G_CLASS_2 = () => /&/g;
const DOCSBLOCK_D_PLACEHOLDER_REGEX = /DOCSBLOCK\d+PLACEHOLDER/;
const G_CLASS_2_3 = () => /"/g;
const N_3_G_REGEX = () => /\n{3,}/g;
const R_N_CLASS_2 = /[$\r\n]/;
const R_N_CLASS_2_3 = /(?:\r?\n)+$/;
const R_N_G_REGEX = () => /\r?\n/g;
const N_G_CLASS_2_3 = () => /\n/g;
const N_CLASS_2 = /\n+$/;
const G_CLASS_2_3_4 = () => /\]/g;

const key = () => crypto.randomUUID();
type Token = {
  type: string;
  raw: string;
  text?: string;
  depth?: number;
  lang?: string;
  href?: string;
  title?: string | null;
  tokens?: Token[];
  header?: Token[];
  rows?: Token[][];
  items?: Token[];
  ordered?: boolean;
  task?: boolean;
  checked?: boolean;
  [name: string]: unknown;
};

function encodeInlineMathPlaceholder(code: string): string {
  return `DOCSMATH${Array.from(code, (character) =>
    (character.codePointAt(0) ?? 0).toString(16).padStart(6, '0'),
  ).join('')}END`;
}

function decodeInlineMathPlaceholder(value: string): string | undefined {
  const match = value.match(/^DOCSMATH([0-9a-f]+)END$/i);
  if (!match || match[1]!.length % 6 !== 0) return undefined;
  const codepoints: number[] = [];
  for (let offset = 0; offset < match[1]!.length; offset += 6) {
    const codepoint = Number.parseInt(match[1]!.slice(offset, offset + 6), 16);
    if (codepoint > 0x10ffff || (codepoint >= 0xd800 && codepoint <= 0xdfff)) return undefined;
    codepoints.push(codepoint);
  }
  return String.fromCodePoint(...codepoints);
}

function restoreInlineMathPlaceholders(value: string): string {
  return value.replace(DOCSMATH_0_9A_F_END_GI_REGEX(), (placeholder) => {
    const code = decodeInlineMathPlaceholder(placeholder);
    return code === undefined ? placeholder : `$${code}$`;
  });
}

function span(text: string, marks: string[] = []) {
  return { _type: 'span', _key: key(), text, marks };
}

function inline(
  tokens: Token[] | undefined,
  markDefs: { _type: 'link'; _key: string; href: string }[],
  inlineMath = true,
  inheritedMarks: string[] = [],
): (ReturnType<typeof span> | { _type: 'math'; _key: string; code: string; inline: true })[] {
  if (!tokens) return [];
  let aMarks = [...inheritedMarks];
  const result: (
    ReturnType<typeof span> | { _type: 'math'; _key: string; code: string; inline: true }
  )[] = [];
  const addMark = (items: typeof result, mark: string) =>
    items.map((i) => (i._type === 'span' ? { ...i, marks: [...i.marks, mark] } : i));

  let normTokens = tokens;
  if (inlineMath) {
    const genTokens: Token[] = [];
    for (const token of tokens) {
      if (!['text', 'escape'].includes(token.type)) {
        genTokens.push(token);
        continue;
      }
      const matches = [...token.raw.matchAll(DOCSMATH_0_9A_F_END_GI_REGEX())];
      if (!matches.length) {
        genTokens.push(token);
        continue;
      }
      let cursor = 0;
      for (const match of matches) {
        const start = match.index ?? 0;
        if (start > cursor) {
          const raw = token.raw.slice(cursor, start);
          const text = token.text ?? token.raw;
          genTokens.push({
            ...token,
            raw,
            text: text.length === token.raw.length ? text.slice(cursor, start) : raw,
          });
        }
        const code = decodeInlineMathPlaceholder(match[0]);
        genTokens.push(
          code === undefined
            ? { ...token, raw: match[0], text: match[0] }
            : { type: 'docsMath', raw: match[0], text: code },
        );
        cursor = start + match[0].length;
      }
      if (cursor < token.raw.length) {
        const raw = token.raw.slice(cursor);
        const text = token.text ?? token.raw;
        genTokens.push({
          ...token,
          raw,
          text: text.length === token.raw.length ? text.slice(cursor) : raw,
        });
      }
    }

    const mathTokens: Token[] = [];
    for (let index = 0; index < genTokens.length;) {
      if (!['text', 'escape'].includes(genTokens[index]!.type)) {
        mathTokens.push(genTokens[index]!);
        index += 1;
        continue;
      }
      const run: Token[] = [];
      while (index < genTokens.length && ['text', 'escape'].includes(genTokens[index]!.type)) {
        run.push(genTokens[index]!);
        index += 1;
      }
      const source = run.map((token) => token.raw).join('');
      const matches = [...source.matchAll(N_G_REGEX())];
      if (!matches.length) {
        mathTokens.push(...run);
        continue;
      }
      const appendSourceRange = (start: number, end: number) => {
        let offset = 0;
        for (const token of run) {
          const tokenStart = offset;
          const tokenEnd = tokenStart + token.raw.length;
          offset = tokenEnd;
          const from = Math.max(start, tokenStart);
          const to = Math.min(end, tokenEnd);
          if (from >= to) continue;
          if (from === tokenStart && to === tokenEnd) {
            mathTokens.push(token);
            continue;
          }
          const localStart = from - tokenStart;
          const localEnd = to - tokenStart;
          const raw = token.raw.slice(localStart, localEnd);
          const text = token.text ?? token.raw;
          mathTokens.push({
            ...token,
            raw,
            text: text.length === token.raw.length ? text.slice(localStart, localEnd) : raw,
          });
        }
      };
      let cursor = 0;
      for (const match of matches) {
        const start = match.index ?? 0;
        const raw = match[0];
        appendSourceRange(cursor, start);
        mathTokens.push({ type: 'docsMath', raw, text: match[1] ?? '' });
        cursor = start + raw.length;
      }
      appendSourceRange(cursor, source.length);
    }
    normTokens = mathTokens;
  }

  for (const token of normTokens) {
    if (token.type === 'docsMath') {
      result.push({ _type: 'math', _key: key(), code: token.text ?? '', inline: true });
      continue;
    }
    if (token.type === 'html') {
      const tag = token.raw.match(/^<(\/)?(u|ins|s|del|strike|em|i|strong|b|code)\s*>$/i);
      if (tag) {
        const mark = /^code$/i.test(tag[2]!)
          ? 'code'
          : /^(?:u|ins)$/i.test(tag[2]!)
            ? 'underline'
            : /^(?:em|i)$/i.test(tag[2]!)
              ? 'em'
              : /^(?:strong|b)$/i.test(tag[2]!)
                ? 'strong'
                : 'strike-through';
        if (tag[1]) aMarks = aMarks.filter((i) => i !== mark);
        else aMarks = [...aMarks, mark];
        continue;
      }
      if (BR_S_I_REGEX.test(token.raw)) {
        result.push(span('\n', aMarks));
        continue;
      }
      result.push(span(token.raw, aMarks));
      continue;
    }
    if (token.type === 'strong') {
      result.push(...addMark(inline(token.tokens, markDefs, inlineMath, aMarks), 'strong'));
      continue;
    }
    if (token.type === 'em') {
      result.push(...addMark(inline(token.tokens, markDefs, inlineMath, aMarks), 'em'));
      continue;
    }
    if (token.type === 'del') {
      result.push(...addMark(inline(token.tokens, markDefs, inlineMath, aMarks), 'strike-through'));
      continue;
    }
    if (token.type === 'link') {
      const href = typeof token.href === 'string' ? token.href : '';
      if (!href || !/^(?:https?:\/\/|mailto:|tel:|\/|\.\.?\/|#)/i.test(href)) {
        result.push(span(token.raw, aMarks));
        continue;
      }
      const mark = key();
      markDefs.push({ _type: 'link', _key: mark, href });
      const joined: typeof result = [];
      for (const item of addMark(inline(token.tokens, markDefs, inlineMath, aMarks), mark)) {
        const previous = joined.at(-1);
        if (
          item._type === 'span' &&
          previous?._type === 'span' &&
          JSON.stringify(item.marks) === JSON.stringify(previous.marks)
        )
          previous.text += item.text;
        else joined.push(item);
      }
      result.push(...joined);
      continue;
    }
    if (token.type === 'text' || token.type === 'escape') {
      const tokenText = token.text ?? token.raw;
      if (aMarks.includes('code')) {
        result.push(span(decodeHtml(tokenText), aMarks));
        continue;
      }
      result.push(
        ...tokenText
          .split(N_G_CLASS_2())
          .filter(Boolean)
          .map((piece) =>
            inlineMath && N_REGEX.test(piece)
              ? {
                  _type: 'math' as const,
                  _key: key(),
                  code: piece.slice(1, -1),
                  inline: true as const,
                }
              : span(piece, aMarks),
          ),
      );
      continue;
    }
    if (token.type === 'codespan') {
      result.push(span(token.text ?? token.raw, [...aMarks, 'code']));
      continue;
    }
    if (token.type === 'br') {
      result.push(span('\n', aMarks));
      continue;
    }
    // Images in the middle of prose have no Portable Text inline equivalent. Keep their source.
    result.push(span(token.raw, aMarks));
  }
  return result;
}
function textBlock(
  style: string,
  tokens: Token[] | undefined,
  fallback: string,
  inlineMath = true,
) {
  const markDefs: { _type: 'link'; _key: string; href: string }[] = [];
  const children = inline(tokens, markDefs, inlineMath);
  return {
    _type: 'block',
    _key: key(),
    style,
    markDefs,
    children: children.length ? children : [span(fallback)],
  };
}

function enabled(options: DocsBlockOptions, type: string): boolean {
  // Imported Portable Text paragraphs are part of the document model itself,
  // not optional rich blocks. Canonical JSON directives let local hosts retain
  // their marks and inline objects without a lossy Markdown round trip.
  if (type === 'block' || type === 'block') return true;
  return enabledDocsBlocks(options).includes(type as never);
}

function richPlaceholder(blocks: RichBlock[], block: RichBlock): string {
  blocks.push({ ...block, _key: block._key ?? key() });
  return `\n\nDOCSBLOCK${blocks.length - 1}PLACEHOLDER\n\n`;
}

function rawPlaceholder(blocks: RichBlock[], markdown: string): string {
  return richPlaceholder(blocks, { _type: 'raw', markdown });
}

type SourceRange = { start: number; end: number };
type JsxOpeningTag = {
  name: string;
  attributes: Record<string, unknown>;
  end: number;
  selfClosing: boolean;
};

function codeFenceRanges(source: string): SourceRange[] {
  const ranges: SourceRange[] = [];
  let open: { start: number; char: string; length: number } | undefined;
  let index = 0;
  while (index < source.length) {
    const lineStart = index === 0 || source[index - 1] === '\n';
    if (lineStart && !open) {
      const newline = source.indexOf('\n', index);
      const end = newline === -1 ? source.length : newline + 1;
      const marker = source
        .slice(index, end)
        .replace(R_N_REGEX, '')
        .match(TerraQualityRegex.REGEX_0_3_3_3_REGEX());
      if (marker) {
        const fence = marker[1]!;
        open = { start: index, char: fence[0]!, length: fence.length };
        index = end;
        continue;
      }
    } else if (lineStart && open) {
      const newline = source.indexOf('\n', index);
      const end = newline === -1 ? source.length : newline + 1;
      const marker = source
        .slice(index, end)
        .replace(R_N_REGEX, '')
        .match(TerraQualityRegex.REGEX_0_3_3_3_S_REGEX());
      if (marker && marker[1]![0] === open.char && marker[1]!.length >= open.length) {
        ranges.push({ start: open.start, end });
        open = undefined;
      }
      index = end;
      continue;
    }

    // The original Docs serializer embeds code in a template literal. Fences inside that literal
    // are code content, so treat the whole component as opaque while locating Markdown fences.
    if (!open && source[index] === '<') {
      const opening = readJsxOpeningTag(source, index);
      if (opening?.name === 'Code') {
        index = jsxComponentRange(source, opening)?.end ?? source.length;
        continue;
      }
    }

    // Ignore component-looking text inside inline Markdown code spans.
    if (!open && source[index] === '`' && source[index - 1] !== '\\') {
      const marker = source.slice(index).match(SHARED_REGEX)?.[0];
      if (marker) {
        const close = source.indexOf(marker, index + marker.length);
        if (close !== -1) {
          index = close + marker.length;
          continue;
        }
      }
    }
    index += 1;
  }
  if (open) ranges.push({ start: open.start, end: source.length });
  return ranges;
}

// Line directives must skip fenced Markdown examples, including nested ones.
function shieldCodeFences(source: string) {
  const ranges = codeFenceRanges(source);
  const fences = ranges.map(({ start, end }) => source.slice(start, end));
  return {
    source:
      ranges
        .map(
          ({ start }, i) =>
            `${source.slice(ranges[i - 1]?.end ?? 0, start)}DOCSFENCE${i}PLACEHOLDER`,
        )
        .join('') + source.slice(ranges.at(-1)?.end ?? 0),
    restore: (value: string) =>
      value.replace(/DOCSFENCE(\d+)PLACEHOLDER/g, (match, number: string) =>
        fences[Number(number)] === undefined ? match : fences[Number(number)]!,
      ),
  };
}

function readBracedExpr(source: string, start: number): { value: string; end: number } | undefined {
  if (source[start] !== '{') return undefined;
  let depth = 1;
  let quote: '"' | "'" | '`' | undefined;
  for (let index = start + 1; index < source.length; index += 1) {
    const char = source[index]!;
    if (quote) {
      if (char === '\\') {
        index += 1;
        continue;
      }
      if (char === quote) quote = undefined;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return { value: source.slice(start + 1, index), end: index + 1 };
    }
  }
  return undefined;
}

function parseJsxLiteral(source: string): unknown {
  const value = source.trim();
  if (!value) return '';
  if (value.startsWith('`') && value.endsWith('`'))
    return value.slice(1, -1).replace(/\\([\\`$])/g, '$1');
  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      return decodeHtml(JSON.parse(value) as string);
    } catch {
      return decodeHtml(value.slice(1, -1));
    }
  }
  if (value.startsWith("'") && value.endsWith("'"))
    return decodeHtml(value.slice(1, -1).replace(/\\([\\'"`])/g, '$1'));
  if (/^(?:true|false|null)$/.test(value)) return JSON.parse(value) as unknown;
  if (/^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) return Number(value);
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function readJsxOpeningTag(source: string, start: number): JsxOpeningTag | undefined {
  if (source[start] !== '<') return undefined;
  const name = source.slice(start + 1).match(/^([A-Z][A-Za-z0-9_]*)\b/)?.[1];
  if (!name) return undefined;
  let quote: '"' | "'" | '`' | undefined;
  let exprDepth = 0;
  let end: number | undefined;
  for (let index = start + 1; index < source.length; index += 1) {
    const char = source[index]!;
    if (quote) {
      if (char === '\\') {
        index += 1;
        continue;
      }
      if (char === quote) quote = undefined;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') exprDepth += 1;
    else if (char === '}' && exprDepth > 0) exprDepth -= 1;
    else if (char === '>' && exprDepth === 0) {
      end = index + 1;
      break;
    }
  }
  if (!end) return undefined;
  const shell = source.slice(start + name.length + 1, end - 1);
  const openingAttrs = shell.replace(S_CLASS_2, '');
  const attrs: Record<string, unknown> = {};
  let index = 0;
  while (index < openingAttrs.length) {
    while (S_REGEX.test(openingAttrs[index] ?? '')) index += 1;
    const attrName = openingAttrs.slice(index).match(/^[A-Za-z_$][\w$:-]*/)?.[0];
    if (!attrName) {
      index += 1;
      continue;
    }
    index += attrName.length;
    while (S_REGEX.test(openingAttrs[index] ?? '')) index += 1;
    if (openingAttrs[index] !== '=') {
      attrs[attrName] = true;
      continue;
    }
    index += 1;
    while (S_REGEX.test(openingAttrs[index] ?? '')) index += 1;
    const quote = openingAttrs[index];
    if (quote === '"' || quote === "'") {
      let literal = quote;
      index += 1;
      while (index < openingAttrs.length) {
        const character = openingAttrs[index]!;
        literal += character;
        if (character === '\\') {
          literal += openingAttrs[index + 1] ?? '';
          index += 2;
          continue;
        }
        index += 1;
        if (character === quote) break;
      }
      attrs[attrName] = parseJsxLiteral(literal);
      continue;
    }
    if (openingAttrs[index] === '{') {
      const expr = readBracedExpr(openingAttrs, index);
      if (!expr) break;
      attrs[attrName] = parseJsxLiteral(expr.value);
      index = expr.end;
      continue;
    }
    const bare = openingAttrs.slice(index).match(/^[^\s/>]+/)?.[0];
    if (!bare) {
      index += 1;
      continue;
    }
    attrs[attrName] = parseJsxLiteral(bare);
    index += bare.length;
  }
  return { name, attributes: attrs, end, selfClosing: S_CLASS_2.test(shell) };
}

function codeBodyExpr(source: string, start: number): { value: string; end: number } | undefined {
  const first = source.slice(start).match(/^\s*\{/);
  if (!first) return undefined;
  const exprStart = start + first[0].length - 1;
  return source.slice(exprStart + 1).match(/^\s*`/) ? readBracedExpr(source, exprStart) : undefined;
}

function jsxComponentRange(
  source: string,
  opening: JsxOpeningTag,
): { bodyEnd: number; end: number } | undefined {
  if (opening.selfClosing) return { bodyEnd: opening.end, end: opening.end };
  const expr = opening.name === 'Code' ? codeBodyExpr(source, opening.end) : undefined;
  const closePattern = new RegExp(`<\\/${opening.name}\\s*>`, 'g');
  closePattern.lastIndex = expr?.end ?? opening.end;
  const close = closePattern.exec(source);
  if (opening.name === 'Code') {
    // Older exported leaves can omit an end tag before the next Code block. Treat that next
    // opening tag as the boundary instead of swallowing every following code sample.
    const nOpening = source.indexOf('<Code', expr?.end ?? opening.end);
    if (nOpening !== -1 && (!close || nOpening < close.index))
      return { bodyEnd: nOpening, end: nOpening };
  }
  return close ? { bodyEnd: close.index, end: close.index + close[0].length } : undefined;
}

function parseArrayAttr(value: unknown): unknown[] | undefined {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/** Replace supported components outside code and structured Markdown blocks. */
export function replaceCanonicalComponents(
  source: string,
  replace: (block: RichBlock | undefined, raw: string, inTable: boolean) => string,
): string {
  const fences = codeFenceRanges(source);
  const structured = [
    ...source.matchAll(/^(:{3,})docs [A-Za-z]+(?:\[[^\]\n]*\])?\s*\r?\n[\s\S]*?^\1\s*$/gm),
    ...source.matchAll(/^(:{4,})docs (?:accordion|tabs)\s*\r?\n[\s\S]*?^\1\s*$/gm),
  ]
    .map((match) => ({ start: match.index ?? 0, end: (match.index ?? 0) + match[0].length }))
    .sort((a, b) => a.start - b.start);
  let fenceIndex = 0;
  let structuredIndex = 0;
  let output = '';
  let copiedUntil = 0;
  for (let index = 0; index < source.length; index += 1) {
    while (fenceIndex < fences.length && index >= fences[fenceIndex]!.end) fenceIndex += 1;
    const fence = fences[fenceIndex];
    if (fence && index >= fence.start && index < fence.end) {
      index = fence.end - 1;
      continue;
    }
    while (structuredIndex < structured.length && index >= structured[structuredIndex]!.end)
      structuredIndex += 1;
    const block = structured[structuredIndex];
    if (block && index >= block.start && index < block.end) {
      index = block.end - 1;
      continue;
    }
    if (source[index] === '`' && source[index - 1] !== '\\') {
      const marker = source.slice(index).match(SHARED_REGEX)?.[0];
      if (marker) {
        const close = source.indexOf(marker, index + marker.length);
        if (close !== -1) {
          index = close + marker.length - 1;
          continue;
        }
      }
    }
    if (source[index] !== '<') continue;
    const opening = readJsxOpeningTag(source, index);
    if (
      !opening ||
      !(
        opening.name === 'Nodes' ||
        opening.name === 'Code' ||
        opening.name === 'Embed' ||
        opening.name === 'TsDocs' ||
        opening.name === 'Quiz' ||
        opening.name === 'DocsBlock'
      )
    )
      continue;
    const component = jsxComponentRange(source, opening);
    if (!component) continue;
    const { end, bodyEnd } = component;
    output +=
      source.slice(copiedUntil, index) +
      replace(
        (() => {
          const attrs = opening.attributes;
          const body = opening.selfClosing ? '' : source.slice(opening.end, bodyEnd);
          const expr = codeBodyExpr(body, 0);
          const bodyValue = expr ? parseJsxLiteral(expr.value) : decodeHtml(body.trim());
          if (opening.name === 'DocsBlock') {
            try {
              const data = (
                typeof attrs.data === 'string' ? JSON.parse(attrs.data) : attrs.data
              ) as RichBlock;
              return data && typeof data._type === 'string' ? data : undefined;
            } catch {
              return undefined;
            }
          }
          if (opening.name === 'Nodes') {
            const nodes = parseArrayAttr(attrs.nodes);
            const edges = parseArrayAttr(attrs.edges);
            if (('nodes' in attrs && !nodes) || ('edges' in attrs && !edges)) return undefined;
            return {
              _type: 'nodes',
              _key: key(),
              ...attrs,
              nodes: Array.isArray(nodes) ? nodes : [],
              edges: Array.isArray(edges) ? edges : [],
            };
          }
          if (opening.name === 'Quiz') return { _type: 'quiz', _key: key(), ...attrs };
          if (opening.name === 'Code') {
            const codeSource = typeof attrs.source === 'string' ? attrs.source : undefined;
            const codeAttr = typeof attrs.code === 'string' ? attrs.code : undefined;
            return {
              _type: 'code',
              _key: key(),
              language: typeof attrs.language === 'string' ? attrs.language : '',
              ...(codeSource ? { source: codeSource } : {}),
              value:
                (typeof bodyValue === 'string'
                  ? bodyValue.replace(/^\r?\n/, '').replace(R_N_REGEX, '')
                  : (codeAttr ?? '')) ||
                codeAttr ||
                '',
            };
          }
          if (opening.name === 'Embed')
            return {
              _type: 'embed',
              _key: key(),
              ...attrs,
              src: typeof attrs.src === 'string' ? attrs.src : '',
              title: typeof attrs.title === 'string' ? attrs.title : '',
            };
          if (opening.name === 'TsDocs')
            return {
              _type: 'tsDocs',
              _key: key(),
              ...attrs,
              scope: typeof attrs.scope === 'string' ? attrs.scope : '',
            };
          return undefined;
        })(),
        source.slice(index, end),
        opening.name === 'Code' &&
          source.slice(0, index).toLowerCase().lastIndexOf('<table') >
            source.slice(0, index).toLowerCase().lastIndexOf('</table'),
      );
    copiedUntil = end;
    index = end - 1;
  }
  return output ? output + source.slice(copiedUntil) : source;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&#(\d+);?/g, (match, code: string) => {
      const point = Number(code);
      return Number.isInteger(point) && point >= 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : match;
    })
    .replace(/&#x([0-9a-f]+);?/gi, (match, code: string) => {
      const point = Number.parseInt(code, 16);
      return Number.isInteger(point) && point >= 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : match;
    })
    .replace(/&(nbsp|amp|lt|gt|quot|apos|#39);/gi, (_match, entity: string) => {
      switch (entity.toLowerCase()) {
        case 'nbsp':
          return ' ';
        case 'amp':
          return '&';
        case 'lt':
          return '<';
        case 'gt':
          return '>';
        case 'quot':
          return '"';
        case 'apos':
        case '#39':
          return "'";
        default:
          return _match;
      }
    });
}

function decodeHtmlRepeated(value: string): string {
  let current = value;
  for (let pass = 0; pass < 8; pass += 1) {
    const decoded = decodeHtml(current);
    if (decoded === current) break;
    current = decoded;
  }
  return current;
}

function htmlAttr(attrs: string, name: string): string | undefined {
  const match = attrs.match(
    new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'),
  );
  const value = match?.[1] ?? match?.[2] ?? match?.[3];
  return value === undefined ? undefined : decodeHtml(value);
}

function escapeMarkdownText(value: string): string {
  return decodeHtmlRepeated(value).replace(
    /(\$[^$\n]+\$)|([\\`*_{}\x5B\x5D#<>!$])/g,
    (_match, math: string | undefined, character: string | undefined) => math ?? `\\${character}`,
  );
}

function markdownCodeSpan(value: string): string {
  const fence = '`'.repeat(
    1 + Math.max(0, ...[...value.matchAll(/`+/g)].map(([ticks]) => ticks.length)),
  );
  const padding = value.startsWith('`') || value.endsWith('`') ? ' ' : '';
  return `${fence}${padding}${value}${padding}${fence}`;
}

function markdownDestination(value: string): string {
  const destination = decodeHtmlRepeated(value).replace(/[>\s]/g, (character) =>
    character === '>' ? '%3E' : '%20',
  );
  return /[()[\]<>]/.test(destination) ? '<' + destination + '>' : destination;
}

/** Convert HTML table cells without letting ordinary underscores become Markdown emphasis. */
function escapeHtmlTableText(value: string, inlineMath: boolean): string {
  const decoded = decodeHtmlRepeated(value);
  if (!inlineMath) return escapeMarkdownText(decoded);
  const matches = [...decoded.matchAll(N_G_REGEX())];
  if (!matches.length) return escapeMarkdownText(decoded);

  let output = '';
  let cursor = 0;
  for (const match of matches) {
    const start = match.index ?? 0;
    output +=
      escapeMarkdownText(decoded.slice(cursor, start)) +
      encodeInlineMathPlaceholder(match[1] ?? '');
    cursor = start + match[0].length;
  }
  return output + escapeMarkdownText(decoded.slice(cursor));
}

function tableBlock(
  rows: Token[][],
  markdown: string,
  options: DocsBlockOptions,
  header = 'Table',
): RichBlock | undefined {
  if (!rows.length) return undefined;
  return {
    _type: 'table',
    _key: key(),
    header,
    markdown: restoreInlineMathPlaceholders(markdown),
    rows: rows.map((cells) => ({
      _type: 'row',
      _key: key(),
      cells: cells.map((cell) => {
        const contentTokens: Token[][] = [[]];
        for (const token of Array.isArray(cell.tokens) ? cell.tokens : []) {
          if (
            token.type === 'html' &&
            /^<br\s+data-docs-paragraph-break\s*\/?>$/i.test(token.raw)
          ) {
            contentTokens.push([]);
          } else contentTokens.at(-1)!.push(token);
        }
        const inlineMath = options.inlineMath !== false && options.math !== false;
        const cellBlock: RichBlock = { _type: 'cell', _key: '' };
        cellBlock.content = contentTokens.flatMap((part) => {
          const result: RichBlock[] = [];
          let pending: Token[] = [];
          const flush = () => {
            if (!pending.length) return;
            result.push(
              textBlock(
                'normal',
                pending,
                pending.map((token) => token.text ?? token.raw).join(''),
                inlineMath,
              ),
            );
            pending = [];
          };

          for (const token of part) {
            if (token.type === 'image' && enabled(options, 'docImage')) {
              flush();
              result.push({
                _type: 'docImage',
                _key: key(),
                alt: token.text ?? '',
                url: token.href ?? '',
                ...(token.title ? { title: token.title } : {}),
                markdown: token.raw,
              });
            } else {
              // Keep an opted-out image as literal Markdown instead of dropping it.
              pending.push(token);
            }
          }
          flush();

          if (!result.length) {
            result.push(
              textBlock(
                'normal',
                part,
                part.map((token) => token.text ?? token.raw).join('') || (cell.text ?? cell.raw),
                inlineMath,
              ),
            );
          }
          return result;
        });
        cellBlock._key = key();
        return cellBlock;
      }),
    })),
  };
}

/** Decode Markdown without dropping unsupported syntax; opaque tokens become raw blocks. */
export function markdownToDocsValue(markdown: string, options: DocsBlockOptions = {}): DocsValue {
  return parseMarkdown(markdown, options, []);
}

function parseMarkdown(
  markdown: string,
  options: DocsBlockOptions,
  blocks: RichBlock[],
): DocsValue {
  const inlineMath = options.inlineMath !== false && options.math !== false;
  // Keep the existing typed and captioned table forms lossless; other rich
  // components use the shared JSX scanner above.
  const fencedAccordions = shieldCodeFences(
    replaceCanonicalComponents(markdown, (block, raw, inTable) => {
      if (!block || !enabled(options, block._type)) return rawPlaceholder(blocks, raw);
      if (inTable)
        return `<code>${String(block.value ?? block.source ?? '')
          .replace(G_CLASS_2(), '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')}</code>`;
      return richPlaceholder(blocks, block);
    })
      .replace(
        TerraQualityRegex.REGEX_3_DOCS_TABLE_S_N_S_S_1_S_GM_REGEX(),
        (source, _fence: string, payload: string) => {
          try {
            let tableData = parseYaml(payload) as RichBlock;
            if (tableData?._type !== 'table') return rawPlaceholder(blocks, source);
            const sourceData = tableData as Record<string, unknown>;
            if (sourceData._docsCellFormat === 'markdown-v1' && Array.isArray(sourceData.rows)) {
              const { rows: sourceRows, ...tableFields } = sourceData;
              delete tableFields._docsCellFormat;
              tableData = {
                ...tableFields,
                _type: 'table',
                rows: sourceRows.map((row) => {
                  if (!row || typeof row !== 'object') return row;
                  const { cells: sourceCells, ...rowFields } = row as Record<string, unknown>;
                  return {
                    ...rowFields,
                    _type: typeof rowFields._type === 'string' ? rowFields._type : 'row',
                    cells: Array.isArray(sourceCells)
                      ? sourceCells.map((cell) => {
                          if (!cell || typeof cell !== 'object') return cell;
                          const { markdown, ...cellFields } = cell as Record<string, unknown>;
                          return {
                            ...cellFields,
                            _type: typeof cellFields._type === 'string' ? cellFields._type : 'cell',
                            content:
                              typeof markdown === 'string'
                                ? parseMarkdown(markdown, options, blocks)
                                : Array.isArray(cellFields.content)
                                  ? cellFields.content
                                  : [],
                          };
                        })
                      : sourceCells,
                  };
                }),
              } as RichBlock;
            }
            return enabled(options, 'table')
              ? richPlaceholder(blocks, tableData)
              : rawPlaceholder(blocks, source);
          } catch {
            return rawPlaceholder(blocks, source);
          }
        },
      )
      .replace(
        TerraQualityRegex.REGEX_DOCS_TABLE_R_N_T_R_N_S_S_T_GM_REGEX(),
        (source, caption: string, body: string) => {
          if (!enabled(options, 'table')) return rawPlaceholder(blocks, source);
          let header = caption;
          try {
            header = decodeURIComponent(caption);
          } catch {
            /* Keep the literal caption. */
          }
          const token = (marked.lexer(body, { gfm: true }) as Token[]).find(
            (part) => part.type === 'table',
          );
          if (!token) return rawPlaceholder(blocks, source);
          const table = tableBlock(
            [token.header ?? [], ...(token.rows ?? [])],
            body,
            options,
            header,
          );
          return table ? richPlaceholder(blocks, table) : rawPlaceholder(blocks, source);
        },
      ),
  );
  let calloutSource = fencedAccordions.restore(
    fencedAccordions.source.replace(
      TerraQualityRegex.REGEX_S_N_S_N_S_S_1_S_GM_REGEX(),
      (source, delimiter: string, title: string, body: string) => {
        const type = delimiter === '===' ? 'accordion' : 'tabs';
        if (!enabled(options, type)) return rawPlaceholder(blocks, source);
        const markdown = fencedAccordions.restore(body);
        return richPlaceholder(blocks, {
          _type: type,
          items: [
            {
              _type: 'item',
              title,
              ...(DOCSBLOCK_D_PLACEHOLDER_REGEX.test(markdown) ? {} : { markdown }),
              content: parseMarkdown(markdown, options, blocks),
            },
          ],
        });
      },
    ),
  );
  type OpenCallout = {
    start: number;
    bodyStart: number;
    closeStart?: number;
    fenceLength: number;
    kind: string;
    title?: string;
  };
  const stack: OpenCallout[] = [];
  const ranges: (OpenCallout & { end: number })[] = [];
  const calloutFences = codeFenceRanges(calloutSource);
  let fenceIndex = 0;
  let offset = 0;
  while (offset < calloutSource.length) {
    const newline = calloutSource.indexOf('\n', offset);
    const end = newline === -1 ? calloutSource.length : newline + 1;
    const line = calloutSource.slice(offset, end).replace(R_N_REGEX, '');
    while (fenceIndex < calloutFences.length && offset >= calloutFences[fenceIndex]!.end)
      fenceIndex += 1;
    const fence = calloutFences[fenceIndex];
    if (fence && offset >= fence.start && offset < fence.end) {
      offset = end;
      continue;
    }
    const open = line.match(
      /^\s*(:{3,})(note|tip|caution|danger|example|warning)(?:\[([^\]\n]*)\])?\s*$/,
    );
    if (open) {
      stack.push({
        start: offset,
        bodyStart: end,
        fenceLength: open[1]!.length,
        kind: open[2]!,
        ...(open[3] ? { title: open[3].trim() } : {}),
      });
    } else if (
      stack.length > 0 &&
      line.match(/^\s*(:{3,})\s*$/)?.[1]?.length === stack.at(-1)!.fenceLength
    ) {
      const closed = stack.pop();
      if (closed && stack.length === 0) ranges.push({ ...closed, closeStart: offset, end });
    }
    offset = end;
  }
  for (const range of ranges.reverse()) {
    const body =
      range.closeStart === undefined
        ? ''
        : calloutSource.slice(range.bodyStart, range.closeStart).trimEnd();
    calloutSource =
      calloutSource.slice(0, range.start) +
      ((content) =>
        enabled(options, 'callout')
          ? richPlaceholder(blocks, {
              _type: 'callout',
              kind: range.kind,
              title: range.title || range.kind,
              content,
              ...(DOCSBLOCK_D_PLACEHOLDER_REGEX.test(body) ? {} : { markdown: body }),
            })
          : rawPlaceholder(blocks, calloutSource.slice(range.start, range.end)))(
        parseMarkdown(body, options, blocks),
      ) +
      calloutSource.slice(range.end);
  }
  const fencedMath = shieldCodeFences(calloutSource);
  let source = fencedMath.restore(
    fencedMath.source.replace(TerraQualityRegex.REGEX_S_N_S_S_S_GM_REGEX(), (raw, code: string) =>
      enabled(options, 'math')
        ? richPlaceholder(blocks, {
            _type: 'math',
            code: code.trim(),
            inline: false,
            markdown: raw,
          })
        : rawPlaceholder(blocks, raw),
    ),
  );
  if (inlineMath) {
    const fences = codeFenceRanges(source);
    let fenceIndex = 0;
    let output = '';
    let cursor = 0;
    let index = 0;
    while (index < source.length) {
      while (fenceIndex < fences.length && index >= fences[fenceIndex]!.end) fenceIndex += 1;
      const fence = fences[fenceIndex];
      if (fence && index >= fence.start && index < fence.end) {
        index = fence.end;
        continue;
      }

      if (source[index] === '`' && source[index - 1] !== '\\') {
        const marker = source.slice(index).match(SHARED_REGEX)?.[0];
        const end = marker ? source.indexOf(marker, index + marker.length) : -1;
        if (marker && end !== -1) {
          index = end + marker.length;
          continue;
        }
      }

      if (source[index] !== '$' || source[index - 1] === '\\') {
        index += 1;
        continue;
      }
      if (source[index + 1] === '$') {
        const end = source.indexOf('$$', index + 2);
        if (end !== -1) {
          index = end + 2;
          continue;
        }
        index += 2;
        continue;
      }

      let end = index + 1;
      while (end < source.length && source[end] !== '\n') {
        if (source[end] === '$' && source[end - 1] !== '\\' && source[end + 1] !== '$') break;
        end += 1;
      }
      if (end >= source.length || source[end] !== '$' || end === index + 1) {
        index += 1;
        continue;
      }

      output +=
        source.slice(cursor, index) + encodeInlineMathPlaceholder(source.slice(index + 1, end));
      index = end + 1;
      cursor = index;
    }
    source = output + source.slice(cursor);
  }
  const result: RichBlock[] = [];
  for (const token of marked.lexer(source, { gfm: true }) as Token[]) {
    if (token.type === 'space') continue;
    const marker = token.raw.trim().match(/^DOCSBLOCK(\d+)PLACEHOLDER$/);
    if (marker) {
      const block = blocks[Number(marker[1])];
      if (block) result.push(block);
      continue;
    }
    if (token.type === 'heading') {
      const depth = token.depth ?? 2;
      result.push(
        textBlock(
          depth === 1 ? 'normal' : `h${Math.min(6, depth)}`,
          token.tokens,
          token.text ?? '',
          inlineMath,
        ),
      );
      continue;
    }
    if (token.type === 'paragraph') {
      const img =
        token.tokens?.length === 1 && token.tokens[0]?.type === 'image'
          ? token.tokens[0]
          : undefined;
      if (img && enabled(options, 'docImage')) {
        result.push({
          _type: 'docImage',
          _key: key(),
          alt: img.text ?? '',
          url: img.href ?? '',
          ...(img.title ? { title: img.title } : {}),
          markdown: token.raw,
        });
        continue;
      }
      if (token.tokens?.some((child) => child.type === 'image')) {
        result.push({ _type: 'raw', _key: key(), markdown: token.raw });
        continue;
      }
      const pendingInline = [...(token.tokens ?? [])].reverse();
      let unsupportedInlineHtml = false;
      while (pendingInline.length && !unsupportedInlineHtml) {
        const child = pendingInline.pop()!;
        if (child.type === 'html') {
          unsupportedInlineHtml =
            !/^<\/?(?:u|ins|s|del|strike|em|i|strong|b|code)\s*>$/i.test(child.raw) &&
            !BR_S_I_REGEX.test(child.raw);
        } else if (child.tokens) {
          for (let index = child.tokens.length - 1; index >= 0; index -= 1)
            pendingInline.push(child.tokens[index]!);
        }
      }
      if (unsupportedInlineHtml) {
        result.push({ _type: 'raw', _key: key(), markdown: token.raw });
        continue;
      }
      const displayMath = token.raw.trim().match(/^\$\$\s*([\s\S]*?)\s*\$\$$/);
      if (displayMath && enabled(options, 'math')) {
        result.push({
          _type: 'math',
          _key: key(),
          code: displayMath[1] ?? '',
          inline: false,
          markdown: token.raw,
        });
        continue;
      }
      result.push(textBlock('normal', token.tokens, token.text ?? '', inlineMath));
      continue;
    }
    if (token.type === 'blockquote') {
      const paragraphs: Token[] = [];
      const pendingParagraphs = [...(token.tokens ?? [])].reverse();
      while (pendingParagraphs.length) {
        const child = pendingParagraphs.pop()!;
        if ((child.type === 'paragraph' || child.type === 'heading') && child.tokens) {
          for (let index = child.tokens.length - 1; index >= 0; index -= 1)
            pendingParagraphs.push(child.tokens[index]!);
        } else paragraphs.push(child);
      }
      result.push(textBlock('blockquote', paragraphs, token.text ?? '', inlineMath));
      continue;
    }
    if (token.type === 'list') {
      const listBlocks: RichBlock[] = [];
      const pendingLists: { token: Token; itemIndex: number; level: number }[] = [
        { token, itemIndex: 0, level: 1 },
      ];
      while (pendingLists.length) {
        const list = pendingLists.pop()!;
        const items = Array.isArray(list.token.items) ? list.token.items : [];
        if (list.itemIndex >= items.length) continue;
        pendingLists.push({ ...list, itemIndex: list.itemIndex + 1 });
        const item = items[list.itemIndex]!;
        const bodyTokens: Token[] = [];
        const nestedLists: Token[] = [];
        for (const child of Array.isArray(item.tokens) ? item.tokens : []) {
          if (child.type === 'list') {
            nestedLists.push(child);
            continue;
          }
          if (bodyTokens.length) bodyTokens.push({ type: 'text', raw: '\n', text: '\n' });
          bodyTokens.push(
            ...((child.type === 'text' || child.type === 'paragraph') && Array.isArray(child.tokens)
              ? child.tokens
              : [child]),
          );
        }
        const markDefs: { _type: 'link'; _key: string; href: string }[] = [];
        let children = inline(
          bodyTokens,
          markDefs,
          options.inlineMath !== false && options.math !== false,
        );
        if (item.task)
          children = [span(item.checked ? '[x] ' : '[ ] '), ...children] as typeof children;
        if (children.length) {
          listBlocks.push({
            _type: 'block',
            _key: key(),
            style: 'normal',
            listItem: list.token.ordered ? 'number' : 'bullet',
            level: list.level,
            markDefs,
            children,
          });
        } else {
          listBlocks.push({ _type: 'raw', _key: key(), markdown: item.raw });
        }
        for (let index = nestedLists.length - 1; index >= 0; index -= 1)
          pendingLists.push({ token: nestedLists[index]!, itemIndex: 0, level: list.level + 1 });
      }
      result.push(...listBlocks);
      continue;
    }
    if (token.type === 'table') {
      if (enabled(options, 'table')) {
        const table = tableBlock([token.header ?? [], ...(token.rows ?? [])], token.raw, options);
        if (table) {
          result.push(table);
          continue;
        }
      }
      result.push({ _type: 'raw', _key: key(), markdown: token.raw });
      continue;
    }
    if (token.type === 'html') {
      const tableSource = enabled(options, 'table')
        ? token.raw.match(/<table\b[^>]*>[\s\S]*?<\/table\s*>/i)?.[0]
        : undefined;
      if (tableSource) {
        result.push(
          ((rows: RichBlock[][]) => ({
            _type: 'table',
            _key: key(),
            header: 'Table',
            markdown: restoreInlineMathPlaceholders(tableSource),
            rows: rows.map((cells) => ({ _type: 'row', _key: key(), cells })),
          }))(
            [...tableSource.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi)].map((row) =>
              [...(row[1] ?? '').matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)\s*>/gi)].map(
                (cell) => {
                  const html = cell[1] ?? '';
                  const inlineMath = options.inlineMath !== false && options.math !== false;
                  const stack: { name: string; close: string }[] = [];
                  const tagPattern = /<!--[\s\S]*?-->|<\/?([A-Za-z][A-Za-z0-9:-]*)\b([^>]*?)>/g;
                  let markdown = '';
                  let copiedUntil = 0;
                  let match: RegExpExecArray | null;
                  while ((match = tagPattern.exec(html))) {
                    const index = match.index ?? 0;
                    const raw = match[0];
                    const name = match[1]?.toLowerCase();
                    if (!name) {
                      markdown += escapeHtmlTableText(html.slice(copiedUntil, index), inlineMath);
                      copiedUntil = index + raw.length;
                      continue;
                    }
                    const selfClosing = /\/\s*>$/.test(raw);
                    const attrs = match[2] ?? '';
                    markdown += escapeHtmlTableText(html.slice(copiedUntil, index), inlineMath);
                    copiedUntil = tagPattern.lastIndex;

                    if (/^<\//.test(raw)) {
                      const openIndex = stack.map((tag) => tag.name).lastIndexOf(name);
                      if (openIndex >= 0) {
                        for (let position = stack.length - 1; position >= openIndex; position -= 1)
                          markdown += stack.pop()!.close;
                      }
                      continue;
                    }
                    if (name === 'br') {
                      markdown += '\n';
                      continue;
                    }
                    if (name === 'img') {
                      const alt = htmlAttr(attrs, 'alt') ?? 'image';
                      const src = htmlAttr(attrs, 'src') ?? '';
                      const escapedTitle = htmlAttr(attrs, 'title')
                        ?.replace(G_REGEX(), '\\\\')
                        .replace(G_CLASS_2_3(), '\\"');
                      markdown += src
                        ? `![${escapeMarkdownText(alt)}](${markdownDestination(src)}${escapedTitle ? ` "${escapedTitle}"` : ''})`
                        : escapeMarkdownText(alt);
                      continue;
                    }
                    if (name === 'code') {
                      // Code content is opaque; preserve punctuation and decode the deeply escaped export text.
                      const closeTag = /<\/code\s*>/gi;
                      closeTag.lastIndex = copiedUntil;
                      const close = closeTag.exec(html);
                      if (close) {
                        markdown += markdownCodeSpan(
                          decodeHtmlRepeated(html.slice(copiedUntil, close.index)),
                        );
                        copiedUntil = closeTag.lastIndex;
                        tagPattern.lastIndex = copiedUntil;
                      } else markdown += escapeMarkdownText(raw);
                      continue;
                    }
                    let open = '';
                    let close = '';
                    if (name === 'a') {
                      const href = htmlAttr(attrs, 'href');
                      if (href) [open, close] = ['[', `](${markdownDestination(href)})`];
                    } else if (name === 'strong' || name === 'b') [open, close] = ['**', '**'];
                    else if (name === 'em' || name === 'i') [open, close] = ['*', '*'];
                    else if (name === 's' || name === 'del' || name === 'strike')
                      [open, close] = ['~~', '~~'];
                    else if (name === 'p' || name === 'div') [open, close] = ['\n\n', '\n\n'];
                    else if (name === 'li') [open, close] = ['\n- ', '\n'];
                    else if (name === 'pre') [open, close] = ['\n\n```\n', '\n```\n\n'];
                    markdown += open;
                    if (open && !selfClosing) stack.push({ name, close });
                    else if (
                      (name === 'p' || name === 'div' || name === 'li' || name === 'pre') &&
                      !selfClosing
                    )
                      stack.push({ name, close });
                  }
                  markdown += escapeHtmlTableText(html.slice(copiedUntil), inlineMath);
                  while (stack.length) markdown += stack.pop()!.close;
                  markdown = markdown.replace(N_3_G_REGEX(), '\n\n').trim();
                  const cellBlocks: RichBlock[] = [];
                  let cellMarkdown = markdown.replace(
                    /DOCSBLOCK(\d+)PLACEHOLDER/g,
                    (placeholder, indexText: string) => {
                      const original = blocks[Number(indexText)];
                      return original ? richPlaceholder(cellBlocks, original) : placeholder;
                    },
                  );
                  if (enabled(options, 'docImage')) {
                    const imgs: Token[] = [];
                    const pending: { token: Token; insideLink: boolean }[] = [];
                    for (const imageToken of [
                      ...(marked.lexer(cellMarkdown, { gfm: true }) as Token[]),
                    ].reverse())
                      pending.push({ token: imageToken, insideLink: false });
                    while (pending.length) {
                      const { token: imageToken, insideLink } = pending.pop()!;
                      if (imageToken.type === 'image' && !insideLink) imgs.push(imageToken);
                      else if (imageToken.tokens)
                        for (const child of [...imageToken.tokens].reverse())
                          pending.push({
                            token: child,
                            insideLink: insideLink || imageToken.type === 'link',
                          });
                    }

                    let cursor = 0;
                    for (const imageToken of imgs) {
                      const raw = imageToken.raw;
                      const index = cellMarkdown.indexOf(raw, cursor);
                      if (index < 0 || typeof imageToken.href !== 'string') continue;
                      const placeholder = richPlaceholder(cellBlocks, {
                        _type: 'docImage',
                        _key: key(),
                        alt: imageToken.text ?? '',
                        url: imageToken.href,
                        ...(imageToken.title ? { title: imageToken.title } : {}),
                        markdown: raw,
                      } satisfies RichBlock);
                      cellMarkdown =
                        cellMarkdown.slice(0, index) +
                        placeholder +
                        cellMarkdown.slice(index + raw.length);
                      cursor = index + placeholder.length;
                    }
                  }
                  return {
                    _type: 'cell',
                    _key: key(),
                    content: parseMarkdown(cellMarkdown, options, cellBlocks),
                  };
                },
              ),
            ),
          ),
        );
        // Each HTML table cell has its own placeholder registry and nested parse.
      } else result.push({ _type: 'raw', _key: key(), markdown: token.raw });
      continue;
    }
    if (token.type === 'code') {
      if (enabled(options, 'code'))
        result.push({
          _type: 'code',
          _key: key(),
          language: token.lang ?? '',
          value: token.text ?? '',
        });
      else result.push({ _type: 'raw', _key: key(), markdown: token.raw });
      continue;
    }
    result.push({ _type: 'raw', _key: key(), markdown: token.raw });
  }
  return result as DocsValue;
}

function onlyOwnFields(value: Record<string, unknown>, fields: string[]): boolean {
  return Object.keys(value).every((name) => fields.includes(name));
}

function markdownInlineBlock(block: RichBlock): boolean {
  if (
    !onlyOwnFields(block, ['_type', '_key', 'style', 'listItem', 'level', 'markDefs', 'children'])
  )
    return false;
  if (
    !['normal', 'blockquote', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(
      String(block.style ?? 'normal'),
    )
  )
    return false;
  if (block.listItem !== undefined && block.listItem !== 'bullet' && block.listItem !== 'number')
    return false;
  if (block.level !== undefined && (!Number.isInteger(block.level) || Number(block.level) < 1))
    return false;
  const links = new Set<string>();
  for (const definition of Array.isArray(block.markDefs) ? block.markDefs : []) {
    if (!definition || typeof definition !== 'object') return false;
    const mark = definition as Record<string, unknown>;
    if (
      !onlyOwnFields(mark, ['_type', '_key', 'href']) ||
      mark._type !== 'link' ||
      typeof mark._key !== 'string' ||
      typeof mark.href !== 'string'
    )
      return false;
    links.add(mark._key);
  }
  return (Array.isArray(block.children) ? block.children : []).every((child) => {
    if (!child || typeof child !== 'object') return false;
    const value = child as Record<string, unknown>;
    if (value._type === 'span') {
      return (
        onlyOwnFields(value, ['_type', '_key', 'text', 'marks']) &&
        typeof value.text === 'string' &&
        Array.isArray(value.marks) &&
        (value.marks as unknown[]).every(
          (mark) =>
            typeof mark === 'string' &&
            (['strong', 'em', 'strike-through', 'underline', 'code'].includes(mark) ||
              links.has(mark)),
        )
      );
    }
    return (
      value._type === 'math' &&
      onlyOwnFields(value, ['_type', '_key', 'code', 'inline']) &&
      typeof value.code === 'string' &&
      !R_N_CLASS_2.test(value.code) &&
      value.inline === true
    );
  });
}

function blockContentToMarkdown(block: RichBlock): string {
  const markDefs = new Map(
    (Array.isArray(block.markDefs) ? block.markDefs : [])
      .filter(
        (mark): mark is { _key: string; _type: string; href: string } =>
          typeof mark === 'object' && mark !== null && '_key' in mark && 'href' in mark,
      )
      .map((mark) => [mark._key, mark.href]),
  );
  const children = Array.isArray(block.children)
    ? (block.children as { _type?: string; text?: string; marks?: string[]; code?: string }[])
    : [];
  const readable = children
    .map((child) => {
      if (child._type === 'math') return '$' + String(child.code ?? '') + '$';
      const marks = child.marks ?? [];
      let text = marks.includes('code')
        ? markdownCodeSpan(child.text ?? '')
        : escapeMarkdownText(child.text ?? '');
      for (const mark of marks) {
        if (mark === 'strong') text = '**' + text + '**';
        else if (mark === 'em') text = '*' + text + '*';
        else if (mark === 'strike-through') text = '~~' + text + '~~';
        else if (mark === 'underline') text = '<u>' + text + '</u>';
        else if (mark !== 'code' && markDefs.has(mark))
          text = '[' + text + '](' + markdownDestination(markDefs.get(mark) ?? '') + ')';
      }
      return text;
    })
    .join('');
  if (children.every((child) => child._type === 'span' && !child.marks?.length)) return readable;
  if (inlineMarkdownRoundTrips(children, readable, markDefs)) return readable;

  const preserved = children
    .map((child) => {
      if (child._type === 'math') return '$' + String(child.code ?? '') + '$';
      const marks = child.marks ?? [];
      let text = marks.includes('code')
        ? '<code>' +
          (child.text ?? '').replace(/[&<>`*_\x5B\x5D\\!$|~\r\n]/g, (character) => {
            switch (character) {
              case '&':
                return '&amp;';
              case '<':
                return '&lt;';
              case '>':
                return '&gt;';
              case '`':
                return '&#96;';
              case '*':
                return '&#42;';
              case '_':
                return '&#95;';
              case '[':
                return '&#91;';
              case ']':
                return '&#93;';
              case '\\':
                return '&#92;';
              case '!':
                return '&#33;';
              case '$':
                return '&#36;';
              case '|':
                return '&#124;';
              case '~':
                return '&#126;';
              case '\r':
                return '&#13;';
              default:
                return '&#10;';
            }
          }) +
          '</code>'
        : escapeMarkdownText(child.text ?? '');
      for (const mark of marks) {
        if (mark === 'strong') text = '<strong>' + text + '</strong>';
        else if (mark === 'em') text = '<em>' + text + '</em>';
        else if (mark === 'strike-through') text = '<s>' + text + '</s>';
        else if (mark === 'underline') text = '<u>' + text + '</u>';
        else if (mark !== 'code' && markDefs.has(mark))
          text = '[' + text + '](' + markdownDestination(markDefs.get(mark) ?? '') + ')';
      }
      return text;
    })
    .join('');
  if (!inlineMarkdownRoundTrips(children, preserved, markDefs))
    throw new Error(
      'Portable Text inline marks cannot be represented without changing their structure.',
    );
  return preserved;
}

function inlineMarkdownRoundTrips(
  children: { _type?: string; text?: string; marks?: string[]; code?: string }[],
  markdown: string,
  sourceMarkDefs: Map<string, string>,
): boolean {
  if (
    markdown.length === 0 &&
    children.length === 1 &&
    children[0]?._type === 'span' &&
    children[0].text === '' &&
    !children[0].marks?.length
  )
    return true;
  const sentinel = 'CodexInlineSentinel';
  const parsedBlocks = parseMarkdown(sentinel + markdown, {}, []);
  if (parsedBlocks.length !== 1 || !('children' in parsedBlocks[0]!)) return false;
  const parsedBlock = parsedBlocks[0] as RichBlock;
  const parsed = Array.isArray(parsedBlock.children)
    ? (parsedBlock.children as { _type?: string; text?: string; marks?: string[]; code?: string }[])
    : [];
  const sentinelIndex = parsed.findIndex(
    (child) => child._type === 'span' && child.text?.startsWith(sentinel) && !child.marks?.length,
  );
  if (sentinelIndex < 0) return false;
  const sentinelChild = parsed[sentinelIndex]!;
  const remainingText = String(sentinelChild.text ?? '').slice(sentinel.length);
  if (remainingText) sentinelChild.text = remainingText;
  else parsed.splice(sentinelIndex, 1);
  const signature = (
    values: { _type?: string; text?: string; marks?: string[]; code?: string }[],
    definitions: Map<string, string>,
  ) => {
    const result: ({ text: string; marks: string[] } | { math: string; inline: boolean })[] = [];
    for (const value of values) {
      if (value._type === 'math') {
        result.push({ math: String(value.code ?? ''), inline: true });
        continue;
      }
      if (value._type !== 'span') return undefined;
      const marks = (value.marks ?? [])
        .map((mark) => (definitions.has(mark) ? 'link:' + definitions.get(mark) : mark))
        .sort();
      const valueText = String(value.text ?? '');
      for (const piece of marks.includes('code')
        ? [valueText]
        : valueText.split(N_G_CLASS_2()).filter(Boolean)) {
        if (N_REGEX.test(piece)) {
          result.push({ math: piece.slice(1, -1), inline: true });
          continue;
        }
        const previous = result.at(-1);
        if (
          previous &&
          'text' in previous &&
          JSON.stringify(previous.marks) === JSON.stringify(marks)
        )
          previous.text += piece;
        else result.push({ text: piece, marks });
      }
    }
    return JSON.stringify(result);
  };
  return (
    signature(children, sourceMarkDefs) ===
    signature(
      parsed,
      new Map(
        (Array.isArray(parsedBlock.markDefs) ? parsedBlock.markDefs : [])
          .filter(
            (mark): mark is { _key: string; _type: 'link'; href: string } =>
              typeof mark === 'object' && mark !== null && '_key' in mark && 'href' in mark,
          )
          .map((mark) => [mark._key, mark.href]),
      ),
    )
  );
}

function tableDirective(block: RichBlock): string {
  const payload = stringifyYaml(block, { lineWidth: 0 }).replace(R_N_REGEX, '');
  const fence = ':'.repeat(
    Math.max(
      3,
      1 +
        Math.max(
          0,
          ...[...payload.matchAll(/^(:{3,})(?:[ \t].*)?$/gm)].map((match) => match[1]!.length),
        ),
    ),
  );
  return fence + 'docs table\n' + payload + '\n' + fence;
}

function isListBlock(block: RichBlock): boolean {
  return (
    block._type === 'block' &&
    (block.listItem === 'bullet' || block.listItem === 'number') &&
    (block.style === undefined || block.style === 'normal') &&
    markdownInlineBlock(block)
  );
}

function nestedMarkdown(block: Record<string, unknown>): string {
  // Component parsing replaces JSX blocks with placeholders before parsing nested
  // containers such as callouts and tabs. That transformed source is useful while
  // parsing, but cannot be written back to Markdown: the placeholder has meaning
  // only in the temporary parser registry. Rebuild that nested source from its
  // structured content so code, diagrams, images, and other rich blocks survive.
  if (
    typeof block.markdown === 'string' &&
    block.markdown &&
    !DOCSBLOCK_D_PLACEHOLDER_REGEX.test(block.markdown)
  )
    return block.markdown;
  return Array.isArray(block.content)
    ? docsValueToMarkdown(block.content as DocsValue).trimEnd()
    : '';
}

function emptyPortableTextParagraph(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const block = value as Record<string, unknown>;
  if (block._type !== 'block' && block._type !== 'block') return false;
  if (
    Object.keys(block).some(
      (name) => !['_type', '_key', 'style', 'markDefs', 'children'].includes(name),
    )
  )
    return false;
  if (block.listItem || (block.style !== undefined && block.style !== 'normal')) return false;
  if (Array.isArray(block.markDefs) && block.markDefs.length > 0) return false;
  if (!Array.isArray(block.children)) return false;
  return block.children.every((child) => {
    if (!child || typeof child !== 'object') return false;
    const span = child as Record<string, unknown>;
    return (
      span._type === 'span' &&
      String(span.text ?? '').trim() === '' &&
      (!Array.isArray(span.marks) || span.marks.length === 0) &&
      Object.keys(span).every((name) => ['_type', '_key', 'text', 'marks'].includes(name))
    );
  });
}

function semanticMarkdownValue(value: unknown): unknown {
  if (Array.isArray(value))
    return value.filter((i) => !emptyPortableTextParagraph(i)).map(semanticMarkdownValue);
  if (!value || typeof value !== 'object') return value;

  const block = value as Record<string, unknown>;
  const type = block._type;
  if (type === 'block' || type === 'block') {
    const definitions = new Map(
      (Array.isArray(block.markDefs) ? block.markDefs : [])
        .filter((i): i is Record<string, unknown> => Boolean(i) && typeof i === 'object')
        .map((i) => [String(i._key ?? ''), semanticMarkdownValue(i)]),
    );
    const children: unknown[] = [];
    for (const child of Array.isArray(block.children) ? block.children : []) {
      if (!child || typeof child !== 'object') {
        children.push(semanticMarkdownValue(child));
        continue;
      }
      const item = child as Record<string, unknown>;
      if (item._type !== 'span') {
        children.push(semanticMarkdownValue(item));
        continue;
      }
      const marks = (Array.isArray(item.marks) ? item.marks : [])
        .map((mark) => definitions.get(String(mark)) ?? mark)
        .map((mark) => JSON.stringify(mark))
        .sort();
      for (const piece of String(item.text ?? '')
        .split(N_G_CLASS_2())
        .filter(Boolean)) {
        if (N_REGEX.test(piece)) {
          children.push({ _type: 'math', code: piece.slice(1, -1), inline: true });
          continue;
        }
        const previous = children.at(-1) as
          { _type?: string; text?: string; marks?: string[] } | undefined;
        if (previous?._type === 'span' && JSON.stringify(previous.marks) === JSON.stringify(marks))
          previous.text = String(previous.text ?? '') + piece;
        else children.push({ _type: 'span', text: piece, marks });
      }
    }
    return {
      ...Object.fromEntries(
        Object.entries(block)
          .filter(
            ([name]) =>
              ![
                '_type',
                '_key',
                '_rev',
                '_createdAt',
                '_updatedAt',
                '_system',
                'style',
                'listItem',
                'level',
                'markDefs',
                'children',
              ].includes(name),
          )
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([name, i]) => [name, semanticMarkdownValue(i)]),
      ),
      _type: 'textBlock',
      style: block.style ?? 'normal',
      listItem: block.listItem ?? null,
      level: block.level ?? null,
      markDefs: [...definitions.values()].map((i) => JSON.stringify(i)).sort(),
      children,
    };
  }

  // Empty, metadata-free Portable Text paragraphs have no visible Markdown
  // representation. Ignore them in all nested block arrays (including callouts
  // and table cells), while retaining the original records in the source archive.
  return ((nestedContent) =>
    Object.fromEntries(
      Object.entries(block)
        .filter(([name]) => !['_key', '_rev', '_createdAt', '_updatedAt', '_system'].includes(name))
        .filter(([name]) => !(name === '_type' && type === 'item'))
        .filter(([name]) => !(name === 'markdown' && nestedContent))
        // Accordions and tabs can also carry an empty editor cache at the root.
        // Grouped Markdown reconstructs the item bodies directly, so this cache
        // is not source content and must not force an otherwise faithful YAML
        // fallback.
        .filter(([name]) => !(name === 'markdown' && ['accordion', 'tabs'].includes(String(type))))
        .filter(
          ([name]) =>
            !(name === 'markdown' && ['math', 'docImage', 'table'].includes(String(type))),
        )
        .filter(
          ([name]) =>
            !(name === 'markdown' && type === 'code' && ('value' in block || 'source' in block)),
        )
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, i]) => [name, semanticMarkdownValue(i)]),
    ))(Array.isArray(block.content) ? block.content : undefined);
}

function markdownPreservesValue(value: unknown, markdown: string): boolean {
  try {
    return (
      JSON.stringify(semanticMarkdownValue([value])) ===
      JSON.stringify(semanticMarkdownValue(markdownToDocsValue(markdown)))
    );
  } catch {
    return false;
  }
}

function richBlockDirective(block: RichBlock): string {
  const type = String(block._type ?? '');
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(type))
    throw new Error('Cannot serialize Docs block with an invalid type.');
  return '<DocsBlock type="' + type + '" data={' + JSON.stringify(block) + '} />';
}

function codeFence(code: string, lang: string): string {
  const tick = String.fromCharCode(96);
  const fence = tick.repeat(
    Math.max(
      3,
      1 + Math.max(0, ...(code.match(new RegExp(tick + '+', 'g')) ?? []).map((run) => run.length)),
    ),
  );
  return fence + (lang ? lang : '') + '\n' + code.replace(N_CLASS_2, '') + '\n' + fence;
}

/** Serialize readable Markdown where it is faithful and typed source where it is not. */
export function docsValueToMarkdown(value: DocsValue): string {
  const blocks = value as unknown as RichBlock[];
  const result: string[] = [];
  for (let index = 0; index < blocks.length;) {
    const item = blocks[index]!;
    if (isListBlock(item)) {
      const lines: string[] = [];
      const ordinals = new Map<number, { kind: string; count: number }>();
      while (index < blocks.length && isListBlock(blocks[index]!)) {
        const block = blocks[index]!;
        const level = Math.max(1, Number(block.level) || 1);
        for (const nestedLevel of ordinals.keys())
          if (nestedLevel > level) ordinals.delete(nestedLevel);
        const kind = String(block.listItem);
        const previous = ordinals.get(level);
        const ordinal = previous?.kind === kind ? previous.count + 1 : 1;
        ordinals.set(level, { kind, count: ordinal });
        const marker = kind === 'number' ? ordinal + '.' : '-';
        // A nested list must be indented far enough to clear the parent marker. Two spaces
        // are not enough after an ordered marker (`1. `) in CommonMark and flatten the item.
        const indentation = '   '.repeat(level - 1);
        lines.push(
          indentation +
            marker +
            ' ' +
            blockContentToMarkdown(block).replace(
              N_G_CLASS_2_3(),
              '\n' + indentation + ' '.repeat(marker.length + 1),
            ),
        );
        index += 1;
      }
      result.push(lines.join('\n'));
      continue;
    }
    index += 1;

    if (item._type === 'block') {
      if (!markdownInlineBlock(item) || item.listItem !== undefined) {
        result.push(richBlockDirective(item));
        continue;
      }
      const content = blockContentToMarkdown(item);
      const style = String(item.style ?? 'normal');
      if (TerraQualityRegex.REGEX_H_2_6_REGEX().test(style))
        result.push('#'.repeat(Number(style[1])) + ' ' + content.replace(R_N_G_REGEX(), '<br>'));
      else if (style === 'blockquote') result.push('> ' + content);
      else if (style === 'normal') result.push(content);
      else result.push(richBlockDirective(item));
      continue;
    }

    const extra = Object.keys(item).some(
      (name) =>
        ![
          '_type',
          '_key',
          ...((
            {
              raw: ['markdown'],
              code: ['markdown', 'language', 'source', 'value'],
              docImage: ['markdown', 'alt', 'url', 'title', 'width', 'height'],
              math: ['markdown', 'code', 'inline'],
              table: ['markdown', 'header', 'rows'],
              callout: ['markdown', 'kind', 'title', 'content'],
              accordion: ['markdown', 'items'],
              tabs: ['markdown', 'items'],
            } as Record<string, string[]>
          )[item._type] ?? []),
        ].includes(name),
    );

    if (item._type === 'raw' && !extra && typeof item.markdown === 'string') {
      result.push(
        markdownPreservesValue(item, item.markdown) ? item.markdown : richBlockDirective(item),
      );
      continue;
    }

    if (item._type === 'code' && !extra) {
      const lang = String(item.language ?? '');
      if (lang && !/^[A-Za-z0-9_+.-]+$/.test(lang)) {
        result.push(richBlockDirective(item));
      } else if (
        typeof item.markdown === 'string' &&
        item.markdown &&
        item.value === undefined &&
        item.source === undefined
      ) {
        result.push(
          markdownPreservesValue(item, item.markdown) ? item.markdown : richBlockDirective(item),
        );
      } else {
        const markdown = codeFence(String(item.value ?? item.source ?? ''), lang);
        result.push(markdownPreservesValue(item, markdown) ? markdown : richBlockDirective(item));
      }
      continue;
    }

    if (item._type === 'docImage' && !extra) {
      if (item.width !== undefined || item.height !== undefined) {
        result.push(richBlockDirective(item));
        continue;
      }
      result.push(
        ((url, title, alt) => {
          const markdown = '![' + alt + '](' + url + title + ')';
          return markdownPreservesValue(item, markdown) ? markdown : richBlockDirective(item);
        })(
          markdownDestination(String(item.url ?? '')),
          item.title
            ? ' "' +
                String(item.title).replace(G_REGEX(), '\\\\').replace(G_CLASS_2_3(), '\\"') +
                '"'
            : '',
          String(item.alt ?? '').replace(G_CLASS_2_3_4(), '\\]'),
        ),
      );
      continue;
    }

    if (item._type === 'math' && !extra && typeof item.code === 'string') {
      if (
        String(item.code).includes('$$') ||
        (item.inline === true && R_N_CLASS_2.test(item.code))
      ) {
        result.push(richBlockDirective(item));
      } else if (item.inline === true) {
        const markdown = '$' + item.code + '$';
        result.push(markdownPreservesValue(item, markdown) ? markdown : richBlockDirective(item));
      } else {
        const markdown = '$$\n' + item.code + '\n$$';
        result.push(markdownPreservesValue(item, markdown) ? markdown : richBlockDirective(item));
      }
      continue;
    }

    if (item._type === 'table') {
      const markdown = ((block: RichBlock, rows: Record<string, unknown>[]) =>
        ((fallback: string) => {
          if (!rows.length) return fallback;
          const colCounts = rows.map((row) => (Array.isArray(row.cells) ? row.cells.length : 0));
          if (
            ((simpleRows) =>
              !onlyOwnFields(block, ['_type', '_key', 'header', 'rows', 'markdown']) ||
              !simpleRows)(
              colCounts.every((count) => count === colCounts[0]) &&
                rows.every((row) => {
                  if (row._type !== 'row' || !onlyOwnFields(row, ['_type', '_key', 'cells']))
                    return false;
                  return (
                    Array.isArray(row.cells) &&
                    row.cells.every((cell) => {
                      if (!cell || typeof cell !== 'object') return false;
                      const value = cell as Record<string, unknown>;
                      if (
                        !onlyOwnFields(value, ['_type', '_key', 'content', 'markdown']) ||
                        value._type !== 'cell'
                      )
                        return false;
                      if (typeof value.markdown === 'string' && value.markdown)
                        return !value.markdown.includes('\n');
                      if (!Array.isArray(value.content)) return false;
                      return value.content.every((content) => {
                        if (!content || typeof content !== 'object') return false;
                        const paragraph = content as RichBlock;
                        if (!(
                          (paragraph._type === 'docImage' &&
                            onlyOwnFields(paragraph as Record<string, unknown>, [
                              '_type',
                              '_key',
                              'alt',
                              'url',
                              'title',
                              'markdown',
                            ]) &&
                            typeof paragraph.url === 'string') ||
                          (paragraph._type === 'block' &&
                            markdownInlineBlock(paragraph) &&
                            !paragraph.listItem &&
                            (paragraph.style === undefined || paragraph.style === 'normal'))
                        ))
                          return false;
                        try {
                          if (paragraph._type !== 'docImage') blockContentToMarkdown(paragraph);
                          return true;
                        } catch {
                          return false;
                        }
                      });
                    })
                  );
                }),
            )
          )
            return tableDirective({
              _type: 'table',
              ...Object.fromEntries(
                Object.entries(block as Record<string, unknown>).filter(
                  ([name]) => !['_type', '_key', 'rows', 'markdown'].includes(name),
                ),
              ),
              _docsCellFormat: 'markdown-v1',
              rows: rows.map((row) => ({
                ...Object.fromEntries(
                  Object.entries(row).filter(
                    ([name]) => !['_type', '_key', 'cells'].includes(name),
                  ),
                ),
                cells: (Array.isArray(row.cells) ? row.cells : []).map((cell) => {
                  if (!cell || typeof cell !== 'object') return cell;
                  const value = cell as Record<string, unknown>;
                  return {
                    ...Object.fromEntries(
                      Object.entries(value).filter(
                        ([name]) => !['_type', '_key', 'content', 'markdown'].includes(name),
                      ),
                    ),
                    markdown: Array.isArray(value.content)
                      ? docsValueToMarkdown(value.content as DocsValue).trimEnd()
                      : typeof value.markdown === 'string'
                        ? value.markdown.trimEnd()
                        : '',
                  };
                }),
              })),
            });

          const cells = rows.map((row) =>
            (Array.isArray(row.cells) ? row.cells : []).map((cell) => {
              const value =
                cell && typeof cell === 'object' ? (cell as Record<string, unknown>) : {};
              const protectedParts: string[] = [];
              const protect = (source: string) => {
                protectedParts.push(source);
                return `DOCSTABLEPROTECTED${protectedParts.length - 1}TOKEN`;
              };
              return (
                typeof value.markdown === 'string' && value.markdown
                  ? value.markdown
                  : Array.isArray(value.content)
                    ? value.content
                        .map((block) => {
                          if (emptyPortableTextParagraph(block)) return '';
                          return docsValueToMarkdown([block] as DocsValue)
                            .replace(R_N_CLASS_2_3, '')
                            .replace(R_N_G_REGEX(), '<br>');
                        })
                        .join('<br data-docs-paragraph-break>')
                    : ''
              )
                .replace(/\[[^\]]*\]\((?:<[^>]*>|[^)]*)\)/g, protect)
                .replace(/(`+)[\s\S]*?\1/g, protect)
                .replace(/\b((?:https?|ftp)):\/\//gi, '$1&#58;//')
                .replace(/\b(www)\./gi, '$1&#46;')
                .replace(/\b([A-Z0-9._%+-]+)@([A-Z0-9.-]+\.[A-Z]{2,})\b/gi, '$1&#64;$2')
                .replace(
                  /DOCSTABLEPROTECTED(\d+)TOKEN/g,
                  (_match, i: string) => protectedParts[Number(i)] ?? _match,
                )
                .replace(/\|/g, '\\|')
                .replace(N_G_CLASS_2_3(), '<br>');
            }),
          );
          const width = Math.max(1, ...cells.map((row) => row.length));
          const padded = cells.map((row) =>
            Array.from({ length: width }, (_cell, i) => row[i] ?? ''),
          );
          const markdown = [
            '| ' + (padded[0] ?? Array.from({ length: width }, () => '')).join(' | ') + ' |',
            '| ' + Array.from({ length: width }, () => '---').join(' | ') + ' |',
            ...padded.slice(1).map((row) => '| ' + row.join(' | ') + ' |'),
          ].join('\n');
          const caption = String(block.header ?? 'Table');
          return caption !== 'Table'
            ? ':::docs table[' + encodeURIComponent(caption) + ']\n' + markdown + '\n:::'
            : markdown;
        })(tableDirective(block)))(
        item,
        Array.isArray(item.rows) ? (item.rows as Record<string, unknown>[]) : [],
      );
      result.push(markdownPreservesValue(item, markdown) ? markdown : tableDirective(item));
      continue;
    }

    if (item._type === 'callout' && !extra) {
      const kind = String(item.kind ?? 'info');
      const title = String(item.title ?? kind);
      const content = nestedMarkdown(item).replace(N_CLASS_2, '');
      const asideType = ({ info: 'note', error: 'danger' } as Record<string, string>)[kind] ?? kind;
      if (
        ['note', 'tip', 'caution', 'danger', 'example', 'warning'].includes(asideType) &&
        !/[\]\r\n]/.test(title)
      ) {
        const fence = ':'.repeat(
          Math.max(
            3,
            1 +
              Math.max(
                0,
                ...[...content.matchAll(/^(:+)(?:[ \t].*)?$/gm)].map((match) => match[1]!.length),
              ),
          ),
        );
        const opening = fence + asideType + '[' + title + ']';
        // Aside bodies are Markdown content, so serialize them with the
        // Starlight aside syntax even when parsing the body normalizes its
        // internal representation (for example, a cached `markdown` field).
        result.push(
          content ? opening + '\n\n' + content + '\n\n' + fence : opening + '\n\n' + fence,
        );
      } else {
        result.push(richBlockDirective(item));
      }
      continue;
    }

    if ((item._type === 'accordion' || item._type === 'tabs') && !extra) {
      const entries = Array.isArray(item.items) ? (item.items as Record<string, unknown>[]) : [];
      if (
        !entries.every(
          (entry) =>
            onlyOwnFields(entry, ['_type', '_key', 'title', 'markdown', 'content']) &&
            (entry._type === undefined || entry._type === 'item') &&
            (entry.markdown === undefined || typeof entry.markdown === 'string') &&
            (entry.content === undefined || Array.isArray(entry.content)),
        ) ||
        !entries.length
      ) {
        result.push(richBlockDirective(item));
        continue;
      }
      const delimiter = item._type === 'accordion' ? '===' : '|||';
      // Grouped Markdown supports nested typed blocks. Keep ordinary text,
      // tables, callouts, code, and other nested content readable instead of
      // wrapping the entire accordion or tab tree in YAML. Portable Text keys
      // are editor identity metadata; Markdown round trips intentionally mint
      // new keys while preserving the document structure and content.
      result.push(
        entries
          .map(
            (entry) =>
              delimiter +
              ' [' +
              (typeof entry.title === 'string' ? entry.title : 'Item').replace(
                G_CLASS_2_3_4(),
                '\\]',
              ) +
              ']\n' +
              nestedMarkdown(entry).replace(N_CLASS_2, '') +
              '\n' +
              delimiter,
          )
          .join('\n\n'),
      );
      continue;
    }

    if (item._type === 'nodes' && !extra) {
      result.push(
        '<Nodes ' +
          Object.entries({
            ...Object.fromEntries(
              Object.entries(item).filter(
                ([name]) => !['_type', '_key', 'nodes', 'edges'].includes(name),
              ),
            ),
            nodes: item.nodes ?? [],
            edges: item.edges ?? [],
          })
            .map(([name, value]) => name + '={' + JSON.stringify(value) + '}')
            .join(' ') +
          ' />',
      );
      continue;
    }

    if (item._type === 'code' && !extra) {
      result.push(codeFence(String(item.value ?? item.source ?? ''), String(item.language ?? '')));
      continue;
    }

    if (item._type === 'embed' && !extra) {
      result.push(
        '<Embed ' +
          Object.entries(item)
            .filter(([name]) => !['_type', '_key'].includes(name))
            .map(
              ([name, value]) =>
                name +
                '="' +
                String(value).replace(G_CLASS_2(), '&amp;').replace(G_CLASS_2_3(), '&quot;') +
                '"',
            )
            .join(' ') +
          ' />',
      );
      continue;
    }

    if (item._type === 'quiz' && !extra) result.push('<Quiz />');
    else result.push(richBlockDirective(item));
  }
  return result.join('\n\n').replace(N_3_G_REGEX(), '\n\n').replace(R_N_CLASS_2_3, '') + '\n';
}

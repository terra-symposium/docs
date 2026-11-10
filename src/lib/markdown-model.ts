/**
 * src/lib/markdown-model.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { enabledDocsBlocks } from './block-types.js';
import { marked } from 'marked';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

// COMPONENTS
import * as TerraQualityRegex from './terra/regex.mjs';

// TYPES
import type { DocsBlockOptions, RichBlock } from './block-types.js';
import type { DocsValue } from '../components/Docs.js';

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

/**
 * Provides the matcher used to escape backslashes in generated Markdown or JSX.
 * @returns A fresh global regular expression for literal backslashes.
 */
const G_REGEX = () => /\\/g;
/**
 * Provides the matcher for hexadecimal inline-math placeholders produced by this module.
 * @returns A fresh case-insensitive expression matching `DOCSMATH…END` placeholders.
 */
const DOCSMATH_0_9A_F_END_GI_REGEX = () => /DOCSMATH[0-9a-f]+END/gi;
/**
 * Provides the matcher for unescaped dollar-delimited inline-math source.
 * @returns A fresh global expression capturing non-empty math text without newline characters.
 */
const N_G_REGEX = () => /(?<!\\)\$([^$\n]+)\$/g;
const BR_S_I_REGEX = /^<br\s*\/?>$/i;
/**
 * Provides the matcher that separates dollar-delimited math from surrounding token text.
 * @returns A fresh global expression capturing a complete single-line `$...$` span.
 */
const N_G_CLASS_2 = () => /(\$[^$\n]+\$)/g;
const N_REGEX = /^\$[^$\n]+\$$/;
const R_N_REGEX = /\r?\n$/;
const SHARED_REGEX = /^`+/;
const S_REGEX = /\s/;
const S_CLASS_2 = /\/\s*$/;
/**
 * Provides the shared ampersand matcher used when escaping embedded HTML.
 * @returns A fresh global expression matching ampersands.
 */
const G_CLASS_2 = () => TerraQualityRegex.REGEX_G_REGEX_17();
const DOCSBLOCK_D_PLACEHOLDER_REGEX = /DOCSBLOCK\d+PLACEHOLDER/;
/**
 * Provides the shared double-quote matcher used when generating JSX attributes.
 * @returns A fresh global expression matching double quotes.
 */
const G_CLASS_2_3 = () => TerraQualityRegex.REGEX_G_REGEX_5();
/**
 * Provides the matcher used to reduce runs of three or more newlines to paragraph spacing.
 * @returns A fresh global expression matching newline runs of at least three characters.
 */
const N_3_G_REGEX = () => /\n{3,}/g;
const R_N_CLASS_2 = /[$\r\n]/;
const R_N_CLASS_2_3 = /(?:\r?\n)+$/;
/**
 * Provides the matcher used to normalize CRLF and LF line endings.
 * @returns A fresh global expression matching either line-ending form.
 */
const R_N_G_REGEX = () => /\r?\n/g;
/**
 * Provides the shared newline matcher used to split rendered content.
 * @returns A fresh global expression matching newline characters.
 */
const N_G_CLASS_2_3 = () => TerraQualityRegex.REGEX_N_G_REGEX_3();
const N_CLASS_2 = /\n+$/;
/**
 * Provides the matcher used to unescape closing square brackets in generated Markdown.
 * @returns A fresh global expression matching `\]`.
 */
const G_CLASS_2_3_4 = () => /\]/g;
/**
 * Creates the unique key stored on a Portable Text node or mark definition.
 * @returns A UUID suitable for identifying one parsed value object.
 */
const key = () => crypto.randomUUID();

/**
 * Marked token fields used while translating Markdown into the Docs value model.
 */
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
/**
 * Encodes inline math as hexadecimal text so Marked can tokenize surrounding Markdown safely.
 * @param code Math source without its dollar delimiters.
 * @returns A placeholder containing six hexadecimal digits for each Unicode code point.
 */
function encodeInlineMathPlaceholder(code: string): string {
  return `DOCSMATH${Array.from(code, (c) =>
    (c.codePointAt(0) ?? 0).toString(16).padStart(6, '0'),
  ).join('')}END`;
}
/**
 * Decodes a math placeholder, rejecting malformed lengths and invalid Unicode code points.
 * @param value Candidate placeholder text.
 * @returns Decoded math source, or `undefined` when the value is not a valid placeholder.
 */
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
/**
 * Replaces valid encoded math placeholders with their original `$...$` Markdown form.
 * @param value Markdown string that may contain encoded inline math.
 * @returns The string with valid placeholders restored and invalid placeholders preserved.
 */
function restoreInlineMathPlaceholders(value: string): string {
  return value.replace(DOCSMATH_0_9A_F_END_GI_REGEX(), (p) => {
    const code = decodeInlineMathPlaceholder(p);
    return code === undefined ? p : `$${code}$`;
  });
}
/**
 * Creates a keyed Portable Text span carrying text and its inline formatting marks.
 * @param text Span content.
 * @param marks Formatting marks or link keys attached to the span.
 * @returns A span object suitable for a Docs text block's children.
 */
function span(text: string, marks: string[] = []) {
  return { _type: 'span', _key: key(), text, marks };
}
/**
 * Converts Marked inline tokens into Portable Text spans and inline math blocks.
 * @param tokens Marked tokens to translate.
 * @param markDefs Link definitions collected while visiting the tokens.
 * @param inlineMath Whether dollar-delimited math should become math blocks.
 * @param inheritedMarks Marks applied by a parent emphasis or link token.
 * @returns Ordered text and math nodes preserving supported formatting and links.
 */
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
  /**
   * Adds one inline mark to spans while leaving math nodes untouched.
   * @param items Parsed text and inline-math nodes to update.
   * @param mark Portable Text mark name to append to each text span.
   * @returns A new node list with the mark added to each span's mark array.
   */
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
      const source = run.map((t) => t.raw).join('');
      const matches = [...source.matchAll(N_G_REGEX())];
      if (!matches.length) {
        mathTokens.push(...run);
        continue;
      }
      /**
       * Copies the portion of a source range while preserving token metadata at split boundaries.
       * @param start Inclusive character offset in the concatenated text run.
       * @param end Exclusive character offset in the concatenated text run.
       */
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
          .map((p) =>
            inlineMath && N_REGEX.test(p)
              ? { _type: 'math' as const, _key: key(), code: p.slice(1, -1), inline: true as const }
              : span(p, aMarks),
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
/**
 * Builds a Portable Text paragraph with inline marks and a fallback span for empty content.
 * @param style Portable Text block style, such as `normal` or a heading style.
 * @param tokens Inline Marked tokens that supply the block's child spans.
 * @param fallback Text retained when token conversion produces no children.
 * @param inlineMath Whether math spans should be parsed inside the block.
 * @returns A keyed Portable Text block with collected link definitions and child spans.
 */
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
/**
 * Determines whether a block type is retained as a structured Docs block under the selected options.
 * @param options Feature flags controlling supported rich blocks.
 * @param type Portable Text or rich-block type being considered.
 * @returns `true` for core text blocks and enabled optional block types.
 */
function enabled(options: DocsBlockOptions, type: string): boolean {
  // Imported Portable Text paragraphs are part of the document model itself,
  // not optional rich blocks. Canonical JSON directives let local hosts retain
  // their marks and inline objects without a lossy Markdown round trip.
  if (type === 'block') return true;
  // Tabs and accordions are Markdown syntax, not structured editor blocks.
  if (type === 'accordion' || type === 'tabs') return options[type] !== false;
  return enabledDocsBlocks(options).includes(type as never);
}
/**
 * Stores a rich block for later restoration and emits its indexed Markdown placeholder.
 * @param blocks Collection used by the parser to restore opaque block payloads.
 * @param block Rich block to preserve.
 * @returns A blank-line-delimited placeholder referring to the appended block.
 */
function richPlaceholder(blocks: RichBlock[], block: RichBlock): string {
  blocks.push({ ...block, _key: block._key ?? key() });
  return `\n\nDOCSBLOCK${blocks.length - 1}PLACEHOLDER\n\n`;
}
/**
 * Preserves unsupported Markdown syntax as a raw block through the placeholder mechanism.
 * @param blocks Collection used by the parser to restore opaque block payloads.
 * @param markdown Original Markdown fragment that cannot be represented safely.
 * @returns The placeholder for the appended raw block.
 */
function rawPlaceholder(blocks: RichBlock[], markdown: string): string {
  return richPlaceholder(blocks, { _type: 'raw', markdown });
}
/** Source offsets delimiting a fenced Markdown or JSX component range. */
type SourceRange = { start: number; end: number };
/** Parsed attributes and source boundary for a component's JSX opening tag. */
type JsxOpeningTag = {
  name: string;
  attributes: Record<string, unknown>;
  end: number;
  selfClosing: boolean;
};
/**
 * Finds fenced-code ranges while treating Code components and inline code as opaque source.
 * @param source Markdown or MDX source to scan.
 * @returns Half-open source ranges for each fenced block, including an unmatched opening fence.
 */
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
/**
 * Replaces fenced examples with placeholders so later line directives cannot rewrite their contents.
 * @param source Markdown source containing code fences.
 * @returns Shielded source and a restore function that reinstates each original fence.
 */
function shieldCodeFences(source: string) {
  const ranges = codeFenceRanges(source);
  const fences = ranges.map(({ start: s, end: e }) => source.slice(s, e));
  return {
    source:
      ranges
        .map(
          ({ start: s }, i) =>
            `${source.slice(ranges[i - 1]?.end ?? 0, s)}DOCSFENCE${i}PLACEHOLDER`,
        )
        .join('') + source.slice(ranges.at(-1)?.end ?? 0),
    restore: (v: string) =>
      v.replace(/DOCSFENCE(\d+)PLACEHOLDER/g, (match, number: string) =>
        fences[Number(number)] === undefined ? match : fences[Number(number)]!,
      ),
  };
}
/**
 * Reads a balanced JSX expression while ignoring braces inside quoted strings and template literals.
 * @param source Source containing the expression.
 * @param start Offset where the opening brace is expected.
 * @returns Expression contents and the offset after its closing brace, or `undefined` if unmatched.
 */
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
/**
 * Parses the literal forms supported in a canonical JSX attribute without evaluating expressions.
 * @param source Raw attribute value or braced literal expression.
 * @returns Decoded string, number, boolean, null, JSON value, or `undefined` for unsupported syntax.
 */
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
/**
 * Reads a capitalized JSX opening tag and parses its literal attributes.
 * @param source JSX or MDX source to scan.
 * @param start Offset of the opening `<` character.
 * @returns Parsed tag name, attributes, end offset, and self-closing state; `undefined` if invalid.
 */
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
/**
 * Finds a Code component's braced template-literal body at the end of its opening tag.
 * @param source JSX source containing the Code component.
 * @param start Offset immediately after the opening tag.
 * @returns Parsed body expression offsets, or `undefined` when the body is not a template literal.
 */
function codeBodyExpr(source: string, start: number): { value: string; end: number } | undefined {
  const first = source.slice(start).match(/^\s*\{/);
  if (!first) return undefined;
  const exprStart = start + first[0].length - 1;
  return source.slice(exprStart + 1).match(/^\s*`/) ? readBracedExpr(source, exprStart) : undefined;
}
/**
 * Finds the end of a JSX component, accounting for embedded Code bodies and legacy missing closers.
 * @param source JSX or MDX source containing the component.
 * @param opening Parsed opening-tag data.
 * @returns Body end and full component end offsets, or `undefined` when no closing boundary exists.
 */
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
/**
 * Accepts an array-valued JSX attribute directly or parses a JSON-encoded array string.
 * @param value Parsed attribute value.
 * @returns An array value, or `undefined` for non-arrays and invalid JSON.
 */
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

/**
 * Replaces supported JSX component fragments while leaving code fences and structured blocks untouched.
 * @param source Markdown or MDX source to scan.
 * @param replace Callback that converts a parsed block or raw component string.
 * @returns Source with supported components replaced; returns the original source when no match exists.
 */
export function replaceCanonicalComponents(
  source: string,
  replace: (block: RichBlock | undefined, raw: string, inTable: boolean) => string,
): string {
  const fences = codeFenceRanges(source);
  const structured = [
    ...source.matchAll(/^(:{3,})docs [A-Za-z]+(?:\[[^\]\n]*\])?\s*\r?\n[\s\S]*?^\1\s*$/gm),
    ...source.matchAll(/^(:{4,})docs (?:accordion|tabs)\s*\r?\n[\s\S]*?^\1\s*$/gm),
  ]
    .map((m) => ({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length }))
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
/**
 * Decodes the numeric and named HTML entities supported by the Docs importer.
 * @param value Text containing encoded HTML entities.
 * @returns Text with recognized entities decoded and invalid numeric references preserved.
 */
function decodeHtml(value: string): string {
  return value
    .replace(/&#(\d+);?/g, (m, c: string) => {
      const point = Number(c);
      return Number.isInteger(point) && point >= 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : m;
    })
    .replace(/&#x([0-9a-f]+);?/gi, (m, c: string) => {
      const point = Number.parseInt(c, 16);
      return Number.isInteger(point) && point >= 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : m;
    })
    .replace(/&(nbsp|amp|lt|gt|quot|apos|#39);/gi, (_match, e: string) => {
      switch (e.toLowerCase()) {
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
/**
 * Repeats HTML entity decoding until the value stops changing or reaches the eight-pass limit.
 * @param value Text that may contain nested entity encoding.
 * @returns The repeatedly decoded string.
 */
function decodeHtmlRepeated(value: string): string {
  let current = value;
  for (let pass = 0; pass < 8; pass += 1) {
    const decoded = decodeHtml(current);
    if (decoded === current) break;
    current = decoded;
  }
  return current;
}
/**
 * Reads and entity-decodes one quoted or unquoted attribute from an HTML attribute string.
 * @param attrs Raw attributes between a tag name and its closing bracket.
 * @param name Attribute name to find, matched without regard to case.
 * @returns Decoded attribute value, or `undefined` when the attribute is absent.
 */
function htmlAttr(attrs: string, name: string): string | undefined {
  const match = attrs.match(
    new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'),
  );
  const value = match?.[1] ?? match?.[2] ?? match?.[3];
  return value === undefined ? undefined : decodeHtml(value);
}
/**
 * Escapes Markdown syntax in decoded text while leaving inline-math spans intact.
 * @param value Text to represent literally in Markdown.
 * @returns Markdown source with syntax characters escaped.
 */
function escapeMarkdownText(value: string): string {
  return decodeHtmlRepeated(value).replace(
    /(\$[^$\n]+\$)|([\\`*_{}\x5B\x5D#<>!$])/g,
    (_match, m: string | undefined, c: string | undefined) => m ?? `\\${c}`,
  );
}
/**
 * Encodes text as a Markdown code span using a backtick fence absent from the content.
 * @param value Literal code text.
 * @returns A code span with a safe delimiter and required edge padding.
 */
function markdownCodeSpan(value: string): string {
  const fence = '`'.repeat(1 + Math.max(0, ...[...value.matchAll(/`+/g)].map(([t]) => t.length)));
  const padding = value.startsWith('`') || value.endsWith('`') ? ' ' : '';
  return `${fence}${padding}${value}${padding}${fence}`;
}
/**
 * Encodes a link destination and wraps values containing Markdown delimiters in angle brackets.
 * @param value Raw URL or link destination.
 * @returns A Markdown-safe destination with spaces and closing angles percent-encoded.
 */
function markdownDestination(value: string): string {
  const destination = decodeHtmlRepeated(value).replace(/[>\s]/g, (c) =>
    c === '>' ? '%3E' : '%20',
  );
  return /[()[\]<>]/.test(destination) ? '<' + destination + '>' : destination;
}

/**
 * Escapes HTML table-cell text while protecting math spans from Markdown emphasis parsing.
 * @param value Raw HTML cell text.
 * @param inlineMath Whether dollar-delimited math should remain unescaped for later parsing.
 * @returns Markdown-safe cell text with any inline math represented by opaque placeholders.
 */
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
/**
 * Converts a Marked table token into the Docs table, row, cell, and nested-content model.
 * @param rows Header and body rows returned by Marked.
 * @param markdown Original table source retained for faithful round trips.
 * @param options Rich-block and math feature flags for nested cell content.
 * @param header Human-readable label assigned to the table block.
 * @returns A keyed table block, or `undefined` when there are no rows.
 */
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
    rows: rows.map((c) => ({
      _type: 'row',
      _key: key(),
      cells: c.map((cell) => {
        const contentTokens: Token[][] = [[]];
        for (const token of Array.isArray(cell.tokens) ? cell.tokens : []) {
          if (token.type === 'html' && /^<br\s+data-docs-paragraph-break\s*\/?>$/i.test(token.raw))
            contentTokens.push([]);
          else contentTokens.at(-1)!.push(token);
        }
        const inlineMath = options.inlineMath !== false && options.math !== false;
        const cellBlock: RichBlock = { _type: 'cell', _key: '' };
        cellBlock.content = contentTokens.flatMap((part) => {
          const result: RichBlock[] = [];
          let pending: Token[] = [];
          /** Converts the pending text run to one paragraph before a non-text block is emitted. */
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
          if (!result.length)
            result.push(
              textBlock(
                'normal',
                part,
                part.map((token) => token.text ?? token.raw).join('') || (cell.text ?? cell.raw),
                inlineMath,
              ),
            );
          return result;
        });
        cellBlock._key = key();
        return cellBlock;
      }),
    })),
  };
}

/**
 * Parses Markdown into Docs blocks while preserving unsupported syntax as raw blocks.
 * @param markdown Markdown source to parse.
 * @param options Feature flags for rich blocks, images, and inline math.
 * @returns Docs value blocks with supported Markdown and opaque rich content retained.
 */
export function markdownToDocsValue(markdown: string, options: DocsBlockOptions = {}): DocsValue {
  return parseMarkdown(markdown, options, []);
}
/**
 * Parses Markdown recursively, restoring protected JSX blocks, table cells, and delimiter groups.
 * @param markdown Markdown fragment at the current nesting level.
 * @param options Feature flags shared with nested content parsing.
 * @param blocks Registry of rich blocks referenced by temporary placeholders.
 * @returns Parsed Docs blocks for this fragment.
 */
function parseMarkdown(
  markdown: string,
  options: DocsBlockOptions,
  blocks: RichBlock[],
): DocsValue {
  const inlineMath = options.inlineMath !== false && options.math !== false;
  // Keep the existing typed and captioned table forms lossless; other rich
  // components use the shared JSX scanner above.
  const fencedAccordions = shieldCodeFences(
    replaceCanonicalComponents(markdown, (b, r, i) => {
      if (!b || !enabled(options, b._type)) return rawPlaceholder(blocks, r);
      if (i)
        return `<code>${String(b.value ?? b.source ?? '')
          .replace(G_CLASS_2(), '&amp;')
          .replace(TerraQualityRegex.REGEX_G_REGEX_7(), '&lt;')
          .replace(TerraQualityRegex.REGEX_G_REGEX_8(), '&gt;')}</code>`;
      return richPlaceholder(blocks, b);
    })
      .replace(
        TerraQualityRegex.REGEX_3_DOCS_TABLE_S_N_S_S_1_S_GM_REGEX(),
        (s, _fence: string, p: string) => {
          try {
            let tableData = parseYaml(p) as RichBlock;
            if (tableData?._type !== 'table') return rawPlaceholder(blocks, s);
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
              : rawPlaceholder(blocks, s);
          } catch {
            return rawPlaceholder(blocks, s);
          }
        },
      )
      .replace(
        TerraQualityRegex.REGEX_DOCS_TABLE_R_N_T_R_N_S_S_T_GM_REGEX(),
        (s, c: string, b: string) => {
          if (!enabled(options, 'table')) return rawPlaceholder(blocks, s);
          let header = c;
          try {
            header = decodeURIComponent(c);
          } catch {
            /* Keep the literal caption. */
          }
          const token = (marked.lexer(b, { gfm: true }) as Token[]).find(
            (part) => part.type === 'table',
          );
          if (!token) return rawPlaceholder(blocks, s);
          const table = tableBlock([token.header ?? [], ...(token.rows ?? [])], b, options, header);
          return table ? richPlaceholder(blocks, table) : rawPlaceholder(blocks, s);
        },
      ),
  );
  let calloutSource = fencedAccordions.restore(fencedAccordions.source);
  /** Source offsets and label for one open `|||` tab or `===` accordion section. */
  type MarkdownGroup = {
    delimiter: '===' | '|||';
    title: string;
    start: number;
    bodyStart: number;
    closeStart: number;
    end: number;
  };
  const groupStack: Omit<MarkdownGroup, 'closeStart' | 'end'>[] = [];
  const groupRanges: MarkdownGroup[] = [];
  const groupFences = codeFenceRanges(calloutSource);
  let groupFenceIndex = 0;
  let groupOffset = 0;
  while (groupOffset < calloutSource.length) {
    const newline = calloutSource.indexOf('\n', groupOffset);
    const lineEnd = newline === -1 ? calloutSource.length : newline + 1;
    const line = calloutSource.slice(groupOffset, lineEnd).replace(R_N_REGEX, '');
    while (groupFenceIndex < groupFences.length && groupOffset >= groupFences[groupFenceIndex]!.end)
      groupFenceIndex += 1;
    const fence = groupFences[groupFenceIndex];
    if (fence && groupOffset >= fence.start && groupOffset < fence.end) {
      groupOffset = lineEnd;
      continue;
    }
    const open = line.match(/^(===|\|\|\|)\s*\[([^\]\n]+)\]\s*$/);
    if (open)
      groupStack.push({
        delimiter: open[1] as MarkdownGroup['delimiter'],
        title: open[2]!.trim(),
        start: groupOffset,
        bodyStart: lineEnd,
      });
    else if (groupStack.at(-1)?.delimiter === line.trim() && /^(?:===|\|\|\|)$/.test(line.trim())) {
      const group = groupStack.pop();
      if (group && !groupStack.length)
        groupRanges.push({ ...group, closeStart: groupOffset, end: lineEnd });
    }
    groupOffset = lineEnd;
  }
  for (const range of groupRanges.reverse()) {
    const markdown = calloutSource.slice(range.bodyStart, range.closeStart).trimEnd();
    const type = range.delimiter === '===' ? 'accordion' : 'tabs';
    calloutSource =
      calloutSource.slice(0, range.start) +
      (enabled(options, type)
        ? richPlaceholder(blocks, {
            _type: type,
            items: [
              {
                _type: 'item',
                title: range.title,
                markdown,
                content: parseMarkdown(markdown, options, blocks),
              },
            ],
          })
        : rawPlaceholder(blocks, calloutSource.slice(range.start, range.end))) +
      calloutSource.slice(range.end);
  }
  /** Opening state retained while scanning a fenced callout or legacy block. */
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
    if (open)
      stack.push({
        start: offset,
        bodyStart: end,
        fenceLength: open[1]!.length,
        kind: open[2]!,
        ...(open[3] ? { title: open[3].trim() } : {}),
      });
    else if (
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
    fencedMath.source.replace(TerraQualityRegex.REGEX_S_N_S_S_S_GM_REGEX(), (r, c: string) =>
      enabled(options, 'math')
        ? richPlaceholder(blocks, { _type: 'math', code: c.trim(), inline: false, markdown: r })
        : rawPlaceholder(blocks, r),
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
      if (token.tokens?.some((c) => c.type === 'image')) {
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
            rows: rows.map((c) => ({ _type: 'row', _key: key(), cells: c })),
          }))(
            [...tableSource.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi)].map((r) =>
              [...(r[1] ?? '').matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)\s*>/gi)].map(
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
  const grouped: RichBlock[] = [];
  for (const block of result) {
    const previous = grouped.at(-1);
    if (
      (block._type === 'accordion' || block._type === 'tabs') &&
      previous?._type === block._type &&
      Array.isArray(previous.items) &&
      Array.isArray(block.items)
    ) {
      previous.items = [...previous.items, ...block.items];
      if (typeof block.markdown === 'string')
        previous.markdown = [previous.markdown, block.markdown].filter(Boolean).join('\n\n');
    } else grouped.push(block);
  }
  return grouped as DocsValue;
}
/**
 * Checks that an object contains no keys outside the canonical field list for its Markdown form.
 * @param value Object to validate.
 * @param fields Allowed own-property names.
 * @returns `true` when every own key is in the allowed list.
 */
function onlyOwnFields(value: Record<string, unknown>, fields: string[]): boolean {
  return Object.keys(value).every((n) => fields.includes(n));
}
/**
 * Determines whether a Portable Text block uses only fields and marks that Markdown can preserve.
 * @param block Rich block being considered for readable Markdown serialization.
 * @returns `true` when its structure is representable by the supported inline syntax.
 */
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
  if (typeof block.children === 'string') return true;
  if (!Array.isArray(block.children)) return false;
  return block.children.every((c) => {
    if (!c || typeof c !== 'object') return false;
    const value = c as Record<string, unknown>;
    if (value._type === 'span')
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
    return (
      value._type === 'math' &&
      onlyOwnFields(value, ['_type', '_key', 'code', 'inline']) &&
      typeof value.code === 'string' &&
      !R_N_CLASS_2.test(value.code) &&
      value.inline === true
    );
  });
}
/**
 * Serializes a text block's spans, math, links, and decorators without changing their grouping.
 * @param block Portable Text block with children, marks, and link definitions.
 * @returns Readable Markdown or HTML-backed Markdown when ordinary syntax would alter the structure.
 * @throws Error when no supported inline representation round-trips faithfully.
 */
function blockContentToMarkdown(block: RichBlock): string {
  const markDefs = new Map(
    (Array.isArray(block.markDefs) ? block.markDefs : [])
      .filter(
        (m): m is { _key: string; _type: string; href: string } =>
          typeof m === 'object' && m !== null && '_key' in m && 'href' in m,
      )
      .map((m) => [m._key, m.href]),
  );
  const children: { _type?: string; text?: string; marks?: string[]; code?: string }[] =
    typeof block.children === 'string'
      ? [{ _type: 'span', text: block.children, marks: [] }]
      : Array.isArray(block.children)
        ? (block.children as { _type?: string; text?: string; marks?: string[]; code?: string }[])
        : [];
  const readable = children
    .map((c) => {
      if (c._type === 'math') return '$' + String(c.code ?? '') + '$';
      const marks = c.marks ?? [];
      let text = marks.includes('code')
        ? markdownCodeSpan(c.text ?? '')
        : escapeMarkdownText(c.text ?? '');
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
  if (children.every((c) => c._type === 'span' && !c.marks?.length)) return readable;
  if (inlineMarkdownRoundTrips(children, readable, markDefs)) return readable;
  const preserved = children
    .map((c) => {
      if (c._type === 'math') return '$' + String(c.code ?? '') + '$';
      const marks = c.marks ?? [];
      let text = marks.includes('code')
        ? '<code>' +
          (c.text ?? '').replace(/[&<>`*_\x5B\x5D\\!$|~\r\n]/g, (character) => {
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
        : escapeMarkdownText(c.text ?? '');
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
/**
 * Verifies that parsing a Markdown candidate reconstructs the same inline text, math, and marks.
 * @param children Source child spans or inline math nodes.
 * @param markdown Candidate Markdown representation.
 * @param sourceMarkDefs Source link keys mapped to their destinations.
 * @returns `true` when parsed and source inline signatures are identical.
 */
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
    (c) => c._type === 'span' && c.text?.startsWith(sentinel) && !c.marks?.length,
  );
  if (sentinelIndex < 0) return false;
  const sentinelChild = parsed[sentinelIndex]!;
  const remainingText = String(sentinelChild.text ?? '').slice(sentinel.length);
  if (remainingText) sentinelChild.text = remainingText;
  else parsed.splice(sentinelIndex, 1);
  /**
   * Creates a stable comparison form for inline children and their link definitions.
   * @param values Parsed child nodes whose rendering behavior is being compared.
   * @param definitions Link-key map used to compare actual destinations instead of IDs.
   * @returns JSON for supported text/math sequences, or `undefined` for unsupported nodes.
   */
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
        .map((m) => (definitions.has(m) ? 'link:' + definitions.get(m) : m))
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
            (m): m is { _key: string; _type: 'link'; href: string } =>
              typeof m === 'object' && m !== null && '_key' in m && 'href' in m,
          )
          .map((m) => [m._key, m.href]),
      ),
    )
  );
}
/**
 * Serializes a rich table as a fenced YAML directive with a fence longer than any payload fence.
 * @param block Table block to encode.
 * @returns A Markdown directive that preserves the table's structured fields.
 */
function tableDirective(block: RichBlock): string {
  const payload = stringifyYaml(block, { lineWidth: 0 }).replace(R_N_REGEX, '');
  const fence = ':'.repeat(
    Math.max(
      3,
      1 + Math.max(0, ...[...payload.matchAll(/^(:{3,})(?:[ \t].*)?$/gm)].map((m) => m[1]!.length)),
    ),
  );
  return fence + 'docs table\n' + payload + '\n' + fence;
}
/**
 * Checks whether a block is a supported Portable Text list item.
 * @param block Candidate rich block.
 * @returns `true` for a normal-style bullet or numbered block that can round-trip as Markdown.
 */
function isListBlock(block: RichBlock): boolean {
  return (
    block._type === 'block' &&
    (block.listItem === 'bullet' || block.listItem === 'number') &&
    (block.style === undefined || block.style === 'normal') &&
    markdownInlineBlock(block)
  );
}
/**
 * Returns a nested block's original Markdown or rebuilds it from structured content when placeholders remain.
 * @param block Callout, tab, or accordion item with optional Markdown and content fields.
 * @returns Markdown source safe to serialize outside the parser's temporary placeholder registry.
 */
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
/**
 * Identifies an empty default Portable Text paragraph that Markdown cannot visibly represent.
 * @param value Candidate block or arbitrary nested value.
 * @returns `true` only for a metadata-free normal paragraph containing no marked text.
 */
function emptyPortableTextParagraph(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const block = value as Record<string, unknown>;
  if (block._type !== 'block') return false;
  if (
    Object.keys(block).some((n) => !['_type', '_key', 'style', 'markDefs', 'children'].includes(n))
  )
    return false;
  if (block.listItem || (block.style !== undefined && block.style !== 'normal')) return false;
  if (Array.isArray(block.markDefs) && block.markDefs.length > 0) return false;
  if (!Array.isArray(block.children)) return false;
  return block.children.every((c) => {
    if (!c || typeof c !== 'object') return false;
    const span = c as Record<string, unknown>;
    return (
      span._type === 'span' &&
      String(span.text ?? '').trim() === '' &&
      (!Array.isArray(span.marks) || span.marks.length === 0) &&
      Object.keys(span).every((name) => ['_type', '_key', 'text', 'marks'].includes(name))
    );
  });
}
/**
 * Canonicalizes a Docs value for round-trip comparison by removing generated metadata and normalizing text blocks.
 * @param v Value or nested array to canonicalize.
 * @returns A semantic representation that ignores generated keys and equivalent empty paragraphs.
 */
function semanticMarkdownValue(v: unknown): unknown {
  if (Array.isArray(v))
    return v.filter((i) => !emptyPortableTextParagraph(i)).map(semanticMarkdownValue);
  if (!v || typeof v !== 'object') return v;
  const block = v as Record<string, unknown>;
  const type = block._type;
  if (type === 'block') {
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
        .map((m) => definitions.get(String(m)) ?? m)
        .map((m) => JSON.stringify(m))
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
            ([n]) =>
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
              ].includes(n),
          )
          .sort(([l], [r]) => l.localeCompare(r))
          .map(([n, i]) => [n, semanticMarkdownValue(i)]),
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
        .filter(([n]) => !['_key', '_rev', '_createdAt', '_updatedAt', '_system'].includes(n))
        .filter(([n]) => !(n === '_type' && type === 'item'))
        .filter(([n]) => !(n === 'markdown' && nestedContent))
        // Accordions and tabs can also carry an empty editor cache at the root.
        // Grouped Markdown reconstructs the item bodies directly, so this cache
        // is not source content and must not force an otherwise faithful YAML
        // fallback.
        .filter(([n]) => !(n === 'markdown' && ['accordion', 'tabs'].includes(String(type))))
        .filter(
          ([n]) => !(n === 'markdown' && ['math', 'docImage', 'table'].includes(String(type))),
        )
        .filter(
          ([n]) =>
            !(n === 'markdown' && type === 'code' && ('value' in block || 'source' in block)),
        )
        .sort(([l], [r]) => l.localeCompare(r))
        .map(([n, i]) => [n, semanticMarkdownValue(i)]),
    ))(Array.isArray(block.content) ? block.content : undefined);
}
/**
 * Checks whether Markdown parsing reconstructs the semantic structure of a rich value.
 * @param value Source block or nested rich value.
 * @param markdown Candidate Markdown serialization.
 * @returns `true` when both normalized structures match; `false` when parsing fails or differs.
 */
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
/**
 * Serializes a rich block as a canonical DocsBlock JSX node carrying its JSON data.
 * @param block Rich block to preserve in Markdown.
 * @returns A self-closing DocsBlock component with its type and data attributes.
 * @throws Error when the block type is not a valid component identifier.
 */
function richBlockDirective(block: RichBlock): string {
  const type = String(block._type ?? '');
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(type))
    throw new Error('Cannot serialize Docs block with an invalid type.');
  return '<DocsBlock type="' + type + '" data={' + JSON.stringify(block) + '} />';
}
/**
 * Wraps code in a Markdown fence longer than every backtick run in the code body.
 * @param code Code contents to preserve verbatim.
 * @param lang Optional language label for the opening fence.
 * @returns A fenced code block with a safe delimiter and normalized trailing newline.
 */
function codeFence(code: string, lang: string): string {
  const tick = String.fromCharCode(96);
  const fence = tick.repeat(
    Math.max(
      3,
      1 + Math.max(0, ...(code.match(new RegExp(tick + '+', 'g')) ?? []).map((r) => r.length)),
    ),
  );
  return fence + (lang ? lang : '') + '\n' + code.replace(N_CLASS_2, '') + '\n' + fence;
}

/**
 * Serializes Docs values as readable Markdown when faithful, using typed source for richer structures.
 * @param value Docs blocks to serialize.
 * @returns Markdown that preserves representable text and encodes other supported blocks explicitly.
 */
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
      (n) =>
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
        ].includes(n),
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
          const colCounts = rows.map((r) => (Array.isArray(r.cells) ? r.cells.length : 0));
          if (
            ((simpleRows) =>
              !onlyOwnFields(block, ['_type', '_key', 'header', 'rows', 'markdown']) ||
              !simpleRows)(
              colCounts.every((c) => c === colCounts[0]) &&
                rows.every((r) => {
                  if (r._type !== 'row' || !onlyOwnFields(r, ['_type', '_key', 'cells']))
                    return false;
                  return (
                    Array.isArray(r.cells) &&
                    r.cells.every((cell) => {
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
                  ([n]) => !['_type', '_key', 'rows', 'markdown'].includes(n),
                ),
              ),
              _docsCellFormat: 'markdown-v1',
              rows: rows.map((r) => ({
                ...Object.fromEntries(
                  Object.entries(r).filter(([name]) => !['_type', '_key', 'cells'].includes(name)),
                ),
                cells: (Array.isArray(r.cells) ? r.cells : []).map((cell) => {
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
          const cells = rows.map((r) =>
            (Array.isArray(r.cells) ? r.cells : []).map((cell) => {
              const value =
                cell && typeof cell === 'object' ? (cell as Record<string, unknown>) : {};
              const protectedParts: string[] = [];
              /**
               * Stores Markdown fragments that table escaping must leave intact.
               * @param source Original link or code fragment from the table cell.
               * @returns A unique placeholder that can be restored after GFM escaping.
               */
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
          const width = Math.max(1, ...cells.map((r) => r.length));
          const padded = cells.map((r) => Array.from({ length: width }, (_cell, i) => r[i] ?? ''));
          const markdown = [
            '| ' + (padded[0] ?? Array.from({ length: width }, () => '')).join(' | ') + ' |',
            '| ' + Array.from({ length: width }, () => '---').join(' | ') + ' |',
            ...padded.slice(1).map((r) => '| ' + r.join(' | ') + ' |'),
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
                ...[...content.matchAll(/^(:+)(?:[ \t].*)?$/gm)].map((m) => m[1]!.length),
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
          (e) =>
            onlyOwnFields(e, ['_type', '_key', 'title', 'markdown', 'content']) &&
            (e._type === undefined || e._type === 'item') &&
            (e.markdown === undefined || typeof e.markdown === 'string') &&
            (e.content === undefined || Array.isArray(e.content)),
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
            (e) =>
              delimiter +
              '[' +
              (typeof e.title === 'string' ? e.title : 'Item').replace(G_CLASS_2_3_4(), '\\]') +
              ']\n' +
              nestedMarkdown(e).replace(N_CLASS_2, '') +
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
                ([n]) => !['_type', '_key', 'nodes', 'edges'].includes(n),
              ),
            ),
            nodes: item.nodes ?? [],
            edges: item.edges ?? [],
          })
            .map(([n, v]) => n + '={' + JSON.stringify(v) + '}')
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
            .filter(([n]) => !['_type', '_key'].includes(n))
            .map(
              ([n, v]) =>
                n +
                '="' +
                String(v).replace(G_CLASS_2(), '&amp;').replace(G_CLASS_2_3(), '&quot;') +
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

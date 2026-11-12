/**
 * src/lib/terra/runtime/content/markdown.ts
 * Converts Markdown, code fences, and table markup used by Docs content.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// COMPONENTS
import * as TerraQualityRegex from '../../regex.mjs';

/**
 * JSON-quotes a string for use in an MDX or JSX attribute.
 *
 * @param value - String value to encode.
 *
 * @return JSON-quoted string literal suitable for embedding in an attribute.
 */
export const quote = (value: string): string => JSON.stringify(value);

/**
 * Escapes HTML metacharacters before text is emitted as Docs markup.
 *
 * @param value - Text to escape.
 *
 * @return Text with ampersands, angle brackets, quotes, and apostrophes replaced by HTML entities.
 */
const escHtml = (value: string): string =>
  value
    .replace(TerraQualityRegex.REGEX_G_REGEX_17(), '&amp;')
    .replace(TerraQualityRegex.REGEX_G_REGEX_23(), '&lt;')
    .replace(TerraQualityRegex.REGEX_G_REGEX_24(), '&gt;')
    .replace(TerraQualityRegex.REGEX_G_REGEX_5(), '&quot;')
    .replace(TerraQualityRegex.REGEX_G_REGEX_4(), '&#39;');

/*//////////////////////////////////////////////////
CODE SYNTAX
//////////////////////////////////////////////////*/

/**
 * Emits the optional language attribute used by serialized code fences.
 *
 * @param lang - Optional code-fence language label.
 *
 * @return A quoted `language` attribute for a non-empty label, or an empty string.
 */
const codeAttrs = (lang?: string): string =>
  lang?.trim() ? ` language=${JSON.stringify(lang.trim())}` : '';

/**
 * Converts any code payload into a printable string before it is written into docs markup.
 *
 * @param val - Any code-like value to stringify.
 *
 * @return Printable code string used by the markdown and MDX serializers.
 *
 * @remarks
 * Prefers compact primitives and pretty-prints structured values.
 */
export function stringifyCodeValue(val: unknown): string {
  if (typeof val === 'string') {
    let n = val;
    for (let i = 0; i < 16; i++) {
      const match = n.match(TerraQualityRegex.REGEX_S_S_S_S_REGEX());
      if (!match) break;
      const unwrapped = (match[1] ?? '')
        .replace(TerraQualityRegex.REGEX_G_REGEX_11(), '$1')
        .replace(TerraQualityRegex.REGEX_N_G_REGEX_2(), '\n');
      if (unwrapped === n) break;
      n = unwrapped;
    }
    return n.replace(TerraQualityRegex.REGEX_R_N_N_R_G_REGEX(), (m) => (m === '\\r' ? '\r' : '\n'));
  }
  if (typeof val === 'number' || typeof val === 'boolean' || typeof val === 'bigint')
    return String(val);
  if (val == null) return '';
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
}

/**
 * Serializes fenced code into the canonical `<Code>` JSX used by docs content.
 *
 * @param lang - Code fence language label.
 * @param val - Raw code text.
 *
 * @return Canonical `Code` JSX for the code block.
 *
 * @remarks
 * The code payload is HTML-escaped so it can round-trip through MDX safely.
 */
export function codeJsx(lang: string | undefined, val: string): string {
  return `\n<Code${codeAttrs(lang)}>\n{\`
${val.replace(TerraQualityRegex.REGEX_G_REGEX_12(), '\\\\').replace(TerraQualityRegex.REGEX_G_REGEX_18(), '\\`').replace(TerraQualityRegex.REGEX_G_REGEX_16(), '\\$')}
\`}\n</Code>\n`;
}

/**
 * Serializes source-backed code as a self-closing `Code` JSX element.
 *
 * @param lang - Optional code-fence language label.
 * @param src - Source value used by the `Code` component to load code content.
 *
 * @return Canonical self-closing `Code` JSX with `language` and `source` attributes.
 */
export const codeSrcJsx = (lang: string | undefined, src: string): string =>
  `\n<Code${codeAttrs(lang)} source=${quote(src)} />\n`;

/*//////////////////////////////////////////////////
TABLE HTML
//////////////////////////////////////////////////*/

/**
 * Removes the outer `|` characters from a pipe-table row while respecting escaped pipes.
 *
 * @param val - Pipe-delimited table row.
 * @param side - Boundary pipe to remove when present.
 *
 * @return Row with the requested outer pipe removed when present; an escaped trailing pipe is retained.
 */
const trimPipe = (val: string, side: 'start' | 'end'): string => {
  if (side === 'start' && val.startsWith('|')) return val.slice(1);
  if (side === 'end' && val.endsWith('|')) {
    let slashes = 0;
    for (let i = val.length - 2; i >= 0 && val[i] === '\\'; i--) slashes++;
    return slashes % 2 === 0 ? val.slice(0, -1) : val;
  }
  return val;
};

/**
 * Renders a markdown pipe table into HTML when the row widths and separator row are valid.
 *
 * @param md - Table markdown to render.
 * @param renderCell - Cell renderer used for each value.
 *
 * @return HTML table markup when the input is a valid pipe table, otherwise `null`.
 *
 * @remarks
 * Callers can supply a custom cell renderer to preserve nested markdown or JSX.
 */
export const mdTableToHtml = (
  md: string,
  renderCell: (val: string) => string = escHtml,
): string | null => {
  const lines = md.replace(TerraQualityRegex.REGEX_R_N_G_REGEX(), '\n').trim().split('\n');
  if (lines.length < 2 || lines.some((l) => !l.trim())) return null;
  const rows = lines.map((l) => {
    const cells: string[] = [];
    let cell = '';
    let esc = false;
    for (const ch of trimPipe(trimPipe(l.trim(), 'start'), 'end')) {
      if (esc) {
        cell += ch;
        esc = false;
        continue;
      }
      if (ch === '\\') {
        esc = true;
        continue;
      }
      if (ch === '|') {
        cells.push(cell.trim());
        cell = '';
        continue;
      }
      cell += ch;
    }
    cells.push(cell.trim());
    return cells;
  });
  const width = rows[0]?.length || 0;
  if (
    !width ||
    rows.some((r) => r.length !== width) ||
    !rows[1]?.every((v) => TerraQualityRegex.REGEX_3_U_REGEX().test(v.trim()))
  )
    return null;

  // prettier-ignore
  const body = rows.slice(2).map(r => `<tr>${r.map(c => `<td>${renderCell(c)}</td>`).join('')}</tr>`).join('');
  return `<table><thead><tr>${/* prettier-ignore */ (rows[0] ?? []).map(renderCell).map(c => `<th>${c}</th>`).join('')}</tr></thead>${body ? `<tbody>${body}</tbody>` : ''}</table>`;
};

/*//////////////////////////////////////////////////
CONTENT SERIALIZATION
//////////////////////////////////////////////////*/

/**
 * Converts plain markdown into HTML for the serializer's fallback path.
 *
 * @param val - Markdown source to convert on the serializer fallback path.
 *
 * @return HTML for supported code fences, inline code, links, emphasis, and line breaks; an empty string for blank input.
 */
export const renderMd = (val: string): string => {
  const text = val.trim();
  if (!text) return '';
  const code = text.match(TerraQualityRegex.REGEX_N_N_S_S_N_REGEX());
  if (code)
    return `<pre><code${code[1]?.trim() ? ` class="language-${escHtml(code[1].trim())}"` : ''}>${escHtml(code[2] || '')}</code></pre>`;
  const codes: string[] = [];
  const lines = text.split(TerraQualityRegex.REGEX_N_2_REGEX());
  // Protect inline code before escaping prose. Escaping first turns an
  // apostrophe into `&#39;`, then escaping the code span again turns it into
  // visible `&amp;#39;` text in table cells.
  let html = escHtml(
    text.replace(TerraQualityRegex.REGEX_G_REGEX_34(), (_, c: string) => {
      codes.push(`<code>${escHtml(c)}</code>`);
      return `__CODE_${codes.length - 1}__`;
    }),
  )
    .replace(
      TerraQualityRegex.REGEX_G_REGEX_25(),
      (_, l: string, h: string) => `<a href="${escHtml(h)}">${l}</a>`,
    )
    .replace(TerraQualityRegex.REGEX_S_S_G_REGEX(), '<strong>$1</strong>')
    .replace(
      TerraQualityRegex.REGEX_N_G_REGEX(),
      (_, a: string, b: string, v: string) => `${a}<em>${b}</em>${v}`,
    )
    .replace(TerraQualityRegex.REGEX_N_G_REGEX_3(), '<br />');
  codes.forEach((c, i) => {
    html = html.replace(`__CODE_${i}__`, c);
  });
  if (lines.length > 1) return lines.map((l) => `<p>${renderMd(l)}</p>`).join('');
  return html;
};

/**
 * Formats raw table HTML with consistent indentation so docs tables round-trip cleanly.
 *
 * @param val - HTML markup to normalize when it contains a table.
 *
 * @return Line-normalized and indented table markup, or the original input when it contains no table.
 */
export const fmtRawTable = (val: string): string => {
  if (!TerraQualityRegex.REGEX_TABLE_B_I_REGEX().test(val)) return val;
  let depth = 0;
  return val
    .replace(TerraQualityRegex.REGEX_S_N_S_G_REGEX(), ' ')
    .replace(TerraQualityRegex.REGEX_TD_TH_B_S_P_UL_OL_TABLE_PRE_DIV_B_GI_REGEX(), '$1')
    .replace(TerraQualityRegex.REGEX_TH_TD_S_TH_TD_B_GI_REGEX(), '$1\n')
    .replace(TerraQualityRegex.REGEX_P_UL_OL_PRE_DIV_S_TD_GI_REGEX(), '$1')
    .replace(TerraQualityRegex.REGEX_LI_S_LI_B_GI_REGEX(), '$1\n')
    .replace(TerraQualityRegex.REGEX_TABLE_THEAD_TBODY_TFOOT_TR_UL_OL_B_GI_REGEX(), '\n$1\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      if (TerraQualityRegex.REGEX_TABLE_THEAD_TBODY_TFOOT_TR_TH_TD_UL_OL_B_IU_REGEX_2().test(l))
        depth = Math.max(0, depth - 1);
      if (TerraQualityRegex.REGEX_TABLE_THEAD_TBODY_TFOOT_TR_TH_TD_UL_OL_B_IU_REGEX().test(l))
        depth++;
      return `${'\t'.repeat(depth)}${l}`;
    })
    .join('\n');
};

/** Identifies complete canonical HTML table markup. */
export const TABLE_TAG = TerraQualityRegex.REGEX_TABLE_THEAD_TBODY_TFOOT_TR_TH_TD_B_I_REGEX();

/**
 * Removes style markup from a table source block and trims surrounding whitespace.
 *
 * @param val - Complete table markup captured from a Docs source block.
 *
 * @return Trimmed table markup without style elements or style attributes.
 */
export const atomicTableHtml = (val: string): string => {
  return val
    .replace(TerraQualityRegex.REGEX_STYLE_B_S_S_STYLE_S_GI_REGEX(), '')
    .replace(TerraQualityRegex.REGEX_SSTYLE_S_S_S_GI_REGEX(), '')
    .trim();
};

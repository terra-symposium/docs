/** Converts supported Docs block markers to and from JSX wrappers. */
import * as TerraQualityRegex from '../../regex.mjs';
import { codeJsx, quote } from './markdown.js';

/*//////////////////////////////////////////////////
BLOCK SYNTAX
//////////////////////////////////////////////////*/

/**
 * Registry of the custom accordion and tabs block syntaxes used in docs content.
 *
 * @remarks
 * The registry is intentionally tiny so the parser can stay predictable.
 */
const BLOCKS = [
  {
    id: 'accordion',
    syntax: '===',
    root: 'AccordionGroup',
    item: 'AccordionItem',
    label: 'Accordion',
  },
  { id: 'tabs', syntax: '|||', root: 'TabsGroup', item: 'TabsItem', label: 'Tabs' },
] as const;

/**
 * Restores the custom docs JSX wrappers back to the markdown block syntax they came from.
 *
 * @param jsx - Canonical JSX source to restore.
 *
 * @return Markdown where supported docs JSX wrappers have been converted back to block syntax.
 *
 * @remarks
 * It restores the supported docs block syntax.
 */
export function fromBlockJsx(jsx: string): string {
  if (!jsx) return '';
  const code = new Map<string, string>();
  let _rs = (() => {
    const out: string[] = [];
    let fenced = false;
    let lang = '';
    let body: string[] = [];
    for (const line of jsx.replace(TerraQualityRegex.REGEX_R_N_G_REGEX(), '\n').split('\n')) {
      const trim = line.trimStart();
      if (trim.startsWith('```')) {
        if (fenced) {
          out.push(codeJsx(lang, body.join('\n')));
          lang = '';
          body = [];
        }
        fenced = !fenced;
        if (fenced) {
          lang = trim.slice(3).trim();
          continue;
        }
        continue;
      }
      if (fenced) body.push(line);
      else out.push(line);
    }
    let result = out.join('\n');
    const blocks: string[] = [];
    const parts: string[] = [];
    let index = 0;
    for (;;) {
      const start = result.indexOf('<Code', index);
      if (start === -1) {
        parts.push(result.slice(index));
        result = parts.join('');
        break;
      }
      const end = result.indexOf('</Code>', start + '<Code'.length);
      if (end === -1) {
        parts.push(result.slice(index));
        result = parts.join('');
        break;
      }
      blocks.push(result.slice(start, end + '</Code>'.length));
      parts.push(result.slice(index, start), `TERRA_PROTECTED_${blocks.length - 1}__`);
      index = end + '</Code>'.length;
    }
    if (result.includes('<pre><code'))
      result = result.replace(
        TerraQualityRegex.REGEX_PRE_CODE_S_CLASS_LANGUAGE_S_S_CODE_PRE_GI_REGEX(),
        (_, language: string, value: string) => codeJsx(language || '', value),
      );
    result = result.replace(
      TerraQualityRegex.REGEX_CODE_B_S_S_S_CODE_S_S_S_G_REGEX(),
      (_match, props: string, content: string, expression: string | undefined) =>
        `<Code${props} source=${quote(expression !== undefined ? expression.replace(TerraQualityRegex.REGEX_G_REGEX_11(), '$1') : content)} />`,
    );
    return blocks.reduce(
      (source, block, blockIndex) =>
        source.replace(new RegExp(`TERRA_PROTECTED_${blockIndex}__`, 'g'), block),
      result,
    );
  })()
    .replace(TerraQualityRegex.REGEX_CODE_B_S_S_CODE_G_REGEX_3(), (m) => {
      const key = `TERRA_CODE_${code.size}`;
      code.set(key, m);
      return key;
    })
    .replace(TerraQualityRegex.REGEX_GM_REGEX_3(), '===')
    .replace(TerraQualityRegex.REGEX_GM_REGEX_2(), '|||')
    .replace(TerraQualityRegex.REGEX_GM_REGEX(), ':::')
    .replace(
      TerraQualityRegex.REGEX_T_GM_REGEX(),
      (_m, p, c) =>
        `${p}[${c.replace(TerraQualityRegex.REGEX_G_REGEX_28(), ']').replace(TerraQualityRegex.REGEX_G_REGEX_27(), '[')}]`,
    );
  _rs = _rs
    .replace(TerraQualityRegex.REGEX_XA0_U2002_U2003_U200B_G_REGEX(), ' ')
    .replace(
      TerraQualityRegex.REGEX_DOCSMATH_B_S_S_CODE_S_S_S_S_S_S_S_S_S_S_3_S_S_GI_REGEX(),
      (_m, p, e, _quote, s, v) => {
        // prettier-ignore
        const parsed = e
					? e.startsWith('`')
						? e.slice(1, -1).replace(TerraQualityRegex.REGEX_G_REGEX_15(), '`').replace(TerraQualityRegex.REGEX_G_REGEX_14(), '$').replace(TerraQualityRegex.REGEX_G_REGEX_13(), '\\')
						: e.startsWith('"') ? JSON.parse(e.replace(TerraQualityRegex.REGEX_N_G_REGEX_3(), '\\n')) : e.slice(1, -1).replace(TerraQualityRegex.REGEX_G_REGEX_26(), '$1')
					: s;
        return TerraQualityRegex.REGEX_BINLINE_B_I_REGEX().test(p) ||
          TerraQualityRegex.REGEX_BINLINE_B_I_REGEX().test(v)
          ? `$${parsed}$`
          : `\n\n$$${parsed}$$\n\n`;
      },
    )
    .replace(TerraQualityRegex.REGEX_S_S_N_G_REGEX(), (_m) =>
      _m
        .replace(TerraQualityRegex.REGEX_G_REGEX_29(), '{')
        .replace(TerraQualityRegex.REGEX_G_REGEX_30(), '}')
        .replace(TerraQualityRegex.REGEX_G_REGEX_31(), '<')
        .replace(TerraQualityRegex.REGEX_G_REGEX_32(), '>'),
    );
  _rs = _rs
    .replace(
      TerraQualityRegex.REGEX_ACCORDIONGROUP_TABSGROUP_ACCORDIONITEM_TABSITEM_B_G_REGEX(),
      '\n$1\n',
    )
    .replace(TerraQualityRegex.REGEX_N_3_G_REGEX(), '\n\n');
  if (code.size)
    _rs = _rs.replace(TerraQualityRegex.REGEX_TERRA_CODE_D_G_REGEX(), (k) => code.get(k) || k);
  const lns = _rs.split('\n');
  const out: string[] = [];
  let icode = false;
  let pad = '';
  for (let i = 0; i < lns.length; i++) {
    const raw = lns[i] || '';
    const t = raw.trimStart();
    if (t.startsWith('```')) {
      icode = !icode;
      if (icode) pad = raw.match(TerraQualityRegex.REGEX_T_REGEX())?.[0] || '';
      out.push(t);
      continue;
    }
    if (icode) {
      out.push(raw.startsWith(pad) ? raw.slice(pad.length) : t);
      continue;
    }
    if (BLOCKS.find((b) => t === `<${b.root}>`)) {
      out.push('');
      continue;
    }
    if (BLOCKS.find((b) => t === `</${b.root}>`)) {
      out.push('');
      continue;
    }
    if (
      BLOCKS.find((b) => {
        const match = t.match(new RegExp(`^<${b.item}\\b[^>]*title="([^"]*)"[^>]*>$`));
        if (!match) return false;
        out.push(`\n\n${b.syntax}[${match[1] || 'Section'}]\n\n`);
        return true;
      })
    )
      continue;
    const itemClose = BLOCKS.find((b) => t === `</${b.item}>`);
    if (itemClose) {
      out.push(`\n\n${itemClose.syntax}\n\n`);
      continue;
    }
    if (t.length === 0) {
      out.push('');
      continue;
    }
    if (TerraQualityRegex.REGEX_PATTERN_REGEX_5().test(t)) {
      out.push(t);
      continue;
    }
    out.push(raw.replace(TerraQualityRegex.REGEX_T_1_8_REGEX(), ''));
  }
  return (
    /* prettier-ignore */ out.join('\n').replace(TerraQualityRegex.REGEX_N_3_G_REGEX(), '\n\n').trim() + '\n'
  );
}

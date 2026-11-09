import { Marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DocsRichBlock, enabledDocsBlocks } from '../components/blocks.js';
import type { DocsBlockOptions, RichBlock } from '../components/blocks.js';
import { markdownToDocsValue, replaceCanonicalComponents } from './markdown-model.js';
import * as TerraQualityRegex from './terra/regex.mjs';

type CalloutRange = {
  start: number;
  bodyStart: number;
  closeStart: number;
  end: number;
  fenceLength: number;
  kind: string;
  title?: string;
};

export function renderMarkdown(markdown: string, options: DocsBlockOptions = {}): string {
  const rendered: string[] = [];
  const parser = new Marked({ gfm: true });
  const placeholder = (html: string) => {
    rendered.push(html);
    return `DOCSRICHPLACEHOLDER${rendered.length - 1}END`;
  };
  let source = (function renderGroupedBlocks(
    markdown: string,
    options: DocsBlockOptions,
    placeholder: (html: string) => string,
  ): string {
    return markdown.replace(
      TerraQualityRegex.REGEX_S_N_S_N_S_S_1_S_GM_REGEX(),
      (_match, delimiter: string, title: string, body: string) => {
        const summary = sanitizeHtml(title, { allowedTags: [], allowedAttributes: {} });
        const content = renderMarkdown(body, options);
        if (delimiter === '===')
          return placeholder(
            `<details class="docs-accordion"><summary>${summary}</summary>${content}</details>`,
          );
        return placeholder(
          `<details class="docs-tab"><summary>${summary}</summary>${content}</details>`,
        );
      },
    );
  })(markdown, options, placeholder);
  // Render a complete outer callout first. Its body is rendered recursively by
  // DocsRichBlock, so nested typed blocks keep their own parser context instead
  // of being replaced by placeholders that cannot cross the callout boundary.
  source = (function renderCallouts(
    markdown: string,
    options: DocsBlockOptions,
    placeholder: (html: string) => string,
  ): string {
    let source = markdown;
    for (const range of (function markdownCalloutRanges(source: string): CalloutRange[] {
      const stack: Omit<CalloutRange, 'closeStart' | 'end'>[] = [];
      const ranges: CalloutRange[] = [];
      let codeFence: { char: string; length: number } | undefined;
      let offset = 0;

      while (offset < source.length) {
        const newline = source.indexOf('\n', offset);
        const end = newline === -1 ? source.length : newline + 1;
        const line = source.slice(offset, end).replace(/\r?\n$/, '');

        if (codeFence) {
          const close = line.match(TerraQualityRegex.REGEX_0_3_3_3_S_REGEX());
          if (close && close[1]![0] === codeFence.char && close[1]!.length >= codeFence.length)
            codeFence = undefined;
          offset = end;
          continue;
        }

        const codeOpen = line.match(TerraQualityRegex.REGEX_0_3_3_3_REGEX());
        if (codeOpen) {
          codeFence = { char: codeOpen[1]![0]!, length: codeOpen[1]!.length };
          offset = end;
          continue;
        }

        const open = line.match(
          /^ {0,3}(:{3,})(note|tip|caution|danger|example|warning)(?:\[([^\]\n]*)\])?[ \t]*$/,
        );
        if (open) {
          stack.push({
            start: offset,
            bodyStart: end,
            fenceLength: open[1]!.length,
            kind: open[2]!,
            ...(open[3] ? { title: open[3].trim() } : {}),
          });
        } else {
          const close = line.match(/^ {0,3}(:{3,})[ \t]*$/);
          if (close && stack.at(-1)?.fenceLength === close[1]!.length) {
            const closed = stack.pop();
            if (closed && stack.length === 0)
              ranges.push({
                ...closed,
                closeStart: offset,
                end: newline === -1 ? source.length : newline,
              });
          }
        }
        offset = end;
      }

      return ranges;
    })(markdown).reverse()) {
      const callout = {
        raw: source.slice(range.start, range.end),
        body: source.slice(range.bodyStart, range.closeStart).trimEnd(),
      };
      source =
        source.slice(0, range.start) +
        placeholder(
          enabledDocsBlocks(options).includes('callout')
            ? renderToStaticMarkup(
                createElement(DocsRichBlock, {
                  block: {
                    _type: 'callout',
                    kind: range.kind,
                    title: range.title || range.kind,
                    markdown: callout.body,
                  },
                }),
              )
            : `<pre>${sanitizeHtml(callout.raw, { allowedTags: [], allowedAttributes: {} })}</pre>`,
        ) +
        source.slice(range.end);
    }
    return source;
  })(source, options, placeholder);
  source = source.replace(TerraQualityRegex.REGEX_3_DOCS_TABLE_S_N_S_S_1_S_GM_REGEX(), (source) => {
    const table = markdownToDocsValue(source, options)[0];
    return table?._type === 'table'
      ? placeholder(
          renderToStaticMarkup(createElement(DocsRichBlock, { block: table as RichBlock })),
        )
      : placeholder(
          '<pre>' + sanitizeHtml(source, { allowedTags: [], allowedAttributes: {} }) + '</pre>',
        );
  });
  source = source.replace(
    TerraQualityRegex.REGEX_DOCS_TABLE_R_N_T_R_N_S_S_T_GM_REGEX(),
    (source, caption: string, body: string) => {
      try {
        return placeholder(
          '<section class="docs-table"><strong>' +
            sanitizeHtml(decodeURIComponent(caption), { allowedTags: [], allowedAttributes: {} }) +
            '</strong>' +
            parser.parse(body, { async: false }) +
            '</section>',
        );
      } catch {
        return placeholder(
          '<pre>' + sanitizeHtml(source, { allowedTags: [], allowedAttributes: {} }) + '</pre>',
        );
      }
    },
  );
  source = (function renderCanonicalComponents(
    markdown: string,
    options: DocsBlockOptions,
    placeholder: (html: string) => string,
  ): string {
    return replaceCanonicalComponents(markdown, (block, raw, inTable) => {
      if (
        !block ||
        (block._type !== 'block' && !enabledDocsBlocks(options).includes(block._type as never))
      )
        return placeholder(
          '<pre>' + sanitizeHtml(raw, { allowedTags: [], allowedAttributes: {} }) + '</pre>',
        );
      if (inTable) {
        return (
          '<code>' +
          sanitizeHtml(String(block.value ?? block.source ?? ''), {
            allowedTags: [],
            allowedAttributes: {},
          }) +
          '</code>'
        );
      }
      return placeholder(renderToStaticMarkup(createElement(DocsRichBlock, { block })));
    });
  })(source, options, placeholder);
  source = source.replace(TerraQualityRegex.REGEX_S_N_S_S_S_GM_REGEX(), (_source, code: string) =>
    options.math === false
      ? _source
      : placeholder(
          renderToStaticMarkup(createElement(DocsRichBlock, { block: { _type: 'math', code } })),
        ),
  );
  if (options.inlineMath !== false && options.math !== false)
    parser.use({
      extensions: [
        {
          name: 'terraInlineMath',
          level: 'inline',
          start: (source) => source.indexOf('$'),
          tokenizer(source) {
            const match = /^\$([^$\n]+)\$/.exec(source);
            return match ? { type: 'terraInlineMath', raw: match[0], text: match[1] } : undefined;
          },
          renderer(token) {
            return placeholder(
              renderToStaticMarkup(
                createElement(DocsRichBlock, {
                  block: { _type: 'math', code: token.text, inline: true },
                }),
              ),
            );
          },
        },
      ],
    });
  return sanitizeHtml(parser.parse(source, { async: false }), {
    ...sanitizeHtml.defaults,
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      'img',
      'u',
      'details',
      'summary',
      'figure',
      'figcaption',
      'section',
      'input',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'svg',
      'g',
      'rect',
      'text',
      'path',
      'defs',
      'marker',
    ],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ['href', 'name', 'target', 'rel', 'id'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      input: ['type', 'checked', 'disabled'],
      svg: ['viewBox', 'width', 'height', 'role', 'aria-label'],
      rect: ['x', 'y', 'width', 'height', 'rx', 'fill', 'stroke'],
      text: ['x', 'y', 'text-anchor', 'dominant-baseline', 'fill'],
      path: ['d', 'fill', 'stroke', 'stroke-width', 'marker-end'],
      marker: ['id', 'markerWidth', 'markerHeight', 'refX', 'refY', 'orient'],
      '*': ['id', 'class', 'aria-label'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  }).replace(/DOCSRICHPLACEHOLDER(\d+)END/g, (_match, i: string) => rendered[Number(i)] ?? '');
}

/**
 * src/components/terra/editor/docs/_Table.tsx
 * Docs table renderer with view and edit modes.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { isRec } from '../../../../lib/terra/runtime/runtime.js';
import { useEditor } from '@portabletext/editor';

// COMPONENTS
import { Add as AddIcon, TrashCan as TrashIcon } from '@carbon/icons-react';
import { Button, Input } from '@terra-symposium/styling/ui';
import { ErrorBoundary } from '../../ui.js';
import { TerraContentEditor } from './_editor.js';

// TYPES
import type { Content as ContentData, DocTableCell } from '../../../../lib/terra/runtime/types.js';
import type {
  DocsBlock,
  PortableTextBlockEditorProps,
  PortableTextBlockRendererProps,
} from '../types.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** Sanity Portable Text table rows and headers. */
type TableBlock = DocsBlock<'table'>;
/** Sanity Portable Text table cell content and formatting. */
type TableCell = NonNullable<NonNullable<TableBlock['rows']>[number]['cells']>[number];
/**
 * Returns a persisted Portable Text key or the stable fallback used by the current render.
 * @param val Cell or row record whose `_key` may be present.
 * @param fallback Render-local key used when the record lacks a stable key.
 * @returns The stored key or `fallback`.
 */
const key = (val: unknown, fallback: string): string =>
  isRec(val) && typeof val._key === 'string' ? val._key : fallback;
/**
 * Produces a fixed-width cell list so short rows align with the widest row.
 * @param vals Cells already present in the row.
 * @param count Number of cells in the widest row.
 * @returns Array with exactly `count` entries, leaving missing cells undefined.
 */
const cells = <T,>(vals: T[], count: number): Array<T | undefined> =>
  Array.from({ length: count }, (_cell, i) => vals[i]);
/**
 * Creates a compact key for newly inserted table rows, cells, and text blocks.
 * @returns A UUID with dashes removed.
 */
const newKey = (): string => crypto.randomUUID().replaceAll('-', '');
/**
 * Builds a Portable Text cell containing one paragraph when text is supplied.
 * @param text Optional text for the new cell's first paragraph.
 * @returns Cell data with generated keys and an empty body when `text` is blank.
 */
const cell = (text = ''): TableCell => ({
  _key: newKey(),
  _type: 'cell',
  content: text
    ? [
        {
          _key: newKey(),
          _type: 'block',
          children: [{ _key: newKey(), _type: 'span', marks: [], text }],
          markDefs: [],
          style: 'normal',
        },
      ]
    : [],
});

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Renders a Docs table and its nested cell content.
 *
 * @param block Authored table block whose first row supplies the headings.
 *
 * @return The accessible table view.
 */
function Table({ block }: { block: TableBlock }): React.JSX.Element {
  const rows = (block.rows ?? []) as Array<{ _key: string; _type: 'row'; cells: DocTableCell[] }>;
  const count = rows.reduce((m, r) => Math.max(m, Array.isArray(r.cells) ? r.cells.length : 0), 0);
  /**
   * Renders a cell's nested Portable Text with attachments disabled in read-only mode.
   * @param c Optional cell value at the current row and column.
   * @returns The nested cell editor, or `null` for a padded empty cell.
   */
  const renderCell = (c: DocTableCell | undefined): React.JSX.Element | null =>
    c ? (
      <TerraContentEditor
        content={(Array.isArray(c.content) ? c.content : []) as unknown as ContentData}
        docsAttachments={[]}
        nested
        readOnly
      />
    ) : null;
  return (
    <ErrorBoundary name="TableBlock">
      <section className="my-6 overflow-x-auto" data-docs-editor-block="DocsTable">
        {block.header && block.header !== 'Table' && <h3 className="sr-only">{block.header}</h3>}
        <table>
          <thead>
            <tr>
              {cells(Array.isArray(rows[0]?.cells) ? rows[0].cells : [], count).map((c, i) => (
                <th key={c ? key(c, `${i}`) : i}>{renderCell(c)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(1).map((r, v) => {
              return (
                <tr key={key(r, `${v}`)}>
                  {cells(Array.isArray(r.cells) ? r.cells : [], count).map((c, i) => (
                    <td key={c ? key(c, `${i}`) : i}>{renderCell(c)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </ErrorBoundary>
  );
}

/**
 * Renders editable Docs table controls and cells.
 *
 * @param attrs DOM attributes supplied by the Portable Text editor.
 * @param children Nested editor content rendered after the table controls.
 * @param node Table block containing the header label and current rows.
 * @param path Portable Text path targeted by row, column, and header updates.
 *
 * @return The editable table controls and cells.
 */
function TableEditor({
  attributes: attrs,
  children,
  node,
  path,
}: PortableTextBlockEditorProps<TableBlock>): React.JSX.Element {
  const editor = useEditor();
  const block = node;
  const rows = block.rows ?? [];
  const colCount = Math.max(1, ...rows.map((r) => r.cells?.length ?? 0));
  /**
   * Commits the updated row matrix at this table block's Portable Text path.
   * @param nRows Rows after the selected table operation.
   * @returns No value; updates the table block in the editor.
   */
  const update = (nRows: NonNullable<TableBlock['rows']>): void =>
    editor.send({ type: 'block.set', at: path, props: { rows: nRows } });
  return (
    <ErrorBoundary name="TableEditor">
      <section
        {...attrs}
        contentEditable={false}
        className="my-6 overflow-x-auto rounded-md border border-primary-5 p-3"
        data-block="table"
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Input
            aria-label="Table heading"
            className="max-w-sm"
            value={block.header ?? ''}
            onChange={(e) =>
              editor.send({
                type: 'block.set',
                at: path,
                props: { header: e.currentTarget.value },
              })
            }
            placeholder="Table heading"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              update([
                ...rows,
                {
                  _key: newKey(),
                  _type: 'row',
                  cells: Array.from({ length: colCount }, () => cell()),
                },
              ])
            }
          >
            <AddIcon aria-hidden="true" /> Row
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              update(
                rows.map((r) => ({
                  ...r,
                  cells: [...(r.cells ?? []), cell()],
                })),
              )
            }
          >
            <AddIcon aria-hidden="true" /> Column
          </Button>
        </div>
        <table className="w-full border-collapse text-left">
          <tbody>
            {rows.map((r, v) => (
              <tr key={r._key}>
                {Array.from({ length: colCount }, (_cell, i) => {
                  const Tag = i === 0 ? 'th' : 'td';
                  return (
                    <Tag
                      key={r.cells?.[i]?._key ?? i}
                      className="border border-primary-5 p-1 align-top"
                    >
                      <textarea
                        aria-label={`Table cell ${v + 1}, ${i + 1}`}
                        className="min-h-10 w-full resize-y bg-transparent p-1 outline-none"
                        value={((c: TableCell | undefined) => {
                          return Array.isArray(c?.content)
                            ? c.content
                                .map((b) =>
                                  Array.isArray(b.children)
                                    ? b.children
                                        .map((c) =>
                                          'text' in c && typeof c.text === 'string' ? c.text : '',
                                        )
                                        .join('')
                                    : '',
                                )
                                .join('\n')
                            : '';
                        })(r.cells?.[i])}
                        onChange={({ currentTarget: { value: text } }) => {
                          update(
                            rows.map((r, c) => ({
                              ...r,
                              cells: Array.from({ length: colCount }, (_cell, x) => {
                                const curr = r.cells?.[x] ?? cell();
                                return c === v && x === i
                                  ? { ...curr, content: cell(text).content ?? [] }
                                  : curr;
                              }),
                            })),
                          );
                        }}
                      />
                    </Tag>
                  );
                })}
                <td className="w-9 p-1">
                  <Button
                    aria-label={`Delete row ${v + 1}`}
                    size="icon"
                    variant="ghost"
                    onClick={() => update(rows.filter((_row, i) => i !== v))}
                  >
                    <TrashIcon aria-hidden="true" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {colCount > 1 && (
          <div className="mt-2 flex gap-1">
            {Array.from({ length: colCount }, (_cell, v) => (
              <Button
                key={v}
                size="xs"
                variant="ghost"
                onClick={() =>
                  update(
                    rows.map((r) => ({
                      ...r,
                      cells: (r.cells ?? []).filter((_cell, i) => i !== v),
                    })),
                  )
                }
              >
                Delete column {v + 1}
              </Button>
            ))}
          </div>
        )}
        {children}
      </section>
    </ErrorBoundary>
  );
}

/**
 * Adapts Portable Text's block-object contract to the table renderer.
 *
 * @param attrs DOM attributes supplied by the Portable Text renderer.
 * @param children Nested editor content associated with the block.
 * @param node Table block data containing row and cell content.
 * @param path Portable Text path used to target the editable table.
 * @param readOnly Selects the static table view when editing is disabled.
 *
 * @return The table renderer in editable or read-only mode.
 */
export function renderTable({
  attributes: attrs,
  children,
  node,
  path,
  readOnly,
}: PortableTextBlockRendererProps<TableBlock>): React.JSX.Element {
  return readOnly ? (
    <Table block={node} />
  ) : (
    <TableEditor attributes={attrs} children={children} node={node} path={path} />
  );
}
Object.assign(Table, { displayName: 'DocsTablePreview' });
Object.assign(TableEditor, { displayName: 'DocsTableEditor' });
Object.assign(renderTable, { displayName: 'DocsTableRenderer' });

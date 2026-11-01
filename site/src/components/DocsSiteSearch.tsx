/**
 * site/src/components/DocsSiteSearch.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { useEffect, useMemo, useRef, useState } from 'react';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const S_REGEX = /\s+/;
type SearchDocument = {
  title: string;
  description: string;
  href: string;
  text: string;
};
type Props = { base?: string };

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Builds a short search snippet around the first matching query term.
 *
 * @param text Document text to show in the result.
 * @param query Term used to locate the most relevant excerpt position.
 *
 * @return A clipped excerpt with ellipses where surrounding text was omitted.
 */
function excerpt(text: string, query: string): string {
  const norm = text.replace(/\s+/g, ' ').trim();
  const offset = norm.toLowerCase().indexOf(query.toLowerCase());
  const start = Math.max(0, offset - 72);
  const end = Math.min(norm.length, start + 190);
  return `${start > 0 ? '…' : ''}${norm.slice(start, end)}${end < norm.length ? '…' : ''}`;
}

/*//////////////////////////////////////////////////
COMPONENTS
//////////////////////////////////////////////////*/

/**
 * Provides a keyboard-accessible dialog for searching the generated Docs index.
 *
 * @param props Optional base path used to fetch the site's search index.
 *
 * @return Search controls, loading and error states, and links to matching pages.
 */
export function DocsSiteSearch({ base = '/' }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [documents, setDocuments] = useState<SearchDocument[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [opened, setOpened] = useState(false);
  const normBase = base.endsWith('/') ? base : `${base}/`;
  /**
   * Opens the dialog and moves keyboard focus to the search field.
   *
   * @return Nothing; the callback updates dialog state and browser focus.
   */
  const open = () => {
    if (!dialog.current?.open) dialog.current?.showModal();
    setOpened(true);
    window.setTimeout(() => input.current?.focus(), 0);
  };
  useEffect(() => {
    /**
     * Opens search in response to the Docs site's custom search event.
     *
     * @return Nothing; the callback delegates to the dialog opener.
     */
    const onOpenSearch = () => open();
    /**
     * Opens search for the supported keyboard shortcuts outside form controls.
     *
     * @param event Keyboard event dispatched by the document.
     *
     * @return Nothing; a matching shortcut is prevented and opens the dialog.
     */
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        open();
      } else if (
        event.key === '/' &&
        !/input|textarea|select/i.test((event.target as HTMLElement)?.tagName ?? '')
      ) {
        event.preventDefault();
        open();
      }
    };
    document.addEventListener('docs:open-search', onOpenSearch);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('docs:open-search', onOpenSearch);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);
  useEffect(() => {
    if (!opened || loaded) return;
    fetch(`${normBase}_terra-docs/search-index.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`Search index returned ${response.status}`);
        return response.json() as Promise<SearchDocument[]>;
      })
      .then((data) => {
        setDocuments(data);
        setLoaded(true);
      })
      .catch(() => setFailed(true));
  }, [loaded, normBase, opened]);
  const results = useMemo(() => {
    const terms = query.toLowerCase().trim().split(S_REGEX).filter(Boolean);
    if (!terms.length) return [];
    return documents
      .map((document) => {
        const title = document.title.toLowerCase();
        const text = `${document.description} ${document.text}`.toLowerCase();
        const matches = terms.filter((term) => title.includes(term) || text.includes(term));
        const score = matches.length * 10 + terms.filter((term) => title.includes(term)).length * 5;
        return { document, score };
      })
      .filter((result) => result.score > 0)
      .sort(
        (left, right) =>
          right.score - left.score || left.document.title.localeCompare(right.document.title),
      )
      .slice(0, 10);
  }, [documents, query]);
  return (
    <div className="terra-docs-search">
      <dialog className="terra-docs-search-dialog" ref={dialog} onClose={() => setQuery('')}>
        <div className="terra-docs-search-panel">
          <label className="terra-docs-search-input-row">
            <span aria-hidden="true">⌕</span>
            <input
              ref={input}
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search documentation…"
            />
            <button type="button" onClick={() => dialog.current?.close()} aria-label="Close search">
              Esc
            </button>
          </label>
          <div className="terra-docs-search-results" aria-live="polite">
            {failed ? <p>Search is unavailable right now.</p> : null}
            {!loaded && !failed ? <p>Loading search…</p> : null}
            {loaded && query.trim() && results.length === 0 ? <p>No matching pages.</p> : null}
            {results.map(({ document }) => (
              <a key={document.href} href={document.href} onClick={() => dialog.current?.close()}>
                <strong>{document.title}</strong>
                {document.description ? <span>{document.description}</span> : null}
                <small>{excerpt(document.text, query.trim().split(S_REGEX)[0] ?? query)}</small>
              </a>
            ))}
          </div>
        </div>
      </dialog>
    </div>
  );
}

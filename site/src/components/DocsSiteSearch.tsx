import { useEffect, useMemo, useRef, useState } from 'react';

type SearchDocument = {
  title: string;
  description: string;
  href: string;
  text: string;
};

type Props = { base?: string };

function excerpt(text: string, query: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const offset = normalized.toLowerCase().indexOf(query.toLowerCase());
  const start = Math.max(0, offset - 72);
  const end = Math.min(normalized.length, start + 190);
  return `${start > 0 ? '…' : ''}${normalized.slice(start, end)}${end < normalized.length ? '…' : ''}`;
}

export function DocsSiteSearch({ base = '/' }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [documents, setDocuments] = useState<SearchDocument[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [opened, setOpened] = useState(false);
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;

  const open = () => {
    if (!dialog.current?.open) dialog.current?.showModal();
    setOpened(true);
    window.setTimeout(() => input.current?.focus(), 0);
  };

  useEffect(() => {
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
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!opened || loaded) return;
    fetch(`${normalizedBase}_terra-docs/search-index.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`Search index returned ${response.status}`);
        return response.json() as Promise<SearchDocument[]>;
      })
      .then((data) => {
        setDocuments(data);
        setLoaded(true);
      })
      .catch(() => setFailed(true));
  }, [loaded, normalizedBase, opened]);

  const results = useMemo(() => {
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
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
      <button
        className="terra-docs-search-trigger"
        type="button"
        onClick={open}
        aria-label="Search documentation"
      >
        <span aria-hidden="true">⌕</span>
        <span>Search docs</span>
        <kbd>⌘ K</kbd>
      </button>
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
                <small>{excerpt(document.text, query.trim().split(/\s+/)[0] ?? query)}</small>
              </a>
            ))}
          </div>
        </div>
      </dialog>
    </div>
  );
}

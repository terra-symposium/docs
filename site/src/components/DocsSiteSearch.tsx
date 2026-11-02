/**
 * site/src/components/DocsSiteSearch.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { useEffect, useMemo, useState } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@terra-symposium/styling/ui';

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
    setOpened(true);
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
    fetch(`${normBase}_docs/search-index.json`)
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
    <CommandDialog
      open={opened}
      onOpenChange={(nextOpen) => {
        setOpened(nextOpen);
        if (!nextOpen) setQuery('');
      }}
      size="lg"
      className="max-w-2xl"
      aria-label="Search documentation"
    >
      <CommandInput value={query} onValueChange={setQuery} placeholder="Search documentation…" />
      <CommandList className="max-h-[min(60vh,32rem)] p-2">
        {failed ? <CommandEmpty>Search is unavailable right now.</CommandEmpty> : null}
        {!loaded && !failed ? <CommandEmpty>Loading search…</CommandEmpty> : null}
        {loaded && query.trim() && results.length === 0 ? (
          <CommandEmpty>No matching pages.</CommandEmpty>
        ) : null}
        {results.length > 0 ? (
          <CommandGroup>
            {results.map(({ document }) => (
              <CommandItem
                key={document.href}
                value={`${document.title} ${document.description} ${document.text}`}
                onSelect={() => {
                  window.location.assign(document.href);
                  setOpened(false);
                }}
                className="items-start py-3"
              >
                <span className="flex min-w-0 flex-col gap-1">
                  <strong>{document.title}</strong>
                  {document.description ? (
                    <span className="text-sm text-primary-11">{document.description}</span>
                  ) : null}
                  <small className="line-clamp-2 text-xs text-primary-10">
                    {excerpt(document.text, query.trim().split(S_REGEX)[0] ?? query)}
                  </small>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}

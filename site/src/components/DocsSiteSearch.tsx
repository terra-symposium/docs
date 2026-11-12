/**
 * site/src/components/DocsSiteSearch.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { useEffect, useMemo, useState } from 'react';

// COMPONENTS
import * as TerraQualityRegex from '../../../src/lib/terra/regex.mjs';
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

const S_REGEX = TerraQualityRegex.REGEX_S_REGEX_2();
/** Search-index fields consumed by the Docs search ranking and result link renderer. */
type SearchDocument = {
  title: string;
  description: string;
  href: string;
  text: string;
};

/*//////////////////////////////////////////////////
COMPONENTS
//////////////////////////////////////////////////*/

/**
 * Provides a keyboard-accessible dialog for searching the generated Docs index.
 *
 * @param base - Public base path used to fetch the site's search index.
 *
 * @return Search controls, loading and error states, and links to matching pages.
 */
export function DocsSiteSearch({ base = '/' }: { base?: string }) {
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
        return {
          document,
          score:
            terms.filter(
              (term) =>
                title.includes(term) ||
                `${document.description} ${document.text}`.toLowerCase().includes(term),
            ).length *
              10 +
            terms.filter((term) => title.includes(term)).length * 5,
        };
      })
      .filter((result) => result.score > 0)
      .sort(
        (left, right) =>
          right.score - left.score || left.document.title.localeCompare(right.document.title),
      )
      .slice(0, 10)
      .map(({ document, score }) => {
        const normText = document.text.replace(TerraQualityRegex.REGEX_S_G_REGEX(), ' ').trim();
        const start = Math.max(
          0,
          normText.toLowerCase().indexOf((query.trim().split(S_REGEX)[0] ?? query).toLowerCase()) -
            72,
        );
        const end = Math.min(normText.length, start + 190);
        return {
          document,
          score,
          excerpt: `${start > 0 ? '…' : ''}${normText.slice(start, end)}${end < normText.length ? '…' : ''}`,
        };
      });
  }, [documents, query]);
  return (
    <CommandDialog
      open={opened}
      onOpenChange={(n) => {
        setOpened(n);
        if (!n) setQuery('');
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
            {results.map(({ document: d, excerpt: e }) => (
              <CommandItem
                key={d.href}
                value={`${d.title} ${d.description} ${d.text}`}
                onSelect={() => {
                  window.location.assign(d.href);
                  setOpened(false);
                }}
                className="items-start py-3"
              >
                <span className="flex min-w-0 flex-col gap-1">
                  <strong>{d.title}</strong>
                  {d.description ? (
                    <span className="text-sm text-primary-11">{d.description}</span>
                  ) : null}
                  <small className="line-clamp-2 text-xs text-primary-10">{e}</small>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}

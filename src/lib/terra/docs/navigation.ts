/**
 * src/lib/terra/docs/navigation.ts
 * Client-side Docs navigation and transition handling.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { clearTransition, setTransition } from './state.js';

// TYPES
import type { Mode } from '../runtime/types.js';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Changes the Docs route while preserving unrelated query parameters from the current page.
 *
 * @param href Destination URL resolved against the current site's origin.
 * @param mode View, edit, or attachment mode to encode in the destination query string.
 * @remarks Pushes browser history and dispatches `docs:navigate` so the workspace updates without a reload.
 */
export function navigateDocs({ href, mode }: { href: string; mode: Mode }): void {
  setTransition('local');
  const url = new URL(href, window.location.origin);
  new URL(window.location.href).searchParams.forEach((v, k) => {
    if (k !== 'mode' && !url.searchParams.has(k)) url.searchParams.set(k, v);
  });
  if (mode !== 'view') url.searchParams.set('mode', mode);
  else url.searchParams.delete('mode');
  window.history.pushState(null, '', url.toString());
  document.dispatchEvent(
    new CustomEvent('docs:navigate', {
      detail: { url: url.pathname + url.search, pathname: url.pathname + url.search },
    }),
  );
  // Safety escape hatch in case route reconciliation fails to unlock the shell.
  setTimeout(clearTransition, 1000);
}

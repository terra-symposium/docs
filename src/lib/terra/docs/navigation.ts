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
 * Pushes a local Docs route into browser history while preserving other query parameters.
 *
 * @param href - Local Docs route to push into browser history.
 * @param mode - Surface mode to preserve in the route; `view` removes the mode parameter.
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

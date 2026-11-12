/**
 * src/components/terra/editor/docs/_Embed.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// COMPONENTS
import * as TerraQualityRegex from '../../../../lib/terra/regex.mjs';
import { ErrorBoundary } from '../../ui.js';

// TYPES
import type { JSX } from 'react';
import type { DocsBlock } from '../types.js';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Safely renders a stored external URL, converting supported YouTube links to player URLs.
 *
 * @param block Embed block containing a source URL and optional title and dimensions.
 *
 * @return Embedded content, or null when no source is available.
 */
export function Embed({
  block,
}: {
  block: /** Sanity Portable Text embed URL and presentation data. */ DocsBlock<'embed'>;
}): JSX.Element | null {
  const source = typeof block.src === 'string' ? block.src : '';
  if (!source) return null;
  const title = typeof block.title === 'string' ? block.title : source;
  const height =
    typeof block.height === 'string' || typeof block.height === 'number' ? block.height : '500px';
  const width =
    typeof block.width === 'string' || typeof block.width === 'number' ? block.width : '100%';
  let embedSource = source;
  try {
    const url = new URL(source);
    const host = url.hostname.toLowerCase().replace(TerraQualityRegex.REGEX_WWW_REGEX(), '');
    let videoId: string | undefined;
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      const [, route, routeId] = url.pathname.match(/^\/(embed|shorts|live)\/([^/]+)/) ?? [];
      if (route) videoId = routeId;
      else if (url.pathname === '/watch') videoId = url.searchParams.get('v') ?? undefined;
    } else if (host === 'youtu.be') {
      videoId = url.pathname.split('/').filter(Boolean)[0];
    }
    if (videoId && TerraQualityRegex.REGEX_W_REGEX().test(videoId)) {
      const embed = new URL(
        `https://${host === 'youtube-nocookie.com' ? 'www.youtube-nocookie.com' : 'www.youtube.com'}/embed/${videoId}`,
      );
      for (const parameter of ['list', 'index', 'playsinline', 'rel']) {
        const value = url.searchParams.get(parameter);
        if (value) embed.searchParams.set(parameter, value);
      }
      const time = url.searchParams.get('start') ?? url.searchParams.get('t');
      let seconds: number | undefined;
      if (time && TerraQualityRegex.REGEX_D_REGEX().test(time)) seconds = Number(time);
      else if (time) {
        const match = time.match(TerraQualityRegex.REGEX_D_H_D_M_D_S_I_REGEX());
        if (match?.[0]) {
          const duration =
            Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
          if (duration > 0) seconds = duration;
        }
      }
      if (seconds !== undefined) embed.searchParams.set('start', String(seconds));
      embedSource = embed.toString();
    }
  } catch {
    // Keep the source URL when it cannot be parsed.
  }
  return (
    <ErrorBoundary name="Embed">
      <iframe
        className="my-6 w-full border-0"
        src={embedSource}
        title={title}
        style={{
          height,
          width,
        }}
      />
    </ErrorBoundary>
  );
}
Object.assign(Embed, { displayName: 'DocsEmbed' });

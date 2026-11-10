// @ts-nocheck -- source-preserving extraction; public host contracts are typed in src/host.ts.
/**
 * astro/src/components/editor/docs/_Embed.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// COMPONENTS
import { ErrorBoundary } from '../../ui.js';

// TYPES
import type { DocsBlock } from '../types.js';

/**
 * Renders the embed component.
 *
 * @param props - Embed block data containing the external source and title.
 *
 * @return Embedded content, or null when no source is available.
 */
export function Embed({
  block,
}: {
  block: /** Sanity Portable Text embed URL and presentation data. */ DocsBlock<'embed'>;
}): JSX.Element | null {
  if (!block.src) return null;
  let embedSource = block.src;
  try {
    const url = new URL(block.src);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let videoId: string | undefined;

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      const [, route, routeId] = url.pathname.match(/^\/(embed|shorts|live)\/([^/]+)/) ?? [];
      if (route) videoId = routeId;
      else if (url.pathname === '/watch') videoId = url.searchParams.get('v') ?? undefined;
    } else if (host === 'youtu.be') {
      videoId = url.pathname.split('/').filter(Boolean)[0];
    }

    if (videoId && /^[\w-]+$/.test(videoId)) {
      const embed = new URL(
        `https://${host === 'youtube-nocookie.com' ? 'www.youtube-nocookie.com' : 'www.youtube.com'}/embed/${videoId}`,
      );
      for (const parameter of ['list', 'index', 'playsinline', 'rel']) {
        const value = url.searchParams.get(parameter);
        if (value) embed.searchParams.set(parameter, value);
      }

      const time = url.searchParams.get('start') ?? url.searchParams.get('t');
      let seconds: number | undefined;
      if (time && /^\d+$/.test(time)) seconds = Number(time);
      else if (time) {
        const match = time.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
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
        title={block.title ?? block.src}
        style={{
          height: block.height ?? '500px',
          width: block.width ?? '100%',
        }}
      />
    </ErrorBoundary>
  );
}
Object.assign(Embed, { displayName: 'DocsEmbed' });

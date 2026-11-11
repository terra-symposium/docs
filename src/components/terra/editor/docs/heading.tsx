/**
 * src/components/terra/editor/docs/heading.tsx
 * Shared Docs heading identifiers and copyable read-only headings.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { isValidElement, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// COMPONENTS
import * as TerraQualityRegex from '../../../../lib/terra/regex.mjs';
import { Children } from 'react';
import { Link as LinkIcon } from '@carbon/icons-react';

// TYPES
import type { ReactNode } from 'react';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Normalizes text into the URL identifier used by Docs headings and their table of contents.
 *
 * @param text - The heading text to normalize.
 *
 * @return The heading's URL fragment.
 */
export const toHeadingId = (text: string): string =>
  text
    .toLowerCase()
    .replace(TerraQualityRegex.REGEX_A_Z0_9_G_REGEX(), '-')
    .replace(TerraQualityRegex.REGEX_G_REGEX_6(), '');

/*//////////////////////////////////////////////////
COMPONENTS
//////////////////////////////////////////////////*/

/**
 * Renders a Docs heading with a keyboard-accessible control for copying its link.
 *
 * @param children Heading content whose rendered text determines the copied fragment.
 * @param level Semantic heading element used for the requested outline depth.
 *
 * @return A heading with a copy-link button.
 */
export function DocsHeading({
  children,
  level,
}: {
  children: ReactNode;
  level: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}): React.JSX.Element {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [text, setText] = useState(() => {
    const pending = Children.toArray(children).reverse();
    let result = '';
    while (pending.length > 0) {
      const child = pending.pop();
      if (typeof child === 'string' || typeof child === 'number') result += String(child);
      else if (isValidElement<{ children?: ReactNode }>(child))
        pending.push(...Children.toArray(child.props.children).reverse());
    }
    return result.trim();
  });
  useEffect(() => {
    const renderedText = headingRef.current?.textContent?.trim();
    if (renderedText) setText(renderedText);
  }, [children]);
  const id = toHeadingId(text);
  const Heading = level;
  return (
    <Heading id={id} ref={headingRef}>
      <button
        type="button"
        className="heading-anchor"
        aria-label={`Copy link to ${text}`}
        title={`Copy link to ${text}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(
              `${window.location.origin}${window.location.pathname}#${id}`,
            );
            toast.success('Link copied', {
              duration: 2800,
              style: {
                background: 'rgb(var(--primary-9))',
                borderColor: 'rgb(var(--primary-9))',
                color: 'rgb(var(--primary-1))',
              },
            });
          } catch {
            toast.error('Unable to copy link');
          }
        }}
      >
        {children}
        <span className="heading-anchor-icon" aria-hidden="true">
          <LinkIcon />
        </span>
      </button>
    </Heading>
  );
}

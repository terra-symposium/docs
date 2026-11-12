/**
 * src/lib/docs-theme.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { colors, invert } from '@terra-symposium/styling';

// TYPES
import type { CSSProperties } from 'react';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Build both hue scales; CSS selects the active one for the host's theme.
 *
 * @param hue - Host accent hue; `null` selects the neutral Styling palette.
 *
 * @return CSS custom properties containing the primary, secondary, and gray theme scales.
 */
export function docsHueTheme(hue: number | null): CSSProperties {
  const [primary, baseGray] = colors(hue);
  // Keep the original Styling contract: links and diagram nodes use the
  // complementary secondary palette, while gray remains neutral.
  const [secondary, gray] = hue === null ? [baseGray, baseGray] : colors(invert(hue));
  const variables: Record<string, string> = { '--hue': String(hue ?? 0) };
  for (let index = 0; index < 12; index += 1) {
    const step = index + 1;
    variables[`--primaryLight${step}`] = primary.light[index]!;
    variables[`--primaryDark${step}`] = primary.dark[index]!;
    variables[`--secondaryLight${step}`] = secondary.light[index]!;
    variables[`--secondaryDark${step}`] = secondary.dark[index]!;
    variables[`--grayLight${step}`] = gray.light[index]!;
    variables[`--grayDark${step}`] = gray.dark[index]!;
  }
  return variables as CSSProperties;
}

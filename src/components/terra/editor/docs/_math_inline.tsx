/**
 * src/components/terra/editor/docs/_math_inline.tsx
 * Read-only Docs math inline renderer for the shared Content editor.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { renderMath } from './_Math.js';

// TYPES
import type { InlineObjectRenderProps } from '@portabletext/editor';

/*//////////////////////////////////////////////////
COMPONENTS
//////////////////////////////////////////////////*/

/**
 * Renders a read-only Docs formula as an inline Portable Text object.
 *
 * @param attrs DOM attributes supplied by the Portable Text inline-object renderer.
 * @param children Nested editor content following the formula.
 * @param node Inline math object containing its optional source string.
 *
 * @return Inline rendered formula.
 */
export default function MathInline({
  attributes: attrs,
  children,
  node,
}: InlineObjectRenderProps): React.JSX.Element {
  return (
    <span
      {...attrs}
      className="mx-1 inline align-baseline"
      contentEditable={false}
      data-terra-inline="math"
      suppressContentEditableWarning
    >
      {renderMath({
        code:
          (
            node as /** Optional math source read from the inline Portable Text object's node value. */ {
              code?: string;
            }
          ).code || '',
        inline: true,
        className: 'align-baseline',
      })}
      {children}
    </span>
  );
}
Object.assign(MathInline, { displayName: 'DocsMathInline' });

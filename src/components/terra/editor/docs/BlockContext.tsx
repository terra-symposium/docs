/**
 * src/components/terra/editor/docs/BlockContext.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { useRef, useState } from 'react';

// COMPONENTS
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@terra-symposium/styling/ui';
import { ErrorBoundary } from '../../ui.js';

// TYPES
import type { JSX, ReactNode } from 'react';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** One context-menu command that can be selected for an editor block. */
type BlockActionItem = {
  text: string;
  icon?: ReactNode;
  intent?: string;
  onSelect?: () => void;
};
/** Command, separator, or submenu entry collected from the clicked block and its ancestors. */
type BlockAction =
  BlockActionItem | { sep: true } | { text: string; icon?: ReactNode; sub: BlockActionItem[] };
/** Editor element carrying optional commands used by the shared block context menu. */
type BlockActionTarget = HTMLElement & { __blockActions?: BlockAction[] };

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Preserve the original Docs block context menu and its deferred focus handoff.
 *
 * @param children Editor content wrapped by the context-menu event handler.
 * @param enabled Whether to install the menu trigger around the content.
 *
 * @return Content with block context-menu actions when enabled.
 */
export function BlockContext({
  children,
  enabled = true,
}: {
  children: ReactNode;
  enabled?: boolean;
}): JSX.Element {
  const [actions, setActions] = useState<BlockAction[] | null>(null);
  const selectedAction = useRef<Array<(() => void) | null>>([]);
  if (!enabled) return <>{children}</>;
  return (
    <ErrorBoundary name="BlockContext">
      <ContextMenu onOpenChange={(o) => !o && setActions(null)}>
        <ContextMenuTrigger asChild>
          <div className="docs-context-menu-trigger-wrapper">
            <div
              className="relative w-full"
              onContextMenuCapture={(e) => {
                let current: BlockActionTarget | null =
                  e.target instanceof HTMLElement
                    ? (e.target as BlockActionTarget)
                    : e.target instanceof Node
                      ? (e.target.parentElement as BlockActionTarget | null)
                      : null;
                const nActions: BlockAction[] = [];
                while (current && current !== e.currentTarget) {
                  if (current.__blockActions?.length) {
                    if (nActions.length) nActions.push({ sep: true });
                    nActions.push(...current.__blockActions);
                  }
                  current = current.parentElement as BlockActionTarget | null;
                }
                if (!nActions.length) {
                  const block = (e.target as HTMLElement).closest<HTMLElement>(
                    '[data-docs-editor-block], [data-docs-block], [data-block]',
                  );
                  if (!block) {
                    e.stopPropagation();
                    return;
                  }
                  nActions.push({
                    text: 'Select block',
                    onSelect: () =>
                      document.dispatchEvent(
                        new CustomEvent('docs:block-select', {
                          detail: {
                            block,
                            decorator: block.closest('.docs-context-wrapper') || block,
                          },
                        }),
                      ),
                  });
                }
                setActions(nActions);
              }}
            >
              {children}
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent
          className="w-64"
          onCloseAutoFocus={(e) => {
            if (!selectedAction.current.length) return;
            e.preventDefault();
            selectedAction.current.splice(0, 1)[0]?.();
          }}
        >
          {actions?.map((a, i) => {
            if ('sep' in a) return <ContextMenuSeparator key={`separator-${i}`} />;
            if ('sub' in a)
              return (
                <ContextMenuSub key={a.text}>
                  <ContextMenuSubTrigger>
                    {a.icon} {a.text}
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent>
                    {a.sub.map((i) => (
                      <ContextMenuItem
                        key={i.text}
                        intent={i.intent as never}
                        onSelect={() => {
                          selectedAction.current[0] = i.onSelect ?? null;
                        }}
                      >
                        {i.icon} {i.text}
                      </ContextMenuItem>
                    ))}
                  </ContextMenuSubContent>
                </ContextMenuSub>
              );
            return (
              <ContextMenuItem
                key={a.text}
                intent={a.intent as never}
                onSelect={() => {
                  selectedAction.current.splice(0, 1, a.onSelect ?? null);
                }}
              >
                {a.icon} {a.text}
              </ContextMenuItem>
            );
          })}
        </ContextMenuContent>
      </ContextMenu>
    </ErrorBoundary>
  );
}

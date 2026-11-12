/** Shared utility fragments for recurring Docs layout patterns. */
export const DOCS_LAYOUT_CLASSES = {
  compactRow: 'flex items-center gap-1',
  controlRow: 'flex gap-2',
  dialogActions: 'flex justify-end gap-2',
  iconBeforeLabel: 'mr-2 size-4',
  spacedStack: 'flex flex-col gap-4',
  controlTitle: 'text-sm font-medium',
  flexScrollArea: 'min-h-0 flex-1 overflow-y-auto',
} as const;

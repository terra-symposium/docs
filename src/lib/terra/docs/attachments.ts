/**
 * src/lib/terra/docs/attachments.ts
 * Attachment categories and the shared active filter.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { atom } from 'nanostores';

// TYPES
import type { AttchType } from '../runtime/types.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

export const ATTCH_TYPES = ['document', 'image', 'youtube', 'website', 'tsdocs', 'other'] as const;
export const $attachmentFilter = atom<AttchType[]>([...ATTCH_TYPES]);

/**
 * test/browser/support/editor.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// TYPES
import type { DocsBlockOptions } from '../../../src/components/blocks.js';
import type { DocsHostAttachment } from '../../../src/lib/host.js';
import type { Page } from '@playwright/test';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** Portable Text array accepted by the browser editor fixture. */
export type Content = unknown[];

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Opens the shared editor with a deterministic document and optional host capabilities.
 *
 * @param page Browser page that loads the editor harness.
 * @param content Portable Text fixture installed before the page scripts run.
 * @param options Attachments, block flags, toolbar state, and mocked host replies for this fixture.
 */
export async function openEditor(
  page: Page,
  content: Content,
  options: {
    attachments?: DocsHostAttachment[];
    blocks?: DocsBlockOptions;
    nested?: boolean;
    persistKey?: string;
    readOnly?: boolean;
    mockResponses?: Record<string, { data?: unknown; error?: string }>;
    toolbar?: boolean;
  } = {},
): Promise<void> {
  await page.addInitScript(
    ({ fixture: f, settings: s }) => {
      Object.assign(window, {
        __contentFixture: f,
        __contentOptions: s,
        __docsMockResponses: s.mockResponses,
      });
    },
    { fixture: content, settings: options },
  );
  await page.goto('/editor-harness/');
  await page.locator('[data-content-editor]').first().waitFor();
}

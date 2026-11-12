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

/** Flexible Portable Text fixtures, including legacy and production-shaped Docs block records. */
export type Content = unknown[];

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Loads the editor harness with fixture content and optional host, toolbar, and mode settings.
 *
 * @param page Playwright page used to install the fixture and open the editor harness.
 * @param content Portable Text blocks passed into the editor for this browser test.
 * @param options Optional attachments, blocks, persistence, mock actions, and display settings.
 *
 * @return Resolves after the harness mounts its content editor.
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

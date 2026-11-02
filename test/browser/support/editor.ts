import type { Page } from '@playwright/test';
import type { DocsBlockOptions } from '../../../src/components/blocks.js';
import type { DocsHostAttachment } from '../../../src/lib/host.js';

export type Content = unknown[];

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
    ({ fixture, settings }) => {
      Object.assign(window, {
        __contentFixture: fixture,
        __contentOptions: settings,
        __docsMockResponses: settings.mockResponses,
      });
    },
    { fixture: content, settings: options },
  );
  await page.goto('/editor-harness/');
  await page.locator('[data-content-editor]').first().waitFor();
}

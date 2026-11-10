import { openEditor } from '../../../../support/editor.js';
import { expect, test } from '@playwright/test';
import type { Content } from '../../../../support/editor.js';

const XL_VIEWPORT_TEST = {
  tag: '@viewport:xl',
  annotation: {
    type: 'viewport-reason',
    description: 'The accordion interaction is checked in the desktop editor layout.',
  },
} as const;

const accordionFixture = [
  {
    _key: 'accordion-under-test',
    _type: 'accordion',
    items: [
      {
        _key: 'first-section',
        _type: 'item',
        title: 'First section',
        content: [
          {
            _key: 'first-paragraph',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _key: 'first-span',
                _type: 'span',
                marks: [],
                text: 'Nested accordion explanation',
              },
            ],
          },
        ],
      },
    ],
  },
] satisfies Content;

test(
  'legacy accordion records migrate to Markdown in the editor',
  XL_VIEWPORT_TEST,
  async ({ page }) => {
    await openEditor(page, accordionFixture);

    await expect(page.locator('[data-block="accordion"]')).toHaveCount(0);
    const raw = page.locator('[data-docs-editor-block="Raw Markdown"]');
    await expect(raw).toBeVisible();
    await expect(raw).toContainText('===[First section]');
    await expect(raw).toContainText('Nested accordion explanation');
  },
);

test(
  'legacy accordion Markdown renders and toggles with the shared Styling control',
  XL_VIEWPORT_TEST,
  async ({ page }) => {
    await openEditor(page, accordionFixture, { readOnly: true });

    const trigger = page.getByRole('button', { name: 'First section' });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    await expect(
      page
        .getByRole('region', { name: 'First section' })
        .getByText('Nested accordion explanation', { exact: true }),
    ).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  },
);

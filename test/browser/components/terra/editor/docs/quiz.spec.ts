/**
 * test/browser/components/terra/editor/docs/quiz.spec.ts
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { expect, test } from '@playwright/test';
import {
  quizDemoLeaf,
  quizDemoResponse,
} from '../../../../../../src/components/quiz-demo-fixture.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const fixture = {
  tree: [
    {
      type: 'branch',
      origName: 'course',
      title: 'Course',
      children: [
        {
          type: 'leaf',
          origName: quizDemoLeaf.id,
          title: quizDemoLeaf.title,
          path: quizDemoLeaf.path,
          url: '/strict-local-workspace-harness/',
        },
      ],
    },
  ],
  pages: [{ ...quizDemoLeaf, pathname: '/strict-local-workspace-harness/' }],
  pathname: '/strict-local-workspace-harness/',
  title: 'Fixture Docs',
  rootPath: '/docs/',
  homePath: '/docs/quiz-leaf/',
};
const response = quizDemoResponse;

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Loads a fixture leaf with a deterministic quiz response or injected generation failure.
 *
 * @param page Browser page that hosts the local Docs workspace harness.
 * @param config Optional response override, failure message, and toolbar visibility for this scenario.
 */
async function openQuizWorkspace(
  page: import('@playwright/test').Page,
  config: { failure?: string; response?: unknown; toolbar?: boolean } = {},
) {
  await page.addInitScript(
    ({ docsFixture: d, quizHarness: q }) => {
      Object.assign(window, { __docsLocalWorkspaceFixture: d, __docsQuizHarness: q });
    },
    { docsFixture: fixture, quizHarness: { response, ...config } },
  );
  await page.goto('/strict-local-workspace-harness/');
  await expect(page.locator('[data-docs-shell]')).toHaveAttribute('data-loading', 'false');
}
test(
  'quiz toolbar and Markdown opt-in generate, review, run, score, and discard a leaf quiz',
  { tag: '@viewport:xl' },
  async ({ page: p }) => {
    await openQuizWorkspace(p, { toolbar: true });
    await expect(
      p.locator('.docs-toolbar-scroll').getByRole('button', { name: 'Generate quiz' }),
    ).toBeVisible();
    await expect(p.getByRole('region', { name: 'Quiz generator' })).toBeVisible();
    await p.locator('.docs-toolbar-scroll').getByRole('button', { name: 'Generate quiz' }).click();
    const dialog = p.getByRole('dialog', { name: 'Generate a quiz' });
    await dialog.getByLabel('Number of questions').fill('2');
    await dialog.getByLabel('Keyword answer').check();
    await dialog.getByRole('button', { name: 'Generate quiz' }).click();
    await expect(dialog.getByText('Question 1 · Multiple choice')).toBeVisible();
    await expect(dialog.getByText('Question 2 · Keyword')).toBeVisible();
    const request = JSON.parse((await p.locator('html').getAttribute('data-quiz-input')) ?? '{}');
    expect(request).toEqual({
      title: 'Course Leaf',
      markdown: fixture.pages[0].markdown,
      count: 2,
      types: ['multipleChoice', 'keyword'],
    });
    await dialog.getByLabel('Prompt').first().fill('Which component forwards packets?');
    await dialog.getByRole('button', { name: 'Start quiz' }).click();
    await dialog.getByLabel('Routes packets').check();
    await dialog.getByRole('button', { name: 'Check answer' }).click();
    await expect(dialog.getByRole('status')).toContainText('Correct.');
    await expect(dialog.getByRole('status')).toContainText('It forwards packets between networks.');
    await dialog.getByRole('button', { name: 'Next' }).click();
    await dialog.getByLabel('Your answer').fill('packets');
    await dialog.getByRole('button', { name: 'Check answer' }).click();
    await expect(dialog.getByRole('status')).toContainText('Correct.');
    await dialog.getByRole('button', { name: 'Finish quiz' }).click();
    await expect(dialog.getByText('Score: 2 / 2')).toBeVisible();
    await p.goto('/strict-local-workspace-harness/');
    await expect(
      p.getByText('Generate a quiz from this leaf. Your quiz is kept in this page session only.'),
    ).toBeVisible();
    await expect(p.getByText('Score: 2 / 2')).toHaveCount(0);
  },
);
test(
  'quiz toolbar is off by default while Markdown opt-in generates the quiz',
  { tag: '@viewport:xl' },
  async ({ page: p }) => {
    await openQuizWorkspace(p, {
      response: { title: 'One question', questions: [response.questions[0]] },
    });
    await expect(
      p.locator('.docs-toolbar-scroll').getByRole('button', { name: 'Generate quiz' }),
    ).toHaveCount(0);
    await expect(p.getByRole('region', { name: 'Quiz generator' })).toBeVisible();

    // An opt-in block remains useful even with the global toolbar disabled.
    const block = p.locator('[data-docs-view-root] .docs-quiz').last();
    await block.getByLabel('Number of questions').fill('1');
    await block.getByRole('button', { name: 'Generate quiz' }).click();
    await expect(block.getByText('Question 1 · Multiple choice')).toBeVisible();
  },
);
test(
  'host generation failures keep the quiz editor available for retry',
  { tag: '@viewport:xl' },
  async ({ page: p }) => {
    await openQuizWorkspace(p, {
      toolbar: true,
      failure: 'The quiz endpoint is temporarily unavailable.',
    });
    await p.getByRole('button', { name: 'Generate quiz' }).first().click();
    const dialog = p.getByRole('dialog', { name: 'Generate a quiz' });
    await dialog.getByRole('button', { name: 'Generate quiz' }).click();
    await expect(dialog.getByRole('alert')).toContainText('temporarily unavailable');
    await expect(dialog.getByRole('button', { name: 'Generate quiz' })).toBeEnabled();
  },
);
test(
  'invalid endpoint quiz data displays a recoverable validation error',
  { tag: '@viewport:xl' },
  async ({ page: p }) => {
    await openQuizWorkspace(p, {
      toolbar: true,
      response: {
        title: 'Bad quiz',
        questions: [{ type: 'multipleChoice', prompt: 'Pick', opts: ['A', 'B'], answer: 'C' }],
      },
    });
    await p.getByRole('button', { name: 'Generate quiz' }).first().click();
    const dialog = p.getByRole('dialog', { name: 'Generate a quiz' });
    await dialog.getByRole('button', { name: 'Generate quiz' }).click();
    await expect(dialog.getByRole('alert')).toContainText(
      'correct answer selected from those options',
    );
  },
);

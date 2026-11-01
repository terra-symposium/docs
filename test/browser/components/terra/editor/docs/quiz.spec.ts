import { expect, test } from '@playwright/test';

const fixture = {
  tree: [
    {
      type: 'branch',
      origName: 'course',
      title: 'Course',
      children: [
        {
          type: 'leaf',
          origName: 'quiz-leaf',
          title: 'Course Leaf',
          path: 'course/quiz-leaf/index.md',
          url: '/strict-local-workspace-harness/',
        },
      ],
    },
  ],
  pages: [
    {
      id: 'quiz-leaf',
      path: 'content/course/quiz-leaf/index.md',
      pathname: '/strict-local-workspace-harness/',
      title: 'Course Leaf',
      markdown:
        'Leaf source: routing sends packets between networks.\n\n:::terra-docs quiz\n_type: quiz\n:::',
    },
  ],
  pathname: '/strict-local-workspace-harness/',
  title: 'Fixture Docs',
  rootPath: '/docs/',
  homePath: '/docs/quiz-leaf/',
};

const response = {
  title: 'Routing quiz',
  questions: [
    {
      type: 'multipleChoice',
      prompt: 'What does a router do?',
      opts: ['Routes packets', 'Stores files'],
      answer: 'Routes packets',
      explanation: 'It forwards packets between networks.',
    },
    { type: 'keyword', prompt: 'What does it forward?', answers: ['packets'] },
  ],
};

async function openQuizWorkspace(
  page: import('@playwright/test').Page,
  config: { failure?: string; response?: unknown; toolbar?: boolean } = {},
) {
  await page.addInitScript(
    ({ docsFixture, quizHarness }) => {
      Object.assign(window, {
        __terraDocsLocalWorkspaceFixture: docsFixture,
        __terraDocsQuizHarness: quizHarness,
      });
    },
    { docsFixture: fixture, quizHarness: { response, ...config } },
  );
  await page.goto('/strict-local-workspace-harness/');
  await expect(page.locator('[data-docs-shell]')).toHaveAttribute('data-loading', 'false');
}

test(
  'quiz toolbar and Markdown opt-in generate, review, run, score, and discard a leaf quiz',
  { tag: '@viewport:xl' },
  async ({ page }) => {
    await openQuizWorkspace(page, { toolbar: true });
    await expect(page.getByRole('button', { name: 'Generate quiz' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Quiz generator' })).toBeVisible();

    await page.getByRole('button', { name: 'Generate quiz' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Generate a quiz' });
    await dialog.getByLabel('Number of questions').fill('2');
    await dialog.getByLabel('Keyword answer').check();
    await dialog.getByRole('button', { name: 'Generate quiz' }).click();
    await expect(dialog.getByText('Question 1 · Multiple choice')).toBeVisible();
    await expect(dialog.getByText('Question 2 · Keyword')).toBeVisible();
    const request = JSON.parse(
      (await page.locator('html').getAttribute('data-quiz-input')) ?? '{}',
    );
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

    await page.goto('/strict-local-workspace-harness/');
    await expect(
      page.getByText(
        'Generate a quiz from this leaf. Your quiz is kept in this page session only.',
      ),
    ).toBeVisible();
    await expect(page.getByText('Score: 2 / 2')).toHaveCount(0);
  },
);

test(
  'quiz toolbar is off by default while Markdown opt-in generates the quiz',
  { tag: '@viewport:xl' },
  async ({ page }) => {
    await openQuizWorkspace(page, {
      response: { title: 'One question', questions: [response.questions[0]] },
    });
    await expect(page.getByRole('button', { name: 'Generate quiz' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Quiz generator' })).toBeVisible();

    // An opt-in block remains useful even with the global toolbar disabled.
    const block = page.locator('[data-docs-view-root] .terra-docs-quiz').last();
    await block.getByLabel('Number of questions').fill('1');
    await block.getByRole('button', { name: 'Generate quiz' }).click();
    await expect(block.getByText('Question 1 · Multiple choice')).toBeVisible();
  },
);

test(
  'host generation failures keep the quiz editor available for retry',
  { tag: '@viewport:xl' },
  async ({ page }) => {
    await openQuizWorkspace(page, {
      toolbar: true,
      failure: 'The quiz endpoint is temporarily unavailable.',
    });
    await page.getByRole('button', { name: 'Generate quiz' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Generate a quiz' });
    await dialog.getByRole('button', { name: 'Generate quiz' }).click();
    await expect(dialog.getByRole('alert')).toContainText('temporarily unavailable');
    await expect(dialog.getByRole('button', { name: 'Generate quiz' })).toBeEnabled();
  },
);

test(
  'invalid endpoint quiz data displays a recoverable validation error',
  { tag: '@viewport:xl' },
  async ({ page }) => {
    await openQuizWorkspace(page, {
      toolbar: true,
      response: {
        title: 'Bad quiz',
        questions: [{ type: 'multipleChoice', prompt: 'Pick', opts: ['A', 'B'], answer: 'C' }],
      },
    });
    await page.getByRole('button', { name: 'Generate quiz' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Generate a quiz' });
    await dialog.getByRole('button', { name: 'Generate quiz' }).click();
    await expect(dialog.getByRole('alert')).toContainText(
      'correct answer selected from those options',
    );
  },
);

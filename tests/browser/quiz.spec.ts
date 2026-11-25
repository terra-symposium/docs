import { expect, test } from '@playwright/test';
import { quizDemoLeaf, quizDemoResponse } from '../../src/components/quiz-demo-fixture.js';

const fixture = {
	tree: [
		{
			type: 'branch',
			origName: 'course',
			title: 'Course',
			children: [{ type: 'leaf', origName: quizDemoLeaf.id, title: quizDemoLeaf.title, path: quizDemoLeaf.path, url: '/strict-local-workspace-harness/' }],
		},
	],
	pages: [{ ...quizDemoLeaf, pathname: '/strict-local-workspace-harness/' }],
	pathname: '/strict-local-workspace-harness/',
	title: 'Fixture Docs',
	rootPath: '/docs/',
	homePath: '/docs/quiz-leaf/',
};

const response = quizDemoResponse;

async function openQuizWorkspace(page: import('@playwright/test').Page, config: { failure?: string; response?: unknown; toolbar?: boolean } = {}) {
	await page.addInitScript(
		({ docsFixture, quizHarness }) => {
			Object.assign(window, { __docsLocalWorkspaceFixture: docsFixture, __docsQuizHarness: quizHarness });
		},
		{ docsFixture: fixture, quizHarness: { response, ...config } },
	);
	await page.goto('/strict-local-workspace-harness/');
	await expect(page.locator('[data-docs-shell]')).toHaveAttribute('data-loading', 'false');
}

test('quiz toolbar and Markdown opt-in generate, review, run, score, and discard a leaf quiz', { tag: '@viewport:xl' }, async ({ page }) => {
	await openQuizWorkspace(page, { toolbar: true });
	const toolbar = page.locator('[data-docs-quiz-toolbar]');
	await expect(toolbar.getByRole('button', { name: 'Generate quiz' })).toBeVisible();

	await toolbar.getByRole('button', { name: 'Generate quiz' }).click();
	const generator = toolbar.getByRole('region', { name: 'Quiz generator' });
	await generator.getByLabel('Number of questions').fill('2');
	await generator.getByLabel('Keyword answer').check();
	await generator.getByRole('button', { name: 'Generate quiz' }).click();
	await expect(generator.getByText('Question 1 · Multiple choice')).toBeVisible();
	await expect(generator.getByText('Question 2 · Keyword')).toBeVisible();
	// hygiene-ignore single-use -- Keep the emitted host input named so the request contract stays distinct from its expected payload.
	const request = JSON.parse((await page.locator('html').getAttribute('data-quiz-input')) ?? '{}');
	expect(request).toEqual({ title: 'Course Leaf', markdown: fixture.pages[0].markdown, count: 2, types: ['multipleChoice', 'keyword'] });

	await generator.getByLabel('Prompt').first().fill('Which component forwards packets?');
	await generator.getByRole('button', { name: 'Start quiz' }).click();
	await generator.getByLabel('Routes packets').check();
	await generator.getByRole('button', { name: 'Check answer' }).click();
	await expect(generator.getByRole('status')).toContainText('Correct.');
	await expect(generator.getByRole('status')).toContainText('It forwards packets between networks.');
	await generator.getByRole('button', { name: 'Next' }).click();
	await generator.getByLabel('Your answer').fill('packets');
	await generator.getByRole('button', { name: 'Check answer' }).click();
	await expect(generator.getByRole('status')).toContainText('Correct.');
	await generator.getByRole('button', { name: 'Finish quiz' }).click();
	await expect(generator.getByText('Score: 2 / 2')).toBeVisible();

	await page.goto('/strict-local-workspace-harness/');
	await expect(page.getByText('Generate a quiz from this leaf. Your quiz is kept in this page session only.')).toBeVisible();
	await expect(page.getByText('Score: 2 / 2')).toHaveCount(0);
});

test('quiz toolbar is off by default while Markdown opt-in generates the quiz', { tag: '@viewport:xl' }, async ({ page }) => {
	await openQuizWorkspace(page, { response: { title: 'One question', questions: [response.questions[0]] } });
	await expect(page.getByRole('region', { name: 'Quiz generator' })).toBeVisible();
	await expect(page.locator('[data-docs-quiz-toolbar]')).toHaveCount(0);

	// An opt-in block remains useful even with the global toolbar disabled.
	const block = page.locator('[data-docs-view-root] .docs-quiz').last();
	await expect(page.getByRole('button', { name: 'Generate quiz' })).toHaveCount(1);
	await block.getByLabel('Number of questions').fill('1');
	await block.getByRole('button', { name: 'Generate quiz' }).click();
	await expect(block.getByText('Question 1 · Multiple choice')).toBeVisible();
});

test('host generation failures keep the quiz editor available for retry', { tag: '@viewport:xl' }, async ({ page }) => {
	await openQuizWorkspace(page, { toolbar: true, failure: 'The quiz endpoint is temporarily unavailable.' });
	const toolbar = page.locator('[data-docs-quiz-toolbar]');
	await toolbar.getByRole('button', { name: 'Generate quiz' }).click();
	const generator = toolbar.getByRole('region', { name: 'Quiz generator' });
	await generator.getByRole('button', { name: 'Generate quiz' }).click();
	await expect(generator.getByRole('alert')).toContainText('temporarily unavailable');
	await expect(generator.getByRole('button', { name: 'Generate quiz' })).toBeEnabled();
});

test('invalid endpoint quiz data displays a recoverable validation error', { tag: '@viewport:xl' }, async ({ page }) => {
	await openQuizWorkspace(page, { toolbar: true, response: { title: 'Bad quiz', questions: [{ type: 'multipleChoice', prompt: 'Pick', opts: ['A', 'B'], answer: 'C' }] } });
	const toolbar = page.locator('[data-docs-quiz-toolbar]');
	await toolbar.getByRole('button', { name: 'Generate quiz' }).click();
	const generator = toolbar.getByRole('region', { name: 'Quiz generator' });
	await generator.getByRole('button', { name: 'Generate quiz' }).click();
	await expect(generator.getByRole('alert')).toContainText('correct answer selected from those options');
});

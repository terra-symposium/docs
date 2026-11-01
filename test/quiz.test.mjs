import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDocsQuiz } from '../dist/lib/components/quiz.js';

test('quiz response validation accepts both supported question types', () => {
  const quiz = parseDocsQuiz({
    title: 'Leaf quiz',
    questions: [
      { type: 'multipleChoice', prompt: 'Pick one', opts: ['A', 'B'], answer: 'B' },
      { type: 'keyword', prompt: 'Name it', answers: ['Router', 'A router'] },
    ],
  });
  assert.equal(quiz.questions.length, 2);
  assert.equal(quiz.questions[0].type, 'multipleChoice');
  assert.equal(quiz.questions[1].type, 'keyword');
});

test('quiz response validation rejects malformed question data', () => {
  assert.throws(
    () =>
      parseDocsQuiz({
        title: 'Invalid',
        questions: [{ type: 'multipleChoice', prompt: 'Pick one', opts: ['A', 'B'], answer: 'C' }],
      }),
    /correct answer selected from those options/,
  );
  assert.throws(
    () => parseDocsQuiz({ title: 'Empty', questions: [] }),
    /between one and twenty questions/,
  );
});

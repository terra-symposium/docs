/**
 * src/components/quiz-demo-fixture.ts
 * Shared quiz leaf data used by the public demo and its Playwright fixture.
 */

export const quizDemoLeaf = {
  id: 'quiz-leaf',
  path: 'content/course/quiz-leaf/index.md',
  title: 'Course Leaf',
  markdown: 'Leaf source: routing sends packets between networks.\n\n<Quiz />',
};

/** Stable sample response for review, run, and score coverage. */
export const quizDemoResponse = {
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
} as const;

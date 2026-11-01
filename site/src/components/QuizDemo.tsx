import { DocsSiteIsland } from './DocsSiteIsland.js';
import type { DocsSection } from '../../../dist/lib/lib/workspace-types.js';
import type { DocsQuizConfig, DocsQuizGenerationInput } from '../../../dist/lib/components/quiz.js';
import { quizDemoLeaf, quizDemoResponse } from '../../../src/components/quiz-demo-fixture.js';

const markdown = quizDemoLeaf.markdown;
const visibleLeafText = markdown.split('\n\n', 1)[0] ?? markdown;

const sections: DocsSection[] = [
  {
    id: 'course',
    title: 'Course',
    groups: [
      {
        id: 'lessons',
        title: 'Lessons',
        leaves: [
          {
            id: quizDemoLeaf.id,
            title: quizDemoLeaf.title,
            href: '/quiz-demo/',
            description: 'The routing leaf shared with the quiz browser tests.',
          },
        ],
      },
    ],
  },
];

function generateDemoQuiz(input: DocsQuizGenerationInput): Promise<unknown> {
  return Promise.resolve({
    title: `${quizDemoResponse.title} · sample`,
    questions: Array.from({ length: input.count }, (_, index) => {
      const type = input.types[index % input.types.length];
      const question =
        quizDemoResponse.questions.find((candidate) => candidate.type === type) ??
        quizDemoResponse.questions[0];
      return { ...question };
    }),
  });
}

const quiz: DocsQuizConfig = { toolbar: true, generate: generateDemoQuiz };

/** A package-safe interactive demo for the host-configurable leaf quiz flow. */
export function QuizDemo() {
  return (
    <DocsSiteIsland
      title="Docs quiz demo"
      description="The published Docs workspace with sample leaf quiz generation."
      hue={145}
      sections={sections}
      currentPath="/quiz-demo/"
      rootPath="/quiz-demo/"
      staticContent
      markdown={markdown}
      renderContent={<p className="leading-7">{visibleLeafText}</p>}
      quiz={quiz}
      searchBase="/"
    />
  );
}

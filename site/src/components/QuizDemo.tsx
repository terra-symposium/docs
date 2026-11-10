import { DocsSiteIsland } from './DocsSiteIsland.js';
import { quizDemoLeaf, quizDemoResponse } from '../../../src/components/quiz-demo-fixture.js';

const markdown = quizDemoLeaf.markdown;

/** A package-safe interactive demo for the host-configurable leaf quiz flow. */
export function QuizDemo() {
  return (
    <DocsSiteIsland
      title="Docs quiz demo"
      description="The published Docs workspace with sample leaf quiz generation."
      hue={145}
      sections={[
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
      ]}
      currentPath="/quiz-demo/"
      rootPath="/quiz-demo/"
      staticContent
      markdown={markdown}
      renderContent={<p className="leading-7">{markdown.split('\n\n', 1)[0] ?? markdown}</p>}
      quiz={{
        toolbar: true,
        generate: (input) =>
          Promise.resolve({
            title: `${quizDemoResponse.title} · sample`,
            questions: Array.from({ length: input.count }, (_, i) => ({
              ...(quizDemoResponse.questions.find(
                (candidate) => candidate.type === input.types[i % input.types.length],
              ) ?? quizDemoResponse.questions[0]),
            })),
          }),
      }}
      searchBase="/"
    />
  );
}

/**
 * site/src/components/QuizDemo.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { quizDemoLeaf, quizDemoResponse } from '../../../src/components/quiz-demo-fixture.js';

// COMPONENTS
import { DocsSiteIsland } from './DocsSiteIsland.js';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const markdown = quizDemoLeaf.markdown;

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * A package-safe interactive demo for the host-configurable leaf quiz flow.
 *
 * @return The published Docs workspace showing the deterministic, host-configured interactive quiz demo.
 */
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
        generate: (v) =>
          Promise.resolve({
            title: `${quizDemoResponse.title} · sample`,
            questions: Array.from({ length: v.count }, (_, i) => ({
              ...(quizDemoResponse.questions.find(
                (candidate) => candidate.type === v.types[i % v.types.length],
              ) ?? quizDemoResponse.questions[0]),
            })),
          }),
      }}
      searchBase="/"
    />
  );
}

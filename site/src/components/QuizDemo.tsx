import { DocsSiteIsland } from './DocsSiteIsland.js';

const quizDemoLeaf = {
	id: 'quiz-leaf',
	path: 'content/course/quiz-leaf/index.md',
	title: 'Course Leaf',
	markdown: 'Leaf source: routing sends packets between networks.\n\n<Quiz />',
};
const quizDemoResponse = {
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
const markdown = quizDemoLeaf.markdown;

/** A package-safe interactive demo for the host-configurable leaf quiz flow.
 * @return A sample Docs leaf with a deterministic quiz generator.
 */
export function QuizDemo() {
	return (
		<DocsSiteIsland
			title='Docs quiz demo'
			description='The published Docs workspace with sample leaf quiz generation.'
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
			currentPath='/quiz-demo/'
			rootPath='/quiz-demo/'
			staticContent
			markdown={markdown}
			renderContent={<p className='leading-7'>{markdown.split('\n\n', 1)[0] ?? markdown}</p>}
			quiz={{
				toolbar: true,
				generate: input =>
					Promise.resolve({
						title: `${quizDemoResponse.title} · sample`,
						questions: Array.from({ length: input.count }, (_, i) => ({
							...(quizDemoResponse.questions.find(candidate => candidate.type === input.types[i % input.types.length]) ?? quizDemoResponse.questions[0]),
						})),
					}),
			}}
			searchBase='/'
		/>
	);
}

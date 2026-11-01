import { createContext, useContext, useState } from 'react';
import type { JSX, ReactNode } from 'react';

export type DocsQuizQuestionType = 'multipleChoice' | 'keyword';
export type DocsQuizGenerationInput = {
  title: string;
  markdown: string;
  count: number;
  types: DocsQuizQuestionType[];
};
export type DocsQuizQuestion =
  | {
      type: 'multipleChoice';
      prompt: string;
      opts: string[];
      answer: string;
      explanation?: string;
      section?: string;
    }
  | {
      type: 'keyword';
      prompt: string;
      answers: string[];
      keywords?: string[];
      explanation?: string;
      section?: string;
    };
export type DocsQuizDocument = { title: string; questions: DocsQuizQuestion[] };
export type DocsQuizConfig = {
  toolbar?: boolean;
  generate?: (input: DocsQuizGenerationInput) => Promise<unknown>;
};

type DocsQuizContextValue = { config: DocsQuizConfig; title: string; markdown: string };
const DocsQuizContext = createContext<DocsQuizContextValue | null>(null);

export function DocsQuizProvider({
  children,
  config,
  title,
  markdown,
}: DocsQuizContextValue & { children: ReactNode }): JSX.Element {
  return (
    <DocsQuizContext.Provider value={{ config, title, markdown }}>
      {children}
    </DocsQuizContext.Provider>
  );
}

export function useDocsQuizContext(): DocsQuizContextValue | null {
  return useContext(DocsQuizContext);
}

export function parseDocsQuiz(value: unknown): DocsQuizDocument {
  if (!value || typeof value !== 'object')
    throw new Error('The quiz endpoint returned invalid quiz data.');
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.title !== 'string' ||
    !candidate.title.trim() ||
    !Array.isArray(candidate.questions) ||
    candidate.questions.length === 0 ||
    candidate.questions.length > 20
  )
    throw new Error('The quiz endpoint must return a title and between one and twenty questions.');
  const questions = candidate.questions.map((value): DocsQuizQuestion => {
    if (!value || typeof value !== 'object')
      throw new Error('The quiz endpoint returned an invalid question.');
    const question = value as Record<string, unknown>;
    if (typeof question.prompt !== 'string' || !question.prompt.trim())
      throw new Error('Each question needs a prompt.');
    if (question.type === 'multipleChoice') {
      if (
        !Array.isArray(question.opts) ||
        question.opts.length < 2 ||
        !question.opts.every((item) => typeof item === 'string' && item.trim()) ||
        new Set(question.opts).size !== question.opts.length ||
        typeof question.answer !== 'string' ||
        !question.opts.includes(question.answer)
      )
        throw new Error(
          'Multiple choice questions need options and a correct answer selected from those options.',
        );
      return {
        type: question.type,
        prompt: question.prompt,
        opts: question.opts as string[],
        answer: question.answer,
        ...(typeof question.explanation === 'string' ? { explanation: question.explanation } : {}),
        ...(typeof question.section === 'string' ? { section: question.section } : {}),
      };
    }
    if (question.type === 'keyword') {
      if (
        !Array.isArray(question.answers) ||
        question.answers.length === 0 ||
        !question.answers.every((item) => typeof item === 'string' && item.trim()) ||
        (question.keywords !== undefined &&
          (!Array.isArray(question.keywords) ||
            !question.keywords.every((item) => typeof item === 'string')))
      )
        throw new Error('Keyword questions need at least one accepted answer.');
      return {
        type: question.type,
        prompt: question.prompt,
        answers: question.answers as string[],
        ...(Array.isArray(question.keywords) ? { keywords: question.keywords as string[] } : {}),
        ...(typeof question.explanation === 'string' ? { explanation: question.explanation } : {}),
        ...(typeof question.section === 'string' ? { section: question.section } : {}),
      };
    }
    throw new Error('The quiz endpoint returned an unsupported question type.');
  });
  return { title: candidate.title, questions };
}

function isCorrectAnswer(question: DocsQuizQuestion, response: string): boolean {
  const normalized = response.trim().toLowerCase();
  if (!normalized) return false;
  if (question.type === 'multipleChoice') return response.trim() === question.answer;
  return (
    question.answers.some((answer) => normalized === answer.trim().toLowerCase()) ||
    Boolean(
      question.keywords?.length &&
      question.keywords.every((keyword) => normalized.includes(keyword.trim().toLowerCase())),
    )
  );
}

/** Shared quiz setup, generation, review, and runner UI for Docs hosts. */
export function DocsQuizGenerator({
  title,
  markdown,
  generate,
}: {
  title: string;
  markdown: string;
  generate?: DocsQuizConfig['generate'];
}): JSX.Element {
  const [stage, setStage] = useState<'setup' | 'review' | 'quiz' | 'results'>('setup');
  const [count, setCount] = useState(5);
  const [types, setTypes] = useState<DocsQuizQuestionType[]>(['multipleChoice']);
  const [quiz, setQuiz] = useState<DocsQuizDocument | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [checkedAnswers, setCheckedAnswers] = useState<boolean[]>([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleType = (type: DocsQuizQuestionType) =>
    setTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type],
    );
  const updateQuestion = (
    questionIndex: number,
    update: (question: DocsQuizQuestion) => DocsQuizQuestion,
  ) => {
    setQuiz((current) =>
      current
        ? {
            ...current,
            questions: current.questions.map((question, i) =>
              i === questionIndex ? update(question) : question,
            ),
          }
        : current,
    );
  };
  const startGeneration = async () => {
    setError('');
    if (!generate) {
      setError('Quiz generation is not configured for this Docs host.');
      return;
    }
    if (!types.length) {
      setError('Choose at least one question type.');
      return;
    }
    setLoading(true);
    try {
      const generated = parseDocsQuiz(await generate({ title, markdown, count, types }));
      if (generated.questions.length !== count)
        throw new Error(
          `The quiz endpoint returned ${generated.questions.length} questions; ${count} were requested.`,
        );
      if (generated.questions.some((question) => !types.includes(question.type)))
        throw new Error('The quiz endpoint returned a question type that was not selected.');
      setQuiz(generated);
      setStage('review');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Quiz generation failed. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };
  const question = quiz?.questions[index];
  const correct =
    quiz?.questions.reduce((score, item, i) => {
      const response = (answers[i] ?? '').trim();
      return score + Number(isCorrectAnswer(item, response));
    }, 0) ?? 0;

  return (
    <section
      className="terra-docs-quiz my-6 rounded-xl border border-primary-6 bg-primary-2 p-5"
      aria-label="Quiz generator"
    >
      <h2 className="mb-2 text-xl font-semibold">{quiz?.title ?? `Quiz: ${title}`}</h2>
      {error && (
        <p
          role="alert"
          className="mb-3 rounded-md border border-destructive-7 p-3 text-sm text-destructive-11"
        >
          {error}
        </p>
      )}
      {stage === 'setup' && (
        <div className="space-y-4">
          <p className="text-sm text-primary-10">
            Generate a quiz from this leaf. Your quiz is kept in this page session only.
          </p>
          <label className="flex max-w-xs flex-col gap-1 text-sm">
            Number of questions
            <input
              className="rounded-md border border-primary-6 bg-background px-3 py-2"
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(event) =>
                setCount(Math.max(1, Math.min(20, Number(event.target.value) || 1)))
              }
            />
          </label>
          <fieldset className="flex flex-wrap gap-4 text-sm">
            <legend className="mb-2 font-medium">Question types</legend>
            {(['multipleChoice', 'keyword'] as const).map((type) => (
              <label key={type} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={types.includes(type)}
                  onChange={() => toggleType(type)}
                />
                {type === 'multipleChoice' ? 'Multiple choice' : 'Keyword answer'}
              </label>
            ))}
          </fieldset>
          <button
            type="button"
            disabled={loading}
            onClick={() => void startGeneration()}
            className="rounded-md bg-primary-9 px-4 py-2 font-medium text-primary-1 disabled:opacity-60"
          >
            {loading ? 'Generating…' : 'Generate quiz'}
          </button>
        </div>
      )}
      {stage === 'review' && quiz && (
        <div className="space-y-4">
          <p className="text-sm text-primary-10">Review and edit the questions before starting.</p>
          {quiz.questions.map((item, i) => (
            <fieldset key={i} className="space-y-2 rounded-lg border border-primary-6 p-4">
              <legend className="px-1 font-medium">
                Question {i + 1} · {item.type === 'multipleChoice' ? 'Multiple choice' : 'Keyword'}
              </legend>
              <label className="flex flex-col gap-1 text-sm">
                Prompt
                <input
                  className="rounded-md border border-primary-6 bg-background px-3 py-2"
                  value={item.prompt}
                  onChange={(event) =>
                    updateQuestion(i, (q) => ({ ...q, prompt: event.target.value }))
                  }
                />
              </label>
              {item.type === 'multipleChoice' ? (
                <>
                  <label className="flex flex-col gap-1 text-sm">
                    Options (one per line)
                    <textarea
                      className="rounded-md border border-primary-6 bg-background px-3 py-2"
                      value={item.opts.join('\n')}
                      onChange={(event) =>
                        updateQuestion(i, (q) =>
                          q.type === 'multipleChoice'
                            ? { ...q, opts: event.target.value.split('\n') }
                            : q,
                        )
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    Correct answer
                    <input
                      className="rounded-md border border-primary-6 bg-background px-3 py-2"
                      value={item.answer}
                      onChange={(event) =>
                        updateQuestion(i, (q) =>
                          q.type === 'multipleChoice' ? { ...q, answer: event.target.value } : q,
                        )
                      }
                    />
                  </label>
                </>
              ) : (
                <div className="space-y-2">
                  <label className="flex flex-col gap-1 text-sm">
                    Accepted answers (one per line)
                    <textarea
                      className="rounded-md border border-primary-6 bg-background px-3 py-2"
                      value={item.answers.join('\n')}
                      onChange={(event) =>
                        updateQuestion(i, (q) =>
                          q.type === 'keyword'
                            ? { ...q, answers: event.target.value.split('\n') }
                            : q,
                        )
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    Hint keywords (one per line)
                    <textarea
                      className="rounded-md border border-primary-6 bg-background px-3 py-2"
                      value={item.keywords?.join('\n') ?? ''}
                      onChange={(event) =>
                        updateQuestion(i, (q) =>
                          q.type === 'keyword'
                            ? { ...q, keywords: event.target.value.split('\n') }
                            : q,
                        )
                      }
                    />
                  </label>
                </div>
              )}
              <label className="flex flex-col gap-1 text-sm">
                Explanation
                <input
                  className="rounded-md border border-primary-6 bg-background px-3 py-2"
                  value={item.explanation ?? ''}
                  onChange={(event) =>
                    updateQuestion(i, (q) => ({ ...q, explanation: event.target.value }))
                  }
                />
              </label>
            </fieldset>
          ))}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStage('setup')}
              className="rounded-md border border-primary-6 px-4 py-2"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  parseDocsQuiz(quiz);
                  setError('');
                  setAnswers([]);
                  setCheckedAnswers([]);
                  setIndex(0);
                  setStage('quiz');
                } catch (cause) {
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : 'Fix invalid quiz questions before starting.',
                  );
                }
              }}
              className="rounded-md bg-primary-9 px-4 py-2 font-medium text-primary-1"
            >
              Start quiz
            </button>
          </div>
        </div>
      )}
      {stage === 'quiz' && question && (
        <div className="space-y-4">
          <p className="text-sm text-primary-10">
            Question {index + 1} of {quiz?.questions.length}
          </p>
          <h3 className="text-lg font-medium">{question.prompt}</h3>
          {question.type === 'multipleChoice' ? (
            <fieldset className="space-y-2">
              {question.opts.map((option, i) => (
                <label
                  key={`${i}-${option}`}
                  className="flex items-center gap-2 rounded-md border border-primary-6 p-3"
                >
                  <input
                    type="radio"
                    name={`quiz-${index}`}
                    value={option}
                    checked={answers[index] === option}
                    onChange={() =>
                      setAnswers((current) => {
                        const next = [...current];
                        next[index] = option;
                        return next;
                      })
                    }
                    onClick={() =>
                      setCheckedAnswers((current) => {
                        const next = [...current];
                        next[index] = false;
                        return next;
                      })
                    }
                  />
                  {option}
                </label>
              ))}
            </fieldset>
          ) : (
            <div className="space-y-2">
              <input
                className="w-full rounded-md border border-primary-6 bg-background px-3 py-2"
                aria-label="Your answer"
                value={answers[index] ?? ''}
                onChange={(event) =>
                  setAnswers((current) => {
                    const next = [...current];
                    next[index] = event.target.value;
                    return next;
                  })
                }
                onChangeCapture={() =>
                  setCheckedAnswers((current) => {
                    const next = [...current];
                    next[index] = false;
                    return next;
                  })
                }
              />
              {question.keywords?.length ? (
                <p className="text-sm text-primary-10">
                  Hint: include {question.keywords.join(', ')}.
                </p>
              ) : null}
            </div>
          )}
          {checkedAnswers[index] && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-md border border-primary-6 p-3"
            >
              <p className="font-medium">
                {isCorrectAnswer(question, answers[index] ?? '')
                  ? 'Correct.'
                  : `Not quite. Answer: ${question.type === 'multipleChoice' ? question.answer : question.answers.join(' / ')}`}
              </p>
              {question.explanation && <p className="mt-1 text-sm">{question.explanation}</p>}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => setIndex((i) => i - 1)}
              className="rounded-md border border-primary-6 px-4 py-2 disabled:opacity-50"
            >
              Previous
            </button>
            {!checkedAnswers[index] ? (
              <button
                type="button"
                onClick={() =>
                  setCheckedAnswers((current) => {
                    const next = [...current];
                    next[index] = true;
                    return next;
                  })
                }
                className="rounded-md bg-primary-9 px-4 py-2 text-primary-1"
              >
                Check answer
              </button>
            ) : index < (quiz?.questions.length ?? 0) - 1 ? (
              <button
                type="button"
                onClick={() => setIndex((i) => i + 1)}
                className="rounded-md bg-primary-9 px-4 py-2 text-primary-1"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStage('results')}
                className="rounded-md bg-primary-9 px-4 py-2 text-primary-1"
              >
                Finish quiz
              </button>
            )}
          </div>
        </div>
      )}
      {stage === 'results' && quiz && (
        <div className="space-y-4">
          <p className="text-lg font-medium">
            Score: {correct} / {quiz.questions.length}
          </p>
          {quiz.questions.map((item, i) => {
            const response = (answers[i] ?? '').trim();
            const isCorrect = isCorrectAnswer(item, response);
            return (
              <article key={i} className="rounded-lg border border-primary-6 p-4">
                <h3 className="font-medium">
                  {i + 1}. {item.prompt}
                </h3>
                <p className="text-sm">
                  {isCorrect
                    ? 'Correct'
                    : `Answer: ${item.type === 'multipleChoice' ? item.answer : item.answers.join(' / ')}`}
                </p>
                {item.explanation && (
                  <p className="mt-1 text-sm text-primary-10">{item.explanation}</p>
                )}
              </article>
            );
          })}
          <button
            type="button"
            onClick={() => setStage('setup')}
            className="rounded-md border border-primary-6 px-4 py-2"
          >
            Generate another quiz
          </button>
        </div>
      )}
    </section>
  );
}

/** Renders the Markdown opt-in directive using the active host configuration. */
export function DocsQuizBlock(): JSX.Element {
  const context = useDocsQuizContext();
  if (!context) return <p>Quiz generation is available when configured by this Docs host.</p>;
  return (
    <DocsQuizGenerator
      title={context.title}
      markdown={context.markdown}
      generate={context.config.generate}
    />
  );
}

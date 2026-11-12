/**
 * src/components/quiz.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { createContext, useContext, useState } from 'react';

// TYPES
import type { JSX, ReactNode } from 'react';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/
const TEXT_SM_TEXT_PRIMARY_10_CLASS = 'text-sm text-primary-10';
const ROUNDED_MD_BORDER_BORDER_PRIMARY_6_BG_BACKGROUND_PX_3_PY_2_CLASS =
  'rounded-md border border-primary-6 bg-background px-3 py-2';
const FLEX_FLEX_COL_GAP_1_TEXT_SM_CLASS = 'flex flex-col gap-1 text-sm';
const ROUNDED_MD_BG_PRIMARY_9_PX_4_PY_2_TEXT_PRIMARY_1_CLASS =
  'rounded-md bg-primary-9 px-4 py-2 text-primary-1';

/** Question formats supported by the shared quiz runner. */
export type DocsQuizQuestionType = 'multipleChoice' | 'keyword';
/** Source and constraints sent to a host when it generates a page quiz. */
export type DocsQuizGenerationInput = {
  title: string;
  markdown: string;
  count: number;
  types: DocsQuizQuestionType[];
};
/** Validated question data consumed by the Docs quiz review and answer screens. */
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
/** A generated quiz title and its validated questions. */
export type DocsQuizDocument = { title: string; questions: DocsQuizQuestion[] };
/** Host options for showing quiz controls and requesting generated question data. */
export type DocsQuizConfig = {
  toolbar?: boolean;
  generate?: (input: DocsQuizGenerationInput) => Promise<unknown>;
};
/** Current document and generation settings shared with Markdown quiz blocks. */
type DocsQuizContextValue = {
  config: DocsQuizConfig;
  title: string;
  markdown: string;
};
const DocsQuizContext = createContext<DocsQuizContextValue | null>(null);

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/** Provides the current page and its host-supplied quiz generator to nested blocks.
 *
 * @param children - Descendant content that can request the page's quiz context.
 * @param config - Host controls for toolbar visibility and server-backed generation.
 * @param title - Page title used in quiz labels and as a generation fallback.
 * @param markdown - Page source from which a host may generate questions.
 * @returns The provider subtree with quiz context available to descendants.
 */
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

/** Returns the active page quiz context, or `null` outside a quiz provider.
 *
 * @returns The current page title, Markdown, and generation settings.
 */
export function useDocsQuizContext(): DocsQuizContextValue | null {
  return useContext(DocsQuizContext);
}

/**
 * Validates and normalizes the untrusted response returned by a quiz endpoint.
 *
 * @param v - Endpoint response expected to contain a title and one to twenty questions.
 * @returns A quiz document with supported question fields copied into the public shape.
 * @throws When the response, question prompts, answer options, or accepted answers are invalid.
 */
export function parseDocsQuiz(v: unknown): DocsQuizDocument {
  if (!v || typeof v !== 'object') throw new Error('The quiz endpoint returned invalid quiz data.');
  const candidate = v as Record<string, unknown>;
  if (
    typeof candidate.title !== 'string' ||
    !candidate.title.trim() ||
    !Array.isArray(candidate.questions) ||
    candidate.questions.length === 0 ||
    candidate.questions.length > 20
  )
    throw new Error('The quiz endpoint must return a title and between one and twenty questions.');
  return {
    title: candidate.title,
    questions: candidate.questions.map((v): DocsQuizQuestion => {
      if (!v || typeof v !== 'object')
        throw new Error('The quiz endpoint returned an invalid question.');
      const question = v as Record<string, unknown>;
      if (typeof question.prompt !== 'string' || !question.prompt.trim())
        throw new Error('Each question needs a prompt.');
      if (question.type === 'multipleChoice') {
        if (
          !Array.isArray(question.opts) ||
          question.opts.length < 2 ||
          !question.opts.every((i) => typeof i === 'string' && i.trim()) ||
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
          ...(typeof question.explanation === 'string'
            ? { explanation: question.explanation }
            : {}),
          ...(typeof question.section === 'string' ? { section: question.section } : {}),
        };
      }
      if (question.type === 'keyword') {
        if (
          !Array.isArray(question.answers) ||
          question.answers.length === 0 ||
          !question.answers.every((i) => typeof i === 'string' && i.trim()) ||
          (question.keywords !== undefined &&
            (!Array.isArray(question.keywords) ||
              !question.keywords.every((i) => typeof i === 'string')))
        )
          throw new Error('Keyword questions need at least one accepted answer.');
        return {
          type: question.type,
          prompt: question.prompt,
          answers: question.answers as string[],
          ...(Array.isArray(question.keywords) ? { keywords: question.keywords as string[] } : {}),
          ...(typeof question.explanation === 'string'
            ? { explanation: question.explanation }
            : {}),
          ...(typeof question.section === 'string' ? { section: question.section } : {}),
        };
      }
      throw new Error('The quiz endpoint returned an unsupported question type.');
    }),
  };
}

/**
 * Checks an answer using exact option matching or case-insensitive accepted keywords.
 *
 * @param question - Validated question whose answer rules should be applied.
 * @param response - User-entered response to compare with those rules.
 * @returns Whether the response satisfies the question's accepted-answer rules.
 */
function isCorrectAnswer(question: DocsQuizQuestion, response: string): boolean {
  const norm = response.trim().toLowerCase();
  if (!norm) return false;
  if (question.type === 'multipleChoice') return response.trim() === question.answer;
  return (
    question.answers.some((a) => norm === a.trim().toLowerCase()) ||
    Boolean(
      question.keywords?.length &&
      question.keywords.every((k) => norm.includes(k.trim().toLowerCase())),
    )
  );
}

/**
 * Renders quiz setup, host-backed generation, question review, and answer results.
 *
 * @param title - Page title shown in the quiz heading and generation request.
 * @param markdown - Page source supplied to the host's quiz-generation callback.
 * @param gen - Optional host callback that returns questions for validation and review.
 * @returns The quiz UI for the current page and generation settings.
 */
export function DocsQuizGenerator({
  title,
  markdown,
  generate: gen,
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
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  /**
   * Replaces one generated question while preserving the rest of the quiz.
   *
   * @param questionIndex - Position of the question to replace.
   * @param update - Function that returns the revised question data.
   */
  const updateQuestion = (
    questionIndex: number,
    update: (question: DocsQuizQuestion) => DocsQuizQuestion,
  ) => {
    setQuiz((c) =>
      c
        ? {
            ...c,
            questions: c.questions.map((question, i) =>
              i === questionIndex ? update(question) : question,
            ),
          }
        : c,
    );
  };
  const question = quiz?.questions[index];
  return (
    <section
      className="docs-quiz my-6 rounded-xl border border-primary-6 bg-primary-2 p-5"
      aria-label="Quiz generator"
    >
      <h2 className="mb-2 text-xl font-semibold">{quiz?.title ?? `Quiz: ${title}`}</h2>
      {err && (
        <p
          role="alert"
          className="mb-3 rounded-md border border-destructive-7 p-3 text-sm text-destructive-11"
        >
          {err}
        </p>
      )}
      {stage === 'setup' && (
        <div className="space-y-4">
          <p className={TEXT_SM_TEXT_PRIMARY_10_CLASS}>
            Generate a quiz from this leaf. Your quiz is kept in this page session only.
          </p>
          <label className="flex max-w-xs flex-col gap-1 text-sm">
            Number of questions
            <input
              className={ROUNDED_MD_BORDER_BORDER_PRIMARY_6_BG_BACKGROUND_PX_3_PY_2_CLASS}
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            />
          </label>
          <fieldset className="flex flex-wrap gap-4 text-sm">
            <legend className="mb-2 font-medium">Question types</legend>
            {(['multipleChoice', 'keyword'] as const).map((t) => (
              <label key={t} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={types.includes(t)}
                  onChange={() =>
                    setTypes((current) =>
                      current.includes(t) ? current.filter((i) => i !== t) : [...current, t],
                    )
                  }
                />
                {t === 'multipleChoice' ? 'Multiple choice' : 'Keyword answer'}
              </label>
            ))}
          </fieldset>
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              void (async () => {
                setErr('');
                if (!gen) {
                  setErr('Quiz generation is not configured for this Docs host.');
                  return;
                }
                if (!types.length) {
                  setErr('Choose at least one question type.');
                  return;
                }
                setLoading(true);
                try {
                  const generated = parseDocsQuiz(await gen({ title, markdown, count, types }));
                  if (generated.questions.length !== count)
                    throw new Error(
                      `The quiz endpoint returned ${generated.questions.length} questions; ${count} were requested.`,
                    );
                  if (generated.questions.some((question) => !types.includes(question.type)))
                    throw new Error(
                      'The quiz endpoint returned a question type that was not selected.',
                    );
                  setQuiz(generated);
                  setStage('review');
                } catch (cause) {
                  setErr(
                    cause instanceof Error
                      ? cause.message
                      : 'Quiz generation failed. Please try again.',
                  );
                } finally {
                  setLoading(false);
                }
              })()
            }
            className="rounded-md bg-primary-9 px-4 py-2 font-medium text-primary-1 disabled:opacity-60"
          >
            {loading ? 'Generating…' : 'Generate quiz'}
          </button>
        </div>
      )}
      {stage === 'review' && quiz && (
        <div className="space-y-4">
          <p className={TEXT_SM_TEXT_PRIMARY_10_CLASS}>
            Review and edit the questions before starting.
          </p>
          {quiz.questions.map((v, i) => (
            <fieldset key={i} className="space-y-2 rounded-lg border border-primary-6 p-4">
              <legend className="px-1 font-medium">
                Question {i + 1} · {v.type === 'multipleChoice' ? 'Multiple choice' : 'Keyword'}
              </legend>
              <label className={FLEX_FLEX_COL_GAP_1_TEXT_SM_CLASS}>
                Prompt
                <input
                  className={ROUNDED_MD_BORDER_BORDER_PRIMARY_6_BG_BACKGROUND_PX_3_PY_2_CLASS}
                  value={v.prompt}
                  onChange={(event) =>
                    updateQuestion(i, (q) => ({
                      ...q,
                      prompt: event.target.value,
                    }))
                  }
                />
              </label>
              {v.type === 'multipleChoice' ? (
                <>
                  <label className={FLEX_FLEX_COL_GAP_1_TEXT_SM_CLASS}>
                    Options (one per line)
                    <textarea
                      className={ROUNDED_MD_BORDER_BORDER_PRIMARY_6_BG_BACKGROUND_PX_3_PY_2_CLASS}
                      value={v.opts.join('\n')}
                      onChange={(event) =>
                        updateQuestion(i, (q) =>
                          q.type === 'multipleChoice'
                            ? { ...q, opts: event.target.value.split('\n') }
                            : q,
                        )
                      }
                    />
                  </label>
                  <label className={FLEX_FLEX_COL_GAP_1_TEXT_SM_CLASS}>
                    Correct answer
                    <input
                      className={ROUNDED_MD_BORDER_BORDER_PRIMARY_6_BG_BACKGROUND_PX_3_PY_2_CLASS}
                      value={v.answer}
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
                  <label className={FLEX_FLEX_COL_GAP_1_TEXT_SM_CLASS}>
                    Accepted answers (one per line)
                    <textarea
                      className={ROUNDED_MD_BORDER_BORDER_PRIMARY_6_BG_BACKGROUND_PX_3_PY_2_CLASS}
                      value={v.answers.join('\n')}
                      onChange={(event) =>
                        updateQuestion(i, (q) =>
                          q.type === 'keyword'
                            ? { ...q, answers: event.target.value.split('\n') }
                            : q,
                        )
                      }
                    />
                  </label>
                  <label className={FLEX_FLEX_COL_GAP_1_TEXT_SM_CLASS}>
                    Hint keywords (one per line)
                    <textarea
                      className={ROUNDED_MD_BORDER_BORDER_PRIMARY_6_BG_BACKGROUND_PX_3_PY_2_CLASS}
                      value={v.keywords?.join('\n') ?? ''}
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
              <label className={FLEX_FLEX_COL_GAP_1_TEXT_SM_CLASS}>
                Explanation
                <input
                  className={ROUNDED_MD_BORDER_BORDER_PRIMARY_6_BG_BACKGROUND_PX_3_PY_2_CLASS}
                  value={v.explanation ?? ''}
                  onChange={(event) =>
                    updateQuestion(i, (q) => ({
                      ...q,
                      explanation: event.target.value,
                    }))
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
                  setErr('');
                  setAnswers([]);
                  setCheckedAnswers([]);
                  setIndex(0);
                  setStage('quiz');
                } catch (cause) {
                  setErr(
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
          <p className={TEXT_SM_TEXT_PRIMARY_10_CLASS}>
            Question {index + 1} of {quiz?.questions.length}
          </p>
          <h3 className="text-lg font-medium">{question.prompt}</h3>
          {question.type === 'multipleChoice' ? (
            <fieldset className="space-y-2">
              {question.opts.map((o, i) => (
                <label
                  key={`${i}-${o}`}
                  className="flex items-center gap-2 rounded-md border border-primary-6 p-3"
                >
                  <input
                    type="radio"
                    name={`quiz-${index}`}
                    value={o}
                    checked={answers[index] === o}
                    onChange={() =>
                      setAnswers((current) => {
                        const n = [...current];
                        n[index] = o;
                        return n;
                      })
                    }
                    onClick={() =>
                      setCheckedAnswers((current) => {
                        const n = [...current];
                        n[index] = false;
                        return n;
                      })
                    }
                  />
                  {o}
                </label>
              ))}
            </fieldset>
          ) : (
            <div className="space-y-2">
              <input
                className="w-full rounded-md border border-primary-6 bg-background px-3 py-2"
                aria-label="Your answer"
                value={answers[index] ?? ''}
                onChange={(e) =>
                  setAnswers((current) => {
                    const n = [...current];
                    n[index] = e.target.value;
                    return n;
                  })
                }
                onChangeCapture={() =>
                  setCheckedAnswers((current) => {
                    const n = [...current];
                    n[index] = false;
                    return n;
                  })
                }
              />
              {question.keywords?.length ? (
                <p className={TEXT_SM_TEXT_PRIMARY_10_CLASS}>
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
                    const n = [...current];
                    n[index] = true;
                    return n;
                  })
                }
                className={ROUNDED_MD_BG_PRIMARY_9_PX_4_PY_2_TEXT_PRIMARY_1_CLASS}
              >
                Check answer
              </button>
            ) : index < (quiz?.questions.length ?? 0) - 1 ? (
              <button
                type="button"
                onClick={() => setIndex((i) => i + 1)}
                className={ROUNDED_MD_BG_PRIMARY_9_PX_4_PY_2_TEXT_PRIMARY_1_CLASS}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStage('results')}
                className={ROUNDED_MD_BG_PRIMARY_9_PX_4_PY_2_TEXT_PRIMARY_1_CLASS}
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
            Score:{' '}
            {quiz.questions.reduce(
              (s, v, i) => s + Number(isCorrectAnswer(v, (answers[i] ?? '').trim())),
              0,
            )}{' '}
            / {quiz.questions.length}
          </p>
          {quiz.questions.map((v, i) => {
            return (
              <article key={i} className="rounded-lg border border-primary-6 p-4">
                <h3 className="font-medium">
                  {i + 1}. {v.prompt}
                </h3>
                <p className="text-sm">
                  {isCorrectAnswer(v, (answers[i] ?? '').trim())
                    ? 'Correct'
                    : `Answer: ${v.type === 'multipleChoice' ? v.answer : v.answers.join(' / ')}`}
                </p>
                {v.explanation && <p className="mt-1 text-sm text-primary-10">{v.explanation}</p>}
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

/**
 * Renders the Markdown opt-in directive using the active host configuration.
 *
 * @returns The configured quiz generator, or an explanation when no host context exists.
 */
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

/**
 * site/src/components/SkillsExplorer.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { useMemo, useState } from 'react';

// COMPONENTS
import { Button, Input, Label } from '@terra-symposium/styling/ui';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/**
 * Skill content and metadata prepared for display in the repository skills explorer.
 */
export type SkillRecord = {
  body: string;
  description: string;
  directory: string;
  metadata: Record<string, unknown>;
  metadataIssue?: string;
  name: string;
  scope: string;
  sourcePath: string;
  title: string;
};

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Converts scalar metadata to readable text and structured metadata to JSON.
 *
 * @param value Metadata value parsed from a skill's YAML frontmatter.
 *
 * @return Text suitable for searching and displaying in the explorer.
 */
function metadataValue(value: unknown) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

/**
 * Formats a count with a simple English plural suffix.
 *
 * @param count Number of matching items.
 * @param singular Singular label for one item.
 *
 * @return The count followed by the singular or plural label.
 */
function plural(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? '' : 's'}`;
}

/*//////////////////////////////////////////////////
COMPONENTS
//////////////////////////////////////////////////*/

/**
 * Lets readers filter, select, and inspect the repository's indexed skill files.
 *
 * @param props Skill records built from the repository's `SKILL.md` files.
 *
 * @return A filterable list and the selected skill's description and content.
 */
export function SkillsExplorer({ skills }: { skills: SkillRecord[] }) {
  const [query, setQuery] = useState('');
  const [aPath, setActivePath] = useState(skills[0]?.sourcePath ?? '');
  const filteredSkills = useMemo(() => {
    const normQuery = query.trim().toLocaleLowerCase();
    if (!normQuery) return skills;
    return skills.filter((skill) =>
      [
        skill.name,
        skill.title,
        skill.description,
        skill.directory,
        skill.scope,
        skill.sourcePath,
        JSON.stringify(skill.metadata),
        skill.body,
      ]
        .join('\n')
        .toLocaleLowerCase()
        .includes(normQuery),
    );
  }, [query, skills]);
  const selectedSkill =
    filteredSkills.find((skill) => skill.sourcePath === aPath) ?? filteredSkills[0] ?? null;
  const groups = useMemo(() => {
    const byScope = new Map<string, SkillRecord[]>();
    for (const skill of filteredSkills) {
      const entries = byScope.get(skill.scope) ?? [];
      entries.push(skill);
      byScope.set(skill.scope, entries);
    }
    return [...byScope.entries()];
  }, [filteredSkills]);
  const metadataEntries = selectedSkill
    ? Object.entries(selectedSkill.metadata).filter(
        ([key]) => !['name', 'description'].includes(key),
      )
    : [];
  return (
    <section aria-label="Repository skills" className="my-8">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-10">
            Repository inventory
          </p>
          <h2 className="m-0">Skills</h2>
          <p className="mb-0 mt-1 text-gray-10">
            Browse the workflows and guidance files included in this repository.
          </p>
        </div>
        <div aria-live="polite" className="grid justify-items-end text-sm text-gray-10">
          <strong className="text-2xl leading-none text-primary-11">{skills.length}</strong>
          <span>{plural(skills.length, 'skill')} indexed</span>
        </div>
      </header>
      {skills.length ? (
        <div className="grid min-w-0 items-start gap-4 md:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.6fr)]">
          <nav
            aria-label="Available skills"
            className="max-h-[78vh] min-w-0 overflow-auto rounded-xl border border-gray-6 bg-gray-1 p-3"
          >
            <div>
              <Label htmlFor="skills-explorer-filter">Filter skills</Label>
              <Input
                id="skills-explorer-filter"
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder="Name, topic, or text"
                type="search"
                value={query}
              />
            </div>
            <p aria-live="polite" className="mb-4 mt-2 text-xs text-gray-10">
              Showing {filteredSkills.length} of {skills.length}
            </p>
            {groups.length ? (
              groups.map(([scope, entries]) => (
                <section aria-label={scope} className="mt-4 first:mt-0" key={scope}>
                  <h3 className="mb-2 break-words text-xs font-bold uppercase text-gray-10">
                    {scope}
                  </h3>
                  <ul className="m-0 grid list-none gap-1 p-0">
                    {entries.map((skill) => (
                      <li key={skill.sourcePath}>
                        <Button
                          aria-current={
                            selectedSkill?.sourcePath === skill.sourcePath ? 'true' : undefined
                          }
                          className="h-auto w-full justify-start px-3 py-2 text-left"
                          onClick={() => setActivePath(skill.sourcePath)}
                          variant={
                            selectedSkill?.sourcePath === skill.sourcePath
                              ? 'primary-tonal'
                              : 'gray-ghost'
                          }
                          type="button"
                        >
                          <span className="grid min-w-0 gap-1">
                            <span className="font-semibold leading-snug">{skill.title}</span>
                            <span className="line-clamp-2 text-xs font-normal text-gray-10">
                              {skill.description || skill.name}
                            </span>
                            <span className="truncate text-[0.7rem] font-normal text-gray-9">
                              {skill.directory}
                            </span>
                          </span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            ) : (
              <p className="text-sm text-gray-10">No skills match “{query}”.</p>
            )}
          </nav>
          {selectedSkill ? (
            <article
              aria-live="polite"
              className="min-w-0 overflow-hidden rounded-xl border border-gray-6 bg-gray-1"
            >
              <header className="border-b border-gray-6 p-4">
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-primary-11">
                  {selectedSkill.scope}
                </p>
                <h3 className="mb-2 mt-0">{selectedSkill.title}</h3>
                <p className="mb-2 text-gray-10">{selectedSkill.description}</p>
                <p className="mb-0 break-all font-mono text-xs text-gray-9">
                  {selectedSkill.sourcePath}
                </p>
              </header>
              {metadataEntries.length ? (
                <dl className="m-0 grid gap-3 border-b border-gray-6 p-4 sm:grid-cols-2">
                  {metadataEntries.map(([key, value]) => (
                    <div className="min-w-0" key={key}>
                      <dt className="text-xs font-semibold uppercase text-gray-10">
                        {key.replace(/[-_]+/g, ' ')}
                      </dt>
                      <dd className="mb-0 mt-1 break-words text-sm">{metadataValue(value)}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {selectedSkill.metadataIssue ? (
                <p className="m-4 rounded-md border border-gray-6 bg-gray-2 p-3 text-sm">
                  Frontmatter could not be parsed: {selectedSkill.metadataIssue}
                </p>
              ) : null}
              <details className="p-4" open>
                <summary className="cursor-pointer font-semibold">Full skill instructions</summary>
                <pre className="mt-3 max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-gray-2 p-4 text-sm">
                  <code>{selectedSkill.body}</code>
                </pre>
              </details>
            </article>
          ) : null}
        </div>
      ) : (
        <p className="rounded-lg border border-gray-6 bg-gray-1 p-4 text-sm text-gray-10">
          No SKILL.md files were found in this repository. Add skills under a .agents/skills or
          .codex/skills folder, then rebuild the Docs site.
        </p>
      )}
    </section>
  );
}
export default SkillsExplorer;

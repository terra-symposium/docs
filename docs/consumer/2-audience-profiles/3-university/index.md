---
title: University
description: Teach university material as clear, complete, concept-first lessons.
---

## Reader

This profile guides the author. Write for a learner who wants to understand and use the subject, not merely find the next lecture task. Assume no prior knowledge unless verified context says otherwise. Define technical terms and symbols before relying on them.

| Page                    | Put here                                                                          | Keep out                                   |
| ----------------------- | --------------------------------------------------------------------------------- | ------------------------------------------ |
| **Subject Information** | Verified contacts, tools, reading, support, assessment rules, and a learning path | Concept teaching and first-week exercises  |
| **Concept lesson**      | One coherent subject, taught from prerequisites through explanation and examples  | Course logistics and assessment chronology |

## Goal

Help the learner build connected knowledge they can explain, apply, and recall. Make each page answer a clear question and prepare for the next concept.

:::tip[Evidence of learning]

By the end, the learner can explain the idea in their own words, connect it to a prerequisite, and apply it to a new example.

:::

## Tone

| Prefer                                         | Avoid                                                           |
| ---------------------------------------------- | --------------------------------------------------------------- |
| Plain language; define a term at first use     | Dense lecture shorthand or unexplained jargon                   |
| A welcoming explanation of why an idea matters | Assuming the learner already knows the field                    |
| Short steps that show how a result follows     | “It is obvious” or unexplained jumps in reasoning               |
| A precise analogy followed by its limits       | Treating an analogy as the technical definition                 |
| A clear path from prerequisite to new idea     | “Week 3”, “Tutorial 4”, or file order as the teaching structure |

## Patterns

Use the patterns below to keep course administration separate from teaching while making both easy to find. A pattern is not a container: keep explanations and required administration visible. An accordion needs at least two optional, independent peer items of the same kind. A tab set needs related, parallel alternatives that answer one shared question. Use tabs by default whenever multiple methods, algorithms, protocol versions, or configurations solve the same problem and each needs its own explanation; examples include Stop-and-wait / Go-Back-N / TCP recovery, recursive / iterative DNS, and HTTP versions. A method can be a real-world protocol while its peers are teaching models: name that distinction inside the comparison. Put each option's full method lesson, including its explanation, subheadings, diagrams, and examples, inside its tab; do not leave summary tabs above separate sections for the same options. Align the order and heading structure where the options share a learning route. Keep only shared facts or distinct follow-on concepts outside, and name the exact alternatives and reason for the grouping in critique. Do not tab prerequisites, dependent phases, or mechanisms used together; those stay in visible heading or node order. Keep a one-off worked example in a visible example callout.

### Reading lists

Group readings by the learner's question or purpose, not by the week or file that supplied them. Give each source its own row and retain its original title and every explicit list item.

| Source                    | Learner use                                             | Access                                     |
| ------------------------- | ------------------------------------------------------- | ------------------------------------------ |
| Original title and format | What question it answers; how it connects to the lesson | Required or optional; link and access note |

Explain why a source is useful and where to begin. Link readings to the relevant concept lesson. A reading list supports learning; it cannot stand in for explanations that belong in the lesson.

### Subject Information

Model every university branch's Subject Information leaf on this visible outline, in this order. Keep each section as a real page heading; do not put a whole section, schedule, or learning path inside tabs or accordions. If a section has no verified data, keep its heading and say what is unavailable, then report the source gap outside the published page. Never invent missing course details.

| Topic              | Include                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| At a glance        | Subject name, purpose, and current official course link                                                 |
| Learning path      | Concept lessons in prerequisite order, with a short reason for the sequence                             |
| Teaching team      | Verified role, contact method, consultation time, and relevant expertise                                |
| Readings and tools | Original titles, access route, purpose, and the work each tool supports                                 |
| Schedule           | Topics and dependencies; mark dates without a confirmed year as historical or unverified                |
| Assessment         | Task, criteria, release and due dates, submission route; direct learners to the current official source |
| Support            | Where to ask academic, technical, or personal questions                                                 |

Use visible tables for contacts, reading lists, schedules, and assessment facts when the data shares columns. A reading row preserves the source's full title, access route, purpose, required/optional status, and related concept lesson. Put practical setup under **Readings and tools** or a clearly titled subheading within it, with steps visible when they matter. Do not accordion a schedule or a singleton section. Use an accordion only for at least two optional, self-contained peer items of the same kind; use tabs only for related parallel topics readers may compare. Do not use either block to compress or conceal required administration. For concept teaching, critique every applicable tab opportunity: if two or more approaches do the same job, ask the same question, or represent versions of one service, compare them in tabs unless their relationship is sequential or complementary. A comparison table alone is not a reason to omit tabs; convert same-purpose method tables to complete tabs and state the shared comparison question.

Do not present old dates, staff availability, assessment weights, or access details as current without checking the official source. Put useful procedural detail in a linked how-to page when the reader needs steps.

### Concept visuals

Choose a form that matches the information. Use lists for parallel facts and ordered actions, Nodes for flows, dependencies, hand-offs, and system relationships, and tables only when items share comparison fields. Use an attachment image when its visual detail helps explain the concept; crop to the relevant diagram or figure when useful. Keep labels legible, add concise alt text and nearby explanation, and teach the image's meaning in the lesson. Do not add images or tables as decoration or as a substitute for clear prose.

## Sources

Check access and redistribution terms, then save every available Canvas learning source beside its owning leaf: each module, lecture transcript, lecture slide deck, and every file attached to a Canvas page or module. Capture each module as cleaned Markdown and keep its original downloadable files, including PDFs, presentations, diagrams, and images. Ed lessons are optional additional sources. Assign each source to its canonical leaf and read it before writing.

| Source                                         | Authoring record                                      |
| ---------------------------------------------- | ----------------------------------------------------- |
| Canvas module                                  | Clean Markdown capture assigned to its canonical leaf |
| Lecture transcript, slide deck, or Canvas file | Save the original beside the same owning leaf         |
| Ed lesson                                      | Optional cleaned capture and any permitted downloads  |
| Unavailable or empty Canvas source             | Record title, URL or ID, access result, and reason    |

Use underscore-prefixed, unnumbered attachment names. Never bypass access restrictions or invent a capture. Keep these source files beside their canonical leaf for authoring and review, but do not publish source inventories, file-format lists, or course-order labels in concept lessons. Link to a specific source only when the reader can access it from the published site and the pointer helps them inspect relevant evidence; verify that the rendered link works. Never make a source link a substitute for the lesson's explanation or use a list of raw captures as the lesson. Keep the source-to-concept coverage map, audit notes, and missing-source report agent-side and communicate them to the user outside the published tree. Subject Information may link an official current resource when readers need it for course administration.

## Validation

Use this sequence for the work and the final critique. Fix a failure and repeat the review; a build alone cannot show that a beginner learned the subject.

<Nodes
  direction="LR"
  nodes={[
    { id: 'sources', type: 'origin', data: { title: 'Read sources' } },
    { id: 'concepts', type: 'process', data: { title: 'Map concepts' } },
    { id: 'lessons', type: 'process', data: { title: 'Teach and illustrate' } },
    { id: 'blind', type: 'process', data: { title: 'Blind learner review' } },
    { id: 'repair', type: 'terminator', data: { title: 'Repair and repeat' } },
  ]}
  edges={[
    { id: 'sources-concepts', source: 'sources', target: 'concepts' },
    { id: 'concepts-lessons', source: 'concepts', target: 'lessons' },
    { id: 'lessons-blind', source: 'lessons', target: 'blind' },
    { id: 'blind-repair', source: 'blind', target: 'repair' },
  ]}
/>

### Lessons

Organize by concepts and prerequisites. Weeks, lectures, tutorials, labs, assessments, attachment order, and document structure are source context, never the lesson outline. Teach each named subject fully; a task catalogue is not a lesson. Omit practice questions by default. If the reader goal requires a quiz, author it after the lesson in a final `## Quiz` section; Docs View presents the bank through a page-level Quiz button and dialog.

| Lesson step     | Reader question                                          | Useful form                                                                                                        |
| --------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| On-ramp         | What is this idea for, and what should I know first?     | Plain-language opening and links to prerequisites                                                                  |
| Definition      | What does each term or symbol mean?                      | Short explanation, image, or focused comparison                                                                    |
| Mechanism       | Why does the idea exist, and how does it work?           | Concise explanation, code, or Nodes diagram                                                                        |
| Worked example  | How does it behave with real inputs?                     | Visible `:::example[Worked example]` aside traced step by step; accordion only for repeated optional peer examples |
| Boundaries      | What changes at the edges, and what commonly goes wrong? | Concise explanation with a relevant visual                                                                         |
| Quiz (optional) | Is a quiz needed for this reader goal?                   | If required, a final `## Quiz` section with one shared Docs `<Quiz data={...} />` block after all teaching         |

Use an accordion for at least two optional, self-contained worked examples or troubleshooting cases of the same kind that readers can open independently. In critique, name those peer items and explain why independent disclosure helps; if that reason cannot be stated, fail the accordion. A single essential worked example stays visible in a `:::example[Worked example]` aside. Omit practice questions by default. If a quiz is required, place one final `## Quiz` source section after all teaching and use the shared Docs `<Quiz data={...} />` block; Docs View lifts it into a page-level Quiz button and dialog. Author the bank as JSON in `<Quiz data={{...}} />`: the document has a `title` and a `questions` array, and each question has a `title`, `prompt`, and `answer`. Keep each prompt and answer focused; do not place callouts, tabs, or accordions inside them because the Quiz component supplies the presentation. The block shows one question at a time and reveals answers on demand; it does not accept quiz content as a Markdown tag body. Do not use accordions for quiz items, distribute questions through the lesson, or interrupt dependent explanations. A schedule, explanation, or unrelated section never qualifies merely because it is long.

#### Logical operators

:::example[Worked example]

Define `&&` as “both conditions are true”, `||` as “at least one is true”, and `!` as “reverse a truth value”. Then trace a concrete expression, test boundary cases, and only after that ask the learner to combine conditions. Do not require fluency in notation before explaining it.

:::

Give beginners several on-ramps to difficult concepts: a plain-language purpose, prerequisite links, a familiar situation, a visual relationship, and a worked example. Make sure they converge on the same accurate explanation. Give every subconcept a concise heading in the lesson and explain what it is, why it exists, how it works, and how it connects to earlier ideas. If a quiz is included, its source section follows all teaching; Docs View exposes it through a page-level Quiz button and dialog.

Keep lessons calm and concise. Use prose to explain, lists for parallel facts or actions, and Nodes for processes, dependencies, hand-offs, or relationships. Use a table only when entries share comparison fields. Use an image only when its visual detail helps teach the concept; crop an attachment to the relevant figure and keep labels readable. A visual supports the explanation; it never replaces it. During critique, name the topics in each tab set and their shared comparison context, and name the same-kind optional items in each accordion and why independent disclosure helps; fail any block that cannot meet that test.

Count authored Markdown headings, not accordion or custom-block labels. Aim for no more than three H3 siblings under an H2. Four or more needs a concrete reader reason, but a source-supported, approved concept outline may retain additional distinct subconcepts when each has its own teaching purpose and clearly belongs beneath the parent; critique the fit instead of failing the count alone. Merge overlap or split unrelated reader goals. Also merge a run of tiny H2 sections when they teach one concept; do not create a flat list of headings for each detail. Keep H3 only for a few true subconcepts. Merge headings such as “Delay” and “Delay practice” when both cover the same concept. Do not create repeated code or example blocks back to back; combine them or put alternatives in tabs or one titled accordion. Long prose or many short headings under an H2 or H3 signals weak grouping: simplify, make true peer concepts H2s, or split the leaf. Do not use a table to hide a long explanation or to collect examples that do not share comparison dimensions.

Keep the default page at or below 12 content-view heights at a 1280 × 800 desktop viewport. Exceeding this is a validation warning, not a reason to omit source material or hide core content. Split only when reader goals differ; otherwise restructure headings, remove repetition, and use a table only for genuinely shared comparison fields. Keep essential explanations and on-ramps visible. For every tab group, name the parallel topics and their shared comparison context. For every accordion group, name at least two exact same-kind optional peer items and why independent disclosure helps. A prompt plus its answer is one item, not a qualifying pair. Fail singleton accordions, mixed-kind groups, whole-section tabs, schedules in accordions, and hidden dependent concepts. If the rationale cannot be stated, the block fails critique. Subject Information headings remain visible in the required order, and its schedule remains visible as a table. Omit practice questions by default; when a quiz is needed, keep its source bank in one final `## Quiz` section with the shared Docs `<Quiz data={...} />` block; in Docs View, verify the page-level Quiz button opens the bank in a dialog, using JSON question objects with `title`, `prompt`, and `answer` Markdown strings, without nested callouts, tabs, or accordions. Examples that are not optional repeated peers remain visible in example callouts.

### Exam-tomorrow simulation

Give the complete tree and its available sources to an independent reviewer with no prior conversation context. Ask them to roleplay a learner with no knowledge of the field who must earn 100% on a difficult exam tomorrow using only the lessons.

The only valid critique is the reviewer’s own unstructured prose. Give no table, rubric, checklist, sample, template, fixed heading, bullet, numbered issue format, or JSON schema; do not give the reviewer this guidance page or other material containing templates. The reviewer must ignore any response shapes present in source material. Reject every structured critique in full and commission a fresh no-context review with a prose-only instruction; never reformat structured output and call it independent. The prose must show what the learner understood, where they guessed, and what they could solve, with evidence from source points and the rendered lesson.

The reviewer must identify every point where they would have to guess, look up a term, infer a missing step, or rely on prior experience. They must explain each concept in their own words, trace examples, handle boundary cases, distinguish similar ideas, and solve a new problem without copying a worked example. Check that the tree provides on-ramps and that every source point is taught in its canonical lesson. Inspect every rendered tab and accordion and explain in the critique why it qualifies: tabs must present related parallel topics for comparison; accordions must group repeated optional peer items of the same kind. Reject whole-leaf tabs, dependent lesson sequences hidden in tabs, schedules in accordions, and blocks justified only by page length. Verify that Subject Information contains every required visible heading in order, clearly labels unavailable data, and shows the schedule as a visible table. Verify that practice questions are absent by default. If a quiz is included, verify the source bank follows all teaching in the shared Docs `<Quiz data={...} />` block and that Docs View shows a page-level Quiz button that opens the bank in a dialog, and that its JSON questions use focused `title`, `prompt`, and `answer` fields without nested callouts, tabs, or accordions. Single essential worked examples remain visible in example callouts. A single essential worked example must be visible in an example callout; accordion only repeated optional examples of the same kind. Check that accordions are collapsed by default, text blocks are interrupted by useful visuals rather than more text blocks, H2 sections usually have no more than three authored H3 siblings; four or more needs a reader-focused reason. A source-supported, approved concept hierarchy may keep additional distinct subconcepts when each is required and belongs under its parent; assess the fit, not count alone. Do not count accordion labels as headings, and the default page is at most 12 desktop content-view heights. When a coherent leaf exceeds that limit, require a warning and restructure without hiding required material; use tabs or accordions only when their content tests are met, and split only when goals differ. Repair each actionable gap, then repeat the independent critique with a fresh reviewer until their prose critique finds no remaining issue.

### Coverage report

Create a source-to-concept-to-leaf map and account for every useful fact, explanation, example, task, constraint, and caveat. Keep the map in agent workflow notes, never in published lessons. Report coverage, missing material, and unresolved restrictions to the user outside the tree; do not claim full coverage when a source could not be read.

### Rendered page

Read every leaf in the rendered site. Check that headings form a concise hierarchy, paragraphs are easy to scan, tables and diagrams render correctly, examples are visible in asides, and accordions keep complete tasks together. Fix any visual wall, missing block, broken link, hidden page, or awkward sequence before reporting completion.

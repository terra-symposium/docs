---
title: University
description: Teach university material as clear, complete, concept-first lessons.
---

## Reader

This profile guides the author. Write for a learner who wants to understand and use the subject, not merely find the next lecture task. Assume no prior knowledge unless verified context says otherwise. Define technical terms and symbols before relying on them.

Separate course logistics from concept teaching so learners can find each kind of information quickly. This table shows what belongs on each page type.

| Page                    | Put here                                                                          | Keep out                                   |
| ----------------------- | --------------------------------------------------------------------------------- | ------------------------------------------ |
| **Subject Information** | Verified contacts, tools, reading, support, assessment rules, and a learning path | Concept teaching and first-week exercises  |
| **Concept lesson**      | One coherent subject, taught from prerequisites through explanation and examples  | Course logistics and assessment chronology |

Use Subject Information for course-wide facts and the concept lessons for teaching; the goal below describes what those lessons should help learners do.

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

Use the patterns below to keep administration and teaching easy to find. Keep required explanations visible. Use an accordion only for at least two optional, independent, self-contained peers of the same kind; a one-off worked example stays in an example callout.

Use tabs to compare related, complete alternatives that answer the same question, such as Stop-and-Wait, Go-Back-N, and Selective Repeat ARQ protocols compared by retransmission behavior, or HTTP versions compared by connection behavior. Put each option's explanation, diagrams, and examples in its tab, and align their shared learning sequence. State the comparison question. Keep prerequisites, mechanisms used together, shared facts, and sequential follow-on concepts in visible page order.

### Reading lists

Group readings by the learner's question or purpose, not by the week or file that supplied them. Give each source its own row and retain its original title and every explicit list item.

| Source                    | Learner use                                             | Access                                     |
| ------------------------- | ------------------------------------------------------- | ------------------------------------------ |
| Original title and format | What question it answers; how it connects to the lesson | Required or optional; link and access note |

Explain why a source is useful and where to begin. Link readings to the relevant concept lesson. A reading list supports learning; it cannot stand in for explanations that belong in the lesson.

### Subject Information

Model every university branch's Subject Information leaf on this visible outline, in this exact order. These seven labels are the only H2 headings on the page. Do not add a second heading for the same topic under a different name. Keep each section as a real page heading; do not put a whole section, schedule, or learning path inside tabs or accordions. If a section has no verified data, keep its heading and say what is unavailable, then report the source gap outside the published page. Never invent missing course details.

```md
## At a glance

## Learning path

## Teaching team

## Readings and tools

## Schedule

## Assessment

## Support
```

| H2 section         | Include                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| At a glance        | Subject name, purpose, and current official course link                                                 |
| Learning path      | Concept lessons in prerequisite order, with a short reason for the sequence                             |
| Teaching team      | Verified role, contact method, consultation time, and relevant expertise                                |
| Readings and tools | Original titles, access route, purpose, and the work each tool supports                                 |
| Schedule           | Topics and dependencies; mark dates without a confirmed year as historical or unverified                |
| Assessment         | Task, criteria, release and due dates, submission route; direct learners to the current official source |
| Support            | Where to ask academic, technical, or personal questions                                                 |

Use the same seven H2 labels on every Subject Information page, in this order, even when a section has no verified facts. Keep concept explanations in their concept lessons; the Learning path section names and orders those lessons rather than teaching their subject matter. Put contact details under Teaching team and support routes under Support. Put course reading and tool access under Readings and tools. Keep the visible chronological schedule table under Schedule and assessment requirements under Assessment. Use H3 only to divide substantial, distinct material inside one required section; use bold labels or table rows for smaller details.

Use tables for contacts, readings, schedules, and assessment facts when the items share fields. A reading row preserves its full title, access route, purpose, required/optional status, and related concept lesson. Put contact details under Teaching team, support routes under Support, and visible setup steps under Readings and tools. Mark unverified or historical details; link useful procedures to a how-to page. Do not place required administration, a schedule, or a learning path inside tabs or accordions.

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
  direction="TB"
  nodes='[{"id":"sources","type":"origin","data":{"title":"Read sources"}},{"id":"concepts","type":"process","data":{"title":"Map concepts"}},{"id":"lessons","type":"process","data":{"title":"Teach and illustrate"}},{"id":"blind","type":"process","data":{"title":"Blind learner review"}},{"id":"repair","type":"terminator","data":{"title":"Repair and repeat"}}]'
  edges='[{"id":"sources-concepts","source":"sources","target":"concepts"},{"id":"concepts-lessons","source":"concepts","target":"lessons"},{"id":"lessons-blind","source":"lessons","target":"blind"},{"id":"blind-repair","source":"blind","target":"repair"}]'
/>

### Lessons

Organize by concepts and prerequisites. Weeks, lectures, tutorials, labs, assessments, and file order are source context, never the lesson outline. Teach each named subject fully; a task catalogue is not a lesson.

| Lesson step     | Reader question                                          | Useful form                                                                                                        |
| --------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| On-ramp         | What is this idea for, and what should I know first?     | Plain-language opening and links to prerequisites                                                                  |
| Definition      | What does each term or symbol mean?                      | Short explanation, image, or focused comparison                                                                    |
| Mechanism       | Why does the idea exist, and how does it work?           | Concise explanation, code, or Nodes diagram                                                                        |
| Worked example  | How does it behave with real inputs?                     | Visible `:::example[Worked example]` aside traced step by step                                                   |
| Boundaries      | What changes at the edges, and what commonly goes wrong? | Concise explanation with a relevant visual                                                                         |
| Quiz (optional) | Does the reader goal or source call for a quiz?          | Optional authored bank in sibling `quiz.json`                                                                   |

Omit practice questions by default. When the reader goal or source calls for a quiz, put its authored bank in sibling `quiz.json` beside `index.md`, outside lesson Markdown. Use a `title` and `questions` array with focused `title`, `prompt`, and `answer` Markdown strings. Docs View validates the bank and presents it in a page-level Quiz dialog. A host supplies the parsed bank as `authoredQuiz`; the separate `<Quiz />` generator requires a configured host generator. Follow [Blocks: Quiz](/consumer/1-usage/2-blocks/#quiz) for the schema.

**Logical operators example**

:::example[Worked example]

A page opens when it is not locked and the reader is a member or has a guest pass. Define `!` as “not”, `&&` as “and”, and `||` as “or”. Write `canOpen = !locked && (member || guestPass)`.

For `locked = false`, `member = false`, and `guestPass = true`, first evaluate the parentheses: `false || true` is `true`. Then `!false` is `true`, so `true && true` gives `canOpen = true`.

At the boundary `locked = true`, even if `member = true`, `!true` is `false`; `false && true` gives `canOpen = false`.

:::

Give beginners several on-ramps to difficult concepts: a plain-language purpose, prerequisite links, a familiar situation, a visual relationship, and a worked example. Make sure they converge on the same accurate explanation. Give each subconcept a concise heading and explain what it is, why it exists, how it works, and how it connects to earlier ideas.

Keep lessons calm and concise. Use prose to explain, lists for parallel facts or actions, Nodes for processes and dependencies, and tables only for shared comparison fields. Use an image only when its detail helps teach; crop it, keep labels readable, and explain what it shows. A visual supports the lesson but never replaces it.

Use at most three authored H3 siblings under an H2 unless a source-supported outline needs more distinct subconcepts. Merge overlapping headings and short sections that teach one idea; split unrelated reader goals. Keep paragraphs and examples focused, and use tables only for shared comparison fields.

Keep a coherent page at or below 12 content-view heights at 1280 × 800. Restructure repetition before splitting; split only when reader goals differ. In critique, name each tab's alternatives and shared question, and each accordion's optional peers and reason for independent disclosure. Reject schedules in accordions, whole-section tabs, and hidden dependent ideas. Keep the Subject Information headings in order and its schedule visible as a table.

### Independent critique

Give a fresh reviewer the complete tree, available sources, and rendered pages. Ask them to act as a beginner who must solve a difficult, unfamiliar problem using only the lessons.

Ask for the reviewer's direct, unstructured prose only; give no response format, examples, templates, or prior findings. The critique must explain what the learner understood, where they had to guess or look up a term, and whether they solved an unfamiliar problem, with evidence from the sources and rendered pages. Reject structured responses rather than reshaping them.

The reviewer must trace explanations and examples, test boundary cases, compare similar ideas, and attempt a new problem without copying a worked example. Check source coverage, prerequisite order, headings, rendered states, and the required Subject Information structure. After each repair, repeat with a fresh reviewer until no actionable issue remains.

### Coverage and rendering

**Coverage report**

Map useful source points to concepts and leaves in workflow notes, not published pages. Report missing material or unavailable sources outside the tree; do not claim full coverage when a source could not be read.

**Rendered page**

Read every rendered leaf. Check concise headings, scannable prose, working links, complete tables and diagrams, visible essential examples, and complete optional accordion items. Fix layout problems, missing blocks, broken links, or hidden pages before reporting completion.

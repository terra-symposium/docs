---
title: Schema source excerpts
description: Exact Website leaf-schema wording behind the Docs authoring guide.
order: 90
---

Use the [authoring guide](/1-authoring/authoring/) to plan and write a page. These excerpts preserve the Website `sanity/schemas/docs.tsx` comments reviewed on 17 November 2026 for checking exact wording. Check the current Website schema before relying on them for a new generation run.

## Leaf-body and hierarchy instructions

```tsx
 * AI AGENT:
 * This schema is to be used as instructions for all documentation writing. If you are given a prompt that isn't explicitly generating a different schema (e.g., "generate an Arcs"), then you must assume that the documentation is being used. For example, if the prompt was "Summarise this PDF," then you should generate a Markdown document that corresponds to the Markdown version of the leaf schema, employing all advice and fields available.
 * Use the Documentation leaf in the Executive > Management group for executive-management style and tone, then read `.agents/skills/documenting/author/SKILL.md` for the Docs MCP workflow. For generation requests, do not manually read the target leaf or its attachments first; pass the leaf id directly to the generator and let it read the source itself. Write for moderately experienced readers in a helpful-mentor voice: plain, repeatable, contextual, minimal, and relaxed. For university notes, organise concepts for retrieval and connection rather than reproduce a chronological transcript.
	* Let hierarchy and visual structure carry meaning: use short, predictable heading levels; keep the primary reading path focused on salient information; use the block that matches the relationship; and place lengthy, optional, supporting, or low-salience collections in titled accordions. Keep one concise idea per bullet, splitting compound points into sub-bullets or separate paragraphs. Apply these principles generically rather than encoding a particular source example.
 * When asked to generate a leaf body, return the leaf body in the Terra Docs markdown dialect, not plain GitHub-flavoured Markdown. Use only canonical Docs blocks already supported by the schema, such as headings, tables, callouts, tabs (`===[...]`), accordions (`|||[...]`), nodes (`# NODES`), embeds, and code. Do not invent custom JSX children such as <AccordionItem>, <TabItem>, or <TabsList>. Do not emit HTML or JSX tags such as <Code> or <Tabs> unless they are explicitly named in the schema. Use the canonical code syntax exactly as `<Code language="text"> ... </Code>`. Markdown is the response body, not a field named markdown. The first line of the body must be an H2 heading beginning with ##. Example leaf body:
 *
 * ## Setup
 * Use short, direct headings and keep the body organised.
 *
 * Block-specific warnings live beside each block definition below.
```

## Global authoring directives

```tsx
 * @ai - GLOBAL DOCUMENTATION AUTHORING DIRECTIVES
 *
 * PURPOSE:
 * Code explains *how* the software works; documentation explains *why* it exists.
 * Documentation must capture invisible context (business requirements, architectural constraints, trade-offs) over translating code to English.
 * Litmus Test: If you refactor code to improve performance without changing behavior, the documentation should NOT need to change.
 * Use the Documentation leaf in the Executive > Management group for executive-management style and tone, then follow `.agents/skills/documenting/author/SKILL.md` for required Docs MCP direct-generation, attachment, preservation, and verification. Do not manually read the target leaf or attachments first when the request is to regenerate from attachments.
 * Apply that leaf directly: use a helpful-mentor voice for moderately experienced readers; write plain, repeatable, contextual, minimal, relaxed prose; use H2/H3 hierarchy with a short introduction under each heading; use descriptive links, bullets for unordered facts, numbered lists for sequences, and tables for repeated or multidimensional information. University leaves must connect atomic concepts for recall, preserve explicit lists, avoid chronological filler, and finish substantial notes with their practical implication.
 *
 * PRINCIPLES:
 * - Plain: Use simple, everyday language. Avoid jargon unless defined.
 * - Repeatable: Maintain a consistent structure, tone, and phrasing.
 * - Contextual: Explain the *why* behind an instruction, not just the *what*.
 * - Minimal: Omit filler words. Every word should serve a purpose.
 * - Relaxed: Write in a helpful, encouraging tone. No formal/sales-oriented jargon.
 *
 * VOICES:
 * - Product (Marketing): Persuasive/narrative. Focus on ROI & Value. Exclude implementation details (noise).
 * - Engineering (Tech): Objective/abstract. Focus on Utility & Intent. Group features logically (not file-by-file). Map Element -> Action -> Goal.
 * - University (Academic): Connective/atomic. Focus on Recall & Connection. Exclude verbatim transcripts. End with a "So What?" summary.
 * - Reading Lists: Consolidate sources into task-focused accordions. Use 1-2 sentence intros. Transcribe explicit lists exactly. Never merge points. Use tables for multi-dimensional sets.
 *
 * POSTERITY:
 * - AI Comments: Use `{/* comments *\/}` sparingly to provide context to AI agents.
 * - Tasks: Synthesise (merge multiple), Convert (restructure single), Critique (evaluate content), Compare (create comparison table), Polish (conform structure).
 * - Default Task: If no prompt is provided, default to Convert.
 *
 * VALIDATION (CRITICAL Rules for AI Generation):
 * - RECURSIVE SCAN: You are prohibited from outputting text until you have internally verified your content against these rules.
 * - NO CITATIONS: Do not generate `[cite]` references. ZERO TOLERANCE.
 * - ESCAPING RULES: Escape `<`, `:`, and `$` where appropriate to prevent HTML/MDX parsing errors.
 */
```

## Leaf embeds and content

```tsx
		 * @ai - LEAF EMBEDS & CONTENT RULES
		 *
		 * PURPOSE:
		 * Leaf embeds allow you to extract and reuse blocks of content as nested, standalone documents. By abstracting a block into a leaf, you create a seamless inline render of another MDX document. Ideal for managing large, complex pages or creating reusable reference sections.
		 *
		 * RULES:
		 * - Author a code block with a fenced code block or canonical `<Code language="..."> ... </Code>`; do not use a `code` attribute.
		 *
		 * MD EXAMPLE (HOW YOU MUST GENERATE CONTENT):
		 * <Leaf id="sanity-document-id" />
		 *
		 * BLOCK EXAMPLE (HOW SANITY STORES IT - DO NOT GENERATE THIS):
		 * { component: "LeafIdHere" } // Handled via version component selection in Sanity
		 */
```

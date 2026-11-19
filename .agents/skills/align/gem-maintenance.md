---
name: gem
description: Update and verify the Document Gem in the browser.
metadata:
  related-files:
    - docs/0-installation/component.md
    - src/components/blocks.tsx
    - src/lib/markdown-model.ts
---

# Document Gem Maintenance

Use when changing the saved Terra Document Gem, its knowledge, or its browser-backed generation contract. This is an explicit external configuration update. It does not authorize a Docs leaf write.

The listed related files establish Docs block and Markdown behavior. The Gem's saved settings are external state; inspect them in the authorized browser at the start of each task. The generation source and commands are owned by the Website repository, so check that repository's current files before relying on the paths or behavior described below. If either source is unavailable, record the gap and stop before changing the Gem.

## Ownership and provider choice

In the website checkout, `scripts/generation/_gemini.ts` owns the local `geminiPrompt()` composer prompt, chat, uploads, provider selection, and response extraction. It does not currently implement saved Gem mutation.

The website checkout's `tests/scripts/generation/generation.spec.ts` imports the generation case files; it is not a Gem metadata editor.

The website checkout's `tests/scripts/generation/playwright.gem.config.ts` targets `scripts/generation/document-gem.spec.ts`, which must exist before the configured update command can work.

The latest prompt source is `geminiPrompt()` in `_gemini.ts`; older journal records may refer to `GEMINI_LEAF_PROMPT` and are historical.

Keep the exact saved Gem instruction, metadata, and knowledge inventory in a local `gem-snapshots/` folder. The prompt source in `_gemini.ts` is not proof of the live saved instruction.

Prepare instruction and knowledge changes with [content maintenance](gem-references/content.md). Prepare name, description, citation, and identity changes with [metadata maintenance](gem-references/metadata.md). Apply and verify both in one sequential UI session so they cannot overwrite each other.

Read [`provider-modes.md`](gem-references/provider-modes.md) before selecting a provider. Gemini Gem updates use the Gemini web UI; OpenAI uses `OpenAI.chat()` and `OPENAI_API_KEY`, has no Gem or browser knowledge list, and currently does not upload the shared `files` input.

## Safety contract

Reuse the authenticated Gemini browser profile. When the user specifies the in-app browser, keep all Gemini UI work in that existing tab; do not substitute isolated Playwright or a second browser session.

Never create a second anonymous context, duplicate headed window, or parallel Gemini session for one leaf. Stop on auth failure; do not open a fallback session.

Keep credentials out of prompts, source, logs, and artifacts. Do not call any Docs/Sanity mutation during local iteration.

- Never commit unless separately authorized.
- Use the shared bounded `HealWorkflow` and attachment validator. Preserve raw responses and audit diagnostics; no more than three retries after the initial attempt, and no write after failed validation.

## Update procedure

1. Read the [Docs component reference](../../../docs/0-installation/component.md) and [Docs authoring guide](../../../docs/1-authoring/authoring.md), the latest numbered [prompt journal](gem-references/prompt-journal.md) entry, current prompt source, schema, and [provider modes](gem-references/provider-modes.md).
2. In the authenticated Gemini UI, inspect the intended Gem and capture its ID, name, description, exact instructions, citation setting, and every knowledge attachment label before making changes. Save the exact values and attachment manifest in a new snapshot folder under `gem-snapshots/`; never copy authentication state.
3. Separate the work into two reviewable parts: Gem content (instructions and knowledge files) and Gem metadata (name, description, citation setting, and target Gem identity). Preserve any field not explicitly being changed. Record repository paths and hashes for local knowledge files.
4. Edit the repository prompt/context. The current checkout has no `CONTEXT_FILES` list or working Gem update implementation. `package.json` invokes a missing root `playwright.gem.config.ts`; the available config at `tests/scripts/generation/playwright.gem.config.ts` points to a missing `scripts/generation/document-gem.spec.ts`. Do not rely on the update command until both paths are repaired and the updater saves/reload-verifies the intended fields.
5. If a supported updater exists and the user has explicitly requested a saved-Gem change, use the authenticated in-app browser when the user has required it. Otherwise use the repository's documented isolated updater. Never create a second Gemini session for the same leaf.

6. After saving, reload the Gem and verify metadata, exact instruction text, citation setting, and every expected knowledge label. Save a post-update snapshot and diff it against the pre-update snapshot. Keep both snapshots for audit/rollback.

7. Keep Gemini on Pro or Thinking when the user requests either. Do not run Fast as a fallback. Production generation accepts Pro or Thinking only when `TERRA_ALLOW_PRODUCTION_GEM_MODE=1` is explicitly set. The repository-owned `pnpm run docs:mcp` command sets that opt-in and still requires the production Infisical profile and canonical validation path.

The configured updater command is currently broken and is shown only to identify the stale entry point:

```sh
GEMINI_STORAGE_STATE=/absolute/path/to/playwright/.auth/user.json \
GEMINI_CHROME_PATH=/absolute/path/to/Google\ Chrome \
pnpm run generation:gem:update
```

This command currently points to a missing `document-gem.spec.ts` test target, so it is not a working updater in this checkout. Repair and verify that implementation before invoking it. Do not treat the command's presence as evidence of a successful update.

8. If state is invalid, stop and refresh it through the shared `authenticate()` helper in the website checkout's `scripts/generation/_auth.ts` only when that workflow is authorized. Do not put credentials in files or use a native file picker.
9. Use a locally saved Canvas capture obtained through the approved in-app browser workflow. The Canvas exporter now lives in the private Uni Notes repository and only prepares local source files; it is not a Docs generation harness. Keep the source capture and provider output under Downloads for review.

10. Inspect raw output before normalization: one outer fenced `markdown` body, first body line H2, supported fenced code and tables, no unsupported blocks or citation markers. The current Website extractor accepts fences of three or more backticks; confirm the prompt's requested length in current source. Preserve raw and normalized artifacts together.
11. On a syntax/schema/coverage failure, pass the exact failure to the bounded healer and make the smallest prompt/driver correction. After retries are exhausted, stop and report the final error and diagnostic path.
12. Journal every prompt revision with exact prompt/source link, Gem ID, mode, context files, output directory, and raw/normalized validation. Log transport/extraction fixes separately from prompt revisions.

The shared contract also requires source-weighted length, meaningful Docs blocks, deterministic attachment anchors, strict semantic audit, and verified post-write quality evidence for production generation. Run `scripts/generation/_coverage.mjs` before any write: require at least `max(800, 8% of readable source characters)` and three meaningful blocks for substantial material; account for every usable attachment with deterministic anchors and the strict semantic audit. Re-read the stored leaf after a successful write. Never copy audit metadata into stored Markdown/MDX.

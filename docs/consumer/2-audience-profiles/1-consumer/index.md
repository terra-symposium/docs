---
title: Consumer
description: Write user guides that help people complete tasks in a product.
---

## Reader

Write for a person using a product to accomplish a task. Consumer documentation is a **user guide**: it explains what to do, what the interface will show, and how to tell the task worked. It supports the user's goal; it is not product copy or a feature pitch.

## Goal

State the result first, then give ordered actions with the information needed at each decision. Include prerequisites, labels exactly as they appear, expected results, recovery steps for likely errors, and a final check. Do not make a screenshot carry instructions that should be written as text.

## Tone

Be neutral, direct, and reassuring. Address the reader as “you”; use the exact button, menu, field, and status labels they can see. Explain a term before using it and avoid marketing language or unexplained product jargon.

## Patterns

Use the tutorial pattern when readers need to complete an ordered task with UI or code variants.

### Tutorials

Use a step table for a tutorial when each action has a useful visual or code counterpart. Put the instruction in the left column and the corresponding screenshot or code example in the right column. Use one row per step; crop screenshots to the relevant control, preserve readable labels, and add alt text that describes the meaningful state. Keep each step complete when the image is unavailable.

Wrap parallel variants in Docs tabs so readers can select the path they use:

|||[User interface]

| Instruction                                                                    | Screenshot                                                                                 |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| In the Docs editor, open the **Text** menu; confirm the heading styles appear. | ![The Text menu open with Heading 2 available](../../1-usage/2-blocks/block-type-menu.png) |

|||

|||[Code]

| Instruction                                                              | Code            |
| ------------------------------------------------------------------------ | --------------- |
| Set the option, save the configuration, then confirm the returned value. | `config.save()` |

|||

## Sources

Verify each procedure against the current product release or API. Capture screenshots from the same release and state as the instructions, remove personal or confidential data, and keep the original source and tested version in the authoring record.

## Validation

- Use the same order and wording as the visible interface or verified API.
- Give every step one action and its expected result.
- Show a recovery path when an error can prevent completion.
- Keep screenshots current, focused, accessible, and secondary to text instructions.
- Verify the procedure from the reader's starting state through its final result.
- Have a reader who did not write the guide follow it without help; repair every step where they pause, guess, or get a different result.

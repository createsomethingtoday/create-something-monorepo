---
name: writing-for-humans
description: Draft or edit clear nonfiction for real human readers while preserving facts, citations, uncertainty, technical meaning, and CREATE SOMETHING’s Canon voice (precise, capable, human, accountable). Use for operator instructions, runbooks, onboarding, documentation, reports, proposals, arguments, technical explanations, case studies, teaching, public copy, and messages.
---

# Writing for humans

Write for the least-tenured credible practitioner in the artifact's actual field unless the source names another reader. Assume they know basic field concepts but do not know CREATE SOMETHING vocabulary.

Optimize for use, not a detector score. Light writing has low cognitive load: the reader can find the point, the recommended path, and the next action without decoding the organization.

## Apply the voice

For CREATE SOMETHING work, read [the approved voice guide](references/create-something-voice.md) before drafting or revising. It is the shared voice source for this skill and the repository’s Voice Canon. Apply its property emphasis without forcing internal vocabulary into unrelated work. For another brand, preserve that brand’s approved voice and use this skill’s clarity workflow.

Use this skill automatically for relevant writing work, or invoke it explicitly:

```text
$writing-for-humans Rewrite this for CREATE SOMETHING’s Canon voice. Keep the facts and uncertainty intact: [text]
```

Return the requested writing. Keep internal checks and source retrieval out of the deliverable unless the user asks for a review. If a missing fact prevents an accurate claim, flag the gap without filling it in.

## Preservation contract

Identify and preserve facts, citations, quotations, uncertainty, scope limits, approved claims, exact labels, required terms, and technical safety boundaries before editing.

You must not invent metrics, customers, examples, anecdotes, experiences, opinions, sources, outcomes, or confidence. Mark a missing fact or request evidence instead of adding plausible detail.

Keep property voice intact. Explain owned terms in plain language where the reader first needs them. Keep code, legal language, exact UI labels, and technical terms when accuracy depends on them.

## Core workflow

1. Name the reader and outcome: after reading, what should they understand, decide, believe, or do?
2. Write the answer in one plain sentence. For actionable prose, state the recommended path.
3. Build the smallest useful framework stack for the artifact job. Do not apply every framework.
4. Group two to four supporting ideas beneath the answer. Put evidence, examples, limits, and qualifications under the idea they support.
5. Give each paragraph one job. Connect the paragraph's claim, evidence or example, meaning, and next point.
6. Repair difficult sentences: make the main character the subject, express the main action as a verb, begin with familiar context, and place important new information near the end.
7. Remove throat-clearing, repeated conclusions, inflated phrasing, hidden verbs, and unnecessary choices.
8. Read once for factual integrity, once for reader use, and once aloud for voice and rhythm. For CREATE SOMETHING work, apply the Canon test and check all four pillars in the approved voice guide.

## Draft, edit, and learn

Separate capturing the ideas from making them easy to read. Scale editing effort to the audience and consequence: scan a short message; give widely circulated or consequential writing a dedicated revision and feedback pass. Spend the writer's time to save the reader's time.

- Before editing, identify the source observation, experience, or evidence that makes the piece useful. Preserve that substance and the author's voice. Do not inflate a small observation into a longer piece without adding supported information.
- Check the reading medium. Paragraphs, lists, selective emphasis, and diagrams should help the reader follow or scan the argument. Shorter is useful when it preserves meaning; uniform short sentences are not a goal.
- Ask directed feedback questions: Where did you lose the thread? What felt redundant? What do you think the takeaway or next action is? Use the response to find a bounded revision rather than asking only whether the writing is good.
- When a relevant approved example is available, study how it introduces the point, orders evidence, and earns the next action. Borrow the technique, not its wording, customer facts, or claims. Compare the revised draft with that example for clarity.
- Treat automated edits as suggestions. Reject changes that distort meaning, erase useful uncertainty, or replace the author's voice. A readability score does not settle an editorial decision.

When the user asks to improve an ongoing writing practice, choose one recurring artifact, such as a weekly update or meeting summary. Draft it, edit it, seek specific feedback, and carry one lesson into the next version. Keep any lesson with the authorized project artifact; do not create persistent memory or a new schedule without a request.

## Framework router

Select only the row that matches the artifact's main job. Read its reference before drafting or making a structural edit.

| Artifact job                                           | Required stack                                                          | Reference                                                       |
| ------------------------------------------------------ | ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| Operator instructions, runbook, onboarding, navigation | Plain language, answer-first structure, sentence clarity, revision      | [operator-instructions.md](references/operator-instructions.md) |
| Report or proposal                                     | Answer-first structure, grouped supports, sentence clarity, revision    | [reports-and-arguments.md](references/reports-and-arguments.md) |
| Argument or research article                           | Existing conversation, response, reasons, counterargument, significance | [reports-and-arguments.md](references/reports-and-arguments.md) |
| Technical explanation                                  | Topic flow, visible actors and actions, familiar-to-new information     | [sentence-clarity.md](references/sentence-clarity.md)           |
| Case study or presentation                             | Answer-first structure; add And-But-Therefore when movement helps       | [reports-and-arguments.md](references/reports-and-arguments.md) |
| Teaching or memorable public prose                     | Core workflow; add a memorability check only after clarity and evidence | [reports-and-arguments.md](references/reports-and-arguments.md) |

Use [examples.md](references/examples.md) when the draft is still abstract or the correct transformation is unclear. Calibrate artifact routing against `scripts/prose-quality/evals/writing-tasks.v1.json` for repo work.

## Lightness contract

- Present one recommended path before alternatives.
- Introduce the concrete task before architecture or rationale unless safety requires the reverse.
- Introduce one new concept at a time and ground it where it first appears.
- Give each step one action and place its expected result beside it.
- Put prerequisites before commands, recovery beside likely failures, and completion proof at the end.
- Use headings that answer reader questions rather than naming internal categories.
- Keep tables and checklists only when they make comparison or execution easier for the human reader.
- Move optional history, theory, edge cases, and machine-oriented structure after the usable path.

## Review pattern clusters

Treat these as contextual review prompts, not forbidden tokens:

- a conclusion buried beneath discovery history
- stacked abstractions before a concrete actor, action, example, or consequence
- several choices before a recommended default
- commands without prerequisites, expected results, recovery, or completion proof
- repeated restatement of the same conclusion
- canned openings or transitions that could fit any document
- unexplained owned terms or acronyms
- claims detached from evidence, uncertainty, or scope limits

One instance is not proof of poor prose or AI authorship. Keep a pattern when it is accurate, natural in context, and useful to the reader.

## Repository verification

Read `docs/policies/v1/policy.prose-quality.v1.md`, then run the narrow check:

```bash
pnpm prose:check -- path/to/file.md --format json
```

Fix deterministic findings. Treat warnings as review prompts, not rewrite commands. Invoke `$target-reader-review` for independent judgment in the complete rendered component or document section.

Finish consequential publication with a human final read. A green linter proves only the declared deterministic contract; it never proves that the prose is good.

## Attribution

The workflow combines plain-language usability with answer-first organization, visible characters and actions, reader-expectation information flow, and subtractive revision. It draws on Barbara Minto, Joseph Williams, George Gopen and Judith Swan, William Zinsser, Gerald Graff and Cathy Birkenstein, Randy Olson, and Chip and Dan Heath. It also adapts clear-writing principles from `softaworks/agent-toolkit`'s MIT-licensed `writing-clearly-and-concisely` skill without vendoring its prompt.

The deliberate practice loop also draws on Gergely Orosz's [Becoming a Better Writer](https://newsletter.pragmaticengineer.com/p/becoming-a-better-writer): separate drafting and editing, ask specific feedback questions, study effective examples, and practice on recurring work.

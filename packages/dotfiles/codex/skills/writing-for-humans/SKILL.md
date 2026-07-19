---
name: writing-for-humans
description: Draft or edit clear nonfiction for real human readers while preserving facts, citations, uncertainty, technical meaning, and CREATE SOMETHING property voice. Use for operator instructions, runbooks, onboarding, documentation, reports, proposals, arguments, technical explanations, case studies, teaching, public copy, and messages.
---

# Writing for Humans

Write for the least-tenured credible practitioner in the artifact's actual field unless the source names another reader. Assume they know basic field concepts but do not know CREATE SOMETHING vocabulary.

Optimize for use, not a detector score. Light writing has low cognitive load: the reader can find the point, the recommended path, and the next action without decoding the organization.

## Preservation Contract

Identify and preserve facts, citations, quotations, uncertainty, scope limits, approved claims, exact labels, required terms, and technical safety boundaries before editing.

You must not invent metrics, customers, examples, anecdotes, experiences, opinions, sources, outcomes, or confidence. Mark a missing fact or request evidence instead of adding plausible detail.

Keep property voice intact. Explain owned terms in plain language where the reader first needs them. Keep code, legal language, exact UI labels, and technical terms when accuracy depends on them.

## Local Comprehension Gate

Test the first encounter with every section, step, and major claim before relying on later explanation. The opening must give the target reader enough local meaning to earn the next sentence:

- name a recognizable actor or affected thing
- express a meaningful action as a verb
- show an observable result, consequence, or decision when the claim depends on one

Artifact-facing meta-copy such as `this page explains` or `the section now holds` describes the writing instead of the reader's subject. Rewrite it unless the artifact itself is what the reader came to understand.

Downstream labels, cards, examples, or definitions cannot rescue an unclear first encounter. Ask a reviewer to restate the point without CREATE SOMETHING vocabulary. If the restatement requires guessing, repair the opening before polishing what follows.

An exact-string assertion is preservation evidence only. It can prove that approved wording remains present; it cannot prove that the wording is clear.

## Core Workflow

1. Name the reader and outcome: after reading, what should they understand, decide, believe, or do?
2. Write the answer in one plain sentence. For actionable prose, state the recommended path.
3. Build the smallest useful framework stack for the artifact job. Do not apply every framework.
4. Group two to four supporting ideas beneath the answer. Put evidence, examples, limits, and qualifications under the idea they support.
5. Give each paragraph one job. Connect the paragraph's claim, evidence or example, meaning, and next point.
6. Repair difficult sentences: make the main character the subject, express the main action as a verb, state the observable result, begin with familiar context, and place important new information near the end.
7. Remove throat-clearing, repeated conclusions, inflated phrasing, hidden verbs, and unnecessary choices.
8. Read once for factual integrity, once for reader use, and once aloud for voice and rhythm.

## Framework Router

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

## Lightness Contract

- Present one recommended path before alternatives.
- Introduce the concrete task before architecture or rationale unless safety requires the reverse.
- Introduce one new concept at a time and ground it where it first appears.
- Give each step one action and place its expected result beside it.
- Put prerequisites before commands, recovery beside likely failures, and completion proof at the end.
- Use headings that answer reader questions rather than naming internal categories.
- Keep tables and checklists only when they make comparison or execution easier for the human reader.
- Move optional history, theory, edge cases, and machine-oriented structure after the usable path.

## Review Pattern Clusters

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

## Repository Verification

Read `docs/policies/v1/policy.prose-quality.v1.md`, then run the narrow check:

```bash
pnpm prose:check -- path/to/file.md --format json
```

Fix deterministic findings. Treat warnings as review prompts, not rewrite commands. Invoke `$target-reader-review` for independent judgment in the complete rendered component or document section.

Finish consequential publication with a human final read. A green linter proves only the declared deterministic contract; it never proves that the prose is good.

## Attribution

The workflow combines plain-language usability with answer-first organization, visible characters and actions, reader-expectation information flow, and subtractive revision. It draws on Barbara Minto, Joseph Williams, George Gopen and Judith Swan, William Zinsser, Gerald Graff and Cathy Birkenstein, Randy Olson, and Chip and Dan Heath. It also adapts clear-writing principles from `softaworks/agent-toolkit`'s MIT-licensed `writing-clearly-and-concisely` skill without vendoring its prompt.

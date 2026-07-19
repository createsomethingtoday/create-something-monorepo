# policy.prose-quality.v1

- Status: `draft`
- Owner: `CREATE SOMETHING editorial systems`
- Effective date: `TBD`

## Purpose

Make agent-authored prose clear and useful to a human reader without turning editorial judgment into an AI detector, a style monoculture, or a brittle CI gate.

The target reader is the least-tenured credible practitioner in the document's actual field. They know the field's basic concepts, but they do not arrive knowing CREATE SOMETHING vocabulary.

## Ownership

- **Database:** this policy, its JSON rule configuration, property overlays, and the writing and target-reader evaluation corpora.
- **Automation:** the root `prose:*` commands, changed-file selection, stable findings, and text or JSON reports.
- **Judgment:** `writing-for-humans` owns drafting and structural editing; `target-reader-review` owns independent reader judgment; the Voice Canon owns the final clarity, humanity, and revision pass. Property voice, claim preservation, and the final human read remain authoritative.

## Policy Statements

1. Agent-authored prose MUST be evaluated for a defined target reader and preserve the source's facts, citations, uncertainty, scope limits, technical labels, and approved property voice.
2. Writers, reviewers, and automated rewrites MUST NOT invent metrics, examples, experiences, opinions, citations, confidence, customer details, or outcomes.
3. Deterministic checks MUST enforce only reliable policy or configuration claims; contextual readability signals MUST remain warnings or human judgment.
4. Changed-file enforcement MUST block only findings introduced within the selected scope. A full audit MUST expose existing backlog without turning that backlog into a promotion failure.
5. Consequential publication MUST receive a final human read for factual integrity, reader momentum, property voice, and proof sufficiency.
6. Target-reader verdicts MUST use rendered-component context. Unrelated file-level deterministic findings MUST NOT change an excerpt's scoped reader verdict.
7. Intentional teaching examples MAY be excluded only with balanced, reason-bearing prose-ignore markers. The exclusion MUST NOT conceal published claims.
8. Operator-facing prose MUST make its usable path discoverable: outcome, applicability, prerequisites, first action, expected result, recovery, and completion proof. Short artifacts MAY combine these elements when the sequence remains clear.
9. Writers MUST select the smallest framework stack that fits the artifact. Human-facing prose MUST NOT gain tables, checklists, terminology, or theory solely to make it easier for an agent to parse.

## Enforcement Boundary

1. `prose:check` MUST fail only for deterministic findings in the selected changed files or explicit files.
2. `prose:audit` MUST report the full tracked backlog without failing because backlog exists.
3. Exact prohibited phrases, unauthorized claims, schema-declared required fields, and typed content requirements MAY be deterministic failures when their owning policy declares them.
4. Sentence length, abstraction density, owned-term density, passive voice, grade level, restatement, proof sufficiency, nuance, and desire to continue MUST remain warnings or human judgment unless a later policy supplies reliable typed requirements.
5. A reviewer or agent MAY return `hold` to request human review. A hold MUST NOT masquerade as a deterministic CI failure.

## Reader Contract

Readable prose should create useful momentum: concrete stakes, visible progress or discovery, coherent information flow, varied rhythm, and respect for the reader. It does not require jokes, slang, fake anecdotes, or forced informality.

Light writing means low cognitive load, not merely short sentences. The reader should be able to find the point, the recommended path, and the next action without reconstructing the author's organization. Present one default before alternatives, introduce the concrete task before optional architecture, and place expected results and recovery beside the actions they qualify.

Writers and reviewers MUST preserve facts, citations, uncertainty, scope limits, technical labels, and approved property voice. They MUST NOT invent metrics, examples, experiences, opinions, or customer details to make prose feel human.

Individual phrases are not evidence that prose was AI-written. Review repeated patterns in context. Do not optimize for detector scores or evade detection systems.

Ambiguous terms such as `leverage` and `solutions` are contextual warnings, not deterministic failures. Their field-specific uses can be precise. Teaching material may wrap intentional negative examples in `<!-- prose-ignore-start: reason -->` and `<!-- prose-ignore-end -->`. Markers MUST be balanced and the start marker MUST state the teaching reason. Use that escape hatch only for quoted or instructional examples, never to hide published claims.

## Rules and Overlays

The machine-readable artifact owns the root deterministic rules, warning thresholds, automatic scope, and controlled vocabulary exceptions.

The `.agency` overlay reuses `PUBLIC_COPY_RULES` from `packages/agency/scripts/check-public-copy.mjs`. The root adapter MUST NOT duplicate that rule list. The existing package check remains authoritative until the root interface has sustained parity evidence.

Technical labels inside code spans are excluded from reader-signal counts. Controlled property terms are allowed where the machine-readable policy declares them. Controlled vocabulary is not a license to stack terms without local meaning.

## Framework Authority and Routing

Use `packages/dotfiles/codex/skills/writing-for-humans/SKILL.md` as the canonical drafting and structural-editing workflow. Use `packages/dotfiles/codex/skills/target-reader-review/SKILL.md` as the independent judgment workflow. Use `.claude/rules/voice-canon.md` for the final clarity, voice, and revision pass; it does not own report structure or operator usability.

Route by artifact job:

- operator instructions, runbooks, onboarding, and navigation: plain-language usability, answer-first structure, sentence clarity, and revision
- reports and proposals: answer first, grouped supports, evidence, sentence clarity, and revision
- arguments: existing conversation, response, reasons, counterargument, and significance
- technical explanations: visible characters and actions, coherent topic flow, and familiar-to-new information
- case studies, presentations, teaching, and memorable public prose: add narrative movement or memorability checks only when they serve the artifact

Do not apply every framework to every artifact.

## Commands

```bash
pnpm prose:check
pnpm prose:check -- --changed-from origin/main --format json
pnpm prose:check -- path/to/file.md --format json
pnpm prose:audit -- --format json
pnpm prose:test
```

Reports use a versioned schema and return `pass`, `review`, or `block`. Only `prose:check` with blocking findings exits non-zero.

Changed-file checks compare the current finding multiset with the selected Git baseline by rule, severity, and normalized excerpt. Pre-existing findings do not block an unrelated edit; an added occurrence of the same finding still counts as introduced.

## Evaluation and Human Review

The target-reader corpus contains six pass and six revise examples across public copy, navigation, operator guides, and technical explanations. Operator cases record whether a junior practitioner can orient, find the default, start, complete, recover, and verify. Corpus verdicts calibrate judgment; they are not token bans and do not authorize automatic rewrites.

The writing-task corpus covers operator instructions, reports, arguments, technical explanations, case studies, and teaching. It records the expected information sequence, framework reference, and preservation requirements for each artifact type. The deterministic test validates this contract without pretending that a live model outcome has been proven.

Every consequential publication still requires a human final read for factual integrity, reader momentum, property voice, and whether the evidence supports the claim.

## Evidence

- The machine-readable contract is `docs/policies/v1/policy.prose-quality.v1.json`.
- Deterministic behavior and changed-file semantics are covered by `scripts/test/prose-quality.test.mjs` and run with `pnpm prose:test`.
- Drafting calibration is recorded in `scripts/prose-quality/evals/writing-tasks.v1.json` with artifact routing, observable sequence, and preservation requirements.
- Target-reader calibration is recorded in `scripts/prose-quality/evals/target-reader.v1.json` with source anchors, complete visible context, artifact type, expected verdicts, and operator-path checks where applicable.
- Writer and independent-reader workflows are installed from `packages/dotfiles/codex/skills/writing-for-humans/SKILL.md` and `packages/dotfiles/codex/skills/target-reader-review/SKILL.md`.
- Property ownership remains executable through `packages/agency/scripts/check-public-copy.mjs` and its package-local tests.
- Repository policy shape is validated with `pnpm policy:artifacts:check`; prose enforcement is validated with `pnpm prose:check -- --changed-from origin/main --format json`.

## Rollback

The safe rollback is to remove the root `prose:*` command from a promotion gate while retaining audit output and the existing property checks. Do not delete the `.agency` guard or weaken its rule source to make the root check pass.

## Source Anchors

- `.claude/rules/voice-canon.md`
- `.claude/commands/audit-voice.md`
- `packages/agency/scripts/check-public-copy.mjs`
- `scripts/prose-quality/evals/writing-tasks.v1.json`
- `scripts/prose-quality/evals/target-reader.v1.json`
- Adapted clear-writing principles from [`softaworks/agent-toolkit`](https://github.com/softaworks/agent-toolkit), MIT licensed; the repository does not vendor its large reference prompt.

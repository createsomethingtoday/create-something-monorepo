# policy.prose-quality.v1

- Status: `draft`
- Owner: `CREATE SOMETHING editorial systems`
- Effective date: `TBD`

## Purpose

Make agent-authored prose clear and useful to a human reader without turning editorial judgment into an AI detector, a style monoculture, or a brittle CI gate.

The target reader is the least-tenured credible practitioner in the document's actual field. They know the field's basic concepts, but they do not arrive knowing CREATE SOMETHING vocabulary.

## Ownership

- **Database:** this policy, its JSON rule configuration, property overlays, and `scripts/prose-quality/evals/target-reader.v1.json`.
- **Automation:** the root `prose:*` commands, changed-file selection, stable findings, and text or JSON reports.
- **Judgment:** the Voice Canon, property voice, target-reader review, claim preservation, and the final human read.

## Enforcement Boundary

1. `prose:check` MUST fail only for deterministic findings in the selected changed files or explicit files.
2. `prose:audit` MUST report the full tracked backlog without failing because backlog exists.
3. Exact prohibited phrases, unauthorized claims, schema-declared required fields, and typed content requirements MAY be deterministic failures when their owning policy declares them.
4. Sentence length, abstraction density, owned-term density, passive voice, grade level, restatement, proof sufficiency, nuance, and desire to continue MUST remain warnings or human judgment unless a later policy supplies reliable typed requirements.
5. A reviewer or agent MAY return `hold` to request human review. A hold MUST NOT masquerade as a deterministic CI failure.

## Reader Contract

Readable prose should create useful momentum: concrete stakes, visible progress or discovery, varied rhythm, and respect for the reader. It does not require jokes, slang, fake anecdotes, or forced informality.

Writers and reviewers MUST preserve facts, citations, uncertainty, scope limits, technical labels, and approved property voice. They MUST NOT invent metrics, examples, experiences, opinions, or customer details to make prose feel human.

Individual phrases are not evidence that prose was AI-written. Review repeated patterns in context. Do not optimize for detector scores or evade detection systems.

Ambiguous terms such as `leverage` and `solutions` are contextual warnings, not deterministic failures. Their field-specific uses can be precise. Teaching material may wrap intentional negative examples in `<!-- prose-ignore-start: reason -->` and `<!-- prose-ignore-end -->`. Markers MUST be balanced and the start marker MUST state the teaching reason. Use that escape hatch only for quoted or instructional examples, never to hide published claims.

## Rules and Overlays

The machine-readable artifact owns the root deterministic rules, warning thresholds, automatic scope, and controlled vocabulary exceptions.

The `.agency` overlay reuses `PUBLIC_COPY_RULES` from `packages/agency/scripts/check-public-copy.mjs`. The root adapter MUST NOT duplicate that rule list. The existing package check remains authoritative until the root interface has sustained parity evidence.

Technical labels inside code spans are excluded from reader-signal counts. Controlled property terms are allowed where the machine-readable policy declares them. Controlled vocabulary is not a license to stack terms without local meaning.

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

The target-reader corpus contains six pass and six revise examples across `.agency`, `.ltd`, `.io`, and `.space`. Corpus verdicts calibrate judgment; they are not token bans and do not authorize automatic rewrites.

Every consequential publication still requires a human final read for factual integrity, reader momentum, property voice, and whether the evidence supports the claim.

## Rollback

The safe rollback is to remove the root `prose:*` command from a promotion gate while retaining audit output and the existing property checks. Do not delete the `.agency` guard or weaken its rule source to make the root check pass.

## Source Anchors

- `.claude/rules/voice-canon.md`
- `.claude/commands/audit-voice.md`
- `packages/agency/scripts/check-public-copy.mjs`
- `scripts/prose-quality/evals/target-reader.v1.json`
- Adapted clear-writing principles from [`softaworks/agent-toolkit`](https://github.com/softaworks/agent-toolkit), MIT licensed; the repository does not vendor its large reference prompt.

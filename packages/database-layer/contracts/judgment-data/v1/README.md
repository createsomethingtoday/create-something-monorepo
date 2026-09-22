# Judgment data v1 — exception-review foundation

Status: offline preparatory contract, CRE-2061. No production caller, provider
activation, calibration or business-effectiveness claim. The example is synthetic.

## Ownership

Database Layer owns frozen evidence, constraint/question definitions and receipts.
Automation supplies pre-decision source excerpts and calls the selected provider.
Judgment policy owns scope, applicability, deterministic facts, thresholds and
human review. Every result is advisory. `prerequisites_supported` is not approval,
waiver, release permission or a substitute for the owning reviewer.

The Node-only `@create-something/database-layer/judgment-data` subpath exports
TypeScript declarations and runtime validation. It is deliberately separate from
the browser-facing root export. No new provider client is introduced: CRE-2022 /
PR 1687 owns shared Jev integration; CRE-2060 owns a separate URL-classification
pilot. This module is the evidence/receipt seam those adapters can consume after
review. Nothing here sends requests to Jev or writes business-system records.

## Record boundary

- `JudgmentInput`: schema version, case ID, creator/app split group, evidence cutoff
  and certification, source identity/reference/capture time/text, policy ID/version,
  complete/incomplete scope and mandatory human-review flag.
- Each constraint records applicability, exact evidence IDs and either a known
  deterministic result or a versioned semantic question and threshold. Known facts
  never get overwritten by model answers. Unknown applicability stays unknown.
- `prepareJudgment`: an explicit projection containing only applicable semantic
  questions and their referenced evidence. Mandatory review and incomplete scope
  skip inference. Unrelated unknown predicates do not block the applicable branch.
- `JudgmentReceipt`: complete answers, served model/provider/request ID, completion
  time, latency, provider availability, exact input/request digests, deterministic
  composition, reasons and advisory authority. Provider failure is distinct from a
  negative or unknown judgment. Zero-question skips have no provider attribution.
- `JudgmentReview`: stored separately from inference input, with exact input digest,
  independent reviewer attribution, review timestamp, development/held-out split
  and label. The gate rejects synthetic/reconstructed evidence and group leakage.

The answer probability means probability assigned to the selected yes/no answer,
not a universal confidence field. A Jev Noul adapter must convert p(yes) to p(no)
when returning no. An unknown answer never satisfies a prerequisite. Choice/Score
adapters require separately specified mappings and validation; they cannot pass
arbitrary model output into this contract.

## Integrity and limitations

SHA-256 covers canonical JSON payloads, including source text, questions and policy.
Replay uses stored provider responses and makes no inference calls. It reproduces
policy composition, not model generation. Hashes detect changed content relative
to a retained digest; they are not signatures or independent proof of provenance.
Keep receipt references in the owning durable system. An attacker who can replace
both artifact and trusted digest is outside this local integrity boundary.

The CLI writes content-addressed files with mode 0600 using fsync and an atomic
no-overwrite link. Repeating an identical write is idempotent. Conflicting existing
content fails; it is never replaced. Newly created directories use mode 0700.
A process crash can leave a `.pending-*` file, never a partial published artifact.
Existing directory permissions and external edits remain the operator's concern.
Production storage, retention, tenant isolation, authenticated attestations and
access control remain the owning application's responsibility.

Certification/independence fields are declarations checked structurally; setting
strings does not certify data. The reviewer intake process must authenticate them.
Exact allowed fields block accidental label columns, but free-text excerpts can
still contain later decisions. A human/source audit must exclude those passages.
Timestamp validation checks consistency, not historical authenticity. A current
source fetch cannot be backdated into original pre-decision evidence.

## Verbatim local smoke

From the repository root after `pnpm bootstrap:worktree`:

```bash
pnpm --filter @create-something/database-layer judgment:test
```

This builds the library and executes API and fresh-process CLI tests with temporary
synthetic files. It verifies successful reconstruction, repeatability, integrity
failures, abstention paths and evaluation eligibility. It does not call paid APIs.

CLI operations (paths are supplied as command arguments):

```text
judgment-replay.mjs snapshot input.json directory
judgment-replay.mjs request snapshot.json
judgment-replay.mjs record snapshot.json response.json directory
judgment-replay.mjs replay snapshot.json receipt.json
judgment-replay.mjs check-evaluation snapshots.json reviews.json
```

`record` consumes a JSON object with exactly `answers`, `provider`, `providerStatus`.
`check-evaluation` consumes arrays of sealed inputs and separate review records.
Every operation rejects malformed input with a nonzero exit code. A passing
eligibility check still returns `effectiveness: not_established`.

## Required reviewer intake before the business pilot

Owner: Micah and the App Review policy owner. This is the outstanding input, not
an outreach message or a request to approve synthetic results.

1. Resolve the three record/document identity conflicts documented in CRE-2057.
2. Supply exact source artifacts known before each decision, with source IDs,
   capture timestamps and an authenticated certification of the evidence cutoff.
   The old temporary CRE-2055 worktree is missing; Linear summaries cannot replace
   its original bytes or receipts. Recover those artifacts from a verified backup
   if needed, or collect new cases and explicitly identify them as new evidence.
3. Verify finding scope, applicable policy branch, mandatory escalations and known
   facts. Do not infer absence of unrelated findings from a short excerpt.
4. Attribute independent prerequisite labels to reviewers who have not seen the
   candidate response. Preserve final approval/waiver decisions as separate
   business outcomes; those do not establish whether prerequisites were met.
5. Group related creator/apps and duplicate findings in the same split. Freeze
   development/held-out assignment, questions, policy and operating thresholds
   before viewing held-out outputs. Include both supported and review-required
   cases; the appropriate sample size must follow the business risk.
6. Freeze acceptance criteria for unsupported support recommendations, missed
   mandatory escalations, useful coverage, latency/cost and actual review time.
   Compare the production baseline and candidate on identical inputs. Label any
   weak rules-only baseline explicitly. Report all cases, errors and exclusions.

No scope expansion or promotion follows merely from passing the structural gate.
Production caller integration, fallback, authorization and rollback require the
owning workflow's verification. Datasette is optional future inspection work.

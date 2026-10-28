---
name: candidates-reviewed
kind: responsibility
version: 0.1.0
id: 01M58TB159C61MMQWD47SJ3Q5Z
---

# Candidates Reviewed

> Judgment tier of the daily work log. An evaluator that did not produce the
> candidates confirms, downgrades, or holds each one before delivery can see
> it. Added after the first run on 2026-10-19 answered "who evaluated the
> semantic postconditions" with "the render itself". Derived from
> `docs/guides/DAILY_WORK_LOG_RUNBOOK.md` §3 and §4.

### Goal

Every candidate that reaches delivery has had its identity, disposition, and
proof level checked by a render that did not produce it, against full session
text and accessible artifacts, and no candidate is lost in review.

### Requires

- `candidates`: the discovery candidate set with dispositions and proof
  levels. *(Maintained by `completed-work-discovered`, facet `candidates`.)*

### Maintains

The reviewed projection that delivery subscribes to.

**Type**:

- `reviewed_candidates`: list of `{ identity, workstream, outcome,
  proof_level, disposition, checkpoint_date, parent_task_id, review }` where
  `review` is `{ status, reason, checked }` and `status` is one of
  `confirmed`, `downgraded`, `held`.
- `review_findings`: `{ reviewed_at, run, confirmed, downgraded, held,
  exclusions_sampled, exclusion_errors }`.

**Canonicalization spec**: identity, disposition, proof level, and review
status are material. `reviewed_at`, reasons, and the `checked` list are
immaterial. Candidates are ordered by identity before hashing.

#### reviewed_candidates

Material: the set of identities and each one's `disposition`, `proof_level`,
and `review.status`.

#### review_findings

Material: the `confirmed`, `downgraded`, `held`, and `exclusion_errors`
counts.

**Postconditions**:

- Every input candidate appears exactly once in `reviewed_candidates`. A
  rejected claim is `held` with disposition `pending`, never removed.
- No proof level is higher than the level discovery claimed.
- A `confirmed` or `downgraded` review names what was checked: full session
  text, the ledger, or an artifact. Excerpts alone never confirm a proof level
  above `authored`.
- A sample of sessions discovery excluded is re-read in full. Errors are
  counted in `exclusion_errors`, and the affected work returns as `held`
  candidates with disposition `pending`.

### Continuity

- **input-driven**: a new `completed-work-discovered` receipt whose
  `candidates` facet fingerprint moved.

### Tools

- `cli:ctx`: full session text by reference
- `cli:gh`: read-only pull request state

### Invariants

- The review render is never the render that produced the candidates. The
  same model family is allowed; the same session is not.
- Full session text is read before any candidate is downgraded or held.
- The ledger is read by reference and never written. Nothing is sent.
- Secrets, contacts, private paths, and transcripts stay in the private
  workspace and never enter the published truth.

### Shape

- `self`: read the candidates by reference, verify each one, sample the
  exclusions, publish the reviewed set.
- `delegates`: none
- `prohibited`: sending to Slack; writing the ledger; raising a proof level;
  dropping a candidate; re-running discovery.

### Execution

```prose
let verified = candidates
  | map:
      return session "Read this candidate's sessions in full with ctx show session. Check the identity against the ledger by reference and, when a pull request or issue URL is present, its read-only state. Confirm, downgrade the proof level to what the evidence supports, or hold as pending with the reason. Never raise a proof level."
        context: item

let sampled = session "Pick at most ten sessions discovery excluded as no completion evidence or synthetic, from the run's dispositions by reference. Read each in full. Append any that evidence completed work to the verified list as held candidates with disposition pending. Return the full reviewed list ordered by identity and the findings counts."
  context: { verified, candidates }

return {
  reviewed_candidates: sampled.reviewed_candidates
  review_findings: sampled.findings
}
```

### Strategies

- when a session's full text is unavailable: hold the candidate as pending
  with the reason; do not confirm from the excerpt.
- when an artifact check is denied or rate limited: keep the narrower proof
  level the session text supports and record the denial.

### Runtime

- `persist`: project

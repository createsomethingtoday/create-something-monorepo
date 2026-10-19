---
name: review-verdict-staged
kind: responsibility
version: 0.1.0
id: 01M58T5M4XBR7HKVFN3V9WJKNX
---

# Review Verdict Staged

> Judgment tier, staged for a human. Turns each evidence bundle into a
> recommended verdict and creator-ready draft, saves the internal Agent Review
> Feedback, and writes one numbered digest the reviewer signs off on. Nothing
> here approves, rejects, requests changes, or posts to a creator.

### Goal

Every reviewed version has a staged verdict the reviewer can accept with one
line, and the digest says plainly which verdicts are approve-ready, which
need changes, and which need a human look.

### Requires

- `evidence`: per-version evidence bundles.
  *(Maintained by `review-evidence-collected`.)*
- `queue`: for template names, rounds, skip reasons, and ticket ids.
  *(Maintained by `review-queue-loaded`.)*

### Maintains

**Type**:

- `verdicts`: list of `{ n, version_id, template_name, round, lean,
  confidence, blocking, recommended, withdrawn, draft_feedback,
  checklist_items, gallery_url, agent_feedback_saved }` where `lean` is one
  of `approve`, `request_changes`, `needs_human`, `skipped` and `n` is the
  digest number.
- `digest_path`: `.agents/prose/state/template-review/digest-<YYYY-MM-DD-HHMM>.md`.

**Canonicalization spec**: each verdict's `version_id`, `lean`, and the set
of `blocking` items are material. Draft wording, confidence, and paths are
immaterial.

**Postconditions**:

- `lean: approve` only when no finding is `open` and blocking, every
  Designer item for this round was checked, and the evidence covers each
  hard requirement in `template_review_get_comprehensive_review_contract`.
- `lean: needs_human` when evidence is `Partial` on a blocking item, the
  Designer pass failed, the collector errored, or the call is a policy
  judgment (exceptions, ecommerce pricing, an unlisted third-party script).
- Each `draft_feedback` passed `template_review_format_agent_review_feedback`
  and follows the field rules: one intro sentence, BLOCKING and RECOMMENDED
  labels with a blank line before each label only, numbered items on
  consecutive lines, no greeting or sign-off, no backticks, no literal
  asterisks, no cross-references to item numbers. It explicitly withdraws
  earlier asks that `screen-false-positives` withdrew.
- The packet sent to `template_review_format_agent_review_feedback` lists
  every manual-check topic the formatter requires (components, variables,
  interactions, style selectors, audits) with its result, or `Manual: not
  checked this round` when the Designer pass did not cover it.
- Agent Review Feedback is saved with `template_review_save_agent_feedback`
  and holds the coverage matrix, Auto/Partial/Manual labels, and evidence
  references.
- `checklist_items` lists only the review checklist items the evidence
  verified.
- The digest lists every queued version, skipped ones included with their
  reason, and ends with the sign-off syntax.

### Continuity

- **input-driven**: the `evidence` fingerprint moved.

### Tools

- `mcp:claude_ai_Template_Review_MCP`: `template_review_get_comprehensive_review_contract`,
  `template_review_get_checklists`, `template_review_format_agent_review_feedback`,
  `template_review_save_agent_feedback`
- `cli:osascript`: a local notification when the digest is written

### Invariants

- The only write is `template_review_save_agent_feedback`, the internal
  field. `template_review_save_draft_feedback` is never called here because it
  writes the creator-facing 📝Review Feedback field.
- `state/template-review/verdicts.json` is updated with each version's
  `last_published` and `status`, so the next run skips unchanged versions.
- The digest contains no creator email addresses and no secrets.

### Shape

- `self`: judge, draft, validate draft, save internal feedback, write digest,
  notify.
- `prohibited`: approve, reject, request changes, set review status, set
  checklist items, Admin create or complete, ticket follow-ups, ticket status
  changes, featured flags, Slack or email sends.

### Execution

```prose
agent judge:
  model: sonnet
  prompt: "You stage template review verdicts. Apply the comprehensive review contract to the evidence bundle. You recommend; a human decides."
  shape:
    self: ["judge evidence", "draft creator feedback", "save agent feedback"]
    prohibited: ["approve", "reject", "request changes", "status writes", "ticket writes", "save_draft_feedback"]

let contract = session "Call template_review_get_comprehensive_review_contract and template_review_get_checklists once. Return the hard requirements, required sections, and checklist item ids."
  context: []

let staged = []
for bundle, i in evidence:
  let verdict = session: judge
    prompt: "Stage a verdict for this version per the postconditions. Draft creator feedback only when lean is request_changes. Validate the draft with template_review_format_agent_review_feedback and fix it until it passes. Then save the internal report with template_review_save_agent_feedback."
    context: { bundle, contract, queue }
  staged = staged with verdict

let digest = session "Write the digest to .agents/prose/state/template-review/digest-<run time>.md. Number versions from 1. Group: approve-ready, request changes, needs human, skipped. For each: template name, round, lean, one-line reason, blocking items, gallery link. End with the sign-off syntax from apply-reviewer-decisions. Update state/template-review/verdicts.json. Post a local notification with osascript naming the digest counts."
  context: { staged, queue }

return {
  verdicts: staged
  digest_path: digest.path
}
```

### Runtime

- `persist`: project

---
name: review-queue-loaded
kind: responsibility
version: 0.1.0
id: 01M58T5M4VA7EAF67KTXND1BH3
---

# Review Queue Loaded

> Database tier. Keeps the set of the reviewer's own template versions that
> need a verdict, with the context each later step needs, and skips versions
> that have not changed since their last staged verdict. Scope is
> `template_review_my_queue` only, so the program never takes work from another
> reviewer and never needs an assignment write.

### Goal

Every version assigned to the reviewer in Ready for Review or Response to
Review is listed once, with its review context, prior creator thread, and the
items a re-review must recheck.

### Requires

- `run_request`: start time, mode, targeted version ids, and the version cap.
  *(Maintained by the `template-review-tick` gateway.)*

### Maintains

**Type**:

- `queue`: list of `{ version_id, asset_id, template_name, status, round,
  published_url, preview_url, ticket_id, capabilities, last_published,
  prior_cited_items, needs_designer_pass, skip_reason }` where `status` is
  one of `ready_for_review`, `response_to_review` and `skip_reason` is null,
  `unchanged_since_last_verdict`, `not_republished`, or `missing_published_url`.

**Canonicalization spec**: the set of version ids with their `status`,
`last_published`, and `skip_reason` is material. Ticket text and raw MCP
payloads are immaterial. Ordered by version id.

**Postconditions**:

- `capabilities` comes from `template_review_get_review_context`, called for
  every listed version.
- For `response_to_review`, `prior_cited_items` lists each numbered item from
  the last Changes Requested feedback and from the ticket thread, and the
  creator's reply to each, when there is one.
- Each listed version carries `prior_sessions`: the ctx hits for its
  template name and version id (`ctx search "<name> <version_id>" --since
  90d`), so a re-review sees what earlier agent sessions decided, accepted,
  or withdrew, not only what the ticket thread shows.
- `last_published` is read from the `<!-- Last Published: ... -->` comment in
  the published home page head. If it is not newer than the last Changes
  Requested date, `skip_reason` is `not_republished`.
- A version whose `last_published` and status match the previous run's staged
  verdict in `state/template-review/verdicts.json` gets `skip_reason:
  unchanged_since_last_verdict`.
- `needs_designer_pass` is true on a first review, and true on a re-review
  only when a cited item is a Designer-only check (components, variables and
  modes, interactions, style selectors, audits).

### Continuity

- **input-driven**: a new `template-review-tick` receipt whose `run_request`
  fingerprint moved.

### Tools

- `cli:ctx`: `ctx search` over indexed Claude Code and Codex sessions
- `mcp:claude_ai_Template_Review_MCP`: `template_review_workflow`,
  `template_review_my_queue`, `template_review_list_queue` (through
  `claim-new-submissions`), `template_review_get_version`,
  `template_review_get_asset`, `template_review_get_review_context`,
  `template_review_get_ticket_thread`

### Invariants

- Read-only, except `claim-new-submissions`, which runs only when
  `run_request.pickup_new > 0` and makes the assignment write itself. No
  status or metadata writes.
- Status comes from `latestReviewStatus`. `📤Changes Requested` versions wait
  on the creator and are not listed.
- The queue is capped at `run_request.max_versions`; the oldest versions are
  listed first.
- Raw MCP payloads go to the run directory, not into the maintained truth.

### Shape

- `self`: list, read context, read thread, read the published stamp, diff
  against prior verdicts.
- `delegates`:
  - `claim-new-submissions`: pick up N unassigned New versions on request
- `prohibited`: assigning outside `claim-new-submissions`, unassigning,
  setting status, or any other write tool.

### Execution

```prose
agent loader:
  model: haiku
  prompt: "You load template review queue context. Use only read tools. Save raw payloads under the run directory and return compact records."
  shape:
    self: ["read queue", "read context", "read ticket thread"]
    prohibited: ["any template_review write tool", "Airtable writes"]

let prior = session "Read state/template-review/verdicts.json if present. Return a map of version_id to { last_published, status, staged_at }. Return an empty map if the file is missing."
  context: []

let claimed = []
if run_request.pickup_new > 0:
  claimed = call claim-new-submissions
    count: run_request.pickup_new
    run_dir: run_dir

let listed = session: loader
  prompt: "Call template_review_my_queue with limit 100. Filter on latestReviewStatus, not normalizedStatus (normalizedStatus reports changes_requested for Response to Review too). Keep Ready for Review and 🔁Response to Review; drop 📤Changes Requested, which waits on the creator. The version id is assignableVersionId. If run_request.version_ids is not empty, keep only those. Sort oldest first and cap at run_request.max_versions."
  context: run_request

let queue = session: loader
  prompt: "For each listed and claimed version: call get_version, get_asset, get_review_context, and get_ticket_thread. Read the Last Published comment from the published home page. Extract prior cited items for re-reviews. Claimed versions are ready_for_review, round 1, needs_designer_pass true. Set skip_reason per the postconditions. Return the queue records."
  context: { listed, claimed, prior }

return { queue: queue }
```

### Runtime

- `persist`: project

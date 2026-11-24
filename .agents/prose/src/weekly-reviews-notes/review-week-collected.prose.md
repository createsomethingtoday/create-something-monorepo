---
name: review-week-collected
kind: responsibility
version: 0.1.0
---

# Review Week Collected

> Database tier of the weekly notes. Keeps a dated, sourced record of what
> happened in Marketplace review since the last meeting: queue numbers, who
> decided what, the rulings, the recurring mistakes, and the systems changes.
> Every number names the tool and field it came from.

### Goal

The review team's week is enumerated from the primary systems with per-reviewer
attribution wherever the systems support it, and every claim carries a source
the meeting can click.

### Requires

- `run_request`: the meeting date, last meeting date, window start, emphasis
  and doc id. *(Maintained by the `weekly-notes-tick` gateway.)*

### Maintains

The week's evidence. Four facets, each a list of `{ date, tag, text, source,
reviewer?, names?, ids? }` where `tag` is `reviewer` or `system`, `source` is a
Slack permalink, ticket id, record id, or tool call, and `names` are the
templates, apps or people the item is about.

**Canonicalization spec**: item text, tag, date and source are material. The
order of collection, subagent wording of the same fact, and fetch timestamps
are immaterial. Items are ordered by date then source before hashing.

#### templates

Templates, Partners and Libraries. Queue numbers from the Template Review MCP:
`get_metrics days=7` (submissions, decisions, approvals, rejections, published,
turnaround); `list_queue status=ready_to_review assigned=any` (count, oldest
submitted date, owners); `list_queue status=in_review assigned=any` (owners,
oldest); `list_queue status=published sort=decisionDate_desc limit=80
assigned=any` filtered by decision date after the window start, counted per
`reviewOwner`; `list_queue status=changes_requested limit=300` counted by
`latestReviewDate` because `decisionDate` is usually empty there. Rejections
have no list status; take the count from `get_metrics` and say it cannot be
attributed. Reviewer items come from the review-team, templates, triage,
libraries and DMCA channels and from drafted feedback on in-review versions.

#### apps

Apps. The October line "Month - Review Queue - N Submissions - N New Assets -
N Meta Updates - N Asset Updates" from `queue_stats submitted_after=<month
start>` when the App Review MCP is connected, otherwise from the Airtable
versions table tallied in Python. The exception queue as "N versions / N
undecided items" with per-app counts from `list_exception_queue`'s copy block
or the ⚖️Exceptions table. Per-reviewer decisions from the Ready-for-Review
bot threads in the apps channel ("approved by", "rejected by", "kicked off
by"); changes requests whose bot reply carries no reviewer name are counted
separately as unattributed. Rulings, pushback and repeat resubmissions from the
apps, working-group, exceptions and apps-triage channels.

#### own_work

The operator's own closures that Slack never saw: `ctx search --since 8d` and
the project memory files dated inside the window. These are the items most
likely to be reviewer-centric (rounds decided, rulings made, creator replies
sent) and most likely to be missed by a channel sweep.

#### carry_overs

Every discussion item from the previous week's section, each with one of
`resolved`, `unchanged`, `moved` and one line of evidence. Resolution is
checked against the primary system, not against Slack: a curl of the creator's
site, the automation script, the version record, the ticket thread.

**Postconditions**:

- Every queue number names its tool and field, and every number the collector
  could not verify is marked `(unverified)` with the reason (sample size,
  missing status, MCP offline).
- Every reviewer named in a per-reviewer count has at least one item in the
  facet that shows what they decided.
- No creator or developer personal email appears in any item. Names of
  templates, apps and reviewers are fine.
- Items from a private DM are paraphrased and carry no permalink.

### Continuity

- **input-driven**: a new `weekly-notes-tick` receipt whose `run_request`
  fingerprint moved.

### Tools

- `mcp:template-review`: queue, metrics and version search
- `mcp:app-review`: queue stats and exception queue, optional
- `mcp:airtable`: fallback tallies and record reads
- `mcp:slack`: channel reads, thread reads, search
- `cli:ctx`: the operator's own session history
- `mcp:zapier`: Zendesk ticket comments

### Strategies

- Run the templates sweep and the apps sweep as two independent Sonnet
  sessions with the channel lists and tool recipes spelled out; the VM keeps
  only their returned bullets.
- When the App Review MCP shows only `authenticate` tools it is not connected.
  Do not start the OAuth flow from a collector; fall back to Airtable and say
  so in the apps facet.
- When a count differs between two sources (queue_stats vs list_queue, metrics
  vs a filtered list), report both and prefer the one with per-record evidence.
- Read `latestReviewDate` with care on Response-to-Review items: it can
  postdate the feedback email. Compare Last Published with the Zendesk send
  time before calling something "waiting since".

### Invariants

- Read-only. Collection never assigns, approves, requests changes, posts or
  edits a record.
- Slack search uses `after:<last meeting date>`; a thread read uses
  `message_ts`, not `thread_ts`.
- The two collectors together stay under about 600K tokens; a sweep that
  needs more is narrowed to the channels named here, not widened.

### Shape

- `self`: brief the two collectors, run the ctx and memory pass, check the
  carry-overs against primary systems, merge and tag.
- `delegates`: two general-purpose collector sessions (templates, apps).
- `prohibited`: any write; reading channels outside the list without the
  operator's say; quoting DMs verbatim.

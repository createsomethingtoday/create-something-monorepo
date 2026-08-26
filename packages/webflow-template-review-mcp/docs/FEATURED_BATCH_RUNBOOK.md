# Featured Batch Runbook

The monthly Featured Templates selection, end to end, from the Template Review
MCP. A reviewer working with an agent can complete every step that used to
require the Airtable interface page; the coordinator finalizes the batch; the
notification and CMS steps behave exactly as documented here.

**Outcome**: ~7 templates marked featured for the upcoming month, each with a
buyer-safe Pick Reason, creators notified once, and the marketplace CMS
showing the new batch.

Verified against the live base 2026-08-26. Base `appMoIgXMTTTNIc3p`.

---

## The pipeline in one view

```
👛Assets fields                    MCP tools                          Downstream
─────────────────                  ─────────────────────────────      ─────────────────────────
eligibility formula        ─────►  featured_candidates (read)
⭐Reviewer pick + Reason    ◄─────  set_featured_pick (write)
🗳️Reviewer Votes           ◄─────  cast_featured_vote (write)
ℹ️Is Featured?             ◄─────  set_featured_flag (coordinator)  ─► marketplace-featured-notifier
                                                                        worker (hourly cron :17) →
                                                                        Knock bell + Postmark email
                                                                     ─► manual CMS backfill (Whalesync
                                                                        does NOT sync featured fields)
```

## Who does what

| Role | Tools | Gate |
|---|---|---|
| Any mapped reviewer | `featured_candidates`, `set_featured_pick`, `cast_featured_vote` | `template-review:write` scope |
| Featured coordinator | `set_featured_flag` | reviewer-directory entry must grant `featuredCoordinator: true` (403 otherwise) |

The coordinator grant lives in the worker's `REVIEWER_DIRECTORY_JSON` secret —
add `"featuredCoordinator": true` to the coordinator's entry and redeploy.
Deny-by-default: with no grants, nobody can finalize through the MCP.

## Candidate definition (what `featured_candidates` returns)

Mirrors the "Remaining templates eligible" stat on the ⭐Featured templates
review interface, verified live 2026-08-26 (39 templates / 33 creators):

- Type = Template
- `Is eligible for upcoming featured templates?` = 1 (🥇Exceptional quality +
  the re-feature cap)
- `ℹ️Is Featured?` unchecked (pass `include_already_featured: true` to see
  checked ones)
- Submitted within the current month (`months_back: 0`) or up to `months_back`
  rolling months earlier (default 1 — current + past month)

Prioritize `monthsSinceSubmission: 0`; the past month is the fallback pool.
Each candidate carries pick/reason/draft state, template `categories`,
creator name, creator-times-featured, templates the creator already has in
the upcoming batch, and read-only `voteTallies`
(up/down/net/`inQualifiedPool`) — enough to judge batch readiness without
writing anything. The summary's `categoryCounts` shows the pool's category
distribution: the team deliberately spotlights a range of categories per
batch and avoids over-featuring the same creators, so weigh both when
picking.

## Reviewer playbook (the async "Featured Template meeting")

1. `template_review_featured_candidates` — get the pool.
2. Open each candidate's `websiteUrl` (the live `*.webflow.io` site) and judge
   the actual design. Do not judge from the marketplace listing metadata.
3. For each pick (house norm: 7 per reviewer):
   `template_review_set_featured_pick` with `reviewer_pick: true` and the
   reason drafted into **`pick_reason_draft`** — never straight to live.
4. Read the exact draft text yourself. A good reason answers: what makes it
   stand out among Exceptional templates, who it especially serves, and the
   specific quality signal. Third-person marketplace prose, ~350–450 chars.
5. Promote: resend `set_featured_pick` with `pick_reason` +
   `confirm_creator_safe: true`.
6. `template_review_cast_featured_vote` (up/down/comment) on other reviewers'
   picks. Recasting updates your vote — tallies never double-count. Put candid
   rationale in `note`; it is internal-only.

## Coordinator playbook (finalization)

1. `featured_candidates` — confirm every intended winner has
   `reviewerPick: true`, a non-empty `reviewerPickReason`, and settled
   `voteTallies` (`inQualifiedPool` requires ≥1 up vote and no down-vote
   majority).
2. Per winner: `template_review_set_featured_flag` with `is_featured: true`
   and `confirm_creator_notification: true`. The result reports
   `featuredPeriod` — expect the first of **next** month. Selection checks
   (star set, eligibility formula, qualified votes) run before the write and
   reject with `SELECTION_CHECKS_UNMET`; if featuring an item that fails them
   is a deliberate decision, resubmit with `override_selection_checks: true`
   — the result then records exactly which checks were overridden.
3. **What you just armed**: the `marketplace-featured-notifier` worker
   (CREATE SOMETHING Cloudflare account, cron `:17` past each hour) sends each
   creator a bell + email **quoting the live Pick Reason verbatim** once the
   featured period is in the future and differs from
   `🔔Featured Notified For Period`. Idempotency is per-period — creators are
   not re-notified on edits within the same period.
4. **Abort path**: uncheck via `set_featured_flag` with `is_featured: false`
   before the cron fires, or set the worker's `DRY_RUN` to `"true"` and
   redeploy (immediate kill switch).
5. **Manual CMS backfill** (Whalesync does not carry these fields): on the
   Templates collection (`641b464e78789f611a5d4496`) set `featured-2` (switch),
   `featured-date` (first of the period, `T00:00:00.000Z`), and
   `reviewer-pick-reason-featured-templates` (renders publicly). Flip the
   previous batch's `featured-2` off — nothing does this automatically.
6. Data-quality pass before the period arrives: every winner needs a
   `🎨🔑Creator WF User ID` (missing → notification skipped) and a Name that
   reads correctly in an email subject line (Names are validated at
   submission and authoritative).

## Safety rules enforced in code

| Rule | Enforcement |
|---|---|
| Agent copy never lands directly in the live reason | `pick_reason` requires `confirm_creator_safe: true`; drafts go to the AI-draft staging field |
| No raw HTML in the live reason (truncates the Zendesk-parsed email) | `RAW_HTML_IN_PICK_REASON` (400) |
| No featuring without a live reason (the email quotes it) | `MISSING_PICK_REASON` (409) — rejected before any write, never overridable |
| No featuring an unstarred / ineligible / unqualified item silently | `SELECTION_CHECKS_UNMET` (409) pre-write; `override_selection_checks: true` records a deliberate exception |
| Finalization is coordinator-only | `FEATURED_COORDINATOR_REQUIRED` (403) |
| One vote per reviewer per asset | Upsert + deterministic duplicate self-heal (lowest record id wins) |
| One voting state per asset | State merge before every vote write |
| Internal shorthand leaking to creators | Style warning on "Main quality signal:" and length outside ~250–600 chars |

Vote `note` text is never surfaced by any creator-facing path — keep it that
way when building on these tools.

## Troubleshooting

| Symptom | Meaning | Fix |
|---|---|---|
| `FEATURED_COORDINATOR_REQUIRED` | Reviewer lacks the directory grant | Coordinator finalizes, or grant `featuredCoordinator` in `REVIEWER_DIRECTORY_JSON` and redeploy |
| `MISSING_PICK_REASON` | Winner has no live reason | Promote a reason via `set_featured_pick` first |
| `CREATOR_SAFE_CONFIRMATION_REQUIRED` | Live-reason write without the confirmation | Human reads the exact text, resend with `confirm_creator_safe: true` |
| `SELECTION_CHECKS_UNMET` | Star, eligibility, or qualified votes missing on a finalization target | Fix the selection state, or override deliberately (`override_selection_checks: true`) after coordinator confirmation |
| Candidate counts differ from the Airtable interface | Different windows: grid view = rolling past month only and does not exclude already-featured; the interface stat (and this tool) = months ≤ 1 + not featured | Expected; the tool matches the interface stat |
| A featured template still shows as a candidate | `include_already_featured: true` was passed, or its `Is Featured?` was unchecked | Check the flag state in the result |
| Schema drift suspected | Field renamed in Airtable | `AIRTABLE_API_KEY=… npx tsx scripts/audit-airtable-schema.ts` — covers both featured tables and all featured field names/IDs |

## History worth knowing

- `ℹ️Is Featured?` is sticky history — ~620 assets carry it from past batches.
  Never gate anything on the checkbox alone; the period formula and the
  eligibility formula are the reliable gates.
- `⭐Reviewer pick` and the Pick Reason used to be set together in the
  interface; roughly half of a batch historically had the reason but not the
  star. The reason is the content; the star is bookkeeping.
- The August 2026 batch shipped 6 AI-written reasons that replaced reviewer
  text without a re-read — the `confirm_creator_safe` gate exists so that
  cannot happen silently again.

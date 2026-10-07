# Featured Batch Runbook

The monthly Featured Templates selection, end to end, from the Template Review
MCP. A reviewer working with an agent can complete every step that used to
require the Airtable interface page; the coordinator finalizes the batch; the
notification and CMS steps behave exactly as documented here.

**Outcome**: 25 templates (one per creator) marked featured for the month, each
with a buyer-safe Pick Reason, creators notified once, and the marketplace CMS
showing the new batch. The August, September and October 2026 batches were
25, 26 and 25 templates; 7 is the per-reviewer norm, not the batch size.

Verified against the live 👛Marketplace Assets base 2026-08-26.

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
| --- | --- | --- |
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

The tool does **not** check marketplace status. Confirm every pick is
`3️⃣Published🚀` with an MRP ID before featuring it — in October 2026 two
eligible candidates were still in Response to Review, and one September
member (Vrieo) was featured while unpublished.

**A template is featured once.** Never top up from a previous batch. When
the pool has fewer distinct creators than the batch needs, widen the window
instead: Airtable query on 👛Assets with `ℹ️Is Featured?` unchecked,
`🚀Marketplace Status` = Published, quality lookup = 🥇Exceptional, Type =
Template, published within ~180 days. The eligibility formula also prefers
recent submissions, so `set_featured_pick` will warn `not_currently_eligible`
on older picks; that warning is expected for a deliberate wider pull. Each
older pick still needs a full site review — in October 2026 the wider pool
had a higher defect rate (dead CTAs, wrong buy links, leftover identities
from other templates, off-marketplace store links) than the recent one.

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

## Counting the batch

`featured_candidates` hides templates that are already featured, so it cannot
tell you how big a batch is. Count membership in Airtable:
`ℹ️Is Featured?` = checked AND `📅Is Featured Period` = the batch month
(exactDate filter), and read `totalRecordCount` rather than counting a page.

## Coordinator playbook (finalization)

1. `featured_candidates` — confirm every intended winner has
   `reviewerPick: true`, a non-empty `reviewerPickReason`, and settled
   `voteTallies` (`inQualifiedPool` requires ≥1 up vote and no down-vote
   majority).
2. Per winner: `template_review_set_featured_flag` with `is_featured: true`
   and `confirm_creator_notification: true`. The result reports
   `featuredPeriod` — expect the first of **next** month.

   **Current-month batch** (selected after the 1st, for this month): write
   `📅Is Featured Period (Override)` = the 1st of this
   month on every winner **before** ticking `ℹ️Is Featured?`. Tick first and
   the period resolves to next month, and the hourly notifier will email
   creators that they are featured *next* month. `set_featured_flag` cannot
   write the override, so do both writes directly in Airtable. Carry-overs
   that are already ticked only need the override. Selection checks
   (star set, eligibility formula, qualified votes) run before the write and
   reject with `SELECTION_CHECKS_UNMET`; if featuring an item that fails them
   is a deliberate decision, resubmit with `override_selection_checks: true`
   — the result then records exactly which checks were overridden.
3. **What you just armed**: the `marketplace-featured-notifier` worker
   (CREATE SOMETHING Cloudflare account, cron `:17` past each hour; source on
   branch `feat/marketplace-featured-notifier`, not yet on `main`) sends each
   creator a bell + email **quoting the live Pick Reason verbatim** once the
   featured period is in the future and differs from
   `🔔Featured Notified For Period`. Idempotency is per-period — creators are
   not re-notified on edits within the same period.

   The cron never sends for a current-month period, and anything added to a
   batch after its 1st is never notified (4 September 2026 additions missed
   their email this way). For a current-month batch, preview then send with
   the admin token: `GET /preview?period=YYYY-MM-01`, then
   `POST /run?period=YYYY-MM-01`. Only the current UTC month is accepted.
   Winners without a `🎨🔑Creator WF User ID` are skipped and reported.
4. **Abort path**: uncheck via `set_featured_flag` with `is_featured: false`
   before the cron fires, or set the worker's `DRY_RUN` to `"true"` and
   redeploy (immediate kill switch).
5. **CMS**: as of 2026-10-01 Whalesync carries the new batch on its own.
   Within about 5 minutes of the Airtable writes, all 25 October items had
   `featured-2` on, `featured-date` = the period and the live reason (plus a
   renamed template's new name), published. Verify rather than write: read
   `/items/{id}/live` on the Templates collection (`641b464e78789f611a5d4496`).
   Nothing turns the **previous** batch off. Switch each old item's
   `featured-2` off with a `PATCH …/items/live` (leave `featured-date` as
   history). The live endpoint returns 409 for an item that was never
   published; skip those. Any CMS write resets the listing's visible
   "Published on" date to today. Whether Whalesync will later re-push an old
   batch's switch back on is unverified; recheck after the next batch.
6. Data-quality pass before the period arrives: every winner needs a
   `🎨🔑Creator WF User ID` (missing → notification skipped) and a Name that
   reads correctly in an email subject line (Names are validated at
   submission and authoritative).

## Safety rules enforced in code

| Rule | Enforcement |
| --- | --- |
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
| --- | --- | --- |
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
- The September 2026 batch was never backfilled to the CMS, so the homepage
  showed August's picks all of September. Check the CMS on the 1st.
- `📅LMT Is Featured?` only tracks the `ℹ️Is Featured?` checkbox, so a
  period moves only when someone unticks and reticks it (Xodex moved
  from August to September that way).
- The style check catches "Main quality signal:" but not its variants
  ("Its strongest signal is…", "Its strongest feature is…"). Read for those.
- October 2026 initially re-featured seven September templates (misread of
  "previously selected"). Reverting took an override clear, a live CMS PATCH
  back to the September date, and a correction email to seven creators via
  Zendesk. The emails are the part you cannot undo: confirm the never-featured
  rule on every pick before `set_featured_flag` or the notifier run.

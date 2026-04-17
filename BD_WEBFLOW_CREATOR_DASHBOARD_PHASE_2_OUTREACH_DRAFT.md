## Phase 2 Outreach Draft

Date: `2026-04-16`
Status: `Draft — review, edit, send`
Paired with: `BD_WEBFLOW_CREATOR_DASHBOARD_PORT_2026-04-16.md`, `BD_WEBFLOW_CREATOR_DASHBOARD_PHASE_2_BRIEFS.md`

Three ready-to-use messages for starting the Phase 2 product conversation. Edit names, dates, and links before sending. Each is calibrated for a different audience and surface.

---

## Message 1: Slack DM to Marketplace PM (first contact)

> Hey — we've closed most of the creator-dashboard parity gap between the external SvelteKit dashboard (`packages/webflow-dashboard`) and bd-webflow. Phase 1 shipped: submission quota, app version history UI, and analytics primitives (sparklines, donuts, animated counters). Everything's staged in the working tree, ready for your team's PR review.
>
> Three Phase 2 items need product calls before I write any more code:
>
> 1. **Creator-side template image uploads** — apps already handle this natively; templates are admin-only today. Should creators self-edit thumbnails/carousel post-approval?
> 2. **Per-asset time-series for templates and libraries** — apps have `AppMetricOverTimeGraph`; templates/libraries don't. Engineering question: is the event data captured? If yes this is a ~1 week reuse job.
> 3. **Cross-asset competitive leaderboard** — net-new, and the strategic call: should we expose "your competitors' install counts" to creators?
>
> Plus a smaller fourth question: **template versioning** — apps have draft history, compare, rollback; templates mutate in place. Does Marketplace want creators to produce versioned template drafts?
>
> Brief for each item is in `BD_WEBFLOW_CREATOR_DASHBOARD_PHASE_2_BRIEFS.md` (in the external `create-something-monorepo` repo). Each has the decision needed, scope if yes, alternative if no, and open questions.
>
> Can we grab 45 min this week? I'd target: 10 min for uploads, 15 min for time-series/leaderboard, 15 min for versioning, 5 min for the feedback-button channel question.

### Variations

- **If you want a more transactional tone**: drop the first paragraph, lead with "Three product calls block Phase 2 of the creator dashboard port. Can we meet 45 min?" and link the brief doc.
- **If Marketplace has declined competitive-data questions before**: preface (3) with "Putting this on the table to confirm the answer is still no — happy to skip it."

---

## Message 2: Email to Marketplace PM + Moderation lead (calendar invite draft)

> **Subject**: Creator Dashboard Phase 2 — product decisions needed (45 min)
>
> **Attendees**: Marketplace PM, Moderation lead, Engineering
>
> **Context**: Phase 1 of the creator-dashboard parity port is complete (SubmissionTracker, app version history UI, analytics primitives). Full status in `BD_WEBFLOW_CREATOR_DASHBOARD_PORT_2026-04-16.md`.
>
> **Goal**: Decisions on three Phase 2 items so engineering can resume. Briefs in `BD_WEBFLOW_CREATOR_DASHBOARD_PHASE_2_BRIEFS.md`.
>
> **Agenda**
>
> - (10 min) **Multi-image upload, template-only** — should creators self-edit template thumbnails/carousel without an admin action? Key question: what happens to a live approved template when the creator swaps the thumbnail — auto-delisted, live-with-pending-review, or rejected?
> - (15 min) **Per-asset time-series + competitive leaderboard** — two separate calls. (a) Is install event data already captured for templates and libraries? (b) Do we expose a cross-creator leaderboard at all?
> - (15 min) **Template versioning** — adopt the app versioning pattern for templates (drafts, compare, rollback), or keep in-place mutation via admin routes?
> - (5 min) **Feedback button channel** — which system should receive creator feedback from the dashboard (Typeform, Airtable, Slack webhook, other)?
>
> **Output**: per item — `decision` (yes/no/defer), `owner` (eng PM + product PM), `target ship week`, `follow-up ticket`.
>
> Phase 2 engineering starts within 24h of each decision.

---

## Message 3: Short GitHub PR description paragraph (if you're opening a tracking PR/issue in bd-webflow)

> Phase 1 of the creator-dashboard parity port (`packages/webflow-dashboard` → bd-webflow) is staged in the working tree and ready for review as four independent PRs:
>
> 1. `CreatorSubmissionQuota` — server route + logic + client card + tests
> 2. App version history UI — `AppVersionHistoryTimeline` inside CreatorDashboard DetailPage
> 3. Analytics primitives — `Sparkline`, `DonutChart`, `KineticNumber` + integration in AnalyticsPage and SubmissionsPage
> 4. App DetailPage deep-links — "View full analytics" + "Manage versions" routing into existing AppAnalytics + AppDevelopment surfaces
>
> Three Phase 2 items are blocked on product decisions (creator-side template uploads, cross-asset/competitive analytics, template versioning). Briefs: `BD_WEBFLOW_CREATOR_DASHBOARD_PHASE_2_BRIEFS.md` in `createsomethingtoday/create-something-monorepo`.

---

## One-liner Slack status, if asked

> Creator-dashboard parity: Phase 1 staged (4 PRs' worth), Phase 2 blocked on three product calls — template uploads, time-series/leaderboard, template versioning. Briefs linked above.

---

## Suggested follow-up timing

- **Within 24h of sending**: confirm who owns the meeting
- **Within 1 week**: hold the 45-min session
- **Within 48h of the session**: Beads/Jira tickets for every `yes` decision, with the target ship week from the meeting

# GiGi assistance and notifications: lift review

Review date: 2026-10-30. Scope: implementation assessment, not a product implementation or release. Existing customization edits were read, not modified.

GiGi should notice relevant work, explain why it matters, offer a concrete next step, and report the verified result. The first release should work while the desktop app is running. Operation after quitting the app is a separate lifecycle project.

## Acceptance criteria for the proposed implementation

1. A user can open a source-linked attention item, understand why it appeared, and ask GiGi for relevant help without reconstructing the context.
2. GiGi distinguishes reading, responding, waiting for approval, verified completion, failure, and uncertain outcome. Progress language describes observed state; it does not invent a plan or percentage.
3. Closing chat does not hide a pending approval or completion. Items remain available across restart; stale items are revalidated before action.
4. Every mutation retains exact approval, fresh-record validation and verified readback. Dismissing or clicking an alert cannot approve a write.
5. Notifications are opt-in. Permission denial leaves the in-app feed usable. Quiet hours, snooze, deduplication and privacy-safe previews apply. Record completion or deletion invalidates an obsolete reminder.
6. Clicking a notification opens the correct workspace and item, then rechecks its state. Restart/reconnect cannot replay an edit or emit a burst of stale alerts.
7. Keyboard access, focus restoration, screen-reader announcements, reduced motion, narrow windows, and all three current themes are directly reviewed.

## Current foundation and gaps

- `web/chat.mjs` already displays messages, status, exact approval cards, verified-edit receipts and record links. Messages are escaped plain text. Add a small validated response schema for summaries, source references and permitted action buttons; retain plain-text fallback. Do not render model HTML or dispatch arbitrary tool names from model output.
- `web/chat.mjs` stops polling on close and caps polling at 120 one-second polls. A workspace-owned observer is needed independently of drawer visibility. Do not make the drawer's timer an always-on agent.
- `packages/gigi-integrations/src/codex.ts` restricts embedded access to reads and held existing-record saves. Creation and relation changes would expand authority and need their own approval/recovery design.
- `web/app.mjs` already has workspace Overview queries. Begin with deterministic signals from current SQLite records: unfinished dated tasks, upcoming dated work, pending decisions and verified completions. Missing dates or money inputs must not become inferred urgency.
- The inspected Tauri builder, Cargo dependencies and configuration have no native notification delivery path, permission handling or durable delivery ledger.
- Current customization is presentation-only, stored in workspace-keyed localStorage. Preserve its theme roles; keep operational assistance policy and delivery state in the database rather than extending appearance JSON with agent authority.

Database owns attention items, source identity/revision, unread/snooze state, preferences and delivery receipts. Automation computes eligible signals, observes sessions and delivers alerts. Judgment owns interruption eligibility, quiet hours and approval requirements. Store an event identity and revision for deduplication; design crash recovery so an uncertain delivery does not cause repeated alerts. An OS notification request is not proof that the person saw it.

## Product direction

Add a compact **Needs your attention** section to Overview and a persistent unread entry near Ask GiGi. Each row contains a concrete observation, its source/date, and one primary action. Keep the existing navigation and themes.

Example, only when supported by the record: **Rehearsal is tomorrow. The location field is empty.** Actions: **Review rehearsal** and **Ask GiGi**. A pending edit says **Review proposed changes**; a verified completion says **Saved and checked**. Do not say a task was completed merely because a model turn ended.

Start with contextual help, structured answers and a durable feed. Deliver optional macOS alerts from that same feed. Foreground work should usually use in-app feedback; interrupt outside the app only for eligible decisions and configured reminders. Notification text defaults to a generic private-workspace message; detailed previews require an explicit preference.

“Share notifications” is interpreted here as GiGi notifying its local user. Sending to teammates, email, Slack or phones is outside this estimate and requires recipients, delivery authority and transport design. No external message was sent in this review.

## TASTE evidence and translation

Retrieved read-only from `https://createsomething.ltd/api/taste/context?intent=layout&include=references&limit=7` and the minimalism packet with limit 20. Three actual still images were downloaded and visually inspected. No motion evidence was inspected.

| Reference | Why / adopt or adapt | Avoid | Source |
| --- | --- | --- | --- |
| Alex Burdin charging UI | Adapt: one prominent observed state, readable supporting facts, clear separation. Use explicit agent state and nearby evidence. | Giant speculative progress indicators; arbitrary percentages; external typography. | https://www.are.na/block/40249020 |
| Table item style | Adapt: evidence rows beside a clearly separated decision. Use record facts above approval actions. | Oversized circular controls, copied layout and investment semantics. | https://www.are.na/block/36795688 |
| Design Tools Survey screenshot | Adapt narrowly: stable navigation, restrained type hierarchy, one emphasized current item. | Decorative 3D charts and dense microtype; this is not notification interaction evidence. | https://www.are.na/block/39660465 |

TASTE supports composition and state hierarchy here; it does not establish notification usability. The alternative of a floating animated companion adds visibility but competes with record work and supplies no durable recovery path. Prefer the attention feed for the first implementation. Preserve Canon/Performance Lab token discipline and current GiGi Studio/Paper/Midnight roles. No new palette, mascot or navigation model is needed.

## Lift and sequence

Assuming one engineer, current companion architecture, macOS first and app-running operation:

- Contextual help, structured responses, permitted actions and truthful state treatment: approximately 3–5 engineering days.
- Persistent feed, workspace session observation, unread/dismiss/snooze/deduplication and restart handling: approximately 3–5 days.
- Opt-in native alerts, permission recovery, privacy, click routing and native acceptance: approximately 3–5 days.

Budget roughly two to three engineering weeks for that first release. These are planning estimates, not measured delivery dates, and exclude signing/distribution work. App-quit operation, unattended model runs, automatic imports and expanded write authority are a separate initiative, initially estimated at another 2–4+ weeks depending on scope. No new paid service is assumed.

## Validation and limits

The architecture reviewer ran 58 focused chat, reliability, approval and preference tests successfully. These are existing offline fixtures, not tests of the proposed feature. Implementation should add regression checks before changing close/reopen observation; verify deduplication, restart, stale source invalidation, denied permission, quiet hours, click routing and uncertain write handling with synthetic profiles. Follow with real subscribed-provider and installed native permission/delivery tests on an isolated profile.

Existing `evidence/customization/studio-desktop.png` was visually inspected as a saved baseline, not a live app verification. CTX status reported 1,318 skipped records and stale history/blame data. Targeted searches did not establish prior expressiveness/notification implementation. CTX event `d532dd98-727b-809a-90f2-f21f6b228513` in session `a8beb742-97d9-8493-bd2d-fafde29cce7c` reports an installed 0.2.12 contact-merge release with preview/commit/status/undo; this is historical evidence only. Installed app and release provenance were not verified here, and the checkout README may lag that release. Reconcile the implementation branch with the installed release before building.

Quality gates for this assessment:

Independent Sol 6.1 final review: **passed**, with no substantive findings. The reviewer independently checked the artifact and key source claims, then reran the broader focused frontend suite: **67 tests passed**, including customization. These remain offline checks and do not qualify the proposed native behavior.

- Functional correctness: **passed for bounded source assessment and 58 existing offline checks**; proposed runtime behavior remains **untested**.
- Perceptual/product quality: **untested for the proposed implementation**. Three TASTE stills and one saved GiGi baseline were inspected; no rendered new flow exists.
- Release readiness: **not applicable to this review**. No build, installation, distribution or external notification was authorized or performed by this assessment.

# Workstream consistency pass: local review

Status: prepared for review only. No push, PR, merge or deployment for this pass.

Local branch: `codex/W4FJPH-consistency-review`, based on current main `1dccc85007784fa8019e4b05fd8dff24cee6ac5f`. This task uses its existing isolated Workstreams checkout; no other release worktree is edited.

## Exact proposed publication scope

1. `src/routes/contact/+page.svelte`: membership inquiry description, title, acknowledgement and example prompt; capacity-led plan option labels; associated helper text with prices, check-ins and optional remote-session allowances.
2. `src/routes/products/+page.svelte`: the membership summary in `#capabilities`.
3. `src/routes/+page.svelte`: homepage search/social description only.
4. `src/lib/components/SelectedClientWork.svelte`: the final membership-capacity sentence only.
5. `content/sales/README.md`: current membership positioning paragraph only.
6. `content/sales/membership.md`: current offer heading and explanation, optional session framing and approved operating rhythm. Cost, access, billing and cancellation safeguards remain intact.

A verification script and this new review note support the proposed change. No archived or historical document is rewritten. No prototype guide, booking/calendar configuration, credentials, auth/security files, pricing source or public service entitlement changes.

## Preview and proposed wording

Contact: http://127.0.0.1:4189/contact?intent=membership

**Start with the work you want to improve.**

A workstream is one agreed area of work, such as improving a product or connecting a workflow. Focused is $900/month for one workstream and one milestone. Team is $2,500/month for up to two workstreams and two milestones. We agree the next useful change, work between check-ins and show what changed. Scope is agreed before payment. Project costs are separate.

Plan options: “Focused · 1 workstream” and “Team · up to 2 workstreams”.

The associated helper reads: “Focused is $900/month. Team is $2,500/month. Both plans include two 30-minute check-ins each month. Focused has two 60-minute remote sessions available; Team has four. Use remote sessions when helpful for onboarding, pairing or troubleshooting. Scope and times are agreed before payment.”

Products: http://127.0.0.1:4189/products#capabilities

“Membership supports agreed improvements between check-ins. Focused is $900/month for one workstream and one milestone each billing month. Team is $2,500/month for up to two workstreams and two milestones. Both include two 30-minute check-ins. Focused has two 60-minute remote sessions available; Team has four. Use remote sessions when helpful for onboarding, pairing or troubleshooting. Larger Builds, managed Control and project costs are separate.”

Homepage metadata: http://127.0.0.1:4189/

“AI-native Technical support from $900/month. Progress in an agreed workstream, between check-ins. Remote sessions available when useful.”

Expanded work library: http://127.0.0.1:4189/#work-library

“Selected projects demonstrate our capabilities. Membership delivery is agreed separately: one workstream with Focused, or up to two with Team.”

## Preserved contract

Focused remains $900/month, one workstream, one monthly milestone, two 30-minute check-ins and two 60-minute remote sessions available. Team remains $2,500/month, up to two workstreams, two monthly milestones, two 30-minute check-ins and four 60-minute remote sessions available. Both keep one feedback/revision round per milestone, learning resources and Slack support. Scope and response times are agreed before payment; larger Builds, managed Control, production incidents and project costs retain separate boundaries.

The existing homepage/services rhythm remains unchanged. Current operational membership guidance now states the same Monday/Wednesday build days and Tuesday/Thursday meeting days, within plan allowances and agreed times. Friday is unspecified. Session optionality does not add delivery capacity. No retired membership Hub is reintroduced.

## Evidence

Primary browser evidence: `/tmp/w4fjph-consistency/results.json` (30 route/viewport/motion combinations, 320–1440 px, doubled text, keyboard interactions, metadata and every homepage plan capacity value). Final contact-only evidence: `/tmp/w4fjph-consistency-contact-final/results.json`.

Independent Sol 6.1 review: `/tmp/w4fjph-consistency-independent/results.json` (both membership intent variants and plan preselection, products, metadata and expanded work library at desktop/mobile). Reader verdict: pass.

Full agency check, public-copy tests, prose check and production build are recorded in `/tmp/workstream-consistency-*.log` and `/tmp/workstream-consistency-prose.json`. No deterministic prose blockers. Review warnings in context rather than treating sentence length as a new claim or requirement.

Publication requires separate confirmation of this pass. Worktree disposition: preserved locally for review.

Final contact helper independent spot-check: pass at 390 and 320 px, including Team preselection and both prices. Evidence: `/tmp/w4fjph-contact-final-independent/results.json`. The pricing source, homepage plan table, shared membership component, booking/scheduling and inherited security/auth files were confirmed unchanged from the base. Exact six-file publication diff: `/tmp/w4fjph-consistency/publication.diff`.

Final status: full agency check passes with zero Svelte errors/warnings; public-copy tests pass 71/71; prose checks have zero deterministic blockers; final production build passes. Primary layout checks pass all 30 combinations, plus the final contact-only 10. Independent source/reader review and desktop/mobile checks pass. No publication action performed.

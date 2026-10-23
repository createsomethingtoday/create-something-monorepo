# Workstreams review

The homepage now follows one illustrative job from approved meeting notes to a reviewed action list, then to the next agreed improvement. The reader should understand what they bring, what CREATE SOMETHING does, what their agent does and where their team keeps approval.

## Story and copy

1. Bring the notes, tools, a useful output example and a named reviewer.
2. Agree one milestone and its acceptance check. Map, configure or improve the handoff, then test a sample and a failure case.
3. The agent prepares a draft action list from permitted sources. Unknown owners remain questions.
4. A person checks and corrects the draft before sharing. The service hands over the agreed code, tests, instructions and project context.
5. Bring a difficult example to the next check-in. Agree the next improvement within the membership capacity.

The graphite workshop images from approved PR2045 are reused as conceptual scenes. Wide setup, macro inspection and shared practice retain Canon and the same assistants. The readable draft is HTML, not text embedded in a photograph. No new image assets or production evidence are implied.

## Source and commercial boundaries

Sources: `src/lib/data/publicPricing.ts`, `src/lib/components/MembershipOffer.svelte`, `src/routes/agent-foundation/+page.svelte`, `content/sales/README.md`, and the approved homepage `src/lib/content/agency-home.html` from PR2045.

Focused remains $900/month: one workstream, one milestone, two 30-minute check-ins, two 60-minute attended remote sessions. Team remains $2,500/month: up to two workstreams, two milestones, two check-ins and four remote sessions. Each milestone includes one feedback and revision round. Skills, resources and Slack support remain included. Usage, hosting and third-party services remain separate. No unlimited work, SLA or savings claim is added.

Naming decision and client-specific scoping:

- AI-native Technical support remains the offer/category. A workstream is one agreed area of work within membership, such as meeting follow-up. Each meeting is a task within that area; adding a tool does not create a new workstream. Focused covers one agreed workstream at a time; Team covers up to two. No separate Workstreams product or price is introduced.
- Confirm whether the illustrative notes-to-actions job is a small configuration improvement or an Agent Foundation Build for a particular client. New connectors, new agents and production launch must be scoped first.
- Response times, tool compatibility, resource availability and usage budgets are agreed before payment. The mockup makes no new universal promise.

## Overlapping work library

Both supplied Library screenshots were materialized with the supported Library helper, verified as readable PNG bytes and visually inspected. The second shows the expanded work library, not the pricing section. Root cause: `.agency-home header` applies fixed 85px height and flex layout to the nested BuiltWork editorial header. Scope navigation rules to `.agency-home > header` so nested headers retain normal document flow. Preserve the actual project records.

## Scope

Only .agency homepage HTML/CSS and review/test evidence in the isolated `codex/W4FJPH-workstreams` worktree rebased onto origin/main 4d64c5041, including merged PR2052. No .io/.ltd/.space edits, PR2052 edits, production merge or deployment.

## Validation and review

- Full .agency `check`: passed, including Svelte diagnostics (0 errors, 0 warnings), copy contracts, pricing and route suites.
- Production `build`: passed with Cloudflare adapter. The sandbox initially blocked its temporary local socket; rerun with reviewed local-server permission passed.
- Public `copy:check`: 71/71 passed. Prose review note: 0 blocking findings.
- `scripts/verify-workstreams.mjs`: 13 layout and interaction states passed across 1440, 1024, 768, 390 and 320px, normal and 200% enlarged text plus a longer title. Checks title/header containment, header/first-row overlap, story text collisions, page overflow and keyboard open/close. Layout checks use reduced motion; additional keyboard checks exercise the story-to-plans CTA and scope FAQ with both reduced and normal motion preferences. The test temporarily restores baseline CSS and confirms the original fixed-height overflow. It saves local screenshots under `/tmp/w4fjph-evidence` by default.
- Enlarged text exposed unbroken work-library artifact labels at 768px. `overflow-wrap: anywhere` in BuiltWork fixes that failure while retaining content.
- Independent gpt-6.1-sol source review: one P2 finding, resolved by changing separate service wording to “need separate agreements.” Reviewer could not access localhost; rendered verification was completed separately by the implementation agent.
- Visual inspection completed on both source PNGs and desktop/mobile story plus library before/after renders. Screenshot captures hide floating navigation/privacy chrome temporarily so section content remains readable; live page navigation remains unchanged.

Preview while the local server is running: http://127.0.0.1:4185/#workstreams. No production deployment or merge performed. Worktree retained for review.

## Library deliverables

Final desktop and mobile story screenshots saved as version 2 through native Library uploads; library before/after remain version 1:

- Desktop story: `libfile_31500be884dc8191a1781f0f6f881f91`
- Mobile story: `libfile_0bc643debe4c8191923ab591b40fb2af`
- Reproduced overlap before: `libfile_4c30aa17ae1881919088a468f4b17061`
- Repaired work library after: `libfile_47f95630c4a881918d4690545e852408`

Machine-readable layout results: `docs/evidence/W4FJPH-layout-results.json`.

## Approved naming polish

AI-native Technical support remains the category and offer. Homepage story, plan introduction, plan notes and MembershipOffer definition/FAQ now describe a workstream as one agreed area within membership. Meeting follow-up is the ongoing area; each meeting is a task in it. Prices and numerical capacity are unchanged.

Final independent gpt-6.1-sol review: pass, no blocking findings. Reviewer checked naming, capacity, separate-service boundaries, disclosures, CSS and regression script against current main. It could not independently reproduce browser results because its localhost connection was refused and local Chrome aborted. The implementation agent completed all 13 browser states and refreshed the checked-in results after the review.

PR2052 is preserved by rebasing onto its merged main commit 4d64c5041. The draft PR contains only the seven .agency files listed in its diff.

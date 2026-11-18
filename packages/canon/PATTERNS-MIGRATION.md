# Shared patterns implementation handoff

This is a local implementation checkpoint for CRE-2434, not approval of the whole redesign or permission to publish. It builds on [FOUNDATION-MIGRATION.md](./FOUNDATION-MIGRATION.md) and [FAMILY-MIGRATION.md](./FAMILY-MIGRATION.md). The actual composition route is `/next/patterns`; `/next/components` remains the canonical control specimen.

## Covered public families

Navigation retains the imported dropdown behavior patch: Escape focus return, outside/focusout dismissal, width-sensitive resize cleanup and bounded dropdown scrolling. Its script was unchanged by this visual pass (baseline hash in evidence). Classic, Performance, Clear and editorial visual aliases now use solid canonical surfaces, house interface type, sentence case, soft-square controls and independently owned responsive layout. No consumer Tailwind utility is required for the navigation row. JavaScript-disabled users receive real route links and children rather than a dead menu button.

Footer retains its consent, account, subscription, links and callback script unchanged. Its aliases share canonical solid materials and accessible light/dark text. Local grid, list and link styles work without Tailwind. The rendered 1024/1025px footer overflow was repaired with bounded grid tracks; native footer links retain 44px usable targets.

UnifiedSearch and CommandPalette use solid canonical materials. A closed search no longer clears an existing body overflow value; an open search restores the value it actually captured. The specimen supplies fictional local results, with analytics disabled, keyboard focus trapping, Escape dismissal and a real records hash/focus destination. It makes no provider request.

DataTable preserves sorting, snippets, row callbacks and native nested controls. Clicking or pressing Enter on a nested link/button no longer also activates its containing row. StatusBadge preserves status meaning while using sentence case and soft-square geometry.

ClearDecisionPanel now gives default multiple instances unique SSR-safe panel/tab IDs and roving keyboard selection. Its no-JavaScript text includes every decision, evidence, receipt and action. Selected state colors remain semantic; dark panels and hero sections no longer mix into hard-coded white. ClearPageSection, ClearArtifactCard and representative Performance thesis, evidence, contrast, conversion, lab and narrative compositions use canonical roles and readable human labels. Narrative hash selection, reduced motion, presentation body lock and Escape/focus return are preserved. The presentation exit target is now at least 44px.

## Actual representative route

`src/routes/next/patterns/+page.svelte` imports the real public components: Navigation, Footer, UnifiedSearch, DataTable, Dialog, TextField, StatusBadge, ClearPageSection, ClearDecisionPanel and Performance compositions. It provides sorting/filtering, row detail disclosure, local search, review/stop states, evidence/receipt hierarchy, native details, stable scene links and a presentation mode. All data is explicitly fictional. No execution or publishing claim is made.

## Policy and generated artifacts

The old #181312 palette and .94 display-leading assertions conflicted with the authorized foundation. Tests now assert the declared neutral palette, Geist role and a readable display-leading range; licensed font assets and provenance checks remain. Agency rollout fixtures now inspect the actual AgencySalesHome/raw HTML runtime, native disclosure enhancement and current ownership language rather than demanding retired homepage components. No property source was changed in this phase; see the consumer owner's `packages/agency/CONSUMER-FOUNDATION-MIGRATION.md`.

The registry's root entry no longer promises an experimental journey it does not export. The journey remains explicitly experimental under `/patterns`. Newsletter attribution is classified as a utility. A generated-classification parity test protects this contract. The owning MCP generator now supports `--canon-only`; its complete generated diff added current classification rows, while the generated registry manifest was unchanged. It did not rewrite unrelated generated content. Parent-retired vNext package exports remain retired.

Canonical/portable token comments and docs describe light defaults, explicit dark/operator boundaries, house sans, 14px caption minimum and solid default materials. Performance editorial is a compatibility role bound to the house sans, while optional licensed font assets remain available. Canon and portable artifact generation stays scoped; the broad consumer-writing token migration script was not run.

## Evidence and limits

`evidence/patterns` contains genuine failing-before logs for nested row activation, duplicate panel IDs/keyboard selection and closed-search overflow, plus policy-baseline failures separately. The full suite passed 778 tests before the final two style corrections; the final rerun result is in `suite.log`: 779 passed, one failed. The sole failure is the unchanged legacy-token policy detecting 21 references in the concurrently added, parent/character-owner routes `/next/character` and `/next/world`. Those protected routes were not edited. This is a current integration failure, distinct from the repaired historical baseline. `check.log` and `build.log` record actual package validation. Prior failures are retained, not described as current defects.

Actual Ego space 9 exercised desktop/mobile menu Escape focus, sorting, row Dialog Escape/focus return, search focus wrap and result filtering/hash handoff, decision arrow selection, scene hash selection, presentation body lock/Escape and empty results. No-JavaScript at 320px exposed static navigation, all decision boundaries and both narrative scenes. Reduced motion was exercised. `widths.json` records 320, 390, 768, 1024, 1025 and 1440px with no document overflow or undersized visible controls in the normal composition; expanded alternative content was additionally checked at 390px. Dark final screenshot shows the expanded composition. Scrollable data stays inside its own container.

Final dark readback: decision text rgb(236,238,232) on rgb(39,42,39); hero is a solid rgb(39,42,39). Search result handoff produced `#records`, focused `records`, and filtered to `Meeting recap`. Presentation exit measured 44px after the repair. Screenshots are actual local runtime output, not references or generated mockups. Builder visual inspection is bounded and does not replace the parent's independent review.

## Ownership and remaining work

Parent owns vNext, the main `/next` route, character/world integration and art. A separate native agent owns character source and its route. Those paths were preserved. Property source changes visible in this shared checkout belong to the consumer owner. Isolated README updates must be reconciled with the protected dirty root README; no outside-checkout README was written.

This pass does not establish every advanced media/chart/operator/auth composition as visually approved. Their behavioral contracts remain, but dedicated runtime journeys and property-level composition review remain with integration. Explicit decorative effects remain opt-in. Finish consumer checks sequentially after this Canon handoff; do not interpret package success as a release or aesthetic gate.

Functional correctness: passed for scoped regressions and exercised local compositions; the full current suite fails one cross-owner legacy-token policy assertion (779 passing). Offline fixtures are distinguished from browser runtime. Perceptual/product quality: builder-inspected light/dark/responsive output; independent parent acceptance remains pending. Release readiness: not approved; no publication, push, merge or deployment occurred.

Worktree disposition: preserved at `/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-a01044d6-2f560e0ec9e58190`, branch `t3/canon-design-system-redesign`. No checkpoint commit was manufactured. Parent retains the Cook floor and final integration/retest gates.

Final command handoff: Canon check and build both passed after the final style fixes. All Canon packaging/sync/build commands are complete and idle. Parent may now take sequential consumer builds/checks. The development server on 5191 is preserved.

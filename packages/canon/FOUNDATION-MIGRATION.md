# Canon approachable foundation phase

## Current direction: black foundation

The user's November 13 correction supersedes the initial light default documented below: retain the website's black foundation together with whimsy. Canonical CSS, TS color exports, portable artifacts and public showroom defaults now use true black `#000000`, neutral `#111111` panels and `#f2f2f2` primary text. The earlier green-charcoal dark palette is replaced by neutral grays. Explicit light scopes remain available for reading/work surfaces and comparisons; nested alias rebinding is retained. Materials and warm color belong in the character and approved workshop scenes. Measured chapter rules, useful labels, square image frames and Geist typography remain part of the identity.

This correction passed 24 focused foundation, artifact parity and licensed-system policy checks. Actual `/next` browser readback confirmed default dark, black canvas and neutral foreground. Earlier screenshots and results below document their historical palette and are not evidence for the revised one. Consumer builds and final rendered acceptance continue separately.

This phase updates the existing public foundation rather than introducing another required theme. Existing `/styles/tokens.css`, `/styles/canon.css`, `/styles/performance.css`, `/tokens` and portable `@createsomething/canon-tokens` entrypoints remain intact. Parent-owned vNext components/routes/art are untouched in this phase.

## Historical initial role system (superseded)

Default canvas `#f7f8f6`, panel white, graphite `#292b28`, secondary `#535950`. Primary actions use graphite on white; explicit dark uses inverse `#eceee8` on panel `#272a27`, with canvas `#20231f`. Status success/error/warning/info and authority ready/controlled/review/stop retain distinct meanings and accessible light/dark text/fill pairs. Decorative sky/apricot are not operational status or primary action colors.

Geist remains locally loaded by Performance/full Canon CSS. TS typography now emits the same house family and relaxed leading `1.618`; actual pre-fix tests reproduced missing Geist and `1.625` drift. Body remains 1rem with comfortable leading; caption/overline minimum is .875rem. Existing specialist record/code roles remain mono. Control radius is 12px; default Card radius becomes 20px via its existing scale-lg token. Duration micro/standard/complex becomes 150/220/350ms. Default glass token surfaces become solid with zero blur; shine-card class names become solid compatibility surfaces. Shadows use soft neutral elevation, without default glow.

## Theme and compatibility boundaries

No attribute is required for the light default. Use `data-theme="dark"`/`.theme-dark` to preserve intentionally dark imports. A token import by itself cannot infer that a consumer used to depend on an implicit dark default: audit and mark those product boundaries before release. `.cs-workspace` is explicitly dark without additional markup. Operator palette is still opt-in, namespaced and unchanged.

Light and dark scopes rebind color-derived state/mode and compatibility aliases at the boundary where their source roles resolve. This prevents inherited aliases freezing a parent's palette. A nested light section inside dark returns to light status colors. High contrast strengthens separators without forcing light surfaces into a dark foreground palette. Full Canon also sets native `color-scheme`; token-only consumers should set it if needed.

`.property-performance` now consumes the owning palette and house sans. It no longer redefines paper/panel/ink from editorial aliases or forces serif headings/orange actions. Full Canon links no longer fade to .7 opacity on hover and base cards no longer shift sideways. Explicit decorative classes and specialist component behavior still need the next family pass.

## Artifacts and generation

`node packages/canon/scripts/generate-foundation-artifacts.mjs` reads canonical CSS and writes only Canon SCSS/DTCG/Figma/canon.json and portable CSS/SCSS/JSON. It does not run the broad consumer migration script. JSON existing shapes and public names are preserved; `foundationThemes` records complete scopes. Portable CSS equals canonical CSS byte for byte. SCSS exposes current named variables and embeds complete CSS for modes. Theme-sensitive consumers should use CSS roles rather than compile a light literal into a dark surface.

## Historical next-family plan (later rounds implemented separately)

- Existing Button/Card already consume the updated ink/panel/radius roles. Preserve native href/button/disabled behavior. Verify family CSS and class-only `.btn` variants together; the current phase changes class `.button-*` solid material but does not edit Svelte components.
- TextField/Select: explicitly provide normal surface/border and audit small-size 36px targets. All form controls: focus/error/disabled contrast, description/error IDs, keyboard and nested dark scopes.
- Dialog/Drawer/Popover/Dropdown/Tooltip: replace any literal glass/shadow/white overlays outside the token graph; preserve focus trap, restoration, Escape, portal and dismissal contracts. Generic glass tokens are solid now, but literal or hard-coded component treatment still needs review.
- Navigation/Footer/search/data/compositions: inspect literal dark chrome, uppercase labels, icon contrast and dense state readability. Shared Navigation and all component family files were out of scope for this phase.
- Agency/IO/LTD/Space: remove duplicated editorial role maps where canonical inheritance should own them. Mark intentionally dark roots explicitly; check inverse campaign scopes and local operator remaps. Do not assume package source changes mean consumers were migrated or deployed.
- Temporary vNext bridge retirement: once actual legacy families and representative consumers use this canonical foundation with validated state behavior, remove the pilot's parallel role map and bind its specimens to existing canonical tokens/components. Do not keep two permanent Button/Field design systems. Parent owns this integration.

## Evidence and limits

`evidence/foundation` holds actual canonical-import browser captures, computed nested palette readback and command logs. The static `canon-foundation-review.html` is a source-only fixture served by local Vite; it uses canonical imports and ordinary existing class/token contracts, not vNext roles. It is not an application flow or shipped product. Unit tests resolve aliases and check twelve contrast pairs per default/light/dark mode, TS color/type parity, portable CSS/SCSS and JSON themes. Separate operator checks preserve its existing contract.

The repository has known unrelated consumer/registry rollout failures; see command logs. Parent independent actual-output review, component-family migration, consumer convergence and final Cook acceptance remain. No publish, push, PR, merge or deploy occurred.

### Phase result (2026-11-13)

- Pre-fix parity: 2 meaningful failing assertions, missing Geist and relaxed-leading drift. Post-fix focused foundation/artifact suite: **15 passed** across 2 files.
- Broader foundation/button/motion regression run: **48 passed, 1 failed**. Failure is the existing Performance naming test listing six unauthorized legacy references in Agency/LTD; those exact references are also the non-write migration check failure. No property source changed.
- Canon `check`: passes packaging/publint, Svelte 0 errors/0 warnings, overlay/consumer/codification/health/depth gates. Canon `build`: passed. Portable package check and operator CSS/JSON/contrast check: passed.
- Actual canonical-import local fixture: light default, explicit dark, nested light, workspace, state aliases and house font read back from computed styles. High-contrast media retained the corresponding light/dark foregrounds. Keyboard Tab produced a visible solid outline. Six-width DOM measurements show no overflow after layout settled. Captures viewed at mobile/desktop and dark/nested contexts. This does not qualify real product/family behavior.
- Functional gate: **passed for canonical foundation**, with the named unrelated consumer-contract failure. Perceptual gate: **passed for bounded builder fixture inspection**, parent independent actual-output acceptance pending. Release readiness: **failed/pending**, shared-family and consumer convergence remain and promotion is unauthorized.
- Worktree disposition: **preserved** at `/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-a01044d6-2f560e0ec9e58190`, branch `t3/canon-design-system-redesign`, HEAD `5f9bfab3f6a9069332d650f42a09f5bd18d806a7`. No local commit required. Parent-owned pilot files were not edited in this phase. Parent eight-hour Cook task remains active.

### Next family pass: fresh source pointers

Read-only follow-up confirms `TextField.svelte:202` and `Select.svelte:197` force small controls to 36px; `Dialog.svelte:211` and `Drawer.svelte:216` have 32px close controls; Pagination uses 36px buttons. Keep Spinner's 32px artwork distinct from interactive target requirements. Dialog material reads glass tokens (now solid/zero blur), but still requests saturation, so view its actual portal output before claiming the family migrated. Alert reads the newly tested semantic muted roles; validate its dismiss target independently. Tooltip uses an inverse foreground fill, which needs matching on-fill text. Switch/Checkbox/Radio consume foreground fills and must preserve contrasting thumbs/checkmarks after the default changes.

Navigation source still contains monospace uppercase labels, a literal white-to-blue-gray gradient around line 677, and literal #090909 text; those bypass the canonical substrate and belong to the next owned component phase. Do not infer that foundation changes migrated Navigation. Parent-owned root Navigation edits were not touched.

Final canonical `check` completed successfully at approximately 2026-11-13T15:40:27Z. No further sync/package/build is running from this implementation phase. During parent browser recording, avoid such commands: prior Vite 500/context resets coincided with package/sync work and are HMR interference evidence, not independently diagnosed application bugs.

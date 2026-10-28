# Agency contract reader XRay — 2026-10-20

The existing OpenProse contract lesson now has an original SVG inspection view inside its figure. Its heading, four explanations, expandable example and caption are unchanged. The model preserves the distinction between declared contract, orchestration, host enforcement and observed receipt.

The same four assemblies and attached handoffs project into isometric and front views. A ghosted enclosure, cutaway, selection, bounded 100–400% zoom and pan expose the schematic relationships. Controls are native HTML; touch manipulation is opt-in. Labels stay outside the zoom transform. No measured geometry, live execution, telemetry, new permissions or automatic proof is implied.

## Evidence

- Full `pnpm --filter @create-something/agency check`: passed; Svelte reported zero errors and warnings. Existing Scopefield, pricing/copy and public surface tests passed.
- `pnpm --filter @create-something/agency build`: passed, including existing prebuild tests and Cloudflare adapter output.
- `pnpm agent:skills:test`: all 15 passed, including Anatomy XRay discovery/installer contract coverage.
- `pnpm --filter @create-something/agency exec node --import tsx --test test/contract-xray.test.ts`: all four passed. The tests are also included in the normal agency check command.
- Isolated Chrome 155: four assemblies; five default enclosure faces/two cutaway faces; shared front/isometric state; selection; zoom/pan; keyboard Fit; default wheel uncanceled; touch pinch to 183%; 44px controls; no horizontal overflow at 390px/320px; 12.61px narrow selected label; print restores previous zoom; no-JavaScript retains all four SVG parts and explanation with inactive controls hidden; zero runtime exceptions.
- Reduced-motion preference enabled during mobile checks; the component has no animation or idle rendering loop.
- Desktop, mobile and mobile zoom images are adjacent. Browser assertions and environment are in `browser-results.json`. Additional print/no-JavaScript evidence is retained in the local review package.

Reproduce browser checks using an isolated Chrome CDP profile: `XRAY_CDP=http://127.0.0.1:9334 XRAY_URL=http://127.0.0.1:4182/#contract-lesson-title node packages/agency/test/contract-xray.browser.mjs`. This uses existing Node/browser capabilities and installs nothing. The evidence is a bounded browser run, not a screen-reader session or physical-device performance benchmark.

## Skill provenance and operation

The separate reviewed skill lives at `packages/dotfiles/codex/skills/anatomy-xray`. See its provenance, implementation, model template, checklist and validation references. It credits Anatomy by Ryan as conceptual inspiration; all demo/model code is original. Invoke `$anatomy-xray` after installation. The existing installer now discovers the skill; this change does not run a global installer.

On W4FJPH, the user-approved installation is a single symlink from `~/.codex/skills/anatomy-xray` to the retained reviewed worktree's skill folder. No other installed skill was changed.

## Coordination and rollback

Linear evidence upload is blocked: the environment has no Linear API key and the existing Infisical session is expired. The attempted read stopped at its login prompt; no authentication or credentials were changed. This record preserves the handoff pending authorized access.

Promotion uses the existing PR and Agency Pages Deploy gates. Revert this PR to restore the previous static illustration; the original `/diagrams/contract-reader.svg` remains available. No data migration is involved.

Worktree disposition: implementation preserved at `codex/agency-contract-xray`; reviewed skill source retained at `codex/anatomy-xray-review` because the approved local installation points there.

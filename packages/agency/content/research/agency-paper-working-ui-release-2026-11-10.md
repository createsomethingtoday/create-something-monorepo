# Agency paper to working UI release

CRE-2396. User approved the standalone example and explicitly requested deployment on 2026-11-10. The homepage keeps its existing positioning, actual-work proof, navigation, booking destination and team/ownership terms. The example sits inside the existing `#together` chapter before the team footer.

## Approved behavior

Sketch presents one request form as stacked paper on a green precision mat. Refine adds a help-type selector and next-step explanation in response to two clearly illustrative review notes. Use it turns the same form into polished native UI. Production UI is the conceptual “stone” state; this example uses no literal stone texture.

Agent and team responsibilities remain explicit through planning, revision, development, checks and approved deployment. The example is not a live agent session or customer outcome. Form values stay in the page, with required/email/whitespace validation and a safe text handoff preview; nothing is submitted or stored by this module. Existing booking links remain the commercial handoff.

Runtime is scoped to the module and disposed with the page. Installed GSAP enhances transitions; unavailable GSAP leaves instant working stage changes. Current visible geometry is preserved on reversal, active-stage selection is stable, and focus/resize/reduced motion/overlays settle the requested state. No-JavaScript retains the full narrative. Site-wide motion and search presentation stores remain authoritative.

## Reference and scope

Approved baseline: local `artifacts/agency-paper-stone-marketing-20261110/index.html`, SHA-256 `3253e5fff7058ce74044f9b01d10aca99293e1714febd8542a360e9a38661495`. The existing Mobbin review informed orientation (Linear), concrete relationships (Fibery), and specific workflow outcomes (Tines); no external assets or layouts are reproduced. The original Canon cutout remains an owned asset.

The implementation uses existing Agency measured color roles and scopes light material controls inside the dark operator shell. Desktop module width is bounded; CSS avoids inheriting the shell's white control borders and disabled-button opacity. Namespaced IDs preserve isolation. The public HTML cache revision is advanced for the composition change.

## Validation

- Pinned `pnpm --filter @create-something/agency check`: passed, including zero Svelte errors/warnings and package checks.
- Pinned Agency production build: passed.
- Built-page browser check: 30 checks passed, including all three stages at 320,390,680,768,1024,1025,1440; keyboard focus, native email/required validation, whitespace recovery, safe text preview, preserved values, exact CTA and no-JavaScript narrative.
- Eight motion checks passed: normal Refine and Use transitions, reversal (maximum measured jump 0.000061px), same-stage stability, latest-stage completion, input focus, resize and changed reduced-motion preference. Intermediate and settled frames were directly viewed.
- Parent inspected desktop/mobile stage screenshots and full-page captures. Independent review found and verified the correction of inherited summary text color: final desktop/mobile contrast is 13.72:1, with keyboard submission/focus intact. Final independent functional and product gates passed; see the separate review. A persistent rendered contrast regression check was added.
- Ground advisory completed with `no_analyzable_files`: unsupported HTML/CSS and incomplete duplicate-analysis coverage for TS/Svelte. This is not a clean-code certification.

The reusable `scripts/verify-paper-example.ego.mjs` accepts a parent-owned Ego space, base URL and absolute output path through `globalThis.PAPER_RELEASE`. Its checks exercise rendered behavior, including the material-control regression found during integration. Browser evidence and exact motion script are retained in local `artifacts/agency-paper-release/`; use unique navigation queries for fresh state. Same-document navigation is not a reload. Tests cover Chromium emulation, not physical devices, other engines or assistive-technology speech.

## Promotion and recovery

Normal production path: reviewed PR -> required checks -> current main -> Agency Pages workflow -> canonical live readback. A successful build-only workflow is not a deployment receipt. Production and live evidence are added to Linear CRE-2396 after promotion.

Previous production deployment: `1a3efbc9-a88d-446e-af59-287906666072`, source `942517f6b8dbba0f2b790fc9cb932d2a358730f4`. Rollback: revert this scoped PR and redeploy through the normal workflow; immediate Pages rollback can restore that deployment, followed by canonical verification. No data migration is involved.

Worktree disposition: preserved at `/tmp/cre-2396-agency-paper-release`, branch `codex/cre-2396-agency-paper-release`, until production evidence is recorded. Unrelated original-checkout changes are excluded.

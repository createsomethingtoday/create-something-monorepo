# Composable Canon form: local review slice

This is a local, browser-based composition demonstrator, not a general Draw component editor or a second design system. It can be hosted in another browser surface without changing the composition contract or Canon renderer. Annotations can accompany review; they do not replace executable prop edits or interaction checks.

## Review

Open `/compose` on the local preview. Edit the heading, supporting copy, action label or Canon variant; apply props; submit an empty form; fill both fields; submit and retry. The first complete attempt intentionally simulates a failed service. No request is sent. Switch to Motion and choose Context or Detail. Both use the same content and instance references.

Save locally persists **composition props**, not personal form entries. Switching modes preserves interactive entries in memory. Reload restores the composition and begins a new empty interaction. Export/import JSON preserves definitions, named slots and instance IDs. Malformed imports retain the current composition. Browser storage errors are surfaced.

Export render handoff, then open `/compose/render` and select the exported file. This independent consumer validates the version, source lock, composition digest, camera targets and timing before rendering. Tampering fails without replacing the previous render. The implemented renderer is `canon-svelte-dom` v1, 1200×900 at a nominal handoff rate of 30 fps. Browser playback uses requestAnimationFrame; this slice does not encode video or claim frame-accurate export. The integrated snapshot adapter exports an offline HyperFrames ZIP with the same scripted Canon states, camera cuts, local GSAP runtime, and validated composition metadata. It does not encode video.

## Boundary and source reconciliation

- Base: Draw owner's committed `c96e5fef12363367bf5e1077b8451ff30b28bd8b`, including approved isometric D branding `ad8dec0a5` and import recovery `277b1dc2e`.
- Branch: `codex/draw-composable-form-proof`. Owner checkout and active PCN work untouched.
- Canon owns tokens, controls and their behavior. `NodeView.svelte` imports the actual Canon Button, TextField, TextArea and Alert sources. No copied component markup or token catalog.
- Existing Agency overlay supplies aliases; Canon's existing light theme supplies readable form roles. The scoped adapter strengthens invalid-field focus visibility and uses Canon ink for alert titles to meet text contrast requirements. No Canon source edits.
- Composition owns typed allowlisted props, named heading/action slots, `stack` layouts, nested reusable definitions, stable expanded IDs and local fixture orchestration.
- Motion owns timing, captions and cameras. Camera targets reference expanded instance IDs, not DOM selectors in saved data. Scripted form content is inert. Reduced motion uses camera cuts.
- Source lock hashes Canon sources, tokens, overlay and approved brand asset. Updating it requires a source/version review; no automatic baseline update exists.

Database = versioned composition and source references. Automation = validate, expand, render, persist and hand off. Judgment = source compatibility, bounded component allowlist and separate human visual acceptance. Deleting this contract would scatter those rules across the editor, motion and handoff reader. Native rendering and general library authoring remain separate adapters/scopes.

## Reproduce

Use the repo-pinned Node 22.21.1 / pnpm 9.15.0 toolchain and `pnpm bootstrap:worktree`. Package Canon if its `dist` is absent. This execution reused a private APFS clone of existing dependencies after bootstrap could not resolve the download hosts. Clean-machine setup is not proven.

```sh
pnpm --filter @create-something/canon package
pnpm --filter @create-something/mapping-canvas exec vite dev --host 127.0.0.1 --port 51957 --strictPort
# In a second terminal:
pnpm --filter @create-something/mapping-canvas check
pnpm --filter @create-something/mapping-canvas test
pnpm --filter @create-something/mapping-canvas verify:composition
DRAW_NATIVE_BUILD=1 pnpm --filter @create-something/mapping-canvas build
```

`verify:composition` defaults to installed macOS Chrome and loopback port 51957. Override `CHROME_PATH` and `DRAW_COMPOSITION_URL` when needed; its network guard only permits 127.0.0.1. It launches a disposable profile, not an attached user browser. Results and candidate PNGs go to `output/composition` at repository root. Use a fresh evidence directory/archive for a separately reviewed revision.

## Acceptance and limits

Package tests, type check, actual browser assertions, source/asset hashes and independent sampled-pixel review support the bounded local proof. Automated checks are not human baseline approval. New images remain **candidates**. Continuous human playback, native renderer qualification, HyperFrames render qualification, production promotion and course publication are separate gates.

No new providers, grants, paid generation, installer replacement or deployment. Linear credentials were unavailable in this executor, so tracker registration is pending. The worktree is preserved for review and integration planning.

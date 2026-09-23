# Marketplace Guidelines Registry

A single self-contained HTML page (vanilla JS, no dependencies) that the App Review team uses to edit the seven developer-docs Marketplace pages without touching developers.webflow.com, attach check / owner / legal metadata per rule group, propose changes, and export lossless MDX back to `webflow/openapi-internal`.

Live: https://wrop.wf.app/w/marketplace-guidelines-registry-59mxch (Okta via Cloudflare Access).

## Layout

| Path | Role |
| --- | --- |
| `source/*.mdx`, `source/SOURCE.json` | Snapshot of `fern/products/data/pages/MARKETPLACE` at a pinned commit (`pnpm sync-source`) |
| `data/registry-seed.json` | Seed registry rows (check type, owner, legal status) per section |
| `src/template.html`, `src/styles.css`, `src/app.js` | The page |
| `src/proposal-codec.js` | How a proposal travels through wrop comment threads (see below) |
| `scripts/mdx.mjs` | Lossless sectioner; round-trips every page byte-identically |
| `scripts/build.mjs` | Inlines everything into `dist/index.html` |
| `scripts/publish.mjs` | Owner-only: upserts the wrop by metadata topic, carrying the live working copy forward |
| `scripts/export.mjs` | Live working copy → `dist/export/*.mdx` + `CHANGES.md` for the docs PR |
| `scripts/live-check.mjs` | Read-only verification against the live wrop (`--propose`, `--publish` exercise the write paths) |
| `scripts/smoke.mjs` | Headless Chromium smoke over every view and WebMCP tool |

```bash
pnpm test          # mdx round-trip, build, proposal codec
pnpm build         # dist/index.html
pnpm publish:wrop  # needs `cloudflared access login https://wrop.wf.app` once
pnpm export        # after publishing, for the openapi-internal PR
```

## Model

Data island `{ meta, baseline: { pages }, working: { pages, registry, changelog } }`.
Drafts live in the editor's browser (localStorage). **Proposals are wrop comment threads.** **Publish is an owner-only PUT** of the page's own HTML with drafts merged; every prior version stays at `?v=N`.

## Proposal transport

wrop caps every comment and reply at 2000 characters, so a proposal cannot ride in one comment. The root comment carries a human summary plus a small JSON envelope (`type`, `v: 2`, `id`, `chunks`, summary, base version, section ids). The payload is base64url-encoded JSON split across replies tagged `wfgr-chunk <id> <i>/<n>`. Readers reassemble from the replies; a thread with missing parts renders as *incomplete* (apply disabled) instead of disappearing. If a reply fails to post, the client deletes the partial thread and keeps the drafts. Threads posted by the earlier inline format (`v: 1`) still parse.

## Gotchas

- The wrop viewer `/w/…` embeds the page in an iframe; automation drives `/api/wrops/<slug>/raw?v=N` and calls `window.__guidelineRegistry.call(tool, input)`.
- Comment pins are percentages (0–100). The comments list is eventually consistent (seconds).
- Metadata keys must be lowercase; passcode-protected wrops are invisible to metadata lookups.

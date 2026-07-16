# App Review Preflight Designer Extension

Native Webflow large right-panel UI for uploading an app bundle, understanding deterministic feedback, preparing a reproducible Runtime Test Package, reading Webflow-controlled runtime evidence, uploading a revision, and reopening automatically saved review history.

```bash
pnpm build
pnpm test
pnpm check
pnpm serve
pnpm bundle
```

`pnpm serve` uses the Webflow CLI for Designer development. The standalone local workflow serves `public/` on `http://localhost:1337` and talks to the local Worker on port `8787`.

There is no Share or explicit Save action. Review versions persist through the Worker automatically, while the last selected review ID is kept only as local extension navigation state.

The complete behavior-test flow labels partner configuration as `Partner supplied`. It becomes `Webflow observed` only after a separately authorized E2B job completes and the Worker validates the evidence manifest and immutable artifacts. The extension never receives the job capability, uploads browser evidence, or changes an official review decision.

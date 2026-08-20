# exception-flow-video

A 73-second Remotion animation of the app-review exception loop, built for team
meetings. It follows one resubmission from intake hold to release, shows a denial's
automatic exit, and closes with the nine live automations that run the loop.

## The contract

The video is a **dated claim, not a receipt**. Everything it asserts — copy, exception
items, automation names, scene timings, the "as of" stamp — lives in `src/flow.ts`,
verified against the 👛Marketplace Assets base automations on the date stamped in
`AS_OF`. When the flow changes:

1. Edit `src/flow.ts` (and only it, for most changes).
2. Update `AS_OF`.
3. `pnpm render`.

A stale video lies silently; the date stamp on the final frame is what keeps it honest.

## Commands

```bash
pnpm studio   # live preview at localhost:3000
pnpm render   # → out/exception-flow.mp4 (1920×1080, 30fps)
```

## Provenance

Automation names are verbatim from the Airtable base (all deployed as of 2026-08-20).
The example app ("Acme Embed") and its three exception items are fictional composites —
no partner is named. Visual language matches the internal governance arc at
wrop.wf.app/w/app-review-governance-submission-decisio-7cwthh.

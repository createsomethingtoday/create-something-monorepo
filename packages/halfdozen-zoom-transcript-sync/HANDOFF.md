# Draft PR handoff

This change replaces opening-excerpt checks with versioned transcript parts and an ordered index. It preserves the selected original and existing page content. D1 readiness stays empty until exact read-back verification succeeds.

Review [READINESS.md](./READINESS.md) before adding Notion properties or connecting downstream triggers. Consumers must use the indexed version and check it again before saving extraction results. Extraction quality still needs its own evaluation.

## Local evidence

- Source base: freshly fetched `origin/main`, `3396d7755`.
- `pnpm bootstrap:worktree` passed. Checks used pinned Node `22.23.4` and pnpm `9.15.0`.
- Package `check` passed (`tsc --noEmit`). All 32 package tests passed.
- Tests include a synthetic 478-cue transcript and a 2,000-cue worker flow with paginated Notion reads. They cover exact originals, part reconstruction, partial failure and retry, source correction, repeated runs, unknown write outcomes, duplicate or missing blocks, rendition ties, stale owners, and vanished recordings.
- Independent Sol 6.1 retesting added 10 cases. It found a disappearance race: an old worker could restore cleared readiness. Discovery now revokes the old selection and owner. The regression and all package checks pass after the fix.
- Scoped `git diff --check` passed. Prose checks passed with readability warnings reviewed.

The tests use in-memory SQLite and mocked Zoom/Notion responses. They do not prove live D1, direct Notion, Hub proxy, downstream retrieval, or task extraction behavior. No production ingestion was attempted.

## Recovery and promotion

A committed write with a lost response resumes from exact read-back receipts. An uncertain write without a receipt stops for operator reconciliation. Corrupt or incomplete artifacts also stop. The worker never blindly repeats these writes. Review runtime, rate limits, and recovery behavior on an approved nonproduction target before promotion.

No deployment, schedule change, credential change, merge, live record write, or OD x DM rerun was performed. The manual fixture remains untouched. Its supplied 11-part, 478-block description is context, not test evidence from this change.

Linear tracking could not be created or claimed because `LINEAR_API_KEY` was unavailable. No credentials were changed.

Worktree disposition: preserved at branch `codex/zoom-indexed-transcripts` for draft review. The shared checkout and its unrelated changes were left untouched.

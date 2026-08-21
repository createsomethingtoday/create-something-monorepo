# Recovered deploy — exception-decisions-mcp v1.1.0

The TypeScript source for this package was lost from disk in a worktree cleanup
(only `.deciders.local.json` and `.wrangler/` survived). The worker itself is
live and healthy at `https://exceptions.mcp.createsomething.agency`.

On 2026-08-18 the deployed bundle was pulled back from Cloudflare
(`worker_get exception-decisions-mcp`) and verified. The bundle is single-file
esbuild output of `src/index.ts` — no external deps, so reconstruction of a
buildable source is mechanical (strip `__name()` wrappers, re-add types).

Facts confirmed from the recovered bundle (v1.1.0):

- **Identity**: `DECIDERS_JSON` secret maps `exd_…` bearer key → `{name, email,
  role, surface?}`. Adding/removing identities is a secret re-upload only — no
  code change, no redeploy of logic.
- **`recommend_exception_item`** hardcodes the notes line
  `Partner-lead recommendation: APPROVE/DENY — <notes>` and flips the item to
  👀Under Review. It does **not** stamp `⚖️Decision By` (correct — a
  recommendation is not a decision). Attribution line:
  `— Decision recorded by <name> (<email>) via exception-decisions-mcp, <ISO>`.
  ⚠️ Consequence: an automation must NOT use this tool as-is — its notes would
  be mislabeled as a partner-lead read. See `dify-recommendation-runbook.md`
  for the v1.2.0 change (role-aware prefix).
- **Guardrails in place**: decided items refuse further writes ("Decisions are
  corrected in Airtable, not overwritten here"); version-level approval refused
  while `⚖️Undecided Items > 0`; version-level denial requires
  `confirm_release: true` (auto-emails feedback to the developer).
- **Idempotency gap**: `recommend_exception_item` on an item that is already
  👀Under Review appends a *second* recommendation line (Under Review still
  counts as undecided). Runners must check `get_exception_item` decision notes
  for an existing `recommendation:` marker before writing.

To restore a buildable package: de-bundle `recovered-deploy-v1.1.0.js` (same
directory) back into `src/index.ts`, or diff against `refs/preserved/*` /
`~/Code/create-something-recovery` if a preserved copy surfaces.

**Restored + superseded (8/18, same day):** `src/index.ts` was reconstructed from this bundle
with the v1.2.0 changes applied (role-aware recommendation prefix; decide tools refuse
`role: automation` keys) and deployed as version `321a73e5-1227-49bb-90ae-54fb1b01e1bd`. The
package is buildable again (`wrangler.jsonc`, `package.json`, `tsconfig.json`); this bundle stays
as the v1.1.0 reference.

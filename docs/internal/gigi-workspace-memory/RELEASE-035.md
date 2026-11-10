# GiGi memory-bearing 0.3.5 candidate — CRE-2382 / PR #2222

Authority: prepare scoped source and a local signed/notarized public candidate.
Parent owns exact-head review, integration and promotion. No merge, immutable
upload, download-page change, publication, deploy, installed-app mutation or
Slack/email is performed in this lane.

## Source and release identity

PR #2220 merged normally as `b292f002b4d0b08eef2de5844bc838614d58f162`
from reviewed head `a4c3500bc3ad5be0ca5d1dbbe56e765e52c081cc`.
Public 0.3.4 is live and memory-free; PR #2222 now targets main.
The next artifact includes memory staging recovery and reviewed navigation
alignment `ecf2e65db21f6a013a8aaeeb2c610ab9294c5921` (integrated as `2ca26962c`).
All earlier 0.3.5 candidates are superseded and must not be promoted.

App/package/Rust/plugin/reconciliation version: **0.3.5**. Public identity:
`agency.createsomething.gigi`. Complete release companion pipeline includes native
MCP in both locations, Bun integrations/Codex, pinned signed CTX 1.3.1, notification
dylib, agent skill/plugin, licenses and production Vite output. The isolated
release build must occur after source commit, with clean status before/after and
compiler-emitted exact SHA and dirty=false for main and MCP. Keep original
compiled app untouched; Developer ID sign a copied app, then notarize/staple it
and a newly created DMG. Preserve signature-only payload equivalence and run the
existing full verifier, which checks all signatures, Gatekeeper, staples and
mounted-app byte/mode equality. Its --source-sha argument alone is only an assertion.

Superseded candidate outputs/logs remain under `.cache/gigi-release-035/` and
`.cache/gigi-release-035-corrected/`; replacement outputs must use a new local
directory with exact final-source provenance. Final
artifact identities, build provenance and signing/verifier receipts are recorded
there and in Linear. Neither prior 0.3.4 artifacts nor installed public/DEV apps
may be overwritten. Sanitized native/provider evidence is in
[NATIVE-QUALIFICATION.md](NATIVE-QUALIFICATION.md); QA is not release qualification.

## DEV parity handoff (read-only assessment)

Canonical Grantbot branch is `migration/grantbot-complete-handoff-2026-08-25`.
PR1432 merged as `96b938d7401c08f9998bc3640dfc0e5cdb4fede5`, identical to frozen
DEV source `5874fbc0ed10ff04e76e46a5f5751fc63b0837c7`.
Its memory-free 0.3.4 private prerelease is published and download-verified.
Preserve separate `co.halfdozen.gigi.dev` identity and data; never infer packaging
identity from a generic config alone. Existing qualification belongs to that
exact source and artifact.

Later DEV owner must start from current canonical, preserving newer Danny commits
and unpublished device work. Do not blanket-copy this monorepo or replace the
checkout. Incorporate the narrow navigation correction with its owning lane,
then transfer the
reviewed memory delta, mapping `apps/gigi-desktop/` to
`sandbox/gigi-desktop/apps/gigi-desktop/` and `packages/gigi-integrations/` to
`sandbox/gigi-desktop/packages/gigi-integrations/`. Memory files include native
`memory.rs`, domain/lib dispatch, MCP tool routing, lifecycle/stdio tests and
fixture; controller/model/React Memory surface, App/navigation/CSS/preview fixture;
agent skill; embedded Codex memory allowlist/context and adapter tests; memory
model/browser regressions. Resolve shared App/controller/native domain/adapter
files against canonical source, retaining DEV identity, data isolation, imports,
consent and receipt correction. Use `git diff --name-only a4c3500bc...<memory-head>`
as the exact scoped manifest, excluding monorepo-only evidence and public version
metadata from blind application.

Coordinate a distinct DEV0.3.5 source/packaging version only in that owner's lane.
Rerun native domain/stdio, desktop/integrations/typecheck, actual React memory and
setup flows, Astryx doctor, exact native/provider acceptance and complete signed
DEV companion/CTX packaging. Require clean compile provenance, independent review,
DEV verifier plus authenticated complete-download/hash before publication. No DEV
source, artifact, release or installed app was mutated by this handoff.

## Remaining promotion and rollback

Parent obtains exact current-head review/CI and independently re-tests actual
output; no subagents are authorized in this preparation lane. Signed-candidate
runtime/installation acceptance, installed-host proposal under its actual policy,
macOS13 floor, VoiceOver, Google/phone and human acceptance remain separate gates.
Never weaken never-policy to close the external-host proposal gap.

After promotion authorization and review gates, intended immutable key:
`releases/gigi/0.3.5/GiGi-0.3.5-arm64-private-beta.dmg` in
`create-something-assets`; public URL
`https://media.createsomething.io/releases/gigi/0.3.5/GiGi-0.3.5-arm64-private-beta.dmg`.
Parent must check key absence and anonymous404 immediately before no-overwrite
upload, then completely redownload, hash/size and rerun full verifier before
changing canonical pages. This document does not assert key absence.

Local re-verification command (from worktree; replace SHA with recorded source):

```sh
node apps/gigi-desktop/scripts/verify-release.mjs \
  "$PWD/.cache/gigi-release-035/GiGi.app" \
  "$PWD/.cache/gigi-release-035/GiGi-0.3.5-arm64-private-beta.dmg" \
  --source-sha <clean-build-source-sha>
```

Retain qualified034 app/DMG and its evidence. Before any source reversion, retain
a backup; older binaries ignore additive memory tables. Do not restore an old
backup to roll back UI: it may resurrect forgotten content. If public promotion
fails, restore canonical metadata to the then-current verified public release.
Current verified public rollback is 0.3.4: 91,823,696 bytes, SHA-256
`2abef152aea7f751080efaac9a79a8ddbfc02de58d5a93222d3acc53d9be62af`,
`https://media.createsomething.io/releases/gigi/0.3.4/GiGi-0.3.4-arm64-private-beta.dmg`.
The separately qualified historical 0.3.1 fallback remains preserved; prefer the
current verified 0.3.4 identity when reverting a later 0.3.5 page promotion.
Keep immutable objects and local data.

Worktree disposition: preserved at
`/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-0597f042`, branch
`t3/gigi-workspace-agent-memory`, until parent promotion. CRE-2382 stays open.

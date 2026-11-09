# GiGi memory-bearing 0.3.5 candidate — CRE-2382 / PR #2222

Authority: prepare scoped source and a local signed/notarized public candidate.
Parent owns exact-head review, integration and promotion. No merge, immutable
upload, download-page change, publication, deploy, installed-app mutation or
Slack/email is performed in this lane.

## Source and release identity

PR #2220 remains OPEN at published `a4c3500bc3ad5be0ca5d1dbbe56e765e52c081cc`
at synchronization. That head is merged only into `t3/gigi-workspace-agent-memory`.
Its clean memory-free 0.3.4 artifacts and release evidence are retained unchanged.
PR #2222 remains stacked on #2220; if #2220 merges, parent retargets #2222 to main,
synchronizes main if needed, and reviews the resulting exact head.

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

Candidate outputs and logs are under worktree `.cache/gigi-release-035/`; final
artifact identities, build provenance and signing/verifier receipts are recorded
there and in Linear. Neither prior 0.3.4 artifacts nor installed public/DEV apps
may be overwritten. Sanitized native/provider evidence is in
[NATIVE-QUALIFICATION.md](NATIVE-QUALIFICATION.md); QA is not release qualification.

## DEV parity handoff (read-only assessment)

Canonical Grantbot repository default branch is
`migration/grantbot-complete-handoff-2026-08-25`, head
`3a961ac9b6eb2ac5671950cae6d735754eb8fdb3` (read 2026-11-09). It includes PR1431
and the 0.3.3 Astryx/recovery work. DEV PR1432 is still OPEN at
`5874fbc0ed10ff04e76e46a5f5751fc63b0837c7`; it owns the 0.3.4 receipt correction
and its distinct `co.halfdozen.gigi.dev` candidate. The canonical config is `sandbox/gigi-desktop/apps/gigi-desktop/src-tauri/tauri.conf.json`, whose
canonical source currently declares public identity and 0.3.3. A DEV artifact's
override/identity cannot be inferred from that canonical file. Existing DEV034
qualification evidence belongs to its exact source and separate packaging.

Later DEV owner must start from current canonical plus the reviewed/merged1432
receipt correction, preserving any newer Danny commits and unpublished device
work. Do not blanket-copy this monorepo or replace that checkout. Transfer the
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
Known verified fallback031: 85,090,374 bytes, SHA-256
`6cc6de0975e1f2819d351c991df5b783352c32377e0bbe5df133061b1555d091`,
`https://media.createsomething.io/releases/gigi/0.3.1/GiGi-0.3.1-arm64-private-beta.dmg`.
Keep immutable objects and local data.

Worktree disposition: preserved at
`/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-0597f042`, branch
`t3/gigi-workspace-agent-memory`, until parent promotion. CRE-2382 stays open.

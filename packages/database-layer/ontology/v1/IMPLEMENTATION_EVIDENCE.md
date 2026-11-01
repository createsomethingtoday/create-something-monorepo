# Local implementation evidence

Date: 2026-10-31 (America/Chicago).
Scope: additive local ontology tooling in `@create-something/database-layer`.
No topology source snapshot, generated Worker state, production service, or
third-party record was changed.

## Acceptance and verification

- Module composition is deterministic across order; identical shared records
  deduplicate; conflicting records and duplicate module-local IDs fail.
- Invalid enum terms, malformed evidence, unknown roots and dangling references
  fail. Existing empty root-package path is preserved.
- Dependency impact traverses baseline and proposed graphs, terminates on cycles,
  preserves removed-edge impact, and rejects protected-node impacts.
- CLI exports deterministic RDF, OWL vocabulary and SHACL constraints, refuses
  overwrites, and makes review/verification limits explicit.
- Engine verifier isolates input copies, uses memory storage and `--no-connect`,
  bounds runtime/output, requires complete structured responses and conformance,
  and records SHA-256 digests for checked bytes and engine binary.

Commands exercised:

```sh
node --test packages/database-layer/test/*.test.mjs
node node_modules/typescript/bin/tsc --noEmit -p packages/database-layer/tsconfig.json
node node_modules/typescript/bin/tsc -p packages/database-layer/tsconfig.json
node packages/database-layer/scripts/ontology.mjs check
node packages/database-layer/scripts/ontology.mjs export /tmp/substrate-ontology-bundle-20261031
node packages/database-layer/scripts/verify-ontology-engine.mjs /tmp/substrate-ontology-bundle-20261031 /tmp/open-ontologies-v2.1.0-substrate
git diff --check
```

Results: 217 package tests passed, including 10 new ontology tests; TypeScript
check/build passed. Current local snapshot: 552 nodes, 1,156 edges. Canonical digest:
`1f73ab0a5dd574d92f2ce838d04a5e7805a1f015af200b1a79ad517b05e09091`.

RDFLib 7.6.0 parsed 12,508 topology triples. pySHACL 0.40.2 accepted the exported
graph and rejected a forged tier. Open Ontologies v2.1.0 Darwin arm64 accepted
vocabulary and SHACL constraints; the same verifier rejected a forged tier with
exit 1 (`SHACL conformance not established`). Mock-engine regression checks also
reject exit-zero nonconformance, incomplete batches and malformed JSON.

Engine asset SHA-256:
`493f6db51550112528d19f3ca88caf133b46c2a9054a195a98bc588b57ba07b6`.
Binary and Python validation environment were temporary local verification aids,
not new package dependencies. The engine receipt covers only vocabulary and SHACL;
no Lean certificate, live state, deployment or human product acceptance is claimed.

## Initial local quality gates and delivery boundary

- Functional correctness: passed locally, including actual external-engine execution.
- Perceptual/product quality: not applicable to this nonvisual data/CLI change.
- Release readiness: blocked for production promotion. Linear wrapper returned
  `LINEAR_API_KEY is required.` The preexisting shared checkout is dirty and
  `main` is ahead 3 / behind 229; unrelated work was preserved. No PR or deployment
  was attempted. A fresh promotion branch and tracked evidence remain necessary.

Rollback: remove the additive ontology files, package script/export additions,
README section and the two-line refresh check hook. No data migration is required.

Worktree disposition: preserved at
`/Users/createsomething/Code/create-something-monorepo` (existing shared checkout).

## CRE-2314 promotion validation

The follow-up runs from an isolated branch/worktree based on `origin/main`
`3b095a0163e63e9ef829405d8492edfd478e01a0`:
`/Users/createsomething/Code/create-something-worktrees/cre-2314-agent-worktree`,
branch `codex/cre-2314-substrate-ontology`. Linear access was restored through the
existing Infisical production command; no new credentials or setup were added.
The shared checkout and its unrelated changes remain preserved.

The new source snapshot has 555 nodes and 1,164 edges; its canonical digest is
`a167b39c32d946947fd08fe42ada9c11313cca113749cb49985ed983b0d45694`.
Using the repository-pinned Node 22.23.4 and pnpm 9.15.0 after worktree bootstrap:
package build, typecheck, and all 218 package tests pass. RDFLib parsed 12,588
triples; pySHACL accepted the projection. Actual Open Ontologies v2.1.0 accepted
vocabulary and SHACL constraints and rejected an export missing an owner field.

The Agent Wiki CI workflow now runs the ontology regression suite and structural
check on pull requests and main pushes. It needs no external engine installation,
network service or secret. Real-engine evidence remains a separate local check.
Package dry-run inspection checks that the new ESM export and its contract ship
together. The generated topology and Worker state remain unchanged.

Functional correctness: passed locally against the current branch base.
Perceptual/product quality: not-applicable for data tooling.
Release readiness: local checks passed; PR and required CI govern promotion.
No separate Worker deployment or npm publication is needed for this repository CLI
and refresh-pipeline integration. Formal certificates and live state remain untested.

Worktree disposition: retained until PR promotion and merged-source verification.

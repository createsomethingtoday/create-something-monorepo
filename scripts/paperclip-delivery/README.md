# Bounded autonomous delivery policy v1

These artifacts do not enable agents, restart Paperclip, mutate historical tasks, bypass approval controls or dispatch work. Parent applies them only to the explicitly authorized pilot after verifying native schema and capabilities. No executable example contains substitute IDs. Supply a complete real packet; missing fields reject.

`assignment.schema.json` defines versioned authority and scopes as data. `stage-evidence.mjs` additionally validates isolated worktree, distinct role IDs, exact source/review/CI/build/deployment linkage and native state freshness. Native case/run/lease state is authoritative; per-stage execution issues remain linked execution records. The caller must fetch native state, map it explicitly to the documented normalized view, verify receipts against real systems, and perform transition with native concurrency protection; this predicate cannot authenticate caller-supplied claims or atomically dispatch. Native revision means an actual native revision/ETag or a canonical digest of fetched native transition-relevant fields, never a locally incremented counter.

Normalized native view: source=paperclip-api, caseId, companyId, readAtMs, revision, pendingStage, activeWriterRunIds, writerLeases (runId/workspace/repo-relative paths when multiple writers), unresolvedOutcomes (count), recoveryRequired (boolean). Target labels are policy concepts, not claims about native API enum names. A stage may only advance when native lifecycle agrees; no parallel local state machine.

Recovery needs confirmed predecessor stop and released lease, settled effects, verified checkpoint, corrected cause and the same scope. Bounded retry counters must come from native run history. Failed review returns to the same engineer and invalidates old review/CI. Unknown deployment effects are read back before retry.

Run `node --test scripts/paperclip-delivery/*.test.mjs` from the repository root. Tests prove predicate behavior only. Qualification additionally requires an actual automatic failed-review repair, interruption recovery, CI/merge/deploy/live-verification chain with zero human shuttle actions.

User steering grants every role scoped agent creation, skill creation and parallel delegation. Required `delegation` data carries `{createAgents:true, createSkills:true, parallel:true, scope:"parent-assignment"}`. The four baseline identities do not cap delegation. `validateDelegation` requires inherited parent scope/boundaries and reviewer independence; its `nativeScopedParentVerified` flag must be grounded in fetched native ancestry, never self-asserted by a delegate. `validateParallelWriters` permits nonoverlapping repository paths in separate owned workspaces and rejects overlapping paths, traversal and shared workspaces. Skills are task artifacts, not permission to change unrelated global instructions. Agent creation never authorizes purchases, new providers, identity changes or unrelated backlog work.

## Validation CLI

Requires Node 22 or newer; no package installation is needed. From this directory:

```sh
node cli.mjs assignment /absolute/path/to/assignment.json
node cli.mjs stage /absolute/path/to/assignment.json /absolute/path/to/native.json /absolute/path/to/evidence.json review
node cli.mjs recovery /absolute/path/to/assignment.json /absolute/path/to/native.json /absolute/path/to/recovery.json
node cli.mjs delegation /absolute/path/to/assignment.json /absolute/path/to/delegation.json
node cli.mjs manifest .
node cli.mjs verify-manifest . manifest.json
```

These paths describe required inputs, not executable production examples. Supply
real files, with authorization verified against the assignment source. Exit 0
means the supplied data satisfies the predicate; exit 1 rejects. JSON output
explicitly reports `providerVerified: false`. No CLI command calls a provider,
changes native state or authenticates receipts. Native snapshots expire after
30 seconds; the CLI uses the current clock and exposes no clock override.
Recovery inputs must include `nativeRevision` matching the fetched revision.

`assignment.schema.json` is enforced alongside semantic checks using the bundled
`assignment-schema.mjs`, a dependency-free interpreter for this schema's limited
vocabulary. It is not a general JSON Schema validator. Unknown assignment keys,
noncanonical paths and duplicate list entries reject. Deployment still requires
physical worktree/path ownership checks; lexical predicates cannot prove ownership
or detect every filesystem alias.

The stage evidence shape is defined by the public functions in
`stage-evidence.mjs` and exercised in `stage-evidence.test.mjs`. Those test fixtures
are synthetic unit evidence only. Recovery/delegation flags and native ancestry
must come from independently checked native state, not the delegate's assertion.

## Content inventory and release

`manifest.json` inventories every regular file beneath the pack directory except
itself, sorted deterministically with byte lengths and SHA-256 hashes. Symbolic
links and nonregular files reject. Generate only from a frozen owned source tree;
this is not a concurrent filesystem snapshot. Regenerate after each source change:

```sh
node scripts/paperclip-delivery/cli.mjs manifest scripts/paperclip-delivery > scripts/paperclip-delivery/manifest.json
node scripts/paperclip-delivery/cli.mjs verify-manifest scripts/paperclip-delivery scripts/paperclip-delivery/manifest.json
```

Review and commit the generated manifest. It contains no source commit SHA, avoiding
self-reference. Release derives the inventory again from the exact merged checkout,
compares it with this committed manifest, and binds the merged SHA and manifest's
own SHA-256 in the native release receipt. Publish the manifest itself and compare
its exact bytes separately. Extra files in provider inventory must be reconciled;
matching only a subset is insufficient. Follow [RELEASE.md](RELEASE.md) for the
provider operations and non-destructive rollback.

## Qualification evidence

Pending first independent review, deliberately and transparently under the
CRE-2128 qualification plan. Engineering must populate real interrupted predecessor,
native retry successor, review request event and repair successor IDs after the
native reviewer requests changes. No review request or repair successor exists at
this first implementation handoff. This section is an acceptance hold, not a claim
of completed qualification. Tests and library publication cannot prove automatic
recovery, review routing, agent attachment, runtime use or website delivery.

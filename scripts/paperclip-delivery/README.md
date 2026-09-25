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

The first-review acceptance hold was exercised through native `request_changes`.
The following records were re-read on 2026-09-25 during engineering repair round 1.
Links beginning `/CRE/` or `/api/` are relative to the owning Paperclip instance.
Stable case: `f9ee28a7-b1bb-469f-ac68-3a752a077d3f`; canonical scope:
[Linear CRE-2128](https://linear.app/createsomething/issue/CRE-2128).

| Checkpoint | Native evidence and observed outcome |
| --- | --- |
| Deliberate pre-write interruption | [CRE-50](/CRE/issues/CRE-50), issue `736aee38-a67a-41dd-bbf3-d62eb2de32a5`; [predecessor run `fbb6d28b-cd9a-4d55-b4c2-501e2e190922`](/CRE/agents/dc4b6a82-f78b-4917-bfea-b4b5c332c305/runs/fbb6d28b-cd9a-4d55-b4c2-501e2e190922) was cancelled at `2026-09-25T17:39:17.380Z`. The pre-write checkpoint SHA-256 is `120fec6d9074ab8214e20ddd1f06a7661d55459823b841530fa331f682d7ddb7`. Native issue execution is released; recorded predecessor PIDs were absent at repair preflight. |
| Native current-stage retry | [Case events](/api/cases/f9ee28a7-b1bb-469f-ac68-3a752a077d3f/events): request `91f71d5c-29dc-45bb-9687-544bfb7989c2`, dispatch `3b0a2047-7c1c-4bd6-b59d-58b989af80aa`, attempt `d240070d-a5b4-4d81-b784-4eac358f714c`. Native automation created [CRE-52](/CRE/issues/CRE-52), issue `33404742-a70b-40d5-82cb-a331fb57767a`, via routine run `cdb20bcc-7a5d-4ae8-b4d3-afbc1d8434e2`. [Successor run `3a0e142a-61a7-4e3f-9dfe-86e6bdb2562a`](/CRE/agents/dc4b6a82-f78b-4917-bfea-b4b5c332c305/runs/3a0e142a-61a7-4e3f-9dfe-86e6bdb2562a) started automatically and failed with `provider_quota`; it did not complete implementation. |
| Configuration failure and human restoration | [Later run `73d65736-fcd7-49f4-959f-aed01e1486e2`](/CRE/agents/dc4b6a82-f78b-4917-bfea-b4b5c332c305/runs/73d65736-fcd7-49f4-959f-aed01e1486e2) failed with `configuration_incomplete` before a process started. The [case fields](/api/cases/f9ee28a7-b1bb-469f-ac68-3a752a077d3f) record user-restored login, a passing native auth/hello probe at `2026-09-25T17:50:44.139Z`, and supported board restoration of action `37caf5f5-9ddb-4c3f-8d2f-1f466c8c8431`. The current recovery-actions endpoint returns no active action and no historical actions; this historical resolution is attributed to case fields and the [engineering recovery receipt](/CRE/issues/CRE-52#comment-30cea3ca-79e4-42e7-bd56-2baf48a8c2f7), not an independently retrieved action record. No autonomous account-restoration claim is made. |
| Resumed implementation | [Run `9d35b96b-6f33-478c-9643-3264945d03ff`](/CRE/agents/dc4b6a82-f78b-4917-bfea-b4b5c332c305/runs/9d35b96b-6f33-478c-9643-3264945d03ff) succeeded after restoration, submitting `2f70b3576e7cc2c34c29459ef81f962e3d527e97` and native transition event `22d7ee12-5fa9-4126-b170-7463169f44e7`. [Implementation receipt](/CRE/issues/CRE-52#document-implementation-9d35b96b-6f33-478c-9643-3264945d03ff) records 57 passing tests on Node 22 and 24 and the deliberate first-review hold. |
| Independent request changes | [CRE-61 review receipt](/CRE/issues/CRE-61#document-review-b81b1ad9-69f4-4872-b31f-9d683d23c54b), issue `b5f2450d-ef83-473c-941f-ee3d617b9762`, reviewer run `b81b1ad9-69f4-4872-b31f-9d683d23c54b`. Native `review_decided` event `3c642676-0ee5-4e91-ba15-a2fca0ed6f3b` records `request_changes`; transition `de6aece9-9ecc-4230-adb2-624538849268` returned the case to implementation. Findings: populate this evidence and document scoped configuration recovery authority. |
| Automatic repair successor | Native `automation_executed` event `28dabda4-54bc-4f89-94dc-cf530c72e1f8` created [CRE-63](/CRE/issues/CRE-63), issue `c64d63a0-9efe-41c9-9f26-b8bf3a2721fd`, via routine run `231f1037-8aad-4658-9898-6b9d0e430075`. [Repair run `e23619fb-14ea-4f12-af5e-a9f81cd4d84f`](/CRE/agents/dc4b6a82-f78b-4917-bfea-b4b5c332c305/runs/e23619fb-14ea-4f12-af5e-a9f81cd4d84f) owns the checked-out issue and is running while preparing this record. Native automation dispatched it; engineering did not manually wake it. Fresh independent review and exact-revision CI are required for the repaired source. |

These records establish interruption/retry dispatch and request-changes/repair
routing. They do not establish uninterrupted autonomous recovery through the
login failure, repair approval, merge, production deployment, agent attachment,
runtime use or full behavior qualification. Production and live acceptance remain
pending. Terminal success, tests and library publication are separate evidence
from native stage completion. See [coordinator guidance](coordinator.md#scoped-configuration-recovery)
for the supported configuration recovery path and its retained uncertainty holds.

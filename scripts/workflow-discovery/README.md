# Workflow discovery and reconciliation

This internal Automation workflow discovers recurring repository procedures and compiles approval-required review candidates. It repairs missing or corrupted files in its own output directory. It does not execute discovered scripts, change source contracts, register runtime workflows, or activate customer workflows.

## Run and inspect

From a bootstrapped checkout on the pinned Node version:

```sh
pnpm bootstrap:worktree
pnpm workflow:discover:test
pnpm workflow:discover run --out /tmp/workflow-discovery
pnpm workflow:discover verify --out /tmp/workflow-discovery
```

The output directory must be outside the checkout and cannot contain it. A new directory receives an ownership marker. Existing directories require that marker; arbitrary directories are refused. `current.json` points to an immutable generation with `catalog.json`, a hash manifest, and candidate definitions, compiled bundles, and unreviewed review records. Compiler output establishes structural validity only. These bundles are not signed runtime registrations or deployment credentials.

Review `catalog.json` for source paths, SHA256 values, script JSON pointers, unresolved ownership/execution/activation requirements, and capacity-deferred candidates. The scanner reads the root and direct `packages/*` and `apps/*` manifests, canonical `packages/*/workflows/*/workflow.json` definitions, and direct GitHub workflow files. GitHub workflows are inventoried by hash; their YAML steps are not inferred as business procedures. Only package script names enter proposals; script bodies are never executed or copied into candidates. Canonical workflow definitions must already compile. Symlinks, malformed sources, and resource bounds hold the run instead of changing inputs.

Three explicit heuristics propose package validation, release evidence, and contract reconciliation. Each candidate contains approval-required **decision** stages for reviewing script contracts, with an unassigned operator role. The order is a review order, not a runnable deployment sequence. At most 64 candidates are emitted; all remaining proposals are listed as deferred. This is a bounded inventory, not a claim to discover every workflow.

## Optional previous-session signals

Local CTX access is optional and never used by GitHub Actions:

```sh
pnpm workflow:discover collect-history --repo /path/to/create-something-monorepo --out /tmp/workflow-history.private.json
pnpm workflow:discover run --history /tmp/workflow-history.private.json --out /tmp/workflow-discovery-with-history
```

Use the indexed repository path for `--repo`, since CTX scopes search by its directory name. The collector searches three fixed patterns in the existing primary-session index with refresh disabled, at most four hits each, and hashes bounded event reads. Its private output uses exclusive creation and mode 0600 outside the repository. Delete it when no longer needed. Collection failures hold rather than silently substitute evidence. The catalog removes event/session identifiers and retains only counts and hashes. These are retrieval signals, not verified successful outcomes, complete session coverage, or authorization. Signals older than seven days are marked stale.

## Repair and recovery

Run again against the same owned directory. Verified unchanged inputs reuse the generation. Changed sources create a new generation. Missing or corrupt generated files trigger one regeneration and independent hash verification before atomically updating `current.json`. The prior generation remains available for diagnosis. Invalid source or history holds before publication, preserving the last good pointer. This is bounded derived-artifact repair, not autonomous repair of business workflows or policies.

A per-output exclusive lock rejects concurrent writers. After a crashed process, first establish that no writer remains, then remove only `.discovery-lock` and rerun. An invalid ownership marker requires operator investigation. Do not add a marker to an arbitrary directory. Old local generations are not automatically deleted; remove an entire no-longer-needed owned output directory after retaining required evidence. Rollback is to disable the scheduled workflow and retain the last verified artifact; there are no runtime activations to reverse.

## Scheduled deployment

`.github/workflows/workflow-discovery.yml` runs on weekdays at 08:23 UTC and supports manual dispatch on the default branch. GitHub may delay scheduled execution. Scoped pull requests also qualify the loop. It uses read-only repository permissions, pinned actions, the repository bootstrap, tests, a real scan, and independent manifest verification. Each run starts fresh in runner temporary storage; repair across scheduled runs is not implied. Repair fault cases are exercised by tests. Candidate artifacts are retained for 14 days, including the ownership marker needed by `verify`.

After merging through repository checks, dispatch `workflow-discovery.yml` on `main`, inspect the run, download its artifact, and run `verify` against the extracted output root. A passing local fixture or merged YAML alone is not deployed-run acceptance. Customer workflows still require source access, explicit ownership, reviewed execution contracts, policy approval, registration, and their own acceptance runs. Existing Marketplace source pins and the draft graph runtime activation remain separate.

# Internal workflow operations

This internal Actions/terminal host turns one reviewed discovery candidate into a registered read-only validation run. It executes only the pinned ontology check, records signed compiler/runtime artifacts and immutable checkpoints, and derives an evidence graph from the actual run. It does not register a customer Control executor or create Agency activations.

## Execution contract

`registration.json` binds `internal.database-layer.contract-validation@1` to the canonical workflow definition, fixed Node argv, source/library/contract/topology SHA256 values, owner `create-something-engineering`, a 15-second timeout, 1 MiB output bound, and read-only effects. The owner is a repository role, not a verified individual assignment. Changes to those files hold execution until their pins and reviewed registration are promoted through a PR. Discovered package-script bodies are never dispatched. A model selection cannot expand this registry.

The actual Jev advisory call retained in `docs/evidence/CRE-2328/jev-priority.json` selected `ontology-check` from three observed validators and `defer`. It used the existing Decisions service and Jev transport, `jev-1.13.0`, a five-second deadline, source-state revalidation, no retries, and immutable receipt readback. It establishes a real ranking request, not improved workflow quality. Scheduled execution uses the reviewed registry and deterministic fair discovery; it does not silently call a model or need a provider key.

## Run and verify

```sh
pnpm bootstrap:worktree
pnpm workflow:operations:test
node scripts/workflow-operations/runtime.mjs run --out /tmp/internal-validation
node scripts/workflow-operations/runtime.mjs verify --out /tmp/internal-validation --trusted-key /tmp/internal-validation.trusted-public.pem
node scripts/workflow-operations/runtime.mjs reconcile --out /tmp/internal-validation --trusted-key /tmp/internal-validation.trusted-public.pem
```

Use a new output directory outside the source tree. The compiler artifact is signed by an ephemeral per-run host key; only its public key is retained as a sibling file. Keep that key and the owning Actions run provenance independently. Replacing both a generation and its alleged trusted key defeats a local integrity check; bundled public keys are not an external trust root. No private signing key is persisted.

A signed effect intent is persisted before the fixed subprocess. Successful and failed results retain output hashes, not raw command output. Verification rechecks registration, signed artifact identity, checkpoints, receipt-chain consistency, observation signature, and exact derived graph bytes. A separate verification process never executes the validator. Do not treat a test-injected executor as live execution evidence.

`explanation.json` states status, reason, execution-owner provenance, evidence requirements, registration/receipt hashes, and freshness. The exported graph remains an **unattested offline projection** with caller-declared scope. The `explainInternalValidation` API rejects a mismatched internal scope and labels observations older than an hour stale, but it is not an authenticated tenant API. Draft PR #2163's customer Control path still needs genuine Agency registration, Identity access, source adapters, and canonical bindings. This internal run does not bypass those gates.

## Lifecycle and durable state

Discovery now indexes every proposed candidate identity, including candidates deferred from compilation. The bounded compiler selection alternates contract reconciliation, release evidence, and package validation so releases cannot consume the entire window. This is coverage fairness, not an outcome-quality ranking.

`reviewed-candidates.json` is the PR-reviewed link between the discovered database-layer procedure and the separate canonical execution registration. Approval binds exact candidate source/definition hashes and the host registration policy hash. The generated discovery definition remains approval-required review stages; the canonical registered workflow explicitly defines the executable ontology check. They are distinct artifacts connected by a reviewed mapping.

The lifecycle records `discovered`, `reviewed`, `registered`, `rejected`, and `superseded`. A source/definition change supersedes the old version. Every reconciliation clears active stored approval metadata and reapplies only the current reviewed source configuration. Missing or mismatched policy never inherits authority from the data ledger. Reintroduced source versions require current review again.

On default-branch scheduled/manual runs, a separate job verifies the downloaded runtime artifact again and persists descriptive state to `data/workflow-discovery/lifecycle.json` on the dedicated `automation/workflow-discovery-state` branch. The repository Contents API uses the existing blob SHA for compare-and-swap and independently reads the result back. Creation uses an explicit data branch; it never writes `main`, source contracts, or approval policy. Missing state on an existing branch, malformed state, conflicts, capacity overflow, and failed readback hold rather than reset or retry. The branch contains no execution authority and is never merged into main. Git history retains state changes; the current file retains at most 4,096 lifecycle versions and the latest 512 run summaries. Older summaries remain in Git history. Snapshot counts describe retained runs, not lifetime success rates.

Pull requests perform reconciliation without shared-state writes. Only the default-branch persistence job receives `contents: write`, and its token is exposed solely to the fixed publisher step. Raw transcripts, provider keys, credentials, signing keys, and raw command output do not enter shared state. Local CTX remains optional in discovery and absent from this scheduled host.

## Bounded recovery and escalation

- A nonzero validator result becomes a terminal failed run and a held outcome. Investigate the pinned source contract and propose a normal reviewed fix.
- A timeout, host error, changed source, or uncertain invocation leaves an ambiguous/prepared attempt requiring operator reconciliation. Never replay that attempt automatically.
- `reconcile` may regenerate missing/corrupt derived graph/input/explanation files once from verified signed source evidence. It performs zero command dispatches. Invalid signed evidence cannot be repaired this way.
- A new output directory creates a distinct scheduled run. It does not resume or retry a prior ambiguous run. Prior attempts remain in retained run artifacts and state history.

Actions failure status is the escalation signal; no message is sent to another person automatically. Evidence survives the failure via the always-upload step when output exists. If failure occurs before runtime allocation, no run receipt is invented. Shared-state publication then holds.

## Promotion and rollback

`.github/workflows/internal-workflow-operations.yml` qualifies pull requests, supports manual dispatch, and schedules weekdays at 08:43 UTC. Merge through normal checks/review, dispatch on main, inspect both jobs, download the artifact, verify the signed runtime against its retained public key and trusted Actions provenance, then independently read the dedicated state branch. A local run or merge alone does not establish deployed acceptance.

Disable this workflow to stop scheduled execution/publication. Preserve the data branch and prior evidence for investigation; no customer activation or source mutation needs reversal. Never force-reset or delete state to make a failed check pass. The earlier discovery-only schedule remains read-only and continues independently.

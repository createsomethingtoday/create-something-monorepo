# Workflow Compiler production goal

## Objective

Publish and independently verify `@create-something/workflow-compiler` as a public, composable local/CI builder product, then publish the fixed-scope CREATE SOMETHING integration offer that turns the builder wedge into qualified agency work.

Linear map: CRE-1831. Delivery issues: CRE-1834, CRE-1832, CRE-1837, CRE-1833, CRE-1836, and CRE-1835.

## Baseline

- CRE-1191 proves a deterministic read-only compiler prototype.
- CRE-1219 proves a 20-case, zero-mutation shadow pilot.
- CRE-1221 proves an authenticated exact queue-only production read.
- The package is not present on the public npm registry.
- Inputs cross the CLI boundary through unchecked type assertions, artifact writes are not atomic, the delivery host verifies only a hash, and the current examples cover one Webflow-oriented workflow.
- The repository root contains unrelated protected work. All implementation happens in issue worktrees based on exact `origin/main`.

## Observable outcome

A builder starting from a disposable supported-Node project can install the exact public registry version, run the five-minute quickstart, validate good and bad workflow inputs, compile deterministic governed bundles for two distinct workflow verticals, verify local attestations and tamper failures, and connect the result through documented MCP and OpenAI/Codex adapter contracts. A CI consumer can convert pass, wait, and stop outcomes into stable process results. The public agency surface offers one fixed-scope implementation engagement without implying a hosted control plane.

## Primary verifier

From disposable clean consumers on every supported Node major:

1. Install the exact public npm version without workspace links.
2. Run the published CLI and library quickstarts against both public examples.
3. Confirm identical inputs produce byte-identical governed artifacts and verification receipts.
4. Confirm malformed input, unknown versions, path escape attempts, missing evidence, approval waits, and tampered artifacts fail closed with stable structured diagnostics and exit codes.
5. Exercise MCP and OpenAI/Codex adapter fixtures without network or third-party mutation.
6. Confirm registry metadata, dist-tag, license, repository commit, provenance, and trusted-publisher configuration match the merged release source.

The public agency page is verified independently on production desktop and mobile routes, including its primary conversion path.

## Anti-cheating constraints

- Tests must use public package exports or the real CLI, not private implementation shortcuts.
- Clean-consumer proof must install from the registry after publication; a tarball-only check is supporting evidence, not completion.
- Publication staging, operator approval, npm receipt, registry readback, provenance, trusted-publisher readback, and clean-consumer execution remain separate checkpoints.
- No test may claim a signature or attestation by comparing an expected hash alone.
- No live write, approval execution, or third-party mutation is introduced to prove the local/CI product.
- Existing downstream workflow packages must remain compatible or receive explicit, tested migrations in the same promotion.
- Do not alter, clean, reset, or absorb unrelated root-worktree changes.

## Constraints and non-goals

- Production v1 is a local and CI compiler, not a hosted multi-tenant control plane.
- Core compilation stays provider- and runtime-neutral. Codex/OpenAI is the primary documented adapter path; MCP remains composable.
- Database, Automation, and Judgment ownership must remain explicit in schemas, artifacts, and docs.
- Policy remains an artifact. Unknown schema versions, policies, and integrity states fail closed.
- Hosted identity, tenant storage, live workflow execution, SaaS billing, GPU inference, and automatic marketplace decisions are out of scope.

## Approval gates

- The operator has authorized implementation, public npm publication, and the fixed-scope public service path by asking to complete the recommended production plan.
- Any native npm security-key or passkey challenge must be surfaced for human completion; it must not be bypassed or treated as success before readback.
- Stop for newly required credential, ownership, billing, or permission changes that were not part of the approved release path.
- Production promotion proceeds only after the relevant PR and protected checks pass, with an explicit rollback path.

## Iteration and blocker standard

Work test-first through the smallest public vertical slice, run the narrow verifier after every behavior change, then run downstream and package-level gates before promotion. On failure, record the exact command and output, repair the earliest Database, Automation, or Judgment layer responsible, and rerun the same verifier before expanding scope.

A blocker is valid only after three consecutive goal turns reproduce the same external authorization or state constraint and no safe in-scope path remains. Hard work, a failing test, or an incomplete phase is not a blocker.

## Completion proof

- Linear map and every delivery issue include validation evidence and worktree disposition.
- Implementation is committed, reviewed through the repository gate, merged to `main`, and identified by exact SHA.
- Protected CI, supported Node matrix, package tests, downstream tests, security checks, and clean tarball consumers pass.
- The public npm version owns the intended dist-tag and independently passes registry metadata, provenance, trusted-publisher, and clean-consumer verification.
- The fixed-scope agency page is merged, deployed, and verified on the live surface with a rollback note.
- The dirty root remains unmodified by this goal.

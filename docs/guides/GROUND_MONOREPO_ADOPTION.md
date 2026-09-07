# Ground in the CREATE SOMETHING monorepo

Use a checkout containing Ground 0.4.0's strict native policy. An older checkout
may contain unsupported `.ground.yml` fields even when npm supplies the current
binary. A rejected policy is an adoption failure; do not bypass it with defaults.

From the updated repository checkout:

```bash
pnpm bootstrap:worktree
pnpm ground
pnpm ground:adoption
```

`pnpm ground` builds the native engine, validates policy and workspace discovery,
reviews changed supported files, and runs the repository import, component, and
experiment checks. It does not assert that all code in every package is clean.

`pnpm ground:adoption` runs the exact npm version declared in
`packages/ground/npm/package.json` against real repository source through CLI
and MCP stdio. It requires a clean checkout before and after analysis so the
receipt identifies the actual analyzed commit. Commit reviewed changes first;
use `pnpm ground` for development review of uncommitted changes.
It uses a temporary database and checks these reviewed cases:

- Ground's pilot helpers share one `workspace-root.ts`. The deliberate
  `normalizeCustomerId` duplicate fixture must still produce a review-only finding.
- `mcp-core` has complete duplicate and orphan coverage. Its ESLint configuration
  is a declared entry point because `scripts/evidence-lint-pilot.mjs` passes that
  exact file to ESLint using `--config`.
- Duplicate and orphan scan counts must retain their reviewed denominators;
  an empty or partial scan cannot replace the baseline and still pass.
- Batch dead-export coverage remains `NOT_APPLICABLE`; the verifier separately
  invokes `ground_find_dead_exports` for the exact reviewed set of 18 TypeScript
  source modules, including modules with zero candidates. Discovered and checked
  inventories must match the baseline, and every module must retain its reviewed
  parsed-export count. Missing modules and reduced parser coverage fail verification.
- Package-local dead-export candidates must exactly match the reviewed
  adjudication in both directions and still be explicitly re-exported through
  the public entry point. Additions, omissions, duplicate candidates, and public
  API removals fail the verifier and require review.

Save a receipt when handing off work:

```bash
pnpm ground:adoption --output /tmp/ground-adoption-receipt.json
```

The `ready` result means these checks passed with the documented dispositions.
It does not mean that every export has a consumer or that Ground replaces
package-owned tests, compilers, lint rules, or runtime acceptance.

## Policy scope

Manual entry-point paths in Ground 0.4.0 are relative to the analysis root.
The repository `.ground.yml` declares the full package path, and
`packages/mcp-core/.ground.yml` declares the filename for package-scoped runs.
Keep both exact declarations aligned with the lint runner. Do not replace them
with an ignore glob: the file should remain scanned and its entry-point evidence
should appear in the result.

Ground 0.4.0's `extends` merges arrays; scalar thresholds are local to the policy
file. The package policy explicitly preserves the repository's 85% duplicate
similarity and five-line minimum. The adoption verifier checks the effective
similarity threshold.

## Reviewed findings

[The adjudication artifact](../internal/ground-adoption-adjudication.v1.json)
records CRE-1944's decisions:

| Finding | Decision and evidence |
| --- | --- |
| 21 `findWorkspaceRoot` pairs | Consolidated seven copies of environment lookup into one pilot utility. Existing CLI, MCP, benchmark and package tests still exercise their original behaviors. |
| One `normalizeCustomerId` pair | Retained as the positive detector fixture; a clean duplicate result here would be a regression. |
| `eslint.evidence.config.mjs` orphan | Retained and declared as a tool entry point; the real lint command loads it successfully. |
| 49 package-local dead-export candidates | Retained as public API. Every candidate is explicitly re-exported by `src/index.ts`; external users include `notion-sync-mcp`, `zendesk-mcp`, and fleet Workers. This does not claim an external consumer for every symbol. |

When starting from a dirty older checkout, use the repository's claimed-worktree
workflow on current `origin/main`. Preserve the original checkout and record its
ownership rather than overwriting unrelated local changes to install Ground.
Run these commands from the updated checkout and keep its path with the handoff.

## Promotion and rollback

These policy and pilot-support changes are delivered through the repository PR
boundary. They do not change the published npm payload or native binary and do
not require another npm version. Verify the exact existing published package
against the merged repository state after promotion.

To roll back the adoption changes, revert the CRE-1944 merge through the normal
review workflow. Keep npm 0.4.0 pinned unless a separate native release regression
requires a release rollback. The positive fixture and all public APIs remain intact.

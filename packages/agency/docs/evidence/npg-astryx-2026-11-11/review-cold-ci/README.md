# Cold CI correction — CRE-2409 / PR2252

The c3fb751 CI failures share an NPG initialization-order regression:

- [Strict check](strict-red.txt): `npg:typecheck` inherited a generated Kit config that did not exist (TS5083/TS5095).
- [Authz](authz-red.txt): install preparation ran the NPG build before dependency preparation and Kit synchronization. Vite failed on the missing config; the existing permissive fallback masked that failure. Atlas later lacked Canon token CSS.
- [IO preview](preview-red.txt): the same skipped preparation left auth-platform runtime output unavailable to Canon's auth consumer.

The fix is scoped to Agency. React typechecking uses an explicit standalone strict ES2022/ESNext configuration, preserving `verbatimModuleSyntax` and `isolatedModules`. Agency preparation restores dependency preparation and Kit sync before the NPG build. No shared package, workflow, policy, model, provider or public-page source is changed.

| Gate | Status | Evidence and limit |
| --- | --- | --- |
| Functional correctness | Passed locally | Real TypeScript compiler-host regression masks every generated Kit file: [before](cold-config-red.txt), [62-test final suite](focused62.txt), [ordinary typecheck](typecheck.txt), [full Agency check](check.txt). [Actual prepare](prepare.txt) with the owning Kit config absent regenerated it and completed NPG build; Canon tokens and auth-platform runtime output were verified afterward. Dependencies were otherwise warm; full fresh-install CI remains pending. |
| Perceptual/product quality | Passed for the prior exact artifact | [Rebuilt artifact identity](artifact.json) matches the previously directly viewed final [CSS-review client](../review-css-contract/README.md) byte for byte. Its 27 browser scenarios and 22 supplemental checks remain applicable. No rendered source change or new aesthetic claim. |
| Release readiness | Untested in production | New-head CI/review, normal promotion, deployment, activation and authenticated live parity remain. Dify rollback remains available. |

The permanent cold compiler regression checks the actual Workspace, entry, types and display source, without deleting or modifying build state. The actual prepare smoke temporarily moved only the owning generated Kit config, asserted the final NPG completion marker because shell success alone can mask failure, and removed its identical backup after regeneration. No paid/provider calls or deployments were used as QA.

Independent final Sol 6.1 evidence is retained in `independent-review.md`; any original `/tmp` paths in that report identify its review workspace. Current source corrections do not supersede the existing exact-byte browser evidence.

Worktree disposition: preserved at `/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-7fb0f744-b3a59e76dfb75144`, branch `t3/npg-custom-chat`, for CI/review and production acceptance.

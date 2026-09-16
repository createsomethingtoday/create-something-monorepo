# Ground seeded regression trial

Run `pnpm ground:trial` from a bootstrapped checkout to test the exact published
version declared by `packages/ground/npm/package.json`. Save the complete CLI/MCP
receipt outside the checkout:

```bash
pnpm ground:trial --output /tmp/ground-seeded-trial.json
```

The runner creates temporary isolated source directories and databases. Ground
receives source files and tool arguments, never expected answers. The committed
fixture is a frozen holdout-style trial authored in the same implementation
session, not an independently authored blind study. Its minimal package/barrel,
tool configuration and Svelte patterns represent monorepo usage; this is not a
scan of every production package.

The frozen source/expectation SHA-256 is
`d2a0c942410384acc22a43624abaa2214bc6ab72a07da89ef856048b8b65021e`.
Changing it requires explicit review of the test baseline, not an automatic
receipt refresh.

| Case | Required outcome | Owner |
| --- | --- | --- |
| Cross-package duplicate | Detect seeded function; review-only finding | Native CLI/MCP |
| Unused internal export | Report exact unused symbol | Native CLI/MCP |
| Public export with another package consuming it | Preserve export | Native CLI/MCP |
| Same symbol name imported from another file | Still report the unused original | Native CLI/MCP |
| Indirect ESLint configuration | Honor explicit manual entry-point evidence | Native CLI/MCP |
| Svelte instance-script dependency | Preserve imported module export | Native CLI/MCP |
| Malformed export module | Explicit error, never empty success | Native CLI/MCP |
| Malformed consumer | Reject incomplete absence evidence | Native CLI/MCP |
| Malformed duplicate source | Incomplete/error outcome, never clean or empty | Native CLI/MCP |
| Broken relative import | TypeScript diagnostic 2307 | Repository compiler |
| Runtime export changed to type-only | Reject reviewed API-kind mismatch | Repository adoption contract |

CLI/MCP export candidates and analysis coverage must agree. Published runs also
check CLI/MCP versions and npm/native source provenance. A local build is
supporting evidence and is labeled `local-native` in the receipt:

```bash
pnpm ground:native:build
pnpm ground:trial --native-dir packages/ground/target/release --output /tmp/ground-local-trial.json
```

Published 0.4.0 passed seven cases and failed four. It conflated imports with the
same symbol name and accepted malformed export/consumer/duplicate syntax as
usable analysis. Version 0.4.1 checks syntax completeness and binds import usage
to resolved module targets. Named local package manifests supply export targets
even when a scoped scan does not contain the root pnpm manifest. Static Svelte
markup has zero imports; valid TSX uses the TSX grammar.

The required Public Distribution GA check and Ground release calibration job run
this trial through actual local CLI/MCP binaries. After publication, rerun against
the exact npm release and retain its receipt. Candidate findings still require
review of public API, external consumers and dynamic loading before removal.
The compiler and API-contract rows do not claim native Ground support for those
checks. Passing this finite suite does not establish universal parser coverage
or justify automatic dead-code deletion.

CRE-1946 owns this release. Rollback is a reviewed source revert followed by a
new patch release; retain the prior npm version for consumers requiring an
immediate explicit pin. Do not replace or delete immutable release assets.

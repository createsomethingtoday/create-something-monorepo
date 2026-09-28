# Effect integration engineering

Use Effect as the preferred internal runtime for **new TypeScript integration and backend code** when the work coordinates external systems, retries, cancellation, resources, or several expected failure modes. Keep existing public Promise APIs where consumers need them. This is a code pattern, not a new task tracker, approval authority, or deployment path.

## Signal → decision → proof

| Signal | Decision | Proof before delivery |
| --- | --- | --- |
| External API or database calls can fail in different ways | Model expected failures as tagged errors and keep the original cause | Tests distinguish transient, permanent, and exhausted failures |
| Reads need retries or rate limits | Use a bounded Effect schedule; retry only the selected errors | Tests count attempts and check the stop condition |
| A write may have succeeded despite a timeout | Stop and reconcile with an idempotency key or owning receipt before any retry | Test the unknown-outcome path and link the reconciliation receipt |
| Work owns a timer, stream, child process, connection, or lock | Scope acquisition and release, including cancellation | Interrupt the operation and prove cleanup |
| Provider behavior must be simulated | Put the provider behind an explicit service and supply a test implementation | Run a failure-path test without production credentials |

Start with one boundary that has these signals. Pure transforms, simple UI components, and stable code with no failure or lifecycle problem do not need a conversion. Preserve the owning package's public contracts and package-local quality gates.

## Version and tooling

The first repo slice uses `effect@3.22.2`, pinned in `@create-something/cs-mcp-hub`. As of 2026-09-27, Effect 4 is a release candidate; installing untagged `effect` resolves to stable v3. Do not introduce v4 into a production package until its version and migration have passed that package's checks. The v4 `@effect/tsgo` language service requires TypeScript 7, while this repo's root declares `^5.7.2` and currently resolves to 5.9.3. Keep any v4 or language-service experiment package scoped and explicit; do not silently replace the monorepo compiler.

Primary references: [Effect v3 retrying](https://effect.website/docs/v3/error-management/retrying), [tagged errors](https://effect.website/docs/v3/error-management/yieldable-errors), [scopes](https://effect.website/docs/v3/resource-management/scope), [v4 installation status](https://effect.website/docs/v4/getting-started/installation), [v4 devtools](https://effect.website/docs/v4/getting-started/devtools).

## First slice: hub downstream startup

`packages/cs-mcp-hub/src/downstream.ts` wraps downstream MCP connection and tool catalog loading in a typed `DownstreamConnectionError`. Effect records whether connection or catalog loading failed and closes the client on either failure. A successful client stays open under the hub's existing startup/shutdown ownership; it must not be scoped to the startup function or it would close before tools can be called. The public Promise API and user-facing failure shape remain the same. This slice deliberately does not retry connection: repeating a partially completed MCP handshake can create duplicate sessions or hide an uncertain state. Tests use an injected client to prove paginated success, cleanup on both failure phases, and preservation of the original failure when cleanup also fails.

The package verifier is:

```bash
pnpm --filter @create-something/cs-mcp-hub typecheck
pnpm --filter @create-something/cs-mcp-hub test
```

The MCP Quality Gate workflow runs these two hub checks on package changes.

This proof is package behavior and type safety. It is not a deployed hub session or client acceptance receipt.

## Client delivery pattern

For a new client integration, record the owning client and system, read/write authority, exact API and credential scope, expected failures, idempotency or reconciliation key, and rollback path before implementation. Put external operations behind services. Keep business decisions and provider calls separate. Map provider errors into tagged domain errors while retaining the original cause for diagnosis. Decode untrusted inputs and outputs at the boundary. Apply retries only where the operation and failure class make repetition safe. Trace the operation and correlation ID without logging credentials or sensitive payloads.

Give the coding agent the owning API docs and a nearby working example. Require a test for success, a permanent failure, a transient failure, retry exhaustion, and an uncertain write if writes exist. Run the package checks, independent review, deployment verifier, and client acceptance gate appropriate to that client. A typecheck or one successful prompt cannot substitute for those receipts.

Adopt Effect in the next package only after the first slice remains readable to its maintainers and the failure-path evidence is easier to obtain than before. Record any added build time, type friction, and runtime behavior in its Linear issue. Effect is a default for the named problem class, not a mandate to rewrite existing packages.

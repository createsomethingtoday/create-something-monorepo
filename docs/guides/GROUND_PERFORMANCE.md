# Ground performance and worker controls

Ground 0.4.2 parses duplicate-analysis files with bounded workers and reuses normalized tokens during each analysis. It enumerates exact name/file buckets instead of visiting unrelated function pairs. The comparison score, eligible pairs, source order, parse failures and coverage contracts remain unchanged.

```bash
npm exec --yes --package=@createsomething/ground-mcp@0.4.2 -- ground analyze packages/agency/src --checks duplicates --workers 4
```

`ground analyze` and `ground diff` accept `--workers 0..4`. Zero, the default, selects available CPUs up to four. One forces serial execution. Fewer than eight input files use the serial path to avoid thread startup overhead. `ground_find_duplicate_functions`, `ground_analyze` and `ground_diff` expose the same `workers` argument through MCP. The limit applies per analysis invocation; callers running concurrent invocations must budget their total CPU usage.

Workers only parse files. Evidence assembly and comparisons retain input ordering. The deadline is checked before and after each parse and during comparisons; an in-progress parser call is cooperative, not forcibly interrupted. A worker startup/failure, malformed input or expired deadline never becomes a completed clean scan. Ground's existing discovery limits and supported-language boundaries still apply.

There is no cross-request parsed cache or persistent search index. Each invocation reads current source, so edits, deletions, branch replacement and separate worktrees cannot inherit old indexed findings. Same-call token reuse ends with the call. Files changing during a scan remain the existing live-checkout consistency limitation; this release does not claim an atomic repository snapshot.

## Why Tantivy is not in the production dependency graph

The isolated [retrieval benchmark](../../packages/ground/benchmarks/retrieval/README.md) compares serial/parallel parsing, parsed-output reuse costs, dependency graph work, exact buckets, SQLite receipts and Tantivy 0.26.1. Tantivy is suitable for a future ranked discovery feature. It does not replace structural comparisons, module resolution or verified absence.

In the measured Agency corpus, top-10 exact-name retrieval omitted candidates. Count-based exact retrieval was complete, but indexing and commit/reload added work. Ground keeps its SQLite evidence registry. The isolated parsed-output cache measures warm reuse and one-file edits with hash validation, including deletion, same-size replacement and worktree isolation checks. It is not an incremental graph implementation and is not shipped as a cache; persistent cache invalidation across parser versions and configuration would require a separate delivery.

See [benchmark evidence and decision](../internal/ground-performance-decision.v1.json) for all repetitions, corpus hashes, timings, limitations and the selected approach. These are machine/workload-specific measurements, not a universal speedup guarantee.

## Reproduce verification

From a current monorepo checkout:

```bash
pnpm ground:trial
pnpm ground:execution:verify
```

The first runs the unchanged frozen CLI/MCP regression suite, including explicitly identified compiler/API companion checks. The second tests worker parity, positive duplicate detection, fresh edits, timeouts, invalid limits and malformed source against the exact published package. Native unit/integration tests additionally compare the optimized algorithm against exhaustive pair enumeration, including intra-file and focused-diff cases.

Release receipts include `ground-execution.json` alongside the seeded trial. Performance measurements do not relax correctness gates. Revert a regression through reviewed source and a new patch release; consumers can explicitly pin the preceding release while investigating.

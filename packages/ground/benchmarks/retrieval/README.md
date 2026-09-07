# Ground retrieval and parsing benchmark

Run from the monorepo root:

```bash
cargo run --release --locked --manifest-path packages/ground/benchmarks/retrieval/Cargo.toml -- packages/agency/src > /tmp/ground-agency-performance.json
```

This unpublished, separate crate keeps Tantivy and benchmark-only dependencies out of Ground's shipped binaries. Tantivy 0.26.1 APIs follow https://docs.rs/tantivy/0.26.1/tantivy/ .

Three repeated runs use a sorted, content-hashed source corpus. Timings separate function parsing (serial, two and four workers including pool creation), dependency graph construction/query, exhaustive pair traversal, exact-name buckets, SQLite evidence upsert/read, and disk-backed Tantivy indexing/query/update/delete. Exact buckets must return precisely the exhaustive duplicate pairs. Parallel output must match serial output in source order; parse failures remain explicit.

Tantivy indexes exact function names plus full-text normalized bodies. Exact-name counts test complete candidate retrieval; top-10 queries expose truncation, not a valid negative-verification strategy. Query timing excludes structural verification. No expected duplicate answers enter the index.

The benchmark-only parsed-output cache reads/hashes source bytes and clones output on every hit. It measures cold population, warm reuse and one-file edits, and asserts invalidation for same-size revision replacement, deletion and distinct worktree paths. It does not implement or benchmark an incremental dependency graph. First iteration is process-cold, not OS-cache-cold. Record peak RSS separately with `/usr/bin/time -l` on macOS (or `/usr/bin/time -v` on Linux); it includes all benchmark alternatives, not isolated production memory. SQLite's repeated receipt upsert/read is a microbenchmark, not a throughput claim for all Ground workloads.

Production decisions require end-to-end public CLI/MCP checks and unchanged frozen regressions, not timing results alone. Do not infer clean coverage when this benchmark reports parse errors.

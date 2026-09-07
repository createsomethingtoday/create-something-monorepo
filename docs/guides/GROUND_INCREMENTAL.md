# Ground incremental analysis

Ground 0.4.3 reuses parsed imports, exports, re-export edges and complete dependency graphs within a persistent MCP process. Unchanged files can reuse their parsed records when a changed file requires a new graph. Duplicate function parsing retains its separate bounded worker implementation.

MCP reuse is enabled by default. Pass `ground-mcp --no-cache` to disable it. CLI commands default to uncached execution; `ground --cache ...` opts in. Library hosts can set `ground::computations::derived_cache::set_enabled` once at startup.

Every graph request discovers the current files, reads their bytes, and recomputes aliases and workspace package resolution. Keys include source content, scope and resolution inputs. New graphs parse the validated buffers and recheck their inputs before insertion. Discovery failures, directory cycles and detected concurrent changes return errors. Failed parses never populate a complete cached graph. This remains analysis of a live filesystem, not a transactional checkout snapshot; callers should avoid editing during a query.

Derived data has a 16 MiB serialized-payload limit and a 512-entry limit with FIFO eviction. Encoding stops when the payload limit is reached; oversized values are not retained. Deserialized graphs, source buffers and allocator overhead add memory beyond that limit. Valid non-UTF-8 Unix paths use lossless fingerprint bytes; if a graph cannot be encoded for storage, analysis continues without retaining that graph. Tool responses expose `_meta.ground_cache` counters. No state is written to disk; restart, upgrade and `--no-cache` clear reuse. Final findings are recomputed, and existing evidence freshness checks remain in force.

## Verify

```bash
pnpm ground:incremental:verify --output /tmp/ground-incremental.json
```

The verifier runs the pinned published package and checks its version, source SHA and npm integrity. It compares a persistent MCP process against fresh uncached execution, verifies CLI parity, and exercises edits of unchanged length, file addition/deletion, malformed source and repair, aliases, package exports, revision restoration, worktree isolation and restart. It also compares real MCP Core, Agency and template-search queries. The frozen baseline is published 0.4.2; timings are workload-specific and include filesystem reads. RSS samples are taken after responses on supported Unix hosts and are not peak measurements.

CI and release gates run the same verifier against the native build, alongside the unchanged seeded and worker suites. Published receipts must confirm exact release provenance before promotion is considered complete. Roll back consumers by explicitly pinning 0.4.2; source fixes go through review and a new patch release.

## Measured tradeoffs

The local optimized candidate measured repeated Agency queries at about 82 ms versus 609 ms uncached, and template-search queries at 6 ms versus 82 ms. Agency's initial query took 769 ms versus 598 ms uncached. Its retained payload was about 1.56 MiB and sampled process RSS about 20.7 MiB. Tiny fixture queries did not improve. These are supporting measurements on one macOS ARM64 host, not published-release proof or universal promises. [Full candidate receipt](../internal/ground-incremental-candidate.v1.json) retains cold, repeated, one-file-edit, uncached and memory observations.

# Ground Review Calibration — 2026-08-12

## Decision

Keep `ground:review` advisory. Do not make it a blocking promotion gate from
this sample.

The 20-PR calibration produced reliable path accounting after one reconciliation
fix, but it did not produce enough semantic coverage to estimate precision:

- 214 changed paths discovered
- 19 paths analyzed for duplicates (8.9%)
- 9 new paths analyzed for orphaning (4.2%)
- 195 paths explicitly excluded
- 0 Ground findings
- 0 execution failures
- 12 of 20 receipts had no analyzable files

Zero findings is not evidence of zero false positives. The sample contained no
positive findings to adjudicate, so finding precision remains unknown.

## Method

The sample uses 20 merged PR commits from #1321 through #1355. It spans Agency,
Canon, LTD, Atlas, MCP contracts, database/commercial infrastructure, dependency
updates, and security/documentation work. Each commit was checked out in an
isolated detached worktree and evaluated with Ground 0.3.1 against its first
parent. Historical source and current Ground behavior were preserved; no
historical commit was changed.

The machine-readable summary is
`docs/internal/ground-review-calibration-2026-08-12.json`.

## Results

| PR    | Status              | Changed | Duplicate coverage | Orphan coverage | Excluded | Findings |
| ----- | ------------------- | ------: | -----------------: | --------------: | -------: | -------: |
| #1321 | no analyzable files |       2 |                  0 |               0 |        2 |        0 |
| #1324 | no analyzable files |      25 |                  0 |               0 |       25 |        0 |
| #1325 | no analyzable files |       2 |                  0 |               0 |        2 |        0 |
| #1327 | no analyzable files |      11 |                  0 |               0 |       11 |        0 |
| #1332 | clear               |      22 |                  4 |               3 |       18 |        0 |
| #1333 | no analyzable files |       4 |                  0 |               0 |        4 |        0 |
| #1334 | no analyzable files |       4 |                  0 |               0 |        4 |        0 |
| #1337 | clear               |      10 |                  3 |               0 |        7 |        0 |
| #1338 | clear               |      19 |                  2 |               0 |       17 |        0 |
| #1344 | clear               |      23 |                  4 |               2 |       19 |        0 |
| #1345 | no analyzable files |       9 |                  0 |               0 |        9 |        0 |
| #1346 | clear               |      17 |                  1 |               1 |       16 |        0 |
| #1347 | clear               |       5 |                  1 |               0 |        4 |        0 |
| #1348 | clear               |       8 |                  2 |               2 |        6 |        0 |
| #1349 | no analyzable files |       8 |                  0 |               0 |        8 |        0 |
| #1351 | clear               |      11 |                  2 |               1 |        9 |        0 |
| #1352 | no analyzable files |      17 |                  0 |               0 |       17 |        0 |
| #1353 | no analyzable files |       3 |                  0 |               0 |        3 |        0 |
| #1354 | no analyzable files |      10 |                  0 |               0 |       10 |        0 |
| #1355 | no analyzable files |       4 |                  0 |               0 |        4 |        0 |

### Exclusion distribution

| Reason                            | Paths | Share of changed paths |
| --------------------------------- | ----: | ---------------------: |
| `unsupported_extension`           |   100 |                  46.7% |
| `ground_scan_cap`                 |    41 |                  19.2% |
| `ignored_by_config`               |    36 |                  16.8% |
| `deleted_file`                    |     8 |                   3.7% |
| `unsupported_by_requested_checks` |     7 |                   3.3% |
| `outside_package_source`          |     3 |                   1.4% |

## Calibration finding and repair

The first clean-binary run exposed duplicate exclusion accounting on PR #1338:
seven deleted paths were represented both by Ground's `ignored_by_config`
classification and the wrapper's `deleted_file` classification. This produced
24 exclusions for 19 discovered paths with 2 analyzed paths.

The wrapper now reconciles exclusions by path, with later wrapper lifecycle
classifications overriding target-local Ground classifications. The same
one-path/one-exclusion rule applies to overall, duplicate-check, and orphan-check
coverage. After the repair, the full sample satisfies:

```text
214 discovered = 19 analyzed + 195 excluded
```

## Next evidence gate

Do not repeat another broad 20-PR sample yet. The next useful Ground investment
is to reduce `ground_scan_cap` exclusions and then collect positive fixtures or
naturally occurring findings that can be adjudicated. Reconsider blocking only
after all of these are true:

1. materially higher supported-code coverage on large Agency/Atlas packages;
2. at least 10 independently adjudicated positive findings;
3. measured precision and false-positive rate by check;
4. stable one-path/one-exclusion accounting;
5. no execution failures across a representative promotion sample.

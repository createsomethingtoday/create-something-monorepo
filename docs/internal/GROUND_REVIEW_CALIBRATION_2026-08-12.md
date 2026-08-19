# Ground Review Calibration — 2026-08-12

## Decision

Keep `ground:review` advisory. Do not make it a blocking promotion gate from
this sample.

The 20-PR calibration was rerun with Ground 0.3.2 after adding per-check
completion evidence and cycle-safe traversal. It produced reliable path
accounting, but it still did not produce enough positive evidence to estimate
precision:

- 214 changed paths discovered
- 31 paths analyzed for duplicates (14.5%)
- 12 new paths analyzed for orphaning (5.6%)
- 183 paths explicitly excluded
- 0 Ground findings
- 0 execution failures
- 7 of 20 receipts had no analyzable files
- 11 of 20 receipts were partial rather than falsely clean
- 2 of 20 receipts completed every requested check

Zero findings is not evidence of zero false positives. The sample contained no
positive findings to adjudicate, so finding precision remains unknown.

## Method

The sample uses 20 merged PR commits from #1321 through #1355. It spans Agency,
Canon, LTD, Atlas, MCP contracts, database/commercial infrastructure, dependency
updates, and security/documentation work. Each commit was checked out in an
isolated detached worktree and evaluated with Ground 0.3.2 against its first
parent. Historical source and current Ground behavior were preserved; no
historical commit was changed.

The machine-readable summary is
`docs/internal/ground-review-calibration-2026-08-12.json`.

## Adjudication ledger

`docs/internal/ground-adjudication-ledger.v1.json` carries this calibration
forward without converting its zero findings into an accuracy claim. Each new
Ground review receipt can add one record with its receipt source, completion
state, observed finding count, and a reviewer verdict for every finding:
`confirmed`, `false_positive`, or `out_of_scope`. Each verdict needs a concrete
rationale.

Use the deterministic summary before any policy discussion:

```bash
pnpm ground:adjudication
pnpm ground:adjudication:json
```

The ledger is advisory-only. Its coverage and precision thresholds are
intentionally unconfigured until an operator approves them; an unconfigured
threshold is reported as **not ready**, never interpreted as permission to
make Ground blocking.

## Results

| PR    | Status              | Changed | Duplicate coverage | Orphan coverage | Excluded | Findings |
| ----- | ------------------- | ------: | -----------------: | --------------: | -------: | -------: |
| #1321 | no analyzable files |       2 |                  0 |               0 |        2 |        0 |
| #1324 | partial             |      25 |                  4 |               2 |       21 |        0 |
| #1325 | no analyzable files |       2 |                  0 |               0 |        2 |        0 |
| #1327 | partial             |      11 |                  1 |               0 |       10 |        0 |
| #1332 | partial             |      22 |                  4 |               3 |       18 |        0 |
| #1333 | no analyzable files |       4 |                  0 |               0 |        4 |        0 |
| #1334 | no analyzable files |       4 |                  0 |               0 |        4 |        0 |
| #1337 | partial             |      10 |                  3 |               0 |        7 |        0 |
| #1338 | partial             |      19 |                  2 |               0 |       17 |        0 |
| #1344 | partial             |      23 |                  5 |               3 |       18 |        0 |
| #1345 | no analyzable files |       9 |                  0 |               0 |        9 |        0 |
| #1346 | clear               |      17 |                  1 |               1 |       16 |        0 |
| #1347 | partial             |       5 |                  1 |               0 |        4 |        0 |
| #1348 | clear               |       8 |                  2 |               2 |        6 |        0 |
| #1349 | no analyzable files |       8 |                  0 |               0 |        8 |        0 |
| #1351 | partial             |      11 |                  2 |               1 |        9 |        0 |
| #1352 | partial             |      17 |                  3 |               0 |       14 |        0 |
| #1353 | no analyzable files |       3 |                  0 |               0 |        3 |        0 |
| #1354 | partial             |      10 |                  1 |               0 |        9 |        0 |
| #1355 | partial             |       4 |                  2 |               0 |        2 |        0 |

### Exclusion distribution

| Reason                            | Paths | Share of changed paths |
| --------------------------------- | ----: | ---------------------: |
| `unsupported_extension`           |    82 |                  38.3% |
| `ignored_by_config`               |    65 |                  30.4% |
| `deleted_file`                    |     8 |                   3.7% |
| `unsupported_by_requested_checks` |    25 |                  11.7% |
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
214 discovered = 31 analyzed + 183 excluded
```

## CRE-1715 completion-evidence delta

Ground 0.3.2 eliminates all 41 `ground_scan_cap` exclusions from the original
run. Twelve of those paths are now duplicate-checked, increasing duplicate
coverage from 19 to 31 files. Three additional new files receive orphan checks.
The other 29 former cap exclusions are no longer hidden behind a package-wide
reason; Ground classifies them by their actual language or path policy.

The duplicate analyzer now scans the complete eligible source set, emits the
exact changed files completed by each requested check, and records partial or
failed files separately. Unique directory symlink targets are traversed once
through a canonical visited set, preserving symlink-only source while preventing
aliases and cycles from inflating or hanging a scan. The
review wrapper requires this evidence for packages over the former 500-file
boundary or containing directory aliases; an older binary cannot claim those
files were checked merely by listing them as analyzable.

Completion status is preserved end to end. A changed file appearing in an
analyzed-file list is no longer enough to claim a clean review when the broader
duplicate corpus was partial, and an orphan exclusion is not summarized as a
completed clean check. The stricter replay produced 11 partial receipts, 2
fully clear receipts, and 7 receipts with no analyzable files.

## Next evidence gate

Do not repeat another broad 20-PR sample yet. The next useful Ground investment
is to collect positive fixtures or naturally occurring findings that can be
adjudicated. Reconsider blocking only after all of these are true:

1. materially higher supported-code coverage on large Agency/Atlas packages;
2. at least 10 independently adjudicated positive findings;
3. measured precision and false-positive rate by check;
4. stable one-path/one-exclusion accounting;
5. no execution failures across a representative promotion sample.

## Adjudication protocol

Treat Ground output as observations, not automatic PR regressions. For each
candidate, first compare the relevant function bodies against the PR base:

1. Record `out_of_scope` when the observed duplicate was pre-existing or is
   otherwise outside the changed behavior under review. Keep its immutable
   receipt and rationale, but exclude it from precision, false-positive rate,
   and the minimum calibration-evidence count.
2. Record `confirmed` only when a reviewer finds an actionable duplicate in the
   changed behavior. Record `false_positive` only when the analyzer's match is
   materially wrong, rather than merely pre-existing.
3. Review correlated pair observations as one helper family before counting a
   calibration-positive result. Do not inflate evidence by treating one shared
   helper emitted in several pairs as several independent positives.

The ledger reports all classifications for auditability, while its calibration
threshold counts only reviewer-adjudicated `confirmed` and `false_positive`
findings. This keeps out-of-scope volume from looking like detector quality.

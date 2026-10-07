# Independent first-slice review

Reviewer: `site_core_review`, fresh context and read-only source/probes.
Initial target: local WIP `175370717943f49c617b541d3bad03aa93fbb8d0`.
Final target: working patch atop that commit, core SHA-256
`8b20b1dd80ba038af11771aba775128bd76c6eac6ca2602f2452d0dd5c8c370e`.

## Findings and resolution

| Finding on WIP | Reproduction | Resolution and regression |
| --- | --- | --- |
| P1: receipt ownership included outcome kind | Assignment A claimed an accepted contact receipt, B claimed a qualified inquiry with the same receipt; evaluation was ready. | Ownership now uses full scope plus receipt key across stages. Both record orders block; distinct stages for one owner remain valid. |
| P2: multi-route continuity conflicted | A permitted route change rejected reuse; a fresh receipt had the same ID with different contents. | Exactly one route per allocation is enforced through validation, assignment and evaluation. Multi-route continuity is explicitly deferred. |
| P2: excluded outcome clocks bypassed validation | An internal outcome with `NaN` timestamp did not block review. | Basic times and full exposure attribution relationships are validated before eligibility filtering; exclusions never inflate commercial counts. |
| P2: incomplete attribution windows were hidden | Exposures at 9999, a 500 ms window, and review at 10000 returned terminal readiness with zero outcomes. | Report `pendingAttributionWindows` and remain inconclusive until eligible windows close. Delayed historical outcomes remain valid after rollback. |

Four focused regressions were added; the existing rollback regression now
expects inconclusive evaluation while its historical window is open. A null
assignment context also fails closed. The implementer ran all 20 regressions
and the focused source-only typecheck after fixes; exact results are recorded
in `validation.json`.

## Focused re-review result

The reviewer reported: “All four findings are addressed. I found no remaining
first-slice blocker in this focused re-review.” Independent lightweight Node
v22.23.1 probes reproduced the corrected cross-stage ownership, single-route
gate, excluded-traffic quality, window maturity, delayed rollback and null
context boundaries. The probe process exited 0. The reviewer did not
independently rerun the implementer's full suite or TypeScript check.

No reviewer edits, installations or public actions occurred. The result
supports local fixture-contract readiness only. Authenticated receipts,
consent/storage/cache integration, durable measurement, multi-route continuity
and production validity remain deferred. Fixtures establish neither human
outcomes nor statistical adequacy; readiness is an invitation to human review,
not a winner or promotion decision.

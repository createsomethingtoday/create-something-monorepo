# Site improvement — local foundation

Private, dependency-free TypeScript core for portable site experiments. This
first slice accepts **fixture mode only**. It cannot render a public variant,
set an identifier, emit analytics, store a record, or activate a winner.

The shared contracts are assignment, acknowledged exposure, outcomes with
declared authority, data quality, bounded recipes, evaluations, and scoped
decision history. Property adapters own their goals, consent, permitted
changes, render evidence, accepted business receipts and Canon constraints.

## Public interface

- `validateExperiment(spec, adapter)` checks site scope, two coherent recipes,
  allowed fields, exactly one permitted route per allocation, rollout/time
  bounds and the evaluation plan. Multi-route continuity is deferred.
- `resolveAssignment(spec, adapter, context)` returns an assigned fixture
  receipt or an **unassigned** control fallback with a reason. Scope,
  consent/persistence, DNT/opt-out, kill switch, dates and rollout gates take
  precedence over a prior receipt. Live mode always fails closed.
- `evaluateExperiment(spec, adapter, records, now)` joins and deduplicates
  assignment/render/outcome records, reports quality and guardrail failures,
  and returns `blocked`, `inconclusive`, or `ready_for_human_review`. It never
  returns a winner, uplift, significance or a promotion instruction. Terminal
  readiness requires the stop time, minimum evidence and all eligible exposure
  attribution windows to have closed; pending windows remain visible.
- `appendDecision(scope, history, decision)` appends an owner/evidence-bearing
  decision without mutating its input. Replays are idempotent; conflicting
  IDs, foreign scope and stale history are rejected. Decisions have no actuator.

Allocation freezes an FNV-1a 32-bit hash plus avalanche mix, separate cohort
and arm inputs, full tenant/site/experiment/allocation scope, seed, and two
equal arms. This is deterministic fixture assignment, **not cryptography**.
The canonical internal assignment key includes the opaque subject token;
it is not a Canon analytics ID and must not be copied into public metadata.
Changes to recipe meaning invalidate prior receipts through the configuration
key; a real allocation change must get a new version and decision history.

Assignment is not exposure. Only an explicit render acknowledgement can
establish exposure. Reattaches deduplicate per assigned subject and surface;
the earliest acknowledged exposure anchors attribution. Primary outcomes
count assigned subjects, not repeated submissions. A receipt claimed by two
assignments blocks evaluation across accepted/qualified stages; distinct stages
on the same assignment remain separate. Excluded traffic still undergoes
timestamp, receipt-conflict and exposure-window checks. A server receipt and a client success
notification have different authority, even when both occur on a server-rendered
page. External/default traffic remains unverified, and non-external classes
are excluded from the commercial channel. Synthetic task evaluations have a
separate channel and outcome contract.

Inputs must come from trusted local adapters. The core validates shape and
relationships; it cannot authenticate a receipt or prove the truth of an
evidence reference. There is no public intake endpoint in this slice. Records
have allowlisted fields and do not carry raw contact data or assessment answers.

## Owned fixtures

`packages/agency/src/lib/site-improvement/fixture.ts` is not imported by a
public route. It defaults to disabled, kill switch on, zero rollout and
unresolved baseline/outcome definition/thresholds. Its control copy is pinned
to local origin/main `33fcc0fd2335b04dfca6d860372db46cd4c43030`. The candidate
changes only the lede and primary action label. The existing destination,
offer, pricing, terms, proof, structure, motion and accessibility are preserved.

The tests define IO artifact-discovery and LTD operating-library next-step
comprehension adapters. A client artifact-open signal can be an IO diagnostic;
an LTD click cannot satisfy a comprehension task evaluation. These are
compatibility fixtures, not production integrations or measured outcomes.
All test clocks, references, receipts and thresholds are explicitly synthetic.

## Lightweight validation

The validation used Node 22.23.1 to run TypeScript fixtures without an install, build,
transpilation cache or browser. From the monorepo root:

```sh
node --experimental-strip-types packages/site-improvement/test/site-improvement.test.ts
node --experimental-strip-types --test packages/agency/test/public-html-cache.test.ts
```

The first command uses one process with the native Node test library. The
package `test` script uses Node's normal test runner when capacity permits.
For a source-only type check, run existing `typescript/bin/tsc` with
`-p packages/site-improvement/tsconfig.json`; do not install a second toolchain.
The source-first package export is for local TS consumers; a published or
production JS distribution is outside this slice.

Before commands, confirm the requested 5 GiB disk reserve and enough headroom
for the process. See the review evidence for what actually ran. Passing
fixtures establish contract behavior, not live consent, caching, storage
recovery, human outcomes or statistical validity.

## Live integration boundary

Reuse Agency `PrivacyAnalytics`, Canon event emission/classification, existing
contact receipts, scheduler origin/source validation and the commercial
funnel reporter. Add no second analytics stack. Persistent assignment needs
explicit site-local permission and a server-verifiable receipt; browser-stated
variant/consent/session fields cannot establish commercial attribution.

Any future SSR assignment gate must precede shared HTML cache lookup. Bypass
read/write and use private/no-store on participating experimental routes,
including no-cookie first requests; kill must precede a cache HIT. Public
baseline caching can continue when disabled. Canon controls recipe design,
offer facts, evidence, accessibility and reduced motion. No schema, cookie,
cache, public route, service or production tracking was changed here.

Qualified inquiries need a reviewed qualification rubric and observed baseline.
Contact saved does not mean qualified, and browser booking completion does
not replace a scheduler-owned accepted receipt. Missing analytics projections
must stay visible as data-quality gaps; recovery must not replay intake emails.
An accepted measurement acknowledgement and deterministic event-ID seam are
needed before extending `recordServerConversion` for receipt projection.

LTD now leads with operating-library playbooks/runbooks/readiness, so confirm
that comprehension goal instead of assuming the principles index is the
primary path. Readiness answers/results must remain in the browser.

Cloudflare Flagship can be a later provider adapter. This package requires no
provisioning, paid plan, service binding, statistics engine, dashboard or ML
optimizer. All live promotion requires separate approval.

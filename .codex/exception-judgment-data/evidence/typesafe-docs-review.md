# TypeSafe documentation review — 2026-09-22

Reviewed against PR 1748 implementation commit 6c12f1259 / checkpoint 1a28302f5.
Outcome: preserve the integrity/replay work, but revise the proposed shared abstraction
before treating it as a first-class Jev contract. This review changes the next
implementation step; it does not validate model accuracy or change production authority.

## Coverage and method

Fetched the official documentation index and Markdown pages directly after the web
reader could not retrieve llms.txt. Reviewed the programming model, state, primitives
(Noul/Choice/Score), structured instructions/criteria, confidence, composition and
fan-out, HTTP request/response contract, models/versioning, Jev 1.13 failure modes,
JavaScript SDK response and retry interfaces, and relevant cookbook methods. Cookbook
review focused on feature discovery, self-consistency, citation verification, extraction
cascades, entity alignment and skill suggestion. This is a complete review of the
concepts needed for this design, not a claim that every SDK class or example was audited.

Source manifest retains URLs/hashes of fetched pages. It records retrieval, not proof
that every downloaded example was executed or reviewed line by line. No cookbook was
run live. Full vendor documents remain outside Git; this report contains our analysis.

## Findings against the current draft

### 1. Preserve raw primitive results before policy interpretation

`src/judgment-data.ts:5` represents every answer as yes/no/unknown plus one probability.
That is a useful derived exception signal, but insufficient as the general judgment
record: it cannot retain Choice option distributions or Score levels, legend and
confidence. Even Noul uncertainty should retain the original p(yes), rather than an
adapter's unknown label with unspecified probability meaning.

Correction: introduce a discriminated raw-answer union matching Noul, Choice and Score.
Retain model identity, usage and exact request/response artifacts. Derive exception
signals separately. An unknown due to absent evidence is a data condition; a Noul near
0.5 is uncertainty about a proposition. They must not collapse into one raw value.

Sources: https://docs.typesafe.ai/api ; https://docs.typesafe.ai/primitives/noul ;
https://docs.typesafe.ai/primitives/score ; https://docs.typesafe.ai/confidence

### 2. Version inference inputs separately from decision policy

`JudgmentInput.policy.constraints` combines question definitions with thresholds;
`recordJudgment` binds the resulting receipt to that whole input. `replayJudgment`
correctly verifies the original result, but provides no explicit way to apply a new
threshold/weight policy to unchanged raw answers. That limits the data reuse we want.

Correction: separate evidence snapshot, question-set version, inference run, decision
policy and decision run. A policy change produces a new derived decision referencing
the existing inference run; it must not rewrite historical receipts or require fresh
inference when state and question meaning are unchanged. Changed questions/evidence
require new inference. Model aliases must resolve to recorded served versions.

Sources: https://docs.typesafe.ai/patterns/composite-scoring ;
https://docs.typesafe.ai/cookbooks/autoresearch_feature_discovery ;
https://docs.typesafe.ai/models

### 3. Compile an actual TypeSafe request with sufficient structured context

`prepareJudgment` currently returns an internal projection, not the HTTP request. It
lacks primitive types and criteria, reduces evidence to id/text, and carries references
in custom evidenceIds. TypeSafe question map keys are not visible to the model. A future
adapter must put all semantic meaning and referenced state paths in instructions or
criteria, and preserve necessary identities, relations and policy definitions.

Correction: add an explicit compiler to `{state, model, questions}`. Support structured
instructions and primitive-specific criteria. Keep selection and field matching in
code. Include narrowly relevant policy meaning where needed; exclude downstream action
thresholds and labels. Hash the actual provider envelope and record requested and
served model IDs, usage, timing and adapter version. A local invocation ID must not be
misrepresented as a provider-issued request ID: the documented response has model,
answers and usage, not a required requestId.

The existing projection is not a broken API integration—there is no live adapter yet.
It is an unfinished boundary that should not be described as sufficient for one.

Sources: https://docs.typesafe.ai/concepts/state ; https://docs.typesafe.ai/primitives/advanced ;
https://docs.typesafe.ai/api ; https://docs.typesafe.ai/sdk/javascript/api/interfaces/SystemOneResult

### 4. Separate measurement from action eligibility and signal direction

The draft skips all inference for mandatory-human or incomplete-scope cases. That can
save calls in an action path, but it also prevents collecting useful reviewer-support
signals on those cases. Its composition assumes every semantic yes is a prerequisite
satisfied. In an error-detection question, a high p(yes) should instead trigger escalation.

Correction: declare each signal's meaning and keep generic measurements independent of
the exception workflow's action gate. Batch independent questions over shared relevant
state. Speculative questions may be evaluated and ignored by code on unused branches;
known irrelevant questions need not be sent. Missing applicability must still prevent
unsupported decisions. Use an any-violation rule for non-compensating risks; weighted
scores are for compensating preferences. Do not average a serious violation away.

Sources: https://docs.typesafe.ai/patterns/fan-out ;
https://docs.typesafe.ai/cookbooks/sde_cascade ;
https://docs.typesafe.ai/concepts/how-to-build-with-system-one

### 5. Human-label requirements were applied too broadly in the roadmap

The primary business-effectiveness gate for exception review remains valid, but it does
not prevent technical development, exploratory labels or question/rubric improvement.
TypeSafe explicitly suggests stronger reasoning-model ensembles for labels when
training a downstream model without human labels. Those are machine-generated labels,
not independent human ground truth or evidence of operational acceptance.

Correction: retain distinct label provenance (synthetic, model-generated, human-reviewed,
and observed business outcomes), labeler/model/version and input snapshot. Offer separate
development and promotion/effectiveness verifiers. Existing verifyEvaluationSet is a
strict exception effectiveness eligibility gate, not the only allowed development path.
Do not weaken that gate to claim business success. Reviewer-owned criteria and certified
inputs are still needed for the original exception-review promise.

Sources: https://docs.typesafe.ai/concepts/how-to-build-with-system-one ;
https://docs.typesafe.ai/cookbooks/autoresearch_feature_discovery

## Corrections to earlier framing

- Constraints describe the answer space and application policy; Jev's role is broader:
  semantic measurements for routing, retrieval, ranking, verification and downstream ML.
- Database investment makes inference results reusable and inspectable; it does not
  fine-tune Jev. Current docs say shared model weights are not customer fine-tuned.
- Confidence is not probability of workflow correctness. Choice/Score confidence is a
  distribution statistic; Noul has no separate confidence. Thresholds are specific to
  question/rubric/model/domain. Do not transfer them across primitive types.
- Negated questions are not guaranteed complements, and a yes/no Choice is not guaranteed
  equivalent to a Noul. Mathematical identities belong in code.
- Runtime repeatability is empirical, not exact model determinism. Saved-response replay
  can be exact without live inference being deterministic.
- The SDK retries by default. An owning caller's no-retry or latency policy needs explicit
  SDK configuration and attempt-level telemetry. HTTP 429/529 backoff is supported.
- The docs disclose susceptibility to adversarial state and irrelevant context. Test
  explicit boundaries and injected instructions; model-based verification is not an
  authorization or security boundary.

Sources: https://docs.typesafe.ai/models ; https://docs.typesafe.ai/confidence ;
https://docs.typesafe.ai/model-jaggedness/jev-1.13 ;
https://docs.typesafe.ai/cookbooks/consistency_noul_cookbook ;
https://docs.typesafe.ai/cookbooks/consistency_choice_cookbook ;
https://docs.typesafe.ai/sdk/javascript/api/interfaces/RetryPolicy

## Revised investment and immediate next step

The reusable model should be:
Evidence snapshot -> typed question set -> raw inference run -> versioned decision
policy -> derived decision -> separately attributed review/business outcome.

Keep Node-only exports, immutable files, hashes, replay, label separation and refusal
to authorize actions. Rework the abstractions above before general adoption. Start with
Noul-backed exception signals to prove the path, while the generic raw contract preserves
all three primitive types. Do not build a downstream learned model until data volume,
labels and an independently assessed improvement justify it.

After that, candidate business consumers include evidence-support checks on delivery
artifacts, reviewer queue prioritization and prospect evidence assessment. These are
candidate uses, not approvals to change workflows or send communications. Datasette
remains an optional inspection surface over these records.

Verification additions before considering the shared contract complete:
- Raw Noul/Choice/Score round-trip without information loss.
- Same inference run, changed decision policy, new derived receipt, zero provider calls.
- Compiled request retains explicit field references, criteria and exact model identity.
- Wrong primitive/option/legend/missing answer/usage rejected.
- Measurement on review-only cases never grants action authority.
- Machine labels allowed only in their explicit development lane.
- Grouped/temporal leakage, adversarial content and risk-specific threshold tests.

No source/runtime code changed during this documentation review. Existing 195 passing
tests remain evidence of the earlier implementation, not proof that these new requirements
are implemented. PR 1748 remains draft. The original full goal remains unactivated
because its independent business verifier is still unavailable; technical preparation
can continue without pretending that requirement is satisfied.

## Technical correction disposition — 2026-09-22

The preceding findings describe the historical v1 draft. They are resolved for the
new shared v2 contract; v1 remains a compatible exception-specific API.

| Finding | Implementation | Evidence |
| --- | --- | --- |
| 1: Raw primitive loss | v2 RawResponse/RawAnswer preserves all three primitives and usage | Native round-trip tests; independent saved-artifact audit |
| 2: Inference/policy coupling | Separate sealed QuestionSet, InferenceRun, DecisionPolicy, DecisionRun | Fresh CLI changes threshold 0.8 to 0.9 with identical inference digest |
| 3: Request compilation | Exact state/model/questions envelope, structured task and explicit evidence paths; requested/served model and trace | Compiler tests, saved request, missing/type/legend/usage rejection |
| 4: Measurement/action conflation | Measurement available on mandatory-review cases; require/forbid rule direction; advisory-only decisions | Mandatory-review, violation, missing-fact and unknown-applicability tests |
| 5: Overbroad human-label gate | Explicit provenance, development and effectiveness eligibility lanes | Machine-development acceptance; reviewer gate and grouped split tests |

Temporal and grouped leakage checks pass. An injected-text fixture demonstrates that
source content cannot alter deterministic authority; it is not a live model injection
robustness test. Real adapter calls, reviewer authentication, context curation and
business effectiveness remain owning-workflow requirements. No production authority,
model-quality, merge or deployment claim follows from this correction.

Validation: 218 package tests (39 judgment tests), build/typecheck, frozen-lockfile
validation and independent Python audit of seven sealed artifacts all pass. See
[v2 evidence](v2/independent-audit.json) and the v2 contract README for limitations.

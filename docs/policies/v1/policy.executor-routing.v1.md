# policy.executor-routing.v1

- Status: `draft`
- Owner: `CREATE SOMETHING engineering operations`
- Effective date: `TBD`
- Provider evidence checked: `2026-08-21`; reverify before external setup

## Purpose

Define how CREATE SOMETHING selects, changes, and evaluates agent executors
without allowing model choice to expand authority, data access, production
scope, or spend. The routing algorithm is substrate-independent: every eligible
executor must satisfy the same decision and receipt contract.

## Scope

- Symphony and Control executor selection
- Native Codex models and external model challengers
- Provider, fallback, authority, data, budget, and receipt relationships
- A0 through A4 execution lanes
- Excludes provider account creation, secret configuration, purchasing, and
  production runtime changes without a separately recorded approval

## Policy Statements

1. Native Codex is the production default. Model choice within Codex SHOULD use
   the cheapest executor that is eligible for the declared authority, data,
   ambiguity, and verification requirements.
2. OpenRouter MAY be evaluated only as an A0 shadow challenger. The decision
   MUST record operator approval, Responses protocol compatibility, enforced
   zero-data retention, model and inference-provider allowlists, a positive USD
   cap, and a receipt-bearing comparison. Its Responses API is documented as
   beta at this evidence checkpoint.
3. Direct Z.AI Coding Plan MUST NOT be selected by Codex while its documented
   coding endpoints expose Chat Completions or Anthropic Messages but not the
   Responses protocol required by Codex custom providers.
4. A custom Responses adapter MUST NOT be introduced solely to reach Z.AI in
   this pilot. It would add a maintained runtime and a new production boundary.
5. Cloudflare AI Gateway MAY front native OpenAI Responses traffic for owned
   observability. It MUST NOT be treated as a protocol translator for Z.AI
   without separate implementation and evidence.
6. Every decision MUST declare exactly one selected candidate, eligible
   fallbacks, authority, data boundary, approval references, budget, and
   rationale. Unknown contract fields fail closed.
7. Every completed attempt MUST record the exact provider, route, protocol,
   model, model version or `unverified`, reasoning effort, retries, fallback,
   tokens, human intervention, provider API cost when applicable, landed cost,
   acceptance, and evidence.
8. The relationship algorithm MAY trigger only a pre-authorized next action:
   execute the selected candidate, evaluate an accepted shadow, accept an
   accepted primary run, execute or request an approved fallback, or escalate.
   It MUST NOT mint authority, add providers, increase budget, or promote a
   challenger.
9. Promotion criteria and hypotheses MUST be declared before a comparison.
   A post-hoc correlation or an emergent-looking pattern is not promotion
   evidence by itself.
10. Executor economics MUST be compared as accepted outcomes per landed USD,
    not raw token volume or advertised token price.
11. A candidate list is an option set, not a request to run every candidate.
    Base A1 quality uses one selected executor. Fallbacks run sequentially only
    after a recorded failure.
12. A0 baseline-plus-challenger duplication MUST be sampled rather than applied
    to every task. A2 and A3 MAY use worker, reviewer, and integrator sessions
    because independent evidence is part of those lanes, not because plural
    agents are the default quality floor.
13. The portfolio cost model MUST separate base runs, sampled shadow runs,
    reviewed role runs, and deterministic verification cost.

## Autonomy and Trigger Relationships

| Level | Work relationship                     |                   Normal model passes | Next-action boundary                                           |
| ----- | ------------------------------------- | ------------------------------------: | -------------------------------------------------------------- |
| A0    | Research or sampled shadow comparison |                1; 2 only when sampled | Accepted shadow triggers evaluation, never automatic promotion |
| A1    | Bounded local execution               |                                     1 | Failure may trigger one sequential approved fallback           |
| A2    | Independently reviewed execution      |       3: worker, reviewer, integrator | Acceptance requires review and rollback proof                  |
| A3    | Promotion                             | 3 plus deterministic promotion checks | Production mutation follows the owning promotion policy        |
| A4    | High-authority or exceptional work    |            0 before operator decision | Always request an operator decision                            |

If `N` is the task count, `p` is the A0 shadow sample rate, and `q` is the
fraction routed to reviewed lanes, the rough model-run volume is:

```text
N base runs + (p * N) shadow runs + (2 * q * N) reviewer/integrator runs
```

Fallbacks add cost only to the failure rate. Deterministic tests, deploy smokes,
and rollback checks add elapsed and tool cost, but do not inherently add agents.

The algorithm is a state machine over explicit relationships:

```text
valid decision + no receipt -> execute selected
accepted primary receipt -> accept
accepted shadow receipt -> evaluate challenger
selected failure + automatic fallback approval -> execute fallback
selected failure + operator fallback approval -> request operator fallback
fallback failure or exhaustion -> escalate
invalid contract -> block
```

This is the practical lesson from the attached sorting discussion: algorithms
can behave differently for different input structure, but the system must name
the scoring function and initial conditions. CREATE SOMETHING does not infer
intent or authority from an interesting output pattern after the fact.

## Evidence

Each routing attempt consists of:

```text
Executor routing decision v1
Executor routing receipt v1
Decision-receipt binding result
Next-action result
Acceptance criteria and evidence
Provider/API cost when applicable
Estimated or observed landed cost and basis
Linear issue and approval references
```

The implementation is exported from
`@create-something/symphony/executor-routing-contract`; its JSON Schema is
exported from `@create-something/symphony/executor-routing-schema`.

## Stop Conditions

Stop and escalate when:

- a candidate does not support Responses or a local protocol consumable by the
  Codex execution path
- provider, model, data-retention, or inference-provider identity is ambiguous
- an external route lacks an approval reference or positive budget
- fallback would expand authority, data access, provider access, or spend
- landed cost or acceptance evidence cannot be recorded
- an A0 shadow result is being treated as production promotion evidence
- A4 authority is required

## Source Anchors

- `packages/symphony/src/executor-routing-contract.js`
- `packages/symphony/schemas/executor-routing.v1.schema.json`
- `packages/symphony/src/canonical-harness-gate.js`
- `docs/policies/v1/policy.operator-agent-production-lab.v1.md`
- `docs/guides/OPEN_WEIGHT_AGENT_EXECUTOR_EVAL.md`
- [OpenAI Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
- [OpenRouter Codex integration](https://openrouter.ai/docs/cookbook/coding-agents/codex-cli)
- [OpenRouter Responses API](https://openrouter.ai/docs/api/api-reference/responses/create-responses)
- [OpenRouter zero-data retention](https://openrouter.ai/docs/guides/features/zdr)
- [Z.AI Coding Plan tool integration](https://docs.z.ai/devpack/tool/others)
- [Cloudflare AI Gateway Codex integration](https://developers.cloudflare.com/ai-gateway/integrations/coding-agents/openai-codex/)

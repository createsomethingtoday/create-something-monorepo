# policy.operator-agent-production-lab.v1

- Status: `draft`
- Owner: `CREATE SOMETHING engineering operations`
- Effective date: `TBD`

## Purpose

Define how CREATE SOMETHING can use its own production surfaces as the lab for
AI-native agentic engineering while keeping client production, credentials,
destructive actions, and rollback authority inside explicit policy boundaries.

## Scope

- CREATE SOMETHING-owned repositories, apps, docs, workers, evals, policy
  artifacts, and operator tools
- Local and open-weight model workers such as `gpt-oss:20b`
- Sub-agent dispatch, self-heal loops, production-lab deploys, receipts, and
  rollback evidence
- Excludes client production unless a separate client-specific authorization
  packet exists

## Policy Statements

1. CREATE SOMETHING internal production MAY be used as an experimentation lab
   for agentic engineering when the loop records signal, context, policy,
   executor, verification, proof, next decision, and rollback.
2. Client production MUST NOT inherit CREATE SOMETHING production-lab autonomy.
3. Autonomous production-lab writes MUST be reversible, bounded to named
   surfaces, and preceded by the narrow relevant validation gates.
4. Autonomous production-lab deploys MAY proceed without per-change human
   approval only when all of these are true:
   - target is `create-something-internal-production`
   - risk is `low` or `medium`
   - rollback path is known and recorded
   - validation commands are named and pass
   - receipt is written before and after the action
   - no secrets, credentials, billing settings, data deletion, or third-party
     irreversible side effects are involved
5. When an autonomous production-lab deploy fails post-deploy verification, the
   same agent MAY execute the recorded rollback without per-change human
   approval only when the rollback is reversible, targets the deployment it just
   performed, and leaves rollback evidence in the same Linear issue, PR, release
   record, or local receipt.
6. Auto-rollback MUST stop and escalate instead of continuing when the rollback
   command is missing, untested, destructive, credential-bound, billing-bound,
   data-deleting, client-production scoped, or cannot be verified after it runs.
7. High-risk, destructive, credential, billing, data-migration, account-access,
   or client-production actions MUST escalate to the operator before execution.
8. Rollback remains an operator-owned authority outside the narrow
   production-lab auto-rollback case above unless a separate tested rollback
   automation policy exists for the exact surface.
9. Sub-agents are policy-bound profiles, not free actors. Each sub-agent must
   declare its scope, allowed actions, forbidden actions, required context,
   verifier, and evidence target.
10. Self-heal loops MUST start from observed evidence and stop at no-op when the
   owning truth surface is unavailable or ambiguous.
11. Model confidence is advisory. Validation, receipts, and policy gates decide
   whether autonomy may continue.
12. Every autonomous production-lab run MUST leave a receipt under the owning
    evidence surface: local receipt for experiments, Linear for shared work,
    PR/release/deploy notes for promotion.
13. A3 task completion MUST use a versioned promotion packet that names the
    Linear issue, target, risk, branch, commit message, review/promotion command,
    deploy command, production smoke, rollback, and rollback smoke. The worker
    MUST execute commands as argv without a shell and MUST reject protected A4
    command content before the first write.

## Autonomy Levels

| Level | Name | Allowed without per-change approval | Required gate |
| --- | --- | --- | --- |
| A0 | Read-only scout | Inspect repo, docs, tests, receipts, logs | receipt |
| A1 | Local patch | Modify bounded non-production files | targeted validation |
| A2 | Self-heal | Apply deterministic fixes for known drift | validation + rollback note |
| A3 | Production-lab deploy | Deploy reversible CREATE SOMETHING internal production changes and auto-rollback that same deploy after failed smoke | policy pass + validation + receipt + rollback verification |
| A4 | Operator-required | Destructive, credentials, billing, client production, irreversible data | explicit operator approval |

## Evidence

```text
Loop:
Autonomy level:
Target:
Risk:
Signal:
Context:
Policy:
Sub-agent:
Action:
Validation:
Production evidence:
Rollback:
Rollback evidence:
Outcome:
Next decision:
```

## Stop Conditions

Stop and escalate when:

- target is client production
- rollback is unknown
- validation is missing or fails
- the model proposes broad refactors without a bounded verifier
- the action touches secrets, credentials, billing, account access, or data
  deletion
- production health cannot be checked after a deploy
- the receipt would live only in chat

## Source Anchors

- `AGENTS.md`
- `docs/guides/LOOPS_ABOVE_AGENTS.md`
- `docs/guides/CODING_AGENT_HARNESS_PATTERN.md`
- `docs/guides/OPEN_WEIGHT_AGENT_EXECUTOR_EVAL.md`
- `docs/policies/v1/policy.git-light-agent-delivery.v1.md`
- `evals/local-models/open-weight-agent-executor.cases.json`

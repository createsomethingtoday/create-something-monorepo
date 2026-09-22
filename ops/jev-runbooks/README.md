# Local Jev reviews

Requires Node 20+, a server-side `TYPESAFE_API_KEY`, and a writable output/ledger directory. Run from the monorepo root. This makes recommendations and never executes suggested actions.

```sh
node ops/jev-runbooks/review.mjs failure ops/jev-runbooks/fixtures/missing-compiler.json /tmp/jev-review.json /tmp/jev-budget.json 0.01
```

The example runs the committed synthetic fixture. The output path must not already exist; ledger persists across invocations. Maximum argument is USD 0.01–5; each call reserves USD 0.01 without refunds on failure. This is a conservative local reservation policy, not a billing guarantee; review provider pricing before changing payload/question bounds. A later invocation cannot raise an existing ledger limit. A leftover `.lock` after a crash requires checking for an active owner before manual recovery. Do not delete a ledger to bypass its limit.

Modes and input JSON:

- `failure`: `{"log":"bounded, redacted diagnostic log"}`
- `candidate`: `{"query":"what is needed","candidates":[{"id":"known-handler","description":"what it handles"}]}`. Supply up to 15 unique candidates; no-match is always available.
- `evidence`: `{"claim":"the claim to check","evidence":{"observations":[]}}`. The result cannot close a receipt, authorize a deploy, or certify correctness.

Do not supply customer secrets or raw private incident dumps. Input minimization belongs to the operator/host. The output includes the source SHA-256 so reviewers can bind the recommendation to the original input.

Tests: `node --test packages/jev-client/test.mjs packages/jev-client/decisions.test.mjs ops/jev-runbooks/*.test.mjs`.

See `docs/internal/JEV_MONOREPO_ADOPTION.md` for application integration and remaining rollout work.

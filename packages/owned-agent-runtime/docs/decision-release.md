# CRE-2312 decision shadow release

Scope: shared decision library, offline operator CLI, live provider qualification,
and public Guide shadow measurement. Suggestions do not change the executor,
model, permitted tools, customer activation or Control approval policy. No task
quality improvement or autonomous policy learning is claimed.

## Acceptance evidence

- Isolated worktree based on `origin/main` at
  `ce3252b60e2a09342de211dd612fcacff4849d13`; current MCP SDK 1.32.0 retained.
- Pinned repo bootstrap completed. Workflow compiler/runtime builds and owning
  runtime typecheck passed. Full runtime suite: 163/163 passed.
- Independent Sol 6.1 review: 54 focused checks passed; independently exercised
  busy admission, background failures and unchanged baseline responses. No code
  blocker found for shadow release.
- Actual CLI resolve/readback/observe/replay reviewed. Invalid/missing evidence
  retains the baseline. SQLite checks preserve existing rows and reject scope,
  hash, semantic, overwrite and conflicting replacement violations.
- Both providers passed the same four frozen live contract cases with existing
  credential sources. The generic OpenAI key's HTTP 429 failures are retained in
  [the qualification report](decision-live-qualification.json).
- Production baseline: health 200, anonymous Control 401, and all three public
  Guide smokes passed before release.
- Deploy dry run passed: 3640.07 KiB upload / 621.55 KiB gzip. Existing Identity,
  D1, MCP service and rate-limit bindings inspected against the deployed version.

Functional correctness: passed locally and at the provider-contract boundary.
Perceptual/product quality: passed for actual CLI behavior and operator guidance;
the integration adds no graphical UI. Release readiness: local gates passed;
production promotion and post-release live readback remain separate checkpoints.

## Production promotion and rollback

Target: `create-something-agent-runtime`, CREATE SOMETHING account
`9645bd52e640b8a4f40a3a55ff1dd75a`, runtime D1
`1ea45279-a1d4-4c5d-93b1-b72c2f5bdd3e`.

1. Merge through the repository's required PR/status-check gate.
2. Reconfirm that only `0018_agent_decisions.sql` is pending; apply the additive
   migration using the explicit runtime Wrangler config and account.
3. Deploy the merged artifact with the existing Identity issuer/JWKS/audience
   flags and `AGENT_DECISION_MODE=shadow`. Retain the existing runtime secret.
4. Verify health, anonymous Control denial and the three public Guide cases.
   Independently read decision, outcome and ordinary run rows by exact run IDs.
   Verify resumed work has no additional shadow decision, no stored query text,
   and task-quality status remains `unknown`.
5. Record deployment ID, merged commit, canary IDs and D1 readback in Linear
   [CRE-2312](https://linear.app/createsomething/issue/CRE-2312).

Prior production Worker version:
`fedeb224-00d4-4dd1-bdb2-5c192d9cdf04` (100% deployment
`2ac26ecd-2e30-45d1-a375-c5edcaf17699`). Disable measurement by redeploying the
same artifact with `AGENT_DECISION_MODE=off`, or restore that prior version.
Do not drop the additive evidence tables during rollback. D1 data does not roll
back with code.

Worktree disposition: retained at `/tmp/cre-2312-runtime-decisions` on
`codex/cre-2312-runtime-decisions` until production verification and evidence
closeout. The original checkout and its unrelated edits remain preserved.

## Measurement limits

Shadow outcomes reference real completed/failed run receipts but retain unknown
answer quality. The response path stays ordinary, so a shadow suggestion cannot
be credited with solving that task. Query text is ephemeral and receipts retain
only its digest: reconstructing a semantic replay needs separately authorized
original evidence or a sanitized scenario. Synthetic provider matches and an
observed source-focus recommendation do not prove task-quality or cost gains.

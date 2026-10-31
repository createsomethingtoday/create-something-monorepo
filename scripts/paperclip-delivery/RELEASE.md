# CRE-2128 reviewed company-skill release

Source inspected: installed @paperclipai/server routes/company-skills.js, services/company-skills.js, routes/agents.js, services/authorization.js; shared validators/company-skill.js and adapter-skills.js. This runbook has not deployed anything.

## Authorized target and proof boundary

User authorized reviewed/tested production delivery, with human review afterward, and explicitly allowed every agent to create skills/agents and delegate parallel work within parent scope. This release targets the existing production Paperclip company library, not website production or protected agent-instruction replacement.

Company: `1fb053c2-aa2a-4d88-8c45-0ef82ac8aef5`.
Skill slug: `create-something-autonomous-delivery`.
Native skill key: `company/1fb053c2-aa2a-4d88-8c45-0ef82ac8aef5/create-something-autonomous-delivery`.
Release actor: `23b00202-f3a9-422f-87e7-cddcade20890`.
Baseline agents: coordinator `d2f5b148-0f4c-4ada-a5c4-971f05c7f421`; engineering `dc4b6a82-f78b-4917-bfea-b4b5c332c305`; reviewer `4e1e9d92-a052-4891-954d-2b7fa4e1d9ee`; release-QA `23b00202-f3a9-422f-87e7-cddcade20890`.

Use the active worker's injected `PAPERCLIP_API_URL`, `PAPERCLIP_API_KEY` and `PAPERCLIP_RUN_ID`: Authorization Bearer and X-Paperclip-Run-Id headers. Never print these variables or use board credentials/unauthenticated calls. The endpoints below include `/api`; if injected base already ends `/api`, append only the remainder. No global trust bypass or protected instruction writes.

## Preflight and scope

Read current native issue/run/lease; verify exact reviewed artifact SHA, tests and release scope. Read library list `GET /api/companies/1fb053c2-aa2a-4d88-8c45-0ef82ac8aef5/skills`. Resolve by exact key, never first fuzzy name. Existing slug conflicts are reconciliation signals, not reasons to delete/recreate.

Before changing an existing skill, save `GET /api/companies/:companyId/skills/:skillId`, `GET .../:skillId/versions/:currentVersionId` and current files via `GET .../:skillId/files?path=<encoded-relative-path>`. Record hashes, full native version ID and any baseline desired-version entries for agents. Backups contain reviewed policy, no credentials. One skill writer at a time. Verify native company skill policy permits `skills.create`/`skills.edit`. `canCreateSkills` alone does not prove all policy rules permit this target. A denied API call is not permission to change company policy or impersonate board.

## Library deployment

If exact key does not exist, create with `POST /api/companies/:companyId/skills`. Valid body fields are name (required), slug, description, markdown, sharingScope, plus optional presentation metadata. For this release use name `CREATE SOMETHING Autonomous Delivery`, slug `create-something-autonomous-delivery`, sharingScope `company`, and exact reviewed SKILL.md bytes in markdown. Require nonempty reviewed content before request; do not accept the server's fallback template. Service returns native skill ID and creates Initial version.

For each reviewed relative pack file call `PATCH /api/companies/:companyId/skills/:skillId/files` with `{path: relativePath, content: exactReviewedBytes}`. SKILL.md must retain valid name/description frontmatter. Each changed file creates a native version automatically; identical content does not. Do not attach an incomplete multi-file pack to agents. No arbitrary file deletions.

After all reviewed bytes match, `POST /api/companies/:companyId/skills/:skillId/versions` with `{label: "CRE-2128 " + exactReviewedCommitSha}`. This snapshots full inventory and updates `currentVersionId`; preserve returned id and revisionNumber. Re-read detail and `GET .../:skillId/versions/:versionId`, hash every returned fileInventory content and compare exact reviewed manifest. `GET .../:skillId/files?path=...` proves current library file bytes. If any mismatch, do not announce success or install. If a write response is uncertain, reconcile list/detail/files/versions first rather than blindly repeat.

## Agent attachment and use

Library deployment does not automatically attach the skill. Supported endpoint is `POST /api/agents/:agentId/skills/sync` with `{mode:"add", desiredSkills:[{key: exactNativeSkillKey, versionId: verifiedNativeVersionId}]}`. Use explicit pinned version and mode add to preserve existing desired skills. Mode remove is supported for reversing this attachment; mode replace overwrites the entire set and is inappropriate here.

This endpoint checks `agent_config:update`. An agent may update its own skill configuration under the native self permission. Updating another baseline agent can require `agents:configure`; a suggest-only grant may be denied. Do not interpret user agent/skill-creation permission as evidence the service has granted cross-agent configuration. Prefer each existing baseline agent performing its own scoped native sync during its normal assigned stage; do not manufacture extra dispatch merely to claim attachment. Do not use board credentials or protected-instruction bypass to attach it.

The sync endpoint attempts adapter.syncSkills (or listSkills fallback) and returns runtime snapshot. Read `GET /api/agents/:agentId/skills` where authorized; require expected key/version, desired=true, supported=true and actual installed/configured state consistent with adapter mode. Company detail usedByAgents is only desired assignment and does not independently probe runtime. Ephemeral runtimes can install on execution: verify a subsequent authorized run reads the actual pinned SKILL.md and records its hash before relying on behavior. An unavailable runtime probe remains unverified.

## Rollback

There is no dedicated company-skill version rollback/activate endpoint in the inspected route file. Previous versions are immutable evidence. For attached agents, restore each exact prior desired pinned version using mode add for this key. If this key was absent originally, mode remove with this key restores absence without touching other desired skills. Each agent can perform its own rollback; cross-agent authority remains enforced.

For library content rollback, replay saved previous version fileInventory bytes through PATCH files, then create a new version labeled with the restoration source version. Verify restored hashes. This is a new restorative revision, not pretending currentVersionId moved backward. Added files absent from baseline must be explicitly recorded; deleting them requires a separately authorized bounded deletion (do not silently broaden destructive authority). Prefer a versioned pack whose consumers pin known versions, so operational rollback needs only attachment restoration. For a newly created skill with no previous version, rollback is detachment/non-use and retention of the evidence-bearing library entry, not deletion.

## Completion receipts

Report separate levels:
1. Library deployed: native company/skill/version IDs plus exact file readback hashes.
2. Agent attached: each agent's desired pinned version and actual runtime snapshot, with any unverified agent named.
3. Behavior qualified: native implement/review-repair/interruption-recovery/release/live-verification lifecycle receipts. Library publication or installed skill does not establish autonomous production behavior.

Record rollback, exact reviewed revision, tests and Worktree disposition in Linear and native issue evidence. This skill release does not rewrite protected existing instructions and must not be represented as website deployment or broad fleet qualification.

## Exact source preparation

Before any library mutation, use the independently approved PR head and successful
`delivery-policy` check for that exact head. Confirm the repository review gate,
merge through its supported path and record reviewed head, merged commit and the
pack tree comparison. A whole-repository tree may include concurrent unrelated
changes; compare the authorized pack paths to the reviewed source explicitly.
Run the following from the exact merged checkout, without installing dependencies:

```sh
node --test scripts/paperclip-delivery/*.test.mjs
node scripts/paperclip-delivery/cli.mjs verify-manifest scripts/paperclip-delivery scripts/paperclip-delivery/manifest.json
node scripts/paperclip-delivery/cli.mjs manifest scripts/paperclip-delivery
```

Capture the generated inventory as release evidence outside the source pack. Bind
its content, the committed manifest's own SHA-256 and merged commit in the native
receipt. The manifest excludes itself to avoid self-reference. Upload every
inventoried file plus manifest.json. Compare the entire returned inventory and
manifest bytes, including unexpected files, before success. A passing local
predicate cannot replace any review, CI, native authority or provider readback.

## Qualification evidence

The first native review requested changes and automatically created engineering
repair issue CRE-63. [README's Qualification evidence](README.md#qualification-evidence)
now records the actual interruption, failed retry, human login restoration,
resumed implementation, review event and repair successor with native sources.
This is the submitted repair record, still requiring fresh independent review
and exact-revision CI. It does not establish production deployment, attachment,
runtime acceptance or complete autonomous behavior qualification. In particular,
the successful resumed implementation followed human login restoration; do not
describe the failed retry itself as a completed autonomous recovery.

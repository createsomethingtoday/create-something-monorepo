# policy.paperclip-browser-environments.v1

## Purpose

Status: **draft**. Owning scope: Linear [CRE-2150](https://linear.app/createsomething/issue/CRE-2150/scope-paperclip-browser-environments-by-agent-role); create-something Paperclip [CRE-109](https://paperclip.createsomething.agency/CRE/issues/CRE-109). The companion JSON is a declarative configuration artifact, not a loaded Paperclip authorization module. No role-level OS denial is claimed.

This policy serves Judgment. The separately owned unsigned broker supplies Automation; receipts and task bindings supply Database evidence. The client-agent-pilot instance is excluded.

## Policy Statements

### Role matrix

Assignment alone grants no browser or credential access. Every temporary grant needs an instance, task, named owner, target, allowed actions, expiry, and evidence location.

| Role | Repository | Unsigned browser | Signed-in Ego | Production | Integrations | Client devices |
| --- | --- | --- | --- | --- | --- | --- |
| Nonbrowser executor | Assigned worktree | Deny | Deny | Deny | Explicit task scopes | Deny |
| Browser engineer | Assigned worktree | Assigned broker read only | Deny | Deny | Task coordination | Deny |
| Unsigned UI QA | Assigned candidate read | Assigned broker read only | Deny | Deny | Task coordination | Deny |
| Named Ego operator | Separate assignment | Separate broker assignment | Explicit named task and exclusive lease | Deny | Explicit task scopes | Deny |
| Independent reviewer | Candidate read | Separate broker assignment | Deny | Deny | Evidence read | Deny |

These are required grants/denials, not proof that the host enforces them. The sandbox QA agent `3eb0a714-9796-4130-9fea-f58d556868b4` failed Ego bootstrap on create-something [CRE-124](https://paperclip.createsomething.agency/CRE/issues/CRE-124). That issue is now assigned to the named host operator `local-board`, with no agent assignee, and is in progress. [CRE-110](https://paperclip.createsomething.agency/CRE/issues/CRE-110) is the broader browser QA issue and remains blocked. After explicit approval for one additional space, the host operator's TaskSpace 12 rendered `https://example.com/`, awaited `finish({ keep: [] })`, exited 0, and was absent on list readback. This proves a public-page host lifecycle only; it does not prove an exclusive lease or a signed-in task. The engineer has no Ego grant.

The host-only lease wrapper is [`scripts/paperclip-ego-operator.py`](../../../scripts/paperclip-ego-operator.py). It requires a live issue in this company assigned to `local-board` with no agent assignee, the named macOS host UID, a host-owned task script, an exclusive mode-0600 lock, and no unresolved prior lease. The task script prints `OPERATOR_TASKSPACE_CREATED=<id>` after creation and `OPERATOR_TASKSPACE_FINISHED=<same id>` only after awaited `finish({ keep: [] })`. The wrapper checks the named TaskSpace before and after, requires matching lifecycle markers, and retains reconciliation state if execution or cleanup fails. The operator must inspect the task receipt and resolve retained state before another run. The wrapper does not grant browser access to Paperclip agents. It is authored but not yet qualified by a new Ego run under the lock; do not claim lease acceptance from the earlier TaskSpace 12 receipt.

## Evidence

### Recorded effective access and historical v2 probe

Readback on 2026-09-28 confirmed CRE-109 belongs to Browser Environment Engineer `d80267b5-6c6d-45b8-9357-441fda5614ac`. Its adapter is `codex_local`, cwd is `/private/tmp/cre-2150-browser-environments`, and `dangerouslyBypassApprovalsAndSandbox` is false. The issue has no `executionPolicy` or `executionWorkspaceId`. No agent-wide settings were changed.

For the historical v2 probe, the coordinator supplied a time-limited bearer capability for this exact task: `POST /read` through an ephemeral loopback listener, with page origin `https://example.com` and GET-only page traffic. This is application-enforced broker access, not general browser automation or an OS boundary. The engineer received no production, provider, client-device, or signed-in profile grant. The token is an existing narrowly scoped capability, not a credential to copy into the policy or evidence.

Two historical v2 broker requests returned HTTP 200, title `Example Domain`, visible page text, and zero initial/final cookies. The 800×600 screenshot was inspected. Its SHA-256 is `8fffe2a93ae72eb82bebbaa7bc7e040011cb43b572cd0eb7930c29dcd6d23ad4`. This proves the historical v2 public-page render only; it does not qualify the pending v3 candidate. A page that does not set storage cannot prove cross-request cookie, localStorage, sessionStorage, or IndexedDB separation. Coordinator/QA dynamic-fixture reports are separate evidence and do not substitute for independent review of their exact receipts.

The authorized negative Ego probe was only `await listTaskSpaces()` via the absolute CLI path, with all private output suppressed and a success marker printed only after return. It exited 4 without the marker. No TaskSpace was created. Failure of that operation is **inconclusive**, not proof that all absolute-path, profile, keychain, IPC, or control-endpoint access is denied. Do not repeat a successful control probe; stop and escalate if it unexpectedly succeeds.

## Unsigned setup and invocation

**Current gate:** broker v7 draft PR #1806 at commit `6178ddbf25abe0045d2ceeda7bccbad4faa512f6` preserves v6 implementation source SHA-256 `62a99a04017981e9b84023588e49ff3990f16f2613661b98b67980bd94f26743`. Host and agent QA passed bounded readback on those implementation bytes. Independent create-something CRE-139 accepted the R5 source repair and requested an R6 test-finalizer fix; independent CRE-142 reviewed the v7 fix and found no new blocking issue in that scoped diff. The v2 hash below is historical probe evidence only. Do not reuse an old session or apply the invocation recipe to a new task until the coordinator assigns an exact reviewed hash and task-scoped session. This policy PR #1801 remains unpromoted pending role-runtime denial and named Ego lifecycle acceptance.

The coordinator owns starting/stopping the host broker and its executable/profile/process cleanup. The engineer must not launch Chromium or start the broker. The broker source worktree is the separately owned `/private/tmp/cre-2150-browser-broker`; read its `docs/guides/UNSIGNED_BROWSER_BROKER.md`. The historical v2 source `scripts/unsigned_browser_broker.py` was checked against SHA-256 `9ac5f48f4a1140e6a69da95977092b73f760cf031d93d8304c72f1b9b43e87e6`. Preserve that worktree. An expired or absent session is a capability stop, not permission to mint another token or broaden origins.

For this assignment only, read `/private/tmp/cre-2150-browser-environments/broker-session/session.json` privately. Require a regular mode-0600 file, task `CRE-109`, unexpired metadata, and a literal loopback HTTP `/read` URL without userinfo, query, or fragment. Never print the token, put it in argv, upload the session file, or commit it. `/broker-session/` is ignored by Git; stage only named source files.

The request body must contain exactly:

```json
{"task_id":"CRE-109","url":"https://example.com","screenshot":true}
```

Use Python `urllib.request` with `ProxyHandler({})`, `Authorization: Bearer <token>` from the private file in memory, `Content-Type: application/json`, method POST, and a 30-second timeout. This POST addresses the broker API; it is not a POST to the public page. Save only the response receipt and decoded `screenshot_png_base64` into the current run's scratch directory, then register them as issue artifacts. Do not attach request headers or metadata containing the token. A response failure or `cleanup_failed_session_closed` stops execution and returns cleanup ownership to the coordinator. Do not silently fall back to host Ego.

The v6 broker contract specifies that each read creates a new unsigned worker/browser/context and uses a minimal environment. It exposes no caller script, click, selector, form, upload, profile, arbitrary-header, or arbitrary executable operation. Public traffic is bounded GET-only to configured exact origins; the broker's documented 500 ms settling interval does not establish that every dynamic application is ready. POST-dependent apps, private sites, interactive flows and broader UI automation remain unsupported.

## Teardown and evidence

The coordinator's broker expires within 900 seconds (default 300) or stops on SIGTERM/SIGINT, removes the session file and checks owned worker/browser processes before removing temporary profiles. The task agent must not kill host browser processes or delete shared caches. A crash/SIGKILL requires coordinator reconciliation. Expiry/cleanup of this provisioned session must be read back separately; a successful render is not a teardown receipt.

Record candidate source hash and policy revision; instance/task/run/agent; sanitized effective grants and expiry; exact request target; response HTTP status/title/text/cookie counts; screenshot hash and visual result; each rejection/failure; cleanup result; and which acceptance gates remain open. Keep token and any private Ego metadata out of all artifacts. Store durable receipts in the assigned issue, mirror evidence to Linear when access is available, and preserve worktree disposition.

## Enforceable boundary and promotion gate

A shared macOS UID, PATH omission, separate cwd, fresh browser profile, this JSON, and agent instructions do not isolate host Ego. The smallest candidate boundary is a separate restricted OS principal with denied profile/keychain/IPC access and denied browser bridge access, including loopback TCP. Separate UID alone is insufficient if an unauthenticated bridge is reachable. An existing isolated VM/remote runtime without host home/profile/socket mounts or bridge network access is the alternative. Boundary configuration must be controlled outside agent-writable paths and must not grant sudo or desktop automation.

A nonbrowser-role verifier must observe actual OS/runtime denial of the absolute executable, sensitive storage and control endpoints from the effective assigned runtime, without disclosing private data. Named-operator access is separately tested under its lease. Until both verifiers and independent review pass, this policy remains draft; do not label it installed, role-isolated, production-ready, or accepted. Do not self-approve, deploy, widen credentials, purchase resources, or mutate client-agent-pilot.

Rollback: discard this draft configuration or revert its commit. Coordinator stops the task broker and verifies its cleanup. No persistent role configuration or service was installed by this policy change.

## Source Anchors

- [Repository agent workflow](../../../AGENTS.md)
- [Paperclip instance operating model](../../guides/PAPERCLIP_INSTANCE_OPERATING_MODEL.md)
- [Unsigned browser broker runbook](../../guides/UNSIGNED_BROWSER_BROKER.md)
- [Owning Linear issue](https://linear.app/createsomething/issue/CRE-2150/scope-paperclip-browser-environments-by-agent-role)

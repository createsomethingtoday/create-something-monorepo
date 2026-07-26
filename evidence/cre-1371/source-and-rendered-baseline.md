# CRE-1371 Agency admin source and rendered baseline

Date: 2026-07-20

Verdict: **revise**. The 15 routes are registered as one pending tool cohort and the Agency package is healthy, but the current surfaces do not yet satisfy the target-reader or authority contract. Several pages hide failures as valid zero/empty state, five routes stop at session authentication instead of the existing operator allowlist, and the page openings often describe the system instead of telling the operator what to decide or do.

No production data, credential, token, approval, policy, or third-party state was changed during this baseline.

## Why the old review passed

The automated checks are internally consistent but incomplete for this task:

- `pnpm --dir packages/agency check` passes with 0 Svelte errors and 0 warnings. Its copy gate covers 118 public files and intentionally excludes these admin routes.
- `pnpm --dir packages/agency build` passes.
- The explicit prose audit over all 15 Svelte sources reports `status: pass`, `findings: 0`, `blocking: 0`, and `review: 0`.
- The Performance registry accepts a cohort contract as long as all sources are classified and the contract object is valid. The cohort remains `pending`; the audit does not claim that any individual page implements the declared decision, proof, or handoff.

Those checks catch syntax, package regressions, raw design-token debt, forbidden public terminology, long sentences, and selected abstraction patterns. They do not render the page or ask whether a junior operator can identify the task, source, authority, current state, next action, recovery path, and receipt. That is why sentences such as `Your 5-minute review. Then deep work.` and `Agent-native content scheduling with full observability` pass while failing the actual reading task.

## Cohort inventory

The cohort contains 15 page implementations and 7,272 lines across its Svelte and page-server sources.

| Route | Current opening/task | State and proof finding | Authority finding |
| --- | --- | --- | --- |
| `/admin/capture` | `Inspect captured... signals.` is the clearest opening in the family. | Distinguishes database failure from an empty view and names durable-decision unavailability. | Uses `requireAgencyOperator`. |
| `/admin/community` | `Your 5-minute review. Then deep work.` gives a time promise, not a decision or safe review sequence. | Load failures become zero stats and three empty collections; the visible page never renders `data.error`. Optimistic client removal occurs before the server result is known. The editable draft textarea is not submitted by the approve form. | Page load and mutation actions rely only on the global signed-in boundary, not `requireAgencyOperator`. Community APIs are session-protected, but any signed-in account can reach the page actions. |
| `/admin/funnel` | `GTM Funnel` and a date range do not state the operator decision. | Both non-OK API responses and thrown errors become authoritative-looking zeros and an empty lead list. | Page uses the global signed-in boundary only. `/api/funnel` and `/api/funnel/leads` do not enforce operator auth in their handlers. The funnel GET also writes derived metrics, so it is not a read-only endpoint. |
| `/admin/funnel/leads/new` | `Add a new lead to the pipeline.` names the action but not source ownership, duplicate handling, or the resulting record. | Client-only submission has no no-JavaScript path. | Global signed-in boundary only; POST targets an API handler with no operator check. |
| `/admin/funnel/record` | `Enter metrics... Existing data... will be updated.` names the mutation but does not distinguish derived and manual fields or identify the receipt. | Client-only submission has no no-JavaScript path. | Global signed-in boundary only; POST targets an API handler with no operator check. |
| `/admin/governance` | `Governance Records` fronts several distinct record-creation and inspection tasks. | Source, subscription, receipt, attachment, Signal, Decision, and Proof operations retain their data and policy contracts, but 1,446 lines create a long peer-level workspace with no shortest safe sequence. | Uses `requireAgencyOperator`; mutation actions retain the database and governance service boundaries. |
| `/admin/map` | `Map operations` names the area; supporting copy states the prepared-handoff boundary. | Commercial approval/configuration, entitlement lifecycle, immutable payload, explicit Build intake, receipts, and recovery remain visible. Source is compressed into 27 lines, making reading and maintenance harder. | Uses `requireAgencyOperator`; handoff acceptance remains scoped through the Map workspace service. |
| `/admin/security` | `Security Operations` names the area but not the first decision. | Summary and recent tables expose entitlement, contract, billing, seed, and denial evidence without hiding missing data as success. | Uses `requireAgencyOperator`. |
| `/admin/security/audit` | `Audit Explorer` names the tool but not the question, scope, or freshness. | Three peer feeds expose records, but the page does not lead with what to investigate or how absence differs from unavailability. | Uses `requireAgencyOperator`; upstream identity audit request retains its server owner. |
| `/admin/security/bearer-tokens` | `Managed Bearer Governance` assumes internal vocabulary before the operator's task. | Saves several authority fields directly; feedback and recovery exist but the page does not summarize the resulting access decision as a receipt. | Page and API use `requireAgencyOperator`. |
| `/admin/security/commercial` | `Commercial State` names a record category, not a decision. | Table preserves billing and contract source state; empty copy does not explain whether no rows or unavailable data produced the result. | Uses `requireAgencyOperator`. |
| `/admin/security/contracts` | `Contract Ledger` names the record system, not the required judgment. | Client fetch/save has loading and error text, but the page does not plainly explain which access decision a contract changes. | Page and API use `requireAgencyOperator`. |
| `/admin/security/partners` | `Partner Mappings` names the data but not the operator task or ownership boundary. | Read-only table preserves client, workspace, identity, and status fields. | Uses `requireAgencyOperator`. |
| `/admin/security/seeds` | `Seeded Users` names the implementation concept before explaining the provisioning task. | Create/update and bulk-import actions retain the policy destination, but action scope and resulting account/access state require synthesis. | Page and API use `requireAgencyOperator`. |
| `/admin/social` | `Agent-native content scheduling with full observability` is promotional and does not state the task. | Missing DB/session state supplies `error` but the Svelte page does not render it; `{stats?.pending || 0}` and empty schedule/rhythm states therefore look authoritative. Links expose API and MCP implementation inventory instead of one next operator move. | Page uses the global signed-in boundary only. Social read and mutation API handlers do not call `requireAgencyOperator`. |

## Source, policy, and authority boundaries to preserve

- First-party CREATE SOMETHING Identity remains the session owner.
- `AGENCY_OPERATOR_EMAILS` and `requireAgencyOperator` remain the existing page/API operator boundary; this work must not introduce another provider or a broader role model.
- Capture review must not mutate captured source rows. Stored review decisions remain separate and migration-gated.
- Governance actions retain the Signal -> Decision -> Proof model, source/subscription/receipt ownership, validation, and database fail-closed behavior.
- Map retains exact account, tenant, and workspace scope; commercial approval and price configuration remain fail closed; accepting a prepared handoff must preserve its immutable payload and receipt.
- Security pages retain contract, billing, policy, org-membership, entitlement, partner, seed, and audit lineage. Copy changes cannot grant access or reinterpret legacy entitlements.
- Funnel metrics retain derived analytics ownership and explicit manual upsert semantics. A repair must not call the side-effecting GET during evidence collection.
- Social posting/cancellation remains behind its existing LinkedIn connection and storage contracts. This cohort must not issue, reveal, refresh, or revoke credentials.

## Rendered boundary

The current production signed-out boundary was read back for all 15 routes. Every route returns HTTP 302 to `/login?redirect=<encoded local route>`, preserving the exact requested admin destination. No protected page payload was exposed in the anonymous response.

The user-supplied mobile capture of `/admin/capture` provides one current authenticated rendered example. It has one visible H1 and a usable record-navigation surface, but the opening still begins with the internal label `Operator Surface` and describes storage mechanics before the operator's immediate review decision. It also demonstrates the core review lesson: a structurally valid mobile page can still be unnecessarily dense or self-referential.

Authenticated empty, unavailable, error, success, confirmation, recovery, keyboard, reduced-motion, mobile, desktop, and no-JavaScript states still require a current-build fixture or preview after the fail-first source contract is established. Historical screenshots or anonymous redirects are not counted as that proof.

## Baseline commands

```text
pnpm --dir packages/agency check
  pass; svelte-check 0 errors / 0 warnings

pnpm --dir packages/agency build
  pass

pnpm prose:audit -- <15 scoped +page.svelte files> --format json
  pass; 15 files, 0 findings, 0 blocking, 0 review

curl -I https://createsomething.agency/admin/<route>
  15/15 return 302 to the exact encoded local login destination
```

## First observable contract

The first test should fail on the gap the existing suite missed:

1. every route in the admin cohort must expose the existing operator allowlist boundary before reading or mutating operator data;
2. load failure must remain visibly different from a valid zero or empty result;
3. each page opening must name the immediate operator task or decision in plain language;
4. a mutation must name its source, consequence, and resulting receipt or recovery path;
5. the registry cannot advance this cohort from `pending` until current rendered-state and human-language review evidence exists.

The implementation should make these checks true with the smallest route-owned changes. It must not collapse distinct data contracts into generic copy or treat a machine-green audit as the final judgment.

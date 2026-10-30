# Meeting Recap recovery: bounded transport correction

Tracked work: [CRE-2283](https://linear.app/createsomething/issue/CRE-2283/restore-meeting-recap-transcript-publication-and-qualify-downstream).

This candidate lets a throttled Notion read finish without replaying its preceding write. It does not reset uncertain operations, publish readiness manually, invoke agents, repopulate transcripts, change permissions, or install the prior all-meetings hold.

## Deployed baseline

On October 30 at 13:05–13:08 UTC, production `halfdozen-zoom-transcript-sync` routed 100% to version `13cfc8b3-a7cd-4ada-9392-292ac155bf14`, deployment `add2ae13-e81a-4df6-998e-aff6005009cb`. The extracted 114,305-byte JavaScript matched retained October 26 release SHA-256 `2eb6b897db01ead49fc9157029c5939a2ee3198ef1beb85d2549d8a66466b906`.

Git main lacked that already deployed pages-v2 publication implementation. This change first restores its source and corresponding tests. Compared with the retained deployed source, only `notion.ts` changes behavior: safe reads retry recognized 429/529 responses. Source planning, child-page publication, lease checks, immutable archives, journals, lifecycle fields and readiness gates retain the deployed behavior. The compiled bundle differs from the retained production bundle only in the retry change and build-path comments.

## Acceptance and evidence

- GET and explicit database-query POST may retry recognized `rate_limited`/`service_overload` responses. Requests stop after three attempts or 120 seconds cumulative sleep per read. Integer Retry-After is honored; an over-budget cooldown is surfaced rather than shortened. Missing/malformed headers use bounded exponential backoff and jitter.
- Mutations, ambiguous/network errors, blocked access, unrecognized responses and other errors are never retried by this change. The serialized read query remains unchanged across attempts.
- The regression failed on the old transport. The actual artifact writer now survives a committed append followed by a throttled readback with exactly one append, intact reservation and positive exact receipt adoption. An unchanged repeat writes nothing.
- Independent Sol 6.1 review re-ran 121 package tests, 20 local workerd/D1 runtime tests and TypeScript successfully. These providers are synthetic; live recovery is a separate gate.
- Wrangler 4.110.0 dry-run passed. Candidate JavaScript SHA-256: `09667a3e37fe4569f8e36f8e629a865d721716cb117c2bf61884d67b791c29a6`.

At 13:15 UTC a terminal, fully paginated Notion query returned 25 managed meetings: 11 had matching Current/Ready/Categorized versions and 14 lacked Ready. For one October 29 ready meeting, three linked Tasks and one Resource were read back in the existing operational databases with reciprocal source relations and `in_trash=false`. This verifies existing output records, not the full transcript intake or semantic completeness of those native runs. No new agent session was invoked.

## Promotion and rollback

The production target remains account `5c3e9cf4d55ce171b844fad0931607f9`, the same Worker, D1 `685613a0-05da-4d0c-a932-579d51db7fb8`, existing queue/DLQ, and hourly cron. Use a reviewed Git promotion. Refresh the live version/settings immediately before promotion and stop on drift. Preserve runtime variables and secret bindings, especially gate enablement and cutoff `2026-10-23T17:16:35.564Z`; the checked-in config does not contain all live variables. A plain deploy without preserving those variables is unsuitable.

After deployment, verify exact code, 100% routing, bindings, cutoff, gate setting, schedule and read-only health. Observe the existing queue/cron outcomes; do not issue a bulk scan, replay, reset reservations, or infer success from discovery's `success` status. It can coexist with failed ingestion jobs. This read-retry patch is not connection-wide pacing and cannot prevent another caller from exhausting Notion's budget.

Rollback uses the recorded pre-change immutable Worker version after fresh settings comparison, retaining all D1/Notion state. Relative to that live version this patch adds no schema or transcript format. A rollback changes read retry behavior only; it must not delete journals, erase sources or replay work.

## Remaining recovery gates

Fourteen projections were still writing and five reservations unresolved in the production read. Historical logs recovered five matching 429 errors, but their URL is shared by append PATCH and readback GET. A 429 can follow an already committed append; those logs do not authorize retrying the mutation. Use positive exact artifact receipts or provider request-method/commit evidence. The five reservations remain untouched.

Twelve affected meetings have complete stored originals; reuse them. Two LD recordings have incomplete stored originals and need their selected source files. Neither absence nor a completed client session proves an old request cannot commit. Nine affected meetings without a current uncertain reservation are candidates for the existing writer's guarded positive-receipt continuation, not pre-certified recoveries. Weekly's repaired fixture also needs exact manifest/receipt reconciliation and preservation of its existing brief/log.

Full recovery requires current source/receipt verification, native consumer intake and output readback for the affected meetings. Broader agent permission changes, an all-meetings hold, unrelated drafts, pending human approvals, and alternate output-authority contracts are outside this transport correction. Do not call the full workflow resolved from its local tests or an HTTP200 health check.

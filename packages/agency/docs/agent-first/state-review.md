# State transitions: scoped recommendation

The recommendation is relevant where ordering, async completion or authority matters. A union names valid states; a reducer also defines transitions. Neither by itself provides server authorization. A full statechart library adds hierarchy, parallel regions and scheduling semantics; those costs are not justified for the local brief.

The supplied Matt Pocock quotation motivated this review. The linked X post returned 403 on 2026-10-16, so its surrounding context was not independently verified.

## Existing implementations

- `packages/mapping-canvas/src/lib/agent-relay.ts:55`: server transition rules atomically claim queued commands, turn expired running commands into `unknown`, reject changed payload reuse by argument hash and prevent replay after missing acknowledgement. `agent-relay.test.ts` covers one-time pairing, role/project isolation, revoke, expiry and uncertain results. This is a real state machine implemented with SQL guards, not a frontend statechart library.
- `packages/mapping-canvas/src/lib/agent-activity.ts:41`: action tokens include project and sequence; completion drops late results for another project or already-finished action. This is an imperative stateful module with guards and tests, not a pure reducer. Its running/completed/failed labels describe ephemeral activity, not authoritative remote outcome.
- `packages/mapping-canvas/src/lib/AgentConnection.svelte:7`: UI independently tracks connection, busy, connected, name, message and running; poll effects have cleanup guards. An extracted reducer could make pairing/online/reconnecting/revoking/expired and late responses explicit. Treat this as a follow-up, not proof of a reproduced defect. Failed revoke must retain uncertainty about server access, not show disconnected success; reload must revalidate session/project/expiry before readiness.
- `packages/mapping-canvas/src/lib/webmcp.ts:803`: optimistic revision check runs only when a revision is supplied. `draw_execute` requires one, but several legacy editing/destructive surfaces make it optional; reset takes confirmation text without revision. Exact confirmation strings are not authenticated, revision-bound human approvals. Before adding higher-risk execution, require a proposal hash/revision plus server-validated authority and invalidate approval after edit. Do not silently retrofit every tool in this change.
- `packages/canon/src/lib/components/performance/PerformanceConversionHandoff.svelte:4`: draft/review/ready/stop is a presentation union. `PerformanceEvidenceIndex.svelte` similarly labels draft/review/verified/archived. They do not enforce transitions or prove backend verification. Keep Canon responsible for consistent display/accessibility, with the product owning facts and guards.

## Applied to this brief

`src/lib/support-brief/state.ts` is a pure reducer over editing, invalid and prepared. The current draft/revision is the context. Edit/import/clear invalidate the prepared view. Export events carry the revision and only affect prepared state at that revision. Invalid import keeps the prior draft. Duplicate prepare is stable. New page state is empty; there is no persisted receipt to restore.

Download is an imperative effect outside the reducer. The UI reports only “download requested,” not filesystem success. There is no remote operation here, so adding a fake unknown/submitted/approved branch would misrepresent capability. If a submission backend is added, use distinct submitting, succeeded(receipt), failed(known rejection), unknown(reconciliation required) states keyed by immutable operation ID; never blindly retry unknown writes. Bind any approval to exact tenant, operation, arguments/hash, revision and expiry, and verify on the server.

Acceptance tests in `test/support-brief.test.ts` cover invalid input, schema/skill parity, unsafe evidence markup, edit invalidation, stale events, duplicate preparation, failed imports and clear/reload initialization. Browser interaction acceptance is still pending because the user was actively controlling Chrome. No new dependency or Draw refactor is included.

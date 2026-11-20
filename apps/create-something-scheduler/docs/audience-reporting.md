# Private audience reporting

`AudienceReports` is a named Workers service-binding entrypoint. Its only report
method, `getBookingSummary`, reads the existing `micah-johnson` host Durable
Object. There is no public HTTP report route, host selector, operator-token
sharing, or provider API call. The caller owns its administrator authorization.
The `.io` admin scorecard calls this capability only after its first-party admin
gate. Cloudflare's service-binding capability is the server-to-server boundary.

The caller binds service `create-something-scheduler`, entrypoint
`AudienceReports`, under its server-only `SCHEDULER_REPORTS` binding. No scheduler
migration or new secret is required. Deploy the scheduler entrypoint before the
caller; an absent entrypoint or failed read must remain unavailable in the caller.

```ts
await env.SCHEDULER_REPORTS.getBookingSummary({
  current: { start: '2026-11-04T00:00:00.000Z', end: '2026-11-11T00:00:00.000Z' },
  prior: { start: '2026-10-28T00:00:00.000Z', end: '2026-11-04T00:00:00.000Z' }
});
// {
//   source: 'scheduler-receipts',
//   current: { committed: number, rescheduled: number, cancelled: number },
//   prior: { committed: number, rescheduled: number, cancelled: number },
//   latestAt: string | null
// }
```

Windows must be adjacent, equal 7/30/90 complete UTC days with exclusive ends.
Boundaries are UTC midnight, not offset/local dates, and the current end cannot
be in the future. Additional fields are rejected before resolving the host DO.

`BookingReports` owns this observability query independently of
`BookingService`'s scheduling commands and provider dependencies.
`DurableBookingReportStore` has no constructor initialization: its fixed SELECT
queries read the existing receipt table, without creating schema, refreshing
Google credentials, setting an alarm, or writing any lifecycle/idempotency state.
Missing, malformed, or over-50,000-receipt ledgers fail with a generic unavailable
error. An empty existing ledger returns actual zero counts.

New bookings are distinct booking IDs dated by their **first committed receipt**
across stored history. Replayed committed records cannot become a new booking in
a later window. Reschedule and cancel counts are lifecycle receipt counts,
reported separately. They do not add to new bookings or establish current active
bookings. `latestAt` is the latest contributing lifecycle time in the two report
windows, not proof of ingestion health or fresh Calendar verification.

The return value contains no booking/receipt IDs, names, email addresses, notes,
source URLs, provider event identifiers, meeting URLs, action tokens, or private
context. Receipts may still reflect operator/test activity; counts are not proof
of qualified customer demand or accepted business value.

## Validation and release boundary

The initial named-entrypoint regression failed before implementation. After the
change, scheduler type-check and all tests passed: 91 unit, 33 Worker runtime
(including eight report regressions), and seven monitor tests. The dry-run
production build also passed. Evidence: `docs/analytics-evidence/`.

Report regressions exercise empty existing storage through the actual named RPC,
first-commit replay across windows, ISO/sqlite UTC boundaries, reschedule/cancel
separation, safe output, no provider fetches, unchanged receipt rows/alarm/write
counts, fixed-host isolation, invalid intervals, corruption, receipt limits and
absence of an HTTP report endpoint.

The installed Workers Vitest pool duplicates unhandled rejections for expected
same-isolate RPC exceptions. Negative SQL cases therefore catch errors inside
the real DO; invalid entrypoint input calls the real entrypoint instance directly.
Successful report tests use the full named-entrypoint RPC path. These are local
runtime fixtures, not deployed-booking evidence.

No merge, deployment or production state mutation is part of this implementation
handoff. Parent owns independent final review and promotion. Rollback is a
focused scheduler code revert/redeploy plus removing the caller service binding;
no ledger or Calendar data needs reverting.

Official platform references checked for the installed runtime/configuration:

- [Workers RPC and compatibility](https://developers.cloudflare.com/workers/runtime-apis/rpc/)
- [Service-binding RPC and named entrypoints](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/rpc/)
- [Workers test APIs](https://developers.cloudflare.com/workers/testing/vitest-integration/test-apis/)

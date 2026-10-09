# Realtime lifecycle safeguards

Each object persists facility identity and availability. The next alarm is the earliest pending hold expiry; when no timed holds remain, it deletes its alarm. Reservations imported from D1 have no timed expiry and do not create background work. WebSockets use Cloudflare hibernation and hold state survives eviction. Confirmation rejects expired holds even if alarm delivery is delayed.

The public worker and Svelte realtime callers check that a facility exists before allocating a namespace object. Internal requests must include `?facilityId=...`; the DO checks this against its named ID and validates court ownership for slot mutations. Deploy caller changes together with the worker. `/cancel` from the existing reservation route carries the reservation's stored facility ID.

These checks bind requests to an existing facility; they do not add member authentication or payment authorization. Those existing application admission policies need a separate security review before exposing this dormant service. Unknown facility requests still perform a bounded D1 lookup. Known-facility abuse can still cause request/storage usage; no account spend cap is claimed.

Run `pnpm --filter @court-reserve/realtime-worker test:cost-guards`. Tests use storage/socket/D1 fakes and no production requests. Before deployment, validate hibernation and alarms in a local Workers runtime and stage the caller/worker release together. Rollback restores the previous caller and worker versions; new persisted keys are additive, but old code ignores them and resumes its perpetual timer. No production changes are included here.

The cache has a technical ceiling of 512 slots / 96 KiB serialized data, below the per-value storage limit. New holds or D1 syncs exceeding that ceiling return 503 rather than partially applying updates. Identity strings are bounded, and cached untimed slots older than 24 hours are pruned on access. D1 remains authoritative for history. Confirm capacity against the intended facility size before rollout; this is a cache safety bound, not a dollar quota.

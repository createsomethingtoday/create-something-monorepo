# Weekly PM Sync pending append recovery

Bounded to `41301918-7ac5-815d-9613-c25a28db67a8`, generation 1, offset 800,
the historical reservation at `2026-11-09T19:05:37.530Z`, and the terminal
409 request `770fcead-196b-44ff-b897-3cbdc09e90b3`. This controller never edits
the projection, original write journal, readiness fields, transcript gates,
ledger, source archive, or reader index. It only appends the exact next 80 root
blocks once and records a separate attempt/effect/receipt. The native writer
adopts the observed IDs from its existing pending reconciliation after release.

The private capture directory must contain `projection.json`, `ingestion.json`,
`journal-full.json`, `schema.json`, `all-lists.json`, `metadata-before.json`,
`metadata-after.json`, and `live-adapters.mjs`. The latter exports `cf`, `notion`,
`secret`, `account`, and `database` from the operator's credential reader.
`journal-full.json` must capture `operation_key,reserved_at` with the selector
`instr(operation_key,pageId)>0 OR instr(operation_key,archiveId)>0`, ordered by
operation key. Credentials remain in memory. All D1 writes use the Cloudflare query API;
the existing installed pilot control/effect triggers enforce exclusivity.

Supply a reviewed planner module exporting `parseTranscript`, `planTranscript`,
`inlineBlocks`, `fingerprint`, `blockText`, and `artifactMarker`. Exact historical
plan version and all 800 root fingerprints must match. `prepare` reconstructs
the original UTF-8 bytes from 23 base64 archive artifacts and verifies every
original and reader part against that plan. The source bytes and capture stay
in the private evidence directory.

The normalized terminal evidence is JSON with `oldKey`, `reservedAt`,
`provider:{status,code,requestId,path,query}`, `methodInference:true`,
`historicalBodyFingerprintRecorded:false`, `coverage:{complete,abr,total,returned}`,
`matches:1`, and `event:{selectedKeyMatches,scriptVersion,at,id,invocation}`.
Coverage must come from the actual telemetry retrieval, not an inference from
the number of copied events. The historical HTTP method is explicitly inferred
from the retained deployed bare PATCH URL versus the paginated GET URL; there
is no fabricated historical request-body fingerprint.

```sh
node --test packages/halfdozen-zoom-transcript-sync/scripts/recovery/pending.test.mjs
RECOVERY_SCHEMA="$CAPTURE/schema.json" node --test packages/halfdozen-zoom-transcript-sync/scripts/recovery/live-adapter.test.mjs
node packages/halfdozen-zoom-transcript-sync/scripts/recovery/controller.mjs prepare "$CAPTURE" "$PLANNER" "$TERMINAL"
node packages/halfdozen-zoom-transcript-sync/scripts/recovery/controller.mjs inspect "$CAPTURE" "$PLANNER" "$TERMINAL"
node packages/halfdozen-zoom-transcript-sync/scripts/recovery/controller.mjs admit "$CAPTURE" "$PLANNER" "$TERMINAL" --execute-authorized
node packages/halfdozen-zoom-transcript-sync/scripts/recovery/controller.mjs apply "$CAPTURE" "$PLANNER" "$TERMINAL" --execute-authorized
node packages/halfdozen-zoom-transcript-sync/scripts/recovery/controller.mjs release "$CAPTURE" "$PLANNER" "$TERMINAL" --execute-authorized
```

`prepare` is an offline capture qualification, and `inspect` performs live
read-only reconciliation. `admit`, `apply`, and `release` require authorization.
Review and independently re-test before admission. A prepared dispatch expires
after 15 minutes; the exclusive hold expires after 20 minutes. Expiry does not
release the hold automatically. No re-admission or new owner is permitted for
the same meeting by the installed retain-control trigger.

On unknown responses or interruption, retain the owner/fence and inspect the
durable attempt and effect. Rerunning `apply` never resends an existing absent
attempt; an exact positive 80-block readback can resolve it. A partial batch,
human edit, changed source, owner loss, journal change, schema change, or changed
writer deployment stops dispatch. Never delete or reset the historical journal
or attempts. `release` is allowed only after a positive receipt and independent
source reconciliation. Continue with the native runtime and verify completed
inline projection, retrieval index, source fields, and downstream outcomes
separately. A verified pending batch alone does not prove whole-meeting recovery.

Current tests use offline fixtures. Live D1/Notion admission, append, release,
and native completion require separate execution evidence.

# Local session registry pilot

Approved bounded experiment, separate from Draw 0.1.1 / PR1908. Base:
`origin/main` at `62d7a20d4787fe54589a3a3fdc2a19b5d67fd18f`.
No canonical storage migration, native changes, CTX writes, transcript copying,
cloud/team sharing, deployment or release changes.

## Ownership and activation

Open the local browser Draw URL with `?registryPilot=1`. Without that query the
existing catalog is unchanged. Native shells do not enable these tools.

Draw's existing project IndexedDB owns map content. A separate browser-local
IndexedDB (`create-something-draw-session-registry-pilot`) stores the closed
`draw.session-registry.v1` reference/receipt envelope. It does not store commands,
map snapshots, transcripts, file paths, capabilities or tokens. Caller-supplied
IDs must be opaque labels: schema validation cannot recognize a secret disguised
as an otherwise valid ID. Origin storage/browser profile remains the actual
access boundary; client/workspace IDs are selection labels, not authentication.
This is suitable only for one consenting operator's bounded local pilot.

## Tools

| Tool | Purpose |
| --- | --- |
| `draw_registry_register` | Assign a canonical map ID to one explicit client/workspace scope |
| `draw_registry_link` | Opt in to linking a Claude/Codex provider/source/session ID |
| `draw_registry_resolve` | Read linked maps from current canonical Draw state |
| `draw_registry_edit` | Guarded edit with operation ID, expected revision and linked session provenance |
| `draw_registry_export` | Export one scope's references and receipt hashes |
| `draw_registry_import` | Explicit opt-in merge of a validated scoped reference export |
| `draw_registry_export_bundle` | Explicit opt-in export of persisted Canvas maps plus their scoped registry |
| `draw_registry_import_bundle` | Explicit opt-in create-only restore preserving map IDs and hashes |

Minimal logical reference: `{provider:"codex",sourceId:"fixture-local",providerSessionId:"codex-fixture"}`.
Source authority is part of identity. A provider session ID is never a file path
or a CTX-derived ID. References are caller assertions; this pilot does not verify
that a live provider session exists or infer the current session automatically.

Session linking and import require `optIn:true`. Registered canonical map IDs
cannot be assigned to another scope, because existing canonical storage is keyed
globally by map ID. Missing canonical maps remain unresolved references, not
transcript-reconstructed maps. A later session can discover its linked current
map even after the browser process restarts. Editing requires that map to be open.

## Receipts and recovery

An atomic IndexedDB transaction reserves an operation ID as `unknown` before
calling Draw. Repeated identical requests return the existing receipt; different
requests reusing the ID reject. The request hash includes revision, commands and
session provenance, but commands themselves are not stored. Unknown outcomes
must be inspected/reconciled by the operator, never automatically retried.

`committed` means the existing Draw edit boundary returned the matching map and
revision and canonical persistence succeeded. It does not mean renderer
verification. `failed` means the service detected absent/stale canonical state
before invoking Draw. A thrown mutation, switched map, changed returned revision
or failed persistence stays `unknown`, conservatively even when no mutation may
have occurred. Replan with a new operation ID after a stale rejection.

Core receipt validation distinguishes `verified` and permits an unchanged
committed receipt to be promoted only with matching content hash/revision. The
browser adapter does not perform or claim that promotion. Imported receipt states
are historical assertions from the selected file, not freshly verified edits or
cryptographically authenticated provenance. Import can reserve operation IDs and
must therefore be restricted to reviewed local exports.

Draw map save and registry receipt save are separate transactions. A crash after
map mutation preserves the prior `unknown` reservation. This is deliberate
at-most-once submission protection, not a claim of distributed exactly-once
execution. No automatic retry, reconciliation or receipt compaction is included.

## Export, retention and portability limits

Exports preserve registry IDs, linked session provenance and SHA-256 hashes;
they omit map content. Imports are atomic, reject cross-scope records and merge
without replacing current maps. No CTX availability is required.

The separate `draw.session-bundle.v1` path closes Canvas-map portability without
changing normal Draw UI import (which still remints IDs for a different map).
Bundle export requires `optIn:true` to copy authored Canvas content, including
notes and conversion snapshots, plus scoped references and historical receipts.
Authored text is not redacted and can itself contain sensitive material; no
provider transcript, credential or arbitrary metadata field is added by the
integration. Bundle import independently requires explicit consent. Motion
projects, browser settings, live provider session files and credentials are not
part of this Canvas mapping bundle.

Bundle validation rejects unknown envelope/document fields, invalid membership,
non-JSON values, normalization changes and SHA-256 mismatches before writes.
Export refuses unsaved/current-versus-stored differences. Import rejects all
known other-scope, unregistered occupied-ID, Motion-only and changed-content
collisions before writes. An exact existing map may be reused only when already
registered to the same scope. Restore uses an atomic create-if-absent transaction
in the existing project store and never overwrites, merges or activates a map.
ID, object references, timestamps and canonical content hash are preserved.

Registry ownership is reserved first, missing maps copied next, and session links
and receipts published last. These are separate databases, so interruption can
leave ownership reservations and a partial map copy. An `incomplete` result
reports accepted map IDs and requires inspection; resume with the identical
reviewed bundle rather than assuming rollback. A repeated complete restore does
not recopy maps or duplicate links/receipts. Changed canonical content remains a
collision, never an automatic overwrite. Open the restored ID using Draw's
existing `?project=<mapId>&registryPilot=1` route. Scope labels describe one
operator's organization of client work; they provide no multiuser authorization.

Caps: 200 maps, 2000 links, 10000 receipts, 8 MB registry export/import and 4 MiB
hash input. Capacity rejects explicitly rather than silently evicting receipts.
No automatic retention or schema upgrade is implemented. Export before removing
the pilot's separate IndexedDB through browser site-storage controls; doing so
leaves canonical maps intact, but removes receipt replay protection. Disabling
the query only hides tools and does not delete data. Browser storage remains
subject to profile deletion/eviction, so this is not a backup system.

## Evidence and remaining acceptance

`pnpm --dir packages/mapping-canvas test`: **373 tests pass across 33 files**.
`pnpm --dir packages/mapping-canvas check`: **0 errors, 0 warnings**.
Thirty-six new unit tests cover service, adapter and bundle behavior, including
duplicate races, storage failures, session provenance, rich Canvas content,
occupied-ID collisions and recoverable partial copies.

Run the real-browser verifier against a local dev server:

```sh
pnpm --dir packages/mapping-canvas dev --host 127.0.0.1 --port 5197
node packages/mapping-canvas/scripts/verify-session-registry.mjs
```

`DRAW_CHROMIUM_PATH` optionally selects an already installed executable. This host
used cached Chromium headless shell 1228 with Playwright 1.58.2, avoiding a new
browser download. The verifier creates and removes a private synthetic profile.
It passed default-off activation, logical Claude/Codex linking, guarded editing,
durable committed receipts, duplicate replay, stale rejection, two-client scope
isolation, scoped export/import and a full browser-process restart. The extended
verifier restored a bundle into a second fresh profile and verified the exact
document, map ID, content hash, references and receipts after reopening and a
second browser-process restart. Replaying the imported edit receipt did not
mutate the map. Changed-map collisions and wrong-scope bundle imports left
existing records unchanged. No UI layout was changed and no native release
application was opened.

The original verifier uses synthetic provider references with actual browser and
IndexedDB behavior. A separate live verifier subsequently passed two genuine,
ephemeral Codex 0.159.2 turns using the existing signed-in ChatGPT account:
`scripts/verify-session-registry-live-codex.mjs`. Actual provider session IDs were
`01a1093e-993e-7f81-8c9f-57d8110cd1ff` and
`01a1093e-c8f0-7bd3-baf1-371739daa3f1`. The first proposed a guarded synthetic
rectangle move; the second received the freshly resolved canonical map and
proposed the next move. Both produced committed receipts. Duplicate/stale and
wrong-scope checks, two synthetic client scopes, browser restart, fresh-profile
bundle restoration and imported receipt replay passed.

This establishes **orchestrated live Codex-to-Codex synthetic acceptance**. The
harness retrieves, links and executes; provider turns do not discover or call
Draw tools themselves. It rejects reported tool actions, bounds final JSON,
discards private runtime stderr, uses `--ephemeral`, and removes its temporary
browser profiles. It neither saves nor indexes provider transcripts. It does not
establish autonomous integration, real client value or native acceptance.

After Micah verified host authentication, a separate live cross-provider run
passed: `scripts/verify-session-registry-live-cross-provider.mjs`. Claude 2.1.289
session `07886052-f963-4c78-9220-4a4f8d695ec4` proposed the first move; Codex
0.159.2 session `01a10948-04f0-72e1-8232-d902be2fd4e5` received the actual freshly
resolved map and proposed the next move. Receipt provenance matched both actual
provider/session references. Independent readback checked rectangle from/to
positions and recomputed current document hashes after each edit. Final revision
was `draw-1y8jr4l2eraym-bv`, with content hash
`c182ecc937918bf8e72a547d2c64ae6fd60f90418d38b9195a594910a2571d75`.
Replay/stale/wrong-scope checks, two synthetic client scopes, process restart and
fresh-profile bundle restoration all passed. This is **orchestrated live
Claude-to-Codex synthetic acceptance**, not autonomous provider tool discovery.

Claude ran with safe mode, all tools disabled, slash commands disabled and no
session persistence. Codex used the prior ephemeral read-only invocation. Output
parsers reject reported tool actions and expose only bounded evidence; provider
runtime stderr is discarded. No new authentication, grants or configuration
were introduced. Claude auth is true in the authorized host context but false
inside the restricted sandbox; the host check matched Micah's Terminal result.

CTX 1.3.1 remains a separate acceptance blocker. Normal-sandbox status and
`doctor --format json` report history/lexical `generation_verification_failed`
with catalog/refresh pending; status records a lock `PermissionDenied` /
`Operation not permitted`. The local CTX source maps nearly every verified-index
opening error to that marker (`crates/ctx-daemon-cli/src/source_status.rs:505`
in `/Users/micahjohnson/Code/ctx-refresh-repair`), so corruption is not established.
No CTX repair, bypass, import or configuration change was attempted.

Micah's subsequent normal-Terminal results show history/lexical/catalog ready
without permission/lock errors; refresh remains pending and doctor ok is false.
This supports an execution-sandbox limitation, not a repair/rebuild requirement.
The sandbox search still fails; no alternate execution or UI bypass was used.

Small user-run retrieval health check on the existing committed lexical index:

```sh
ctx search 'DRAW_PILOT_EPHEMERAL_7d2c9f84' --backend lexical --refresh off --limit 1 --format json 2>/dev/null |
  jq '{schema_version,payload_type,result_count:(.results|length),freshness:{mode:.freshness.mode,status:.freshness.status},effective_mode:.retrieval.effective_mode}'
```

Expected successful contract: schema version 2, payload type search_results,
effective mode lexical, freshness mode off, normally zero matches for the unique
synthetic marker. Share only this filtered output; it omits snippets, records,
paths, source identities, credentials and raw errors. No output is not success.
A later indexed diagnostic conversation may produce a match; counts alone never
prove indexed handoff. This health check sends no refresh wake. The actual pilot
turns are intentionally ephemeral and were not ingested into CTX, so a positive
CTX-indexed session handoff remains untested. Refresh completion is not assumed.

Do not delete locks, change ownership or run import-all/setup/rebuild. Any future
positive synthetic indexing test needs separate concrete approval naming only
synthetic provider paths and an isolated target root; no personal histories or
semantic work. CTX retrieval is not required by the implemented registry.

## Supported CTX projection bridge: staged, publication blocked

Micah approved a synthetic bridge to the remaining CTX gap. The phased verifier
is `scripts/verify-session-registry-ctx-bridge.mjs`:

- `--stage` uses a private Draw browser profile only, creates two synthetic
  scoped maps, explicitly links the previously verified Claude/Codex IDs, saves
  a guarded edit with a committed receipt, and exports two canonical bundles.
- `--ctx` launches CTX only, with the supported explicit history-source manifest
  import, source-scoped lexical search with refresh off, bounded show-event,
  payload validation and repeat-import identity checks. Never escalate this
  phase or use it against the operator root.
- `--verify` uses a new private Draw profile only. It requires actual successful
  CTX evidence before restoring bundles, resolving current maps, rejecting the
  indexed historical revision, and applying a guarded edit with a new receipt.
  It does not launch CTX or provider models.

Owned fixture root:
`/Users/micahjohnson/Documents/Codex/2026-10-04/task-4/ctx-draw-bridge-fixture`.
Exact authored inputs are `client-a.jsonl`, `client-b.jsonl`,
`history-sources.json`, `client-a-bundle.json`, `client-b-bundle.json` and
`data/config.toml`. Directory mode is 0700 and authored file mode 0600. The
retained fixture was approximately 36 KB after the first blocked import; it
also contains CTX-created finite-worker state below `data/daemon`. That attempt
produced a bounded `bridge-blocked.json`; subsequent staging invalidates old
blocked/result files. No `bridge-result.json` exists from a successful import.

The only CTX acquisition routes are `draw-pilot/client-a` and
`draw-pilot/client-b`. The durable v2 projection owns stable source/event/session
IDs; actual Claude/Codex IDs appear only as explicit Draw-link provenance in a
versioned event payload. The source is an imported synthetic summary, with no
provider-native lineage contract. This does not claim native provider transcript
discovery. No transcript, command body, credentials, file-reference facts or
Canvas content are copied into CTX. Map IDs, scope, provider references and
historical revision live in retained payload rather than discarded metadata.

Pilot config disables automatic source discovery, selects manual indexing and
source-refresh-only daemon work, and disables semantic search, analytics,
automatic upgrades and local usage. The CTX subprocess removes inherited CTX
overrides and supplies matching process controls, keeping HOME/CODEX_HOME
unchanged. Manual explicit import may start a finite Core worker; no persistent
supervisor installation, native discovery, setup or import-all is requested.

**Observed boundary:** browser-only staging passed. The first normal-sandbox
CTX import failed with `sandbox-permission-or-worker-endpoint-denied`; pilot
daemon status reports failed. No positive publication/search result is claimed,
and final `--verify` has not run. No CTX escalation, permission/lock repair or
alternate execution was attempted. The operator root/index/config were not
targeted.

The final `--self-test` passed nine offline rejection checks with zero CTX,
provider or browser calls: closed results, wrong scopes/maps, unknown fields,
empty revisions, invalid event references, changed stable event IDs, wrong
source identity and extra records. This verifies validation behavior only,
not publication. Source review checks complete selected event content,
matching search/show session identities, exact selected-source publication,
passive lexical freshness and rejection of stale result files.

CTX startup can additionally attempt refresh of its existing managed agent
skills and receipt-owned man pages outside the selected root. The pilot's
upgrade/analytics controls do not suppress those paths; normal sandbox
restrictions remain the boundary. Any normal-Terminal handoff must disclose
these incidental maintenance effects rather than promise that --data-root
isolates every write. The CTX-only phase is the smallest resumable command:

```sh
node /Users/micahjohnson/Documents/Codex/2026-10-04/task-4/draw-registry-pilot/packages/mapping-canvas/scripts/verify-session-registry-ctx-bridge.mjs --ctx
```

It emits a bounded success/blocked summary and retains result bytes locally;
share only that summary. The browser verification can resume only after actual
successful publication and retrieval. It must not fabricate a result file or
promote the earlier reference-only/browser tests into CTX acceptance.

## Value test

Compared with attaching a file, this pilot removes manual selection of the map
associated with a session and makes current-state retrieval/replay outcomes
explicit. It adds one registration, explicit links and scope labels. It offers
no semantic transcript search or automatic session detection. Run a consenting
operator's repeated mapping task and compare time-to-correct-map, stale-file
mistakes and setup effort against the same task with a `.draw.json` attachment.
No timing savings or client outcome improvements have yet been measured.

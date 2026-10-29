# Creator storefront: service contract (v1)

Status: the schema exists in Airtable (see `SCHEMA_EVIDENCE.md`). No service, no records and no read model exist yet.
Tracking: see the Linear issue in `SCHEMA_EVIDENCE.md`.

## 1. Ownership split

| Data | Owner | Where |
|---|---|---|
| Creator identity: name, avatar, bio, website | 🎨Creators, edited by Asset Dashboard `/api/profile` | `Name`, `🖼️Avatar (Primary)`, `ℹ️Biography`, `🔗Personal Site` |
| Storefront customization: positioning, cover, portfolio, support | 🏪Creator Storefronts | draft columns |
| Selected templates, their order and notes | 📌Storefront Selections | draft rows |
| Template price, availability, catalog metadata | 👛Assets, served through template-search | never copied |
| Public storefront | Published read model (§7) | durable store + disposable edge cache |

The storefront reuses the Creator bio. It has no bio field. The bio override in the local preview editor (`wf-template-marketplace-source`) is local-only. It is not part of this contract.

`🔗Support Contact URL` is storefront-specific. Nothing copies or backfills it from the existing 🎨Creators `🔗Support Link` field. The meaning of that field is unresolved, and nothing in this contract reads it.

## 2. Identity

- Storefront ID = the Airtable record ID of the storefront. Creator ID = the Airtable record ID of the 🎨Creators record. Asset ID = the Airtable record ID of the 👛Assets record. All three are **internal** IDs (see §8).
- The public slug (`🥞CMS Slug`) is an address. It is not an identity key.
- `🔑WF User ID` on 🎨Creators is the existing user mapping.
- `🔑Webflow Workspace ID (Verified)`, `🔑Webflow Marketplace Profile ID (Verified)` and `📅Identity Verified At` stay null until an explicit verification step sets them. That step is an authenticated Webflow session for the workspace, or an operator-approved mapping. The service never infers them from matching names, slugs or emails. The asset rollup `👛ℹ️Workspace ID` is not proof of ownership.

## 3. Authoring authentication

1. Resolve the session to exactly one Creator. Today this is the exact email match in Asset Dashboard. Zero matches → 404. More than one match → 409. Never select the first match.
2. Creator Hub (webflow/webflow) calls this service over HTTP only. webflow/webflow has no Airtable adapter. A Creator Hub caller needs a verified workspace mapping before it can edit.

## 4. Serialized writes (REQUIRED)

Every mutation for one Creator runs through a single serialized writer keyed by the **Creator record ID**. The default proposal is a Durable Object per Creator. Mutations are: first create, draft field writes, selection writes, publish, unpublish, suspend and clear.

- **Uniqueness.** First create runs inside the writer. The writer looks up the storefront by Creator and creates one only when none exists. This is the only enforcement of "one storefront per Creator". Airtable has no unique constraint.
- **Version.** Every request carries `expectedDraftVersion`. Inside the writer: read the version, compare it, apply the change, increment `🔢Draft Version`. A mismatch → 409 with the current version. The single writer makes this check-and-set real, not best-effort.
- **Idempotency.** Every mutating request carries an `Idempotency-Key`. The writer stores the result of each key for 24 h and replays that result on retry.
- **Partial selection writes.** A selection replace takes several Airtable batch calls, at most 10 records each. Before the first Airtable call, the writer stores an intent in its own storage: `{lastCommitted, targetSelections, targetDraftVersion}`. `lastCommitted` is the full committed draft: fields, ordered selections and `draftVersion`. The writer then applies the intent in this order:
  1. Upsert the target rows, keyed by `(storefront, asset)`.
  2. Delete rows that are not in the target.
  3. Set `🔢Draft Version` = `targetDraftVersion`. This is the commit point.
  4. Clear the intent.

  Each step is idempotent. If the writer restarts or a call fails while an intent is pending, the writer replays the intent until Airtable matches it. Only after that does it accept another mutation. While an intent is pending, reads return `lastCommitted` from the intent with `pending: true`. They do not read the half-written Airtable rows. Publish is rejected (409) while an intent is pending.

## 5. Invariants (service-enforced; Airtable does not enforce them)

| # | Invariant |
|---|---|
| I1 | A storefront has exactly one `🎨Creator`. A Creator has at most one storefront. The link never moves to another Creator. |
| I2 | A selection has exactly one `🏪Storefront` and one `👛Asset`. |
| I3 | The Asset's `🎨Creator` is the storefront's Creator. |
| I4 | An Asset appears at most once per storefront. `🔢Position` values are unique and run 1..n, n ≤ 3. |
| I5 | Every committed draft change increments `🔢Draft Version` by exactly 1 (§4). |
| I6 | Only publish, unpublish, suspend and clear write `🚀Publication Status`, `🔢Published Draft Version`, `📅Published At` and `📦Published Snapshot JSON`. |
| I7 | Public reads never touch Airtable. They read the published read model (§7). |
| I8 | `🔢Published Draft Version` ≤ `🔢Draft Version`, and it only increases. |
| I9 | Only staff can set or clear `Suspended`. No owner operation can change a Suspended storefront's status. |
| I10 | Each publication operation gets the next `publicationRevision` (§7). The read model applies an operation only when its revision is greater than the stored revision, or equal with an identical payload. |

## 6. Operations

| Operation | Who | Behavior |
|---|---|---|
| `GET /storefront` | owner | Returns the draft fields, selections, `draftVersion`, `publishedDraftVersion`, `status` and `pending`. |
| `PUT /storefront` | owner | Validates the fields (§8) and writes them through the writer (§4). On first save it creates the row with `Never published`, version 1. |
| `PUT /storefront/selections` | owner | Replaces the full ordered list (≤3 `{assetId, note}`) through the intent protocol (§4). Checks I3 and I4. |
| `GET /storefront/preview` | owner | Builds the public DTO from the draft with the same builder that publish uses. Not cached, `noindex`, owner-only. |
| `POST /storefront/publish` | owner | See §7. Rejected (423) if the status is `Suspended`. Allowed from `Never published`, `Published` and `Unpublished`. It does not require draft changes: publishing an unchanged draft again after an unpublish works and gets a new `publicationRevision`. |
| `POST /storefront/unpublish` | owner | Allowed only from `Published`: sets `Unpublished` and writes an `unpublished` tombstone to the read model (§7). The row is kept, never deleted. From `Suspended`: 423, no change. From `Never published` or `Unpublished`: no-op 200, no new revision. |
| `POST /storefront/suspend` | staff | Sets `Suspended` and writes a `suspended` tombstone (§7). |
| `POST /storefront/clear-suspension` | staff | `Suspended` → `Unpublished`. Writes an `unpublished` tombstone with a new revision. Nothing is republished automatically; the owner must publish again. |

## 7. Published read model, publication revisions, cache

Three stores, each with one job:

| Store | Role | Read on a public request? |
|---|---|---|
| Airtable `📦Published Snapshot JSON` + publish fields | Authoring-side record of the latest publish | Never |
| Writer storage (§4) | `publicationRevision` counter and publication intents | Never |
| **Durable public read model** (proposal: a D1 table owned by the storefront service, keyed by creator slug) | Source for public reads. One row per slug: `{revision, state, snapshot \| null}`, where `state` is `live`, `unpublished`, `suspended` or `moved` | Only on an edge-cache miss |
| Edge cache | Disposable copy of the public DTO, `s-maxage=300` | Yes, first |

On an edge-cache miss, the service reads the durable read model. It never calls Airtable synchronously. If the row is missing or is a tombstone (any state other than `live`), the page renders the plain catalog profile.

### Publication revision

- `publicationRevision` is one integer per storefront. It lives in writer storage and in each read-model row. It is not stored in Airtable, and it is separate from `draftVersion`.
- The writer increments it for every **publication operation**: publish, unpublish, suspend, clear-suspension and slug move. No-op requests (for example, unpublish when already unpublished) do not increment it.
- Tombstones are kept. Unpublish, suspend and clear write a row with `snapshot: null` and the new revision. They never delete the row. A slug move writes a `moved` tombstone at the old slug and the live row at the new slug, both with the same new revision.

### Publication intent (persisted before any cross-store write)

Inside the writer, every publication operation runs these steps:

1. Check the current status. Publish: reject if a selection intent is pending or the status is `Suspended`. Unpublish: reject if `Suspended`.
2. Publish only: re-validate against current data, including template-search eligibility (§8). Ineligible selections block the publish with reasons; the service does not drop them silently. Build the internal snapshot.
3. Allocate `revision = last + 1`. Persist the intent `{revision, op, slug, snapshot | null}` in writer storage. This is the operation's point of no return.
4. Write the Airtable publication fields in one record update: `🚀Publication Status`. For publish, also the snapshot, `🔢Published Draft Version` and `📅Published At`.
5. Apply the operation to the read model with the conditional write in "Stale-operation rule" below.
6. Purge the edge cache for the affected slug or slugs.
7. Mark the intent done. Keep the last intent so a retry can be matched.

### Stale-operation rule (read model)

- **Apply** when `incoming.revision > stored.revision`.
- **Idempotent success** when `incoming.revision == stored.revision` and the payload is identical. This covers a retry of the same operation.
- **Reject as stale** otherwise: a lower revision, or an equal revision with a different payload.

Because of this rule, a delayed publish cannot resurrect a storefront that was later unpublished or suspended: the tombstone holds a higher revision.

### Retry and reconciliation

- Retries replay the **same** intent with the **same** revision through the writer. They never allocate a new revision.
- The reconciler runs only through the writer. Before it replays a pending intent, it re-checks the writer's current status and latest revision. If a newer intent exists, it marks the older one superseded and skips it. If the status changed (for example, the storefront was suspended after a publish intent), the newer intent wins.
- The reconciler never reads Airtable snapshots to choose what to publish. Airtable is a record of the operation, not its source.
- Retry schedule: a queue with backoff and a 5-minute ceiling between attempts.

### Receipt and states

Every publication operation returns a receipt:

```json
{
  "publicationRevision": 12,
  "op": "publish",
  "publishedDraftVersion": 7,
  "publishedAt": "2026-10-29T21:00:00Z",
  "readModel": "committed",
  "cachePurge": "done",
  "state": "live"
}
```

- `readModel` is `committed` or `pending`. `cachePurge` is `done` or `queued`.
- `state` is `live` only when `readModel` = `committed` **and** `cachePurge` = `done`. Then every new public request sees this revision. (For unpublish, suspend and clear, the same condition yields `removed` instead of `live`.)
- `state` is `propagating` in every other case. HTTP 202 is returned.
  - `readModel: "committed"`, `cachePurge: "queued"`: a cache miss already returns the new revision. Cached edges can serve the previous DTO until the purge succeeds, or at most 300 s (the TTL).
  - `readModel: "pending"`: the public API still serves the previous revision. The intent stays queued for retry.
- `GET /storefront` reports the latest intent's receipt, so a client can poll a `propagating` operation until it is final.

### Freshness

| Event | Public staleness |
|---|---|
| Publish, unpublish, suspend, clear | Read model: immediate once `committed`. Edge: immediate if the purge is `done`; otherwise up to 300 s (the TTL). |
| Template delisted or removed from template-search | The DTO build drops selections that are missing from current template-search inventory. **Template-search freshness is unknown and not yet verified**, so this event has no guaranteed bound until it is measured. Proposed: an hourly sweep re-checks published selections against Asset `🚀Marketplace Status` and purges affected slugs. |
| Creator slug change | Handled as a slug move (new revision, `moved` tombstone, purge of both keys). |

## 8. Validation and the public/internal boundary

Validation runs at write time and again at publish time:

- `positioning` ≤ 120 chars. `coverAlt` ≤ 160. `supportText` ≤ 400. `note` ≤ 240.
- URLs: `https:` only, with no username or password. `supportHref` may also be `mailto:`. The cover URL's origin must be in the dashboard upload allow-list (`isAllowedUploadUrl`).
- `support` is set only when both text and href are present.
- Selection eligibility: I3 holds, the Asset `🚀Marketplace Status` is `3️⃣Published🚀`, and the template is present in template-search.

**Internal snapshot.** This is stored in Airtable and in the read model. It is never returned to the public.

```ts
export interface StorefrontSnapshotV1 {
  schema: 1;
  storefrontId: string;            // Airtable rec ID (internal)
  creatorId: string;               // Airtable rec ID (internal)
  creatorSlug: string;             // read-model key at publish time
  draftVersion: number;            // = Published Draft Version
  publishedAt: string;             // ISO-8601 UTC
  positioning: string | null;
  cover: { url: string; alt: string } | null;
  portfolioUrl: string | null;
  support: { text: string; href: string } | null;
  selections: Array<{ assetId: string; templateSlug: string; position: number; note: string | null }>;
}
```

**Public DTO.** This is what the public API returns. It contains no Airtable IDs. Templates are identified by slug, which is already public in template-search. Name, avatar, bio and website are joined at read time from the creator catalog profile. Price and availability come from template-search.

```ts
export interface PublicStorefrontV1 {
  schema: 1;
  creatorSlug: string;
  version: number;                 // = publicationRevision; ETag source; not a secret
  publishedAt: string;
  creator: { name: string; avatarUrl: string | null; bio: string | null };
  positioning: string | null;
  cover: { url: string; alt: string } | null;
  links: Array<{ href: string; label: string }>;   // Creator website + portfolio, deduped, max 5
  support: { text: string; href: string } | null;
  selections: Array<{ templateSlug: string; note: string | null }>; // ordered; ineligible ones dropped at read time
}
```

Example public response:

```json
{
  "schema": 1,
  "creatorSlug": "example-studio",
  "version": 12,
  "publishedAt": "2026-10-29T21:00:00Z",
  "creator": { "name": "Example Studio", "avatarUrl": null, "bio": "Templates for small agencies." },
  "positioning": "Clean templates for service businesses",
  "cover": null,
  "links": [{ "href": "https://example.com/", "label": "Visit website" }],
  "support": { "text": "Questions about setup? Contact us.", "href": "https://example.com/support" },
  "selections": [{ "templateSlug": "example-template", "note": "Our most flexible layout." }]
}
```

Fields that never appear in any public response: Airtable record IDs, `draftVersion` internals, publication-status internals other than presence, the 🔑 Webflow mapping fields, `📅Identity Verified At`, and every private 🎨Creators field (emails, legal name, Stripe, trust level, incidents, workspace IDs).

## 9. Migration toward Webflow

1. Now: Airtable is the authoring store behind this service. Asset Dashboard is the first editor.
2. Next: Creator Hub becomes a second HTTP client, gated by the verified workspace mapping.
3. Cutover: Webflow becomes authoritative one field at a time. The service changes its backing store. It keeps the public DTO, the slugs and the read model. Never keep two independently writable copies of a field.
4. Asset references stay internal (Airtable rec ID) until a Webflow template ID mapping is authoritative. Public responses use template slugs throughout.

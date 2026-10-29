# Creator storefront: Airtable schema evidence

Date: 2026-10-29. Tracking: [CRE-2282](https://linear.app/createsomething/issue/CRE-2282/creator-storefront-airtable-schema-foundation-service-contract). Contract: [CONTRACT.md](./CONTRACT.md).

This change added two tables and two reciprocal link fields to the Marketplace Airtable base, and set the two new tables' descriptions. It wrote no records and deleted, renamed or retyped nothing. No service or editor reads these tables yet.

## Base and existing tables (verified live through Airtable MCP before the write)

| Item | ID | Notes |
|---|---|---|
| Marketplace base | `appMoIgXMTTTNIc3p` | 45 tables before, 47 after |
| 🎨Creators | `tbljt0plqxdMARZXb` | 138 fields before; primary `Name` `fldQIcXYW9GJY7NKG` |
| 👛Assets | `tblRwzpWoLgE9MrUm` | 412 fields before; primary `Name` `fldUzJBor3Gnkykjc`; `🎨Creator` `fldGDWo2VfnTbSUiL` (single-link, inverse `fldGpJPqmH67pJcMV`); `🚀Marketplace Status` `fld51CeQNGDgW9b0D` (Published = `selR1B9B9s2NMF3x1`) |

Existing fields that the storefront reuses (no duplicates added):

| Field | ID | Use |
|---|---|---|
| `Name` | `fldQIcXYW9GJY7NKG` | public name |
| `ℹ️Biography` | `fldt01GPmIIEu1c6m` | public bio |
| `🖼️Avatar (Primary)` | `fldyddTon9Lu8BR8G` | public avatar |
| `🔗Personal Site` | `fldQYNCC9ZKFoLQAs` | public website link |
| `🔑WF User ID` | `fldpwkyHcmErSNkzX` | Webflow user mapping |
| `⚙️🎨Creator Record ID` | `fldiGJ4Ep2IuHZzbs` | `RECORD_ID()` |

Existing fields that are not authoritative for storefronts:

| Field | ID | Why |
|---|---|---|
| `👛ℹ️Workspace ID` | `fld91R0NA8XUQWfSy` | A rollup from Assets. It can hold more than one value, so it does not prove ownership. |
| `👀🔄Workspace ID (Override)` | `fldCBw83kFNJOoNPd` | An operations override, not a verified ownership mapping |
| `🔗Support Link` | `fldY2EMJvPqg58cl1` | Meaning unresolved and no code reads it. It was not reused. Nothing copies or backfills it into storefronts. |

No storefront, selection or MarketplaceProfile-ID table or field existed before this change.

## Added: 🏪Creator Storefronts `tblSnWOQgkHNig95k`

| Field ID | Name | Type | Owner |
|---|---|---|---|
| `fldMRv4zPwBn69h1j` | Storefront # (primary) | autoNumber | system |
| `fldTuNRh1bMLbVRG7` | 🎨Creator | multipleRecordLinks → `tbljt0plqxdMARZXb` (inverse `fld5qVag8xWpA2PSm`) | service |
| `fld7RLVCWyPHbU8rH` | 📝Positioning | singleLineText | draft |
| `fld3TNgJIt9uVJRI2` | 🖼️Cover Image URL | url | draft |
| `fldiRB8Lz2o2Cjd9g` | 🖼️Cover Image Alt Text | singleLineText | draft |
| `fldsvNIy41QDEwM8l` | 🔗Portfolio URL | url | draft |
| `fldtgnAD2o2KFvBbr` | 💬Support Copy | multilineText | draft |
| `fldGxY3XKCdEzh3BV` | 🔗Support Contact URL | url | draft (storefront-specific) |
| `fldAHtyPL8vg8hBai` | 🔢Draft Version | number(0) | service |
| `fldlRactB8YHualTY` | 🚀Publication Status | singleSelect: Never published `selPLtXHIgeLdhgYY`, Published `selVCvXsaWluODaB5`, Unpublished `sels7wVkNKS1kPdIW`, Suspended `selt5MUbksjKj7k5n` | service |
| `fldaRPLn0m5gB7ahX` | 🔢Published Draft Version | number(0) | service |
| `fldsHCtAn19R5j2ep` | 📅Published At | dateTime (ISO, 24h, utc) | service |
| `fldabdMwfrb7lNsnW` | 📦Published Snapshot JSON | multilineText | service |
| `fldIYVtQ5s5IaWnKx` | 🔑Webflow Workspace ID (Verified) | singleLineText, nullable | service, verified only |
| `fldquadgLnlawwop1` | 🔑Webflow Marketplace Profile ID (Verified) | singleLineText, nullable | service, verified only |
| `fldwsRCQ21yb5K2wV` | 📅Identity Verified At | dateTime (ISO, 24h, utc) | service |
| `fld2oOVxEVeUrL2fO` | 📌Storefront Selections | multipleRecordLinks (reciprocal) | automatic |

## Added: 📌Storefront Selections `tbl56WtGtAEQJ30eC`

| Field ID | Name | Type |
|---|---|---|
| `fldPXGZi6EICUC5Dc` | Selection # (primary) | autoNumber |
| `fld23ami8BlZnxj8V` | 🏪Storefront | multipleRecordLinks → `tblSnWOQgkHNig95k` (inverse `fld2oOVxEVeUrL2fO`) |
| `fld3qcdNbY9wdgdcB` | 👛Asset | multipleRecordLinks → `tblRwzpWoLgE9MrUm` (inverse `fldAwFASmHDHSBDqe`) |
| `fldOOH5EBi8siiwqe` | 🔢Position | number(0) |
| `fldDSa1hkW5evvjcK` | 📝Creator Note | multilineText |

## Added to existing tables: reciprocal links only

| Table | Field ID | Name |
|---|---|---|
| 🎨Creators | `fld5qVag8xWpA2PSm` | 🏪Creator Storefronts |
| 👛Assets | `fldAwFASmHDHSBDqe` | 📌Storefront Selections |

All three new links accept multiple records. The Airtable MCP cannot set `prefersSingleRecordLink`. The single-record rules are service invariants (CONTRACT.md §5).

The publication revision and the publication and selection intents (CONTRACT.md §4 and §7) live in the service's writer storage and read model. They need no Airtable fields.

## Verification

1. **Pre-write snapshot.** Full `list_tables_for_base` output, kept in session scratch and not committed (about 200 KB of base schema).
2. **First create attempt failed.** It returned 422 because dateTime `timeZone: "UTC"` was rejected. The retry with `"utc"` succeeded. Readback shows no partial table from the failed call.
3. **Post-write diff** (before → after): tables 45 → 47. Removed tables: none. Renamed tables: none. On existing tables, the only field changes are the two reciprocal links above. No field was removed, renamed or retyped.
4. **Record counts.** 🏪Creator Storefronts = 0. 📌Storefront Selections = 0. Records with a non-empty reciprocal field: 🎨Creators 0, 👛Assets 0. **Data-record mutations: 0.**
5. **Description update** (second pass, the only later schema write). Both new tables' descriptions now cite this directory and CRE-2282. A diff against the post-create snapshot showed the same 47 table IDs, the same field IDs, names and types, and changed descriptions on exactly `tblSnWOQgkHNig95k` and `tbl56WtGtAEQJ30eC`.
6. **What was read.** Only schema. No private creator record contents were read. Flomio Studio (the local UI example) received no storefront record.

## Context sources

| Provider | ctx session | event | Used for |
|---|---|---|---|
| Codex | c4967cca | f9491b24 | Sep 16 migration scope: Airtable stays behind an owned service, with no adapter in webflow/webflow. Historical only. |
| Claude Code | d263e1f3 | 638a9811 | Oct 13 status: Creator Hub v2 merged behind a 0% flag. Historical only; not current rollout proof. |
| Codex | 6e605a1f | 5de48e7a | Oct 29 agreed design: separate linked storefront, draft/published, cached public snapshot, no duplicated identity. |

Code read (read-only):
- `packages/webflow-dashboard/src/routes/api/profile/+server.ts` (creator edits by exact email match).
- webflow `MarketplaceHub/components/ProfileSection.tsx` (workspace MarketplaceProfile by slug).
- `wf-template-marketplace-source/src/lib/creator-storefront.mjs` (preview limits).

## Disposition

- Worktree disposition: preserved at `/Users/micahjohnson/Code/create-something-monorepo` (branch `docs/preflight-skill-align-1.5.1`).
  - These two docs are new and uncommitted.
  - Pre-existing uncommitted changes in the checkout are untouched.
  - No commit or push.
- CRE-2282 stays open for the service work. CRE-2050 (Done) and CRE-2247 (In Progress, export coverage) are related, not changed.

# App Review Source Map Intake

**Status:** implementation contract
**Linear:** `CRE-487`
**Surface:** Webflow App Submission Form (`wf-bl-app-form-cloud`, external) + Bundle Scanner API
**Slack context:** Pablo Miranda source-map review thread, 2026-05-29

## Decision

Collect source maps as private review artifacts for automated bundle review.

Do not ask developers to ship source maps in the public production bundle. Do not rely on
submission notes as the source of truth. The form should collect a source-map artifact and pass
that artifact to the scanner API as a first-class field.

## Form Behavior

Add a source-map section near the app bundle submission/review readiness step.

Recommended field label:

> Source maps for review

Recommended helper copy:

> Upload a ZIP of source maps for the bundle you are submitting. Source maps help Webflow review
> minified production bundles and are used only for private review. Do not include source maps in
> the production bundle that ships publicly.

Accepted inputs:

- preferred: `.zip` containing one or more `.map` files
- allowed fallback: single `.map` file

Rollout posture:

- optional while the scanner pipeline is being connected to the canonical Admin bundle
- required later for minified/generated bundles
- if supplied maps do not match the generated bundle files, mark automated review incomplete and
  request a corrected source-map artifact

## Scanner Handoff

The form should upload/store the source-map artifact privately, then call the scanner with:

```json
{
  "submissionId": "asset-version-or-form-submission-id",
  "bundleUrl": "https://private-or-admin-bundle-url.example/app-bundle.zip",
  "sourceMapUrl": "https://private-source-map-url.example/source-maps.zip"
}
```

Until the scanner can read the canonical Admin bundle directly, `bundleUrl` must be a hash-linked
copy of the Admin artifact. Reviewer trust depends on the scanner reviewing the same bundle that
Admin receives.

## Review Output

The scanner response includes:

- `artifacts.bundle.sha256`
- `artifacts.sourceMap.sha256`
- `report.sourceMapSummary.status`
- `report.sourceMapSummary.publicExposure`
- matched, missing, invalid, and orphan source-map details

Use `publicExposure: true` as release-blocking evidence that the public bundle still contains
`.map` files or `sourceMappingURL` references.

## Airtable Build Context

Current repo-known Airtable scope for app review:

- Base: `appMoIgXMTTTNIc3p`
- `Assets`: `tblRwzpWoLgE9MrUm`
- `Asset Versions`: `tblHxZ2hgSFLZxsZu`

The current app-review MCP schema includes app metadata, reviewer state, and review feedback fields,
but it does not include bundle or source-map artifact fields yet. Do not add guessed field IDs to the
repo. Create the Airtable fields first, then update `packages/webflow-app-review-mcp/src/schema.ts`
with the real field IDs.

### Recommended Data Model

Source maps are version-specific review artifacts. Store the canonical fields on `Asset Versions`,
not directly on `Assets`.

Recommended `Asset Versions` fields:

| Field                        | Type                                                 | Source                                                             |
| ---------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| `Bundle Artifact URL`        | URL or attachment                                    | Admin canonical bundle, or hash-linked copy during interim rollout |
| `Bundle SHA-256`             | Single line text                                     | Bundle Scanner API response `artifacts.bundle.sha256`              |
| `Bundle Scanner Run ID`      | Single line text                                     | `report.runId`                                                     |
| `Bundle Scan Verdict`        | Single select: `PASS`, `ACTION_REQUIRED`, `REJECTED` | `report.verdict`                                                   |
| `Bundle Scan Completed At`   | Date/time                                            | `report.createdAt` or automation completion time                   |
| `Bundle Scan Report URL`     | URL or attachment                                    | Private JSON report in R2/D1/admin storage                         |
| `Bundle Scan Error`          | Long text                                            | Scanner or automation failure details                              |
| `Source Map Artifact URL`    | URL or attachment                                    | Private source-map upload from App Form                            |
| `Source Map Filename`        | Single line text                                     | App Form upload metadata                                           |
| `Source Map Size Bytes`      | Number                                               | App Form upload metadata or scanner response                       |
| `Source Map SHA-256`         | Single line text                                     | `artifacts.sourceMap.sha256`                                       |
| `Source Map Status`          | Single select                                        | `report.sourceMapSummary.status`                                   |
| `Source Map Public Exposure` | Checkbox                                             | `report.sourceMapSummary.publicExposure`                           |
| `Source Map Matched Files`   | Long text                                            | newline or JSON summary from `matchedGeneratedFiles`               |
| `Source Map Missing Files`   | Long text                                            | newline or JSON summary from `missingGeneratedFiles`               |
| `Source Map Invalid Files`   | Long text                                            | JSON summary from `invalidSourceMaps`                              |
| `Source Map Orphan Files`    | Long text                                            | newline or JSON summary from `orphanSourceMaps`                    |
| `Review Artifact Valid?`     | Formula or checkbox                                  | true when source maps are acceptable for automated review          |

Live Airtable intake field:

- `⚙️Source Map Artifact URL` (`fldNHNQcdbbV25Iqq`) stores the App Form private source-map artifact URL on `Asset Versions`.

Recommended `Source Map Status` options should mirror the scanner status exactly:

- `not_provided`
- `not_required`
- `matched`
- `partial`
- `missing`
- `mismatch`
- `invalid`

Recommended `Review Artifact Valid?` formula:

```text
AND(
  OR({Source Map Status} = "matched", {Source Map Status} = "not_required"),
  NOT({Source Map Public Exposure})
)
```

If reviewers need a queue-level badge, add lookup/rollup fields on `Assets` after the version fields
exist. Keep those `Assets` fields derived from the latest/open `Asset Versions` record where possible:

- `Latest Bundle Scan Verdict`
- `Latest Source Map Status`
- `Latest Source Map Public Exposure`
- `Latest Review Artifact Valid?`

### Form-To-Airtable Automation Mapping

The App Form automation should pass these new keys into the record creation/update step:

```json
{
  "Source Map Artifact URL": "https://private-source-map-url.example/source-maps.zip",
  "Source Map Filename": "source-maps.zip",
  "Source Map Size Bytes": "123456",
  "Source Map Provided": "true"
}
```

Use those values to populate `Asset Versions`, then call the Bundle Scanner API only when a
canonical or hash-linked `bundleUrl` is available:

```json
{
  "submissionId": "recAssetVersionId",
  "bundleUrl": "https://private-or-admin-bundle-url.example/app-bundle.zip",
  "sourceMapUrl": "https://private-source-map-url.example/source-maps.zip",
  "callbackUrl": "https://optional-airtable-or-worker-callback.example/scan-result"
}
```

Use the `Asset Versions` record ID as `submissionId` if the automation has it. If the form cannot
know the `Asset Versions` ID at scan request time, store the form submission ID in Airtable and use
that as the scanner correlation key until the version record exists.

### Scanner Callback Mapping

When the Bundle Scanner API response returns, update the same `Asset Versions` record:

| Scanner response path                           | Airtable field               |
| ----------------------------------------------- | ---------------------------- |
| `artifacts.bundle.sha256`                       | `Bundle SHA-256`             |
| `artifacts.sourceMap.sha256`                    | `Source Map SHA-256`         |
| `artifacts.sourceMap.sizeBytes`                 | `Source Map Size Bytes`      |
| `report.runId`                                  | `Bundle Scanner Run ID`      |
| `report.createdAt`                              | `Bundle Scan Completed At`   |
| `report.verdict`                                | `Bundle Scan Verdict`        |
| `report.sourceMapSummary.status`                | `Source Map Status`          |
| `report.sourceMapSummary.publicExposure`        | `Source Map Public Exposure` |
| `report.sourceMapSummary.matchedGeneratedFiles` | `Source Map Matched Files`   |
| `report.sourceMapSummary.missingGeneratedFiles` | `Source Map Missing Files`   |
| `report.sourceMapSummary.invalidSourceMaps`     | `Source Map Invalid Files`   |
| `report.sourceMapSummary.orphanSourceMaps`      | `Source Map Orphan Files`    |

Store the full scan report outside Airtable if it is large, then write only a private `Bundle Scan
Report URL` back to Airtable. Airtable should remain the reviewer surface, not the durable artifact
store for large scanner JSON.

### Review Routing Rules

Initial rollout should not mutate official reviewer decision state from scanner output. Let the
automation populate scanner fields, then make the review interface surface the artifact status.

Recommended interpretation:

- `matched` or `not_required` and `publicExposure = false`: automated artifact check is usable.
- `partial`, `missing`, `mismatch`, or `invalid`: automated bundle review is incomplete; request a
  corrected source-map artifact before relying on scanner findings.
- `publicExposure = true`: release-blocking cleanup item before public publication, even if private
  source maps were provided separately.

After the Airtable fields are live, update:

- `packages/webflow-app-review-mcp/src/schema.ts`
- `packages/webflow-app-review-mcp/src/airtable.ts`
- `packages/webflow-app-review-mcp/src/schema.test.ts`
- `packages/webflow-app-review-mcp/src/airtable.test.ts`

Expose these fields through app-review MCP as read-only reviewer context first. Add write paths only
for a scanner callback/operator lane, not for normal reviewer-owned decision tools.

# Bundle Scanner API

Worker endpoint for pre-review Webflow App bundle scanning.

## Scan Contract

`POST /scan`

```json
{
  "submissionId": "airtable-or-form-submission-id",
  "bundleUrl": "https://private.example.com/app-bundle.zip",
  "sourceMapUrl": "https://private.example.com/source-maps.zip",
  "callbackUrl": "https://optional-callback.example.com/scan-result"
}
```

- `bundleUrl` is the canonical app bundle artifact. In the final pipeline this should come
  from Webflow Admin or from a hash-linked copy of that Admin bundle.
- `sourceMapUrl` is optional during rollout, but should be supplied by the App Submission Form
  when developers provide private source maps for review.
- `sourceMapUrl` may point to a ZIP of `.map` files or a single `.map` file.
- Source maps are review artifacts only. They should not be included in a public production bundle.
- Private source-map artifact intake is gated by `SOURCE_MAP_ARTIFACT_INTAKE_ENABLED=true`.
  The default production Worker keeps this disabled; the `reviewers` Wrangler environment enables it
  for reviewer testing.

The response includes `artifacts.bundle.sha256` and, when provided, `artifacts.sourceMap.sha256`.
Those hashes are the handoff boundary between the form/Admin artifact and the automated review.

## Source Map Status

The scan report includes `sourceMapSummary`:

- `matched`: private source maps matched generated bundle files.
- `partial`: some generated files or source map references did not match.
- `missing`: generated files need source maps, but no artifact was provided.
- `mismatch`: a source map artifact was provided but did not match any generated bundle files.
- `invalid`: source maps were provided but could not be parsed.
- `not_required`: no generated bundle files needed maps.
- `not_provided`: no source maps were provided and no generated files were detected.

`publicExposure: true` means the production bundle contained `.map` files or `sourceMappingURL`
references. The form can still collect source maps separately, but public exposure should be
handled as a release-blocking cleanup item before publication.

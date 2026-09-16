# Webflow Template Search Image Refresh Runbook

Use this runbook when named cards on `webflow.com/templates` have missing
thumbnail images, but the corresponding public template listing is live and
exposes a stable Webflow CDN image.

This is a targeted production D1 repair. It does not change Airtable, Webflow
CMS items, the card renderer, or unrelated search rows.

## Completion contract

The repair is complete only when:

- the exact affected template slugs were identified before the write;
- each public listing returns `200` with a stable Webflow CDN `og:image`;
- no template sync job is active;
- the targeted backfill reports every named row updated and zero unresolved;
- the direct Worker and Webflow proxy return primary and hover thumbnails;
- the CDN assets respond with `200` and an image content type; and
- the cards render with images on the public marketplace page.

Do not use a successful HTTP response, CMS publish, or deploy as a substitute
for these readbacks.

## Prerequisites

- `curl`, `jq`, `rg`, and the Infisical CLI are installed.
- The production Infisical project exposes `SYNC_ADMIN_TOKEN` at `/`.
- The operator has the exact comma-separated template slugs.

```bash
command -v curl
command -v jq
command -v rg
command -v infisical
```

## 1. Capture the exact targets

This prompt deliberately fails if no slugs are entered. Keep this shell open
through the remaining steps.

```bash
printf 'Exact comma-separated template slugs: '
IFS= read -r template_slug_csv
test -n "$template_slug_csv" || {
  echo 'No template slugs supplied; stopping before production access.' >&2
  return 2 2>/dev/null || exit 2
}
```

## 2. Diagnose before writing

Confirm every named search row exists and inspect its image fields:

```bash
printf '%s' "$template_slug_csv" | tr ',' '\n' | while IFS= read -r template_slug; do
  curl -fsS \
    "https://webflow-template-search.webflow-inc.workers.dev/api/templates/search?q=${template_slug}&include=items" \
    | jq --arg template_slug "$template_slug" \
      '.items[] | select(.template_slug == $template_slug) | {
        name,
        template_slug,
        url,
        thumbnail_image_url,
        thumbnail_image_secondary_url
      }'
done
```

For each row, require both `HTTP 200` and a stable Webflow CDN `og:image`:

```bash
printf '%s' "$template_slug_csv" | tr ',' '\n' | while IFS= read -r template_slug; do
  listing_url="https://webflow.com/templates/html/${template_slug}"
  page_file="$(mktemp)"
  http_code="$(curl -LfsS -o "$page_file" -w '%{http_code}' "$listing_url")"
  printf '%s http=%s\n' "$template_slug" "$http_code"
  rg -o '<meta[^>]+(?:property|name)="og:image"[^>]+>' "$page_file" | head -1
  rm -f "$page_file"
done
```

Stop without writing if a listing is `404`, lacks `og:image`, or only exposes a
temporary Airtable attachment host. That is a source/CMS investigation, not a
D1 backfill.

A `404` listing on a template Airtable marks Published usually means no
Templates CMS item exists yet. Check the asset's `🚩Publishing Validation`
field first: `🚩Creator Stripe Status Invalid` means the creator has not
finished Stripe onboarding, Whalesync is deliberately holding the CMS item
back, and the card should not be in search at all. Since the listing gate in
`packages/webflow-template-search` (September 2026), sync holds such records
out of the index and reports them as `listing_gated_records`; once the CMS
item appears the webhook indexes the record and thumbnails resolve without a
backfill.

## 3. Check the production lock

```bash
infisical run --env=prod --path=/ -- sh -c '
  : "${SYNC_ADMIN_TOKEN:?SYNC_ADMIN_TOKEN unavailable; stopping before production access.}"
  curl -fsS \
    -H "Authorization: Bearer $SYNC_ADMIN_TOKEN" \
    "https://webflow-template-search.webflow-inc.workers.dev/api/templates/admin/sync-status" \
    | jq "{status, active_job, latest_job, counts}"
'
```

Proceed only when `active_job` is `null`. A `409` is a lock conflict, not
permission to bypass the lease or deploy another Worker.

## 4. Run the targeted backfill

```bash
TEMPLATE_SLUGS="$template_slug_csv" \
infisical run --env=prod --path=/ -- sh -c '
  : "${SYNC_ADMIN_TOKEN:?SYNC_ADMIN_TOKEN unavailable; stopping before production write.}"
  : "${TEMPLATE_SLUGS:?TEMPLATE_SLUGS unavailable; stopping before production write.}"
  curl -fsS -X POST \
    -H "Authorization: Bearer $SYNC_ADMIN_TOKEN" \
    "https://webflow-template-search.webflow-inc.workers.dev/api/templates/admin/backfill-images?slugs=$TEMPLATE_SLUGS" \
    | tee /tmp/webflow-template-image-backfill-receipt.json \
    | jq .
'
```

Require:

- `scanned_records` equals the number of exact target slugs;
- `updated_records` equals `scanned_records`; and
- `unresolved_records` equals `0`.

The global `rows_missing_image` count may include unrelated records and is not
the completion criterion for a targeted repair.

## 5. Verify both production API surfaces

```bash
for api_base in \
  https://webflow-template-search.webflow-inc.workers.dev \
  https://templates.webflow.com/templates-api
do
  printf '%s\n' "$api_base"
  printf '%s' "$template_slug_csv" | tr ',' '\n' | while IFS= read -r template_slug; do
    curl -fsS "$api_base/api/templates/search?q=${template_slug}&include=items" \
      | jq -e --arg template_slug "$template_slug" '
          .items[]
          | select(.template_slug == $template_slug)
          | select(
              (.thumbnail_image_url | type == "string")
              and (.thumbnail_image_url | contains("website-files.com"))
              and (.thumbnail_image_secondary_url | type == "string")
              and (.thumbnail_image_secondary_url | contains("website-files.com"))
            )
          | {
              name,
              template_slug,
              thumbnail_image_url,
              thumbnail_image_secondary_url
            }'
  done
done
```

Validate every returned primary image directly:

```bash
printf '%s' "$template_slug_csv" | tr ',' '\n' | while IFS= read -r template_slug; do
  image_url="$(
    curl -fsS \
      "https://webflow-template-search.webflow-inc.workers.dev/api/templates/search?q=${template_slug}&include=items" \
      | jq -er --arg template_slug "$template_slug" \
        '.items[] | select(.template_slug == $template_slug) | .thumbnail_image_url'
  )"
  curl -LfsS -o /dev/null \
    -w '%{http_code} %{content_type} %{size_download} %{url_effective}\n' \
    "$image_url"
done
```

Require `200` and an `image/*` content type for every target.

## 6. Verify the rendered marketplace

Open a cache-busted marketplace URL in a real browser:

```text
https://webflow.com/templates/all?image-refresh-proof=YYYYMMDD-HHMM
```

Confirm every named card is present and visibly populated. Record browser proof
separately from API/CDN proof. Anonymous sessions may emit unrelated auth,
analytics, CSP, or hydration noise; treat it as relevant only when it prevents
the named cards or their images from rendering.

## Stop and escalation conditions

Stop the targeted backfill and investigate the owning layer when:

- an exact search row cannot be found;
- the public listing is `404` or has no stable Webflow image;
- a sync job is active;
- the receipt reports unresolved rows;
- either production API retains null or temporary image URLs;
- a CDN asset does not return `200 image/*`; or
- the API passes but the public card stays blank after a cache-busted reload.

Do not insert a generic image, delete a row, repair CMS, publish a site, run a
broad rebuild, or deploy code under this runbook. Those require separate,
explicitly approved workflows.

## Proven production receipt: 2026-09-01

Targets:

- `soulify-website-template`
- `lumexo-website-template`

Observed before the write:

- both search rows had null primary and hover thumbnails;
- both public listings returned `200`; and
- both exposed stable `cdn.prod.website-files.com` `og:image` URLs.

Backfill result:

- `scanned_records: 2`
- `updated_records: 2`
- `unresolved_records: 0`

Post-write proof:

- both production APIs returned stable primary and hover images;
- both primary CDN assets returned `200 image/webp`; and
- both public marketplace cards rendered with distinct thumbnail imagery.

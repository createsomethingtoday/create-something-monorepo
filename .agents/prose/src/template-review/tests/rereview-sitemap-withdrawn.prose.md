---
name: rereview-sitemap-withdrawn
kind: test
subject: screen-false-positives
---

### Fixtures

- `findings`: two open findings: "sitemap.xml returns 404" (Auto) and
  "images hosted on cdn.prod.website-files.com/64aa00000000000000000002/ ,
  a different project" (Auto), where `64aa00000000000000000002` is the CMS
  database id bound in the page's CMS image fields.
- `published_url`: `https://fixture.webflow.io`
- `asset_id`: `recTESTASSET00001`

### Expects

- `screened`: both findings have status `withdrawn`
- `screened`: each withdrawn finding has a screen_reason

### Expects Not

- `screened`: any finding with status `open`

---
name: screen-false-positives
kind: function
version: 0.1.0
---

# Screen False Positives

> Judgment helper. Applies the known false-positive rules before a finding can
> reach a verdict. Each rule cost at least one review round when it was
> missed. Add new rules here, not in the verdict prompt.

### Parameters

- `findings`: raw published-site and Designer findings for one version.
- `published_url`: the version's published URL.
- `asset_id`: the Airtable asset id, used to read linked Features.

### Returns

- `screened`: the same findings, each with `status` set to `open` or
  `withdrawn` and a `screen_reason` when withdrawn or narrowed.

### Invariants

- A second `cdn.prod.website-files.com/<24-hex>/` prefix is the CMS database
  id, not another project. Only a prefix that matches neither the site id
  (`data-wf-site`) nor the CMS database id, or a non-Webflow host, is a
  hosting finding, and the finding must cite the prefix.
- `/sitemap.xml` is never a requirement. Earlier asks for it are withdrawn.
- Lenis loaded from unpkg is an allowed custom-code exception.
- `*_poster.0000000.jpg` optimization warnings are reworded to "compress the
  source video" or dropped.
- A `required-pages-not-linked: /licenses` finding is withdrawn when the
  footer links `/license`.
- Filter chips with no href that are `w-tab-link` elements are Tabs, not
  dead links. `w-lightbox` anchors are excluded from `href="#"` checks.
- The `validation-worker.createsomething.workers.dev` review script is the
  Validator bridge snippet, not a finding.
- A Features finding stands only when the asset's linked `ℹ️✨Features`
  field is empty. The version-level `❗ℹ️Features` formula text is ignored.
- Console errors need a single-page rerun; blank screenshot segments need a
  `settle_ms: 6000` recapture. Without the rerun, the finding is `Partial`.

### Shape

- `self`: apply rules, withdraw or narrow, record reasons.
- `prohibited`: adding new findings; any write.

# Meridian licensed public-system translation

Status: implementation manifest  
Owner: CREATE SOMETHING  
Tracking: CRE-1646 (initial shell), CRE-1647 (complete component adoption)

## Licensed end-product map

The operator allocated four purchased Meridian template licenses to four distinct public end products:

| Licensed end product     | CREATE SOMETHING role         | Implementation scope          |
| ------------------------ | ----------------------------- | ----------------------------- |
| `createsomething.agency` | Embedded AI operating partner | Master commercial expression  |
| `createsomething.io`     | Research and field evidence   | Evidence expression           |
| `createsomething.ltd`    | Canon and operating standards | Durable philosophy expression |
| `createsomething.space`  | Public systems workbench      | Runtime practice expression   |

Purchase receipts and the purchased export remain private operator records. This repository records the allocation and implementation boundary, not the private purchase artifact.

## Source provenance

Local purchased export used as a bounded design reference:

`/Users/micahjohnson/Downloads/meridian-wf-template-ac11d5deb0c901b1be.webflow/`

Reference stylesheet SHA-256:

`7043bacf6fcb6db959e32f6863ec07b0e9355b5e54791e09555179bde1222cd2`

The export's license page identifies Gambarino as free for personal and commercial use through Fontshare. The local source font was renamed for owned serving at `/fonts/create-something-editorial.woff2` on each licensed end product. The same licensed source loads Geist as its interface family; Canon self-hosts the Geist variable family through `@fontsource-variable/geist` (SIL OFL-1.1) rather than making a Google Fonts request.

Source and deployed font SHA-256:

`42b9b1445555af9a47ff748332a0da9c7526fc6ecf403c620916640490b4765b`

## Translation boundary

- Original Svelte and CSS implement the CREATE SOMETHING expression.
- No Webflow runtime, generated Webflow JavaScript, generated template CSS, Meridian name, logo, demo copy, testimonials, or fabricated metrics are shipped.
- No purchased export files are committed beyond the independently licensed local font used by the four mapped end products.
- No template CDN assets are hotlinked.
- Playbook fields, operating receipts, Performance Lab semantics, property routes, and property-specific actions remain first-party.
- The source contributes bounded design decisions: editorial serif contrast, warm neutral casing, paired text/artifact composition, compact radii, aligned metadata, and deliberate section pacing.
- Typography roles are explicit: Gambarino-derived `CS Editorial` is display-only at its actual 400 weight; variable Geist is the interface and reading face; IBM Plex Mono remains limited to receipts, labels, and operational state. Performance surfaces disable font synthesis so the single editorial face is never faux-bolded or faux-italicized.
- The complete native component inventory and public-property map live in
  [`MERIDIAN_COMPONENT_ADOPTION_MAP.md`](./MERIDIAN_COMPONENT_ADOPTION_MAP.md).

Webflow Studio conversion is deferred until Studio is generally available and the operator authorizes a separate migration. This implementation does not create or modify a Webflow project.

## Rollback

Remove the `expression="editorial"` and `propertyRole` opt-ins from the four homepage openings, remove the editorial-only Canon selectors and token, and remove the four self-hosted font copies. The default `field` expression remains the unchanged component fallback.

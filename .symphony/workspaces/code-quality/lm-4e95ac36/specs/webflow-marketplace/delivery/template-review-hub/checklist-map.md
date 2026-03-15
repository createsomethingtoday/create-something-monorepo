# Checklist Map

**Status:** Working draft  
**Source basis:** condensed from `docs/webflow-template-checklist-mcp-coverage.md`

This map is the delivery version of the current template review coverage. It is intentionally operational rather than exhaustive.

## Coverage labels

- `Auto`: can be validated deterministically now through current MCP tooling
- `Partial`: useful signal exists, but reviewer validation is still needed
- `Manual`: should remain reviewer-owned in the current delivery

## Operational map

| Review area | Coverage | Primary signal | Reviewer expectation |
| --- | --- | --- | --- |
| Queue state, asset context, version context | `Auto` | `webflow-template-review-mcp` | Safe to rely on for workflow context, subject to normal Airtable accuracy |
| Required page existence and some structural checks | `Partial` | sitemap crawl, page structure, page-name checks | Validate before using as rejection basis |
| SEO basics: headings, metadata shape, 404, indexability signals | `Auto` + `Partial` | `extract_seo`, published-site audits | Strong objective evidence, but some content-quality judgment stays manual |
| Forms and broken-link checks | `Auto` + `Partial` | form and link audits | Good for quick objective validation |
| Images and media format checks | `Auto` + `Partial` | image and media audits | Useful for technical issues; quality judgment stays manual |
| CMS structure and naming | `Partial` | Designer metadata extraction | Good signal, but not enough for complete policy judgment |
| Interactions and GSAP signals | `Partial` | interaction audits and published snippet checks | Validate manually before using as decisive failure |
| Accessibility heuristics | `Partial` | heading, media, alt, semantic checks | Helpful screen, not full accessibility certification |
| Publishing metadata and release workflows | `Auto` + `Partial` | Airtable review/release fields | Safe when field mappings are confirmed; escalate on ambiguity |
| Plagiarism and originality | `Partial` | `webflow-mcp` plagiarism tools | Treat as escalation evidence, not automatic final decision |
| Typography, visual hierarchy, originality, UX quality | `Manual` | reviewer judgment | Remains fully human-owned |
| Legal/licensing, trademark, and asset provenance | `Manual` | reviewer judgment | Remains fully human-owned |
| Variables, style architecture, and deeper Designer internals | `Manual` | current tooling gap | Remains manual until extraction coverage improves |

## Delivery rule

The lane should present:

- `Auto` findings as fast reviewer evidence
- `Partial` findings as high-signal checks that still need validation
- `Manual` items as explicit reviewer work

The lane should not imply that `Partial` means "safe to automate fully."

## Notes

- Current coverage is strong enough for objective pre-screening and evidence gathering.
- Current coverage is not strong enough to claim full automation of the template rubric.
- The Marketplace team should use this map to set reviewer expectations during alpha and beta.

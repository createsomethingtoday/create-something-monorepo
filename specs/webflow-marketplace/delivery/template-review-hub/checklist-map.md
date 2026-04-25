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
| Queue state, reviewer context, version context, submission packet | `Auto` | `template_review_get_review_context`, `template_review_get_reviewer_packet` | Safe to rely on for workflow context and submission truth, subject to normal Airtable accuracy |
| Required page existence and structural checks | `Partial` | published-first route crawl, page structure, page-name checks | Validate before using as rejection basis |
| SEO basics: headings, metadata shape, 404, indexability signals | `Auto` + `Partial` | reviewer packet analyzer summary, published-site audits | Strong objective evidence, but some content-quality judgment stays manual |
| Forms and broken-link checks | `Auto` + `Partial` | published-first form and link audits | Good for quick objective validation |
| Images, media, and responsive technical checks | `Auto` + `Partial` | published-first media, responsive, and asset audits | Useful for technical issues; quality judgment stays manual |
| CMS output, route structure, and listing/detail behavior | `Partial` | published-first route/output checks | Good signal, but not enough for complete authoring-policy judgment |
| Interactions, GSAP, and componentization signals | `Partial` | published CSS/DOM signals and analyzer checks | Validate manually before using as decisive failure |
| Accessibility heuristics | `Partial` | heading, media, alt, semantic, and responsive checks | Helpful screen, not full accessibility certification |
| Publishing metadata, releases, and submitted asset packet | `Auto` + `Partial` | Airtable reviewer packet and release fields | Safe when field mappings are confirmed; escalate on ambiguity |
| Plagiarism and originality | `Manual` | deferred / outside current reviewer lane | Escalate outside the lane if originality review is required |
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
- The Marketplace team should use this map to set reviewer expectations during pilot and hardening.

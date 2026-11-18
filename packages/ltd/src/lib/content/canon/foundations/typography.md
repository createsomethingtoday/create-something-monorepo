---
category: "Canon"
section: "Foundations"
title: "Typography"
description: "Canon typography system: scale, weights, and responsive type built on the golden ratio."
lead: "Local Geist keeps headings and prose approachable. Mono gives actual records, code and measurements a distinct role."
publishedAt: "2026-01-08"
published: true
---

## Families and responsibilities

Canon uses locally loaded Geist for headings, prose and controls. The complete `@create-something/canon/styles/canon.css` import owns base styles and local font loading. The framework-neutral `tokens.css` import defines variables only: token-only consumers own font assets and resets. A fallback stack remains necessary.

| Job | Token |
| --- | --- |
| Headings | `--font-performance-heading` |
| Interface | `--font-performance-interface` |
| Prose | `--font-performance-prose` |
| Records, IDs and timestamps | `--font-performance-record` |
| Code and payloads | `--font-performance-code` |
| Topology labels | `--font-performance-topology-label` |

Use mono where the content is a record, measurement, command or meaningful chapter label. Long explanations remain in the prose family. Machine-shaped values use tabular numerics and restrained tracking.

CREATE SOMETHING's OpenAI Select Partner context informs clear, approachable presentation. Geist remains Canon's house typeface; that relationship does not authorize OpenAI font assets. Embedded experiences follow the host's typography contract.

## Scale and rhythm

Use `--text-performance-body` for body text and the shared size scale for hierarchy. Display roles such as `--text-performance-display` are fluid; do not copy their current clamp values into a route. The scale includes practical interface steps as well as golden-ratio display relationships.

Weights use `--font-performance-regular`, `--font-performance-medium`, `--font-performance-semibold` and `--font-performance-bold`. Headings can use `--leading-performance-tight`; prose can use `--leading-performance-relaxed`. Actual values live in the token reference.

```css
.article-title {
  font-family: var(--font-performance-heading);
  font-size: var(--text-performance-h1);
  font-weight: var(--font-performance-medium);
  line-height: var(--leading-performance-tight);
  letter-spacing: var(--tracking-performance-tight);
}
.article-body {
  font-family: var(--font-performance-prose);
  font-size: var(--text-performance-body);
  line-height: var(--leading-performance-relaxed);
}
.article-meta {
  font-family: var(--font-performance-record);
  font-size: var(--text-performance-record-meta);
  font-variant-numeric: tabular-nums;
}
```

Verify wrapping, zoom, font fallback and narrow screens with real content. A large heading must still leave its next action understandable.

See [Token Reference](/canon/resources/tokens).

# Template Chat — Analytics & Conversion Monitoring

Instrumentation status: **live in production** (verified 2026-07-10 in Amplitude project
`Webflow Prod Events`, id `266888`).

All chat telemetry is the marketplace-standard event
**`[Template Marketplace] Code Component Event`** with `component = "TemplateChat"` and a
`scope` property, fanned out to wf_analytics, Segment, and Amplitude by
`trackMarketplaceEvent` (`src/components/marketplace/analytics.ts`).

## Event scopes

| Scope | Fired when | Key properties |
|---|---|---|
| `chat_opened` / `chat_closed` | Panel opens/closes | `trigger` (launcher / default_open / inline / restored) |
| `chat_expanded` / `chat_collapsed` | Immersive toggles | |
| `chat_reset` | New-chat button | |
| `message_sent` | User sends a turn | `source` (input / starter / followup / retry), `turn`, `message` (200-char cap), `message_length` |
| `response_completed` | Stream ends | `duration_ms`, `displays_shown`, `templates_shown`, `page_actions_applied`, `had_error`, `stopped` |
| `results_displayed` | Agent renders templates | `display_layout`, `result_count`, `template_slugs`, `followups_count` |
| `template_card_clicked` | Card click → detail page | `template_slug`, `source_position`, `display_layout`, `price`, `is_free` — **writes conversion attribution** |
| `live_preview_opened` | In-chat live preview | `template_slug`, `source_position`, `display_layout` |
| `live_preview_device_changed` | Desktop/Tablet/Mobile toggle | `device` |
| `live_preview_site_opened` | "Open site ↗" | `template_slug` |
| `live_preview_cta_clicked` | Buy/Use CTA in preview | `template_slug` — **writes conversion attribution** (`source_sort = "preview:<layout>"`) |
| `page_action_applied` | Agent drove the page grid | `action_sort`, `action_styles`, `action_category`, `action_q`, `action_clear_filters`, `highlight_count` |
| `chat_error` | Agent or connection error | `error_source` (agent / connection), `message` |

Every event also carries `chat_variant`, `chat_surface` (compact / immersive),
`chat_message_count`, and the shared page context (URL, category, experiment variant, browser).

## Conversion attribution

`template_card_clicked` and `live_preview_cta_clicked` write the same sessionStorage record
TemplateGrid writes (`templateAttribution.ts`) with `source_component: "TemplateChat"`.
`TemplateDetailConversionTracker` on the template detail page reads it and emits
`detail_viewed` / `detail_purchase_cta_clicked` with `attribution_source_component` —
segment those by that property to compare **chat-assisted vs. browse** conversion.
`attribution_source_sort` beginning `preview:` isolates purchases that went through the
in-chat live preview.

## Saved chart definitions (one-click Save in Amplitude)

MCP writes are disabled in the Webflow Amplitude org, so these validated ad-hoc charts
need a human Save (each link opens the full definition):

- Daily Activity by Scope — `https://app.amplitude.com/analytics/webflow/chart/new/tcl991fx`
- Engagement Funnel (`chat_opened → message_sent → results_displayed → template_card_clicked`) — `https://app.amplitude.com/analytics/webflow/chart/new/6bthqqks`
- Live Preview Funnel (`live_preview_opened → live_preview_cta_clicked`) — `https://app.amplitude.com/analytics/webflow/chart/new/u99i2l6j`
- Errors (`scope = chat_error`, grouped by `message`) — `https://app.amplitude.com/analytics/webflow/chart/new/hfm99blz`

Ad-hoc edit links can expire; if one 404s, rebuild from the definitions above — every
chart is `[Template Marketplace] Code Component Event` filtered/grouped by the listed
`scope`/property values over Last 30 Days.

## Pending: conversion-by-source chart (needs an Amplitude tracking-plan admin)

**Diagnosis (2026-07-10):** the Webflow Amplitude project appears to block
unplanned event properties. Evidence: `template_slug` has been sent on grid
click events at production scale for weeks and `detail_viewed` (which carries
`attribution_*` properties) flows at ~1,500/hour — yet neither appears in the
project taxonomy, and every property registered on
`[Template Marketplace] Code Component Event` predates this instrumentation.
A real click-through was reproduced end-to-end on the published site
(attribution record verified in sessionStorage on the detail page) and the
property still did not register.

**Fix (one admin action):** someone with *Update Tracking Plan* permission adds
these event-scoped properties to `[Template Marketplace] Code Component Event`:
`attribution_source_component`, `attribution_source_sort`, `attribution_present`,
`template_slug`, `source_position`, `display_layout`, `turn`, `chat_variant`,
`chat_surface`, `error_source`, `device`. (Or disable property blocking for
this event.)

**Then build the headline chart:**

> Events Segmentation · `[Template Marketplace] Code Component Event` ·
> filter `scope = detail_purchase_cta_clicked` · group by `attribution_source_component` ·
> Last 30 Days · Totals

`TemplateChat` vs `TemplateGrid` in that breakdown = chat-assisted vs. browse
conversion. `attribution_source_sort` values beginning `preview:` isolate
purchases that went through the in-chat live preview.

**Caveat this implies for the charts above:** until the properties are added to
the plan, per-property breakdowns beyond `scope`/`component`/`message`/`price`/
`source`/`trigger` may be unavailable even though the events themselves are
flowing. The engagement and preview funnels rely only on registered properties
and work today.

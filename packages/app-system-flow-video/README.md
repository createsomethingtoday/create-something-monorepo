# app-system-flow-video

A ~3-minute Remotion animation of the **full Webflow app system** — the flow of one
asset from preflight to marketplace, with **every documented if/then branch** rendered
as a condition → outcome row. Built for team meetings; companion to
`packages/exception-flow-video` (which covers the exception loop in depth — this video
condenses it to one scene).

## The contract

The video is a **dated claim, not a receipt**. Everything it asserts — headings, branch
conditions and outcomes, the 23 review statuses, scene timings, the "as of" stamp —
lives in `src/flow.ts`, verified against the live system on the date stamped in
`AS_OF`. When the system changes:

1. Edit `src/flow.ts` (and only it, for most changes).
2. Update `AS_OF`.
3. `pnpm render`.

A stale video lies silently; the date stamp on the final frame is what keeps it honest.

## Scene map

| # | Scene | What it documents |
|---|-------|-------------------|
| 00 | The map | Six stations + the resubmission loop |
| 01 | Preflight | Pass / clear-fail / ambiguous / disputed — the gate guardrails |
| 02 | Submit | Form validations: testing site, bundle radio, source maps, receipt, stale-contract 409, listing language |
| 03 | Intake | Partnership flag sync, intake hold, prior-exemptions briefing, the In-Review escape hatch |
| 04 | Review | Checklist scoping by review type, stop-early rule, partner-vs-community site-side split, control-plane rule |
| 05 | Exceptions | The loop condensed: automation deny-only, person-only approvals, auto-release |
| 06 | Decide — approving | Undecided-exception blocks (automation + MCP 409), denied-item warning, checklist error |
| 07 | Decide — rejecting | Reason-missing error, partnership shield, denied-exception carve-out, daily sweep |
| 08 | Marketplace | Upcoming → Scheduled → Published, Delist, Changes-Requested round-trip, resubmission loop, auto-archive |
| 09 | The state space | All 23 review statuses, grouped |

## Commands

```bash
pnpm studio   # live preview at localhost:3000
pnpm render   # → out/app-system-flow.mp4 (1920×1080, 30fps)
```

## Provenance

Verified 2026-08-21 against:

- `packages/webflow-app-review-mcp/docs/exception-transparency-loop.md` — the rules,
  gates, intake hold, briefing DM, partnership shield, denial auto-release, and daily
  sweep (all automations marked LIVE there).
- `packages/webflow-app-review-mcp/src/schema.ts` — `REVIEW_STATUS_OPTIONS` (23,
  verbatim), `MARKETPLACE_STATUS_OPTIONS`, `REVIEW_TYPE_OPTIONS`, `HOLD_REASON_OPTIONS`.
- The app-governance loop rollout (form validations in `wf-app-form-cloud`: testing
  site, bundle radio, source maps, `wfpre_…` receipt with fail-open-while-optional, the
  `FORM_VERSION_OUTDATED` 409) and the preflight gate guardrail rows
  (`recQaZVM9BQAik8at`, `recOm7ZqCqbXlmEsD`, `recAIZJnheIHrdBiD`).

One scope nuance the review scene compresses: the partner-vs-community site-side split
reflects the operating posture annotated on the review checklist (Adam's 8/6
control-plane direction). The published scope *guidelines* were rolled back 8/19 pending
ratification — until then, grants citing published-site scope are recorded as exceptions
under Adam's authority, not scope determinations.

Known gap deliberately *not* shown as resolved: the partnership shield's
denied-exception carve-out keys on the **version-level** exception status — a rejection
driven only by per-item denials still converts to No Notification (fix drafted 8/19,
pending UI publish). The video states the carve-out as designed; update this note and
the reject scene when the draft publishes.

No partner is named; no example app appears — the video documents the system, not a case.

## Web companion (wrop)

The same data renders as an interactive page — every scene with link chips into the
live surfaces (automations by wfl id, view-scoped Airtable links, Slack threads),
plus three sections the video doesn't carry: **Surfaces** (every place an action
completes, who operates it, and how — including both MCPs and the two Dify chat
agents, quoted from their configured contract), **Operators** (the decision chain
with explicit CANNOTs), and the **Control room** (all ten automations, working
surfaces, examples, precedents).

- Live: https://wrop.wf.app/w/the-app-system-sqtif1
- Build: `pnpm web` → `out/app-system-flow.html` (from `src/flow.ts` + `src/links.ts`)
- Update in place:

```bash
pnpm web
jq -n --rawfile html out/app-system-flow.html '{html:$html}' \
| cloudflared access curl "https://wrop.wf.app/api/wrops/the-app-system-sqtif1" \
  -s -X PUT -H "Content-Type: application/json" -d @-
```

`src/links.ts` is part of the dated claim: verify its URLs (automation ids, view ids,
thread permalinks) against the live system before bumping `AS_OF`. The Dify agents'
chat URLs are credentials (each acts as its owner) — the page names them and quotes
their contract but never links them. The agent quotes come from the app's configured
opening statement via the Dify Service API; re-fetch after editing the agent.

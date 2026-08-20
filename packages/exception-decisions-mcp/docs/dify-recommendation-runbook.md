# Automated Exception Recommendations — Dify API Runbook

> **Companion to** `exception-transparency-loop.md` (canonical loop mechanics, currently in the
> `root-preserve-20260811-1955` tree at `packages/webflow-app-review-mcp/docs/`). This document
> covers ONE lane: replacing the partner-lead's *technical* recommendation step with a Dify-driven
> automation, while keeping the final human decision exactly where it is.

## Why this exists (8/18/2026)

Paige relayed Greg's feedback directly (Zoom, 8/18): *"for the technical things… I don't know if I
should say yes or no. I feel like these are Adam decisions."* Her instinct was to push everything
to Adam; the agreed direction instead (Micah, same call) is: **keep humans in the loop, but let
automation do ~80% of the recommendation work** — business rules produce the yes/no lean and state
*what a yes means for the business*, so the human decision is a check, not a research project.

This also answers Paige's follow-up ask: *"make some clear rules or distinctions — what goes to
Greg, what goes to Adam."*

## The routing rules (what goes where)

| Lane | Exception types | Recommendation by | Final decision |
|---|---|---|---|
| **Technical** | Security · Custom Code / Scopes · technical Guideline items | **Dify automation** (this runbook) | Adam |
| **Business** | Pricing / Billing · partnership-strategy stakes · relationship calls | **Greg** (via `recommend_exception_item`, as today) | Adam |
| **No confident lean** | Anything the automation returns `NEEDS-HUMAN` for | Routed to Greg (business) or straight to Adam (technical) | Adam |
| **Developer comms** | — | **Greg** (`draft_developer_update`, unchanged) | — |

Nothing else in the loop changes: dual sign-off stands (review sign-off AND approved exception),
approval gates stand, denial auto-release stands, transparency posts to #app-review-exceptions
stand. A recommendation was never a decision — this lane automates the *recommendation*, never the
allow/deny.

## Architecture

```
⚖️Exceptions (tblnbaaIbIulWl0b7, appMoIgXMTTTNIc3p)
        │  🆕Requested items, technical types, no existing recommendation
        ▼
Runner (operator-invoked → scheduled later)
        │  per item: build input payload
        ▼
Dify Workflow app  ──  POST https://api.dify.ai/v1/workflows/run
        │  returns {recommendation, confidence, business_meaning, precedents}
        ▼
exception-decisions MCP  ──  recommend_exception_item (automation identity)
        │  item → 👀Under Review + labeled advisory note
        ▼
Existing Airtable automation (wflwRPrmqvWN8HrAn) posts to #app-review-exceptions
        ▼
Adam records the final call (decide_exception_item) — human, unchanged
```

- **Dify**: Dify Cloud, Service API base `https://api.dify.ai/v1` (same instance as the
  template-review hub and concierge-chat integrations; GH-Actions + Infisical key handling
  precedent: `DIFY_TEMPLATE_REVIEW_HUB_API_KEY`).
- **Write-back**: `https://exceptions.mcp.createsomething.agency/mcp` — the identity-stamped
  decision MCP (worker `exception-decisions-mcp`, v1.1.0 live).

## One-time setup

### 1. MCP v1.2.0 — honest attribution for automation ✅ DONE (deployed 8/18)

`recommend_exception_item` v1.1.0 hardcoded the notes prefix `Partner-lead recommendation:`.
**v1.2.0 shipped 8/18** (version id `321a73e5-1227-49bb-90ae-54fb1b01e1bd`, deployed from the
reconstructed `src/index.ts` in this package — see `recovered-deploy-v1.1.0.md` for the recovery
story):

- Role-aware prefix: `role: automation` keys write `Automated recommendation (advisory):
  APPROVE/DENY — …`; person keys keep `Partner-lead recommendation:`. Attribution line for
  recommendations now reads "Recommendation recorded by …".
- `decide_exception_item` / `decide_version_exception` **refuse `role: automation` keys
  server-side** (guard runs before any Airtable read) — "the bot can never decide" is a server
  guarantee, not a prompt instruction. Verified live 8/18: whoami resolves the automation
  identity, decide attempt refused, existing person keys unaffected.

### 2. Mint the automation identity ✅ DONE (8/18)

`DECIDERS_JSON` now carries 6 identities — the new one:

```json
{ "name": "Exception Recommendation Automation", "email": "micah@webflow.com", "role": "automation", "surface": "runner" }
```

Key lives in `.deciders.local.json` (gitignored) — **still to vault**: copy into Infisical
(`prod:/exception-decisions-mcp:RECOMMENDER_MCP_KEY`) or 1Password when a login session is
available. The `email` is the accountable operator — the automation runs under Micah's ownership,
and the attribution line says the rest.

### 3. Create the Dify Workflow app

Studio → new **Workflow** app, e.g. `App Review — Exception Recommendation`.

**Inputs** (all strings unless noted):

| Variable | Content |
|---|---|
| `item_id` | ⚖️Exceptions record id (echoed back for the write) |
| `item` | Item title (primary field) |
| `exception_type` | Guideline / Custom Code / Scopes / Security / … |
| `rationale` | Full ⚖️Rationale — technical register + plain-English translation |
| `asset` | App name |
| `partnership` | `true/false` + tier if known (🤝Partnership App flag) |
| `asset_history` | Prior exceptions on this asset with outcomes (⚖️Asset Exception History) |
| `precedents` | Decided ⚖️Exceptions items (item · type · outcome · decision notes) |

**Nodes**: Start → LLM (business-rules prompt, temperature low) → End (structured output).
Put **Ruleset v1** (below) verbatim in the LLM system prompt — the rules are the policy artifact;
version them here and update via PR, so every change to the automation's judgment is reviewable.

**Output schema** (End node / structured output):

```json
{
  "recommendation": "APPROVE | DENY | NEEDS-HUMAN",
  "confidence": 0.0,
  "business_meaning": "One or two sentences: what a yes means for the business, plain English.",
  "reasoning": "Why, citing the rule and any precedent by app + item.",
  "precedent_citations": ["CartGenie — deprecated clipboard API — ✅Approved"]
}
```

Publish, then create a **Service API key** for this app (App → API Access). Store it in Infisical:
`prod:/exception-decisions-mcp:DIFY_RECOMMENDER_APP_KEY`. Treat it like any credential.

## The Dify API calls

One call per exception item, blocking mode:

```bash
curl -s https://api.dify.ai/v1/workflows/run \
  -H "Authorization: Bearer $DIFY_RECOMMENDER_APP_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": {
      "item_id": "rec…", "item": "…", "exception_type": "Security",
      "rationale": "…", "asset": "…", "partnership": "false",
      "asset_history": "…", "precedents": "…"
    },
    "response_mode": "blocking",
    "user": "exception-reco-automation"
  }'
```

Response: `data.status == "succeeded"`, outputs under `data.outputs`. (`GET /workflows/run/{id}`
to re-fetch; Dify Cloud rate limits are generous at this volume — 20–40 items/run is fine
sequentially.)

Write-back (only when `recommendation` is APPROVE or DENY **and** `confidence ≥ 0.7`):

```
POST https://exceptions.mcp.createsomething.agency/mcp
Authorization: Bearer <RECOMMENDER_MCP_KEY>
tools/call → recommend_exception_item {
  item_id, recommendation: "approve"|"deny",
  notes: "<business_meaning> <reasoning> [confidence 0.86; precedents: …]"
}
```

`NEEDS-HUMAN` or low confidence → no write; the runner collects these into one summary posted to
the #app-review-exceptions thread (technical → Adam, business → Greg).

## Runner loop

Runner = operator-invoked script/agent session first; promote to a scheduled GH Actions cron
(template-review-hub pattern) once the shadow phase passes.

1. **Enumerate**: `list_pending_exceptions` (automation key) — versions 🆕Requested/👀Under Review
   with their per-item rows.
2. **Filter** to items that are ALL of: status 🆕Requested (or blank) · technical type
   (Security, Custom Code / Scopes, Guideline) · no `recommendation:` marker already in the
   item's decision notes (`get_exception_item` shows "Decision notes so far" — this is the
   idempotency check; the MCP itself will happily append a duplicate, so the runner must not
   re-submit).
3. **Enrich**: pull rationale + asset context per item; partnership flag and exception history
   come from the version/asset records (app-review MCP or Airtable read).
4. **Call Dify** per item (above). **Cap 25 writes per run.**
5. **Write back** APPROVE/DENY leans via `recommend_exception_item`; collect NEEDS-HUMAN into the
   summary post. The status flip to 👀Under Review makes the existing item automation post each
   recommendation to #app-review-exceptions — transparency comes free.
6. **Log** a run receipt (items seen / recommended / skipped / needs-human) in the run's Slack
   summary post.

## Ruleset v1 (the policy artifact)

Grounded in decided precedent as of 8/18 (7 decided items). Every recommendation must state what
a *yes* means for the business — that sentence is the point of the lane.

**Lean DENY (fix required)** — consistent precedent that these ship as fixes, not exemptions:
- Unvalidated payment/checkout controls (client-controlled quantities, unvalidated payment
  message senders)
- Credentialed CORS open to arbitrary origins; secrets/identity tokens in GET URLs
- Loading mutable, undeclared executable code; missing SRI on hosted scripts the app injects
- Known published CVEs in shipped dependencies left unpatched
- Broken core function at review time (precedent: Cloudinary ❌, Sparkfive ❌ — a launch blocker
  is not exemptable)

**Lean APPROVE (exemptable with documentation)** — precedent-backed patterns inherent to the
app's category or framework, with no unremediated exposure:
- Category-inherent published-site code patterns (precedent: Concord Privacy ✅, Consent Pro ✅
  remote consent engines; Wistia ✅ iframe player injection)
- Deprecated-but-functional web APIs with a migration note (precedent: CartGenie ✅
  `document.execCommand('copy')`)
- Naming/branding nits already acknowledged by partnerships (precedent: North support email ✅)

**Always NEEDS-HUMAN — never auto-recommend:**
- `⚖️Type` Pricing / Billing, or any item whose rationale turns on partnership strategy or
  relationship stakes → Greg
- Bundle rows covering many findings in one row (e.g. "v10 security findings bundle") — ask for
  per-item rows first
- No matching precedent AND confidence < 0.7
- Anything where approving would waive a *data-exposure* finding on a partnership app → Adam
  directly

Rules change by PR to this file + the Dify prompt together. The precedent corpus grows with every
decided item — refresh the `precedents` input from the decided rows each run.

**Note style (applies to every recommendation and decision note the lane writes, and belongs in
the Dify prompt):** these notes post to Slack where non-engineers read them. Follow the humanizer
pass (github.com/blader/humanizer): short sentences, no em or en dashes, concrete subjects, the
risk stated as an outcome a real person cares about. The ⚖️/✅/⏸️/🆕 field names are proper
names and stay.

## Guardrails

- **The automation never decides.** It has no path to ✅Approved/❌Denied — enforced server-side
  in v1.2.0. Adam's `decide_exception_item` remains the only way an exception resolves.
- **Honest attribution.** Distinct note prefix + attribution line naming the automation identity.
  Never write automation output under a person's key — the per-person Dify chat surfaces
  (Adam's/Greg's) are credentials that act AS them and stay out of this lane entirely.
- **Idempotent.** Skip items already carrying any recommendation marker; cap writes per run.
- **Transparent.** Every recommendation lands in #app-review-exceptions via the existing
  automation; run receipts summarize skips and NEEDS-HUMAN routes.
- **Calibrated.** Weekly: compare automation leans vs Adam's finals; disagreement rate > ~20% on
  any rule → revise or demote that rule to NEEDS-HUMAN.

## Automation impact map (verified against the live base, 8/18)

Exhaustive sweep of all 63 automations on `appMoIgXMTTTNIc3p`: exactly two trigger on the
⚖️Exceptions table, three more watch exception fields on `🖌️Asset Versions`. All are
`recordUpdated` / `recordMatchesConditions` / `cron` — **nothing fires on reads, so the shadow
pass touches no automation.** Note: the two 8/18 intake/release automations, listed as drafts in
the loop runbook, are now **deployed** — the "enable release before decisions land" ordering
requirement is already satisfied.

Per live recommendation write (⚖️Exceptions row: `⚖️Status` 🆕Requested → 👀Under Review + notes append):

| Automation | State | Effect of a recommendation write |
|---|---|---|
| `wflwRPrmqvWN8HrAn` ⚖️Exception Items → channel | deployed | **Fires** — one #app-review-exceptions post + 📅datetime stamp per item. 22 items = 22 posts; chunk runs (5–10 items) to keep the channel legible |
| `wflBcRnidEULHXzUn` ⚖️Exception Status → channel | deployed | No — watches version-level `⚖️Exception Status` (`fldQo0XS9zJp5PifI`) only; recommendations never touch it |
| `wflHI29nzYv35Wtd0` Review Status Trigger · `wflqWGjY4PsXCog3U` Approval Gate · `wflZxJWJUDm58R5r6` On Hold | deployed | No — all watch `📝Review Status` (`flde8Huk5NRIdm2wZ`) |
| `wflMSqzPwS501b7Ar` Intake hold · `wfleu2e0kOz68y9xK` Exception release | **deployed (were drafts 8/18 am)** | No — condition on undecided rollups; 👀Under Review still counts `Undecided? = 1`, so the rollup value is numerically unchanged by a recommendation |
| `wfl7w27lIpKXIS3QP` Asset auto-link | deployed | No — only rows missing 👛Asset; the runner creates no rows |
| `wflcn4fLNsPCNzCpX` Denied-w/o-rejection daily sweep | deployed | No — denied versions only |

**Non-Airtable listener**: the webhook worker leg (app-review MCP worker, live since 8/14)
subscribes to both tables via the Airtable Webhooks API and enriches on ANY edit. Its skip rule
covers `source = automation` payloads (Airtable's own writes) — **API writes like the runner's are
enriched**, so each live recommendation also gets the threaded-post/stamping treatment. Expected,
but verify the subscription is healthy (and watch the first enriched event for double-posting
alongside `wflwRPrmqvWN8HrAn`) as a Phase 1 gate item — not needed for shadow.

## Rollout

| Phase | What | Gate to advance |
|---|---|---|
| **0 — Shadow** (now) | Run the loop dry against the live queue (22 unrecommended items: North Embedded Checkout ×21, ActiveCampaign bundle ×1). Output to a doc — **no writes**. Adam + Greg + Paige eyeball the leans. | Adam agrees with ≥ 80% of confident leans; Paige/Greg sign off on the routing rules |
| **1 — Live, manual** | v1.2.0 deployed; automation identity minted; operator runs the loop on demand; Adam decides off the recommendations | Two clean weekly calibrations |
| **2 — Scheduled** | GH Actions cron (weekday mornings before Adam's review window) | Steady state |

Resolved calls (Micah, 8/18): **Greg stays cc'd on technical recommendations** — the
#app-review-exceptions decision-chain mentions (Greg → Adam) stay exactly as they are; no
automation change needed. Automation accountable email: micah@webflow.com. Still open: whether
Phase 2 waits for the Airtable-webhook worker leg (event-driven instead of cron).

**Deployment status (8/18 evening):** Phase 1 is live and the first write-run has executed.

- **Phase reorder (operator-approved 8/18):** Adam is unavailable until after Webflow Conf, so
  the calibration gate and the first write-run swapped order — the 20 shadow-run leans were
  recorded as advisory recommendations the same evening (runner receipt: 20 written · 0 errors ·
  2 needs-human held · 1 already-recommended skip). Rationale: recommendations are advisory and
  cannot decide (server-enforced), so pre-staging costs only channel posts and notes appends,
  and buys Adam a decision-ready queue on return. His per-item Agree/Disagree (or simply his
  decisions) now serve as the calibration signal; disagreements still feed Ruleset v2 exactly as
  Phase 0 intended.
- **The runner is implemented** (`scripts/runner.mjs`): parses the live queue via
  `list_pending_exceptions`, enforces technical-lane filtering, the already-recommended
  idempotency check, confidence ≥ 0.7, and the per-run cap; leans come from `--leans <file>`
  (reviewed leans file, used 8/18) or from the Dify workflow (`DIFY_RECOMMENDER_APP_KEY`).
  Dry-run is the default; `--write` is explicit.
- Channel context post: https://webflow.slack.com/archives/C0BN54FQU84/p1787106158608149.
  Calibration page updated in place (v2) with the pre-staged banner.

Still open: ① create the Dify Workflow app in Studio + drop its Service API key in Infisical
(`DIFY_RECOMMENDER_APP_KEY`) — required before the runner's Dify mode replaces leans files;
② vault the runner's MCP key (`RECOMMENDER_MCP_KEY`); ③ Adam's calibration on return —
run the disagreement comparison then, and ship Ruleset v2 if needed.

## Decision-rights v2 (8/18, operator-approved) — deny-only automated decisions

Goal restated by Micah 8/18: get decisions automated so **developers can resolve** and the
**business is aware and can make exceptions**. The split that satisfies it:

| Action | Who | Rationale |
|---|---|---|
| Item-level **DENY** (guideline stands, fix required) | Automated (v1.3.0), transparent in channel | A deny waives nothing — it is the default posture, and it is what produces the developer's fix list |
| Item-level **APPROVE** (exception granted) | People only (Greg business lane / Adam / Paige) | Waiving a rule is business judgment — server-refused for automation keys |
| Version-level anything — incl. the denial that **emails the developer** | People only; operator executes after a business exception window, from a reviewed draft | Partner-bound content gets a human eye; server-refused for automation keys |

Mechanics: `runner.mjs --decide --write` records deny-only decisions, and only on items carrying
the automation's own standing "Automated recommendation (advisory): DENY" note — never over a
conflicting human recommendation. Every decision posts to #app-review-exceptions; the decision
note names the correction path ("a person can set this item ✅Approved at any time before
release"). **Exception window convention:** announce in-channel, hold the version-level release
until the window closes (first use: North, window ends EOD Fri 8/21 CT), then the operator
reviews the composed draft (`draft_developer_update`) and executes `decide_version_exception`
with `confirm_release: true` personally.

**Executed 8/18 evening:** 20 North items ❌Denied (0 errors; idempotent re-run confirms 0
remaining), 3 held for humans (architecture item → Adam; ActiveCampaign bundle → split + Greg;
GlobalLink item — carries a person's recommendation). Version verified untouched: ⏸️On Hold,
version ⚖️Exception Status 🆕Requested, Undecided Items 1, Denied Items 20. Release preview for
the operator: `docs/north-release-preview-2026-08-18.md`. Channel notice: threaded + broadcast
under the context post.

## Current queue snapshot (2026-08-18, 46 items)

| State | Count | Apps |
|---|---|---|
| 🆕Requested, no recommendation — **this lane's target** | 22 | North Embedded Checkout (21), ActiveCampaign (1, bundle row) |
| 👀Under Review, partner-lead DENY recommendation recorded, awaiting Adam | 17 | Awesome Popups (7), Optibase (9), GlobalLink (1) |
| ✅Approved | 5 | CartGenie, Concord Privacy, Consent Pro, North (support email), Wistia |
| ❌Denied | 2 | Cloudinary, Sparkfive |

Live view: ⚖️Exception Decisions (`viwM48eXQT4Mxc4Ak` on `🖌️Asset Versions`).

## Addendum — 2026-08-20: the lane went live, on the chat engine

Phase 1 shipped with one architecture change from the plan above. The Dify Workflow app was
never built; what exists in Dify is the "Exception Decisions — Partner Lead" AGENT app. The
live lane therefore runs in two layers, twice a day (launchd, 8:30 + 13:30 Central):

1. **Judgment** — `scripts/leans-dify.mjs` calls the agent app via `/chat-messages` (SSE;
   agent mode has no blocking) with a hard ANALYSIS-ONLY, no-tools prompt, and strips the
   notes section from item detail so every lean is independent. Fallback engine:
   `scripts/leans-claude.mjs` (Claude CLI applying Ruleset v1, the shadow-run methodology).
2. **Enforcement + writes** — `scripts/runner.mjs --leans <file> --write`, unchanged: the
   automation identity, technical types only, confidence ≥ 0.7, already-recommended skip,
   cap 25, advisory only.

The identity guardrail holds by construction: the agent app's tools act as partner-lead, so
the agent is never allowed to write in this lane — a tool-call detector warns in the run log
if it ever tries. Key: `DIFY_PARTNER_LEAD_APP_KEY`, Infisical prod `/exception-decisions-mcp`.

**Parity check (per this runbook's own requirement):** 5 items re-run through the Dify engine
against the Claude engine's recorded leans — 4/5 exact agreement on direction; the one
divergence was conservative (approve 0.80 → NEEDS-HUMAN routed to Adam). First scheduled run
(13:30, Claude engine): 12 advisory recommendations written, 3 needs-human routed, 0 errors.
Weekly calibration vs final decisions applies as written above.

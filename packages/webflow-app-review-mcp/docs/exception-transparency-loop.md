# App Review Exception Transparency Loop

> **Canonical copy (since 2026-08-19).** This file moved here from the `root-preserve-20260811-1955` tree (its `docs/` never landed on main) and was updated the same day: intake/release automations marked LIVE, decision-rights v2 recorded, Adam's 8/18 disposition + the 8/19 scope-ratification pause added, and the Storesynk precedent logged. Update this copy, not the preserve tree's.
>
> **Companions:** [`partner-app-exception-rationale.md`](./partner-app-exception-rationale.md) — when an exception is warranted and how to explain it. [`consent-category-standard-provisional.md`](./consent-category-standard-provisional.md) — the current bar for consent/CMP apps. (Both copied from the preserve tree 8/19.) This document is the *mechanism*; those two are the *substance*. Decision-side mechanics: `packages/exception-decisions-mcp/docs/` (current monorepo).

Slack channel **#app-review-exceptions** (`C0BN54FQU84`, private) is the transparency surface for app review exceptions and holds. **Airtable is the source of truth** — decisions are made by setting fields on `🖌️Asset Versions` (`tblHxZ2hgSFLZxsZu` in `appMoIgXMTTTNIc3p`); Slack threads carry the discussion.

## The rules (per #app-review-exceptions process feedback, 8/6/2026)

1. **Dual sign-off.** Final approval requires BOTH review sign-off AND an approved exception. An exemption for one item never implies version approval — reviews usually carry several items.
2. **Stop early, hold, don't test.** If review finds a blocking item with no exemption, the review ends there: place the version ⏸️On Hold (reason: *Pending Exception Decision*) and raise the exception. Don't spend testing time on an app that has to change anyway.
3. **Partnership apps never get rejection emails.** Rejections are flagged internally (❌Rejected (No Notification)) and routed to partnerships for the exemption decision. **Exception (8/13):** a rejection driven by a DENIED exception is the partnerships decision — the standard email is intended and the shield skips it.
4. **Exemption granted ≠ done.** After an exception is approved, the app still needs a full testing round plus any other outstanding items before ✅Approval.
5. **Two-stage decision chain (formalized 8/17).** Partner-lead (Greg Kelly) reviews/recommends → Adam Lehman & team give the final allow/deny. The 🆕Requested channel post CCs both. **A denial releases the feedback to the developer automatically** — the version moves to ❌Rejected and the standard pipeline emails the review feedback (no more silence after a denial; the Sparkfive gap).
6. **Intake hold + auto-release (8/18, LIVE — first organic fire verified 8/19).** A new submission arriving while the app has undecided ⚖️exception items is automatically placed ⏸️On Hold (Pending Exception Decision) at intake — no review time is spent before the decisions land. When the last item is decided, the version auto-releases back to 🆕Ready for Review and the reviewer is DM'd to run the round (verifying denied items were actually fixed). A reviewer who deliberately needs to proceed sets 🏃🏾In Review (the hold trigger only matches Ready for Review). First applied to the Flowout resubmissions (Optibase v102, Awesome Popups v5 — held manually 8/18; they predate the automations). **Verified organically 8/19 on Storesynk v68 (`recyPCjEZMnfwxZRp`)**: filing ⚖️Exceptions rows against the *current* version also trips the hold (the rollup is asset-wide, so "prior version" in the hold-note copy is an understatement — items on any version, including this one, hold it). The hold fired within seconds of the first rows landing.
7. **Adam waivers, not scope determinations (8/18–8/19).** Adam's 8/18 written disposition of the North findings (gdoc `1xjI6tlMLjwaCMOgL_8b-H0e36V6zHmOWbshgmZtAys4`) established the decision format: per-item rulings under a PROPOSED scope philosophy (review gates the Designer surface + Webflow API/credential handling; published-site behavior is provider↔customer). **The published scope guidelines were rolled back 8/19** (openapi-internal revert #965, pending the surfaces question with Pablo + a security review) — so until ratification, grants citing published-site scope are recorded as **exceptions under Adam's authority, conditional on the future Security review**, never as scope determinations. Fix-required precedents from that disposition to apply consistently: no-mutate-on-open, package hygiene + debug residue, listing/disclosure rewrites, CORS, token-in-URL, Data Client bar w/ attestations, uninstall API cleanup.

## Preflight gate guardrails (approved 8/10/2026)

Two standing-guidance rows in the reviewer-exceptions base (`appXfYXnivsUT1kLg`/`tblqkbW0SptshgPiw`) bound what the preflight gate may decide. This loop is the appeal path for both.

1. **A preflight failure is never final by itself** (`recQaZVM9BQAik8at`). Ambiguous results (no-proxy declaration, missing source maps) → manual reviewer review, never automated rejection. Clear failures → resolve-and-resubmit, not marketplace ineligibility. Disputed findings escalate as one ⚖️Exceptions row per item.
2. **A preflight pass does not replace e2e review** (`recOm7ZqCqbXlmEsD`). A passing evidence package only admits the submission to the standard queue; the full testing round still runs, and reviewer replay remains the verification for developer-run results.

Companion policy: partner-app runtime findings are flags routed here as per-item rows, not blockers (`recAIZJnheIHrdBiD`, same base).

## Reviewer workflow

1. Review the app in Airtable as normal (feedback in `📝Review Feedback` / `📝Agent Review Feedback`).
2. To raise an exception: fill `⚖️Exception Type` + `⚖️Exception Rationale`, then set `⚖️Exception Status = 🆕Requested`. A post lands in #app-review-exceptions. **If the review carries several exception-worthy items**, also add one row per item in the `⚖️Exceptions` table (fill Item/Type/Rationale first, then set `⚖️Status = 🆕Requested`) — the version can't be approved while any row is undecided. Every item's `⚖️Rationale` carries both registers: the technical finding AND a plain-English translation (see **Plain-English layer** below).
3. Park the version: set `⏸️Hold Reason = Pending Exception Decision` (+ `⏸️Hold Notes`), then flip `📝Review Status = ⏸️On Hold`. Review time stops here.
4. Discussion happens in the Slack thread. Partner-led + reviewers see everything.
5. The decision-maker sets `⚖️Exception Status = ✅Approved` or `❌Denied` with `⚖️Exception Decision Notes`. The decision posts back to the channel, **and the assigned reviewer gets a DM to resume the review with a full testing round** (when the version was on hold for the decision).
6. Approving the version while any exception is undecided is blocked: the automation reverts the status to ⏸️On Hold, posts to the channel, and DMs whoever flipped it. Approving with a ❌Denied exception posts a warning (verify the denied item was actually fixed).

**Sequencing rule:** fill the text fields first, flip the status second — the status flip is the trigger.

## Plain-English layer (humanizer)

Every exception item is written twice — the technical finding for reviewers, and a plain-English translation for the decision-makers and the developer. Style reference: [github.com/blader/humanizer](https://github.com/blader/humanizer) (paired with *On Writing Well*): short sentences, no jargon, concrete subjects, and the risk stated as an outcome a real person would care about, not a category.

**Why this is process, not polish (8/17/2026):** Greg's pushback on North Embedded Checkout — *"this AI assisted review has resulted in 4 pages of feedback… don't see how this direction is sustainable if we want to continue driving ecosystem innovation"* — is what happens when only the technical register reaches partnerships. The plain-English layer is how a 22-item review stays legible and decidable: each item becomes 1–3 sentences a non-engineer can approve or deny on its merits, without softening the review-side assessment.

**Mechanics** (precedent: Optibase v99 8/11, SI InstaFeed 8/12; formalized 8/17 after the North review):

- Append to each ⚖️Exceptions row's `⚖️Rationale`, after the technical text: `In plain English (<author>'s translation): … Why it matters: …` — the item's channel post then carries both registers automatically when the status flips.
- When item posts already exist in #app-review-exceptions, also thread the translation as a reply under each post.
- The technical register stays intact — the translation is an addition, never a rewrite. Review-side assessments are never edited to fit a partnerships framing.
- 1–3 sentences per item. Concrete subject ("the app", "a shopper", "the customer's site"). Say what the code does, then what it costs someone.

**Developer toolkit pointer (8/17/2026):** feedback that will be released to the developer (📝Review Feedback / Rejection Feedback) should close with a pointer to the two public developer skills on the app submission form — `webflow-app-preflight` (pre-submission gate over the patterns that most often cause rejections; SUBMIT / DO NOT SUBMIT) and `webflow-app-review-remediation` (turns issued findings into a prioritized, evidence-first fix plan and resubmission packet; READY / NOT READY TO RESUBMIT) — plus the App Review Preflight run + `wfpre_…` receipt for the resubmission. The remediation skill's finding-normalization table maps 1:1 onto ⚖️Exceptions rows (Item = Finding ID, "Confirmed:" = observed behavior, "Fix:" = acceptance criteria), and its "open decision (Judgment)" lane matches exception-pending items — a developer can fix denied and mechanical items while exemption decisions pend. Toolkit overview: `skills/WEBFLOW_APP_DEVELOPER_TOOLKIT.md` (monorepo); distribution surface is the submission form (feedback emails land in spam and skills.wf.app is Okta-gated — the form is the one surface every submitter sees; downloads are logged with the form email).

## Partnership apps

- **Source of truth**: the "Tech Partners - Business Development" sheet (`1tOctLvAumVaT1Cz6xtO1kgWC3NysAgIZceA4ogM0l6E`). The tabs that matter (Drive-export gotcha: exports flatten HIDDEN tabs without labeling them — always confirm the gid):
  - **Tech Partners** (`gid=1662426022`, visible) — current partner account list (Name | Partner Tier | Owners | Partner Type). Rows with "App" in Partner Type define partnership-app creators.
  - **Tech Partner Opps** (`gid=407376178`, visible) — **CRM-synced daily (per Greg, 8/6)**; rows with "Webflow App" opportunity type are the canonical pipeline. Orgs here count as partnership apps even before they appear on the Tech Partners account tab (that's how Wistia/Cloudinary/Sparkfive were only findable here).
  - **Archived** (`gid=813844935`, HIDDEN) — the old "App Name | App Partner | App Partner Status" list. Stale (Calendly/Paddle/Statsig live here); do not sync from it.
- **The rule (per Micah, 8/6): an app is a partnership app if its CREATOR is a partner account** with App type — not only if the app is named somewhere. A partner agency's whole catalog qualifies (e.g., all of Flowout's apps, including their Stripe app). The flag follows the creator, never a name match (skip look-alikes: Flowstar's "PayPal Button"/"Form Connectors", third-party "Google …" apps, "Make" substring hits).
- Flag the asset: check `🤝Partnership App` on the 👛Assets record (`fldzZ2Zo8a7vtIMT3`). Rolls up to versions as a lookup (`fldczL9zgq44MjxQE`) and drives the rejection shield.
- **Backfill done 8/6/2026, 134 assets flagged** in four passes: 46 by app-name match from the (later discovered stale) Archived tab, 31 by creator match against the old account list (caught Consent Pro, GlobalLink, ActiveCampaign, CartGenie, Flowout's Stripe), 53 by creator match against the current Tech Partners tab (Concord Privacy, TrustArc, Profound, Zoho Flow ×9, Smartarget ×22, IFTTT, Storylane, BuildShip, Census, Bookla, AddEvent, Basin, DataGrail, Hugeicons, Creattie, Vault Vision, LoginID, LandingRabbit, AutoBlogg, Google Ads for Webflow, CartGenie testing), then 4 from the CRM-synced Opps pipeline (Wistia, Cloudinary, Sparkfive, Sequel.io — the exception-saga apps that appear nowhere else).
- **Watch-list (pipeline Webflow App rows with no Airtable asset yet — flag at submission)**: Translated, Microsoft Teams, Adobe Stock, Hightouch, Microsoft Brand Agents, LinkedIn Ads, Conductor, Twilio Segment, Shopify, Customer.io, DeepL, Runway, Gradial, New Generation, Slack (Salesforce), Algolia, Monotype, NORTH, Marketo.
- **Open question (asked in-channel 8/6)**: partner row "Knock" (Tier 3, App) — is it knock.app (notifications, a Webflow vendor) or the "Knock AI" creator in Airtable? Not flagged pending Greg's answer.
- **Auto-sync is live**: routine **Partner App Flag Sync** (`trig_01Cxr9MbmzDcybJRcKsmsPtL`, https://claude.ai/code/routines/trig_01Cxr9MbmzDcybJRcKsmsPtL) runs daily at 13:00 UTC (8am CT), after the CRM's daily push to Tech Partner Opps. It diffs both live tabs against 👛Assets and sets 🤝Partnership App on confident creator/pipeline matches. Guardrails: flag-only (never unflags, touches no other field), look-alike traps hard-coded (Make substrings, Flowstar, third-party "Google …" apps), Knock held as ambiguous, >15 candidates in one run = post for human review instead of writing, silent when nothing changed, posts diagnostics to #app-review-exceptions on failure. Attached connectors: Zapier (Sheets), Airtable, Slack — all under Micah's account.
- Rejecting a flagged app auto-converts to ❌Rejected (No Notification) — no creator email — and posts to #app-review-exceptions for the exemption decision.
- Preferred flow is still hold-and-request (rule 2 above); the rejection shield is the backstop.

## Fields (Asset Versions, `tblHxZ2hgSFLZxsZu`)

| Field | ID | Notes |
|---|---|---|
| ⚖️Exception Status | `fldQo0XS9zJp5PifI` | 🆕Requested `selQnSOTmaanUa4nq` · 👀Under Review `selm3U2mx3jvUnD7v` · ✅Approved `selqIKFvZ2uduNIsT` · ❌Denied `selYYAJpyC0N7MNiw` · 🔙Withdrawn `selBL4H5JAWGXawK1` |
| ⚖️Exception Type | `fldYBytJAxkoax1db` | Guideline / Category Constraint / Custom Code / Scopes / Security / Pricing / Other |
| ⚖️Exception Rationale | `fldHm7bwSMkrcHYip` | Seeds the root Slack post |
| ⚖️Exception Decision Notes | `fldYVNmh3VKM7mGbV` | Posted with the decision |
| ⚖️Exception Requested By | `fldQlqegqmNwj3gWr` | Auto-filled by script (record last-modified-by) |
| ⚖️Exception Decision By | `fldQwXHkFcpNgmDSM` | Auto-filled by script |
| 📅Exception Requested Datetime | `fldonrW3JIOJQOHf4` | Stamped by script |
| 📅Exception Decision Datetime | `fldGAzs9xwwSSvjce` | Stamped by script |
| 🔔Exception Slack TS | `flddpAmN1slPDuKhZ` | Thread anchor in C0BN54FQU84 — written back by the Zap, do not edit. Separate from `🔔Slack TS` (submission channel) |
| ⏸️Hold Reason | `fldwoVrvt27LaEWIA` | Required for a meaningful hold post. `Pending Exception Decision` = `sel45W17YtyKQ0bXm` |
| ⏸️Hold Notes | `fldmcikFo6r5GyLuf` | Context for the hold post |
| 🤝Partnership App (lookup) | `fldczL9zgq44MjxQE` | Lookup of 👛Assets `🤝Partnership App` checkbox (`fldzZ2Zo8a7vtIMT3`) via the 💎Asset link |
| ⚖️Exceptions (link) | `fld8hWsxsAssmFi6u` | Linked ⚖️Exceptions rows (one per item) |
| ⚖️Undecided Items | `fldiVQqWSw5shDkZS` | Rollup: SUM of `Undecided?` over linked rows. Approval gate blocks while > 0 |
| ⚖️Denied Items | `fldzwlnjdAapVFkzp` | Rollup: SUM of `Denied?` over linked rows. Approval with > 0 posts a warning |
| ⚖️Asset Undecided Exceptions | `flddDkn2eWtplyvXd` | Rollup via 👛Asset of the asset's undecided-exceptions count — undecided items on ANY version of this app. Gate branch 4 blocks while > 0 (closes the resubmission race) |
| ⚖️Asset Approved Exceptions | `fldlmMh3U9keUyCwS` | Rollup via 👛Asset of the asset's approved-exceptions count — reviewer visibility at intake |
| ⚖️Asset Exception History | `fldNpzS3Ghqn2iNbJ` | Lookup via 👛Asset of the asset's ⚖️Exceptions reverse link — every exception item ever raised on this app, visible on every version including brand-new submissions |

## ⚖️Exceptions table (per-item), `tblnbaaIbIulWl0b7`

One row per guideline item on a version — because reviews usually carry several items, and an exemption for one item must not imply the rest are fine. The version-level `⚖️Exception Status` remains the aggregate state; use the table whenever more than one item is in play.

| Field | ID | Notes |
|---|---|---|
| Item (primary) | `fldmJcVJCytD1VY1r` | The specific guideline item / failure |
| 🖌️Asset Version | `fldqVk39RERL1tVPP` | Link to the version (reverse: `fld8hWsxsAssmFi6u`) |
| ⚖️Status | `fld0D5PoJAWhYeHiI` | 🆕Requested `sel91VQaTRb8QxyoT` · 👀Under Review `sel5C6fH5rizjsx1j` · ✅Approved `sel8yzRhpRZFcORJA` · ❌Denied `selzvx0kf7EezmoYi` · 🔙Withdrawn `sel6DW2aSM0ru0gcM` |
| ⚖️Type / ⚖️Rationale / ⚖️Decision Notes | `fldUqjcnkOUO7RRKS` / `fldHNABt611HJ6JxI` / `fldZvSg7gpbBw89Hz` | Mirror the version-level fields |
| ⚖️Requested By / ⚖️Decision By | `fldg17LtSEg66IkxJ` / `fldcPJTTphd9MGnjT` | Manual for now (native actions can't write the acting user; script upgrade adds it) |
| 📅Requested / 📅Decision Datetime | `fldSP7etbvaMdEAYm` / `fldhqW4RSpazA6421` | **Auto-stamped** by the item automation on status change |
| ⚙️Current Datetime | `fldxUwzNtBv5MQqJU` | `DATETIME_FORMAT(NOW(), ISO)` — the stamp source (house pattern; string form because MCP-created formula fields can't get dateTime result formatting) |
| Undecided? / Denied? / Approved? | `fldDwkkTHErvn4atw` / `fldJXVOBAeKLACZtc` / `fldNklB5AxNSbGWC9` | Formulas feeding the version + asset rollups (empty status counts as undecided) |
| 👛Asset (link) | `fldFCAzKDAqw58BF4` | The app this exception belongs to. Reverse field on 👛Assets: `fldsXCY1wmJdLQgA4`. Set by the MCP at creation; the `⚖️Exception → 👛Asset auto-link` automation is the backstop for hand-created rows |
| ⚙️👛Asset Record ID (via Version) | `fld2v3CWkknayjbjA` | Helper lookup (version → asset record ID) the auto-link automation copies from |

**Why the asset link exists (8/6/2026):** all ⚖️ fields on versions are per-version — a resubmission's record starts blank, so a reviewer opening vN+1 saw no trace of vN's exceptions, and the gate couldn't block approval while a *prior* version's exception was undecided. Exceptions → version → asset is two hops and Airtable lookups traverse one, so exceptions link to the asset directly. 👛Assets carries `⚖️#️⃣Undecided Exceptions` (`fldWDRlf1gM9vUR6d`) and `⚖️#️⃣Approved Exceptions` (`fldrqvpAWklli7epo`); versions surface them via the three ⚖️Asset fields above. History is visibility; only the undecided count gates.

**The durable exemption record (per Pablo's ask, #marketplace-app-reviews 8/7/2026):** partner-led asked for "a durable exemption note on the Airtable asset record… decision owner and date, exact finding exempted, rationale, remaining findings, and current review status." Every element already exists — point people here rather than building anything new:

| Asked for | Where it lives |
|---|---|
| Decision owner + date | `⚖️Exception Decision By` + `📅Exception Decision Datetime` (version) / `⚖️Decision By` + `📅Decision Datetime` (per-item; datetimes auto-stamped, owner manual until the script upgrade) |
| Exact finding exempted | ⚖️Exceptions row `Item` (+ `⚖️Type`) — one row per finding |
| Rationale | `⚖️Exception Rationale` / per-item `⚖️Rationale`, plus `⚖️Exception Decision Notes` |
| Remaining findings | `⚖️Undecided Items` rollup + `📝Review Feedback`; the approval gate blocks while any item is undecided |
| Current review status | `📝Review Status` (+ `⏸️Hold Reason`) |
| Durable on the asset (survives resubmission) | ⚖️Exceptions → 👛Asset link; `⚖️Asset Exception History` + undecided/approved counts visible on every version, including brand-new bundles |

The one piece NOT yet built: surfacing the decision back into the **submission thread** in #marketplace-app-reviews (decisions post to #app-review-exceptions only). The version's `🔔Slack TS` anchors the submission thread; this lands in the MCP-worker delivery leg (see Not done / future).

**MCP access (deployed 8/6/2026):** the app-review MCP reads all exception/hold fields on versions and exposes the per-item table via `app_review_list_exception_items`, `app_review_create_exception_item` (deliberately does not set status — sequencing rule), and `app_review_update_exception_item`. Since 8/6 late (deployed, version `d1517a2d`): `create_exception_item` also sets 👛Asset from the version automatically, and versions expose `asset_undecided_exceptions` / `asset_approved_exceptions` / `asset_exception_history` read-only. Version-level exception/hold fields are writable through `app_review_update_version_review`; script-stamped fields (datetimes, requested/decision by, Slack TS) and the rollups are read-only in the field map. **Interface:** the ⚖️Exceptions page in the 📝Review Team Dashboard (`pagUxgsM6AAQK51Oh`) is the team-facing window — tabs for Needs Decision / Approved / Denied; the 7 pre-table decisions were backfilled as per-item rows 8/6.

## Decision-maker MCP (exception-decisions-mcp, deployed 8/17/2026)

Decision-makers (partner-lead → final allow/deny) get their own MCP surface instead of the reviewer MCP: **`https://exceptions.mcp.createsomething.agency`** (worker `exception-decisions-mcp`, source `packages/exception-decisions-mcp/` in the current monorepo — not this preserve tree). Tools: `list_pending_exceptions`, `get_exception_item`, `decide_exception_item`, `decide_version_exception`, `whoami`. Per-person keys (`DECIDERS_JSON` secret) carry identity: decisions stamp `⚖️Decision By` (best effort) and always append a signed attribution line to the decision notes. Guardrails mirror this loop: item decisions are individual; version-level approval refused while ⚖️Undecided Items > 0; version-level denial requires `confirm_release: true` because the denial follow-through emails the review feedback to the developer. Auth forms: `Authorization: Bearer <key>` on `/mcp`, or `/mcp/<key>` path form for clients without header support (claude.ai custom connectors). Keys live in `.deciders.local.json` (gitignored) — distribute via 1Password, rotate by re-uploading the secret.

**v1.1.0 (8/17) — partner-lead tools**: `recommend_exception_item` (records an approve/deny recommendation without deciding — sets the item 👀Under Review + appends "Partner-lead recommendation: …" to the notes for the final decision-maker) and `draft_developer_update` (composes a developer-facing status update from the records: exempted / requires-fixes / pending, plain-English first, closing with the developer skills toolkit pointer — returned as a DRAFT the partner-lead sends through their own channel; the tool never contacts the developer). This gives the "who communicates exemption scope + open items to the developer" ownership question (open since 8/7) a working answer: the partner-lead composes from the records and delivers personally. Dify surface keys exist for both Adam (final) and Greg (partner-lead).

**Dify agent surfaces (live 8/17, interim)**: Adam — "Exceptions Decisions" (`https://udify.app/chat/LiJy3IyQpdxpvHUh`); Greg — "Exception Decisions — Partner Lead" (`https://udify.app/chat/drMfcxMzQ9nSK0f9`, 7 tools incl. recommend + draft). ⚠️ These are public chat URLs acting AS the named person — treat each link as a credential; revoke a surface by removing its `surface: "dify"` entry from `DECIDERS_JSON` and re-uploading the secret. Agent instruction sets live in the exception-decisions-mcp session records; keys in the package's `.deciders.local.json` (gitignored).

**Technical-recommendation lane → automation (direction set 8/18, infra deployed same day)**: per Paige's 8/18 relay of Greg's feedback (*"for the technical things I don't know if I should say yes or no — these feel like Adam decisions"*), the partner-lead recommendation step for **technical** items (Security, Custom Code/Scopes, technical Guideline) moves to a Dify-workflow automation writing advisory recommendations under its own `role: automation` identity; **Greg stays cc'd** (decision-chain mentions unchanged) and keeps the business lane (Pricing/Billing, partnership stakes) + developer comms; Adam remains the only decider. Runbook: `packages/exception-decisions-mcp/docs/dify-recommendation-runbook.md` (current monorepo — routing rules, ruleset v1, Dify Service API calls, verified automation impact map). **v1.2.0 deployed 8/18** (Micah-approved): role-aware recommendation prefix ("Automated recommendation (advisory):" for automation keys) + decide tools refuse automation keys server-side; `DECIDERS_JSON` now 6 identities (new: Exception Recommendation Automation, role automation). Shadow run over the live queue same day (zero writes): 20 DENY leans + 2 NEEDS-HUMAN, calibration page at `https://wrop.wf.app/w/exception-recommendation-shadow-run-8-18-aigsn5` — first live write-run gated on Adam ≥16/20 + the Dify workflow app creation. The lost worker source was recovered from the Cloudflare deploy and rebuilt: `packages/exception-decisions-mcp/src/index.ts` (+ `docs/recovered-deploy-v1.1.0.{md,js}` as the v1.1.0 reference).

**Decision-rights v2 + worker v1.3.0 (deployed 8/18 late)**: automation may record **item-level DENY only** (a deny waives nothing — it's the default posture, and the developer can just fix the item); **approve and all version-level actions are person-only**, refused server-side for automation keys (verified live). The runner (`scripts/runner.mjs`) only decides items carrying its own standing advisory-DENY note and never overrides human recommendations. First live decide-run 8/18: 20 North items ❌Denied, 0 errors, idempotent; version left untouched. Calibration against Adam's 8/18 disposition: all 12 of his overrides were published-site scope calls + 1 severity call — on his in-scope surface the automation matched him ~100%. Ruleset v2 direction: encode the scope dimension (waits on ratification) + the Data Client bar; onboarding-docs rule stays human-only.

## Automations (live)

Eight verified **deployed and live** (the six 8/17-era automations, plus the intake/release legs enabled 8/18 and verified firing organically 8/19):

| Automation | ID | Trigger |
|---|---|---|
| ⚖️Exception Status → #app-review-exceptions | [`wflBcRnidEULHXzUn`](https://airtable.com/appMoIgXMTTTNIc3p/wflBcRnidEULHXzUn) | `⚖️Exception Status` changes. 🆕Requested post carries the decision-chain mentions (Greg → Adam, 8/17). ✅Approved post carries the "exception only" caveat + DMs the reviewer to resume when the version is on hold for the decision. **❌Denied auto-releases the feedback to the developer** (8/13 + 8/17): on the On Hold + Pending Exception Decision state it fills what's missing (copies 📝Review Feedback → Rejection Feedback; defaults Rejection Reason to Guideline Infringement) and flips 📝Review Status = ❌Rejected in one atomic update so the standard pipeline emails the partner; falls back to a reviewer DM + channel warning only when there is nothing to send. Auto-stamps 📅Exception Requested/Decision Datetime from ⚙️Current Datetime. **⛔ Undecided-items guard (drafted via MCP + PUBLISHED in UI, both 8/19 — verified live, deployedVersion == draft)**: a new FIRST branch in the release group blocks the release while `⚖️Undecided Items > 0` — posts a :no_entry: warning and reverts ⚖️Exception Status to 👀Under Review; re-setting ❌Denied after the last item is decided releases as before. Deliberately NO "=0" condition on the Release branches: the rollup is EMPTY (not 0) on versions with no item rows, and "=0" would break the single-exception release path (the Sparkfive fix); first-match-wins makes the guard sufficient. MCP revert handle for the draft edit: `actyTeWanCIzK37nL` |
| ⏸️App On Hold → #app-review-exceptions | [`wflZxJWJUDm58R5r6`](https://airtable.com/appMoIgXMTTTNIc3p/wflZxJWJUDm58R5r6) | `📝Review Status = ⏸️On Hold` AND `🔔Slack Channel = C04DDRJ5VGT` (app-type versions) |
| ⚖️Approval Gate + Partnership Shield | [`wflqWGjY4PsXCog3U`](https://airtable.com/appMoIgXMTTTNIc3p/wflqWGjY4PsXCog3U) | `📝Review Status` changes. Six branches: 🤝partnership rejections → No Notification — **branch 1 SKIPS denial-driven rejections** (`⚖️Exception Status = ❌Denied`, added 8/13 after the Sparkfive live test) so the release email is never suppressed; approvals blocked (revert to ⏸️On Hold + post + DM) while the version's exception is undecided, while ⚖️Undecided Items > 0, or while `⚖️Asset Undecided Exceptions > 0` (undecided exception on ANY version of the app — closes the resubmission race); two soft ⚠️denied-exception warnings |
| ⚖️Exception Items → #app-review-exceptions | [`wflwRPrmqvWN8HrAn`](https://airtable.com/appMoIgXMTTTNIc3p/wflwRPrmqvWN8HrAn) | `⚖️Status` changes on an ⚖️Exceptions row; auto-stamps 📅Requested/📅Decision Datetime |
| ⚖️Exception → 👛Asset auto-link | [`wfl7w27lIpKXIS3QP`](https://airtable.com/appMoIgXMTTTNIc3p/wfl7w27lIpKXIS3QP) | ⚖️Exceptions row has a version but no asset → copies the version's asset into 👛Asset. Backstop only: the MCP sets the link at creation |
| ⚖️Denied exception w/o rejection — daily sweep | [`wflcn4fLNsPCNzCpX`](https://airtable.com/appMoIgXMTTTNIc3p/wflcn4fLNsPCNzCpX) | Cron, daily 9:00 AM Central (created 8/13 after Sparkfive v7). Finds versions with `⚖️Exception Status = ❌Denied` still sitting `⏸️On Hold` + `Pending Exception Decision` — a denial recorded but never released — and posts one reminder per stuck record to the channel until the version leaves On Hold. Safety net behind the auto-release; catches pre-automation denials and nothing-to-send fallbacks |
| ⚖️Intake hold — undecided exceptions on the app | [`wflMSqzPwS501b7Ar`](https://airtable.com/appMoIgXMTTTNIc3p/wflMSqzPwS501b7Ar) | **LIVE (enabled 8/18; first organic fire verified 8/19 on Storesynk v68).** recordMatchesConditions: app-type version 🆕Ready for Review while `⚖️Asset Undecided Exceptions > 0` → atomic ⏸️On Hold + Pending Exception Decision + explanatory notes, DM to the assigned reviewer. The channel post comes free via ⏸️App On Hold. Escape hatch: 🏃🏾In Review doesn't match the trigger. Not retroactive — fires on new matches only. Note: also fires when the undecided items are on the SAME version (rollup is asset-wide); the hold-note copy says "prior version" — cosmetic only |
| ⚖️Prior-exemptions briefing → reviewer DM | [`wflbhgluc2d2cAMWI`](https://airtable.com/appMoIgXMTTTNIc3p/wflbhgluc2d2cAMWI) | **LIVE (created + enabled 8/19).** The silent counterpart of the intake hold: app-type version enters 🆕Ready for Review with a reviewer assigned while `⚖️Asset Approved Exceptions > 0` and `⚖️Asset Undecided Exceptions = 0` → DM the reviewer the approved-exemption count + view-scoped record link, with the rule (only recorded items are exempt; recurring unexempted findings are live; grants may carry conditions in the item rationale). Created after Wistia v2, where the answer sat on the record while the thread debated a temp-approve. The "=0" is safe ONLY because Approved > 0 guarantees rows exist (real 0, not empty rollup). Item NAMES can't be inlined — the expression type checker refuses map/flatten over the history lookup; if wanted, add it in the MCP webhook worker leg |
| ⚖️Exception release — resume versions when all items decided | [`wfleu2e0kOz68y9xK`](https://airtable.com/appMoIgXMTTTNIc3p/wfleu2e0kOz68y9xK) | **LIVE (enabled 8/18).** recordMatchesConditions: ⏸️On Hold + Pending Exception Decision + `⚖️Asset Undecided Exceptions = 0` (app-type); branch checks the version-level ⚖️Exception Status is settled/empty → flip 🆕Ready for Review + reviewer DM + channel post. Race-free: fires when the rollup recomputes to 0, no findRecords racing stale rollups. Mutually exclusive with the intake hold (>0 vs =0) — no ping-pong. Hold Reason/Notes left as history |

## ⚠️ Stopgap caveat + race-free upgrade (UI recipe — the one remaining open item)

`⚖️Approval Gate + Partnership Shield` runs in parallel with `🖌️Review Status Trigger`, so on a stray approval/rejection the creator email can fire before the revert lands (the revert + Slack posts still make the state loud and consistent within seconds). The race-free fix is moving the four blocking branches INTO `🖌️Review Status Trigger` — branches in one conditional group are first-match-wins, so a matched guard prevents the notification script from ever running.

**This is UI-only — confirmed 8/7/2026.** An MCP `update_automation` attempt was rejected by Airtable's API: *"This automation contains a read-only node (customScript) that cannot be edited through the API."* Any automation with a Run-a-script action (the Review Status Trigger has five) is read-only to the API. Don't retry via MCP; it's a ~5-minute UI edit.

In the `🖌️Review Status Trigger` automation editor, add four branches to the existing conditional group (copy conditions/actions/message text from the corresponding `⚖️Approval Gate + Partnership Shield` branches, which remain live as the reference):

1. **"🤝Partnership Rejection — no creator email"** — insert ABOVE "🚨Error: Rejection Reason Missing".
   Conditions: `📝Review Status` is `❌Rejected` AND `🤝Partnership App` is not empty.
   Actions: Update record → `📝Review Status = ❌Rejected (No Notification)`; Send Slack (Marketplace Asset Bot → #app-review-exceptions).
2. **"🚨Approval blocked: exception undecided"** — insert ABOVE "🚨Error: Publishing Checklist Incomplete".
   Conditions: `📝Review Status` is any of `✅Approved`, `✅Approved (No Notification)` AND `⚖️Exception Status` is any of `🆕Requested`, `👀Under Review`.
   Actions: Update record → `📝Review Status = ⏸️On Hold`, `⏸️Hold Reason = Pending Exception Decision`; Send Slack to #app-review-exceptions; Send Slack DM to Last Modified By's email.
3. **"🚨Approval blocked: exception items undecided"** — insert directly after branch 2.
   Conditions: `📝Review Status` is any of `✅Approved`, `✅Approved (No Notification)` AND `⚖️Undecided Items` > 0.
   Actions: same as branch 2.
4. **"🚨Approval blocked: undecided exception on a prior version"** — insert directly after branch 3.
   Conditions: `📝Review Status` is any of `✅Approved`, `✅Approved (No Notification)` AND `⚖️Asset Undecided Exceptions` > 0.
   Actions: same as branch 2 (message references ⚖️Asset Exception History).

Then delete branches 1–4 in `⚖️Approval Gate + Partnership Shield` (keep the two ⚠️denied-warning branches — as post-hoc warnings they don't need to win a race) and publish both automations, trigger first.

**Delivery model (decided 8/7, revised same day for non-MCP users):** the native `sendToSlack` actions in the Airtable automations are the **permanent backstop, not a stopgap**. They are the ceiling of what native (API-manageable, AI-native) automation actions can do — native actions cannot thread, return a message TS, write the acting user to a collaborator field, write to another base, or call a webhook; adding any of those natively requires a Run-a-script action, which the automations API cannot create or edit. Everything beyond that ceiling belongs in the **app-review MCP worker** (this package) — repo-owned TypeScript, tests, wrangler deploys, fully agent-manageable — not in Zapier or pasted scripts.

Because not everyone works through the MCP tools, the worker's trigger is the **Airtable Webhooks API** (a first-class Web API feature: `webhook:manage` PAT scope — no Zapier, no scripts): a webhook subscription on `🖌️Asset Versions` + `⚖️Exceptions` watching the ⚖️/⏸️ fields pings the worker on ANY edit, from any surface — Airtable UI, the interface, the MCP, or the API. On each event the worker fetches the payload (which identifies the acting user for UI edits via the payload's source metadata) and enriches: threaded post in #app-review-exceptions + `🔔Exception Slack TS` write-back; threaded decision reply into the version's submission thread (`🔔Slack TS`, per Pablo's 8/7 ask); `⚖️Requested By` / `⚖️Decision By` stamping; auto-proposal of approved exceptions into the reviewer-exceptions base. Design notes: webhook pings carry no data (fetch payloads by cursor; needs KV/D1 for cursor state); subscriptions expire after 7 days unless refreshed (cron trigger in the same worker); payloads MAC-signed (verify with the webhook secret); **skip `source = automation` payloads** so the loop's own revert/stamp writes don't re-trigger enrichment. Secrets: Marketplace Asset Bot Slack token + an Airtable PAT with `webhook:manage`, both as wrangler secrets. The native automations keep firing instantly as the loud, zero-dependency layer; the webhook leg adds the enrichment within seconds and degrades gracefully if it's ever down.

All `Open Asset Version` links are view-scoped to the **⚖️Exception Decisions** view (`viwM48eXQT4Mxc4Ak`, collaborative grid on `🖌️Asset Versions`: filter `⚖️Exception Status is not empty OR ⏸️Hold Reason is not empty`, only the decision-relevant ~14 fields visible). Rationale: the bare record URL resolved to each viewer's last-used view, where the ⚖️ fields are hidden — a partner-lead couldn't find `⚖️Exception Status` (Greg, 8/5). Link format: `https://airtable.com/appMoIgXMTTTNIc3p/tblHxZ2hgSFLZxsZu/viwM48eXQT4Mxc4Ak/{recordId}`. Views cannot be created or configured via Airtable's API — this view is UI-managed; if it's ever deleted, links fall back to record-only URLs and the hidden-field problem returns. Any worker-built links must keep this view-scoped format (build from `recordId`).

## ~~The Zap: "Exception Notifications (Webhook→Slack)"~~ — RETIRED 8/7, do not build

> **Retired (Micah, 8/7/2026):** Zapier + pasted scripts are not AI-native to manage — no agent can inspect, test, or safely change them. Delivery beyond the native-action ceiling goes through the app-review MCP worker instead (see Delivery model above). The Zap spec and scripts below are kept for reference only — the payload contract and message copy carry over to the worker implementation. (Historical validation, 8/4: Zapier's Slack connection posts as the same **Marketplace Assets Bot** identity `bot_id B012CB9CF5M`, threads in the private channel, and returns `ts` — proof the bot-identity approach works for whatever posts the threads.)

Build as a new Zap (or duplicate 206974173 and strip it down). **Do not reuse the existing hook** — its write-back targets `🔔Slack TS` and its Zendesk leg emails creators, which exception/hold events must never do.

**Webhook payload contract** (what the Airtable scripts POST):

```json
{
  "recordId": "rec…",          // Asset Version record ID
  "existingTs": "",            // 🔔Exception Slack TS if the thread already exists, else ""
  "messageText": "…",          // Slack mrkdwn for the main message
  "feedbackText": ""           // optional; posted as a threaded follow-up reply
}
```

**Zap structure:**

1. **Webhooks by Zapier — Catch Hook** — `https://hooks.zapier.com/<REDACTED — retrieve from the Zap's trigger settings in Zapier; treat as a secret>` (the `webhookUrl` script input)
2. **Paths:**
   - **Path A — New thread** (filter: `existingTs` is empty)
     1. *Slack: Send Private Channel Message* — Channel `C0BN54FQU84`, Message Text = `messageText`, Send as bot = yes, Bot Name `Marketplace Asset Bot`, Bot Icon `:scales:`, Auto-Expand Links = no, Include automation link = no
     2. *Airtable: Update Record* — base `appMoIgXMTTTNIc3p`, table `🖌️Asset Versions`, record = `recordId`, field `🔔Exception Slack TS` = step 1's `Ts`
     3. *(nested filter: `feedbackText` is not empty)* *Slack: Send Private Channel Message* — same config, Thread = step 1's `Ts`, Message Text = `feedbackText`
   - **Path B — Thread reply** (filter: `existingTs` is not empty)
     1. *Slack: Send Private Channel Message* — same config, Thread = `existingTs`, Message Text = `messageText`
     2. *(nested filter: `feedbackText` is not empty)* second Slack message, Thread = `existingTs`, Message Text = `feedbackText`

This gives one transparency thread per version: the root is whichever event fires first (exception request or hold), and every later event threads onto it. The async TS write-back is handled inside the Zap, so the scripts stay simple.

## ~~Airtable scripts (paste into the automations)~~ — RETIRED 8/7 with the Zap (reference only)

In each automation: **delete the conditional group with the Send-to-Slack actions** and add a single **Run a script** action directly under the trigger (the script does its own branching — no UI conditions needed). Leaving native Slack actions alongside the script will double-post.

Optional input for auto-promotion of approved exceptions: an Airtable PAT with `data.records:write` on the reviewer-exceptions base `appXfYXnivsUT1kLg` (or set the input to `SKIP`).

### Script A — exception loop (`wflBcRnidEULHXzUn`)

Input variables (name → value from trigger record):

```
recordId        → Airtable record ID
exceptionStatus → ⚖️Exception Status (name)
exceptionType   → ⚖️Exception Type (name)
rationale       → ⚖️Exception Rationale
decisionNotes   → ⚖️Exception Decision Notes
reviewFeedback  → 📝Review Feedback
versionName     → Name
creatorName     → 🎨Creator Name
recordUrl       → Airtable record URL
existingTs      → 🔔Exception Slack TS
actorName       → last modified by → name
actorEmail      → last modified by → email
webhookUrl      → (static: https://hooks.zapier.com/<REDACTED — retrieve from the Zap's trigger settings in Zapier; treat as a secret>)
airtablePat     → (static: PAT for promotion, or "SKIP")
```

```js
const cfg = input.config();
const status = cfg.exceptionStatus;
if (!status) return;

const table = base.getTable('🖌️Asset Versions');
const header = `\`${cfg.versionName}\`${cfg.creatorName ? ` by ${cfg.creatorName}` : ''}`;
const updates = {};

async function sendToZap(messageText, feedbackText) {
  const r = await fetch(cfg.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recordId: cfg.recordId,
      existingTs: (cfg.existingTs || '').trim(),
      messageText,
      feedbackText: feedbackText || '',
    }),
  });
  console.log(`Zap hook: ${r.status}`);
}

let messageText = '';
let feedbackText = '';

if (status === '🆕Requested') {
  messageText = [
    `:scales: *Exception Requested* — ${header}`,
    cfg.exceptionType ? `*Type:* ${cfg.exceptionType}` : null,
    cfg.actorName ? `*Raised by:* ${cfg.actorName}` : null,
    cfg.rationale ? `\n*Rationale:*\n${cfg.rationale}` : null,
    `\n:thread: Discuss here. Approve/deny via ⚖️Exception Status: <${cfg.recordUrl}|Open Asset Version>`,
  ].filter(Boolean).join('\n');
  const fb = (cfg.reviewFeedback || '').trim();
  if (fb) {
    feedbackText = `:memo: *Latest review feedback* (from 📝Review Feedback):\n${fb.slice(0, 3500)}${fb.length > 3500 ? '\n…(truncated — full feedback on the record)' : ''}`;
  }
  updates['📅Exception Requested Datetime'] = new Date().toISOString();
  if (cfg.actorEmail) updates['⚖️Exception Requested By'] = { email: cfg.actorEmail };
} else if (status === '👀Under Review') {
  messageText = `:eyes: Exception now *under review*${cfg.actorName ? ` (${cfg.actorName})` : ''}.`;
} else if (status === '✅Approved' || status === '❌Denied') {
  const approved = status === '✅Approved';
  let promotionNote = '';

  // Auto-propose approved exceptions as reviewer guidance (appXfYXnivsUT1kLg)
  if (approved && cfg.airtablePat && cfg.airtablePat !== 'SKIP') {
    const res = await fetch('https://api.airtable.com/v0/appXfYXnivsUT1kLg/tblqkbW0SptshgPiw', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.airtablePat}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: [{ fields: {
        'Title': `App exception: ${cfg.versionName}${cfg.exceptionType ? ` — ${cfg.exceptionType}` : ''}`,
        'Guidance': cfg.decisionNotes || cfg.rationale || '',
        'Knowledge Status': 'Proposed',
        'Scope': 'App Review',
        'Source Type': 'Airtable Record',
        'Source Record ID': cfg.recordId,
        'Source URL': cfg.recordUrl,
        'Review Decision Impact': 'Temporary exception',
        'Applies To': ['App'],
      }}]}),
    });
    const pd = await res.json();
    promotionNote = (pd.records && pd.records[0])
      ? `\n\n:books: Proposed as reviewer-exception guidance (\`${pd.records[0].id}\`) — needs curation before it becomes Active.`
      : `\n\n:warning: Auto-promotion to the exceptions base failed: ${JSON.stringify(pd.error || pd)}`;
  }

  messageText = [
    `${approved ? ':white_check_mark: *Exception APPROVED*' : ':x: *Exception DENIED*'} — ${header}`,
    cfg.actorName ? `*Decision by:* ${cfg.actorName}` : null,
    cfg.decisionNotes ? `\n*Decision notes:*\n${cfg.decisionNotes}` : null,
  ].filter(Boolean).join('\n') + promotionNote;

  updates['📅Exception Decision Datetime'] = new Date().toISOString();
  if (cfg.actorEmail) updates['⚖️Exception Decision By'] = { email: cfg.actorEmail };
} else if (status === '🔙Withdrawn') {
  messageText = `:leftwards_arrow_with_hook: Exception request *withdrawn*${cfg.actorName ? ` (${cfg.actorName})` : ''}.`;
}

if (messageText) await sendToZap(messageText, feedbackText);
if (Object.keys(updates).length) await table.updateRecordAsync(cfg.recordId, updates);
```

### Script B — hold loop (`wflZxJWJUDm58R5r6`)

Input variables:

```
recordId       → Airtable record ID
reviewStatus   → 📝Review Status (name)
slackChannel   → 🔔Slack Channel
holdReason     → ⏸️Hold Reason (name)
holdNotes      → ⏸️Hold Notes
reviewFeedback → 📝Review Feedback
versionName    → Name
creatorName    → 🎨Creator Name
recordUrl      → Airtable record URL
existingTs     → 🔔Exception Slack TS
actorName      → last modified by → name
webhookUrl     → (static: https://hooks.zapier.com/<REDACTED — retrieve from the Zap's trigger settings in Zapier; treat as a secret>)
```

```js
const cfg = input.config();
if (cfg.reviewStatus !== '⏸️On Hold') return;
if (cfg.slackChannel !== 'C04DDRJ5VGT') return; // apps only

const messageText = [
  `:double_vertical_bar: *App placed On Hold* — \`${cfg.versionName}\`${cfg.creatorName ? ` by ${cfg.creatorName}` : ''}`,
  `*Reason:* ${cfg.holdReason || '⚠️ not set'}`,
  cfg.actorName ? `*Placed by:* ${cfg.actorName}` : null,
  cfg.holdNotes ? `\n*Notes:*\n${cfg.holdNotes}` : null,
  `\n<${cfg.recordUrl}|Open Asset Version>`,
].filter(Boolean).join('\n');

const fb = (cfg.reviewFeedback || '').trim();
const feedbackText = fb
  ? `:memo: *Latest review feedback* (from 📝Review Feedback):\n${fb.slice(0, 3500)}${fb.length > 3500 ? '\n…(truncated — full feedback on the record)' : ''}`
  : '';

const r = await fetch(cfg.webhookUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    recordId: cfg.recordId,
    existingTs: (cfg.existingTs || '').trim(),
    messageText,
    feedbackText,
  }),
});
console.log(`Zap hook: ${r.status}`);
```

## Suggested channel kickoff message (pin it)

> :wave: This channel is the transparency surface for **app review exceptions and holds**.
> • Reviewers raise exceptions in Airtable (`⚖️Exception Status = 🆕Requested`) — each one creates a thread here.
> • Discussion happens in the thread; the **decision is made in Airtable** (✅Approved / ❌Denied) and posts back automatically.
> • Apps placed ⏸️On Hold surface here with their reason.
> Nothing here is a decision record — the Asset Version record is.

## Case log (decision precedents)

- **North Embedded Checkout (8/18)** — 22 findings, partnership app, Conf-sponsor timeline. Automation wrote 20 advisory DENYs + denied them under decision-rights v2; Adam's written disposition same night: 14 exempted (published-site scope calls, framed as waivers pending ratification) / 8 fix required (CORS, token-in-URL, Data Client bar w/ 3 attestations, no-mutate-on-open, uninstall API cleanup, package hygiene + debug residue, listing rewrite, support email). Open human-vs-human conflict: support-email item (Greg ✅Approved stands in Airtable vs Adam "Fail — Webflow Marks. Uncontested") — do not touch the record.
- **Storesynk, formerly Shopyflow (8/19)** — the **non-partnership** precedent: 6k+ installs, Ecommerce, Hybrid. A pre-loop informal "temporary exemption" (ZD 1141276) was converted into 14 per-item ⚖️Exceptions rows on v68 (`recyPCjEZMnfwxZRp`) from Shea Sisco's finding-by-finding map (gdoc `1O-yjnb1I0lnp0gTE-vvMAnrORIK3NPscAEXO4gvaoCc`): 6 NOT EXEMPT (all non-breaking fixes per the doc's own breaking-change analysis), 7 exempt/accepted (all the genuinely breaking migrations: SRI/versioning, config format, Shopify hostname), + 1 prior explicit `execCommand` grant ratified into the record. Pattern to reuse: **when the breaking-change defense and the fix list don't overlap, the answer is a narrow conditional waiver + a fix list, not a blanket exemption.** Also the first organic intake-hold fire. ⚠️ Non-partnership: no rejection shield — a version-level ❌Denied auto-releases the feedback email to the developer, so decide items first and flip the version aggregate deliberately.

## Not done / future

- **Race-free gate** (the only remaining hole): apply the UI recipe above, then delete branches 1–4 of the stopgap automation. UI-only — the automations API refuses to edit script-bearing automations (verified 8/7).
- **Webhook delivery leg in the worker — LIVE since 8/14; FIRST ORGANIC EVENT OBSERVED 8/19 (Storesynk v68 filing)** (replaces the retired Zapier/script upgrade — see Delivery model). Dedicated "Marketplace Asset Bot" Slack app approved + installed 8/14; `SLACK_BOT_TOKEN` + `AIRTABLE_WEBHOOK_API_KEY` provisioned; registration returned 201 with webhooks on 🖌️Asset Versions + ⚖️Exceptions, cron-refreshed every 6h (subscriptions expire after 7 idle days). **Observed 8/19**: worker thread root posted ("⚖️ Exception thread — …", 13:22:35 CDT) ✓; `🔔Exception Slack TS` written back to the version (1787163755.502789 = that root) ✓. **NOT working: Requested-By stamping** — all 17 posts rendered "*Raised by:*" blank and the version's ⚖️Exception Requested By stayed null for the MCP/API-sourced writes; attribution survives only inside the rationale text. Fix belongs in the app-review MCP (it knows the authenticated caller) — bundle with the deferred deny-guard into the next worker deploy. **Also observed: channel noise** — one filing produced 17 top-level messages (hold post + worker root + 14 native item posts + version root), none threaded under the root (native actions can't thread). Decide: move item posts into the worker's thread (worker enhancement) or drop the native per-item Slack action. Build history: Code: `src/exception-webhook.ts` + `src/slack.ts`, wired in `worker/index.ts`; state in the existing `TELEMETRY_DB` D1 (`app_review_webhook_state`, lazily created — no new infra); cron `11 */6 * * *` refreshes the subscriptions and sweeps missed payloads; 48/48 tests. Endpoints (workers.dev surface): `POST /webhooks/airtable` (Airtable ping, MAC-verified), and bearer-authed (`MCP_API_KEY`) `POST /webhooks/airtable/register[?force=1]`, `GET /webhooks/airtable/status`, `POST /webhooks/airtable/process` (manual sweep). **DEPLOYED 8/7** (version `191fdf74`, via `wrangler login` OAuth — the Infisical prod-root `CLOUDFLARE_API_TOKEN` was found revoked 8/7 and still needs replacing for headless deploys). Health endpoint reports the leg's remaining gaps live (`exceptionWebhookLeg.missing`). Auto-proposal is wired to the worker's existing `AIRTABLE_REVIEWER_EXCEPTIONS_API_KEY` secret — no new KB secret needed. **Remaining to go live** (in order):
  1. `wrangler secret put SLACK_BOT_TOKEN` (in `worker/`) — via a **dedicated Slack app** (manifest ready to paste: [`slack-app-manifest.yaml`](./slack-app-manifest.yaml); create-from-manifest → Request to Install → Flowbot approval → invite the bot to `C0BN54FQU84` + `C04DDRJ5VGT` → token to 1Password Marketplace vault + wrangler secret). Investigated 8/7: there is **no existing "Marketplace Asset Bot" Slack app** — that name is a username override stamped by the Airtable/Zapier integrations (`B012CB9CF5M` is Zapier's). The `[eif bot] SLACK_BOT_TOKEN` in the shared 1Password vault is the **production incident bot (firefighter_bot)** — do not borrow it.
  2. `webhook:manage` scope on `appMoIgXMTTTNIc3p`: add it to the existing `AIRTABLE_API_KEY` PAT, or `wrangler secret put AIRTABLE_WEBHOOK_API_KEY` with a dedicated PAT. (If missing, the register call fails with a 403 — that's the tell.)
  3. Register: `curl -X POST https://webflow-app-review-mcp.createsomething.workers.dev/webhooks/airtable/register -H "Authorization: Bearer $MCP_API_KEY"`, then flip a test exception and check `GET /webhooks/airtable/status`.

  Behavior notes: only `source: client` payloads stamp `⚖️Requested By`/`⚖️Decision By` (API-sourced payloads attribute the PAT owner; automation-sourced have no user). The worker's own writes touch only unwatched fields (Slack TS, stamps), so they never re-trigger. The one visible duplication: a request event produces both the native automation's channel post and the worker's thread root — if that reads as noise later, drop the native 🆕Requested Slack action via an MCP draft edit (keep the rest of the native layer).
- **Ownership questions raised 8/7 — ANSWERED 8/17**: the partner-lead communicates exemption scope + open items to the developer, composing from the records via the decision MCP's `draft_developer_update` (exempted / requires-fixes / pending sections, plain English, developer skills toolkit included) and sending through their own channel. Denials need no manual comms at all — the auto-release emails the feedback. Queue re-entry stays mechanical (new bundle → new version row → normal intake).
- **Per-item-only denials are uncovered (identified 8/17)**: the denial auto-release, the daily sweep, and the shield's denial exclusion all key on the VERSION-level `⚖️Exception Status`. If decisions happen only on ⚖️Exceptions rows and the aggregate is never flipped to ❌Denied, no release fires, the sweep can't see it, and a manual ❌Rejected gets shield-converted to No Notification. Convention for now: **flip the version-level aggregate after the last item decision**. **Partially closed 8/18**: the release automation (above, draft) auto-resumes a held version once every item is decided — including all-denied — so the resume path no longer depends on the aggregate flip. Still uncovered: the shield's denial exclusion keys on the version-level status, so a manual ❌Rejected with only per-item denials still converts to No Notification. Convention until fixed: flip the version-level aggregate to ❌Denied when the rejection should release feedback (the auto-release branches take it from there); shield fix when wanted: extend the exclusion to check `⚖️Denied Items > 0 AND ⚖️Undecided Items = 0`.
- **The INVERSE gap — premature version-level denial — CLOSED 8/19** (surfaced by Storesynk v68, whose Rejection Reason + Feedback were pre-filled at intake, so a stray ❌Denied would have emailed the developer instantly with 14 items undecided). Two layers: (1) the ⛔ undecided-items guard branch in `wflBcRnidEULHXzUn` (drafted via MCP; **needs UI publish**) blocks + reverts from ANY surface; (2) `exception-decisions-mcp` v1.3.1 (DEPLOYED 8/19, version `4930d26a`, commit `b87cd73fa` on `feat/exception-decisions-mcp` / PR #1433): `decide_version_exception` now refuses `denied` while `⚖️Undecided Items > 0`, same as `approved`, before the confirm_release check. Optional third layer, deliberately deferred: the same check in `app_review_update_version_review` (reviewer MCP) — that worker deploys from the root-preserve-20260811 tree and the automation guard already covers its writes once published; bundle the check into the next planned deploy of that worker instead of shipping a risky standalone one.
- **Interface/view refresh**: add the ⚖️Asset fields (history + counts) to the ⚖️Exceptions interface page and the ⚖️Exception Decisions view (`viwM48eXQT4Mxc4Ak`) — views are UI-only.
- **Collaborator stamping**: datetime stamps are automatic (8/6), but ⚖️Requested By / ⚖️Decision By on both surfaces stay manual until the MCP-worker delivery leg (native actions can't write the acting user; the worker knows the authenticated caller).
- **Partnership flag at submission**: backfill is done (8/6), but new partnership-app submissions don't auto-flag — the reviewer (or a future automation matching the sheet) must check `🤝Partnership App` when the asset is created. Watch for: Straker Translations, Paddle, Turso Tech, Calendly, Moz SEO, Worldpay, AppFit, Teachable, Marker, Statsig, Gridly, Google Site Tools, and Stripe Inc.'s own app.
- **Governance receipts**: register `C0BN54FQU84` as a source in app-governance-db and include it in the agent-mediated cursor sync so exceptions become findings/receipts.
- **Hold digest**: a scheduled reminder for versions sitting in ⏸️On Hold > N days (an Airtable view on Review Status + `⏱️Days in Current Stage` covers this manually for now).
- **Slack approve/deny buttons (v2)**: interactivity endpoint on the app-governance worker writing back to Airtable.

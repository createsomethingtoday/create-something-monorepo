# Shadow Run — Exception Recommendation Automation · 2026-08-18

**Phase 0 of `dify-recommendation-runbook.md`. NO WRITES were made** — no Airtable field changed,
no MCP call recorded anything, no Slack post fired. This document is the entire output.

**Shareable internal page (Okta-gated):**
https://wrop.wf.app/w/exception-recommendation-shadow-run-8-18-aigsn5 — same content plus a
browser-local Agree/Disagree calibration widget with a copy-out summary for Adam. Updates mint
new versions at the same URL (`PUT /api/wrops/<slug>`, Micah-owned).

**Methodology (read before judging the leans):** the Dify workflow app is not yet built (Phase 1
setup), so this pass applied **Ruleset v1 verbatim** — the same rules destined for the Dify LLM
node — with Claude as the engine, over each item's full ⚖️Rationale (technical + plain-English
registers), the app's partnership flag, and the decided-precedent corpus (7 items). Once the Dify
app exists, re-run 3–5 of these items through it as a parity check before Phase 1 goes live.

**Queue verified fresh at run time:** 22 items 🆕Requested — North Embedded Checkout ×21
(version `recCsf7iN17TTA8G2`, asset `recyKXNzOb7YkKa3U`), ActiveCampaign ×1 (bundle row,
version `rec3kteapSN1JrXSo`, asset `recdsN8Ps4HqCIxmw`). Both assets confirmed 🤝Partnership App.

## Result summary

| Lean | Count | Would write in Phase 1 (confidence ≥ 0.7)? |
|---|---|---|
| DENY (fix required) | 20 | Yes — all 20 |
| NEEDS-HUMAN | 2 | No — routed in the run summary instead |
| APPROVE | 0 | — |

**Zero APPROVE leans is signal, not malfunction.** Nothing in this queue matches the
approved-precedent patterns (category-inherent published-site behavior with no unremediated
exposure). This is a first-pass payments submission with structural gaps — the automation's value
here is consistent, plain-English DENY rationale plus isolating the one genuinely strategic item
for Adam, not rubber-stamping.

## North Embedded Checkout — 20 DENY leans + 1 NEEDS-HUMAN

### Highest-severity DENY leans (payment integrity — confidence 0.9–0.95)

| Item (rec) | Lean | What a *yes* would mean for the business |
|---|---|---|
| Credentialed CORS accepts arbitrary origins (`recNoySWOySFopUDw`) | **DENY** 0.95 | Webflow would knowingly list a payments app whose authenticated API answers any website on the internet. Rule: credentialed-CORS-open is never exemptable. |
| Debug merchant identity assignment in production (`reccZcU9kPsjqkQdO`) | **DENY** 0.95 | Who receives the money could be set by the browser. No precedent could ever cover this. |
| Reviewed script loads mutable second-stage + fingerprinting + native overrides (`reci1kAiGC98pb6Is`) | **DENY** 0.95 | What we approve today isn't what runs tomorrow, and shoppers get fingerprinted undisclosed. Rule: mutable undeclared executable code. |
| Checkout quantity client-controlled, unvalidated (`recPhWhGTo8P1SGXl`) | **DENY** 0.9 | Charges, inventory, and totals would hang off a number a shopper can garble. Rule: unvalidated payment controls. |
| Payment messages don't validate sender (`rectqoQ3P7GAYU28A`) | **DENY** 0.9 | Any script on the page could declare a payment successful. Same rule. |
| Published navigation accepts `javascript:`/arbitrary hosts (`recKrVkDwJPMTNtnk`) | **DENY** 0.9 | An unchecked redirect on a payment page is how buyers end up on a fake card form. Same rule. |
| Webflow identity token in a GET URL (`recNJ7wLVZcB2LluF`) | **DENY** 0.9 | A login credential sitting in server logs and analytics. Rule: secrets in URLs. |
| Server-side payment controls cannot be reviewed (`recxkKY2UEiICGrZg`) | **DENY** 0.9 | We'd certify payment protections we never saw. Fix is to provide the backend — cheap relative to the exposure. |
| React Router published advisories (`rec6VGSHxgVd1ABWy`) | **DENY** 0.9 | Known-vulnerable dependency in a payments app; the fix is a version bump. Rule: unpatched published CVEs. |
| Published checkout failed and concealed its error (`rec4gzAHIXhgsEgPV`) | **DENY** 0.9 | The core feature didn't work in test and reported success after failing. Precedent: Cloudinary ❌, Sparkfive ❌ — launch blockers are not exemptable. |

### Standard DENY leans (fix-required engineering/lifecycle — confidence 0.7–0.85)

| Item (rec) | Lean | Business meaning of a *yes* |
|---|---|---|
| Published scripts omit SRI (`recJeNR9sGbTifDA0`) | **DENY** 0.85 | Customer sites would run tampered code without noticing. Rule: missing SRI on injected hosted scripts. |
| Review package incomplete + production residue (`recg5K7KelxvcI7i7`) | **DENY** 0.85 | We can't rebuild or inspect what actually ships. No completeness waiver has ever been granted. |
| Custom Code removal/uninstall incomplete (`recTrM1tPuuoEHpFT`) | **DENY** 0.8 | "Uninstalled" would leave third-party scripts running on live customer sites. |
| Runtime not idempotent — double-init doubles quantities (`recjSA9HJcIBxL06k`) | **DENY** 0.8 | One click could charge a customer for three. Money-adjacent malfunction, routine fix. |
| Extension silently creates/adopts site resources (`recUdU0OkaPCdklih`) | **DENY** 0.75 | An app could edit or delete resources the customer made, before the customer clicked anything. |
| Scripts injected on pages without checkout (`recOs7SBBDyXhrgWn`) | **DENY** 0.75 | Every other issue on this list would run on every page of the site, 404s included. |
| Editable IDs in CSS selectors unescaped (`recoPwJJUjhGvOPst`) | **DENY** 0.75 | One malformed product ID silently disables purchasing for the rest of the page. Fix is one `CSS.escape()` call. |
| Long description needs production rewrite (`recc03xzF6Xvfl2DZ`) | **DENY** 0.7 | The listing merchants trust with their revenue would say "North Staging App" and imply Webflow runs it. Misleading-affiliation is a trust issue, not a copy nit (contrast: North support-email item ✅ was a nit). |
| Preview Hider incompatible with enforced CSP (`recuGoOrhtLyPU5iL`) | **DENY** 0.7 | On security-strict sites the fallback state is an exposed fake card form. CSP-compat on a payments UI ≠ cosmetic (contrast: CartGenie ✅ was a deprecated API with graceful behavior). |
| Merchant onboarding documentation missing (`recn90qdPk2XJMnO1`) | **DENY** 0.7 | Every merchant confused by underwriting becomes a Webflow support ticket. Docs are a fix, not a waiver. *(Closest to a business-tolerance call — flag if Adam/Greg disagree, this rule moves to NEEDS-HUMAN.)* |

### NEEDS-HUMAN — routed to Adam directly

**Injected code manipulates payment and checkout elements (`recG5BfFwXi8nZBLG`)** — this is the
strategic item, not a fix-it row. The app's entire architecture builds a card-details-shaped form,
hides it, and swaps in North's iframe — the review itself says "remove this architecture."
Whether Webflow permits embedded-checkout architectures that touch payment-form elements at all is
a category decision with precedent weight for every future payments app (the consent-engine ✅
precedents were category-inherent patterns, but none involved payment surfaces). Ruleset rule:
payment/data-exposure waiver on a partnership app → Adam directly. No confidence score — the
automation should never make this call.

## ActiveCampaign — 1 NEEDS-HUMAN

**v10 security findings bundle (`recPvkf8awbcOSI3C`)** — bundle row covering ten findings; ruleset
says ask for per-item rows before any lean. Two routes, both human:
1. **Process (operator):** split into per-item ⚖️Exceptions rows so each finding is decidable
   individually — the row even carries the review's own assessment ("NOT covered by Adam's 7/24
   principles; recommend standard remediation").
2. **Business (Greg):** the partner is unresponsive (Zendesk 1164793 closed, no reply, v9+v10
   rejected consecutively, listing still public). Re-engaging the partner and naming a technical
   owner is exactly the partner-lead lane.

## Implications if Adam concurs with the DENY leans

If all 20 North DENY leans become decisions, the version converges toward a version-level denial —
and **`decide_version_exception(denied)` auto-releases the review feedback email to the developer**
(the 8/13 partnership-shield exception: denial-driven rejection intentionally sends the standard
email, `confirm_release: true` required). That's the designed flow, but worth saying out loud
before 20 decisions land: the endgame of this queue is a released rejection to a partnership app.
Sequencing per the loop: decide items individually first; the `recG5BfFwXi8nZBLG` architecture
call gates whether a fix-and-resubmit path even exists.

## Calibration sheet (the Phase 0 gate)

Adam: mark each row Agree / Disagree (a one-word margin note is enough). Gate to Phase 1:
**agreement on ≥ 80% of the 20 confident leans** (≥ 16 of 20). Disagreements feed Ruleset v2 —
each one either refines a rule or demotes it to NEEDS-HUMAN. Paige/Greg: sign off on the routing
rules themselves (technical → automation → Adam; business → Greg; the two NEEDS-HUMAN routes
above are the routing rules exercising live).

| Check | Result |
|---|---|
| Items processed | 22 / 22 |
| Writes made | 0 |
| Confident leans (≥ 0.7) | 20 (all DENY) |
| NEEDS-HUMAN routed | 2 (1 → Adam, 1 → split + Greg) |
| Ruleset rules exercised | 8 of 12 (no APPROVE rules matched — expected for this queue; APPROVE calibration needs a future queue with category-inherent items) |

One honest gap: this queue can't calibrate the APPROVE side of the ruleset — every confident lean
is a DENY. Treat the Phase 0 gate as passed-for-DENY only; the first live queue containing
plausible APPROVE items should get a second mini-shadow before those write.

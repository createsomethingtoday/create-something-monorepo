# Developer documentation review vs Adam's North disposition

Reviewed 2026-08-18, against `webflow/openapi-internal` at `36d6f97` (#960, the latest docs
merge). Scope: `marketplace-guidelines.mdx` and the surfaces that mirror it. No doc changes made;
the disposition's scope philosophy is proposed, not ratified, and Adam's own doc says the waived
rules remain in force today.

## Headline finding: the disposition has one factual error

Adam's basis for waiving finding 1 says "the payment-form ban is also not in the public
guidelines." **It is.** Injected-scripts rule 11, published 8/10 via PR #953:

> "Injected scripts must not collect or transmit visitor-entered data, cookie content, or session
> data to external endpoints, and must not read from, write to, listen on, or modify payment or
> checkout form elements. These patterns are treated as critical security violations."

Timeline: the rule went live 8/10; North's version record was created 8/13; the review items 8/17.
The waiver still stands on his primary basis (scope philosophy plus exception authority), but the
secondary premise is wrong, and it matters for ratification: adopting the scope philosophy means
repealing a week-old rule that went through the legal-review packet. Flag to Adam before the doc
circulates further.

## Collision map: published rules vs the disposition

| Published rule (guidelines page) | Adam's ruling on North | If the philosophy ratifies |
|---|---|---|
| Injected 7: additive-only, no modify/restyle/remove (PR #960, 8/13, Micah's own tighten decision) | Waived (findings 1, 14): hiding the card form is exactly modify/restyle | Gutted or reframed as disclosure-based |
| Injected 2, 3, 4: loaders banned unless pinned; no in-place changes; self-certified updates = removal and possible ToS ban | Waived (finding 2): mutable unversioned loader plus fingerprinting, "decided rather than overlooked" | Severity language untenable; carve or reframe |
| Injected 8, 9: immutable versioned URLs; SRI required | Waived (finding 13), and "not to be reintroduced through the API integrityHash field" | Repeal or demote to advisory |
| Injected 11: payment/checkout form ban, "critical security violation" | Waived (finding 1) | The flagship repeal; needs legal (payments rows were already flagged full-legal-review in the V1.3 triage) |
| Injected 12: no native-function/prototype overrides | Waived (finding 2, FingerprintJS) | Carve for published-site; the identical Designer-Extension rule 7 survives (in scope) |
| Injected 13: minimum-page scoping | Waived (finding 10): "site-level scope is also a sound functional choice" | Repeal or advisory |
| Request handling 2: every message handler validates origin | Waived for published-site messaging (finding 3) | Needs a surface split: still required for Designer-surface code |

## Where the docs and the disposition agree

- **CORS** (Request handling 4) and **Backend authentication 1–2** align with his retained fails
  (findings 5, 7). His "Webflow-authenticated endpoint rule" is a cleaner consolidation of what
  these two sections already say — a good future rewrite source.
- **Token security 1 and 4** already document the substance of his three Data Client
  attestations (encrypted server-side storage, delete on revocation). What's new is the
  *verification mechanism* — written attestation instead of audit — which is review process, not
  developer obligation; if documented at all it belongs in submitting-your-app.
- **Branding, listing integrity** (findings 19, 22) — uncontested, docs fine.
- **Client-side CVEs** — his Advisory ruling on React Router is consistent with the docs as
  written: Data Client rule 4 covers server-side scans only. He correctly identified this gap.

## One doc tighten that survives either way

Injected rule 5 says apps "should" remove applied code on uninstall "where technically feasible."
Adam's split on finding 9 is *stricter*: removal of Custom Code registered through the API is
**required**. That's a Webflow-API surface behavior, in scope under any philosophy — "should" →
"must for API-registered code" is a safe, ratification-independent fast-follow (could ride the
next docs PR).

## Consistency surfaces beyond openapi-internal

All of these currently enforce the pre-disposition direction. That's correct while the philosophy
is unratified (exceptions are the escape valve), but each becomes a change item at ratification:

1. **Airtable review checklists** (V1.3 applied 8/10–8/13, including the "Additive only
   (PR #960)" line) — reviewers will keep flagging patterns Adam waives; every partnership app
   hits the exceptions loop for the same items.
2. **Public developer skills** — `webflow-app-preflight` tells developers DO NOT SUBMIT over the
   loader/SRI/immutability patterns (verified: it carries the removal-and-ban language);
   `webflow-app-review-remediation` will prioritize fixes Adam waives. Fairness issue: developers
   without partnership status are held to the strict reading.
3. **PR #961 announcement + Knock email** (drafted, unsent, gated on Paige/Greg/Adam) — announces
   the very rules now in question. Keep holding until the ratification decision.
4. **The 8/13 DOM-manipulation decision** (Micah: "tighten — additive-only", after Shea's
   pushback) points the opposite direction from the scope philosophy. Shea's team history
   ("no DOM manipulation at all" per Joey-era practice) makes this a three-way policy
   conversation — Micah, Adam, Shea — not a doc edit.

## Recommended sequence

1. Now: correct the factual line in Adam's disposition (rule 11 exists); hold #961; change no
   public docs.
2. At ratification (if it ratifies): one batched docs PR rewriting injected-scripts 2–14 around
   the scope boundary, the endpoint rule, and the verification posture — routed through legal
   (payments territory), with grandfathering decisions, batched with the developer announcement
   per the June 15 Shea/Paige rule. Update checklists and both skills in the same window.
3. Independent fast-follow: rule 5 "should" → "must" for API-registered Custom Code.

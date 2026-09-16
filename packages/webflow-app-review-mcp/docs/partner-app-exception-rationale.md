# Partner-App Exception: General Rationale

**Status: PROVISIONAL.** Written 2026-08-04 to give the partner-app exception a stated general form, so it can be applied consistently and explained on request. Companion to the standing-guidance record in the reviewer-exceptions base (`recAIZJnheIHrdBiD`) and to `consent-category-standard-provisional.md`.

- **Review by:** first working week after Webflow Conf
- **Decision owner:** Adam Lehman (7/24 principles); Partner-lead / legal own the covered patterns
- **Escalation:** Adam Lehman / Yan Xie

## The question this answers

App review approved Consent Pro v45 under partner-app principles while Concord Privacy sits rejected on materially similar published-site findings. A submitter, a partner manager, or a reviewer will eventually ask why. Without a stated rule, the honest answer is "it was decided case by case," which reads as favoritism regardless of intent — and app review had already stated an intent that the two receive identical treatment.

This document states the rule so the answer is the same no matter who gives it.

## The rule

> Certain published-site code patterns that app review does not accept Marketplace-wide may be permitted for an app whose risk is carried by an accountable Webflow relationship rather than by app review.
>
> The exception transfers **who owns the risk**. It does not lower the bar, and it does not travel beyond published-site code.

Three parts, all required:

**1. There is a named accountable owner outside app review.** A partner agreement, legal relationship, or executive decision under which a specific person or function accepts the residual risk of the pattern. Absent a named owner, there is no exception — "important to the business" is not an owner.

**2. The pattern is genuinely blocked by a platform limitation or a category necessity, not by engineering preference.** The submitter has demonstrated the constraint, not asserted it. A disabled code path or a stated preference does not qualify.

**3. The scope is published-site code patterns only.** Everything else about the app is reviewed normally.

## What the exception does not cover

This is the operative half. A covered app is still blocked by independent app-level failures, including:

- Reporting projects as connected without backend confirmation (client-side state such as `localStorage` presented as connection state)
- Disconnecting without calling the documented disable path, leaving app-applied code behind
- Discarding Webflow domain data so the wrong site or project configuration loads
- State-changing lifecycle requests authenticated only by a public identifier such as `siteId`
- Backend authorization flaws, SSRF, open proxies, and credential exposure
- Undisclosed telemetry, listing claims that misdescribe the product, and manifest/scope mismatches

These are app-quality and security failures. They are not published-site code patterns, so no partner relationship covers them.

## Why this is not favoritism

Stated plainly, for use in a reply:

The exception does not say a partner's code is held to a lower standard. It says that when a pattern's risk has been accepted by an accountable owner with the authority to accept it, app review is no longer the function deciding whether to carry that risk. Every app in the Marketplace is subject to the same requirements; what differs is whether an accountable owner has taken on a specific, scoped deviation and is answerable for it.

An app without such an owner is not being treated more harshly — it is in the default position, where app review carries the risk and therefore applies the requirement. The route to the exception is a relationship and an accepting owner, not a better argument during review.

Two things this rule deliberately does not do:

- **It does not respond to leverage.** Raising commercial or partnership pressure inside a review thread has no bearing on the outcome; the review answers to the requirement, and partnership questions route to the partner owner. Reviewers should say exactly this and not speak to partnership status.
- **It does not create precedent by similarity.** That one app holds a scoped exception does not entitle a similar app to the same pattern. The next app needs its own named owner.

## Applying it

1. Confirm all three parts of the rule. If any is missing, it is not an exception — it is a blocker.
2. Raise it through the transparency loop: fill `⚖️Exception Type` + `⚖️Exception Rationale` on the Asset Version, set `⚖️Exception Status = 🆕Requested`. The post lands in **#app-review-exceptions** (`C0BN54FQU84`). See `exception-transparency-loop.md`.
3. The rationale names the accountable owner, the specific pattern covered, and the app-level items explicitly **not** covered.
4. Decision-maker sets `✅Approved` / `❌Denied` with decision notes.
5. Approved exceptions propose into the reviewer-exceptions base (`appXfYXnivsUT1kLg` / `tblqkbW0SptshgPiw`) so the next reviewer retrieves the same rule.

Every application is recorded. An exception that is not in the loop is not an exception.

## Open item: the Concord asymmetry

As of 2026-08-04 this is **unresolved and should be resolved before Concord next asks.** Concord Privacy was rejected 2026-07-20 on loader-chain findings and its listing set to private; Consent Pro was approved 2026-08-04 on materially similar published-site findings under the partner-app principles. An exception was raised for Concord v6 (`recjS9tofX6uVuAKY`) and assessed as covered by the 7/24 principles, but the outcomes currently differ.

Two defensible resolutions, and the choice belongs to Adam and the Partner lead, not to app review:

1. **Concord is covered too** — apply the same exception, restore listing visibility, and pursue only the app-level findings. Consistent, and consistent with app review's stated intent that both receive identical treatment.
2. **Concord is not covered** — then the rationale must name what Concord lacks in part 1 of the rule (no accountable owner has accepted the risk), and that should be stated to Concord as the reason, not left to inference.

What should not happen is the difference persisting without a stated basis. Note also that Concord's rejection included a finding neither app-review nor the exception can waive: its permissions did not match what users saw at installation. That is app-level and blocks independently under either resolution.

## Provenance

| Element | Source |
|---|---|
| 7/24 partner-app principles | Adam Lehman; direction thread #wg-app-marketplace `C0B9XS5SZ7X` ts `1785859220.460639` |
| Scope boundary (published-site code only; app-level failures not covered) | Pablo Miranda scope review, 2026-08-04 |
| First application | Consent Pro v45, Asset Version `recQnHdWTHZVNxDwF`, approved 2026-08-04 |
| Standing guidance record | Reviewer exceptions base `recAIZJnheIHrdBiD` (Knowledge Status: Proposed) |
| Concord rejection findings | Zendesk 1164719; #marketplace-app-reviews `C04DDRJ5VGT` ts `1784314978.413679` |

Submitters validating their own apps: <https://skills.wf.app/skills/webflow-app-preflight>. Partner apps run it with their exceptions applied.

# Intake Review: Webflow Template Submission Forms

> **IC**: Webflow Marketplace / Template submission flow
> **Source Tool**: Live Webflow production page
> **Submitted**: 2026-03-18
> **Reviewer**: Codex

---

## 1. Project Overview

**Purpose**: Transfer the live Webflow Template Marketplace intake flow into a repo-owned implementation while preserving the current business rules for creator onboarding and template submission.

**Target Users**:
- Prospective template creators completing profile setup
- Existing creators submitting a template for Marketplace review
- Marketplace ops/review systems validating eligibility before intake

**Original Location**:
- `https://webflow.com/templates/submit-a-template?section=join-today`
- `https://webflow.com/templates/submit-a-template?section=submit-today`
- Related policy docs:
  - `https://webflow.com/templates/submission-guidelines`
  - `https://webflow.com/templates/grading-rubric`

---

## 2. Technical Assessment

### 2.1 Framework & Stack

| Aspect | Value | Notes |
|--------|-------|-------|
| Framework | Webflow native forms + inline vanilla JS | Both forms live on one Webflow page |
| Language | JavaScript | Inline scripts in embeds plus one external validator script |
| Styling | Webflow classes | No reusable component abstraction exposed in repo |
| State Management | DOM state + hidden checkbox gates | Submission eligibility is encoded in hidden required inputs |
| Bot Protection | Cloudflare Turnstile | `data-turnstile-sitekey` on both forms |
| External APIs | Multiple | See dependency section |

### 2.2 Form Analysis

| Form | Complexity | Notes | Translatable? |
|------|------------|-------|---------------|
| Marketplace Creator Submission | Medium | Country gating, 2 email checks, asset upload constraints, agreement gate | Yes |
| Marketplace Template Submission | High | Creator eligibility check, template name policy, remote published-site GSAP/custom-code crawl, required Webflow Way Validator app pass, preview URL rule, image dimension checks, throttling rules | Yes, with backend work |

### 2.3 Dependencies

```json
{
  "externalServices": {
    "creator_email_uniqueness": "https://check-asset-name.vercel.app/api/checkTemplateemail",
    "template_name_availability": "https://check-asset-name.vercel.app/api/checkTemplatename",
    "template_creator_eligibility": "https://webflow-api.createsomething.io/template/user",
    "published_url_validator_script": "https://webflow-dashboard.pages.dev/webflow-published-url-validator.js?v=20260309-1",
    "published_url_validation_worker": "https://gsap-validation-worker.createsomething.workers.dev/crawlWebsite"
  }
}
```

**Compatibility Issues**:
- The requested `webflow-cloud` workflow is still not directly runnable from the local CLI environment. The installed `webflow` CLI exposes `extension` and `devlink`, but not `cloud`.
- The monorepo now has a Next.js Cloud target at `apps/webflow-dashboard-cloud`, and the creator/template intake flow has been scaffolded there as a public `/submit` route.
- Current live logic still depends on repo-external services and hidden browser-only validation state. The refactor replaces the hidden browser gates with explicit route contracts, but some external validation services remain source-of-truth.

---

## 3. Business Logic Review

### 3.1 End-to-End Flow

1. Creator profile is intended to come first.
2. Template submission is the second step.
3. The page copy says the template form should be used only after creator registration.
4. The template form actually enforces this through a creator email verification call to `https://webflow-api.createsomething.io/template/user`.
5. Publication is not decided by the form alone. The submission guidelines require all requirements to pass and a score of at least `Good` in every rubric area.

### 3.2 Creator Form Rules

**Form ID**: `wf-form-Marketplace-Creator-Submission`

**Fields**
- `Selected-Country`
- `Primary-Email`
- `Webflow-Email`
- `Preferred-Name`
- `Legal-Name`
- `Personal-Website-URL`
- `Creator-Bio`
- `Profile-Image-2`
- `Agree-To-Webflow-Terms`
- hidden UTM fields

**Validation and gating**
- Country options are generated in JS.
- Country support is checked against a hardcoded supported-country list.
- Unsupported countries do not block via a hard validation attribute, but do show a Stripe eligibility warning.
- `Primary-Email` must be verified before submission.
- `Webflow-Email` must be verified before submission.
- Both email checks call `https://check-asset-name.vercel.app/api/checkTemplateemail`.
- Success condition for both creator-side email checks is `emailExists === false`.
  - In other words: the creator form requires email uniqueness.
- Each email gate is represented by a hidden required checkbox:
  - `Creator-Check-Success`
  - `Webflow-Email-Success`
- If the user changes a verified email, focus-out logic surfaces an error and the hidden gate remains invalid.
- Bio is required and capped at 200 characters.
- Profile image must be `.webp`, exactly `256x256`, and max `100kb` in the UI copy.
- Agreement to the creator agreement is required.

### 3.3 Template Form Rules

**Form ID**: `wf-form-Marketplace-Template-Submission`

**Fields**
- `Creator-Name`
- `Creator-Email`
- `Template-Name`
- `Published-URL`
- `Preview-URL`
- `Free-or-Paid`
- category selection
- tag selection
- static/site type selection
- CMS / Ecommerce / Template type flags
- style flags
- feature flags
- `Short-Description`
- `Long-Description`
- `Thumbnail-Image`
- `Thumbnail-Image-Secondary`
- `Gallery-Image-1` through `Gallery-Image-5`
- `Notes`
- checklist / agreement checkboxes
- hidden UTM fields
- multiple hidden JSON fields for grouped selections

**Validation and gating**
- `Creator-Email` must be verified against `https://webflow-api.createsomething.io/template/user`.
- Success condition is `userExists === true` and no error state.
- The API can explicitly block submission for:
  - banned users
  - submission-limit states
  - active-review states
  - any other `hasError` state surfaced by the backend
- This is the actual sequencing gate that makes creator registration come first.
- `Template-Name` validation has both client and server layers:
  - first word must be capitalized
  - emojis are rejected
  - the term `AI` is blocked, with a special-case carveout to allow `Air`
  - a large set of primary tags and category names are forbidden substrings
  - availability is checked by `https://check-asset-name.vercel.app/api/checkTemplatename`
- Template-name validity is stored in hidden required checkbox `Name-Check-Success`.
- `Published-URL` validation is delegated to an external script:
  - normalizes to `https://*.webflow.io`
  - requires HTTPS
  - rejects non-`webflow.io` hosts
  - runs a GSAP/custom-code crawl through `gsap-validation-worker.createsomething.workers.dev`
  - marks hidden checkbox `Published-URL-Check-Success`
  - auto-checks or clears the `Features-GSAP` checkbox based on crawl results
- The GSAP/custom-code crawl is not the full submission validator. The full cloud intake
  flow must also confirm the Webflow Way Validator bridge and latest 100% Validator app
  result before accepting a template submission.
- `Preview-URL` only checks that the URL contains `https://preview.webflow.com/preview/`.
  - This is client feedback only. There is no hidden required gate tied to preview validation.
- Category, type, style, feature, and tag checkboxes are mirrored into hidden JSON inputs.
- Short description shows an over-250-character warning.
- Long description uses Quill and strips image inserts.
- Upload gates:
  - thumbnails must be `.webp`, `750x995`, max `300kb`
  - gallery images must be `.webp`, `1440x900`, max `250kb`
  - image validation toggles hidden required checkbox `validationCheck`
- The template checklist and agreement checkboxes are required.

### 3.4 Operational Rules Exposed in Copy

- Templates are only published if submission guidelines are met and rubric score is `Good` in all areas.
- Published designers may submit concurrently only after `5` published templates.
- Designers with `6` submissions in `30` days must wait before submitting again.
- All other designers are limited to `1 active review` at a time.

These throttling rules are not enforced by static page logic alone. They appear to be enforced by the backend creator-eligibility API used by the template form.

### 3.5 Policy / UX Mismatches

- The guidelines page says Marketplace review is typically `3-5 days`.
- The template-form success state says users should hear back within `15 business days`.
- Country support is warning-based in the UI, not clearly a hard block in the form.
- Preview-link validation is weaker than published-link validation and is only substring-based.
- Creator-form email checks use a third-party Vercel endpoint, while template-form creator checks use a first-party CREATE SOMETHING API. The flow is split across two verification systems.

---

## 4. Translation Criteria

### 4.1 Scoring

| Criterion | Score (1-5) | Notes |
|-----------|-------------|-------|
| React Compatibility | 4 | Straightforward UI translation |
| Component Boundaries | 4 | Natural split into creator step, template step, grouped selectors, upload validators |
| Props Surface | 3 | Internal form state is manageable, but backend contracts must be made explicit |
| State Complexity | 2 | Hidden-gate logic and cross-field validation should be refactored into explicit form state |
| External Dependencies | 2 | Multiple remote validators and crawler workflows |
| Design System Fit | 3 | Can use repo form primitives, but flow wants a dedicated app surface |
| **TOTAL** | **18/30** | Transferable, but not by direct lift-and-shift |

### 4.2 Repo Mapping

| Source Surface | Repo Target | Notes |
|---------------|-------------|-------|
| Live Webflow intake page | `packages/webflow-intake/` | Good place for intake artifact and migration planning |
| Form primitives | `packages/webflow-components/` | Reusable fields exist, but this is not a full app host |
| Eligibility / review backend | New or existing service package | Should not stay in page-embedded scripts |

---

## 5. Refactoring Notes

### Required Changes

- [x] Pick a real app host in the repo. The current target is `apps/webflow-dashboard-cloud`.
- [x] Replace hidden checkbox gates with explicit typed validation state.
- [ ] Consolidate creator verification behind first-party APIs.
- [ ] Define formal contracts for:
  - creator uniqueness
  - creator eligibility
  - template-name availability
  - published-site crawl validation
- [ ] Make creator-first sequencing explicit in route and backend flow, not just copy.
- [x] Add optional Turnstile protection to the public creator/template submission flow.
- [ ] Normalize review-time messaging across form UI and guidelines.

### Recommended Improvements

- [ ] Make country support a hard backend eligibility rule instead of a warning-only UI path.
- [ ] Strengthen preview-link validation beyond substring matching.
- [ ] Persist step-one creator completion and reuse it across sessions.
- [ ] Move tag/category/type/style/feature lists into versioned config instead of page-embedded arrays.
- [ ] Separate upload validation from DOM IDs so the logic is testable.

### IC Collaboration Needed

- [ ] Decide where the transferred app should live: new package, existing product app, or future Cloud package.
- [ ] Decide whether the existing live APIs remain source-of-truth or are being re-homed into this monorepo.

---

## 6. Decision

### Verdict

- [ ] **APPROVE** - Ready for translation
- [x] **REFACTOR** - Needs changes before translation
- [ ] **DEFER** - Park for future consideration
- [ ] **REJECT** - Not suitable for Code Components

### Rationale

The business logic is clear enough to transfer, but the current implementation is tightly coupled to Webflow embeds and several external validation services. The repo now has a Webflow Cloud target and a working first refactor pass in `apps/webflow-dashboard-cloud`, including explicit validation state and optional Turnstile enforcement on the public creator/template submit routes. The local CLI still does not expose `webflow cloud`, so deployment verification remains separate from the code migration itself.

### Next Steps

1. Choose the destination app surface in this monorepo.
2. Re-express both forms as a typed two-step workflow with creator registration as a first-class prerequisite.
3. Replace page-embedded validation with repo-owned services or documented contracts.
4. Port upload and URL validation into testable modules.
5. Only after that, implement the actual UI transfer.

---

## 7. Post-Translation

**Target Package**: `apps/webflow-dashboard-cloud`

**DevLink Library**: Not applicable to the current flow.

**Components Created**:
- [ ] Creator intake step
- [ ] Template submission step
- [ ] Published URL validation module
- [ ] Asset upload validation module

**Shared To Workspace**: [ ] Yes / [x] No

---

**Review Completed**: 2026-03-18
**Signature**: Codex

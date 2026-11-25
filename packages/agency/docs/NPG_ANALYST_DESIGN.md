# NPG analyst identity and interaction contract

The healthcare analyst is a private NPG product workspace. Its React/Astryx frame and Figtree typography remain independent of the Agency marketing pages. CRE-2437 refines the local interface; it does not change access, provider policy, paid-action authority or production deployment.

## Brand provenance

The operator requested more NPG branding and color on November 13, 2026. The public [Nurse Practitioner Group website](https://thenursepractitionergroup.com/) was directly inspected in the browser. Its stethoscope wordmark is blue and orange. The `thenpgroup.com` address failed to load during this review. A black/tan NPG client-service mark elsewhere in this repository differs from this public identity and is not used for this application.

The actual public logo [logo_npd_2.png](https://thenursepractitionergroup.com/images2/logo_npd_2.png), 441×288, is retained byte-identically at `src/lib/npg/astryx/assets/npg-logo.png`. Vite bundles it locally; the private app does not request third-party assets. Render it at its natural aspect ratio, provide the organization name as alternative text, and do not recolor or crop the mark.

Opaque pixel counts from the original logo establish blue `#45a1d6`, orange `#f47821`, and gray `#999999`. These are observed asset values, not a claim of a supplied official brand manual. The public site's button blue was also observed as `#158bcf`.

For usable product controls, `npgTheme.ts` adapts the brand blue to `#126c9b`. White on this blue is 5.76:1; the exact lighter logo blue on white is only 2.87:1 and is not used for ordinary functional text. Secondary text `#4b6171` on white is 6.47:1. Selected navigation ink `#164664` on `#d9ecf8` is 8.26:1. These ratios are computed from declared colors; rendered states still require verification.

Blue marks primary actions and selection. Pale blue identifies navigation and the header. Orange is a restrained brand rule and remains in the original logo; it is not repurposed as success, permission or verification. The inherited high-visibility heading focus outline remains distinct from these semantic colors. Warning/error/success remain distinct semantic roles with text and icons. Neutral reading surfaces retain readable source material and long review conditions.

## Research translation

Mobbin references were inspected as static previews, not animation measurements. No reference screenshots/assets are committed.

- [Otter AI](https://mobbin.com/screens/aa248857-13e4-4106-ad47-da80950aa7e3): recency and clear history orientation; avoid permanent competing sidebars.
- [Zapier](https://mobbin.com/screens/cb65c41e-e7b6-4bd9-af40-cd92d768e90d): distinguish action evidence inside a stable conversation; do not copy styling or authority assumptions.
- [Quo](https://mobbin.com/screens/feceab4f-4207-4d69-9efa-b2922cc3a6ff) and [HubSpot](https://mobbin.com/screens/d5ecef27-352b-42dc-b629-d961d3cf7a70): scannable results with separable detail; preserve NPG source boundaries and avoid importing a full CRM workflow.
- [Midday](https://mobbin.com/screens/7e224fc7-4201-43c0-95c7-0fb27fef9c77): progressive disclosure of technical details.
- [Airwallex approval](https://mobbin.com/flows/9afbce42-5ab9-4c7a-a574-2b6b83cde1fd?tab=screens) and [ClickUp approval](https://mobbin.com/flows/19a9f545-daa2-4792-b300-6c5ecd048c90?tab=screens): stable request context, explicit action and actual returned status. Approval is not proof of downstream completion.

## Motion and continuity requirements

GSAP owns application visual feedback, pane/conversation transitions, disclosures and deliberate programmatic scrolling. Native wheel, touch and keyboard scrolling remain browser-controlled. Focus, disabled state and business actions never wait for animation; animation callbacks never dispatch a provider request. Replace competing library motion locally rather than running two engines over the same property.

Reduced motion must settle immediately into the same meaningful state. Reversal, user-scroll interruption, resize, changed conversation and unmount must cancel stale animation work. Preserve the user's reading position separately for each conversation and evidence view; explicit Latest and Read terms have distinct navigation intent.

Keep literal unknown terms, original source data, count scope, source freshness and complete-export semantics. Evidence summaries cannot infer qualifications, contact permission, candidate identity or a total across unrelated sources. Pending actions retain the exact selected target, provider scope, maximum cost when supplied, expiry, request data and explicit approval/rejection.

## Validation boundary

The review baseline was the released client bundle exercised against local synthetic HTTP responses. The live private destination redirected to sign-in; authenticated production behavior was not inspected in this work. Functional tests, actual browser review, motion interruption and independent review are required before local handoff. Any production promotion remains a separate authorized release.

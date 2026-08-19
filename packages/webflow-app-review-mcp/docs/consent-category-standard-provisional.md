# Consent-Category App Standard (Provisional)

**Status: PROVISIONAL.** This states what app review applies to consent / cookie-banner / CMP apps **today**, pending the category-wide constraints being formalized by Pablo Miranda, Jason Axley, and Adam Lehman. It is a written record of current practice, not ratified policy. Supersede it when the formal constraints land.

- **Effective:** 2026-08-04
- **Review by:** first working week after Webflow Conf
- **Owner while provisional:** app review (Shea Sisco, Pablo Miranda, Micah Johnson); escalation Adam Lehman / Yan Xie
- **Applies to:** apps whose primary function is consent management, cookie banners, tracker blocking, or privacy compliance

## Why this category has its own standard

A consent runtime holds an unusual position on a customer's published site. To enforce blocking it must execute before every other script and typically intercepts DOM insertion at the prototype level. That position is legitimate and expected for the category — and it is exactly why the executable holding it cannot be mutable or backend-controlled. The blast radius of a compromised or silently-changed consent runtime is every script on every site that installed it.

So the category gets a *higher* bar on runtime integrity than the Marketplace average, and a *narrower* tolerance on installation mechanics, for the same underlying reason.

## The standard

### 1. The published-site runtime must be the reviewed artifact

The executable that runs on customer sites must be:

| Requirement | What reviewers check |
|---|---|
| **Reviewable** | The exact artifact served to customers was submitted for review. A source map or equivalent readable source matches the served bytes. |
| **Static and immutable** | Versioned, immutable after review. New builds go to a new release-specific URL, not the same path. |
| **Integrity-pinned** | Root runtime and every secondary asset load with SRI `integrity` + `crossorigin="anonymous"` from a declared HTTPS origin. |
| **Free of dynamic execution** | No `eval`, `new Function`, string timers, Blob/worker execution, runtime `<script>` creation, or fetching executable code after approval. |
| **Lifecycle-complete** | Install, update, migration, and uninstall cleanup are handled and documented; unrelated customer custom code is preserved. |
| **Attested** | Written commitment that any change to the runtime executable is resubmitted before it is served. |

### 2. Configuration is data, never code

Site identifiers, detected region, tracker lists, banner copy, and customer settings are delivered as non-executable data consumed by a static reviewed runtime. Region logic and per-visitor variation must not be written into the executable at serve time — that construction makes an integrity hash impossible, which is the problem rather than a justification for omitting one.

A per-site *data prelude* plus a shared *versioned executable* is the accepted shape. Most submissions already have this boundary internally; it needs to become two artifacts.

### 3. Runtime script creation is not exempted by anything

Creating `<script>` elements at runtime to load helper libraries, debuggers, or feature payloads is not permitted on published sites regardless of install method. Conditional loading, same-origin hosting, build-time SRI, token gating, and attestations do **not** exempt it. Helper libraries bundle into the reviewed runtime; anything else routes through the Custom Code API as a versioned, integrity-pinned hosted script.

### 4. Debuggers and diagnostic payloads

A debugger delivered to published sites must be bundled inside the reviewed artifact or excluded from customer delivery. It must not be remotely loadable on any published domain, including `*.webflow.io`. Client-minted tokens are not access control — if the signing key ships in a public bundle, the gate does not exist.

### 5. Backend surfaces are in scope

Consent apps commonly expose a site-scanning proxy or fetch-through endpoint. Where one exists:

- Authorization must not rest on a client-controllable header (`Referer`, `Origin`) or a client-supplied identifier. Site IDs appear in published page source.
- Require genuine authentication, scope requests to the authenticated user's authorized site, and rate-limit.
- Reject loopback, private, link-local, and internal addresses at initial resolution **and after every redirect**. Hostname blocklists alone do not prevent DNS rebinding.
- Routes represented as removed must actually be removed. A route returning 401 instead of 404 is still deployed.

### 6. Telemetry

Capture defaults to opt-out with named events. Autocapture, session recording, referrer capture, and external dependency loading are disabled unless separately justified. Identification excludes email. Whatever is collected is disclosed in the public privacy policy and Marketplace listing, not only in reviewer notes.

### 7. Listing accuracy

Category-typical claims that fail review: "built natively for Webflow" or any wording implying first-party status or endorsement, and "no embed codes" / "no installation code" where the product currently requires a manual script tag. Listing copy describes the current product.

## The installation question (open)

Custom Code applied through the Data API currently renders **after** native site and page custom code, so an API-installed consent runtime cannot guarantee execution ahead of customer-added scripts. This has been reproduced by app review on a published demo project and is a genuine platform limitation, tracked as a cross-team dependency.

**Current handling:** manual copy-and-paste installation of the runtime tag is allowed as a temporary accommodation while a submission brings its runtime into compliance. This is an allowance for *how the tag is placed* only. It does not relax any runtime requirement above, and it is not a determination that manual installation is acceptable long-term.

If the runtime remains a manually installed tag, integrity is still required: the pasted script carries an `integrity` attribute and loads an immutable, versioned URL.

Whether a narrow top-of-head bootstrap is permanently justified for the minimum consent-enforcement code is a Product/API question, not a review decision. Any such exception would cover only that minimum bootstrap — never runtime script creation, remote loaders, debuggers, helper libraries, or feature payloads.

## Evidence standard

Assess what is **submitted and live in production at the time of review**. Staging implementations, planned releases, and attestations describing future behavior are not resolved until the implementation is live and independently verifiable. Similar patterns in currently listed apps do not establish an exception; those apps are subject to the same requirements through updates and audits.

Where available, use App Review Preflight to produce reproducible runtime evidence rather than adjudicating claims by hand. Preflight output is evidence, never an approval.

## Relationship to partner-app exceptions

Some submissions in this category are covered by the partner-app published-site principles (see `partner-app-exception-rationale.md`). That exception covers **published-site code patterns only**. Everything in sections 4, 5, 6, and 7 above is app-level behavior and remains a fair blocker for a covered app.

## Provenance

| Claim | Source |
|---|---|
| Runtime integrity requirements, config-as-data, script-creation prohibition | Consent Pro review rounds v42–v45 (Zendesk 1154044, 1156170, 1158972, 1162191); Concord Privacy rejection 2026-07-20 (Zendesk 1164719) |
| Load-order limitation reproduced | v44 feedback, 2026-07-08 |
| Listing-accuracy findings | Consent Pro v46 meta update (Zendesk 1163914) |
| Category-wide constraints in progress | #marketplace-app-reviews `C04DDRJ5VGT` ts `1784314978.413679` |
| Partner-app boundary | #wg-app-marketplace `C0B9XS5SZ7X` ts `1785859220.460639` |

Published Marketplace requirements: <https://developers.webflow.com/apps/docs/marketplace-guidelines>. Where this document is stricter or more specific than a published page, treat it as current review practice pending formalization — not as a citable published rule when writing to a submitter.

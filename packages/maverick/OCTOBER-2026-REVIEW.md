# MaverickX preview review — October 13, 2026

This is a qualified preview increment for CRE-2262. Production approval remains with Micah. Launch target: October 23, 2026; no launch time or timezone was supplied.

## Verified baseline

- Source: `e2b0ea8858f0ece163d1e195f000ab2d824f8991`, September 11 video/header refinements.
- Pages preview: `e573c3ba-4713-4fad-8705-f171ad2324bb`, branch `preview`.
- Collaboration editor's recorded baseline: `efe3bf255b79b7d751112c8bf9c931fdddb03bbeeea36f04a8b39ce494864e55`, from the same source. That authenticated immutable artifact is separate from the Pages alias; publishing Pages does not update it.
- The existing collaboration worktree is dirty and was preserved. No Scopefield source was changed.
- Both user-supplied DOCX files were downloaded through Library and fully extracted. All three supplied screenshots were inspected as pixels. They confirm the document context and Vanessa's meeting request; they contain no extra design markup.
- `Meeting Memo — 10.12.2026.docx` governs the settled taxonomy and launch restrictions. `Copy & Content Proposals.docx` expressly labels its alternatives as proposals for October 15. Its October 12 preview audit was checked against the deployed pages.

## Implemented for review

- PetroX covers oil & gas and produced water; PetroX Boost remains within that family. LithX covers mining & metals. The legacy `/water-treatment` route permanently redirects to `/oil-gas#produced-water`.
- Removed unsupported production-uplift, recovery guarantees, safety/environmental and industrial-scale claims from public copy. No lab results or statistics were invented.
- Removed Calvin Heffes's profile, unapproved backer text, and three press links pending claims/naming review. The newsroom still provides company context and the existing media inquiry address.
- Corrected the address to Suite B. Retained existing leadership photos; no new bio, title or person was invented.
- Preserved the unwatermarked video, original media files, initial transparent header, overlays and reduced-motion fallback. Neutral white content sections make the review brighter. No proposed accent palette or typography replacement was selected. The fixed header becomes dark on scroll so it stays legible over light content.
- Retained Contact's existing D1/Resend inquiry flow. Restored the previously approved Matthew Fontenot notification destination from CRE-493 and CRE-783; removed the departed Calvin recipient and stale Matthew address. No HubSpot integration exists in this source. Removed the unconfirmed 24-hour reply promise. No real lead or email was sent during verification.
- Kept the existing external Careers destination, `https://jobs.lever.co/maverickx`, verified reachable. No empty Technology, Careers, investor or resources route was added.
- Public page data no longer serializes unused legacy CMS market/claim fields. Shared KV, D1, R2 and session data were not changed.

## October 13 navigation follow-up

- Implemented the 16:29 UTC instructions, confirmed against the newly supplied screenshot after downloading and inspecting its actual pixels (955,679 bytes, 2048 × 1253).
- Primary navigation: Home; Solutions → Oil & Gas and Water Treatment / Mining & Metals; Technology → How our chemistry works; About → Mission / Meet the Team/Leadership / News; Careers; Contact Us.
- Disclosure buttons expose expanded state, support Enter/Space and Arrow Down, and return focus on Escape. Menus close on route changes, focus departure and outside pointer interaction. Mobile navigation uses the same destinations.
- Technology links to `/#chemistry`, reusing the existing approved overview. About links to `/about#mission` and `/about#leadership`. No new scientific mechanism or efficacy claim was added.
- Removed PetroX, PetroX Boost and LithX naming from homepage market copy/cards only. Solution-page product names and the existing inquiry flow remain intact.
- The optional oil-basin map is deferred until geography, source/license and presentation are verified. No coverage, trial, customer or field-result markers were introduced.
- Preview only. The collaboration editor's provenance guard, 308 export limitation, baseline and queued job remain untouched. No Linear or Slack writes accompany this follow-up.

## Decisions and inputs still needed

| Item | Reviewable alternatives / exact dependency |
| --- | --- |
| Hero | A: “Bio-based chemistry for oil, gas and metals.” B: “Industrial chemistry, re-engineered to be safe.” C: “Get more from every well and every ton of ore.” These are **unapproved**. B needs SDS evidence; C conflicts with the lab-only/no-uplift rule. Existing headline is retained pending choice. |
| Palette | A: white/pale gray, navy, teal (`#FFFFFF`, `#F4F6F8`, `#0F1E33`, `#00A3A1`). B: warm off-white, charcoal, copper/green (`#FAF7F2`, `#22252A`, `#B8682E`, `#4F7A5A`). C: dark hero/footer, white content, green (`#0D1117`, `#FFFFFF`, `#3DDC84`). All are **unapproved October 15 options**; neutral light sections are the common preview treatment. |
| Closing | “Put Biology to Work” versus “See what it does on your problem.” The draft conflicts with itself. Existing heading retained. |
| Technology detail | The October 13 navigation is implemented as approved: Solutions, Technology and About dropdowns. How our chemistry works points to the existing homepage overview. A fuller Engineer → Tune → Produce narrative, platform name and IP wording still require approval; no commercial-scale or patent claim without evidence. |
| Lab proof | Sanjay/Jesse must supply approved metric, baseline, test type, conditions and method. Published proof must be explicitly laboratory-only. |
| Safety | SDS and supporting evidence for each formulation and each safety/environmental claim. None inferred from “bio-based.” |
| Partners | Written Chord permission; YC usage confirmation; exact DOE wording and logo rules. Chevron/Hess remain absent. |
| Leadership | Matthew Rodriguez title; final roster including Eric Herrera/Matthew Fontenot/Philippe Joly; approved short/full bios and consistent headshots. Current known roster retained except Calvin. |
| Product applications | Confirm which of the existing five oilfield applications and mining conditions/formulations are supported. Current copy invites suitability discussions rather than asserting outcomes. |
| News/resources | Cleared coverage from Pierpont's tracker, including legal permission to link field-results stories under the lab-only restriction. Current old links remain withheld. |
| Contact | Confirm shared inbox/owner, final sample/trial fields and reply expectations. Existing approved recipient is restored, not replaced with a guessed shared inbox or HubSpot ID. A new HubSpot connection/grant or real submission needs separate approval. |
| Imagery | Approved location-neutral product/lab/team originals; no current manufacturing building exterior, Pleasanton identifier, customer mark or identifiable customer site without permission. Existing historical supplied media is preserved for this increment. |

## Collaboration editor parity

The normal canvas pipeline uses a frozen container and a reviewed dependency-provenance target pinned to `e2b0ea885…`. Its operator workflow also requires an admitted immutable artifact and an exact baseline compare-and-swap. The new Pages commit must be qualified through that workflow before changing the canvas pointer. Do not make the editor frame the public Pages origin, weaken membership/CSP, overwrite prior artifacts, or change source/dependency guards to conceal version drift.

The Pages preview is the review source for this increment until canvas parity is explicitly verified. Existing editor feedback still refers to the prior baseline. Preserve that history.

## Verification and rollback

Run the package `check` and `build`; then `node --test scripts/contact-routing.test.mjs`, `node scripts/verify-release.mjs ORIGIN`, `node scripts/browser-qa.mjs ORIGIN`, `node scripts/navigation-qa.mjs ORIGIN EVIDENCE_DIRECTORY`, and `node scripts/capture-preview.mjs ORIGIN EVIDENCE_DIRECTORY`.

Contact tests use a synthetic database and mocked email transport, or invalid input rejected before writes. Browser QA opens and closes forms without submitting them. Preview deployment uses the existing Pages project `maverick-x`, branch `preview`, and exact commit. Never use the unqualified production deploy command.

Rollback: redeploy the recorded `e2b0ea885…` source to branch `preview` through the same package workflow. No data migration needs rollback. Worktree disposition: retained at `codex/maverick-oct12-preview` until review.

October 13 follow-up validation: package check/build and the six-width navigation suite pass. Independent review found and verified fixes for same-page anchor dismissal and mobile pointer-driven layout shifts; no findings remain. The existing contact/video regression suite and synthetic routing tests are retained. Chromium desktop/touch emulation was used; Safari and screen readers were not exercised. Ground's advisory duplicate scan remained incomplete and is not counted as passing. The inherited security policy now exactly matches the already-approved file from `efa99af771290c8c7d2fc03bcd72b0f9ecbc8565` / PR #1968; its tests and validation pass. No new exception, dependency change or security-gate bypass was introduced.

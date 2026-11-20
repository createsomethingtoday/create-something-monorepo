# Agency contact onboarding

Tracking: CRE-2366. Tier: Automation. Surface: `/contact`.

The visitor should prepare a useful inquiry without facing an entire intake form at once. Initial approach: choose a service, describe one workflow, add reply details, then review before sending. Keep the existing query routing, attribution, membership prices, scheduling destination and idempotent intake.

## Mobbin research

Query: web onboarding. Destination: code. Inspected inline static previews from three products; these establish hierarchy and states, not motion timing.

| Reference | Why | Adopt or adapt | Avoid | Source |
| --- | --- | --- | --- | --- |
| Twenty, onboarding, screens 6/11/15 | Focused groups and an adjacent validation error | Adapt: one meaningful group per step, local validation and predictable Continue action | Account creation, modal shell, copied composition | https://mobbin.com/flows/c05af68f-a703-4104-8e9a-c92c82cafc9d |
| Air, onboarding, screens 5/8/12 | Related identity fields together, context gathered separately | Adapt: contact details as one step; intent and workflow choices earlier | Signup friction, passwords, product palette and layout | https://mobbin.com/flows/8c0164d5-3370-4300-b87d-b97910b917dd |
| Sana, joining a workspace, screens 1/2 | Invitation acceptance and destination | Reject for this inquiry: invitation and immediate workspace access do not match a reviewed service request | Suggesting a submission creates an account or starts delivery | https://mobbin.com/flows/e544fc0c-bc6b-4e45-b693-74f9541b7d6a |

The existing single-page form is the local alternative: fewer transitions, but it exposes routing, identity, operating lane, context and scheduling together. The guided version keeps back/edit controls and retained values so sequencing does not trap the visitor.

## Canon translation

Use the owned Canon and agent workshop scenes to orient the visitor. Label imagery as conceptual, keep the inputs primary, and retain house tokens. GSAP supplies short incoming-step transitions only. Focus and input remain immediate; reduced motion, failed imports and interruptions must settle to readable content. No external reference images or assets are retained.

## Acceptance criteria

- Four steps, easy native choices, retained answers on Back, field validation before progression, review before explicit submit.
- Preserve five intent values, lane/plan query defaults, membership scope and pricing, attribution, request ID and exact retry body.
- Frozen uncertain requests cannot be edited while retrying; a 400 validation response allows correction under the same ID.
- Canon and agents appear in the flow. No automatic agent work or business outcome is implied.
- Verify 320, 390, 768, 1024, 1025 and 1440 widths, keyboard/focus, reduced motion, no-JS fallback, interruption, errors and completion.
- Test submissions use intercepted local responses. Never create a real inquiry to verify the design.

Production promotion follows the repository review gate. Build and local render evidence do not establish production behavior or conversion lift.


## Validation receipt

- Full Agency `check`: passed. Final focused Svelte check: zero errors and warnings.
- Contact intake tests: 34 passed, including real local workerd/D1 behavior, transport body/ID preservation and 400 correction.
- Membership query/default and public cache tests: 12 passed. Public copy checks: 84 passed.
- `smoke:contact-onboarding`: passed at 320, 390, 768, 1024, 1025 and 1440. Exercises actual local browser behavior with intercepted contact responses; no real inquiry or provider dispatch.
- Browser coverage: retained Back/Edit answers, native validation, Enter advances without sending, review/explicit submit, success, frozen transport retry, exact body/ID reuse, attribution, reduced motion, images, no overflow and no-JS email fallback.
- A new heading-clearance regression failed at 320 before correction (heading top -71.57px, fixed navigation bottom 76.78px). Scrolling the heading with its scroll margin fixed all six widths.
- Parent directly inspected rendered desktop/mobile entry states. Independent Sol reviewer inspected actual review screenshots and exercised all five intents, 400 correction, rapid reversal and live reduced-motion changes. Static reference media does not establish reference animation timing.
- Ground advisory: no analyzable duplicate coverage; unsupported/incomplete exclusions retained. It reported the Svelte component as orphaned despite its explicit route import and successful build. This is an advisory limitation, not passing analysis coverage.

To reproduce browser checks, start Agency on port 4182, then run `pnpm --filter @create-something/agency smoke:contact-onboarding`. Override `AGENCY_BASE_URL` for a different local/preview runtime. Test requests are intercepted; do not remove interception on a public runtime.

Rollback: revert this scoped change through the normal PR path and redeploy the prior Agency artifact. Existing request schema, data storage, consent and provider dispatch remain owned by the existing intake.

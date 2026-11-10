# A2A product surface: design evidence

CRE-2380. Product mode, CREATE SOMETHING Performance Lab. Working name: A2A.

## Decision and acceptance criteria

The landing page answers whether an owner should connect an agent to this handoff pilot. Its spine is one concrete handoff, the distinction between receipt and result, connection steps, and retention boundaries. Four chapters: opening, operating model, setup, and control/retention. The diagram is an original illustrative workflow, explicitly labeled; it is not a claim of observed live execution.

The console supports the first-owner path: sign in, create one inbox, share its exact ID, allow a sender, connect an authenticated MCP client, copy a bounded agent assignment, inspect subscriptions, send and read threaded messages, distinguish processing from event delivery, revoke sender permissions, and pause the inbox. Subscription cancellation and failed-event replay are explicit owner actions. Client connection does not silently configure event delivery.

Acceptance criteria:

- Landing has one primary hero action, concrete nouns, an inspectable four-stage model, invite-only/MCP-first limits, and 30/7/90-day retention information.
- Console distinguishes loading, signed-out, invite-denied, error, empty, populated, paused, subscription, event-delivery, and processing states.
- Mutations use authenticated same-origin JSON requests. No raw access tokens are stored or rendered. Untrusted API text is inserted with `textContent`.
- Both owners control their own sender grants; a message never increases receiver authority. Existing delivered copies cannot be recalled.
- House fonts and actual Canon tokens define visual roles. Controls are restrained, square, keyboard reachable, and at least 44px tall. Reduced motion does not remove content.
- Parent verifies actual built UI at 320, 390, 768, 1024, 1025, and 1440px, keyboard/focus, no-JS landing, hash links, overflow, and real or explicitly identified fixture API states.

## Initial approach, before research

Use a paper/ink handoff ledger in product mode. An owner-controlled gate between two small original mechanical agents explains who can send; a separate branch explains work and result. The console follows the operator's task instead of a dashboard metric grid. Connection setup remains inspectable beside the exact inbox ID and copyable owner instructions. Delivery and processing carry separate semantic labels.

Applied skills: `cs-design`, `canon-design-review`, and `canon-public-surface`, including their house rules, Mobbin research protocol, and public-surface rules. Read the Performance Lab design language, visual grammar, page sharpness contract, Canon tokens, token naming contract, and Agency Canon audit. Canon remains authoritative over the outside references.

## Authenticated Mobbin research

Query: `email inbox empty state`, web, standard, three results. All three returned inline screen images were directly inspected on 2026-11-09. Research was read-only. No media, downloaded reference, or third-party source was retained in the repository. These static screens support hierarchy and state treatment only; no timing or motion claims are derived from them.

| Reference | Why | Adopt / translate | Avoid | Source |
| --- | --- | --- | --- | --- |
| Attio: failed-email empty state | Its empty headline identifies the selected state and says what will appear there. | **Adapt:** explain which record is absent, and avoid implying that a delivery absence proves work success. | Product navigation breadth and ornamental icons. | [Inspected screen](https://mobbin.com/screens/8bf89e82-83a8-4036-91a3-7075f6a7fd88) |
| Plane: pending-invite empty state | The compact state explanation is paired with a clear next action. | **Adapt:** provide a next step from the empty inbox to connection details and sender permissions. | A full-screen empty state that removes surrounding operator context. | [Inspected screen](https://mobbin.com/screens/83044be7-fbae-4f7b-8e62-343b1c095fb7) |
| Quo: cleared inbox and unselected conversation | It distinguishes the list's empty state from the detail pane's selection state. | **Adapt:** preserve list/detail separation and a specific instruction when no thread is selected. Stack the regions on narrow screens. | Confetti illustration, promotional banner, and an empty-success claim when no handoff has ever occurred. | [Inspected screen](https://mobbin.com/screens/6a8601c8-705e-493c-8ed4-a5d2126c35b2) |

Independent alternative: a single centered “Connect now” screen would be visually simpler but would conceal the difference between inbox creation, sender grants, MCP sign-in, and receiver subscription. The selected task surface retains those separate steps. This preserves the product's permission model rather than adopting a reference journey wholesale.

## Implementation boundaries

- Two static HTML entries, vanilla TypeScript, one stylesheet, built by the parent-owned Vite configuration.
- Canon tokens import: `../../canon/src/lib/styles/tokens.css`, relative to `web/styles.css`. The shared `performance.css` was inspected but is not imported because it brings the entire font corpus and a root font URL. The bounded surface imports the existing Agency-owned house font files directly so Vite emits addressed assets.
- No invented metrics, pricing, customer claims, native A2A protocol support, native dot attestation, or universal client support.
- The browser uses explicit refresh. Server-side event notification and receiver processing remain separate backend responsibilities.
- Processing controls are agent-owned through MCP; the console displays processing outcomes. The owner can manage sender access, pause, cancel subscriptions, and request delivery replay.
- The pilot's one-inbox-per-owner policy is reflected in the console navigation.

## Validation evidence and limits

Scoped web TypeScript check passed using the installed TypeScript binary. Vite production build passed. A first build exposed excess inherited font assets; the unused `performance.css` import was removed, retaining shared tokens and direct owned font imports.

Functional gate: static type/build checks passed; actual API interaction remains parent-owned. Perceptual/product gate: **untested by this implementation agent** until the actual rendered output is inspected. Release gate: **untested by this implementation agent**; parent owns exact-artifact review, independent Sol 6.1 retest, deployment, and production verification. No commit, push, deployment, or external account write was performed by this implementation agent.


## CRE-2389 owner participation

Initial approach: preserve the existing Canon list/detail conversation. Add verified owner/Dot bylines, an owner-only composer defaulting to ordinary shared conversation, and an explicit Request work choice. Shared text never silently becomes private, approval, or an agent assignment. Subscription state describes a verified event path, not presence.

Read-only standard Mobbin research returned three distinct web screens. The delegated research agent directly inspected all three inline static images; no media was retained. Adapted conventions:

- [Hilos](https://mobbin.com/screens/2d45f64c-a20d-4eda-bf33-e7760623be7d): readable author names, textual role badges, timestamps. Avoid its additional side-thread pane.
- [Quo](https://mobbin.com/screens/4b63267f-0e28-4c26-8333-0a2eac1c63e7): state audience beside the composer. Avoid private-note controls without a private storage boundary.
- [Meetup](https://mobbin.com/screens/5294c46f-28ec-43bb-bcaa-32a46e8958d6): compact bylines and one focused reply. Avoid social reactions and avatar-dependent identity.

The Conversation / Request work distinction is domain-derived. Human posts say Posted; work retains independent processing/event receipts. Legacy authorship stays unrecorded. No motion quality claims arise from static research. Functional and rendered verification receipts are recorded in CRE-2389.

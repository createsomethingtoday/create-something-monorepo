# GiGi surface policy

The beta ships a macOS desktop app and a compact agent skill. This overlay records how GiGi's local design relates to Canon; it does not add a web, voice, or glasses client. Paperclip's workspace patterns and Griffin's visual treatment are references, not runtime dependencies.

## App

- Keep the current gig, person, place, schedule, task, and money records visible as linked work. Show unknown or partial balances as incomplete.
- Put source consent, import progress, retry, and operator review state beside the action they affect. Never label a connection ready before owner and scope readback.
- Preserve keyboard focus, visible labels, and readable text at the app's minimum window size.
- Keep data and receipts in the local SQLite workspace. The UI may style itself with project-local tokens; any future Canon primitive reuse needs an actual consumer and visual proof.

## Chat

- Use the bundled GiGi skill and bounded MCP reads. Fetch a summary first, then a selected record or relation when needed.
- Name source provenance and distinguish current SQLite facts from cited CTX history. Require a successful tool receipt before claiming an edit.
- A subscribed desktop agent can be reached from the provider's supported phone session; that device path is not yet accepted until the physical cellular test passes.

## Web, voice, and glasses

No GiGi beta client ships for these modalities. A future surface must retain the same ownership, status, and provenance rules, and needs its own device evidence before being marked available. The hosted Composio callback is a static return message, not a GiGi web client.

## Promotion

Keep GiGi workflow copy and layout local. Propose shared Canon primitives only after repeated surface evidence exists. Production distribution also requires Developer ID signing, notarization, live source consent, and device acceptance.

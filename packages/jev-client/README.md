# Jev client (private)

Server-side Choice/Noul provider boundary. No ambient credential discovery, no browser secret support, no autonomous execution. Consumers supply an API key in memory, minimized request and atomic durable budget reservation callback. No retries; maximum 20KB request and 30-second timeout. Responses must match all requested typed questions and preserve served model identity. Failure returns unavailable without provider error details or credential values.

`askJev({apiKey, request, reserve})` requires `reserve({maximumUsd:0.01,requestBytes})` to resolve exactly true before sending. The caller must enforce aggregate spending with durable atomic storage; the callback is not itself a ledger. Reservation assumes current Jev published input rate and these bounded payloads, and must be reviewed if pricing changes. Transport injection is for tests, not production authentication bypass.

`validateResponse(response, questions)` and `validateAnswer(answer, question)` also serve offline/recorded-response adapters. Schema validity and confidence are not correctness guarantees. Caller owns evidence freshness, policy, authority, idempotency and post-action verification.

Supported: Choice and Noul. Score deliberately fails until a caller and full contract are implemented. No public publication planned. Test: `node --test packages/jev-client/test.mjs`.

## Reusable decisions

Import `choose`, `selectCandidate`, or `reviewEvidence` from `@create-something/jev-client/decisions`. All require the same explicit server-side key and reservation callback. Choice results include `accepted`/`fallback`, selected choice, handling reason, raw valid answer, served model and available usage. Defaults require probability >= 0.85 and confidence >= 0.8; these are provisional host policy, not evaluated guarantees. Unknown/no-match is a real outcome. Invalid settings, denied reservations, unavailable service and invalid responses cannot become accepted decisions.

TypeScript declarations are included. The client imports no Node APIs and can run in Workers. `ops/jev-runbooks/review.mjs` provides the separate Node-only durable file ledger; Worker hosts must supply their own atomic shared reservation implementation. Never substitute an always-true reservation callback in production.

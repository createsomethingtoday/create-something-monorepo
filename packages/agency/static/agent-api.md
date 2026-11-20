# CREATE SOMETHING public agent API

This document describes the bounded public interfaces at `https://createsomething.agency`.

## Evaluate Agency for a workflow

Start with `GET /api/agent-inquiry`. It returns current offers, published pricing,
source links, evidence limits, a versioned brief schema and submission instructions.
No login or model call is required. Your agent does the evaluation using your context.

1. Compare your workflow with the published offers and inspect the source pages.
   Explain why an offer may fit, what it excludes and what remains unknown.
   Use `explore` when unsure; selecting an offer is not qualification or a quote.
2. Prepare a brief using the returned schema. Send `{ "offer": "build", "brief": ... }`
   to `POST /api/agent-inquiry`. The response contains a complete `contactDraft`,
   missing context and human-review instructions. It is **prepared, not submitted**.
   Preparation makes no application persistence, analytics, model or external calls.
   Requests still traverse hosting infrastructure; omit secrets, contact details and
   confidential customer records. The `owner` may be a role rather than a name.
3. Review the draft with the visitor. Add their `name` and `email` and show the
   exact final contact payload. Explain that sending saves an inquiry, sends the
   visitor a confirmation email and notifies the Agency team. Obtain explicit
   approval for that payload before sending it to `POST /api/contact`.
4. Send with `Content-Type: application/json` and one random `Idempotency-Key`
   (16–128 letters, digits, underscores or hyphens). Retain the exact body and key
   for reconciliation. If your host cannot send HTTP requests, give the visitor
   the draft and the returned contact-form URL to paste it manually. The URL
   carries only bounded source/intent/lane values; it does not carry the brief.

The request limit is 48,000 bytes. The prepared message must fit the existing
5,000-character contact limit. HTTP 422 means shorten the brief and prepare again;
the endpoint never silently truncates context. HTTP 400 means correct the input;
HTTP 413 means reduce request size; HTTP 415 means use JSON.

### Confirm what happened

- HTTP 200 and `success: true`: inquiry saved and both emails accepted by the
  provider. Inbox delivery and human review remain unconfirmed.
- HTTP 202 and `receipt: "saved"`: inquiry saved; email confirmation incomplete.
  Do not create another inquiry.
- Lost response or HTTP 503: receipt unknown. Reconcile with the same key and exact
  body. HTTP 409 means stop for human reconciliation; never bypass it with a new key.
- HTTP 400: correct the rejected contact payload and review the changed payload
  with the visitor before sending again.

`source: "agent-assisted"` is self-declared channel attribution, not verified agent
identity. Prepared drafts, saved inquiries, provider email acceptance and confirmed
bookings are separate outcomes. No part of this flow books, pays for or authorizes work.

## What agents may do

- Read the current public service manifest at `/api/manifest`.
- Request a workflow map through `POST /api/atlas/public-agent` within the published input and rate limits.
- Check public map availability at `/api/map/health`.
- Read offers and prepare an inquiry at `/api/agent-inquiry`.
- Send the exact visitor-approved inquiry through `/api/contact` as described above.

## Operating boundary

The public API does not create accounts, issue credentials, make purchases, charge wallets, or change a visitor's systems. The contact endpoint saves an inquiry and sends emails only after visitor approval. Approval is enforced by the visitor's agent and host; preparation is not an authorization token. A map is a planning artifact; it is not authorization to execute the workflow it describes.

## Discovery

- API description: `/openapi-agent.yaml`
- API catalog: `/.well-known/api-catalog`
- Authentication instructions: `/auth.md`
- MCP card: `/.well-known/mcp/server-card.json`
- Agent Skills index: `/.well-known/agent-skills/index.json`

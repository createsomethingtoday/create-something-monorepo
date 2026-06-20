# Concierge Chat Product Architecture

> Prepared: March 9, 2026
> Scope: hosted AI-native concierge and operator chat product for progressive profiling, dynamic in-chat tools, Dify-backed agents, and governed MCP-backed execution

## Decision

The concierge experience should be implemented as a **dedicated product package**:

`packages/concierge-chat`

Do not build this as:

- a large `.agency` route subtree
- a pile of hub `ui://` resources pretending to be a full application
- direct provider-branded chat tooling

The system should use three UI planes:

1. `.agency` for account, entitlement, credentials, and admin
2. `packages/concierge-chat` for the hosted end-user and operator conversation product
3. MCP package DUI for in-host workflows and broker guidance

## Operator Clear Shell

The Dify agent frontend should be a first-party operator shell in `packages/concierge-chat`, not a fork of a Dify web client.

The shell should adapt Ona's clear communication style into owned CREATE SOMETHING code: light operational surfaces, compact navigation, crisp borders, restrained color, direct action labels, and proof close to each claim. The product contract remains CREATE SOMETHING: policy, evidence, approvals, and handoff are first-class UI concepts.

Required operator rails:

1. **Context rail**: client, lane, agent, credential state, blockers, and current state.
2. **Chat rail**: Dify-backed assistant turns, inline widgets, and composer state.
3. **Proof and actions rail**: artifacts, tool calls, approvals, handoff packets, eval status, Linear issue IDs, and production evidence.

Required operator states:

1. `Ready`
2. `Needs auth`
3. `Waiting on approval`
4. `Preview blocked`
5. `Eval stale`
6. `Production verified`

Every state should answer three questions in plain language:

1. What is true right now?
2. Who owns the next action?
3. What proof or policy supports that claim?

## Product Role Split

### `.agency`

Owns:

- login and identity linkage
- entitlement checks
- bearer-token and OAuth-password management
- security and billing disclosures
- partner and operator admin

### `packages/concierge-chat`

Owns:

- thread list and active chat session
- turn lifecycle
- progressive profile building
- approved in-chat widgets
- human handoff UX
- user-visible conversation artifacts
- operator state, proof rails, and approval UI
- Dify stream/tool event translation into CREATE SOMETHING language

### `packages/cs-mcp-hub-remote`

Owns:

- governed tool discovery and execution
- route authorization
- tenant and tool-prefix enforcement
- auth-required and reconnect guidance in MCP hosts

## Package Layout

```text
packages/concierge-chat/
  src/routes/
    +layout.svelte
    +page.svelte
    chat/+page.svelte
    chat/[threadId]/+page.svelte
    chat/[threadId]/profile/+page.svelte
    chat/[threadId]/handoff/+page.svelte
    settings/+page.svelte
  src/lib/
    chat/
      thread-store.ts
      message-types.ts
      turn-state.ts
      artifact-model.ts
    widgets/
      registry.ts
      types.ts
      renderer.svelte
      ProfileProgressCard.svelte
      FieldConfirmationCard.svelte
      ConsentCard.svelte
      DocumentUploadCard.svelte
      AppointmentPickerCard.svelte
      HandoffCard.svelte
    server/
      threads/
      profile/
      widgets/
      orchestration/
      handoff/
      attachments/
      policy/
  workers/
    api/
    realtime/
  migrations/
  static/
```

## Route Map

### `/`

- lightweight landing route
- if authenticated and entitled, redirect to latest thread or `/chat`
- if not entitled, redirect to `.agency`

### `/chat`

- thread list
- new concierge session entrypoint
- profile-completion summary
- recent artifacts and pending actions

### `/chat/[threadId]`

- primary conversation surface
- message list
- composer
- widget rail or inline widget renderer
- connection/auth banners
- approval and confirmation prompts

### `/chat/[threadId]/profile`

- profile audit view
- inferred versus confirmed fields
- evidence trail by message or artifact
- edit, confirm, or reject field values

### `/chat/[threadId]/handoff`

- human escalation summary
- current blockers
- profile snapshot at handoff
- open tasks for human operator

### `/settings`

- notification preferences
- connected tools summary
- conversation defaults
- redirect out to `.agency` for credentials and security controls

## Widget System

Use a **bounded widget registry**. The model never generates arbitrary production UI code.

### Widget contract

```ts
type ConciergeWidget =
  | { type: 'profile_progress'; data: ... }
  | { type: 'field_confirmation'; data: ... }
  | { type: 'consent'; data: ... }
  | { type: 'document_upload'; data: ... }
  | { type: 'appointment_picker'; data: ... }
  | { type: 'tool_reconnect'; data: ... }
  | { type: 'handoff'; data: ... };
```

### Rendering rule

1. The server chooses a widget type from the approved registry.
2. The server returns a bounded data payload.
3. The chat app renders the widget using prebuilt components.
4. Any mutation goes back through server actions or MCP tool calls.

### Required v1 widgets

1. `profile_progress`
2. `field_confirmation`
3. `consent`
4. `document_upload`
5. `tool_reconnect`
6. `handoff`

Optional v2 widgets:

1. `appointment_picker`
2. `availability_results`
3. `task_approval`
4. `summary_review`

## Progressive Profiling Model

The conversation should build profile state in the background without forcing a rigid upfront form.

### Field lifecycle

Every profile field must move through one of these states:

1. `candidate`
2. `inferred`
3. `confirmed`
4. `rejected`

### Default thresholds

Use these defaults unless a stricter domain-specific rule overrides them:

1. `< 0.70` → remain `candidate`
2. `0.70 - 0.89` → may become `inferred`, but must be surfaced for confirmation before critical use
3. `>= 0.90` → may prefill UI and guide next-step orchestration, but identity-critical, consent, billing, regulated, or external-write fields still require explicit confirmation

### Required field metadata

Each field event should carry:

- `field_key`
- `value`
- `status`
- `confidence`
- `source_message_ids`
- `source_artifact_ids`
- `updated_at`
- `confirmed_by`

## Data Model

### D1

Create these primary tables:

1. `chat_threads`
2. `chat_messages`
3. `profile_snapshots`
4. `profile_field_events`
5. `widget_events`
6. `handoff_events`
7. `tool_action_events`

### KV

Use KV for:

- active turn state
- ephemeral orchestration context
- retry or reconnect resume state

### R2

Use R2 for:

- uploads
- screenshots
- supporting documents
- generated artifacts too large for message rows

## Server Modules

### `src/lib/server/threads/`

Owns:

- thread creation
- thread retrieval
- message persistence
- summary generation

### `src/lib/server/profile/`

Owns:

- extraction from messages and artifacts
- confidence scoring
- field lifecycle transitions
- snapshot materialization

### `src/lib/server/widgets/`

Owns:

- widget selection
- bounded widget payload construction
- widget audit events

### `src/lib/server/orchestration/`

Owns:

- deciding when to ask conversationally versus when to render a widget
- calling `cs-mcp-hub-remote`
- gating tool actions on confirmed profile state
- handling `REQUIRES_AUTH` and reconnect flows

### `src/lib/server/handoff/`

Owns:

- human escalation triggers
- handoff packet generation
- operator work queue integration

## Chat Turn Flow

1. User sends a natural-language message.
2. The chat service stores the message and current thread context.
3. Profile extraction runs in the background and produces field events.
4. Policy marks fields as `candidate`, `inferred`, `confirmed`, or `rejected`.
5. Orchestration decides the next best step:
   - continue conversationally
   - render a widget
   - call a governed MCP tool
   - request confirmation
   - trigger human handoff
6. The assistant response is stored with any widget payload and tool results.
7. If a tool requires auth, the chat surface renders a reconnect widget or banner instead of failing silently.

## MCP Integration

The chat product should not talk directly to raw providers.

It should call the house hub through a server orchestration layer:

1. `hub_list_services`
2. `hub_search_proxy_tools` scoped with `serverName` whenever the target service is known
3. `hub_describe_proxy_tool`
4. `hub_execute_proxy_tool`

or `hub_route_intent` / `hub_run_intent` when the workflow is allowlisted.

The chat package owns the user experience.
The hub owns the governed execution path.

## Dify Runtime Boundary

Dify should be treated as an agent runtime, not the frontend product.

Browser rules:

1. Do not expose a Dify API key through `NEXT_PUBLIC_*`, `PUBLIC_*`, or any client bundle.
2. Do not call Dify Service API directly from the browser.
3. Only send bounded messages, widgets, operator states, and artifact references to the Svelte client.

Server rules:

1. Resolve Dify app id, API key, and API URL from server-side configuration or secret storage.
2. Call Dify `chat-messages` from the orchestration layer.
3. Persist Dify conversation ids as implementation metadata, not as the operator-facing state model.
4. Map streaming chunks, tool events, errors, and blocked states into `chat_messages`, `tool_action_events`, `widget_events`, and operator states.

Operator rules:

1. Operators see CREATE SOMETHING language, evidence, and approvals.
2. Operators do not need to know whether a turn came from Dify, a hub tool, or a handoff rule unless that distinction affects actionability.
3. Runtime failures should become clear UI states such as `Needs auth`, `Preview blocked`, or `Eval stale`.

## Policy Dependencies

This package should be implemented under:

- `policy.client-hub-user-experience.v1`
- `policy.progressive-profile-governance.v1`
- `policy.hub-route-authorization.v1`
- `policy.tenant-tool-exposure.v1`
- `policy.mcp-credential-delivery.v1`
- `policy.user-bearer-token-governance.v1`

## Rules To Enforce In Product Code

1. Missing critical confirmed fields must trigger a confirmation widget before any external write.
2. The assistant may summarize inferred profile state, but must not present inference as confirmed fact.
3. The renderer must reject widget types that are not in the approved registry.
4. Destructive or high-risk actions require explicit review or confirmation UI.
5. User-visible blocked states must map to canonical reason codes.
6. Human handoff must be possible from any thread.

## Implementation Phases

### Phase 1

- package scaffold
- thread and message persistence
- profile field lifecycle
- `profile_progress`, `field_confirmation`, `tool_reconnect`, and `handoff` widgets
- Ona-style operator shell rails and state model
- Dify server proxy contract
- hub-backed tool orchestration

### Phase 2

- attachment handling
- document upload widget
- profile audit route
- structured handoff packet
- replayable turn traces

### Phase 3

- client-branded shell if needed
- realtime collaboration or operator assist
- analytics and outcome instrumentation
- reusable widget primitive extraction if duplication emerges

## Final Recommendation

Build the concierge as a dedicated product package:

- `.agency` governs access
- `concierge-chat` delivers the end-user conversation product
- `cs-mcp-hub-remote` governs execution

That is the clean monorepo shape for the “talk naturally while the system builds the profile in the background and renders tools inside chat” product.

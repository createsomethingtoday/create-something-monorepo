# MCP DUI Organization Guide

This guide defines where Dynamic UI / Generative UI should live in the CREATE SOMETHING codebase when it is delivered through Model Context Protocol.

## Short answer

Use three distinct UI planes:

1. **Control-plane UX** lives in `.agency`.
2. **Hosted product UX** lives in its own product package.
3. **In-conversation DUI** lives inside the MCP server package that owns the workflow.

Do not collapse these into one surface.

## The three UI planes

### 1. Control-plane UX

This is the authenticated portal experience for humans managing access, credentials, billing, policy acceptance, and long-lived operational state.

In this repo, that belongs in:

- `packages/agency/src/routes/dashboard`
- `packages/agency/src/routes/mcp-access`
- `packages/agency/src/routes/security`
- `packages/agency/src/routes/admin/security/*`
- `packages/agency/clients/*` for approved client-branded shells

Use this plane for:

- entitlement and access state
- token and password management
- host setup snippets
- connection management that may span multiple sessions
- admin and operator controls
- legal, billing, contract, and policy acceptance state

### 2. Hosted product UX

This is the actual product application when the user experience is a hosted chat, concierge, assistant cockpit, or other long-lived workflow surface.

In this repo, that should be implemented as its own package, for example:

- `packages/concierge-chat`
- `packages/clearway`
- `packages/lms`

Use this plane for:

- thread list and active conversation
- dynamic in-chat widgets
- profile progress
- artifacts generated during the workflow
- handoff and follow-through UX

### 3. In-conversation DUI

This is the UI rendered directly inside an MCP-capable host through MCP Apps resources such as `ui://...`.

In this repo, that belongs in the MCP package that owns the tool and resource contract:

- `packages/ground/ui/duplicate-explorer`
- `packages/cs-mcp-hub-remote` for hub-specific overview and auth workflow resources

Use this plane for:

- search, inspect, approve, and reconnect workflows in the conversation
- compact dashboards tied to one MCP tool or workflow
- guided next-step UI that helps the model and user complete a server-owned flow

## Codebase rule

The UI should live next to the runtime that owns the state transition.

That means:

- control-plane UX goes with `.agency`
- hosted product UX goes with its own product package
- conversation UX goes with the MCP server
- shared UI primitives go in shared component or helper packages only after reuse is real

## Recommended organization

### A. Product portal

Keep portal UI in `.agency`:

```text
packages/agency/
  src/routes/dashboard/
  src/routes/mcp-access/
  src/routes/security/
  src/routes/admin/security/
  src/lib/components/access/
  src/lib/server/
  clients/<client>/
```

Use:

- `src/lib/server/` for entitlement, access-state, assignment, and partner-auth composition
- `src/lib/components/access/` for reusable product-facing UI blocks
- `clients/<client>/` only when a client needs a dedicated branded shell

### B. MCP App DUI

Keep DUI inside the MCP package that exposes the `ui://` resource:

```text
packages/<mcp-package>/
  ui/<surface>/index.html
  src/ui_resources.rs
  src/mcp/...
  test/apps-metadata.test.ts
```

Rust examples already follow this shape:

- `packages/ground/ui/duplicate-explorer/index.html`

For TypeScript MCP servers, use the same shape when the UI grows beyond a tiny inline resource:

```text
packages/cs-mcp-hub-remote/
  ui/overview/index.html
  ui/auth-workflow/index.html
  index.ts
  test/apps-metadata.test.ts
```

Current note:

- `packages/cs-mcp-hub-remote/index.ts` still embeds hub UI resources inline.
- That is acceptable for a small number of resources.
- If the hub DUI grows, move those resources into a `ui/` directory to match Ground.

### C. Shared DUI helpers

Do **not** create a shared DUI package by default.

Create one only after multiple MCP packages share the same needs:

- `ui://` resource registration helpers
- postMessage bridge helpers
- schema-driven card, form, and approval components
- common host capability detection

If reuse is proven, create a package such as:

```text
packages/mcp-app-ui/
```

That package should hold helpers and approved primitives, not product-specific flows.

## DUI architecture rule

Keep the three layers separate:

### Database

- state, records, connection metadata, entitlement, routing, and audit rows

### Automation

- tools
- resources
- `ui://` resource registration
- workflow execution

### Judgment

- approval rules
- exposure rules
- route authorization
- what mutations require confirmation or human review

Dynamic UI should never bypass these boundaries.

## Generative UI rule

The model may help choose or populate UI, but it should not directly author arbitrary production UI code in the delivery path.

Preferred pattern:

1. Model selects a known DUI surface or a bounded schema.
2. Server returns data or a UI spec.
3. Approved UI code renders that spec.
4. Mutations route back through server tools and policy checks.

Avoid:

- raw model-generated HTML shipped directly to end users
- iframe content that calls external privileged APIs directly
- UI state that bypasses hub or identity policy

## What belongs where

### Put it in `.agency` when:

- the user is managing account or workspace state
- the flow spans sessions or hosts
- the page needs billing, contract, or entitlement context
- the user is issuing, rotating, or revoking credentials
- the surface must support audit, support, and admin workflows

### Put it in a dedicated product package when:

- the chat experience is itself the product
- the user needs persistent threads, artifacts, and profile state
- the workflow spans multiple turns and sessions
- the app needs its own routes, layout, and product-specific state model
- the UI must work outside MCP-capable hosts

### Put it in the MCP package when:

- the UI exists to assist one MCP workflow inside the conversation
- the surface is coupled to one tool or small tool family
- the UI is meaningful only in an MCP-capable host
- the surface should be discoverable through `_meta.ui.resourceUri`

### Put it in `packages/agency/clients/<client>` when:

- the client needs branded shelling or custom IA
- the client gets a dedicated portal experience
- the underlying entitlement and governance model stays the same as `.agency`

## Required implementation rules

1. Every MCP DUI surface must have a stable `ui://` URI.
2. Relevant tools must declare `_meta.ui.resourceUri`.
3. DUI registration must be covered by tests.
4. All mutating DUI actions must call server tools, not hidden client-side endpoints.
5. DUI must never become the source of truth for auth or routing state.

## Current repo recommendation for the client-hub product

Use this split:

- `.agency` for customer onboarding, access, credentials, connections, and security
- a dedicated product package such as `packages/concierge-chat` for the hosted concierge experience
- `cs-mcp-hub-remote` for in-conversation hub overview, auth guidance, brokered search, approval, and reconnect UI
- client-specific shells under `packages/agency/clients/<client>` only when branding or workflow packaging requires it

That keeps persistent product UX and MCP-native DUI aligned without forcing one surface to do both jobs.

## Source anchors

- `docs/guides/MCP_APPS_INTEGRATION.md`
- `packages/ground/ui/duplicate-explorer/index.html`
- `packages/ground/src/ui_resources.rs`
- `packages/cs-mcp-hub-remote/index.ts`
- `packages/cs-mcp-hub-remote/test/apps-metadata.test.ts`
- `packages/agency/src/routes/dashboard/+page.svelte`
- `packages/agency/src/routes/mcp-access/+page.svelte`
- `packages/agency/src/routes/security/+page.svelte`

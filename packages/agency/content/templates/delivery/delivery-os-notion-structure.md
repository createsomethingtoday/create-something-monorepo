# Delivery OS Notion Structure

Use this when setting up a repeatable client-facing delivery hub in Notion.

## Primary page

Create one published engagement page per client initiative:

- Overview
- Execution snapshot
- Commercials
- Operator handoff
- Product pack

## Shared databases

### Clients
- Client
- Slug
- Industry
- Primary contact
- Status

### Engagements
- Engagement
- Client
- Status
- Target launch
- Delivery owner
- Commercial owner

### Delivery components
- Component
- Engagement
- Kind
- Status
- Live URL
- Repo URL

### Artifacts
- Artifact
- Engagement
- Component
- Type
- Status
- Visibility
- Source URL

### Milestones
- Milestone
- Engagement
- Component
- Status
- Target date

### Integrations
- Integration
- Component
- Provider
- Direction
- Status
- Owner

### Commercials
- Record
- Engagement
- Type
- Status
- Amount
- Source URL

### Operations
- Item
- Engagement
- Component
- Type
- Status
- Owner

## Component pages

Each component should also get a dedicated page.

### Site
- Audience and goal
- Page map
- Forms and destinations
- Domains and analytics
- Ad destinations

### Platform
- User journeys
- Roles and access
- Operator workflows
- Launch criteria
- Support model

### Product
- Capability catalog
- Integrations
- MCP and auth boundaries
- Approval model
- Observability and maintenance

## Source-of-truth rule

Use Notion for authored, client-readable materials.

Use the native delivery database for:

- status
- milestones
- integrations
- invoices and contracts
- access checklist
- MCP inventory
- risks
- deployments

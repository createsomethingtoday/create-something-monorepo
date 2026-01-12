---
title: "Arc"
subtitle: "Efficient connection between points. One-directional sync with minimal transformation.
			The shortest path that works."
category: "Pattern"
published: true
publishedAt: "2025-01-08"
---



## Definition
AnArcis the minimal viable connection between two systems.
				Not bidirectional synchronization. Not complex transformation pipelines.
				Just data flowing efficiently from A to B.

The name comes from geometry: an arc is a portion of a curve—the most direct
				path between two points on a circle. In systems design, an Arc connects two
				services with the least complexity required to achieve the goal.

"The Arc pattern asks: what's the shortest path between these two points
					that actually works in production?"


> "The Arc pattern asks: what's the shortest path between these two points
					that actually works in production?"



## Principles
Data flows one way. Source to destination. No round-trips, no sync conflicts,
					no reconciliation logic. Simplicity through constraint.

Gmail → Notion (not Gmail ↔ Notion)

API → Database (not real-time bidirectional)

Event → Handler (fire and forget)

Transform only what's necessary. Preserve source fidelity. Don't normalize
					data that doesn't need normalizing.

✓ Map fields directly when schemas align

✓ Preserve formatting (links, bold, structure)

✗ Don't build complex ETL when simple mapping works

Arcs should be stateless. No servers to maintain. Run on-demand via
					scheduled triggers or webhooks. Pay only for what you use.

✓ Cloudflare Workers, AWS Lambda

✓ Cron triggers for polling patterns

✓ Webhook endpoints for push patterns

For multi-user systems, OAuth provides proper authorization. Each user
					authenticates with their own credentials. No shared secrets.

✓ User-scoped access tokens

✓ Automatic token refresh

✓ Revocable permissions



## When to Use
- • Data capture from one system to another
- • Automated backups and archiving
- • Event logging and analytics pipelines
- • Notification forwarding
- • Report generation from live data

- • Real-time collaboration features
- • Bidirectional sync requirements
- • Complex data reconciliation
- • Systems requiring strong consistency
- • Interactive user workflows



## Reference Implementation
Multi-user OAuth integration syncing labeled Gmail threads to a Notion database.
					5-minute polling cycle, zero production failures, automatic contact creation.

Gmail API (OAuth) → Cloudflare Worker → Notion API

KV Store for token persistence and sync state

Cron trigger every 5 minutes



## Related Patterns
When the Arc needs memory—understanding accumulates across syncs.

Arcs built on web standards (HTTP, OAuth, JSON) age well.




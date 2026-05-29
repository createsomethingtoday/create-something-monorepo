# Agency Business Health Dashboard

Status: current operating snapshot  
Owner: CREATE SOMETHING  
Updated: 2026-05-17

## Operating Thesis

CREATE SOMETHING should present one public commercial path for the next operating window:

```text
/services -> Book Mapping Session -> scoped Workflow System -> Policy OS when governance is needed
```

Partner pages, vendor proof, templates, and affiliate surfaces support this path. They should not become separate public offers unless they create qualified mapping-session demand or reusable proof for the core engagement.

## Health Read

| Area | Current state | Health | Next proof needed |
| --- | --- | --- | --- |
| Positioning | Strong thesis around MCP creation, Workflow System, and Policy OS | Healthy | Keep `/services` as the primary buyer path |
| Revenue path | Mapping session leads into scoped workflow work and governed execution | Healthy, needs measurement | Track `/services -> /book` source and lane |
| Partner stack | Dify, Cloudflare, Notion, and OpenAI readiness are documented with claim boundaries | Healthy | Submit applications and record outcomes |
| Proof assets | Public pages, generated inventories, trust catalogs, runbooks, and client review artifacts exist | Healthy | Turn strongest proof into one concise case-study packet |
| Codebase operations | Main is clean, strict checks pass, PR checks gate changes, and deploys are working | Healthy | Keep changes scoped and reduce generated-diff noise |
| Risk | Many credible lanes can dilute the offer | Watch | Keep partner motion secondary to mapping-session conversion |

## Primary Conversion Path

The public site should optimize for one buyer behavior: book a mapping session from `/services`.

Measured path:

- Entry page: `/services`
- CTA target: `/book?source=services&intent=workflow-mapping&lane=workflow_infrastructure`
- Default lane: `Workflow System`
- Follow-on expansion: `Policy OS` when the mapped workflow touches revenue, compliance, customer trust, or multiple systems.

Analytics and booking notes should preserve:

- booking source
- booking intent
- selected operating lane
- experiment metadata

## Partner Stack Role

| Lane | Business role | Public role | Operating rule |
| --- | --- | --- | --- |
| Dify | Agent runtime and affiliate/conversion proof | `/dify`, `/dify/mcp-control-plane` | Lead with implementation lane until partner acceptance |
| Cloudflare | Runtime substrate and deployment proof | `/cloudflare` | Lead with PowerUP Consult readiness and delivery infrastructure |
| Notion | Operator workspace and client-readable PM surface | `/notion` | Lead with Solutions Partner / template proof |
| OpenAI | Reasoning and agent-host readiness | `/stack`, `/partners` | No standalone affiliate/partner page until a concrete program path exists |
| Webflow | Public site and marketplace/reviewer proof | Proof surfaces and delivery artifacts | Keep as evidence, not the core offer |

## Operating Dashboard

| Cadence | Check | Command or surface |
| --- | --- | --- |
| Weekly | Public conversion path still points to mapping session | Review `/services` CTAs and `/book` source capture |
| Weekly | Partner application evidence is still public-safe | `pnpm partner:policy:conformance --strict` |
| Weekly | Dify proof is current | `pnpm dify:inventory:check` and `pnpm dify:coverage:check` |
| Weekly | Trust catalog excludes raw/private evidence | `pnpm trust:catalog:check` |
| Per PR | Agency surface compiles cleanly | `pnpm --filter @create-something/agency check` |
| Per deploy | Production page responds and route-specific UI is inspected | `curl -I https://createsomething.agency/services` plus browser check |

## Next Evidence To Collect

1. First three qualified mapping-session inquiries from `/services`.
2. One sanitized case study that shows workflow map, stack boundary, decision states, and shipped artifact.
3. Dify, Cloudflare, and Notion application submission dates and statuses.
4. A repeatable proof packet for the strongest partner lane.
5. A small monthly snapshot: visits, booking starts, bookings completed, partner-led assists, and shipped workflow evidence.

## Boundaries

- Do not claim official partner, certified provider, reseller, affiliate, or technology alliance status before approval.
- Do not publish raw traces, private hub URLs, client-private records, credentials, account IDs, or token-bearing references.
- Do not route one transaction through multiple compensation programs.
- Do not let partner pages replace the core commercial path: one workflow first, governance when needed.

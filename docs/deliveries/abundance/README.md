# The NP Group / NPG — Abundance Delivery Wiki

This directory is the client-delivery knowledge area for The NP Group (NPG).
“Abundance” is the platform/workstream name; NPG is the client owner.

## Current map

| Area | Artifact | Purpose |
| --- | --- | --- |
| Healthcare supply coverage | [2026-09-01 NPG healthcare data health](2026-09-01-npg-healthcare-data-health.md) | Point-in-time coverage and freshness assessment for the Family NP sourcing persona. |
| Public job ingestion | [Public jobs ingestion](public-jobs-ingestion.md) | Provider-independent public demand ingestion contract. |
| Delivery status | [2026-05-14 project update](2026-05-14-project-update.md) | Client-safe platform, MCP, agent, and approval-boundary status. |
| Earlier baseline | [2026-05-06 project update](2026-05-06-project-update.md) | Initial Abundance/NPG delivery state. |

## Ownership boundary

- NPG-specific personas and reports live with the NPG/Abundance delivery.
- Reusable provider normalization, source adapters, and API contracts live in `packages/agency`.
- NPPES records support market coverage analysis only. Recruiter approval, contact validation, current licensure checks, and outreach authority remain separate gates.
- Raw private staff data, credentials, PHI, and token-bearing access do not belong in this directory.

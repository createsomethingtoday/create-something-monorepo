# Agents: Airtable System Architect

## Agent Entry

- Start with `README.md` for the package boundary and activation flow.
- Read `plugin/skills/airtable-system-architect/SKILL.md` before changing behavior.
- Treat `references/policy.airtable-system-architect.v1.*` as the authority for approvals and receipts.
- Verify Airtable's current official MCP capabilities before adding or removing a capability claim.

## Ownership

| Tier       | This package owns                                                      | This package does not own                                                     |
| ---------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Database   | Discovered Airtable IDs, schema snapshots, and before/after evidence   | Airtable records, bases, credentials, or a second copy of Airtable state      |
| Automation | Official Airtable MCP binding and the browser-fallback decision seam   | Airtable API implementation, browser credentials, or background mutation jobs |
| Judgment   | Architecture workflow, approval classes, stop conditions, and receipts | Marketplace review decisions or permission to publish and delete              |

## Validation

- Run `pnpm --filter @create-something/airtable-system-architect verify`.
- Tests must remain offline and must never mutate Airtable.
- Never place a PAT value in source, fixtures, logs, screenshots, or Linear evidence.
- Live validation starts read-only and is a separate checkpoint from package validation.

## Boundaries

- Routine Webflow Marketplace reviews continue through the bounded template/app review MCPs.
- The system-architect plugin is for base, schema, interface, and automation architecture.
- Browser fallback requires an authenticated operator session and explicit approval for the exact UI mutation.
- The PAT grants capability; it does not grant policy authority.

# Dify App Contracts

This directory stores repo-native artifacts for Dify-hosted client agents.

Dify is the hosted client shell. CREATE SOMETHING remains the authority for:

- managed bearer issuance
- Hub routing and execution governance
- policy artifacts and promotion
- release evidence

## Layout

```text
config/dify/
├── README.md
└── apps/
    └── <app-id>/
        ├── app.dify.dsl.yaml
        ├── env.contract.json
        ├── mcp-servers.json
        ├── policy-map.json
        └── publish.md
```

## File roles

`app.dify.dsl.yaml`
- checked-in Dify export
- the prompt and workflow host artifact

`env.contract.json`
- every required app-local variable or secret
- source of truth for provenance and rotation ownership

`mcp-servers.json`
- stable MCP server IDs, URLs, auth expectations, and enabled tools

`policy-map.json`
- explicit link from the Dify app to repo-native policy IDs

`publish.md`
- operator checklist for validation, publish, rollback, and evidence

## Current examples

- `apps/mj-hub/`
  - imported from the local `MJ HUB` Dify export
  - uses the curated MJ remote Hub lane as its MCP provider

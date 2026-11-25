# Dify Template Review HUB archive — 2026-11-11

These files are the exact DSL exports taken from Dify Studio on 2026-11-11,
ahead of deleting the matching apps. They are historical recovery artifacts,
not the active-agent source of truth in `config/dify-agents/` or
`config/dify/inventory.json`.

The scheduled agent feedback runner was the only live caller of the published
app. It was removed in #2246.

| Dify app                                   | Retained DSL                             | SHA-256                                                            |
| ------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------ |
| TEMPLATE REVIEW HUB (published, runner)    | `template-review-hub.dify.yml`           | `e725dda082cb91d233dd3c1e2a7d9ddc95dcc542f33f0a16e99835d240dc74e5` |
| TEMPLATE REVIEW HUB (unused duplicate app) | `template-review-hub-duplicate.dify.yml` | `accca59de96976cbea29d4776b002dce605f52f9ee2f44163fd6e7fc6119f0e8` |

Restore by importing the required `.dify.yml` file into Dify Studio. A restore
does not reactivate external MCP credentials or recreate service API keys;
those must follow the current governed provisioning workflow.

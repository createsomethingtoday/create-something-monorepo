---
description: Design an MCP server using the Three-Tier Framework
argument-hint: "<server name and purpose>"
---

Load the three-tier-framework skill, then design an MCP server for:

**Server**: $@

Map the server's capabilities to all three MCP primitives:

```
## MCP Design: [server]

### Resources (Database tier — application-controlled)
What data should the server expose? The client decides when to inject this into context.
1. ...
2. ...

### Tools (Automation tier — model-controlled)
What actions should the server expose? The LLM decides when to invoke these.
1. ...
2. ...

### Prompts (Judgment tier — user-controlled)
What guidance templates should the server expose? The human selects these.
1. ...
2. ...

### Sampling (Recursive property)
Does any Tool need to request Judgment via MCP sampling?
- ...

### Policy Artifacts
What policy should flow through the tiers as data?
- ...

### Cross-Cutting
- Touchpoints: ...
- Artifacts: ...
- Orchestration: ...
- Insight: ...
```

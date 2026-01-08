---
slug: "template-recategorization"
category: "Experiment"
title: "Template Recategorization"
subtitle: "MCP as Hermeneutic Bridge"
description: "Using Claude Code with Airtable MCP to recategorize miscategorized Webflow templates—demonstrating how AI agents can participate in the hermeneutic circle of data curation."
meta: "December 2025 · Claude Code + Airtable MCP · Tool Complementarity"
publishedAt: "2025-12-15"
published: true
---

```
╔══════════════════════════════════════════════════════════════════╗
║  TEMPLATE RECATEGORIZATION                        ✓ VALIDATED    ║
║  ────────────────────────────────────────────────────────────    ║
║  8 templates │ 5/5 criteria │ 0 rollbacks │ ~45 min total        ║
║                                                                  ║
║  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌─────────┐  ║
║  │  SLACK   │     │  CLAUDE  │     │   MCP    │     │AIRTABLE │  ║
║  │  THREAD  │ ──► │   CODE   │ ──► │  BRIDGE  │ ──► │   DB    │  ║
║  └──────────┘     └──────────┘     └──────────┘     └─────────┘  ║
║                                                                  ║
║    Human           Agent          Protocol         System        ║
║   (intent)     (interpretation)   (access)        (state)        ║
╚══════════════════════════════════════════════════════════════════╝
```

## Hypothesis


AI agents equipped with MCP (Model Context Protocol) tools can participate in
				thehermeneutic circleof data curation—where understanding the whole
				(category taxonomy) and the parts (individual templates) mutually inform each other.


## Context: The Problem


Webflow templates in our CMS were incorrectly categorized under "Public Services"—a
					category intended for government entities (police departments, fire stations,
					municipal utilities, political offices).


Instead, templates for dentists, design agencies, law firms, and digital nomad
					lifestyles had accumulated there. This misalignment degrades user experience:
					someone browsing for government templates finds lifestyle coaches.


## Method: MCP Integration


The Model Context Protocol (MCP) allows Claude Code to interact directly with
					external systems. By configuring the Airtable MCP server, the agent gains:


```
{`// ~/.claude.json
{
  "mcpServers": {
    "airtable": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "airtable-mcp-server"],
      "env": {
        "AIRTABLE_API_KEY": "pat..."
      }
    }
  }
}`}
```


## Grounding: The Hermeneutic Circle


Data curation is inherently hermeneutic. To categorize a template correctly, you must:

1. Understand the category taxonomy— What does "Public Services" mean?
1. Examine the individual template— What does this template represent?
1. Return to the whole— Does this template belong in this category?
1. Refine understanding— Should the category definition change?

> "The part can only be understood from the whole and the whole only from the parts."
> — — Wilhelm Dilthey, on the hermeneutic circle


Traditional database queries break this circle: you either query by category
					(ignoring template content) or by template (ignoring taxonomy structure).
					MCP-enabled agents can traverse both simultaneously through conversation.


## Workflow Demonstration


## Success Criteria


## Tool Complementarity in Practice


This experiment demonstrates the complementarity principle from the CREATE SOMETHING
					philosophy: Claude Code excels at interpretation and creation, while humans provide
					context and verify results.


## Subtractive Triad Application


## Technical Learnings


## Results


The experiment successfully recategorized 8 templates from the "Public Services"
					category. Each template was reassigned to appropriate categories that accurately
					reflect its content and intended audience.


## Limitations


## What This Proves / Doesn't Prove


## Reproducibility

- Claude Code CLI installed
- Airtable account with API access (Personal Access Token)
- airtable-mcp-server npm package
- Knowledge of target category definitions

1. Configure MCP server in~/.claude.json(see Configuration above)
1. Restart Claude Code to load MCP tools
1. Identify miscategorized records via human review or query
1. Query category table to obtain linked record IDs
1. Update records with corrected category IDs
1. Verify changes in Airtable and downstream systems

- MCP server may not load from project-level config—use global config
- Linked record fields require ID lookup, not human-readable names
- Category definitions may be tribal knowledge—document them first


## Conclusion


The hypothesis isvalidated. Claude Code with MCP tools
					can participate meaningfully in the hermeneutic circle of data curation.
					In this experiment, 8 templates were successfully recategorized through
					conversational interaction—demonstrating that AI agents can:

- Query and interpret data (understanding parts: individual templates)
- Apply category definitions (understanding whole: "Public services = government")
- Propose and execute corrections (synthesis: remove miscategorizations)
- Learn from human feedback (iteration: preserve appropriate secondary categories)

> "The bridge is a thing that gathers."
> — — Heidegger, Building Dwelling Thinking


MCP serves as a bridge—gathering human intent, agent capability, and system
					state into a unified workflow. The protocol recedes; the curation emerges.


---
title: Map Database, Automation, Judgment
description: Turn a business workflow into three visible lanes so Codex and operators know what is data, execution, and policy.
duration: 15 min
---

CREATE SOMETHING uses three lanes to make an AI-native workflow legible:

- **Database**: the records, files, APIs, and facts the workflow depends on.
- **Automation**: the MCP tools, scripts, workers, and integrations that execute steps.
- **Judgment**: the approval rules, stop conditions, quality checks, and owners.

Most workflow confusion comes from mixing these lanes together. An operator asks Codex for "a workflow", but the actual problem may be bad data, failed execution, or missing judgment.

<figure class="learning-figure">
  <img src="/learning/canon/three-tier-lanes.svg" alt="Database, Automation, and Judgment lanes with example workflow artifacts." />
  <figcaption>Separate the lane before improving the system.</figcaption>
</figure>

## Use the lanes as a diagnostic

When something fails, debug in this order:

1. **Database**: is the source data correct and available?
2. **Automation**: did the execution path succeed?
3. **Judgment**: was the right policy applied?

The image should make that order obvious. Do not hide the data source, tool call, or policy rule behind a generic "AI workflow" label.

## Operator exercise

Use the Codex app to draft a three-lane map for your first workflow:

```text
Create a Canon-style learning map for this workflow.

Workflow:
Database lane:
Automation lane:
Judgment lane:
Known proof:
Owner:
```

Then inspect the result. If Codex cannot place an item in a lane, the workflow needs more definition before it needs more automation.

## Source note

This exercise pairs the CREATE SOMETHING Database / Automation / Judgment lanes with OpenAI's Codex best-practices guidance: give Codex a clear goal, context, constraints, and done criteria before asking it to build or change a workflow.

Reference: [OpenAI Codex best practices](https://developers.openai.com/codex/learn/best-practices).

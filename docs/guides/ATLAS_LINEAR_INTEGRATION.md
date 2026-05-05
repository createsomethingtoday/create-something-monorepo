# AI Interaction Atlas + Linear Integration

This guide explains how to apply AI Interaction Atlas vocabulary to Linear issues and agent observability.

## Overview

The [AI Interaction Atlas](https://github.com/quietloudlab/ai-interaction-atlas) provides a shared vocabulary for AI interaction design with six core dimensions:

| Dimension | Description | Linear Mapping |
|-----------|-------------|----------------|
| **Touchpoints** | Where interactions happen | `labels: ["mcp:procore-mcp"]` |
| **AI Tasks** | What AI provides | `labels: ["ai:generate"]` |
| **Human Tasks** | What people do | `labels: ["human:review"]` |
| **System Tasks** | What infrastructure handles | `labels: ["system:routing"]` |
| **Data Artifacts** | What flows between tasks | Issue description |
| **Constraints** | What boundaries shape design | `labels: ["constraint:cost"]` |

## Using Atlas Vocabulary With Linear Labels

Apply Atlas dimensions as Linear label prefixes:

```bash
pnpm linear:create -- \
  --title "Draft RFI for submittal" \
  --label "mcp:procore-mcp" \
  --label "ai:generate" \
  --label "human:review" \
  --label "constraint:cost"

pnpm linear:list -- --label "ai:generate"
pnpm linear:list -- --label "human:review"
pnpm linear:list -- --label "mcp:procore-mcp"
```

## Label Conventions

| Prefix | Atlas Dimension | Example Labels |
|--------|-----------------|----------------|
| `mcp:` | Touchpoint | `mcp:procore-mcp`, `mcp:github-mcp` |
| `ai:` | AI Task | `ai:generate`, `ai:classify`, `ai:verify` |
| `human:` | Human Task | `human:review`, `human:approve`, `human:edit` |
| `system:` | System Task | `system:routing`, `system:logging` |
| `artifact:` | Data Artifact | `artifact:rfi`, `artifact:daily-log` |
| `constraint:` | Constraint | `constraint:cost`, `constraint:latency` |

For oversight level, use `human:required`, `human:recommended`, `human:optional`, or `human:none`.

## Mapping to Observability Traces

When issues are executed, Atlas labels can flow into observability traces:

```typescript
import { createTrace } from '@create-something/observability';

const issue = await linear.get('CRE-123');

const trace = createTrace({
  name: `issue:${issue.identifier}`,
  metadata: {
    'touchpoint.mcp_server': issue.labels.find((label) => label.startsWith('mcp:'))?.slice(4),
    'ai_task.type': issue.labels.find((label) => label.startsWith('ai:'))?.slice(3),
    'human_task.oversight_level': issue.labels.find((label) => label.startsWith('human:'))?.slice(6),
  },
});
```

## Atlas Schema Reference

The formal JSON Schema for Atlas metadata is available at:
`@create-something/observability/src/schemas/atlas.json`

## Best Practices

1. Use the same label vocabulary across all issues.
2. Keep labels selective; 3-5 Atlas labels per issue is usually enough.
3. Match label prefixes to trace metadata keys.
4. Promote repeated patterns into Linear templates or repo policy artifacts.

## Related Documentation

- [Observability Setup](./OBSERVABILITY_SETUP.md)
- [Linear Coordination](../LINEAR_COORDINATION.md)
- [Harness Patterns](../../.claude/rules/harness-patterns.md)

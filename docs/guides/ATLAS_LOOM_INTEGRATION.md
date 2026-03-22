# AI Interaction Atlas + Loom Integration

This guide explains how to apply AI Interaction Atlas vocabulary to Loom tasks and agent observability.

## Overview

The [AI Interaction Atlas](https://github.com/quietloudlab/ai-interaction-atlas) provides a shared vocabulary for AI interaction design with six core dimensions:

| Dimension | Description | Loom Mapping |
|-----------|-------------|--------------|
| **Touchpoints** | Where interactions happen | `labels: ["mcp:procore-mcp"]` |
| **AI Tasks** | What AI provides | `labels: ["ai:generate"]` |
| **Human Tasks** | What people do | `labels: ["human:review"]` |
| **System Tasks** | What infrastructure handles | `labels: ["system:routing"]` |
| **Data Artifacts** | What flows between tasks | Task description |
| **Constraints** | What boundaries shape design | `labels: ["constraint:cost"]` |

## Using Atlas Vocabulary with Loom Labels

Since Loom tasks use labels for filtering and routing, apply Atlas dimensions as label prefixes:

```bash
# Create a task with Atlas labels
lm create "Draft RFI for submittal" \
  --labels "mcp:procore-mcp,ai:generate,human:review,constraint:cost"

# Filter by Atlas dimension
lm list --label "ai:generate"      # All generation tasks
lm list --label "human:review"     # Tasks requiring human review
lm list --label "mcp:procore-mcp"  # Tasks using Procore MCP
```

### Label Conventions

| Prefix | Atlas Dimension | Example Labels |
|--------|-----------------|----------------|
| `mcp:` | Touchpoint | `mcp:procore-mcp`, `mcp:github-mcp` |
| `ai:` | AI Task | `ai:generate`, `ai:classify`, `ai:verify` |
| `human:` | Human Task | `human:review`, `human:approve`, `human:edit` |
| `system:` | System Task | `system:routing`, `system:logging` |
| `artifact:` | Data Artifact | `artifact:rfi`, `artifact:daily-log` |
| `constraint:` | Constraint | `constraint:cost`, `constraint:latency` |

### Human Oversight Level

For tasks requiring human oversight, use these label patterns:

```bash
# Required oversight (human must approve)
lm create "Review draft before sending" --labels "human:required"

# Recommended oversight (human review suggested)
lm create "Generate summary" --labels "human:recommended"

# Optional oversight (human can intervene)
lm create "Process daily logs" --labels "human:optional"

# No oversight (fully automated)
lm create "Sync data" --labels "human:none"
```

## Mapping to Observability Traces

When tasks are executed, the Atlas labels flow into observability traces:

```typescript
import { createTrace, mcpToolMetadata } from '@create-something/observability';

// Labels on Loom task map to trace metadata
const task = await loom.get('lm-abc1');

const trace = createTrace({
  name: `task:${task.id}`,
  metadata: {
    // Convert labels to Atlas metadata
    'touchpoint.mcp_server': task.labels.find(l => l.startsWith('mcp:'))?.slice(4),
    'ai_task.type': task.labels.find(l => l.startsWith('ai:'))?.slice(3),
    'human_task.oversight_level': task.labels.find(l => l.startsWith('human:'))?.slice(6),
    // ... etc
  }
});
```

## Atlas Schema Reference

The formal JSON Schema for Atlas metadata is available at:
`@create-something/observability/src/schemas/atlas.json`

### AI Task Types

| Type | Description | Use When |
|------|-------------|----------|
| `generate` | Create new content | Drafting RFIs, creating reports |
| `classify` | Categorize inputs | Sorting submittals by type |
| `verify` | Check correctness | Validating compliance |
| `transform` | Convert formats | Data transformation |
| `summarize` | Condense information | Daily log summaries |
| `extract` | Pull specific data | Parsing documents |
| `compare` | Analyze differences | Version comparison |
| `recommend` | Suggest options | Next action suggestions |
| `predict` | Forecast outcomes | Schedule prediction |
| `explain` | Provide reasoning | Showing work |
| `route` | Direct to handler | Task routing |
| `orchestrate` | Coordinate tasks | Multi-step workflows |

### Human Oversight Levels

| Level | Description | Agent Behavior |
|-------|-------------|----------------|
| `required` | Human must approve | Block until approval |
| `recommended` | Human review suggested | Add confidence threshold gate |
| `optional` | Human can intervene | Quality gate available |
| `none` | Fully automated | No gates needed |

### System Task Types

| Type | Description |
|------|-------------|
| `routing` | Direct to appropriate handler |
| `logging` | Record events |
| `state_management` | Track session state |
| `caching` | Store for reuse |
| `rate_limiting` | Control throughput |
| `authentication` | Verify identity |
| `authorization` | Check permissions |
| `validation` | Input checking |
| `notification` | Alert delivery |
| `scheduling` | Time-based execution |
| `retry` | Failure recovery |

## Future: Native Atlas Fields in Loom

A future Loom version may add a native `atlas_metadata` JSON field to tasks:

```rust
// Proposed Task extension (future)
pub struct Task {
    // ... existing fields ...
    
    /// AI Interaction Atlas metadata (optional)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub atlas_metadata: Option<serde_json::Value>,
}
```

Until then, use the label-based approach documented above.

## Best Practices

1. **Be consistent**: Use the same label vocabulary across all tasks
2. **Don't over-label**: 3-5 Atlas labels per task is usually sufficient
3. **Match to traces**: Ensure label prefixes match trace metadata keys
4. **Document patterns**: Create team conventions for label usage

## Related Documentation

- [../../AGENTS.md](../../AGENTS.md) - Canonical repo workflow and Loom operating model
- [PI Workflow](./PI_WORKFLOW.md) - Pi-first lane workflow
- [Observability Setup](./OBSERVABILITY_SETUP.md) - Full observability stack
- [Loom Patterns](../../.claude/rules/loom-patterns.md) - Legacy Claude-oriented Loom reference
- [Harness Patterns](../../.claude/rules/harness-patterns.md) - Legacy Claude-oriented harness reference

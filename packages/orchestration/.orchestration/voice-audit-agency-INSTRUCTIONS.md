# Voice Audit Convoy: Agency Content

**Convoy**: convoy-erc5g_82fd
**Epic**: voice-audit-agency
**Workers**: 5 (one per section)

## How to Execute (Subagent Pattern)

Each worker runs in an **isolated forked context** using the `/voice-audit-worker` skill.

### Step 1: Invoke Workers (One at a Time)

Run the following command **5 times**, once per worker:

```bash
/voice-audit-worker
```

The skill will:
1. Auto-detect the next unassigned worker directory (worker-1 through worker-5)
2. Read the assignment from `.orchestration/workers/worker-N/assignment.json`
3. Execute the voice audit in isolated context
4. Write results to `.orchestration/workers/worker-N/output/audit-report.md`
5. Update status in `.orchestration/workers/worker-N/status.json`

### Step 2: Monitor Progress

```bash
# Check convoy status
cd packages/orchestration
pnpm exec tsx src/bin/orch.ts convoy show convoy-erc5g_82fd --epic voice-audit-agency

# Check individual worker
cat .orchestration/workers/worker-1/status.json

# Read audit results
cat .orchestration/workers/worker-1/output/audit-report.md
```

### Step 3: Review Results

After all 5 workers complete, aggregate the findings:

```bash
# Generate summary report
pnpm exec tsx src/bin/orch.ts convoy report convoy-erc5g_82fd --epic voice-audit-agency
```

## Worker Assignments

| Worker | Issue | Section | Complexity |
|--------|-------|---------|------------|
| worker-1 | csm-h9zcu | Hero section and CTAs | simple |
| worker-2 | csm-lp3ea | Services (3 descriptions) | simple |
| worker-3 | csm-as2vo | Case studies and metrics | simple |
| worker-4 | csm-14q61 | Methodology section | trivial |
| worker-5 | csm-qvlu9 | Research ecosystem | trivial |

## Expected Outputs

Each worker produces:

1. **Status file**: `.orchestration/workers/worker-N/status.json`
   - Machine-readable completion status
   - Cost tracking
   - Success/failure outcome

2. **Audit report**: `.orchestration/workers/worker-N/output/audit-report.md`
   - Issues found (categorized by severity)
   - Before/after transformations
   - Rationale for each change
   - Implementation estimates

## Why Forked Context?

The `context: fork` directive in the skill frontmatter ensures:

- **Isolation**: Worker can't pollute coordinator context
- **Resumability**: Can restart worker if it fails
- **Tool restrictions**: Worker only gets Read, WebFetch, Write tools
- **Cost tracking**: Worker cost is tracked separately from coordinator

## Architectural Benefits

This pattern follows Claude Code's subagent architecture instead of raw Task tool spawning:

| Aspect | Raw Task (Old) | Subagent Skill (New) |
|--------|---------------|---------------------|
| Context control | Unspecified | Explicit `fork` |
| Tool access | All tools | Restricted per skill |
| Discoverability | Hidden in code | `/voice-audit-worker` visible |
| Documentation | Scattered | Frontmatter + assignment files |
| Resumability | Hard | Skill can be re-invoked |

## Next Steps

1. Run `/voice-audit-worker` 5 times (wait for each to complete)
2. Review audit reports in each worker's output directory
3. Generate aggregate convoy report
4. Implement recommended transformations
5. Close the convoy: `orch convoy complete convoy-erc5g_82fd`

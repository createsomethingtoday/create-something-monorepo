# Voice Audit Convoy - Ready to Execute

✅ **Refactored to use proper Claude Code subagent pattern**

## What's Set Up

### 1. Subagent Skills Created

**Location**: `.claude/skills/`

- ✅ `voice-audit-worker.md` - Specialized voice canon auditor
- ✅ `orchestration-worker.md` - General purpose worker

Both use `context: fork` for isolated execution.

### 2. Worker Assignments Created

**Location**: `packages/orchestration/.orchestration/workers/worker-{1-5}/`

| Worker | Issue | Section | Assignment File |
|--------|-------|---------|-----------------|
| worker-1 | csm-h9zcu | Hero section and CTAs | ✅ assignment.json |
| worker-2 | csm-lp3ea | Services (3 descriptions) | ✅ assignment.json |
| worker-3 | csm-as2vo | Case studies and metrics | ✅ assignment.json |
| worker-4 | csm-14q61 | Methodology section | ✅ assignment.json |
| worker-5 | csm-qvlu9 | Research ecosystem | ✅ assignment.json |

Each assignment includes:
- Worker ID and issue mapping
- Full issue context
- Current text to audit
- Model routing (all Haiku - simple/trivial tasks)

### 3. Convoy Configuration

**Convoy ID**: convoy-erc5g_82fd
**Epic**: voice-audit-agency
**Status**: Active, ready for worker execution
**Total Issues**: 5

## How to Execute

### Step 1: Run the first worker

```bash
/voice-audit-worker
```

The skill will:
1. Find worker-1 (first unassigned worker)
2. Read assignment from `.orchestration/workers/worker-1/assignment.json`
3. Audit hero section against voice canon
4. Write report to `.orchestration/workers/worker-1/output/audit-report.md`
5. Update status to "completed"

### Step 2: Repeat for remaining 4 workers

After worker-1 completes:

```bash
/voice-audit-worker  # Executes worker-2
```

Then:

```bash
/voice-audit-worker  # Executes worker-3
/voice-audit-worker  # Executes worker-4
/voice-audit-worker  # Executes worker-5
```

### Step 3: Review Results

```bash
# Check convoy status
cd packages/orchestration
pnpm exec tsx src/bin/orch.ts convoy show convoy-erc5g_82fd --epic voice-audit-agency

# Read all audit reports
cat .orchestration/workers/worker-*/output/audit-report.md

# Check cost tracking
pnpm exec tsx src/bin/orch.ts cost report --convoy convoy-erc5g_82fd
```

## Architecture Benefits (Why This Is Better)

### Before: Raw Task Tool Spawning ❌
```typescript
Task({
  subagent_type: "general-purpose",
  prompt: "Audit this content..."  // Everything hardcoded in prompt
})
```

Problems:
- No context isolation control
- Can't resume if fails
- No structured assignment pattern
- Hidden from user (not discoverable)

### After: Subagent Skills ✓
```markdown
---
name: voice-audit-worker
context: fork              # Explicit isolation
tools: Read, WebFetch, Write  # Restricted toolset
---
```

Benefits:
- ✅ Explicit context control (`fork` = isolated)
- ✅ Resumable (re-invoke skill if fails)
- ✅ Discoverable (`/voice-audit-worker` in skills list)
- ✅ Structured assignments (JSON files)
- ✅ Tool restrictions (only what's needed)

## File Structure

```
packages/orchestration/
├── .orchestration/
│   ├── workers/
│   │   ├── worker-1/
│   │   │   ├── assignment.json       # ✅ Task definition
│   │   │   ├── status.json          # ⏳ Created on start
│   │   │   └── output/
│   │   │       └── audit-report.md  # ⏳ Created on completion
│   │   ├── worker-2/ ... worker-5/  # ✅ Same structure
│   │   └── ...
│   └── voice-audit-agency-INSTRUCTIONS.md  # ✅ Full documentation
└── .claude/
    └── skills/
        ├── voice-audit-worker.md    # ✅ Skill definition
        └── orchestration-worker.md  # ✅ General worker

✅ = Ready
⏳ = Created during execution
```

## Expected Outputs

After running all 5 workers:

1. **Audit Reports** (5 files):
   - Before/after transformations
   - Severity-categorized issues
   - Implementation estimates
   - PASS/PARTIAL/FAIL assessments

2. **Status Files** (5 files):
   - Machine-readable completion data
   - Cost tracking per worker
   - Success/failure outcomes

3. **Aggregate Data**:
   - Total cost: ~$0.005 (5 × Haiku at ~$0.001 each)
   - Issues found: Count by severity
   - Sections requiring rewrites

## Next Action

**You're ready to execute!** Run:

```bash
/voice-audit-worker
```

This will start worker-1 on the hero section audit. After it completes, run the command again for worker-2, and so on.

The skill will handle all the orchestration—you just invoke it 5 times.

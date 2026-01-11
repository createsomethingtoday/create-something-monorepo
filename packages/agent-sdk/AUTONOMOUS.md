# Autonomous Agent Operations

Phase 1 of the Local-First autonomous operation rollout.

## Quick Start

```bash
# Install scheduled agents (one-time setup)
./scripts/install-agents.sh

# Verify installation
launchctl list | grep createsomething

# View logs
tail -f /tmp/createsomething-*.log
```

## Agents

### 1. Monitor Agent (Hourly)

**Schedule**: Every hour at :00
**Model**: Claude Haiku (~$0.001/check)
**Purpose**: Infrastructure health monitoring

Checks:
- Property health (io, space, agency, ltd respond with 200)
- Build pipeline status
- Beads for stale/critical issues
- Cost metrics

Creates Beads incidents when issues detected.

### 2. Coordinator Agent (Daily)

**Schedule**: Daily at 8:00 AM
**Model**: Claude Sonnet (~$0.01-0.05/session)
**Purpose**: Central orchestration hub

Responsibilities:
- Surface highest-priority work from Beads
- Route to appropriate specialist agents
- Track costs and respect budgets
- Escalate to humans when confidence < 70%

### 3. Content Agent (4x/week)

**Schedule**: Tuesday-Friday at 9:00 AM
**Model**: Claude Sonnet (~$0.02-0.04/post)
**Purpose**: Social content generation

Generates LinkedIn post drafts based on recent work. Creates drafts for human review—does NOT auto-publish.

### 4. Review Agent (Weekly)

**Schedule**: Monday at 10:00 AM
**Model**: Claude Sonnet (~$0.05-0.10/review)
**Purpose**: Subtractive Triad alignment audit

Systematically reviews codebase for:
- **DRY violations**: Duplicate code, repeated patterns
- **Rams violations**: Dead code, over-engineering, elements that don't earn existence
- **Heidegger violations**: Code disconnected from the system, pattern drift

Creates Beads issues for findings with appropriate priority. Tracks coverage to ensure all areas get audited over time.

### 5. Canon Audit Agent (Daily)

**Schedule**: Daily at 9:00 AM
**Model**: Claude Haiku (~$0.006/audit)
**Purpose**: CSS/design Canon compliance

Checks Svelte components for Canon token compliance:
- Colors (hardcoded vs `--color-*` tokens)
- Typography (arbitrary sizes vs `--text-*` tokens)
- Spacing (non-standard vs `--space-*` tokens)
- Motion (hardcoded vs `--duration-*` tokens)
- Borders (arbitrary vs `--color-border-*` tokens)

Creates Beads issues with `canon-violation` label for findings.

### 6. DRY Check Agent (2x/week)

**Schedule**: Tuesday and Friday at 10:00 AM
**Model**: Claude Sonnet (~$0.08/check)
**Purpose**: Cross-file duplication detection

Analyzes high-value paths for:
- **Literal duplication**: 3+ identical lines
- **Structural duplication**: Same logic, different names
- **Type duplication**: Same interface in multiple places
- **Config duplication**: Same settings repeated

Creates Beads issues with `dry-violation` label. Prioritizes by impact:
- P1: 5+ files or 100+ lines
- P2: 2-4 files or 20-100 lines
- P3: Minor duplication

### 7. Resolution Agent (3x/week)

**Schedule**: Monday, Tuesday, Friday at 11:00 AM (after reviews)
**Model**: Claude Sonnet (~$0.30/session)
**Purpose**: Automatically fix review findings

Picks up Beads issues labeled `review-finding`, `canon-violation`, or `dry-violation` and:
1. Assesses complexity (simple/medium/complex)
2. Applies fixes for simple/medium issues
3. Runs quality gates (tests, typecheck, lint)
4. Commits with issue reference
5. Closes resolved issues
6. Escalates complex issues for human review

**Quality gates before commit**:
- Tests pass: `pnpm test --filter=<package>`
- Types pass: `pnpm --filter=<package> exec tsc --noEmit`
- Lint passes: `pnpm --filter=<package> lint`

**Escalation rules** (marks as `needs-review`):
- Fix would change public API
- Fix affects > 5 files
- Uncertain about correct approach
- Tests fail after 3 attempts
- Security-sensitive code

**Specialized variants**:
- `create_quick_fix_agent(issue_id)` — Single-issue fix (Haiku, fast)
- `create_batch_fix_agent(issue_ids)` — Related issues together

## Manual Execution

```bash
# Run monitor check now
launchctl start io.createsomething.monitor

# Or run directly
./scripts/run-monitor.sh
./scripts/run-coordinator.sh
./scripts/run-content.sh
./scripts/run-review.sh [optional_target_path]
./scripts/run-canon-audit.sh [optional_target_path]
./scripts/run-dry-check.sh [paths...]
./scripts/run-resolution.sh [max_fixes] [fix_types]
```

## Cost Estimates

| Agent | Frequency | Cost/Run | Monthly Total |
|-------|-----------|----------|---------------|
| Monitor | 24x/day | $0.001 | ~$0.72 |
| Coordinator | 1x/day | $0.03 | ~$0.90 |
| Canon Audit | 1x/day | $0.006 | ~$0.18 |
| Content | 4x/week | $0.03 | ~$0.48 |
| Review | 1x/week | $0.30 | ~$1.20 |
| DRY Check | 2x/week | $0.08 | ~$0.64 |
| Resolution | 3x/week | $0.30 | ~$3.60 |
| **Total** | — | — | **~$7.72** |

### Review → Resolution Workflow Costs

For a typical week with 12 findings:
- Review (finds 12 issues): ~$0.30
- Resolution (fixes 5 simple, escalates 7): ~$0.30 × 3 sessions = $0.90
- **Weekly total**: ~$1.20 for full review + partial resolution

High-volume weeks (20+ findings):
- May need additional manual resolution runs
- Complex escalations require human review

## Configuration

### Budget Limits

Edit in `agents/coordinator_agent.py`:
- `daily_budget`: Default $10.00
- Warns at 80%, stops at 100%

### Schedules

Edit launchd plists in `launchd/`:
- `StartCalendarInterval` controls timing
- Use `launchctl unload` then `load` to apply changes

## Uninstall

```bash
./scripts/install-agents.sh --uninstall
```

## Phase 1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Local Machine (Your Mac)                  │
├─────────────────────────────────────────────────────────────┤
│  launchd schedules → Shell scripts → Python agents           │
│                                                              │
│  io.createsomething.monitor      (hourly)                   │
│  io.createsomething.coordinator  (daily 8am)                │
│  io.createsomething.canon-audit  (daily 9am)                │
│  io.createsomething.content      (Tue-Fri 9am)              │
│  io.createsomething.review       (Monday 10am)              │
│  io.createsomething.dry-check    (Tue/Fri 10am)             │
│  io.createsomething.resolution   (Mon/Tue/Fri 11am)         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Review → Resolution Flow                  │
│                                                              │
│  Review Agent ─┬─→ Beads Issue (review-finding)             │
│  Canon Audit ──┤                  ↓                         │
│  DRY Check ────┘   Resolution Agent                         │
│                         │                                    │
│                         ├──→ Simple: Fix → Commit → Close   │
│                         └──→ Complex: Escalate (needs-review)│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Beads (Git-backed)                        │
│  Issue tracking, work queue, incident creation               │
│  Labels: review-finding, canon-violation, dry-violation     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge                           │
│  Workers, D1, KV, R2 (checked by monitor)                   │
└─────────────────────────────────────────────────────────────┘
```

## Expected Time Savings

| Activity | Before (Manual) | After (Automated) |
|----------|-----------------|-------------------|
| Health monitoring | 2 hrs/week | 0 (automated) |
| Work prioritization | 3 hrs/week | 30 min review |
| Content drafting | 4 hrs/week | 30 min review |
| Code review (finding) | 2 hrs/week | 0 (automated) |
| Code review (fixing) | 3 hrs/week | 15 min escalation review |
| Canon compliance | 1 hr/week | 0 (automated) |
| **Total** | ~15 hrs/week | ~1.25 hrs/week |

### What You Still Do

- Review escalated issues (complex fixes needing human judgment)
- Approve content drafts before publishing
- Handle P0 incidents that need human intervention
- Weekly scan of resolution commits for quality

## Next Phases

- **Phase 2**: Add GTM and Research agents
- **Phase 3**: Move to hybrid cloud (Modal for background)
- **Phase 4**: Full cloud-native with Cloudflare Queues triggers

See capacity plan: `.claude/plans/cozy-shimmying-newell.md`

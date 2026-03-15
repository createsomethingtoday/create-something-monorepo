# A/B Test: Claude vs Gemini Cost Comparison

**Status**: Ready to execute
**Created**: 2026-01-09
**Purpose**: Empirically validate that Gemini Flash/Pro can handle trivial/simple tasks with ≥85-90% success rate vs Claude Haiku at ~50-90% cost savings

---

## Test Issues Created

### Trivial Tasks (10 total)

#### Gemini Flash Batch (5 issues)
| Issue ID | Task | Acceptance Criteria |
|----------|------|---------------------|
| csm-lqvv5 | Fix ESLint errors in packages/io/src/lib/utils.ts | All errors fixed, file functions correctly |
| csm-s2n0i | Format all TypeScript files in packages/space/src/lib/ with Prettier | All files formatted, only whitespace changes |
| csm-e6uj9 | Fix typo in packages/agency/README.md: 'implmentation' → 'implementation' | Typo fixed, markdown valid |
| csm-akiko | Remove unused imports from packages/components/src/lib/types.ts | tsc passes, all necessary types still exported |
| csm-wl30m | Add missing semicolons to packages/ltd/src/routes/+page.svelte | ESLint passes, page renders correctly |

#### Claude Haiku Batch (5 issues)
| Issue ID | Task | Acceptance Criteria |
|----------|------|---------------------|
| csm-zz44p | Fix indentation in packages/harness-mcp/src/types.ts to 2-space tabs | No mixed tabs/spaces, ESLint passes |
| csm-6enni | Remove console.log statements from packages/space/src/lib/utils/validation.ts | No console.log remains, tests pass |
| csm-ewuqz | Fix trailing commas in packages/agency/src/routes/api/contact/+server.ts | ESLint passes, endpoint works |
| csm-j3nr4 | Rename variable 'data' to 'userData' in packages/io/src/lib/auth.ts | tsc passes, all references updated |
| csm-itvu8 | Sort imports alphabetically in packages/components/src/lib/index.ts | Imports sorted, no imports broken |

### Simple Tasks (10 total)

#### Gemini Pro Batch (5 issues)
| Issue ID | Task | Acceptance Criteria |
|----------|------|---------------------|
| csm-6bw49 | Add email validation helper to packages/components/src/lib/utils/validation.ts | Function exported, handles edge cases, has JSDoc |
| csm-uxzka | Extract color tokens to const in packages/ltd/src/lib/styles/tokens.css | Colors as variables, no hardcoded hex |
| csm-iti5b | Add loading state to packages/space/src/lib/components/Button.svelte | Prop typed, spinner shows, button disables |
| csm-mjffg | Create formatDate utility in packages/io/src/lib/utils/time.ts | Returns correct formats, handles invalid dates |
| csm-y5zml | Add error boundary to packages/agency/src/routes/+layout.svelte | Errors caught, user-friendly message shown |

#### Claude Haiku Batch (5 issues)
| Issue ID | Task | Acceptance Criteria |
|----------|------|---------------------|
| csm-ng2b3 | Add pagination to packages/harness-mcp/src/tools/beads.ts listIssues | Parameters typed, backward compatible |
| csm-ejgl4 | Create slug generator in packages/components/src/lib/utils/string.ts | Handles spaces/special chars, has JSDoc |
| csm-ssckq | Add dark mode toggle to packages/ltd/src/lib/components/Header.svelte | Toggle works, preference persisted |
| csm-7rve5 | Extract API error handling to packages/space/src/hooks.server.ts | Consistent JSON format, includes correlationId |
| csm-7sbdt | Add retry logic to packages/harness-mcp/src/utils.ts execCommand | Retries on failure, backward compatible |

---

## Execution Plan

### Phase 1: Trivial Tasks (Gemini Flash vs Claude Haiku)

**Gemini Flash batch** (5 issues):
```bash
# Execute each with Gemini CLI
gemini -m gemini-2.0-flash-exp "Work on issue csm-lqvv5 using harness MCP tools"
gemini -m gemini-2.0-flash-exp "Work on issue csm-s2n0i using harness MCP tools"
gemini -m gemini-2.0-flash-exp "Work on issue csm-e6uj9 using harness MCP tools"
gemini -m gemini-2.0-flash-exp "Work on issue csm-akiko using harness MCP tools"
gemini -m gemini-2.0-flash-exp "Work on issue csm-wl30m using harness MCP tools"
```

**Claude Haiku batch** (5 issues):
```bash
# Execute with Claude Code (switch to Haiku model)
# Work on issues: csm-zz44p, csm-6enni, csm-ewuqz, csm-j3nr4, csm-itvu8
```

### Phase 2: Simple Tasks (Gemini Pro vs Claude Haiku)

**Gemini Pro batch** (5 issues):
```bash
# Execute each with Gemini CLI
gemini -m gemini-2.0-pro-exp "Work on issue csm-6bw49 using harness MCP tools"
gemini -m gemini-2.0-pro-exp "Work on issue csm-uxzka using harness MCP tools"
gemini -m gemini-2.0-pro-exp "Work on issue csm-iti5b using harness MCP tools"
gemini -m gemini-2.0-pro-exp "Work on issue csm-mjffg using harness MCP tools"
gemini -m gemini-2.0-pro-exp "Work on issue csm-y5zml using harness MCP tools"
```

**Claude Haiku batch** (5 issues):
```bash
# Execute with Claude Code (Haiku model)
# Work on issues: csm-ng2b3, csm-ejgl4, csm-ssckq, csm-7rve5, csm-7sbdt
```

---

## Metrics to Track

For each issue, record:

| Metric | How to Measure |
|--------|----------------|
| **Success** | ✅ or ❌ (acceptance criteria met) |
| **Cost** | API cost from provider dashboard |
| **Time** | Minutes from start to completion |
| **Quality Gate Pass** | Tests/typecheck/lint pass first attempt? |
| **Retries** | Number of attempts needed |
| **Notes** | What went well, what failed |

### Success Criteria

**Gemini Flash** (trivial tasks):
- Success rate ≥90% vs Claude Haiku
- Cost <20% of Claude Haiku
- Quality gate pass rate ≥85%

**Gemini Pro** (simple tasks):
- Success rate ≥85% vs Claude Haiku
- Cost <60% of Claude Haiku
- Quality gate pass rate ≥80%

---

## Results Template

### Trivial Tasks: Gemini Flash vs Claude Haiku

| Issue | Agent | Success | Cost | Time | QG Pass | Notes |
|-------|-------|---------|------|------|---------|-------|
| csm-lqvv5 | Gemini Flash | | | | | |
| csm-s2n0i | Gemini Flash | | | | | |
| csm-e6uj9 | Gemini Flash | | | | | |
| csm-akiko | Gemini Flash | | | | | |
| csm-wl30m | Gemini Flash | | | | | |
| csm-zz44p | Claude Haiku | | | | | |
| csm-6enni | Claude Haiku | | | | | |
| csm-ewuqz | Claude Haiku | | | | | |
| csm-j3nr4 | Claude Haiku | | | | | |
| csm-itvu8 | Claude Haiku | | | | | |

**Gemini Flash Stats**:
- Success rate: __ / 5 = __%
- Avg cost: $__
- Avg time: __ min
- QG pass rate: __ / 5 = __%

**Claude Haiku Stats**:
- Success rate: __ / 5 = __%
- Avg cost: $__
- Avg time: __ min
- QG pass rate: __ / 5 = __%

**Comparison**:
- Cost savings: __% (Flash vs Haiku)
- Success rate delta: __% (Flash - Haiku)
- Time delta: __ min (Flash - Haiku)

---

### Simple Tasks: Gemini Pro vs Claude Haiku

| Issue | Agent | Success | Cost | Time | QG Pass | Notes |
|-------|-------|---------|------|------|---------|-------|
| csm-6bw49 | Gemini Pro | | | | | |
| csm-uxzka | Gemini Pro | | | | | |
| csm-iti5b | Gemini Pro | | | | | |
| csm-mjffg | Gemini Pro | | | | | |
| csm-y5zml | Gemini Pro | | | | | |
| csm-ng2b3 | Claude Haiku | | | | | |
| csm-ejgl4 | Claude Haiku | | | | | |
| csm-ssckq | Claude Haiku | | | | | |
| csm-7rve5 | Claude Haiku | | | | | |
| csm-7sbdt | Claude Haiku | | | | | |

**Gemini Pro Stats**:
- Success rate: __ / 5 = __%
- Avg cost: $__
- Avg time: __ min
- QG pass rate: __ / 5 = __%

**Claude Haiku Stats**:
- Success rate: __ / 5 = __%
- Avg cost: $__
- Avg time: __ min
- QG pass rate: __ / 5 = __%

**Comparison**:
- Cost savings: __% (Pro vs Haiku)
- Success rate delta: __% (Pro - Haiku)
- Time delta: __ min (Pro - Haiku)

---

## Decision Framework

After test completion:

**If Gemini Flash succeeds** (≥90% success, <20% cost):
- ✅ Route all trivial tasks to Gemini Flash
- Document in dual-agent-routing.md
- Update harness to prefer Gemini for complexity:trivial

**If Gemini Flash fails** (<90% success):
- ❌ Stick with Claude Haiku for trivial tasks
- Document failure modes
- Consider if prompts need Gemini-specific tuning

**If Gemini Pro succeeds** (≥85% success, <60% cost):
- ✅ Route simple tasks to Gemini Pro after validation
- A/B test in production before full rollout
- Update routing rules

**If Gemini Pro fails** (<85% success):
- ❌ Stick with Claude Haiku for simple tasks
- Document where Gemini struggles
- Reserve Gemini for trivial only

---

## Next Steps After Test

1. **Document findings** as paper on .io (methodology, results, interpretation)
2. **Update routing rules** in dual-agent-routing.md based on results
3. **Create course module** on cost optimization (teach validated strategy)
4. **Implement smart routing** in harness or Gastown if validated
5. **Monitor production** performance if rolling out Gemini routing

---

## Notes

- All issues labeled with `test:ab-comparison` for easy filtering
- Test issues are P3 (low priority) to avoid interfering with production work
- Execute tests when you have time to monitor and measure carefully
- Track API costs from both Anthropic and Google consoles

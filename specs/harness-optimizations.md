# Harness Optimizations for Claude Code Headless Mode

## Overview

Optimize the CREATE Something Harness to leverage Agent SDK best practices for maximum efficiency in headless mode execution.

**Philosophy**: The harness should be invisible infrastructure. Optimizations reduce latency, improve reliability, and maintain the Heideggerian principle of tools receding into use.

## Features

### Optimization 1: Replace dangerously-skip-permissions with allowedTools
Update `packages/harness/src/session.ts` to use explicit tool allowlists instead of blanket permission skip.
- Replace `--dangerously-skip-permissions` with `--allowedTools "Read,Write,Edit,Bash,Glob,Grep,Task,WebFetch"`
- Add harness-specific tools: `TodoWrite` for progress tracking
- Granular Bash patterns: `Bash(git:*),Bash(pnpm:*),Bash(npm:*)` for safety
- Document the security improvement in harness-patterns.md

### Optimization 2: Use append-system-prompt for context injection
Refactor prompt injection to use `--append-system-prompt` instead of stdin piping.
- Move priming context to `--append-system-prompt` flag
- Keep stdin available for user input simulation if needed
- Remove temp file creation/deletion overhead
- Cleaner separation of context vs task prompt

### Optimization 3: Implement session continuity with resume
Add session reuse for related tasks within the same epic to reduce context overhead.
- Parse `session_id` from JSON output after first task in epic
- Store session_id in HarnessState
- Use `--resume $session_id` for subsequent tasks in same epic
- Fall back to new session if resume fails
- Add `sessionId` field to SessionResult type

### Optimization 4: Add max-turns limit for runaway prevention
Implement turn limits to prevent infinite loops in autonomous execution.
- Add `--max-turns 50` to prevent runaway sessions
- Make configurable via HarnessConfig
- Log warning when max turns approached
- Graceful termination with partial result capture

### Optimization 5: Structured output parsing improvements
Enhance JSON output parsing for better metrics and error handling.
- Parse `cost_usd` from response for cost tracking
- Parse `num_turns` for session efficiency metrics
- Parse `result` field for outcome determination
- Add `totalCost` aggregation to HarnessState
- Surface cost metrics in checkpoint reports

### Optimization 6: Parallel reviewer execution
Optimize peer review pipeline for true parallelism.
- Use Promise.allSettled for parallel reviewer execution
- Add `--model haiku` flag for reviewers (cost optimization)
- Stream reviewer outputs for faster feedback
- Reduce reviewer timeout for faster iteration

### Optimization 7: Add model selection flag
Allow specifying model per session for cost/capability optimization.
- Add `--model` option to session config
- Use Haiku for simple tasks (cost: ~$0.001/session)
- Use Sonnet for standard tasks (cost: ~$0.01/session)
- Reserve Opus for complex architectural tasks
- Infer model from task priority/complexity

### Optimization 8: Implement continue flag for multi-step tasks
Use `--continue` for tasks that span multiple interactions.
- For large file modifications, split into chunks
- First chunk: `claude -p "Start modifying..."`
- Subsequent: `claude -p "Continue..." --continue`
- Track continuation state in session metadata

### Verification
Validate all optimizations work correctly.
- Run harness with optimizations on test spec
- Compare metrics: session duration, cost, success rate
- Verify no regression in task completion quality
- Document performance improvements in harness-patterns.md

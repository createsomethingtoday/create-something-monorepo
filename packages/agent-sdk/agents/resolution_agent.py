"""
Resolution Agent

Autonomously fixes issues found by Review Agent.
Picks up Beads issues labeled 'review-finding', fixes them, creates commits.
"""

from __future__ import annotations

from create_something_agents import AgentConfig, CreateSomethingAgent


SYSTEM_PROMPT = """You are the Resolution Agent for CREATE SOMETHING.

## Core Mission

Autonomously fix issues found by the Review Agent. You pick up Beads issues labeled
'review-finding' and resolve them systematically.

## Resolution Protocol

### 1. Gather Work
```bash
# Get all open review findings, prioritized
bd list --label review-finding --status open --sort priority
```

### 2. For Each Finding

**Assess Complexity:**
- **Simple** (fix directly): Single-file changes, clear pattern, < 50 lines
- **Medium** (fix with care): Multi-file, needs testing, < 200 lines
- **Complex** (plan first): Architectural, > 200 lines, needs human review

**Simple Fixes (Do Immediately):**
```bash
# Read the issue
bd show <id>

# Read the relevant file(s)
# Make the fix
# Run tests
pnpm test --filter=<package>

# Commit with issue reference
git add <files>
git commit -m "fix(<scope>): <description>

Resolves: <issue-id>
Found by: Review Agent
Type: <DRY|Rams|Heidegger>"

# Close the issue
bd close <id> --reason "Fixed in commit $(git rev-parse --short HEAD)"
```

**Medium Fixes:**
1. Read the full context
2. Plan the changes (note in issue)
3. Make changes incrementally
4. Test after each change
5. Commit and close

**Complex Fixes:**
1. Add detailed plan to the issue
2. Label as `needs-review`
3. Move to next finding
4. Human will review the plan

### 3. Quality Gates

Before committing ANY fix:
- [ ] Tests pass: `pnpm test --filter=<package>`
- [ ] Types pass: `pnpm --filter=<package> exec tsc --noEmit`
- [ ] Lint passes: `pnpm --filter=<package> lint`

If gates fail, debug and fix. Don't commit broken code.

### 4. Escalation Rules

**Escalate to human when:**
- Fix would change public API
- Fix affects > 5 files
- Uncertain about correct approach
- Tests fail after 3 attempts
- Security-sensitive code

**Escalation format:**
```bash
bd update <id> --label needs-review --note "
ESCALATION REASON: [reason]

PROPOSED FIX:
[detailed plan]

RISKS:
[potential issues]

RECOMMENDATION:
[suggested approach]
"
```

## Fix Patterns by Type

### DRY Violations

**Pattern**: Extract shared code to utility/component

```typescript
// Before: Duplicated in 3 files
const validate = (email: string) => /^[^@]+@[^@]+$/.test(email);

// After: Extracted to shared utility
// packages/components/src/lib/utils/validation.ts
export const validateEmail = (email: string) => /^[^@]+@[^@]+$/.test(email);

// Usage in original files
import { validateEmail } from '@create-something/components/utils';
```

### Rams Violations (Excess)

**Pattern**: Remove what doesn't earn existence

- Dead code: Delete entirely
- Unused imports: Remove
- Unused exports: Remove or mark deprecated
- Over-engineering: Simplify to actual use case

### Heidegger Violations (Disconnection)

**Pattern**: Reconnect to the system or remove

- Orphaned files: Delete or integrate
- Pattern drift: Align with canonical pattern
- Inconsistent naming: Standardize
- Missing documentation: Add context or delete if unused

## Session Management

**Maximum per session:**
- 5 simple fixes
- 2 medium fixes
- 0 complex fixes (plan only)

**After reaching limit:**
```bash
bd update <remaining-ids> --note "Queued for next resolution session"
```

## Output Format

```
=== Resolution Session: [timestamp] ===

Processed: X issues
Fixed: Y issues
Escalated: Z issues
Remaining: W issues

Fixes Applied:
1. [issue-id]: [description] → commit [sha]
2. [issue-id]: [description] → commit [sha]

Escalated:
1. [issue-id]: [reason]

Next Session: [remaining issues to process]
```

You are the fixer. Review finds problems; you solve them.
"""


def create_resolution_agent(
    max_fixes: int = 5,
    fix_types: list[str] | None = None,
    auto_commit: bool = True,
) -> CreateSomethingAgent:
    """
    Create a resolution agent that fixes review findings.

    Args:
        max_fixes: Maximum fixes per session (default: 5)
        fix_types: Types to fix: "dry", "rams", "heidegger", or None for all
        auto_commit: Whether to auto-commit fixes (default: True)

    Returns:
        Configured CreateSomethingAgent for resolution
    """
    types_filter = ""
    if fix_types:
        types_filter = f"Focus on: {', '.join(fix_types)} violations only."

    task = f"""
Resolve open review findings:

1. Get open issues: bd list --label review-finding --status open
2. Process up to {max_fixes} issues (simple/medium only)
3. For each issue:
   - Read the finding details
   - Assess complexity
   - If simple/medium: fix, test, commit
   - If complex: plan and escalate
4. Run quality gates before each commit
5. Close resolved issues with commit reference
6. Output resolution report

{types_filter}

Auto-commit: {auto_commit}
Max fixes this session: {max_fixes}
"""

    config = AgentConfig(
        task=task,
        model="claude-sonnet-4-20250514",  # Needs reasoning for fixes
        skills=[
            "beads-patterns",
            "sveltekit-conventions",
            "css-canon",
        ],
        max_turns=80,  # More turns for fix iterations
    )

    agent = CreateSomethingAgent(config)
    agent.system_prompt = SYSTEM_PROMPT
    return agent


def create_quick_fix_agent(
    issue_id: str,
) -> CreateSomethingAgent:
    """
    Create an agent to fix a single specific issue.

    Args:
        issue_id: The Beads issue ID to fix

    Returns:
        Configured agent for single-issue resolution
    """
    task = f"""
Fix this specific issue: {issue_id}

1. Read the issue: bd show {issue_id}
2. Understand the finding
3. Make the fix
4. Run tests
5. Commit with reference to {issue_id}
6. Close the issue

If you cannot fix it, explain why and label as needs-review.
"""

    config = AgentConfig(
        task=task,
        model="claude-3-5-haiku-20241022",  # Quick fixes use Haiku
        skills=["beads-patterns"],
        max_turns=30,
    )

    agent = CreateSomethingAgent(config)
    agent.system_prompt = """You are a quick-fix agent.

Fix the single issue assigned to you. Be focused and efficient.

Steps:
1. Read the issue
2. Read the relevant code
3. Make the minimal fix
4. Test
5. Commit
6. Close

Quality gates must pass before commit:
- Tests pass
- Types pass
- Lint passes

If stuck after 3 attempts, escalate with --label needs-review.
"""
    return agent


def create_batch_fix_agent(
    issue_ids: list[str],
    model: str = "claude-sonnet-4-20250514",
) -> CreateSomethingAgent:
    """
    Create an agent to fix a batch of related issues.

    Args:
        issue_ids: List of Beads issue IDs to fix together
        model: Model to use (default: Sonnet)

    Returns:
        Configured agent for batch resolution
    """
    issues_str = ", ".join(issue_ids)

    task = f"""
Fix these related issues as a batch: {issues_str}

These issues are likely related (same type or same area).
Fix them together efficiently:

1. Read all issues first
2. Identify common patterns
3. Plan a unified fix
4. Implement fix
5. Test once for all
6. Single commit referencing all issues
7. Close all issues

This is more efficient than fixing one by one.
"""

    config = AgentConfig(
        task=task,
        model=model,
        skills=["beads-patterns", "sveltekit-conventions"],
        max_turns=60,
    )

    agent = CreateSomethingAgent(config)
    agent.system_prompt = SYSTEM_PROMPT
    return agent

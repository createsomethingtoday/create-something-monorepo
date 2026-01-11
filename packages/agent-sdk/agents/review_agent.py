"""
Subtractive Triad Review Agent

Proactive code review for DRY, Rams, and Heidegger alignment.
Prevents tech debt and drift by systematically auditing the codebase.
"""

from __future__ import annotations

from create_something_agents import AgentConfig, CreateSomethingAgent


SYSTEM_PROMPT = """You are the Subtractive Triad Review Agent for CREATE SOMETHING.

## Core Mission

Proactively review code for alignment with the Subtractive Triad:
- **DRY** (Implementation): Eliminate duplication
- **Rams** (Artifact): Eliminate excess — only what earns existence remains
- **Heidegger** (System): Eliminate disconnection — every part serves the whole

## Review Protocol

For each file/directory you review:

### 1. DRY Analysis (Implementation Level)
Look for:
- Copy-pasted code blocks (3+ similar lines)
- Repeated patterns that could be abstracted
- Duplicate type definitions
- Similar functions that could be unified
- Configuration duplicated across files

**Severity**: P2 for minor duplication, P1 for systemic duplication

### 2. Rams Analysis (Artifact Level)
Look for:
- Dead code (unused functions, variables, imports)
- Over-engineering (abstractions without multiple uses)
- Comments stating the obvious
- Empty catch blocks or TODO comments > 30 days old
- Defensive code for impossible conditions
- Backward compatibility shims no longer needed

**Question**: "Does this element earn its existence?"

**Severity**: P3 for minor excess, P2 for significant bloat

### 3. Heidegger Analysis (System Level)
Look for:
- Code that doesn't follow established patterns
- Inconsistent naming conventions
- Files in wrong directories
- Components not using Canon tokens
- Logic that belongs elsewhere (wrong layer)
- Hardcoded values that should be in config
- Missing integration with Beads/orchestration

**Question**: "Does this serve the whole system?"

**Severity**: P2 for pattern drift, P1 for architectural violations

## Output Format

For each finding, create a Beads issue:

```bash
bd create "[REVIEW] DRY: Description" \\
  --priority P2 \\
  --label review-finding \\
  --label dry-violation \\
  --note "File: path/to/file.ts:42
Found: [description of violation]
Suggested fix: [concrete action]
Impact: [why this matters]"
```

## Review Coverage Tracking

After each review session, update the coverage log:

```bash
# Record what was reviewed
bd create "[REVIEW-LOG] Reviewed packages/space/src/lib" \\
  --priority P4 \\
  --label review-coverage \\
  --note "Date: $(date -I)
Files reviewed: 15
Findings: 3 DRY, 1 Rams, 0 Heidegger
Next suggested: packages/space/src/routes"
```

## Priority Areas

Review in this order (highest drift risk):
1. `packages/*/src/routes/` — Most frequently changed
2. `packages/*/src/lib/components/` — Visual consistency matters
3. `packages/*/workers/` — Infrastructure stability critical
4. `.claude/rules/` — Documentation must match reality
5. `packages/components/` — Shared code affects everything

## What NOT to Flag

- Intentional duplication for clarity (documented)
- Experimental routes (under `/experiments/`)
- Test files (different standards apply)
- Generated files (*.d.ts, build outputs)
- Third-party code in node_modules

## Integration

After creating findings:
1. Group related findings into a single issue when appropriate
2. Link to existing issues if this extends known problems
3. Use `bd dep add <new> related <existing>` for connections

## Example Session

```
Reviewing: packages/io/src/lib/components/

=== DRY Analysis ===
✗ Button.svelte and Card.svelte both define hover transition
  → Created: cs-xxx "[REVIEW] DRY: Duplicate hover transition"

=== Rams Analysis ===
✓ No dead code detected
✗ formatDate() function unused since refactor
  → Created: cs-yyy "[REVIEW] Rams: Unused formatDate function"

=== Heidegger Analysis ===
✗ Card.svelte uses bg-white/10 instead of Canon token
  → Created: cs-zzz "[REVIEW] Heidegger: Card not using Canon tokens"

Coverage logged. Next: packages/io/src/routes/
```

You are the quality guardian. Catch drift before it becomes debt.
"""


def create_review_agent(
    target_path: str | None = None,
    review_type: str = "full",
    create_issues: bool = True,
) -> CreateSomethingAgent:
    """
    Create a Subtractive Triad review agent.

    Args:
        target_path: Specific path to review (None = auto-select based on coverage)
        review_type: Type of review: "full", "dry-only", "rams-only", "heidegger-only"
        create_issues: Whether to create Beads issues for findings

    Returns:
        Configured CreateSomethingAgent for code review
    """
    if target_path:
        task = f"""
Review the following path for Subtractive Triad alignment:
Target: {target_path}
Review Type: {review_type}

Steps:
1. List files in the target directory
2. Read each file and analyze for violations
3. {"Create Beads issues for findings" if create_issues else "Report findings without creating issues"}
4. Log review coverage

Focus on actionable findings. Skip generated files and node_modules.
"""
    else:
        task = f"""
Perform scheduled Subtractive Triad review:

Steps:
1. Check recent review coverage: bd list --label review-coverage --since 14d
2. Identify least-recently-reviewed high-priority area
3. Review that area for {review_type} violations
4. {"Create Beads issues for findings" if create_issues else "Report findings without creating issues"}
5. Log review coverage for future sessions

Priority order:
1. packages/*/src/routes/ (high churn)
2. packages/*/src/lib/components/ (visual consistency)
3. packages/*/workers/ (infrastructure)
4. .claude/rules/ (documentation accuracy)
"""

    config = AgentConfig(
        task=task,
        model="claude-sonnet-4-20250514",  # Needs good reasoning for pattern detection
        skills=[
            "css-canon",           # For Heidegger/Canon token checks
            "sveltekit-conventions",  # For pattern consistency
            "beads-patterns",      # For issue creation
        ],
        max_turns=60,  # Reviews can be thorough
    )

    agent = CreateSomethingAgent(config)
    agent.system_prompt = SYSTEM_PROMPT
    return agent


def create_canon_audit_agent(
    target_path: str,
) -> CreateSomethingAgent:
    """
    Create a specialized Canon compliance audit agent.

    Focuses specifically on CSS Canon violations:
    - Tailwind design utilities where Canon tokens should be used
    - Hardcoded colors/spacing/typography
    - Missing motion tokens
    - Inconsistent design patterns

    Args:
        target_path: Path to audit for Canon compliance

    Returns:
        Configured CreateSomethingAgent for Canon auditing
    """
    task = f"""
Audit for Canon CSS compliance:
Target: {target_path}

Check each .svelte file for:

1. **Color violations**:
   - bg-white, bg-black, bg-gray-* → should use --color-bg-*
   - text-white, text-gray-* → should use --color-fg-*
   - border-white, border-gray-* → should use --color-border-*
   - Any hardcoded hex (#xxx) or rgb() values

2. **Spacing violations**:
   - Non-standard spacing that should use --space-*

3. **Typography violations**:
   - text-xs, text-sm, etc. → should use --text-*
   - Hardcoded font sizes

4. **Motion violations**:
   - Hardcoded transition durations → should use --duration-*
   - Custom easing → should use --ease-standard

5. **Radius violations**:
   - rounded-* → should use --radius-*

For each violation:
```bash
bd create "[CANON] Description" \\
  --priority P2 \\
  --label canon-violation \\
  --note "File: path:line
Found: [violation]
Replace with: [Canon token]"
```

Skip:
- Files in /experiments/ (relaxed rules during dev)
- Files already flagged in recent issues
"""

    config = AgentConfig(
        task=task,
        model="claude-3-5-haiku-20241022",  # Pattern matching, doesn't need heavy reasoning
        skills=["css-canon"],
        max_turns=40,
    )

    agent = CreateSomethingAgent(config)
    agent.system_prompt = """You are the Canon Audit Agent.

Your sole focus: CSS Canon compliance.

Principle: "Tailwind for structure, Canon for aesthetics."

Allowed Tailwind: flex, grid, items-*, justify-*, p-*, m-*, w-*, h-*, gap-*
Flagged Tailwind: bg-*, text-* (colors), rounded-*, shadow-*, opacity-*

Be thorough but not pedantic. Flag clear violations, not edge cases."""
    return agent


def create_dry_analysis_agent(
    target_paths: list[str],
) -> CreateSomethingAgent:
    """
    Create a specialized DRY violation detection agent.

    Analyzes multiple files for duplication patterns.

    Args:
        target_paths: List of paths to analyze for duplication

    Returns:
        Configured CreateSomethingAgent for DRY analysis
    """
    paths_str = "\n".join(f"- {p}" for p in target_paths)

    task = f"""
Analyze for DRY violations across:
{paths_str}

Detection patterns:

1. **Literal duplication**: Identical or near-identical code blocks (3+ lines)
2. **Structural duplication**: Same logic with different variable names
3. **Type duplication**: Same interface/type defined in multiple places
4. **Config duplication**: Same configuration in multiple files
5. **Pattern duplication**: Same approach repeated without abstraction

For each finding:
- Identify all locations of the duplication
- Estimate impact (how many files/lines affected)
- Suggest consolidation approach
- Create Beads issue with all locations listed

Prioritization:
- P1: Duplication in 5+ files or 100+ total lines
- P2: Duplication in 2-4 files or 20-100 lines
- P3: Minor duplication (note but don't block)
"""

    config = AgentConfig(
        task=task,
        model="claude-sonnet-4-20250514",
        skills=["beads-patterns"],
        max_turns=50,
    )

    agent = CreateSomethingAgent(config)
    agent.system_prompt = """You are the DRY Analysis Agent.

"Don't Repeat Yourself" — but thoughtfully.

Good DRY: Shared utility functions, common components, single source of truth
Bad DRY: Premature abstraction, forced consolidation of different concepts

The test: Would changing one instance require changing the others?
If yes → consolidate. If no → duplication might be intentional."""
    return agent

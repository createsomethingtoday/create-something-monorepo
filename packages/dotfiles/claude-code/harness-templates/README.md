# Harness Spec Templates

> Compatibility note: Pi plus Loom is the canonical repo workflow. These templates remain for legacy Claude Code plus Beads sessions only.

Templates for legacy multi-session autonomous work using the CREATE SOMETHING harness methodology.

## Philosophy

> Historical harness principle: "The harness must be invisible. The user describes work; Claude handles execution."

These templates help structure work that spans multiple Claude Code sessions when you intentionally use the older Claude plus Beads compatibility path. Current repo work should start from `AGENTS.md`, `docs/guides/PI_WORKFLOW.md`, and Loom-tracked tasks.

## Available Templates

| Template | Use Case | Complexity |
|----------|----------|------------|
| `feature.md` | New feature implementation | Medium |
| `migration.md` | Codebase or database migration | High |
| `refactor.md` | Large-scale refactoring | High |
| `audit.md` | Codebase audit and fixes | Medium |
| `research.md` | Research and implementation | Variable |

## Usage

1. Copy the relevant template to your project
2. Fill in the sections with your specific requirements
3. Use it only in an explicit Claude Code compatibility session
4. Claude coordinates the work through Beads issues in that legacy path
5. For current repo work, use Loom progress instead of these templates

## Template Structure

Each template includes:
- **Goal**: What success looks like
- **Scope**: Files and systems affected
- **Constraints**: What NOT to do
- **Acceptance Criteria**: How to verify completion
- **Dependencies**: External requirements

## Harness Behavior

When Claude detects a harness-worthy task in the compatibility flow:
1. Creates Beads issues for each subtask
2. Establishes dependency graph
3. Works through issues one at a time
4. Commits after each completion
5. Checkpoints when confidence drops

## Key Constraints

- **One feature per session**: Prevents scope creep
- **Beads is the only progress system in this compatibility path**: No separate files
- **Two-stage completion**: `code-complete` → `verified` labels
- **E2E before verified**: Unit tests aren't enough

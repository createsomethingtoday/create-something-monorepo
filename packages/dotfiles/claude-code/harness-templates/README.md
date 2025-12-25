# Harness Spec Templates

Templates for multi-session autonomous work using the CREATE SOMETHING harness methodology.

## Philosophy

> "The harness must be invisible. The user describes work; Claude handles execution."

These templates help structure work that spans multiple Claude Code sessions. The harness coordinates via Beads issues, not separate progress files.

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
3. Tell Claude Code: "Work on this spec: [path-to-spec]"
4. Claude automatically creates Beads issues and works through them
5. Check progress anytime: `bd progress`

## Template Structure

Each template includes:
- **Goal**: What success looks like
- **Scope**: Files and systems affected
- **Constraints**: What NOT to do
- **Acceptance Criteria**: How to verify completion
- **Dependencies**: External requirements

## Harness Behavior

When Claude detects a harness-worthy task:
1. Creates Beads issues for each subtask
2. Establishes dependency graph
3. Works through issues one at a time
4. Commits after each completion
5. Checkpoints when confidence drops

## Key Constraints

- **One feature per session**: Prevents scope creep
- **Beads is the only progress system**: No separate files
- **Two-stage completion**: `code-complete` → `verified` labels
- **E2E before verified**: Unit tests aren't enough

# Zed Agent Instructions - CREATE SOMETHING

## Tools Available

Use CLI or MCP - both work:

| Need | CLI (terminal) | MCP (context server) |
|------|----------------|----------------------|
| Task coordination | `lm ready`, `lm work "title"` | `loom_*` tools |
| Code verification | `ground analyze`, `ground find-duplicates` | `ground_*` tools |
| Issue tracking | `bd ready`, `bd create` | — |

## Ground - Code Verification

**Always use Ground before claiming code is dead, duplicated, or orphaned.**

| Task | CLI Command | MCP Tool |
|------|-------------|----------|
| Find duplicates | `ground find-duplicates --directory src/` | `ground_find_duplicate_functions` |
| Check if symbol used | `ground count-uses --symbol MyFunc` | `ground_count_uses` |
| Find dead exports | `ground find-dead-exports --module src/lib.ts` | `ground_find_dead_exports` |
| Find orphaned modules | `ground find-orphans --directory src/` | `ground_find_orphans` |
| Full analysis | `ground analyze --directory src/` | `ground_analyze` |
| Compare files | `ground compare file1.ts file2.ts` | `ground_compare` |

**Before claiming dead code**: Run `ground_count_uses` first
**Before claiming orphan**: Run `ground_check_connections` first
**Before claiming duplicate**: Run `ground_compare` first

## Loom - Task Coordination

| Task | CLI Command | MCP Tool |
|------|-------------|----------|
| Start work | `lm work "description"` | `loom_work` |
| See ready tasks | `lm ready` | `loom_ready` |
| Complete task | `lm complete <id> --evidence "..."` | `loom_complete` |
| Create checkpoint | `lm checkpoint "progress"` | `loom_checkpoint` |
| Discuss preferences | — | `loom_discuss` |
| Verify plan | — | `loom_verify_plan` |

## Before Making Changes

1. **Verify symbols exist** before importing: `pnpm exports <package> <symbol>`
2. **Check duplicates** before creating: `ground find-duplicates --directory src/`
3. **Run quality gates** after changes: `pnpm check && pnpm lint && pnpm test`

## Workflow

1. Track work with Loom: `lm work "description"` to start
2. Make changes in small, verifiable steps
3. Run tests after each change
4. Complete work: `lm complete <task-id> --evidence "commit hash"`
5. Push to remote: `git push`

## Project Structure

- `packages/` - Monorepo packages (agency, io, components, etc.)
- `.loom/` - Loom coordination data
- `.ground/` - Ground verification data
- `.beads/` - Beads issue tracking

## Quality Standards

- TypeScript strict mode
- Prettier formatting
- ESLint with project rules
- Vitest for testing

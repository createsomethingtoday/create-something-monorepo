# @create-something/harness

Autonomous agent harness with Beads-based human oversight.

## Philosophy

The harness runs autonomously. Humans engage through **progress reports**—reactive steering rather than proactive management.

> "The harness recedes into transparent operation. When working, you don't think about the harness—you review progress and redirect when needed."

## Installation

```bash
pnpm add @create-something/harness
```

Or use directly from the monorepo:

```bash
cd packages/harness
pnpm build
pnpm start -- start specs/my-project.md
```

## Quick Start

```bash
# 1. Write a spec (markdown PRD)
vim specs/my-project.md

# 2. Start the harness
harness start specs/my-project.md

# 3. Check progress when ready
bd progress

# 4. Redirect if needed
bd update cs-xyz --priority P0

# 5. Resume if paused
harness resume
```

## Commands

```bash
harness start <spec-file>   # Start from markdown PRD
harness pause               # Pause after current session
harness resume              # Resume from last checkpoint
harness status              # Show current state
```

### Options

```bash
--checkpoint-every N   # Create checkpoint every N sessions (default: 3)
--max-hours M          # Create checkpoint every M hours (default: 4)
--dry-run              # Preview without executing
```

## Spec Format

Write a markdown PRD. The harness parses it into Beads issues:

```markdown
# My Project

## Overview
Build a user dashboard with authentication.

## Features

### Authentication
- Login with email/password
- Magic link option
- Session management

### Dashboard
- Overview stats
- Recent activity feed
```

## How It Works

1. **Initialize**: Parse spec → create Beads issues → create git branch
2. **Loop**: Select highest-priority issue → prime context → run Claude Code → update status
3. **Checkpoint**: After N sessions, create progress report (Beads issue)
4. **Redirect**: Watch for human changes (priority updates, new urgent issues)
5. **Complete**: All issues done, or human paused for review

## Redirecting

The harness watches Beads for changes. Use standard `bd` commands:

```bash
bd update <id> --priority P0      # Make urgent
bd create "Fix X" --priority P0   # Inject urgent work
bd close <id>                     # Stop work on issue
```

## Architecture

```
Harness Runner
    ↓
Session 1 → Session 2 → Session 3 → ...
    ↓           ↓           ↓
Checkpoint  Checkpoint  Checkpoint
    ↓           ↓           ↓
         BEADS (Human Interface)
         - bd progress
         - bd update (redirect)
         - bd create (inject)
```

## Checkpoints

Progress reports are Beads issues with:
- Summary of completed/failed/in-progress work
- Confidence score
- Git commit hash
- Redirect notes

View with `bd progress` or `bd show <checkpoint-id>`.

## License

MIT

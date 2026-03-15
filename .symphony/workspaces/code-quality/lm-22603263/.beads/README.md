# Beads - AI-Native Issue Tracking

Welcome to Beads! This repository uses **Beads** for issue tracking - a modern, AI-native tool designed to live directly in your codebase alongside your code.

## What is Beads?

Beads is issue tracking that lives in your repo, making it perfect for AI coding agents and developers who want their issues close to their code. No web UI required - everything works through the CLI and integrates seamlessly with git.

**Learn more:** [github.com/steveyegge/beads](https://github.com/steveyegge/beads)

## Quick Start

### Essential Commands

```bash
# Create new issues
bd create "Add user authentication"

# View all issues
bd list

# View issue details
bd show <issue-id>

# Update issue status
bd update <issue-id> --status in_progress
bd update <issue-id> --status done

# Sync with git remote
bd sync
```

### Working with Issues

Issues in Beads are:
- **Git-native**: Stored in `.beads/issues.jsonl` and synced like code
- **AI-friendly**: CLI-first design works perfectly with AI coding agents
- **Branch-aware**: Issues can follow your branch workflow
- **Always in sync**: Auto-syncs with your commits

## Why Beads?

✨ **AI-Native Design**
- Built specifically for AI-assisted development workflows
- CLI-first interface works seamlessly with AI coding agents
- No context switching to web UIs

🚀 **Developer Focused**
- Issues live in your repo, right next to your code
- Works offline, syncs when you push
- Fast, lightweight, and stays out of your way

🔧 **Git Integration**
- Automatic sync with git commits
- Branch-aware issue tracking
- Intelligent JSONL merge resolution

## Get Started with Beads

Try Beads in your own projects:

```bash
# Install Beads
curl -sSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash

# Initialize in your repo
bd init

# Create your first issue
bd create "Try out Beads"
```

## Formulas (bd cook)

Formulas are TOML-defined workflows for repeatable processes. They live in `.beads/formulas/` and can be executed with `bd cook`.

### Using Formulas

```bash
# List available formulas
bd formula list

# View formula details
bd formula show mol-polecat-basic

# Execute a formula (cook it)
bd cook mol-polecat-basic --var issue_id=csm-abc123

# Create a trackable instance (molecule)
bd mol pour mol-polecat-chrome --var issue_id=csm-xyz789

# Track molecule progress
bd mol list
bd mol current
bd mol status <mol-id>
```

### Available Formulas

| Formula | Description | Model |
|---------|-------------|-------|
| `mol-polecat-basic` | Basic workflow for simple tasks | Haiku (~$0.001) |
| `mol-polecat-shiny` | Standard workflow for typical work | Sonnet (~$0.01) |
| `mol-polecat-chrome` | Premium workflow for complex tasks | Opus (~$0.10) |

### Creating Formulas

Create a `.toml` file in `.beads/formulas/`:

```toml
name = "my-workflow"
description = "Description of the workflow"
quality = "shiny"  # basic, shiny, or chrome
model = "sonnet"

[[variables]]
name = "issue_id"
description = "The issue ID to work on"
required = true

[[steps]]
id = "step-1"
title = "First step"
description = "What to do in this step"

[[steps]]
id = "step-2"
title = "Second step"
description = "What to do next"
needs = ["step-1"]  # Depends on step-1

[success_criteria]
criteria = [
  "Criterion 1",
  "Criterion 2"
]
```

### Molecule Workflow

Molecules track formula execution progress:

```bash
# Pour a molecule (start tracking)
bd mol pour release --var version=1.2.0

# Check current molecule
bd mol current

# Complete a step and continue
bd close <step-issue-id> --continue

# Squash completed molecule to digest
bd mol squash
```

## Learn More

- **Documentation**: [github.com/steveyegge/beads/docs](https://github.com/steveyegge/beads/tree/main/docs)
- **Quick Start Guide**: Run `bd quickstart`
- **Examples**: [github.com/steveyegge/beads/examples](https://github.com/steveyegge/beads/tree/main/examples)

---

*Beads: Issue tracking that moves at the speed of thought* ⚡

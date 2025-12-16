---
title: Install Claude Code CLI
description: Your AI development partner, installed in WezTerm.
duration: 15 min
praxis: claude-code-first-session
---

# Install Claude Code CLI

Claude Code is your development partner. Not a tool that does work for you—a collaborator that reasons alongside you.

## The Partnership Model

Before installation, understand what you're getting:

**Claude Code excels at:**
- Writing new code and features
- Refactoring existing code
- Understanding unfamiliar codebases
- Creating and debugging tests
- Multi-file coordinated changes

**You excel at:**
- Creative direction and judgment
- Domain expertise
- Quality standards
- Deciding what to build

This complementarity is the point. Neither works as well alone.

## Installation

Open WezTerm and run:

```bash
npm install -g @anthropic-ai/claude-code
```

Or if you prefer npx (no global install):

```bash
npx @anthropic-ai/claude-code
```

## Authentication

Claude Code needs an Anthropic API key. Get one at [console.anthropic.com](https://console.anthropic.com/).

Then authenticate:

```bash
claude auth
```

Follow the prompts to enter your API key. It will be stored securely in your system keychain.

## First Session

Navigate to any project directory and start Claude Code:

```bash
cd ~/your-project
claude
```

Claude Code will:
1. Scan the directory structure
2. Read configuration files (package.json, etc.)
3. Build an understanding of your codebase

Try a simple prompt:

```
What is this project?
```

Claude Code will analyze the codebase and explain what it finds.

## Essential Commands

Inside a Claude Code session:

| Command | Purpose |
|---------|---------|
| `/help` | Show all commands |
| `/clear` | Clear conversation history |
| `/status` | Show current context |
| `/compact` | Summarize and reduce context |

These are your escape hatches and orientation tools.

## The Calibration Process

Trust is earned. Start with low-risk tasks:

1. **Read operations**: "Explain how authentication works in this codebase"
2. **Small changes**: "Add a console.log to debug this function"
3. **Larger changes**: "Refactor this module to use the new pattern"

Watch how Claude Code works. Verify its outputs. Over time, you'll know when to trust fully and when to verify carefully.

## Philosophy Note

Claude Code embodies Gelassenheit—"releasement." Neither rejection of AI nor submission to it. Full engagement without capture.

The craftsman uses the hammer; the hammer does not use him.

## Next Step

With Claude Code installed, you're ready to configure WezTerm. And here's where it gets interesting: you'll use Claude Code to do the configuration.

Meta-learning begins.

---

*Complete the praxis exercise to cement your first Claude Code session.*

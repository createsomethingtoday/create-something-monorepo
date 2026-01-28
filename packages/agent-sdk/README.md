# CREATE SOMETHING Agent SDK

Reliable Claude agents built on Anthropic's official Python SDK. The tool recedes; the work remains.

## Philosophy

This SDK implements the **Plan → Execute → Review** pattern:
- **Python SDK** for agent execution (battle-tested, ~95% reliability)
- **Cloudflare** for edge routing and persistence (D1, KV, R2)
- **Beads** for cross-session work tracking

## Installation

```bash
# Using uv (recommended)
uv pip install -e ".[all]"

# Using pip
pip install -e ".[all]"

# Provider-specific installations
pip install -e ".[gemini]"    # Google Gemini support
pip install -e ".[moonshot]"  # Moonshot Kimi K2 support
```

## Environment Variables

Configure API keys for the providers you want to use:

```bash
# Required: Anthropic Claude (primary provider)
export ANTHROPIC_API_KEY="sk-ant-..."

# Optional: Google Gemini (cost-effective for trivial tasks)
export GOOGLE_API_KEY="..."
# or: export GEMINI_API_KEY="..."

# Optional: Moonshot Kimi K2 (5-6x cheaper than Claude for code tasks)
export MOONSHOT_API_KEY="sk-..."
# Get your key at: https://platform.moonshot.ai/
```

## Quick Start

```python
from create_something_agents import CreateSomethingAgent, AgentConfig

# Simple agent
agent = CreateSomethingAgent(AgentConfig(
    task="Write a function that calculates fibonacci numbers",
    model="claude-sonnet-4-20250514",
))

result = await agent.run()
print(result.output)
print(f"Cost: ${result.cost_usd:.4f}")
```

## Ralph-Style Iteration

For test-fix loops and iterative refinement:

```python
from create_something_agents import (
    CreateSomethingAgent,
    AgentConfig,
    RalphStopHook,
    RalphConfig,
)

agent = CreateSomethingAgent(AgentConfig(
    task="Fix failing tests",
    stop_hooks=[RalphStopHook(RalphConfig(
        prompt="Fix the failing tests. Output <promise>DONE</promise> when all pass.",
        max_iterations=15,
        completion_promise="DONE",
    ))],
))

result = await agent.run()
print(f"Completed in {result.iterations} iterations")
```

## Skills System

Load context from `.claude/rules/` or `.claude/skills/`:

```python
agent = CreateSomethingAgent(AgentConfig(
    task="Deploy the template",
    skills=["cloudflare-patterns", "template-deployment-patterns"],
))
```

## Tools

Built-in tools:

| Tool | Description |
|------|-------------|
| `bash` | Full subprocess access - "Bash is all you need" |
| `file_read` | Read file contents |
| `file_write` | Write files (creates directories) |
| `beads` | Agent-native issue tracking |

## Package Structure

```
packages/agent-sdk/
├── src/create_something_agents/
│   ├── agent.py          # Base agent class
│   ├── tools/            # bash, files, beads
│   ├── hooks/            # Stop hooks (Ralph)
│   ├── skills/           # Context loader
│   └── harness/          # Harness integration
├── agents/               # Pre-built agents
├── server/               # FastAPI server
├── tests/
└── pyproject.toml
```

## Local Development

Local-first: your MacBook handles coordination, Anthropic handles inference.

### Quick Start

```bash
# Install
pip install -e ".[all]"

# Start local server
make serve
# or: cs-agent serve

# Check health
make health
# or: curl http://localhost:8000/health
```

### CLI Commands

```bash
cs-agent serve              # Start server on localhost:8000
cs-agent serve --port 9000  # Custom port
cs-agent serve --reload     # Auto-reload on changes

cs-agent run "Fix the tests"  # Run task directly
cs-agent health               # Check server status
cs-agent test                 # Run test suite
```

### Makefile

```bash
make help       # Show all commands
make install    # Install with all deps
make serve      # Start server (with reload)
make test       # Run tests
make health     # Check server status
make lint       # Run linter
make typecheck  # Type check
```

### HTTP API

```bash
# Run agent task
curl -X POST http://localhost:8000/run \
  -H "Content-Type: application/json" \
  -d '{"task": "Create hello world", "model": "claude-sonnet-4-20250514"}'

# Health check
curl http://localhost:8000/health
```

## Development

```bash
# Install with dev dependencies
pip install -e ".[dev]"

# Run tests
pytest tests/ -v

# Type checking
mypy src/

# Linting
ruff check src/
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Cloudflare Edge                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Workers   │  │     D1      │  │     KV      │              │
│  │  (routing)  │  │  (state)    │  │  (cache)    │              │
│  └──────┬──────┘  └─────────────┘  └─────────────┘              │
└─────────┼───────────────────────────────────────────────────────┘
          │ HTTP
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Python Agent Runtime                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Agent SDK    │  │ Stop Hooks   │  │ Skills       │           │
│  │ (official)   │  │ (Ralph)      │  │ (context)    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment (When Needed)

For always-on production access:

```bash
# Docker
docker build -t cs-agents .
docker run -p 8000:8000 -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY cs-agents

# fly.io (~$5/month)
fly launch
fly secrets set ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
fly deploy
```

Most use cases work fine with local development ($0).

## Related Documentation

- [Harness Patterns](../../.claude/rules/harness-patterns.md) - Session orchestration
- [Ralph Patterns](../../.claude/rules/ralph-patterns.md) - Iteration loops
- [Beads Patterns](../../.claude/rules/beads-patterns.md) - Issue tracking
- [Cloudflare Patterns](../../.claude/rules/cloudflare-patterns.md) - Edge infrastructure

## License

MIT

# @create-something/loom

AI-native coordination layer. External memory for agents.

## Installation

```bash
npm install @create-something/loom
```

## Usage

```bash
# Initialize Loom
lm init

# Create a task
lm create "Fix the authentication bug"

# See ready tasks
lm ready

# Claim and complete
lm claim lm-a1b2
lm done lm-a1b2 --evidence "commit-abc123"
```

## MCP Integration

Run the MCP server for agent integration:

```bash
loom-mcp
```

See the [main README](https://github.com/create-something/create-something-monorepo/tree/main/packages/loom) for full documentation.

# @createsomething/triad-audit

```
╔═══════════════════════════════════════════════════════╗
║   SUBTRACTIVE TRIAD AUDIT                             ║
║                                                       ║
║   DRY        Rams       Heidegger                     ║
║   ─────      ─────      ─────────                     ║
║   Unify      Remove     Reconnect                     ║
║                                                       ║
║   "Creation is removing what obscures"                ║
╚═══════════════════════════════════════════════════════╝
```

A code analysis tool based on Dieter Rams' principle: **Weniger, aber besser** (Less, but better).

## The Subtractive Triad

| Level | Question | Action |
|-------|----------|--------|
| **DRY** (Implementation) | "Have I built this before?" | Unify |
| **Rams** (Artifact) | "Does this earn its existence?" | Remove |
| **Heidegger** (System) | "Does this serve the whole?" | Reconnect |

## Installation

```bash
npm install -g @createsomething/triad-audit
# or
npx @createsomething/triad-audit
```

## Usage

### CLI

```bash
# Audit current directory
triad-audit

# Audit specific path
triad-audit /path/to/project

# Output JSON to file
triad-audit -f json -o report.json

# Run specific analysis level
triad-audit -l dry    # DRY only
triad-audit -l rams   # Rams only
triad-audit -l heidegger  # Heidegger only

# Baseline comparison (CI/CD)
triad-audit --baseline     # Save current scores
triad-audit --compare      # Compare to baseline

# Generate config file
triad-audit --init
```

### Programmatic API

```typescript
import { runAudit, formatAsMarkdown } from '@createsomething/triad-audit';

const result = await runAudit({ path: './src' });

console.log(`Overall score: ${result.scores.overall}/10`);
console.log(`Violations: ${result.summary.totalViolations}`);

// Generate markdown report
const report = formatAsMarkdown(result);
```

## Output

```
📈 SCORES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ DRY (Implementation)   ████████░░ 8.0/10
  ○ Rams (Artifact)        ██████░░░░ 6.0/10
  ✗ Heidegger (System)     ████░░░░░░ 4.3/10
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ○ OVERALL                ██████░░░░ 6.1/10

⚠️ VIOLATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🟠 High:     3
  🟡 Medium:   12
  🟢 Low:      5
```

## What It Detects

### DRY Level (Implementation)
- **Duplicate code blocks** - Copy-pasted code that should be unified
- **Similar patterns** - Near-duplicates that indicate missing abstractions

### Rams Level (Artifact)
- **Dead exports** - Exports never imported anywhere
- **Unused dependencies** - npm packages not used in code
- **Large files** - Files that may need splitting (>500 lines)
- **Empty files** - Files with no meaningful content

### Heidegger Level (System)
- **Orphaned files** - Files not connected to the module graph
- **Circular dependencies** - Import cycles that create tight coupling
- **Package completeness** - Missing package.json fields

## Configuration

Create `.triad-audit.json` in your project root:

```json
{
  "ignore": [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**"
  ],
  "focus": ["src/**"],
  "thresholds": {
    "dry": { "min": 6, "warn": 7 },
    "rams": { "min": 6, "warn": 7 },
    "heidegger": { "min": 5, "warn": 6 }
  },
  "skipPatterns": {
    "deadExports": ["packages/sdk/**"],
    "orphanedFiles": ["examples/**"],
    "largeFiles": ["**/*.d.ts"]
  }
}
```

## MCP Server (Claude Code Integration)

Run as an MCP server for Claude Code or any MCP-compatible client:

```bash
# Start the MCP server
triad-audit-mcp
```

Add to your Claude Code settings (`~/.config/claude-code/settings.json`):

```json
{
  "mcpServers": {
    "triad-audit": {
      "command": "npx",
      "args": ["@createsomething/triad-audit", "mcp"]
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `audit` | Full Subtractive Triad audit |
| `audit_dry` | DRY (Implementation) analysis only |
| `audit_rams` | Rams (Artifact) analysis only |
| `audit_heidegger` | Heidegger (System) analysis only |

Example in Claude Code:
```
> Run a triad audit on this codebase
Claude: [Uses audit tool] The codebase scores 7.2/10 overall...
```

## CI/CD Integration

### GitHub Action (Recommended)

Use the official GitHub Action:

```yaml
name: Subtractive Triad Audit

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: create-something/triad-audit@v1
        with:
          threshold: 6.0
          comment-on-pr: true
```

The action will:
- Run the full Subtractive Triad audit
- Post results as a PR comment
- Fail if score drops below threshold
- Track score history for regression detection

### Manual Workflow

Alternatively, copy `templates/github-workflow.yml` to `.github/workflows/triad-audit.yml`:

```yaml
name: Subtractive Triad Audit

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run audit
        run: |
          npx @createsomething/triad-audit --format json --output audit.json --compare

      - name: Check thresholds
        run: |
          SCORE=$(jq '.scores.overall' audit.json)
          if (( $(echo "$SCORE < 5" | bc -l) )); then
            echo "::error::Score below threshold"
            exit 1
          fi
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success, no critical issues |
| 1 | High severity violations found |
| 2 | Critical violations found |

## Baseline Tracking

Track scores over time with baseline comparison:

```bash
# After initial audit, save baseline
triad-audit --baseline

# On subsequent runs, compare
triad-audit --compare

📊 COMPARISON TO BASELINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🟢 DRY:       ↑ +0.5
  🟢 Rams:      ↑ +1.2
  🟡 Heidegger: → 0.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🟢 OVERALL:   ↑ +0.6

  ✨ Scores have improved since baseline!
```

History is stored in `.triad-audit/` directory.

## Philosophy

This tool embodies the CREATE SOMETHING ethos:

- **Subtraction over addition** - Good code is code removed
- **Intentionality** - Every line should earn its existence
- **Wholeness** - Parts should serve the system, not themselves

Read more: [createsomething.ltd/ethos](https://createsomething.ltd/ethos)

## License

MIT

# Ground GitHub Action

Compute evidence for code analysis. Find duplicates, dead code, orphans, and design drift with verification-first patterns.

## Features

- **Duplicate Detection**: Find similar functions across your codebase
- **Dead Code Analysis**: Identify exports that are never imported
- **Orphan Detection**: Find modules nothing imports
- **Design Drift**: Check CSS token adoption for design system compliance
- **PR Comments**: Automatically post analysis results to pull requests
- **CI Integration**: Optionally fail builds when issues are found

## Quick Start

```yaml
name: Code Analysis

on:
  pull_request:

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: createsomethingtoday/create-something-monorepo/packages/ground/action@main
        with:
          analysis: 'all'
```

## Usage Examples

### Basic Analysis (All Checks)

```yaml
- uses: createsomethingtoday/create-something-monorepo/packages/ground/action@main
  with:
    analysis: 'all'
```

### Duplicate Detection Only

```yaml
- uses: createsomethingtoday/create-something-monorepo/packages/ground/action@main
  with:
    analysis: 'duplicates'
    similarity-threshold: '0.90'
    min-lines: '15'
```

### Design Token Compliance

```yaml
- uses: createsomethingtoday/create-something-monorepo/packages/ground/action@main
  with:
    analysis: 'drift'
    extensions: 'css,svelte'
    fail-on-issues: 'true'
```

### Specific Directory

```yaml
- uses: createsomethingtoday/create-something-monorepo/packages/ground/action@main
  with:
    path: 'packages/frontend/src'
    analysis: 'duplicates,dead-code'
```

### Silent Mode (No PR Comments)

```yaml
- uses: createsomethingtoday/create-something-monorepo/packages/ground/action@main
  with:
    comment-on-pr: 'false'
```

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `analysis` | Analysis types: `duplicates`, `dead-code`, `orphans`, `drift`, `all` | `all` |
| `path` | Path to analyze (relative to repo root) | `.` |
| `similarity-threshold` | Minimum similarity for duplicates (0.0-1.0) | `0.85` |
| `min-lines` | Minimum lines for duplicate detection | `10` |
| `extensions` | File extensions to analyze (comma-separated) | (all) |
| `fail-on-issues` | Fail workflow if issues found | `false` |
| `comment-on-pr` | Post results as PR comment | `true` |
| `github-token` | Token for PR comments | `${{ github.token }}` |

## Outputs

| Output | Description |
|--------|-------------|
| `duplicates-count` | Number of duplicate function pairs found |
| `dead-exports-count` | Number of dead exports found |
| `orphans-count` | Number of orphaned modules found |
| `drift-adoption` | Design token adoption percentage |
| `has-issues` | Whether any issues were found (`true`/`false`) |

## Using Outputs

```yaml
- uses: createsomethingtoday/create-something-monorepo/packages/ground/action@main
  id: ground
  
- name: Check Results
  run: |
    echo "Duplicates: ${{ steps.ground.outputs.duplicates-count }}"
    echo "Dead Exports: ${{ steps.ground.outputs.dead-exports-count }}"
    echo "Has Issues: ${{ steps.ground.outputs.has-issues }}"
```

## PR Comment Example

The action posts a formatted comment like:

```markdown
## Ground Code Analysis

### Duplicate Functions
Found **3** duplicate function pairs:
...

### Dead Exports
No dead exports found.

### Orphaned Modules
Found **1** potentially orphaned modules:
...

### Design Token Adoption
Token adoption: **87%**

---
| Metric | Count |
|--------|-------|
| Duplicates | 3 |
| Dead Exports | 0 |
| Orphans | 1 |
| Token Adoption | 87% |
```

## Philosophy

Ground is based on a simple principle: **no claim without evidence**.

- Duplicates are computed, not guessed
- Dead code is verified, not assumed
- Orphans are checked against framework conventions

This keeps Ground's recorded claims tied to prerequisite computation.

## Links

- [Ground npm Package](https://www.npmjs.com/package/@createsomething/ground-mcp)
- [Full Documentation](https://createsomething.io/docs/ground)
- [CREATE SOMETHING](https://createsomething.io)

## License

MIT

# Verified Triad

**Computation-constrained synthesis for AI code analysis.**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Verified Triad prevents AI agents from hallucinating code relationships by requiring computed evidence before allowing claims.

## The Problem

AI agents correctly retrieve individual facts but hallucinate relationships:

```
Retrieval (works):  "File A contains validateEmail()"
Retrieval (works):  "File B contains checkEmail()"  
Synthesis (fails):  "These are 95% similar" ← Hallucinated
```

## The Solution

**Compute before you claim.**

```bash
# First, compute similarity (required)
vt compute similarity src/utils.ts lib/utils.ts
# → Similarity: 87%

# Then, make a claim (validated against computation)
vt claim dry src/utils.ts lib/utils.ts "Duplicate validation logic"
# → ✓ Claim ALLOWED (grounded in computation)

# Without computation? BLOCKED.
vt claim dry other.ts another.ts "Looks similar"
# → ✗ Claim BLOCKED: No evidence found. Run: vt compute similarity ...
```

## Quick Start

```bash
# Install
cargo install verified-triad

# Initialize in your project
cd your-project
vt init

# Generate config file (optional - defaults work out of the box)
vt config init

# Run DRY audit
vt-audit packages/ --threshold 0.75

# Compute and claim individual files
vt compute similarity src/a.ts src/b.ts
vt claim dry src/a.ts src/b.ts "Duplicate logic"
```

## Exception Patterns

The audit tool filters false positives using configurable exception patterns.

**Default exceptions (ship with tool):**
- Config files: `vite.config.ts`, `svelte.config.js`, etc.
- Test directories: `**/test/**`, `**/__tests__/**`
- Small files: ≤15 lines (boilerplate)
- Re-export files: Files that only re-export from other modules

**Customize via `.vt/config.toml`:**

```toml
# Path patterns to ignore (glob syntax)
ignore_paths = [
    "**/test/**",
    "**/templates/**",  # Add your own
]

# Specific filenames to ignore
ignore_files = [
    "vite.config.ts",
    "my-boilerplate.ts",  # Add your own
]

# Files with <= this many lines are considered boilerplate
boilerplate_max_lines = 15

# Files with <= this many bytes are considered small
small_file_max_bytes = 300
```

**Audit output:**

```
VIOLATIONS (3):        # True positives - should review
ACCEPTABLE (14):       # Filtered by exception patterns
```

## MCP Server

Verified Triad includes an MCP server for AI agent integration:

```bash
# Start the MCP server
vt-mcp --db .vt/registry.db
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `vt_compute_similarity` | Compute similarity between two files |
| `vt_compute_usages` | Count usages of a symbol |
| `vt_compute_connectivity` | Analyze module connectivity |
| `vt_claim_dry` | Claim DRY violation (requires prior compute) |
| `vt_claim_existence` | Claim no-existence (requires prior compute) |
| `vt_claim_connectivity` | Claim disconnection (requires prior compute) |
| `vt_status` | Show registry status |

### Cursor/Claude Integration

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "verified-triad": {
      "command": "vt-mcp",
      "args": ["--db", ".vt/registry.db"]
    }
  }
}
```

## The Subtractive Triad

This tool operationalizes the [Subtractive Triad](https://createsomething.ltd/ethos) methodology:

| Level | Question | Computation Required |
|-------|----------|---------------------|
| **DRY** | "Have I built this before?" | `vt compute similarity` |
| **Rams** | "Does this earn existence?" | `vt compute usages` |
| **Heidegger** | "Does this serve the whole?" | `vt compute connectivity` |

## Known Issues

- **`vt compute connectivity` requires absolute paths.** Relative paths may fail with "No such file or directory". Use absolute paths or `$(pwd)/file.ts` as a workaround.

## Why Rust?

Rust's type system **enforces** the constraint at compile time:

```rust
// A DryViolation CANNOT be constructed without SimilarityEvidence
pub struct DryViolation {
    evidence: SimilarityEvidence,  // Required, not optional
    // ...
}

impl DryViolation {
    // The ONLY way to create a claim - requires evidence
    pub fn from_evidence(evidence: SimilarityEvidence, ...) -> Result<Self, ClaimRejected>
}
```

In Python or TypeScript, this is a runtime check you hope gets called.
In Rust, illegal states are **unrepresentable**.

## Prior Art

We build on existing work:

- **tree-sitter** - Polyglot AST parsing
- **PolyDup** - Clone detection algorithms
- **RLM** (arxiv:2512.24601) - Identified the "model discards computed results" failure mode
- **Beads** - Distribution and CLI patterns

## What's Novel

No existing tool implements **claim gating**:

```
Existing:   compute(similarity) → report(results)
Verified:   compute(similarity) → register(result) → claim() → check(registry) → allow|block
```

## License

MIT

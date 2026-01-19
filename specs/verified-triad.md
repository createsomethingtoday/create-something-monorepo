# Verified Triad: Computation-Constrained Synthesis for the Subtractive Triad

> **Status**: Architectural Specification  
> **Language**: Rust (with tree-sitter for polyglot AST parsing)  
> **Problem**: AI agents hallucinate relationships when synthesizing Subtractive Triad audits  
> **Solution**: Require computed verification before allowing relationship claims

## Prior Art & Novel Contribution

### What Exists (We Build On)

| Tool | What It Does | Citation |
|------|--------------|----------|
| **tree-sitter** | Polyglot AST parsing (100+ languages) | [tree-sitter.github.io](https://tree-sitter.github.io) |
| **PolyDup** | Rust-based cross-language clone detection | [docs.rs/polydup-core](https://docs.rs/polydup-core) |
| **similarity-rs** | AST similarity metrics | [lib.rs/similarity-rs](https://lib.rs/crates/similarity-rs) |
| **Qlty** | AST fingerprinting for duplication | [docs.qlty.sh](https://docs.qlty.sh/duplication) |
| **RustAssure** | Differential symbolic testing for transpilation | [arxiv:2510.07604](https://arxiv.org/abs/2510.07604) |
| **Verus/Prusti** | Formal verification for Rust | [verus-lang.github.io](https://verus-lang.github.io) |
| **Self-Verifying Agent** | Inline fact-checking for LLM claims | [2026 research] |
| **Type-constrained decoding** | Well-typed code generation | [arxiv:2504.09246](https://arxiv.org/abs/2504.09246) |

### What's Novel (Our Contribution)

**Existing pattern:**
```
compute(similarity) → report(results)
```

**Verified Triad pattern:**
```
compute(similarity) → register(result) → 
claim(duplication) → check(registry) → allow|block
```

| Innovation | Why It's New |
|------------|--------------|
| **Claim Gating** | No tool blocks AI claims without prior computation |
| **Verification Registry** | No tool tracks computed relationships as claim prerequisites |
| **Methodology Operationalization** | No tool encodes a specific methodology (Subtractive Triad) as required computations |
| **Three-Level Integration** | No unified tool covers DRY + Rams + Heidegger with mandatory computation |

### The Core Insight

RLM (arxiv:2512.24601) discovered that models with REPL access still hallucinate because they **discard computed results** and generate new answers. Existing verification tools compute and report. We add the missing layer: **claims are gated by computation**. You cannot assert a relationship you haven't computed.

## The Problem

When applying the Subtractive Triad at scale, LLMs correctly retrieve individual code snippets but hallucinate relationships during synthesis:

```
Retrieval (works):     "File A contains function validateEmail()"
Retrieval (works):     "File B contains function checkEmail()"
Synthesis (fails):     "These are 95% similar and violate DRY" ← Hallucinated
```

The Subtractive Triad asks questions that *appear* semantic but are actually *computational*:

| Level | Question | Appears To Be | Actually Is |
|-------|----------|---------------|-------------|
| DRY | "Have I built this before?" | Reasoning | `similarity(A, B) > threshold` |
| Rams | "Does this earn existence?" | Judgment | `usage_count(X) > 0` |
| Heidegger | "Does this serve the whole?" | Philosophy | `is_connected(X, system)` |

## The Solution: Computation-Required Claims

The Verified Triad inverts the problem. Instead of hoping the model uses computation, we **require** it:

```
┌─────────────────────────────────────────────────────────────────┐
│  Traditional: Model reasons → outputs claim → hope it's right   │
│                                                                 │
│  Verified:    Model requests claim → "show computation" →       │
│               no computation? BLOCKED                           │
│               has computation? ALLOWED                          │
└─────────────────────────────────────────────────────────────────┘
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Verified Triad System                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ Computation  │    │ Verification │    │    Claim     │       │
│  │    Layer     │───▶│   Registry   │───▶│  Constraint  │       │
│  │  (existing)  │    │   (novel)    │    │   (novel)    │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                   │                   │                │
│         │                   │                   │                │
│  ┌──────▼──────────────────▼───────────────────▼──────┐         │
│  │                    Agent Interface                  │         │
│  │                                                     │         │
│  │  compute_similarity()    claim_dry_violation()     │         │
│  │  count_usages()          claim_no_existence()      │         │
│  │  analyze_connectivity()  claim_disconnection()     │         │
│  └─────────────────────────────────────────────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Why Rust

Rust's type system can **encode** the constraint at compile time:

```rust
/// A computation result that proves similarity was computed
pub struct SimilarityEvidence {
    file_a: PathBuf,
    file_b: PathBuf,
    similarity: f64,
    ast_overlap: f64,
    computation_id: Uuid,
    // Private constructor - only created by compute_similarity()
}

/// A DRY violation claim - CANNOT be constructed without evidence
pub struct DryViolation {
    evidence: SimilarityEvidence,  // Required, not optional
    reason: String,
}

impl DryViolation {
    /// The ONLY way to create a claim - requires computed evidence
    pub fn from_evidence(
        evidence: SimilarityEvidence,
        reason: impl Into<String>,
        threshold: f64,
    ) -> Result<Self, ClaimRejected> {
        if evidence.similarity < threshold {
            return Err(ClaimRejected::BelowThreshold {
                actual: evidence.similarity,
                required: threshold,
            });
        }
        Ok(Self { evidence, reason: reason.into() })
    }
}
```

**"Making illegal states unrepresentable"** - In Rust, a `DryViolation` literally cannot exist without `SimilarityEvidence`. The type system enforces what other languages enforce at runtime (or not at all).

| Language | How It Enforces "No Claim Without Computation" |
|----------|------------------------------------------------|
| Python | Runtime check, hope you remember |
| TypeScript | Type assertion, can be bypassed with `as any` |
| Go | Convention + runtime check |
| **Rust** | **Compile-time - impossible to violate** |

### 1. Computation Layer

Tools that compute actual relationships (not reason about them):

```typescript
interface ComputationLayer {
  // DRY computations
  compute_similarity(file_a: string, file_b: string): SimilarityResult;
  compute_token_overlap(file_a: string, file_b: string): TokenOverlapResult;
  compute_ast_diff(file_a: string, file_b: string): AstDiffResult;
  find_duplicate_functions(): DuplicateFunctionResult[];
  
  // Rams computations
  count_usages(symbol: string): UsageCountResult;
  count_imports(module: string): ImportCountResult;
  measure_complexity(file: string): ComplexityResult;
  find_dead_code(): DeadCodeResult[];
  
  // Heidegger computations
  analyze_connectivity(module: string): ConnectivityResult;
  build_dependency_graph(): DependencyGraph;
  find_isolated_modules(): IsolatedModuleResult[];
  measure_coupling(module_a: string, module_b: string): CouplingResult;
}

interface SimilarityResult {
  similarity: number;        // 0.0 - 1.0
  token_overlap: number;     // shared tokens / total tokens
  ast_similarity: number;    // structural similarity
  shared_functions: string[];
  computation_id: string;    // For registry lookup
}
```

### 2. Verification Registry

Tracks all computations, enabling claim verification:

```typescript
interface VerificationRegistry {
  // Record computation results
  record(computation_id: string, result: ComputationResult): void;
  
  // Check if computation exists
  has_computation(type: string, args: any[]): boolean;
  
  // Get computation result
  get_computation(computation_id: string): ComputationResult | null;
  
  // List all computations for a file/module
  get_computations_for(target: string): ComputationResult[];
}

// Example registry state:
{
  "sim_abc123": {
    type: "similarity",
    args: ["utils/validate.ts", "lib/validation.ts"],
    result: { similarity: 0.73, token_overlap: 0.68 },
    computed_at: "2026-01-18T..."
  },
  "usage_def456": {
    type: "usage_count",
    args: ["formatCurrency"],
    result: { count: 0, locations: [] },
    computed_at: "2026-01-18T..."
  }
}
```

### 3. Claim Constraint Layer

Enforces computation requirement before allowing claims:

```typescript
interface ClaimConstraint {
  // DRY claims
  claim_dry_violation(
    file_a: string, 
    file_b: string, 
    reason: string
  ): DryViolation | ClaimBlockedError;
  
  // Rams claims
  claim_no_existence(
    target: string, 
    reason: string
  ): NoExistenceClaim | ClaimBlockedError;
  
  // Heidegger claims
  claim_disconnection(
    module: string, 
    reason: string
  ): DisconnectionClaim | ClaimBlockedError;
}

class VerifiedClaimConstraint implements ClaimConstraint {
  constructor(
    private registry: VerificationRegistry,
    private thresholds: TriadThresholds
  ) {}
  
  claim_dry_violation(file_a: string, file_b: string, reason: string) {
    // Check: has similarity been computed?
    if (!this.registry.has_computation("similarity", [file_a, file_b])) {
      throw new ClaimBlockedError(
        `Cannot claim DRY violation without computing similarity.\n` +
        `Run: compute_similarity("${file_a}", "${file_b}")`
      );
    }
    
    const result = this.registry.get_computation("similarity", [file_a, file_b]);
    
    // Check: does computation support the claim?
    if (result.similarity < this.thresholds.dry_similarity) {
      throw new ClaimBlockedError(
        `Computed similarity is ${result.similarity.toFixed(2)}, ` +
        `below threshold of ${this.thresholds.dry_similarity}.\n` +
        `Cannot claim these files are duplicates.`
      );
    }
    
    // Claim allowed - grounded in computation
    return new DryViolation({
      file_a,
      file_b,
      similarity: result.similarity,
      reason,
      computation_id: result.computation_id,
      grounded: true
    });
  }
  
  claim_no_existence(target: string, reason: string) {
    // Check: has usage been computed?
    if (!this.registry.has_computation("usage_count", [target])) {
      throw new ClaimBlockedError(
        `Cannot claim "${target}" doesn't earn existence without counting usages.\n` +
        `Run: count_usages("${target}")`
      );
    }
    
    const result = this.registry.get_computation("usage_count", [target]);
    
    // Check: does computation support the claim?
    if (result.count > this.thresholds.rams_min_usage) {
      throw new ClaimBlockedError(
        `"${target}" has ${result.count} usages.\n` +
        `Cannot claim it doesn't earn existence.`
      );
    }
    
    // Claim allowed - grounded in computation
    return new NoExistenceClaim({
      target,
      usage_count: result.count,
      reason,
      computation_id: result.computation_id,
      grounded: true
    });
  }
  
  claim_disconnection(module: string, reason: string) {
    // Check: has connectivity been analyzed?
    if (!this.registry.has_computation("connectivity", [module])) {
      throw new ClaimBlockedError(
        `Cannot claim "${module}" is disconnected without analyzing connectivity.\n` +
        `Run: analyze_connectivity("${module}")`
      );
    }
    
    const result = this.registry.get_computation("connectivity", [module]);
    
    // Check: does computation support the claim?
    if (result.connected) {
      throw new ClaimBlockedError(
        `"${module}" is connected to: ${result.connections.join(", ")}.\n` +
        `Cannot claim it doesn't serve the whole.`
      );
    }
    
    // Claim allowed - grounded in computation
    return new DisconnectionClaim({
      module,
      connectivity: result,
      reason,
      computation_id: result.computation_id,
      grounded: true
    });
  }
}
```

## Agent Workflow

### Successful Triad Audit

```
Agent: "Auditing utils/ for DRY violations"

Agent: compute_similarity("utils/validate.ts", "lib/validation.ts")
System: { similarity: 0.73, token_overlap: 0.68, computation_id: "sim_001" }

Agent: compute_similarity("utils/format.ts", "lib/formatters.ts")
System: { similarity: 0.91, token_overlap: 0.89, computation_id: "sim_002" }

Agent: claim_dry_violation(
  "utils/format.ts", 
  "lib/formatters.ts",
  "91% similarity - recommend consolidating into lib/formatters.ts"
)
System: ✓ Claim ALLOWED - grounded in computation sim_002

Agent: claim_dry_violation(
  "utils/validate.ts",
  "lib/validation.ts", 
  "73% similarity suggests these are duplicates"
)
System: ✗ Claim BLOCKED - similarity 0.73 below threshold 0.80
        "These files share patterns but are not duplicates"
```

### Blocked Hallucination

```
Agent: "I've reviewed the codebase and found that utils/helpers.ts 
        duplicates core/utilities.ts based on my analysis..."

Agent: claim_dry_violation(
  "utils/helpers.ts",
  "core/utilities.ts",
  "Based on my review, these appear to be duplicates"
)

System: ✗ Claim BLOCKED
        "Cannot claim DRY violation without computing similarity.
         Run: compute_similarity('utils/helpers.ts', 'core/utilities.ts')"
```

## Implementation Phases

### Phase 1: Computation Layer (Leverage Existing)

Build on existing Rust crates:

```
verified-triad/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   ├── computations/
│   │   ├── mod.rs
│   │   ├── similarity.rs    # Wraps PolyDup/similarity-rs
│   │   ├── usage.rs         # tree-sitter + custom analysis
│   │   └── connectivity.rs  # Dependency graph analysis
│   ├── registry/
│   │   ├── mod.rs
│   │   └── store.rs         # SQLite-backed registry (like Beads)
│   ├── claims/
│   │   ├── mod.rs
│   │   ├── dry.rs           # DRY violation claims
│   │   ├── rams.rs          # Existence claims
│   │   └── heidegger.rs     # Connectivity claims
│   └── mcp/
│       ├── mod.rs
│       └── server.rs        # MCP server interface
└── tests/
```

**DRY Computations (leverage existing):**
- `compute_similarity` - Wrap PolyDup for AST similarity
- `compute_token_overlap` - Use similarity-rs algorithms
- `find_duplicate_functions` - tree-sitter + fingerprint hashing

**Rams Computations (build new):**
- `count_usages` - tree-sitter query for symbol references
- `find_dead_exports` - Exports with zero external references
- `measure_complexity` - Cyclomatic complexity via AST traversal

**Heidegger Computations (build new):**
- `analyze_connectivity` - Build import/export graph
- `find_isolated_modules` - Graph analysis for orphaned modules
- `measure_coupling` - Afferent/efferent coupling metrics

### Phase 2: Registry Layer (Novel)

The key innovation - tracking what's been computed:

```rust
pub struct VerificationRegistry {
    store: SqliteStore,  // Persistent, like Beads
}

impl VerificationRegistry {
    /// Record a computation result
    pub fn record(&mut self, evidence: impl Evidence) -> Uuid;
    
    /// Check if computation exists for these inputs
    pub fn has_evidence<E: Evidence>(&self, inputs: &E::Inputs) -> bool;
    
    /// Get evidence for claim validation
    pub fn get_evidence<E: Evidence>(&self, id: Uuid) -> Option<E>;
}
```

### Phase 3: Claim Constraint Layer (Novel)

The gating mechanism:

```rust
pub struct ClaimValidator {
    registry: VerificationRegistry,
    thresholds: TriadThresholds,
}

impl ClaimValidator {
    pub fn validate_dry_claim(
        &self,
        file_a: &Path,
        file_b: &Path,
        reason: &str,
    ) -> Result<DryViolation, ClaimRejected> {
        // 1. Check registry for similarity evidence
        // 2. Validate evidence meets threshold
        // 3. Return claim or rejection
    }
}
```

### Phase 4: MCP Server

Expose as MCP server for agent integration:

```typescript
// verified-triad MCP server
const server = new Server({
  name: 'verified-triad',
  version: '1.0.0'
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // Computation tools (always available)
    { name: 'compute_similarity', description: 'Compute similarity between two files' },
    { name: 'count_usages', description: 'Count usages of a symbol' },
    { name: 'analyze_connectivity', description: 'Analyze module connectivity' },
    
    // Claim tools (require prior computation)
    { name: 'claim_dry_violation', description: 'Claim a DRY violation (requires compute_similarity first)' },
    { name: 'claim_no_existence', description: 'Claim something doesn\'t earn existence (requires count_usages first)' },
    { name: 'claim_disconnection', description: 'Claim a module is disconnected (requires analyze_connectivity first)' },
    
    // Registry tools
    { name: 'list_computations', description: 'List all computations performed' },
    { name: 'get_computation', description: 'Get details of a specific computation' }
  ]
}));
```

### Phase 3: Integration with Existing Tools

Connect to existing infrastructure:

- **triad-audit**: Use Verified Triad for automated audits
- **harness-mcp**: Add verified triad as quality gate
- **subtractive-review skill**: Reference Verified Triad tools

## Thresholds Configuration

```typescript
interface TriadThresholds {
  // DRY: What similarity counts as "duplicate"?
  dry_similarity: number;           // Default: 0.80
  dry_token_overlap: number;        // Default: 0.70
  dry_ast_similarity: number;       // Default: 0.75
  
  // Rams: What usage counts as "earning existence"?
  rams_min_usage: number;           // Default: 1
  rams_max_complexity: number;      // Default: 20 (cyclomatic)
  
  // Heidegger: What connectivity counts as "serving the whole"?
  heidegger_min_connections: number; // Default: 1
  heidegger_max_coupling: number;    // Default: 0.8
}
```

## Success Criteria

The system works when:

1. **No ungrounded claims**: Every DRY/Rams/Heidegger claim traces to computation
2. **Blocked hallucinations**: Model cannot claim relationships it hasn't computed
3. **Auditable results**: Every claim has a `computation_id` linking to evidence
4. **Threshold-based**: Claims blocked when computation doesn't support them

## Philosophical Alignment

This system embodies the Subtractive Triad at the meta-level:

- **DRY**: One source of truth for each relationship (the computation)
- **Rams**: Claims earn existence only when grounded
- **Heidegger**: The verification system serves the whole by preventing disconnection (hallucination)

## Distribution (Like Beads)

Following the [Beads](https://github.com/steveyegge/beads) model:

```bash
# Install options
cargo install verified-triad           # Cargo
brew install verified-triad            # Homebrew
npm install -g @verified-triad/cli     # npm wrapper

# Initialize in a project
vt init

# Run computation
vt compute similarity src/utils.ts src/lib/utils.ts

# Attempt claim (will check registry)
vt claim dry src/utils.ts src/lib/utils.ts "Duplicate validation logic"
# → ✓ Claim allowed (similarity: 0.87, threshold: 0.80)
# OR
# → ✗ Claim rejected: No similarity computation found. Run: vt compute similarity ...

# Full triad audit
vt audit src/
```

**MCP Integration:**

```json
{
  "mcpServers": {
    "verified-triad": {
      "command": "vt",
      "args": ["mcp-server"]
    }
  }
}
```

## Open Source Structure

```
github.com/create-something/verified-triad/
├── README.md                  # Quick start, philosophy
├── PHILOSOPHY.md              # Subtractive Triad explanation
├── docs/
│   ├── ARCHITECTURE.md        # Technical design
│   ├── NOVEL_CONTRIBUTION.md  # What's new vs. prior art
│   └── INTEGRATION.md         # Agent integration guide
├── src/                       # Rust implementation
├── examples/
│   ├── typescript-project/    # Example: TS codebase audit
│   ├── rust-project/          # Example: Rust codebase audit
│   └── polyglot-monorepo/     # Example: Multi-language
└── benchmarks/                # Performance + correctness tests
```

## References

### Foundational Research
- **RLM** (arxiv:2512.24601) - Context as programmable environment; identified "model discards computed results" failure mode
- **Type-constrained decoding** (arxiv:2504.09246) - Compile-time constraints on generation
- **RustAssure** (arxiv:2510.07604) - Differential symbolic testing pattern
- **Self-Verifying Agent** (2026) - Inline fact-checking architecture

### Tools We Build On
- **tree-sitter** - Polyglot AST parsing
- **PolyDup** - Clone detection algorithms  
- **similarity-rs** - Similarity metrics
- **Beads** - Distribution and CLI patterns

### Methodology
- **Subtractive Triad** - CREATE SOMETHING methodology (DRY → Rams → Heidegger)
- **Zuhandenheit** - Heidegger's "ready-to-hand" concept informing tool design

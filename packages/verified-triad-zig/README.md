# Verified Triad (Zig Implementation)

**Computation-constrained synthesis for AI code analysis.**

This is the Zig port of [Verified Triad](../verified-triad), offering significantly smaller binaries and faster compile times while maintaining the same core functionality.

## Comparison: Rust vs Zig

| Metric | Rust | Zig | Difference |
|--------|------|-----|------------|
| **Binary Size (vt)** | 2.7 MB | 308 KB | **9x smaller** |
| **Binary Size (vt-audit)** | 2.6 MB | 324 KB | **8x smaller** |
| **Clean Build Time** | 40.1s | 10.4s | **4x faster** |
| **Lines of Code** | 3,213 | 1,484 | **2x less** |
| **Tests** | 22 | 17 | Comparable |

## Trade-offs

### Zig Advantages
- **Dramatically smaller binaries** - Better for distribution
- **Faster compilation** - Better developer experience
- **Less code** - Simpler to understand and maintain
- **No hidden control flow** - Explicit error handling
- **No garbage collection** - Predictable performance

### Rust Advantages
- **More mature ecosystem** - tree-sitter, SQLite bindings
- **Stronger safety guarantees** - Borrow checker prevents data races
- **Better documentation** - More learning resources
- **Wider adoption** - Easier to find contributors

## Quick Start

```bash
# Build
zig build -Doptimize=ReleaseFast

# Run CLI
./zig-out/bin/vt init
./zig-out/bin/vt compute similarity file1.ts file2.ts
./zig-out/bin/vt claim dry file1.ts file2.ts "Duplicate logic"

# Run audit
./zig-out/bin/vt-audit packages/ --threshold 0.75
```

## Architecture

```
src/
├── lib.zig          # Core types and VerifiedTriad struct
├── similarity.zig   # Token/line similarity computation
├── registry.zig     # Evidence storage (file-based)
├── exceptions.zig   # False positive filtering
├── main.zig         # CLI (vt)
└── audit.zig        # Batch audit (vt-audit)
```

## Core Guarantee

Claims require computed evidence:

```
Without compute:
  vt claim dry a.ts b.ts "similar"
  → ✗ Claim BLOCKED: No evidence found

With compute:
  vt compute similarity a.ts b.ts  # Stores evidence
  vt claim dry a.ts b.ts "similar"
  → ✓ Claim ALLOWED (grounded in computation)
```

## Feature Parity

| Feature | Rust | Zig |
|---------|------|-----|
| Similarity computation | ✓ | ✓ |
| Claim gating | ✓ | ✓ |
| Evidence registry | ✓ (SQLite) | ✓ (File) |
| Exception patterns | ✓ | ✓ |
| DRY audit | ✓ | ✓ |
| MCP server | ✓ | ✗ |
| Usage computation | ✓ | Partial |
| Connectivity computation | ✓ | ✗ |

## When to Use Which

**Use Zig when:**
- Distributing standalone binaries
- Embedded systems or constrained environments
- Fast iteration during development
- Simplicity is a priority

**Use Rust when:**
- Need MCP server integration
- Require SQLite persistence
- Need full Subtractive Triad (usage + connectivity)
- Working with a Rust-familiar team

## License

MIT

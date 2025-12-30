# Knowledge Graph Pattern for Cloudflare Monorepos

> **Ontological Position**: Being-as-Graph
>
> A monorepo is not a collection of packages—it is a web of dependencies.
> Most dependencies are invisible until they break. This pattern makes them permanently visible.

## The Problem

Traditional monorepo tooling captures:
- ✅ Package dependencies (package.json)
- ✅ Import relationships (static analysis)
- ❌ Shared infrastructure (D1, KV, R2)
- ❌ Service bindings (Workers calling Workers)
- ❌ Documentation relationships (semantic similarity)
- ❌ Human-curated critical paths (hermeneutic context)

**Result**: You discover hidden dependencies only when they break.

## The Solution: Four-Layer Graph

```
┌────────────────────────────────────────────────────────────────┐
│  LAYER 4: HERMENEUTIC (Why things relate)                      │
│  Source: UNDERSTANDING.md files                                │
│  Edge type: explicit                                           │
│  Captures: Human-curated critical navigation paths             │
└────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────┐
│  LAYER 3: SEMANTIC (Latent relationships)                      │
│  Source: Embedding similarity (Cloudflare AI)                  │
│  Edge type: semantic                                           │
│  Captures: Documents that discuss similar concepts             │
└────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────┐
│  LAYER 2: DOCUMENTATION (Explicit references)                  │
│  Source: Markdown links, concept co-occurrence                 │
│  Edge type: cross-reference, concept                           │
│  Captures: Intentional documentation connections               │
└────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────┐
│  LAYER 1: INFRASTRUCTURE (Hidden coupling)                     │
│  Source: wrangler.toml parsing                                 │
│  Edge type: infrastructure                                     │
│  Captures: Shared D1, KV, R2, service bindings                 │
└────────────────────────────────────────────────────────────────┘
```

## Heideggerian Framing

| Layer | Mode | Character |
|-------|------|-----------|
| Infrastructure | Vorhandenheit | Present-at-hand; visible only when broken |
| Documentation | Zuhandenheit | Ready-to-hand; transparent in use |
| Semantic | Verstehen | Pre-understanding; latent connections |
| Hermeneutic | Auslegung | Interpretation; the *why* behind relationships |

## Implementation

### 1. Infrastructure Edges (Cloudflare-Specific)

Parse `wrangler.toml`/`wrangler.jsonc` to find:

```typescript
// Packages sharing the same D1 database
io ←→ agency (d1:a74e70ae-...)

// Packages sharing the same KV namespace
io ←→ agency ←→ templates-platform (kv:bcb39a...)
```

**Weight**: D1 = 1.0 (highest coupling), KV = 0.7, R2 = 0.5

### 2. Semantic Edges (Embedding Similarity)

Use Cloudflare Workers AI (`@cf/baai/bge-base-en-v1.5`):

```typescript
const embeddings = await AI.run('@cf/baai/bge-base-en-v1.5', {
  text: documents
});
```

**Cost**: ~$0.01 per full rebuild (287 docs)
**Threshold**: 0.75 cosine similarity
**Limit**: 10 edges per node (prevent density)

### 3. UNDERSTANDING.md Files (Hermeneutic Layer)

Each package maintains an UNDERSTANDING.md:

```markdown
## Depends On
| Dependency | Reason |
|------------|--------|
| packages/components | UI primitives |

## Enables Understanding Of
| Target | Relationship |
|--------|--------------|
| packages/lms | Provides auth patterns |
```

These create **weighted explicit edges** that guide navigation.

### 4. Concept Edges (Terminology Co-occurrence)

Extract domain terms across documents:

```typescript
const CONCEPTS = [
  'Subtractive Triad',
  'Zuhandenheit',
  'Canon',
  'Weniger, aber besser'
];
```

Documents mentioning the same concept get edges.

## Output Schema

```typescript
interface GraphNode {
  id: string;           // "packages/io/README.md"
  title: string;
  package: string;
  type: 'understanding' | 'readme' | 'paper' | 'rule';
  concepts: string[];
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'infrastructure' | 'explicit' | 'cross-reference' | 'concept' | 'semantic';
  weight: number;       // 0-1
  metadata?: {
    resourceType?: string;  // For infrastructure edges
    resourceId?: string;
    reason?: string;        // For explicit edges
  };
}
```

## Usage

```bash
# Full rebuild
pnpm graph:build

# Incremental (only re-embed changed files)
pnpm graph:build --incremental

# Dry run (preview without API calls)
pnpm graph:build --dry-run
```

## Adapting to Other Projects

### Minimal Implementation

For any Cloudflare monorepo:

1. **Install dependencies**:
   ```bash
   pnpm add -D glob @iarna/toml
   ```

2. **Add infrastructure extractor** (copy `extractors/infrastructure.ts`)

3. **Run standalone**:
   ```typescript
   const edges = await extractInfrastructureEdges('/path/to/monorepo');
   console.log(summarizeInfrastructure(edges));
   ```

### Full Implementation

Add semantic + hermeneutic layers:

1. Copy `scripts/build-knowledge-graph/` to your project
2. Update `CANONICAL_CONCEPTS` for your domain
3. Create UNDERSTANDING.md template
4. Run `pnpm graph:build`

## Metrics

Our implementation:

| Metric | Value |
|--------|-------|
| Node count | 287 |
| Edge count | 6,706 |
| Infrastructure edges | TBD (new) |
| Semantic edges | 2,106 |
| Rebuild cost | ~$0.01 |
| Incremental update | ~$0.001 |

## Philosophy: Why This Works

The graph makes **invisible dependencies visible**:

1. **Infrastructure**: Database sharing is invisible until migration breaks consumers
2. **Semantic**: Related concepts aren't linked until someone searches
3. **Hermeneutic**: Critical paths exist only in developers' heads

By surfacing all four layers, navigation becomes:
- **Proactive** (find dependencies before breaking them)
- **Exploratory** (discover related work)
- **Contextual** (understand *why* things connect)

> "The tool recedes. Only the connections remain."

## References

- [Knowledge Graph Builder](../scripts/build-knowledge-graph/)
- [UNDERSTANDING.md Template](../docs/guides/UNDERSTANDING_TEMPLATE.md)
- [Embedding Provider](../scripts/build-knowledge-graph/embeddings/provider.ts)

# Graph Relationship Audit

Periodic review and refinement of knowledge graph relationships. The graph reveals; the agent refines.

## Philosophy

**Hermeneutic Circle**: Graph surfaces patterns → Agent validates understanding → Refinements improve graph → New patterns emerge

The graph is not the insight—it's the prompt for insight. This skill operationalizes the review cycle.

## When to Use

- **After significant documentation changes** — New files, renamed concepts
- **When relationships seem wrong** — Nodes clustered that shouldn't be
- **Before major releases** — Ensure knowledge architecture is accurate
- **Quarterly maintenance** — Periodic health check

## Audit Dimensions

### 1. Concept Accuracy

**Question**: Are the extracted concepts actually present in the document?

| Issue | Detection | Fix |
|-------|-----------|-----|
| False positive | Concept in list but not meaningfully discussed | Remove from concepts |
| False negative | Core concept discussed but not extracted | Add to extraction patterns |
| Wrong granularity | Too broad ("Canon") vs specific ("Canon color tokens") | Refine concept taxonomy |

### 2. Edge Validity

**Question**: Do connected documents actually relate?

| Edge Type | Valid If | Invalid If |
|-----------|----------|------------|
| **Explicit** (UNDERSTANDING.md) | Dependency is real | Listed but not actually needed |
| **Cross-reference** (links) | Link serves reader | Broken or tangential link |
| **Concept** (shared terms) | Same semantic meaning | Homonym collision |
| **Infrastructure** (shared resources) | Resources genuinely shared | Coincidental naming |

### 3. Cluster Coherence

**Question**: Do clustered nodes belong together?

- Nodes in same visual cluster should share purpose, not just vocabulary
- "Configure WezTerm" and "Audit Spec" share Canon+Beads but serve different roles
- Consider adding **semantic role** to distinguish: teaches/audits/implements/defines

### 4. Missing Connections

**Question**: What should be connected but isn't?

- Documents that reference same external concept (Heidegger, Rams) without connection
- Implementation files without link to their specification
- Lessons without link to the pattern they teach

## Audit Workflow

### Step 1: Load Current Graph State

```bash
# View graph statistics
cat .graph/metadata.json | jq .

# Sample high-degree nodes (most connected)
cat .graph/edges.json | jq 'group_by(.source) | map({node: .[0].source, count: length}) | sort_by(-.count) | .[0:10]'
```

### Step 2: Review Suspicious Clusters

Open https://createsomething.io/graph and identify:

1. **Unexpected neighbors** — Nodes close that shouldn't be
2. **Isolated nodes** — Should be connected but aren't
3. **Dense clusters** — Too many edges, possible noise

### Step 3: Validate Sample Relationships

For each suspicious pair:

```bash
# Read both documents
cat "packages/path/to/file1.md"
cat "packages/path/to/file2.md"

# Check their edge
cat .graph/edges.json | jq '.[] | select(.source == "path/to/file1.md" and .target == "path/to/file2.md")'
```

Ask:
- Do they genuinely relate?
- Is the edge type correct?
- What's the semantic relationship?

### Step 4: Propose Refinements

Create Beads issues for each finding:

```bash
# Concept extraction issue
bd create "Refine concept extraction for [term]" --type task --label io --priority P2

# Missing connection
bd create "Add explicit edge: [source] → [target]" --type task --label io --priority P2

# Spurious connection
bd create "Review concept edge: [source] ↔ [target]" --type task --label io --priority P3
```

### Step 5: Implement and Rebuild

After fixes:

```bash
# Rebuild graph
pnpm graph:build --incremental

# Copy to static assets for deployment
cp .graph/*.json packages/io/static/.graph/

# Deploy
pnpm --filter=io build && wrangler pages deploy packages/io/.svelte-kit/cloudflare --project-name=create-something-io
```

## Concept Taxonomy

Current canonical concepts (from `scripts/build-knowledge-graph/extractors/concepts.ts`):

| Concept | Semantic Role | Common False Positives |
|---------|---------------|------------------------|
| Subtractive Triad | Methodology | Generic "triad" mentions |
| Zuhandenheit | Philosophy (tool use) | German quotes without context |
| Vorhandenheit | Philosophy (breakdown) | German quotes without context |
| Hermeneutic Circle | Philosophy (understanding) | Generic "hermeneutic" |
| Zero Framework Cognition | Methodology | Generic "framework" mentions |
| Canon | Design system | Generic "canon" (biblical) |
| Beads | Tool | Generic "beads" (jewelry) |
| Weniger, aber besser | Principle | German quotes |
| Dwelling | Philosophy | Generic "dwelling" (housing) |
| Complementarity | Pattern | Generic "complementary" |

### Adding New Concepts

Edit `scripts/build-knowledge-graph/extractors/concepts.ts`:

```typescript
export const CANONICAL_CONCEPTS: ConceptDefinition[] = [
  // Existing concepts...

  // New concept with word boundaries
  {
    name: 'Your Concept',
    patterns: [/\bYour Concept\b/i, /\balternate form\b/i],
    weight: 1.0,
  },
];
```

## Refinement Patterns

### Pattern 1: Context Disambiguation

When same term means different things:

```typescript
// Before: Generic "Canon" matches everything
{ name: 'Canon', patterns: [/\bCanon\b/i] }

// After: More specific patterns
{ name: 'Canon Design System', patterns: [/\bCanon (design|tokens|CSS)\b/i] }
{ name: 'Canon Philosophy', patterns: [/\bCanon (principles?|philosophy)\b/i] }
```

### Pattern 2: Weighted Concepts

Add weight based on mention density:

```typescript
// In concept extraction
const weight = mentions.length > 5 ? 1.0 : mentions.length > 2 ? 0.7 : 0.4;
```

### Pattern 3: Semantic Roles

Tag how a document relates to a concept:

```typescript
interface ConceptMention {
  concept: string;
  role: 'defines' | 'teaches' | 'implements' | 'audits' | 'mentions';
  weight: number;
}
```

## Metrics to Track

| Metric | Good | Concerning | Action |
|--------|------|------------|--------|
| Avg edges per node | 5-20 | >50 | Prune noisy edge types |
| Isolated nodes | <5% | >20% | Check extraction coverage |
| Concept coverage | >70% nodes | <50% | Expand concept patterns |
| False positive rate | <10% | >30% | Tighten patterns |

## Output Format

Audit report structure:

```markdown
# Graph Relationship Audit — [Date]

## Summary
- Nodes reviewed: X
- Edges validated: Y
- Issues found: Z

## Findings

### False Positives (Remove)
| Source | Target | Edge Type | Reason |
|--------|--------|-----------|--------|
| path/a.md | path/b.md | concept | Homonym collision |

### False Negatives (Add)
| Source | Target | Suggested Type | Reason |
|--------|--------|----------------|--------|
| path/c.md | path/d.md | explicit | Direct dependency |

### Concept Refinements
| Concept | Issue | Proposed Fix |
|---------|-------|--------------|
| Canon | Too broad | Split into Canon Design/Canon Philosophy |

## Beads Issues Created
- cs-xxx: [Title]
- cs-yyy: [Title]
```

## Integration

This skill connects to:
- `canon-maintenance` — Validates implementations against canon
- `understanding-graphs` — Maintains UNDERSTANDING.md files
- Knowledge graph builder (`scripts/build-knowledge-graph/`)

## Reference

- `.graph/metadata.json` — Current graph statistics
- `scripts/build-knowledge-graph/extractors/concepts.ts` — Concept definitions
- https://createsomething.io/graph — Visual exploration

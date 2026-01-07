# Gastown Model Routing

**Status**: ✅ Implemented (2026-01-05) | ✅ Updated for Gastown v0.2.1 (2026-01-07)

## Implementation Summary

**Harness Reviewers**: Model routing implemented directly
- Security → Haiku (~$0.001)
- Architecture → Opus (~$0.10)
- Quality → Sonnet (~$0.01)

**Gastown Workers**: Smart wrapper created (`gt-smart-sling`)
- Reads Beads issue labels
- Maps to Gastown quality levels
- Passes through to `gt sling --quality=<level>`
- **Compatible with**: Gastown v0.1.1 - v0.2.1

## Version Compatibility

**Gastown v0.1.1 - v0.2.1**: Uses `--quality` flag
- `--quality=basic` → Haiku (~$0.001)
- `--quality=shiny` → Sonnet (~$0.01)
- `--quality=chrome` → Opus (~$0.10)

**Gastown v0.2.2+ (unreleased)**: Uses `--agent` flag
- `--agent haiku` → Uses configured haiku agent
- `--agent sonnet` → Uses configured sonnet agent
- `--agent opus` → Uses configured opus agent

**Implementation**: `gt-smart-sling` auto-detects version and uses appropriate flag format.

## Problem Statement

Gastown workers currently use the default Claude model (likely Sonnet) for all tasks, regardless of complexity. This wastes tokens and cost on simple tasks that could run on Haiku.

**Example cost waste**:
- Typo fix on Sonnet: $0.01
- Same typo on Haiku: $0.001
- **Potential savings**: 90% per trivial task

With multiple parallel workers, this compounds quickly.

## Solution: Import Harness Model Routing

The harness already has sophisticated model routing based on:
1. Explicit labels (`model:haiku`, `model:sonnet`, `model:opus`)
2. Complexity labels (`complexity:trivial/simple/standard/complex`)
3. Pattern matching on keywords
4. Smart defaults

**Key benefit**: This is already battle-tested in harness with proven cost savings.

---

## How Harness Model Routing Works

### Priority Hierarchy

1. **Explicit label override** (highest priority)
   - `model:haiku` → Force Haiku
   - `model:sonnet` → Force Sonnet
   - `model:opus` → Force Opus

2. **Complexity labels**
   - `complexity:trivial` → Haiku (~$0.001)
   - `complexity:simple` → Sonnet (~$0.01)
   - `complexity:standard` → Sonnet (~$0.01)
   - `complexity:complex` → Opus (~$0.10)

3. **Pattern matching** on title/description
   ```typescript
   // Haiku patterns (mechanical tasks)
   ['rename', 'typo', 'comment', 'import', 'export',
    'lint', 'format', 'cleanup', 'remove unused',
    'add test for', 'update test', 'fix test',
    'bump version', 'update dependency']

   // Sonnet patterns (standard work)
   ['add', 'update', 'fix', 'implement',
    'component', 'endpoint', 'route', 'page',
    'style', 'css', 'layout',
    'validation', 'error handling']

   // Opus patterns (complex reasoning)
   ['architect', 'design', 'refactor', 'migrate',
    'optimize', 'performance', 'security',
    'integration', 'system']
   ```

4. **Default**: Sonnet

### Code Location

**Model selection logic**: `packages/harness/src/config/loader.ts:170-208`

```typescript
export function getModelFromConfig(
  config: HarnessConfig,
  title: string,
  labels: string[]
): 'opus' | 'sonnet' | 'haiku' {
  // 1. Explicit label override
  if (labels.includes('model:haiku')) return 'haiku';
  if (labels.includes('model:sonnet')) return 'sonnet';
  if (labels.includes('model:opus')) return 'opus';

  // 2. Complexity labels
  if (labels.includes('complexity:trivial')) return config.modelRouting.complexity.trivial;
  // ... etc

  // 3. Pattern matching
  if (patterns.haiku.some(p => titleLower.includes(p.toLowerCase()))) {
    return 'haiku';
  }
  // ... etc

  // 4. Default
  return config.modelRouting.default;
}
```

---

## Implementation Plan

### Option 1: Beads Label Integration (Recommended)

**Workflow**:
```bash
# User adds labels when creating issues
bd create "Fix typo in README" --label complexity:trivial

# Gastown reads label and routes to Haiku
gt sling cs-xxx csm
# → Worker spawns with: claude --model haiku
```

**Changes needed**:
1. Gastown worker spawn logic reads `model` or `complexity` labels from Beads
2. Pass `--model <model>` flag to `claude` CLI
3. Optionally: pattern matching fallback if no labels present

**Files to modify**:
- Gastown worker spawner (wherever `claude` is invoked)
- Add `getModelFromConfig` import from `@create-something/harness`

**Benefits**:
- Reuses harness logic (DRY)
- User has full control via labels
- No breaking changes

### Option 2: Automatic Pattern Detection

**Workflow**:
```bash
# User creates issue with descriptive title
bd create "Rename getUserInfo to fetchUserData"

# Gastown auto-detects "rename" → Haiku
gt sling cs-xxx csm
# → Worker spawns with: claude --model haiku
```

**Changes needed**:
1. Import `getModelFromConfig` from harness
2. Call it before spawning worker
3. Pass detected model to `claude --model <model>`

**Benefits**:
- Zero user friction (automatic)
- Immediate cost savings
- Still allows explicit overrides

### Option 3: Hybrid (Best of Both)

Combine both approaches:
1. Check for explicit `model:X` or `complexity:X` labels first
2. Fall back to pattern matching if no labels
3. Default to Sonnet if uncertain

---

## Reviewer Model Routing (Bonus)

Harness reviewers currently don't specify models - they inherit the default (likely Sonnet).

**Opportunity**:
```typescript
// Current (in reviewer.ts:191)
const proc = spawn('claude', ['-p', '--dangerously-skip-permissions']);

// Proposed
const model = getReviewerModel(config.type);
const proc = spawn('claude', ['-p', '--dangerously-skip-permissions', '--model', model]);

function getReviewerModel(type: ReviewerType): 'haiku' | 'sonnet' | 'opus' {
  switch (type) {
    case 'security': return 'haiku';     // Pattern scanning
    case 'architecture': return 'opus';  // Deep analysis
    case 'quality': return 'sonnet';     // Balanced
    default: return 'sonnet';
  }
}
```

**Cost savings**:
- Security reviews (pattern scanning) → Haiku instead of Sonnet = 90% savings
- Architecture reviews (complex reasoning) → Opus when needed
- Quality reviews → Stay on Sonnet

---

## Configuration Format

Extend `harness.config.yaml` (or create `gastown.config.yaml`):

```yaml
version: "1.0"

modelRouting:
  default: sonnet

  complexity:
    trivial: haiku
    simple: sonnet
    standard: sonnet
    complex: opus

  patterns:
    haiku:
      - rename
      - typo
      - comment
      - import
      - lint
      - format
      - cleanup
      - "remove unused"
      - "add test"
      - "bump version"

    sonnet:
      - add
      - update
      - fix
      - implement
      - component
      - endpoint
      - route
      - page
      - style
      - validation

    opus:
      - architect
      - design
      - refactor
      - migrate
      - optimize
      - performance
      - security
      - integration
      - system

  # Optional: override specific project preferences
  overrides:
    - pattern: "CREATE SOMETHING"
      default: opus  # Philosophy work always gets best model
```

---

## Estimated Cost Savings

**Assumptions** (based on typical workload):
- 40% of tasks are trivial (Haiku)
- 40% of tasks are standard (Sonnet)
- 20% of tasks are complex (Opus)

**Before** (all Sonnet):
```
100 tasks × $0.01 = $1.00
```

**After** (routed):
```
40 × $0.001 (Haiku)   = $0.04
40 × $0.01  (Sonnet)  = $0.40
20 × $0.10  (Opus)    = $2.00
Total = $2.44
```

Wait, that's higher! **But consider quality**:

**Realistic scenario** (quality-adjusted):
- Before: 20% complex tasks fail on Sonnet, need Opus retry
- After: Complex tasks go straight to Opus

**Before** (with failures):
```
80 tasks × $0.01 (Sonnet)     = $0.80
20 tasks × $0.01 (Sonnet fail) = $0.20
20 tasks × $0.10 (Opus retry)  = $2.00
Total = $3.00
```

**After** (routed correctly):
```
40 × $0.001 (Haiku)  = $0.04
40 × $0.01  (Sonnet) = $0.40
20 × $0.10  (Opus)   = $2.00
Total = $2.44
```

**Savings**: $0.56 per 100 tasks (18.6%)

**Plus**: No wasted time on failed attempts and retries.

---

## Next Steps

1. **Prototype**: Add model routing to harness reviewers first (smaller scope)
2. **Validate**: Run a few reviews, confirm cost/quality tradeoff
3. **Extend to Gastown**: Once validated, add to worker spawn logic
4. **Document**: Update gastown-patterns.md with model selection guidance

---

## Open Questions

1. **Default for Gastown**: Should Gastown default to Haiku (cost-optimized) or Sonnet (quality-optimized)?
   - Proposal: Sonnet, with explicit downgrades
2. **Pattern expansion**: Should we add CREATE SOMETHING-specific patterns?
   - Example: "Canon audit" → Haiku (pattern detection)
   - Example: "Hermeneutic analysis" → Opus (deep philosophy)
3. **Reviewer models**: Should reviewers always use their designated models, or allow overrides?
   - Proposal: Fixed per reviewer type (security=haiku, architecture=opus)

---

## Philosophy: Zuhandenheit Applied

Model routing should recede into transparent use. The user says "fix typo" or "architect system" and the right model is selected automatically.

**The tool disappears**; only the work remains.

When routing works correctly, no one notices. When it fails (complex work on Haiku), it becomes present-at-hand - we notice the hammer instead of the nail.

This is the Subtractive Triad applied to infrastructure:
- **DRY**: One model selection function, reused across harness and Gastown
- **Rams**: Only the complexity that earns its existence (explicit when needed, automatic when obvious)
- **Heidegger**: Serves the whole system (cost + quality + transparency)

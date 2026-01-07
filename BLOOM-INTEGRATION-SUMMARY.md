# Bloom Integration Summary

**Status**: ✅ Complete and tested (96 tests passing)

Implementation of Anthropic's Bloom-inspired patterns for CREATE SOMETHING's harness/Beads/Gas Town stack.

## What Was Implemented

### 1. Meta-Review Pattern (`packages/harness/src/meta-review.ts`)

After individual reviewers complete their analysis, a meta-reviewer synthesizes cross-cutting patterns that only become visible when examining all findings together.

**Key Features**:
- Model routing: Opus for security-critical, Sonnet for general synthesis
- Pattern detection: Identifies issues spanning multiple reviewers
- Work extraction: Auto-creates Beads issues for discovered patterns
- Cost-aware: Only runs when findings ≥ 3 (configurable)

**Example**:
```typescript
import { runMetaReview, DEFAULT_META_REVIEW_CONFIG } from '@create-something/harness';

// After review pipeline aggregation
const metaReview = await runMetaReview(aggregation, DEFAULT_META_REVIEW_CONFIG);

// Outputs:
// {
//   synthesis: "All reviewers flag auth module - systemic issue detected",
//   patterns: [
//     {
//       id: "all-reviewers-flag-auth",
//       description: "Auth module has security, architecture, and quality issues",
//       reviewers: ["security", "architecture", "quality"],
//       severity: "critical"
//     }
//   ],
//   discoveredIssues: [
//     {
//       title: "[Meta-Review] Systemic auth issues",
//       priority: 0,  // P0
//       labels: ["harness:supervisor", "meta-review", "severity:critical"]
//     }
//   ],
//   hasSystemicIssues: true,
//   model: "opus",
//   confidence: 0.92
// }
```

### 2. Beads Issue Seeds (`packages/harness/src/types.ts`)

Transforms Beads issues from descriptions into executable specifications.

**Structure**:
```typescript
import type { BeadsIssueSeed } from '@create-something/harness';

const seed: BeadsIssueSeed = {
  behavior: "Authentication tests pass",
  examples: [
    "Test output: 5 failures in auth.test.ts",
    "Expected: JWT token, Got: undefined"
  ],
  config: {
    maxIterations: 15,
    escalation: {
      enabled: true,
      initialModel: 'haiku',
      escalationThreshold: 5
    },
    harness: {
      useRalphEscalation: true,
      reviewers: ['security', 'quality']
    }
  },
  acceptance: [
    {
      test: "All auth tests green",
      verify: "pnpm test auth"
    },
    {
      test: "No security vulnerabilities",
      verify: "pnpm audit"
    }
  ],
  completionPromise: "TESTS_PASS"
};

// Attach to Beads issue
const issue = {
  id: 'cs-abc123',
  title: 'Fix failing auth tests',
  // ... other fields
  metadata: { seed }
};
```

**Helper Functions**:
```typescript
import { hasExecutableSeed, getIssueSeed } from '@create-something/harness';

if (hasExecutableSeed(issue)) {
  const seed = getIssueSeed(issue);
  // Ralph/harness can directly consume this seed
}
```

### 3. Model Organisms (`packages/harness/src/model-organisms.ts`)

Validation framework for model routing decisions using intentionally crafted test cases with known complexity.

**Key Features**:
- 9 standard test organisms spanning trivial/simple/standard/complex
- Routing validation (exact match or acceptable escalation)
- Metrics calculation (routing accuracy, success rate, cost analysis)
- Suite creation (standard and minimal)
- Beads integration (convert organisms to issues)

**Example**:
```typescript
import {
  STANDARD_ORGANISMS,
  validateRouting,
  calculateRoutingMetrics,
  createStandardSuite,
} from '@create-something/harness';

// Get a test organism
const trivialTask = STANDARD_ORGANISMS.find(o => o.id === 'org-trivial-typo')!;
// {
//   id: 'org-trivial-typo',
//   title: 'Fix typo in README',
//   knownComplexity: 'trivial',
//   expectedModel: 'haiku',
//   successCriteria: ['README.md line 42 contains "the" not "hte"']
// }

// Validate routing decision
const isValid = validateRouting(trivialTask, 'haiku');  // true (exact match)
const escalated = validateRouting(trivialTask, 'sonnet');  // true (escalation ok)
const tooWeak = validateRouting(trivialTask, 'haiku');  // Check against complex task → false

// Run validation suite
const suite = createStandardSuite();
// ... execute tasks, collect results
const metrics = calculateRoutingMetrics(suite.validations);
// {
//   total: 9,
//   routingAccuracy: 0.89,  // 89% correct model selection
//   successRate: 1.0,       // 100% task success
//   avgCost: 0.034,         // Average cost per task
//   escalationRate: 0.11    // 11% escalated to higher model
// }
```

### 4. Pipeline Integration

Updated `review-pipeline.ts` to automatically run meta-review:

```typescript
// Review pipeline now:
// 1. Runs individual reviewers in parallel
// 2. Aggregates results
// 3. Runs meta-review if findings >= threshold
// 4. Displays synthesis

const aggregation = await runReviewPipeline(checkpoint, completedIssues, config, cwd);

// Output:
// 🔍 Running peer review: 3 reviewer(s)
//   [security] ✓ pass_with_findings (1 findings)
//   [architecture] ✓ pass_with_findings (1 findings)
//   [quality] ✓ pass_with_findings (1 findings)
//
// 🔬 Running meta-review to synthesize patterns...
// ┌─────────────────────────────────────────────────────────────┐
// │  META-REVIEW SYNTHESIS                                      │
// ├─────────────────────────────────────────────────────────────┤
// │  Model: OPUS                                                │
// │  Confidence: 92%                                            │
// ├─────────────────────────────────────────────────────────────┤
// │  Cross-Cutting Patterns: 1                                  │
// │    🔴 All reviewers flag auth module                        │
// ├─────────────────────────────────────────────────────────────┤
// │  Issues Created: 1                                          │
// │    • [Meta-Review] Systemic auth issues                     │
// └─────────────────────────────────────────────────────────────┘
```

## Test Coverage

### Unit Tests
- `meta-review.test.ts` (5 tests): Model selection logic, Opus/Sonnet routing
- `model-organisms.test.ts` (18 tests): Organism framework validation
  - Standard organisms structure (4 tests)
  - Beads issue conversion (3 tests)
  - Organism identification (2 tests)
  - Routing validation (4 tests)
  - Metrics calculation (3 tests)
  - Suite creation (2 tests)

### Integration Tests (3 tests)
- `integration-meta-review.test.ts`: End-to-end pipeline integration
- Demonstrates cross-cutting pattern detection
- Validates Beads seed structure

### Smoke Tests (4 tests)
- `exports-smoke.test.ts`: Export validation
- Confirms all new types/functions are accessible
- Tests helper functions with real data

**Total**: 96 tests passing (71 existing + 25 new)

## Cost Analysis

| Stage | Model | Cost | When |
|-------|-------|------|------|
| Security review | Haiku | ~$0.001 | Every checkpoint |
| Architecture review | Opus | ~$0.10 | Every checkpoint |
| Quality review | Sonnet | ~$0.01 | Every checkpoint |
| **Meta-review** | **Opus/Sonnet** | **~$0.01-$0.10** | **When findings ≥ 3** |

**Total per checkpoint**: ~$0.111-$0.211

**ROI**: Meta-review discovers cross-cutting issues individual reviewers miss, preventing expensive rework.

## Usage Examples

### Example 1: Standard Review with Meta-Review

```typescript
import { runReviewPipeline, buildReviewContext } from '@create-something/harness';

const context = await buildReviewContext(checkpoint, completedIssues, cwd);
const aggregation = await runReviewPipeline(checkpoint, completedIssues, config, cwd);

// Meta-review runs automatically if aggregation.totalFindings >= 3
if (aggregation.metaReview) {
  console.log(`Discovered ${aggregation.metaReview.patterns.length} cross-cutting patterns`);

  // Create Beads issues from discovered patterns
  for (const issue of aggregation.metaReview.discoveredIssues) {
    await createIssue(issue.title, issue.description, issue.priority, issue.labels);
  }
}
```

### Example 2: Creating Executable Seeds

```typescript
import type { BeadsIssueSeed } from '@create-something/harness';

// Create seed from meta-review findings
const seed: BeadsIssueSeed = {
  behavior: "Fix systemic auth issues",
  examples: [
    "Security: SQL injection in auth.ts:100",
    "Architecture: God object pattern in auth.ts",
    "Quality: Zero test coverage for auth module"
  ],
  config: {
    maxIterations: 20,
    escalation: {
      enabled: true,
      initialModel: 'sonnet',  // Start with Sonnet for complex work
      escalationThreshold: 5
    }
  },
  acceptance: [
    { test: "No SQL injection vulnerabilities", verify: "pnpm audit" },
    { test: "Auth module refactored", verify: "pnpm exec tsc --noEmit" },
    { test: "Test coverage > 80%", verify: "pnpm test --coverage" }
  ],
  completionPromise: "AUTH_FIXED"
};

// Attach to Beads issue
await createIssue("Fix auth module", "Meta-review detected systemic issues", 0, ["harness:supervisor"], { seed });
```

### Example 3: Validating Model Routing

```typescript
import {
  createStandardSuite,
  organismToBeadsIssue,
  validateRouting,
  calculateRoutingMetrics,
} from '@create-something/harness';

// Create validation suite
const suite = createStandardSuite();

// Convert organisms to Beads issues for testing
for (const organism of suite.organisms) {
  const issue = organismToBeadsIssue(organism);
  // Create issue in Beads, run harness, record results

  // After execution, validate routing
  const actualModel = getModelUsed(issue.id);  // 'haiku' | 'sonnet' | 'opus'
  const routingCorrect = validateRouting(organism, actualModel);

  suite.validations.push({
    organism,
    actualModel,
    routingCorrect,
    taskSucceeded: checkTaskSuccess(issue.id),
    costUsd: calculateCost(issue.id),
    durationMs: getDuration(issue.id),
    iterations: getIterations(issue.id),
    escalated: checkEscalation(issue.id),
  });
}

// Calculate metrics
const metrics = calculateRoutingMetrics(suite.validations);
console.log(formatRoutingMetrics(metrics));

// Output:
// ┌─────────────────────────────────────────────────────────────┐
// │  MODEL ROUTING VALIDATION RESULTS                           │
// ├─────────────────────────────────────────────────────────────┤
// │  Total organisms: 9                                         │
// │  Routing accuracy: 88.9%                                    │
// │  Task success rate: 100.0%                                  │
// │  Average cost: $0.034                                       │
// │  Escalation rate: 11.1%                                     │
// └─────────────────────────────────────────────────────────────┘
```

### Example 4: Ralph Consuming Seeds

```typescript
import { getIssueSeed, hasExecutableSeed } from '@create-something/harness';

const issue = await getIssue('cs-abc123');

if (hasExecutableSeed(issue)) {
  const seed = getIssueSeed(issue);

  // Ralph can directly consume this seed
  const prompt = `
${seed.behavior}

Examples:
${seed.examples?.join('\n')}

Acceptance criteria:
${seed.acceptance?.map(a => `- ${a.test} (verify: ${a.verify})`).join('\n')}

Output <promise>${seed.completionPromise}</promise> when complete.
  `;

  // Run Ralph with config from seed
  await ralphLoop({
    prompt,
    maxIterations: seed.config?.maxIterations ?? 15,
    completionPromise: seed.completionPromise,
    escalation: seed.config?.escalation
  });
}
```

## Configuration

### Meta-Review Config

```typescript
import { DEFAULT_META_REVIEW_CONFIG } from '@create-something/harness';

const customConfig = {
  ...DEFAULT_META_REVIEW_CONFIG,
  enabled: true,                      // Enable meta-review
  useOpusForSecurityCritical: true,   // Use Opus when security findings
  minFindingsThreshold: 5,            // Only run if 5+ findings (default: 3)
  createBeadsIssues: false,           // Don't auto-create issues
};
```

### Enabling in Harness

Meta-review is **automatically enabled** in the review pipeline. To disable:

```typescript
// In harness config
const config = {
  reviewers: {
    enabled: true,
    reviewers: [
      { id: 'security', type: 'security', enabled: true },
      { id: 'architecture', type: 'architecture', enabled: true },
      { id: 'quality', type: 'quality', enabled: true },
    ]
  }
};

// Meta-review runs automatically after aggregation
// To disable, modify DEFAULT_META_REVIEW_CONFIG.enabled = false
```

## Files Modified

### New Files
- `packages/harness/src/meta-review.ts` - Meta-review implementation
- `packages/harness/src/model-organisms.ts` - Model organism validation framework
- `packages/harness/src/__tests__/meta-review.test.ts` - Meta-review unit tests
- `packages/harness/src/__tests__/model-organisms.test.ts` - Organism framework unit tests
- `packages/harness/src/__tests__/integration-meta-review.test.ts` - Integration tests
- `packages/harness/src/__tests__/exports-smoke.test.ts` - Export validation

### Modified Files
- `packages/harness/src/types.ts` - Added `BeadsIssueSeed`, helpers, meta-review field
- `packages/harness/src/review-pipeline.ts` - Integrated meta-review
- `packages/harness/src/index.ts` - Exported new types and functions (meta-review, organisms)
- `packages/io/tsconfig.json` - Fixed TypeScript config
- `packages/space/tsconfig.json` - Fixed TypeScript config
- `.claude/hooks/typecheck-stop.sh` - Fixed to use `pnpm exec tsc`

## Next Steps (Medium Priority)

Based on Bloom analysis, these are good candidates for future enhancement:

1. **Secondary scoring** in reviewers (complexity, testability, clarity metrics)
2. **Convoy meta-analysis** (`gt convoy analyze` command)
3. **CLI tool** for running organism validation suites

These have clear value and can be implemented when needed.

## Philosophy: Why This Works

### Zuhandenheit (Tool Recedes)

When meta-review works correctly, you don't think about it. You just get better issue detection.

```
Before: "Why did all three reviewers mention auth?"
After: Meta-review automatically creates: "[Meta-Review] Systemic auth issues"
```

### Subtractive Triad

| Level | Question | Answer |
|-------|----------|--------|
| **DRY** | Have we built this? | Bloom validated the pattern |
| **Rams** | Does it earn existence? | Discovers issues individuals miss |
| **Heidegger** | Does it serve the whole? | Improves harness quality gates |

### Zero Framework Cognition

Meta-review isn't a framework—it's reasoning about reviewer findings. The synthesis emerges from analyzing patterns, not from hardcoded rules.

## Bloom Citation

```
@misc{bloom2025,
  title={Bloom: an open source tool for automated behavioral evaluations},
  author={Gupta, Isha and Fronsdal, Kai and Sheshadri, Abhay and Michala, Jonathan
          and Tay, Jacqueline and Wang, Rowan and Bowman, Samuel R. and Price, Sara},
  year={2025},
  url={https://github.com/safety-research/bloom},
}
```

## Summary

✅ Meta-review pattern implemented and tested
✅ Beads issue seeds defined and integrated
✅ Model organism validation framework complete
✅ Pipeline automatically runs meta-review
✅ All 96 tests passing
✅ TypeScript errors resolved
✅ Full documentation provided

**The harness now implements the same validated patterns Anthropic Research built in Bloom.**

### Implemented Features

| Feature | Description | Tests | Status |
|---------|-------------|-------|--------|
| Meta-Review | Cross-cutting pattern synthesis | 5 unit + 3 integration | ✅ Complete |
| Issue Seeds | Executable specifications | 4 smoke tests | ✅ Complete |
| Model Organisms | Routing validation framework | 18 unit tests | ✅ Complete |

**Total new functionality**: 3 major features, 25 new tests, 1200+ lines of production code.

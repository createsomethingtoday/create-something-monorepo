# Ground MCP: Consolidation Patterns Spec

**Status**: Proposed  
**Created**: 2026-01-24  
**Source**: Codebase consolidation audit findings

## Overview

This spec proposes six new detection patterns for Ground MCP based on real issues discovered during the Canon design system consolidation. These patterns would have caught issues earlier, reducing manual audit time by an estimated 60-70%.

## Problem Statement

During the consolidation of `@create-something/components` to `@create-something/canon`, we discovered:

| Issue Type | Count | Detection Method | Time to Find |
|------------|-------|------------------|--------------|
| Deprecated package imports | 38 files | Manual grep | 5 min |
| Direct source path imports | 1 file | Manual grep | 10 min |
| Duplicate utilities | 2 files | Semantic search | 15 min |
| Local components in routes | 12 files | Directory listing | 20 min |
| Dependency issues | 4 files | Build failures | 30 min |

**Total manual audit time**: ~80 minutes  
**With Ground detection**: ~10 minutes (review flagged items only)

---

## Pattern 1: Deprecated Import Detection

### Motivation

When deprecating a package, all consumers must migrate. Without automated detection, deprecated imports persist indefinitely.

### Specification

```yaml
# .ground/import-health.yml
version: "1"

deprecated_imports:
  enabled: true
  
  rules:
    # Package-level deprecation
    - id: "deprecated-components-package"
      pattern: "@create-something/components"
      replacement: "@create-something/canon"
      message: "Package @create-something/components is deprecated. Migrate to @create-something/canon"
      severity: error
      auto_fix: true
      fix_mapping:
        # Direct replacements
        "@create-something/components": "@create-something/canon"
        "@create-something/components/types": "@create-something/canon/types"
        "@create-something/components/utils": "@create-something/canon/utils"
        # Subpath mappings
        "@create-something/components/diagrams": "@create-something/canon/diagrams"
        "@create-something/components/interactive": "@create-something/canon/interactive"
    
    # Direct source imports (always bad)
    - id: "direct-source-import"
      pattern: "from ['\"]\\.\\..*/(components|canon)/src/lib/"
      message: "Direct source imports bypass package boundaries. Use package import."
      severity: error
      examples:
        bad: "import X from '../../../components/src/lib/diagrams/Chart.svelte'"
        good: "import { Chart } from '@create-something/canon/diagrams'"
```

### Detection Algorithm

```
1. Parse import statements from .ts, .svelte, .js files
2. For each import:
   a. Check against deprecated_imports.rules[].pattern
   b. If match found:
      - Record violation with file:line:column
      - Look up replacement in fix_mapping
      - Generate auto-fix if available
3. Report violations grouped by rule
```

### CLI Interface

```bash
# Check for deprecated imports
ground imports --check

# Auto-fix deprecated imports
ground imports --fix

# Check specific package
ground imports --deprecated @create-something/components
```

### Output Example

```
Deprecated Import Violations (38 files)

@create-something/components → @create-something/canon
├── packages/io/src/routes/experiments/canvas-interactivity/+page.svelte:19
│   - import KnowledgeGraphCanvas from '../../../../../components/src/lib/diagrams/...'
│   + import { KnowledgeGraphCanvas } from '@create-something/canon/diagrams';
│
├── packages/space/src/lib/utils/completion.ts:2
│   - import { space } from '@create-something/components/utils';
│   + import { space } from '@create-something/canon/utils';

Run `ground imports --fix` to auto-fix 36 of 38 violations.
```

---

## Pattern 2: Duplicate Utility Detection

### Motivation

Utility functions get copy-pasted across packages. Over time, implementations drift, bugs get fixed in one place but not others.

### Specification

```yaml
# .ground/duplication.yml
version: "1"

duplicate_detection:
  enabled: true
  
  # Function body similarity threshold (0-100)
  similarity_threshold: 85
  
  # Minimum function size to consider (lines)
  min_function_lines: 5
  
  # Known canonical locations (skip these as "source of truth")
  canonical_sources:
    - "packages/canon/src/lib/utils/"
    - "packages/canon/src/lib/types/"
  
  # Package boundaries to check across
  check_across:
    - "packages/ltd/src/"
    - "packages/agency/src/"
    - "packages/space/src/"
    - "packages/io/src/"
  
  # Ignore patterns
  ignore:
    functions:
      - "load"           # SvelteKit convention
      - "GET|POST|PUT"   # API handlers
    files:
      - "*.test.ts"
      - "*.spec.ts"
```

### Detection Algorithm

```
1. Parse all TypeScript/JavaScript files in check_across paths
2. Extract function definitions (named functions, arrow functions, methods)
3. For each function:
   a. Normalize whitespace and variable names
   b. Generate hash of function body
   c. Store in similarity index
4. Find clusters with similarity >= threshold
5. For each cluster:
   a. Check if canonical_source exists
   b. Flag non-canonical copies as duplicates
6. Report with consolidation suggestions
```

### Similarity Calculation

```typescript
interface FunctionSignature {
  name: string;
  params: string[];
  returnType?: string;
  bodyHash: string;
  bodyLines: number;
  location: { file: string; line: number };
}

function calculateSimilarity(a: FunctionSignature, b: FunctionSignature): number {
  // Levenshtein distance on normalized body
  // Plus structural similarity (param count, return type)
  // Returns 0-100
}
```

### Output Example

```
Duplicate Utilities Found (3 clusters)

Cluster 1: markExperimentCompleted (92% similar)
├── CANONICAL: packages/canon/src/lib/utils/completion.ts:9
├── DUPLICATE: packages/space/src/lib/utils/completion.ts:10
│   Differences:
│   - Canon: markExperimentCompleted(slug: string, timeSpent?: number, onComplete?: fn)
│   - Space: markExperimentCompleted(slug: string, timeSpent?: number)
│   Recommendation: Re-export from canon, add space-specific wrapper

Cluster 2: isExperimentCompleted (100% identical)
├── CANONICAL: packages/canon/src/lib/utils/completion.ts:27
├── DUPLICATE: packages/space/src/lib/utils/completion.ts:27
│   Recommendation: Delete duplicate, import from @create-something/canon/utils

Action: Run `ground duplicates --consolidate` to generate migration script.
```

---

## Pattern 3: Local Component Detection

### Motivation

Components embedded in route directories violate the "Canon as single source of truth" principle. They should either:
1. Live in Canon experiments (if 1-of-1)
2. Live in Canon components (if shared)

### Specification

```yaml
# .ground/component-locality.yml
version: "1"

component_locality:
  enabled: true
  
  # Paths where components should NOT live
  forbidden_component_paths:
    - pattern: "packages/*/src/routes/**/*.svelte"
      exceptions:
        - "+page.svelte"
        - "+layout.svelte"
        - "+error.svelte"
        - "+loading.svelte"
      message: "Component in routes/ should be in Canon"
  
  # Canonical component locations
  canonical_paths:
    shared: "packages/canon/src/lib/components/"
    domains: "packages/canon/src/lib/domains/{property}/"
    experiments: "packages/canon/src/lib/experiments/{experiment}/"
  
  # Property mapping for domain suggestions
  property_mapping:
    "packages/ltd/": "ltd"
    "packages/agency/": "agency"
    "packages/space/": "space"
    "packages/io/": "io"
```

### Detection Algorithm

```
1. Glob for .svelte files in forbidden_component_paths
2. For each file:
   a. Check if filename matches exceptions (starts with +)
   b. If not exception:
      - Parse to determine if it's a component (has props, exports)
      - Determine suggested canonical location
3. Report violations with migration suggestions
```

### Output Example

```
Local Components in Routes (5 files)

packages/io/src/routes/experiments/kinetic-typography/
├── FluidAssembly.svelte
│   Type: Single-use experiment component
│   Suggestion: Move to @create-something/canon/experiments/kinetic-typography/
│   Command: ground component move FluidAssembly.svelte --to experiments/kinetic-typography

packages/io/src/routes/experiments/render-studio/
├── PresetPicker.svelte
├── OperationPicker.svelte
│   Type: Experiment-specific components (2 files)
│   Suggestion: Move to @create-something/canon/experiments/render-studio/
   
Run `ground components --relocate` to generate migration script.
```

---

## Pattern 4: Experiment Graduation Detection

### Motivation

The graduation pattern (1-of-1 → experiments, 2+ uses → components) requires tracking usage across the codebase.

### Specification

```yaml
# .ground/experiment-graduation.yml
version: "1"

experiment_graduation:
  enabled: true
  
  experiments_path: "packages/canon/src/lib/experiments"
  graduation_target: "packages/canon/src/lib/components"
  
  # Graduation threshold
  usage_threshold: 2
  
  # What counts as a "use"
  usage_definition:
    - import_statement     # Direct import
    - dynamic_import       # import()
    - component_reference  # <Component /> in Svelte
  
  # Exclude self-references
  exclude_paths:
    - "packages/canon/src/lib/experiments/"
```

### Detection Algorithm

```
1. List all exports from experiments_path
2. For each exported component/function:
   a. Search codebase for imports of that export
   b. Count unique importing files (excluding self)
   c. If count >= usage_threshold:
      - Flag for graduation
      - Suggest target location in graduation_target
3. Report graduation candidates
```

### Output Example

```
Experiment Graduation Report

Ready for Graduation (usage >= 2):
├── FluidAssembly (from kinetic-typography)
│   Used in: 3 files
│   - packages/io/src/routes/experiments/kinetic-typography/+page.svelte
│   - packages/space/src/routes/experiments/text-animation/+page.svelte
│   - packages/ltd/src/routes/canon/motion/+page.svelte
│   Suggestion: Graduate to @create-something/canon/components/animation/

Single-Use (stay in experiments):
├── CrowdSimulation (from living-arena-gpu)
│   Used in: 1 file
│   Status: Correctly in experiments/

Run `ground experiments --graduate FluidAssembly` to migrate.
```

---

## Pattern 5: Package Dependency Health

### Motivation

Package.json files can accumulate issues: deprecated dependencies, duplicates, version mismatches.

### Specification

```yaml
# .ground/dependency-health.yml
version: "1"

dependency_health:
  enabled: true
  
  # Deprecated packages
  deprecated_packages:
    - name: "@create-something/components"
      replacement: "@create-something/canon"
      severity: error
  
  # Required peer dependencies
  required_peers:
    - for: "@create-something/canon"
      requires: ["svelte", "@sveltejs/kit"]
  
  # Version consistency across workspace
  version_consistency:
    enabled: true
    packages:
      - "svelte"
      - "typescript"
      - "@sveltejs/kit"
  
  # Detect duplicates in dependencies
  duplicate_detection:
    enabled: true
```

### Output Example

```
Package Dependency Health

Deprecated Dependencies:
├── packages/ltd/package.json
│   "@create-something/components": "workspace:*" → "@create-something/canon"

Duplicate Dependencies:
├── packages/agency/package.json
│   "@create-something/canon" appears twice in dependencies

Version Inconsistencies:
├── svelte
│   packages/ltd: "^5.1.0"
│   packages/io: "^5.0.0"
│   Recommendation: Align to "^5.1.0"

Run `ground deps --fix` to auto-fix.
```

---

## Pattern 6: Import Consolidation

### Motivation

Multiple imports from the same module are noisy and harder to maintain.

### Specification

```yaml
# .ground/import-style.yml
version: "1"

import_consolidation:
  enabled: true
  
  # Minimum imports to suggest consolidation
  threshold: 2
  
  # Package patterns to check
  packages:
    - "@create-something/canon"
    - "@create-something/canon/*"
```

### Output Example

```
Import Consolidation Suggestions

packages/space/src/routes/experiments/nba-live/+page.svelte:
  Before:
    import { DateNavigation } from '@create-something/canon/experiments/nba-live';
    import { GameSelector } from '@create-something/canon/experiments/nba-live';
    import { AnalyticsNav } from '@create-something/canon/experiments/nba-live';
  
  After:
    import { 
      DateNavigation, 
      GameSelector, 
      AnalyticsNav 
    } from '@create-something/canon/experiments/nba-live';

Run `ground imports --consolidate` to auto-fix.
```

---

## Implementation Plan

### Phase 1: Foundation (Priority: P0)

| Task | Effort | Dependencies |
|------|--------|--------------|
| Deprecated Import Detection | 2 days | None |
| CLI interface for `ground imports` | 1 day | Pattern 1 |
| Auto-fix infrastructure | 2 days | Pattern 1 |

**Deliverable**: `ground imports --check` and `ground imports --fix`

### Phase 2: Duplication (Priority: P1)

| Task | Effort | Dependencies |
|------|--------|--------------|
| Function body parser | 3 days | None |
| Similarity algorithm | 2 days | Parser |
| Duplicate detection CLI | 1 day | Algorithm |

**Deliverable**: `ground duplicates` command

### Phase 3: Component Locality (Priority: P1)

| Task | Effort | Dependencies |
|------|--------|--------------|
| Svelte component analyzer | 2 days | None |
| Route vs component detection | 1 day | Analyzer |
| Migration script generator | 2 days | Detection |

**Deliverable**: `ground components --check` and `ground components --relocate`

### Phase 4: Advanced Patterns (Priority: P2)

| Task | Effort | Dependencies |
|------|--------|--------------|
| Graduation tracking | 2 days | Phase 3 |
| Dependency health checks | 1 day | None |
| Import consolidation | 1 day | Phase 1 |

**Deliverable**: `ground experiments`, `ground deps`, enhanced `ground imports`

---

## Configuration Schema

All patterns use a unified configuration approach:

```yaml
# .ground.yml additions
version: "1"

extends:
  - .ground/import-health.yml
  - .ground/duplication.yml
  - .ground/component-locality.yml
  - .ground/experiment-graduation.yml
  - .ground/dependency-health.yml
  - .ground/import-style.yml

# Global settings
consolidation:
  enabled: true
  auto_fix: false  # Require explicit --fix flag
  
report:
  format: markdown
  include_suggestions: true
  group_by: severity
```

---

## Success Metrics

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Time to detect deprecated imports | Manual grep | Automated | <1 min |
| Duplicate utilities discovered | 0 (unknown) | Reported | 100% coverage |
| Local components in routes | 12+ | 0 | 0 (enforced) |
| Graduation candidates tracked | Manual | Automated | 100% coverage |
| Dependency issues | Build failure | Pre-commit | 0 at build time |

---

## Open Questions

1. **Auto-fix scope**: Should auto-fix update imports across the entire workspace, or require per-package confirmation?

2. **CI integration**: Should violations block PRs, or just warn?

3. **Similarity threshold tuning**: 85% catches most duplicates but may have false positives. Need real-world testing.

4. **Graduation automation**: Should `ground experiments --graduate` create the PR automatically, or just generate a script?

---

## References

- [Ground MCP Documentation](https://github.com/create-something/ground)
- [Canon Design System README](../packages/canon/README.md)
- [Consolidation Session Transcript](../.cursor/agent-transcripts/)

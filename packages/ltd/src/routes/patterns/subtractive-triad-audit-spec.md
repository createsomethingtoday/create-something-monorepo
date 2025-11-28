# Subtractive Triad Audit System: Specification

**Status:** Design Phase
**Purpose:** Transform manual audits into automated, ongoing system health checks

---

## Current Process Analysis

### What Worked

| Aspect | Strength |
|--------|----------|
| **Parallel agents** | Three-level analysis runs concurrently |
| **Focused questions** | Each level has one clear question |
| **Scoring framework** | 1-10 scale provides comparable metrics |
| **Specific evidence** | File paths and line numbers cited |
| **Balanced reporting** | Commendations alongside violations |

### What's Missing

| Gap | Impact |
|-----|--------|
| **No automation** | Requires manual agent deployment |
| **No baseline** | Can't compare to previous audits |
| **No CI integration** | Doesn't run on PRs or schedules |
| **No thresholds** | No alerts when health degrades |
| **No visualization** | No trends or dashboards |
| **No incremental** | Re-analyzes entire codebase |
| **No machine output** | Reports are prose, not parseable |

---

## Proposed Architecture

### 1. Automated Metrics Collection

```
subtractive-triad-audit/
├── collectors/
│   ├── dry-collector.ts      # Duplication detection
│   ├── rams-collector.ts     # Dead code, bundle analysis
│   └── heidegger-collector.ts # Package completeness
├── analyzers/
│   ├── dry-analyzer.ts       # Pattern matching for violations
│   ├── rams-analyzer.ts      # Existence justification
│   └── heidegger-analyzer.ts # System coherence
├── reporters/
│   ├── markdown-reporter.ts  # Human-readable
│   ├── json-reporter.ts      # Machine-parseable
│   └── dashboard-reporter.ts # Visual trends
└── cli.ts                    # Command interface
```

### 2. DRY Metrics (Automatable)

| Metric | How to Collect |
|--------|----------------|
| **Duplicate blocks** | AST analysis with jscpd or custom |
| **Similar files** | File content hashing + comparison |
| **Repeated patterns** | Regex patterns across codebase |
| **Import frequency** | Count imports of shared utilities |

```typescript
interface DRYMetrics {
  duplicateBlocks: { file: string; lines: number[]; matches: string[] }[];
  similarFiles: { a: string; b: string; similarity: number }[];
  repeatedPatterns: { pattern: string; occurrences: string[] }[];
  utilityUsage: { utility: string; imports: number }[];
  score: number; // 1-10
}
```

### 3. Rams Metrics (Automatable)

| Metric | How to Collect |
|--------|----------------|
| **Dead exports** | Find exports with no imports |
| **Unused dependencies** | depcheck or custom analysis |
| **Bundle size** | esbuild --metafile analysis |
| **Code coverage** | Test coverage as proxy for usefulness |

```typescript
interface RamsMetrics {
  deadExports: { file: string; export: string }[];
  unusedDependencies: string[];
  bundleSize: { total: number; perFeature: Record<string, number> };
  testCoverage: number;
  score: number; // 1-10
}
```

### 4. Heidegger Metrics (Semi-Automatable)

| Metric | How to Collect |
|--------|----------------|
| **Package completeness** | Check for src/, tests/, README |
| **Documentation coverage** | Count documented exports |
| **Dependency graph** | madge or custom graph analysis |
| **Architecture clarity** | Check for ARCHITECTURE.md |

```typescript
interface HeideggerMetrics {
  packageCompleteness: {
    package: string;
    hasSrc: boolean;
    hasTests: boolean;
    hasReadme: boolean
  }[];
  documentationCoverage: number; // % of exports with JSDoc
  orphanedFiles: string[]; // Files with no imports
  circularDependencies: string[][];
  score: number; // 1-10
}
```

### 5. Human Analysis Layer

Some aspects require human/AI judgment:

| Aspect | Why Not Automatable |
|--------|---------------------|
| **Philosophy alignment** | Requires understanding intent |
| **Architecture decisions** | Context-dependent evaluation |
| **Code quality** | Subjective beyond metrics |
| **Naming conventions** | Semantic understanding needed |

**Proposal:** Run automated metrics first, then invoke AI agents only for:
- Files with metric anomalies
- New files since last audit
- User-flagged areas of concern

---

## Integration Points

### CI/CD Pipeline

```yaml
# .github/workflows/triad-audit.yml
name: Subtractive Triad Audit

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Triad Audit
        run: npx subtractive-triad-audit --output json
      - name: Check Thresholds
        run: |
          DRY_SCORE=$(jq '.dry.score' audit.json)
          if [ "$DRY_SCORE" -lt 6 ]; then
            echo "::error::DRY score below threshold: $DRY_SCORE"
            exit 1
          fi
      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: triad-audit
          path: audit.json
```

### Threshold Configuration

```json
{
  "thresholds": {
    "dry": { "min": 6, "warn": 7 },
    "rams": { "min": 6, "warn": 7 },
    "heidegger": { "min": 5, "warn": 6 }
  },
  "ignore": [
    "node_modules/**",
    "dist/**",
    "**/*.test.ts"
  ],
  "focus": [
    "src/**",
    "packages/**"
  ]
}
```

### Historical Tracking

```typescript
interface AuditHistory {
  timestamp: string;
  commit: string;
  scores: {
    dry: number;
    rams: number;
    heidegger: number;
    overall: number;
  };
  violations: {
    dry: number;
    rams: number;
    heidegger: number;
  };
}

// Store in .triad-audit/history.json
```

---

## CLI Interface

```bash
# Full audit with markdown report
npx triad-audit

# JSON output for CI
npx triad-audit --format json

# Single level
npx triad-audit --level dry

# Compare to baseline
npx triad-audit --compare .triad-audit/baseline.json

# Watch mode for development
npx triad-audit --watch

# Generate remediation issues
npx triad-audit --create-issues
```

---

## Dashboard Visualization

### Trend Chart
```
Score
10 ┤
 9 ┤                    ╭───╮
 8 ┤              ╭─────╯   ╰───
 7 ┤        ╭─────╯
 6 ┼────────╯
 5 ┤
   └────────────────────────────
     Jan  Feb  Mar  Apr  May  Jun

   ── DRY  ── Rams  ── Heidegger
```

### Health Badge
```markdown
[![Triad Score](https://img.shields.io/badge/Triad-5.8%2F10-yellow)]
```

---

## Implementation Phases

### Phase 1: Automated Metrics (MVP)
- [ ] DRY collector with jscpd integration
- [ ] Rams collector with depcheck + bundle analysis
- [ ] Heidegger collector for package completeness
- [ ] JSON reporter
- [ ] CLI with basic commands

### Phase 2: CI Integration
- [ ] GitHub Actions workflow
- [ ] Threshold checking
- [ ] PR comments with delta
- [ ] Historical tracking

### Phase 3: AI Enhancement
- [ ] Invoke agents for anomalies only
- [ ] Incremental analysis (changed files)
- [ ] Remediation suggestion generation
- [ ] Auto-create GitHub issues

### Phase 4: Visualization
- [ ] Dashboard component
- [ ] Trend charts
- [ ] Health badges
- [ ] Cross-project comparison

---

## Example Automated Output

```json
{
  "timestamp": "2025-11-28T15:30:00Z",
  "commit": "abc123",
  "project": "workway",
  "scores": {
    "dry": 6.5,
    "rams": 6.5,
    "heidegger": 4.5,
    "overall": 5.8
  },
  "violations": {
    "dry": [
      {
        "type": "duplicate_block",
        "severity": "high",
        "files": ["login.ts", "logout.ts", "whoami.ts"],
        "lines": 15,
        "suggestion": "Extract createAuthenticatedClient() utility"
      }
    ],
    "rams": [
      {
        "type": "dead_export",
        "severity": "critical",
        "file": "testing.ts",
        "export": "MockOAuthManager",
        "suggestion": "Move to @workwayco/sdk-testing package"
      }
    ],
    "heidegger": [
      {
        "type": "empty_package",
        "severity": "high",
        "package": "integrations",
        "suggestion": "Add implementations or remove directory"
      }
    ]
  },
  "commendations": [
    {
      "level": "rams",
      "component": "ActionResult<T>",
      "reason": "Narrow waist pattern, O(M+N) complexity"
    }
  ],
  "delta": {
    "dry": +0.5,
    "rams": -0.2,
    "heidegger": 0,
    "overall": +0.1
  }
}
```

---

## Open Questions

1. **Where should this tool live?**
   - Separate npm package (`subtractive-triad-audit`)?
   - Part of CREATE SOMETHING monorepo?
   - Framework-specific variants (SvelteKit, React)?

2. **How to handle false positives?**
   - Inline ignore comments (`// triad-ignore: intentional-duplication`)?
   - Configuration file exclusions?
   - Manual review step?

3. **Cross-project benchmarking?**
   - Anonymous score submission to central database?
   - Industry average comparisons?
   - Private vs. public thresholds?

4. **Integration with existing tools?**
   - ESLint plugin for DRY rules?
   - SonarQube integration?
   - CodeClimate compatibility?

---

*This specification defines a system for transforming the Subtractive Triad from a manual audit methodology into an automated, ongoing health check infrastructure.*

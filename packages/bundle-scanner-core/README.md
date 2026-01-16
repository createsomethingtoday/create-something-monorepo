# @create-something/bundle-scanner-core

Core scanning engine for Webflow Marketplace bundle security and policy analysis.

## Overview

This package provides the deterministic rule engine for scanning Webflow App bundles. It extracts ZIP files, builds a file inventory, runs regex-based security rules, and generates compliance reports.

## Installation

```bash
pnpm add @create-something/bundle-scanner-core
```

For AI-powered analysis, also install:

```bash
pnpm add @google/genai
```

## Usage

### Basic Scanning

```typescript
import {
  processZipFile,
  buildInventory,
  runScan,
  generateReport,
  defaultRuleset,
  defaultConfig
} from '@create-something/bundle-scanner-core';

async function scanBundle(file: File) {
  // 1. Extract ZIP
  const files = await processZipFile(file, defaultConfig, console.log);
  
  // 2. Build inventory
  const inventory = buildInventory(files, defaultConfig);
  
  // 3. Run rules
  const findings = runScan(inventory, defaultRuleset, defaultConfig, console.log);
  
  // 4. Generate report
  const report = generateReport(findings, defaultRuleset, defaultConfig, {
    fileCount: inventory.length,
    totalBytes: inventory.reduce((acc, f) => acc + f.sizeBytes, 0),
    textFilesScanned: inventory.filter(f => f.isTextCandidate).length,
    skippedFileCount: inventory.filter(f => f.isIgnored).length
  });
  
  return report;
}
```

### Custom Rulesets

```typescript
import { Ruleset, defaultConfig } from '@create-something/bundle-scanner-core';

const customRuleset: Ruleset = {
  schemaVersion: 'wf-marketplace-scanner-ruleset@1.0.0',
  rulesetVersion: '1.0.0-custom',
  rules: [
    {
      ruleId: 'CUSTOM-001',
      name: 'No Console Logs',
      category: 'CODE_QUALITY',
      reviewBucket: 'INFO',
      severity: 'LOW',
      disposition: 'INFO',
      description: 'Production code should not contain console.log statements',
      matchers: [
        {
          id: 'console-log',
          type: 'regex',
          pattern: '\\bconsole\\.log\\s*\\(',
          flags: 'g',
          fileGlobs: ['**/*.{js,ts,jsx,tsx}'],
          confidence: 'LOW'
        }
      ]
    }
  ]
};
```

### AI Analysis

```typescript
import { analyzeReportWithAi } from '@create-something/bundle-scanner-core';

// Requires GOOGLE_API_KEY environment variable
const aiAnalysis = await analyzeReportWithAi(report);

console.log(aiAnalysis.missedRisks);
console.log(aiAnalysis.suggestedRuleAdditions);
console.log(aiAnalysis.reviewStatusRecommendation);
```

## API Reference

### Scanner Functions

| Function | Description |
|----------|-------------|
| `processZipFile(file, config, onProgress)` | Extracts ZIP with safety checks |
| `buildInventory(files, config)` | Classifies files and builds inventory |
| `runScan(inventory, ruleset, config, onProgress)` | Runs rule engine |
| `generateReport(findings, ruleset, config, summary)` | Creates final report |

### Policy Exports

| Export | Description |
|--------|-------------|
| `defaultRuleset` | 18 rules covering security, network, privacy, UX |
| `defaultConfig` | Standard scanner configuration |

### Utility Functions

| Function | Description |
|----------|-------------|
| `generateRejectionEmail(report)` | Generates rejection email draft |
| `analyzeReportWithAi(report)` | AI-powered analysis (requires @google/genai) |
| `matchesAnyGlob(path, patterns)` | Glob pattern matching |

## Types

```typescript
import type {
  Ruleset,
  ScanRule,
  ScanConfig,
  ScanReport,
  Finding,
  FileEntry,
  Verdict,
  Severity,
  ReviewBucket
} from '@create-something/bundle-scanner-core/types';
```

## Security Features

- **ZIP Slip Protection**: Path normalization and traversal detection
- **Decompression Bomb Defense**: Configurable max size limits
- **File Count Limits**: Prevents DoS via excessive files
- **Secret Redaction**: Masks sensitive data in finding snippets
- **AI Data Capping**: Limits data sent to external AI services

## License

MIT

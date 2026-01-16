# Bundle Scanner Integration Plan

> **Origin:** Webflow Marketplace Team IC (App Reviewer) MVP
> **Pipeline:** AI Studio → CREATE SOMETHING → Webflow Component
> **Date:** 2026-01-16

## Executive Summary

The Bundle Scanner is a client-side tool built by an IC on the Webflow Marketplace Team to automate security/policy compliance scanning of Webflow App bundles. This document outlines the plan to integrate this MVP into the CREATE SOMETHING monorepo for further development, testing, and eventual productionization.

---

## 1. MVP Analysis

### 1.1 What It Does

The **Marketplace Bundle Scanner** analyzes `.zip` bundles submitted to the Webflow Marketplace and evaluates them against a configurable ruleset covering:

| Category | Rules | Description |
|----------|-------|-------------|
| **Security** | 8 rules | Dynamic code execution, sandbox escapes, hardcoded secrets, obfuscation, XSS vectors |
| **Network** | 2 rules | External egress review, insecure protocols (http/ws) |
| **Privacy** | 2 rules | Hardware access (mic/cam), fingerprinting/session replay |
| **UX** | 2 rules | Silent mutations, popup restrictions |
| **Production** | 1 rule | Localhost/dev endpoint detection |
| **Iframe** | 3 rules | External iframe sources, sandbox weaknesses, postMessage security |

### 1.2 Technical Stack

```
React 18 + TypeScript
├── UI: Tailwind CSS + lucide-react icons
├── ZIP: JSZip (ESM import from esm.sh)
├── AI: Google Gemini AI (@google/genai)
├── Storage: IndexedDB (scan history)
└── Runtime: Client-side browser execution
```

### 1.3 Key Features

1. **Deterministic Scanner** - Regex-based rule engine with pre-compiled matchers
2. **Policy Customization** - Editable rulesets and scanner configuration
3. **AI Augmentation** - Compares findings against checklist/llms.txt docs
4. **Triage Dashboard** - 60-second review summary with recommendations
5. **Email Draft Generator** - Auto-generates rejection emails
6. **Scan History** - Persists reports in IndexedDB

### 1.4 Code Quality Assessment

| Aspect | Rating | Notes |
|--------|--------|-------|
| Type Safety | ⭐⭐⭐⭐ | Full TypeScript with well-defined interfaces |
| Architecture | ⭐⭐⭐ | Good separation (scanner/, policy/, components/) |
| Security | ⭐⭐⭐⭐ | ZIP slip protection, size limits, secret redaction |
| Extensibility | ⭐⭐⭐⭐ | Ruleset is JSON-configurable |
| Testing | ⭐ | No tests present (typical for MVP) |
| Documentation | ⭐⭐ | Inline comments, needs more formal docs |

---

## 2. Recommended Architecture

### 2.1 Package Structure

We recommend a **modular hybrid approach** with two new packages:

```
packages/
├── bundle-scanner-core/          # NEW - Pure TypeScript library
│   ├── src/
│   │   ├── scanner/
│   │   │   ├── scan.ts           # Core scanning engine
│   │   │   ├── inventory.ts      # File inventory builder
│   │   │   ├── report.ts         # Report generator
│   │   │   └── zip.ts            # ZIP extraction
│   │   ├── policy/
│   │   │   ├── default-ruleset.ts
│   │   │   ├── default-config.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   └── index.ts          # All type definitions
│   │   ├── utils/
│   │   │   ├── glob.ts           # Glob matching
│   │   │   ├── email.ts          # Email templates
│   │   │   └── ai.ts             # AI integration
│   │   └── index.ts              # Public API exports
│   ├── package.json
│   └── tsconfig.json
│
├── bundle-scanner/               # NEW - React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── AiSuggestionsPanel.tsx
│   │   │   ├── FindingCard.tsx
│   │   │   ├── HistoryPanel.tsx
│   │   │   ├── PolicyPanel.tsx
│   │   │   ├── TriageDashboard.tsx
│   │   │   └── VerdictBadge.tsx
│   │   ├── hooks/
│   │   │   ├── use-scanner.ts
│   │   │   └── use-history.ts
│   │   ├── lib/
│   │   │   └── db.ts             # IndexedDB wrapper
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   │   └── data/
│   │       ├── checklist.txt
│   │       └── llms.txt
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── tsconfig.json
│
└── webflow-dashboard/            # EXISTING - Future integration target
    └── src/routes/
        └── bundle-scanner/       # FUTURE - Svelte wrapper
```

### 2.2 Why This Structure?

| Decision | Rationale |
|----------|-----------|
| **Separate core package** | Enables reuse across React app, Svelte dashboard, CLI tools, and future Webflow components |
| **Keep React app** | Minimal changes to working MVP; faster time-to-value |
| **Defer Svelte port** | Can be done incrementally without blocking launch |
| **No immediate Webflow component** | Scanner is an internal tool, not a user-facing widget |

---

## 3. Integration Steps

### Phase 1: Package Scaffolding (Day 1)

1. Create `packages/bundle-scanner-core/` with package.json
2. Create `packages/bundle-scanner/` with Vite + React setup
3. Update `pnpm-workspace.yaml` (already includes `packages/*`)
4. Establish base tsconfig extending `tsconfig.base.json`

### Phase 2: Core Migration (Days 2-3)

1. Move scanner logic to `bundle-scanner-core`:
   - `scanner/*.ts` → core package
   - `types.ts` → core package
   - `policy/*.ts` → core package
   - `utils/glob.ts`, `utils/email.ts` → core package
2. Create public API exports in `index.ts`
3. Add JSDoc documentation to exported functions
4. Write unit tests for scanner engine

### Phase 3: App Migration (Days 3-4)

1. Move React components to `bundle-scanner/`
2. Update imports to use `@create-something/bundle-scanner-core`
3. Configure Vite for development
4. Set up Tailwind CSS
5. Add environment variable handling for AI API key

### Phase 4: Quality Gates (Day 5)

1. Add ESLint configuration (extend monorepo rules)
2. Add Prettier formatting
3. Add Vitest for component tests
4. Add Playwright for E2E tests
5. CI/CD integration (GitHub Actions)

### Phase 5: Dashboard Integration (Future Sprint)

1. Create Svelte wrapper components in `webflow-dashboard`
2. Add `/bundle-scanner` route
3. Implement file upload with SvelteKit actions
4. Connect to existing dashboard authentication

---

## 4. Technical Specifications

### 4.1 Package: `@create-something/bundle-scanner-core`

```json
{
  "name": "@create-something/bundle-scanner-core",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./dist/index.js",
    "./types": "./dist/types/index.js",
    "./policy": "./dist/policy/index.js"
  },
  "dependencies": {
    "jszip": "^3.10.1",
    "minimatch": "^9.0.0"
  },
  "peerDependencies": {
    "@google/genai": "^0.x"
  }
}
```

**Public API:**

```typescript
// Core scanning
export { processZipFile } from './scanner/zip';
export { buildInventory } from './scanner/inventory';
export { runScan } from './scanner/scan';
export { generateReport } from './scanner/report';

// Policy
export { defaultRuleset } from './policy/default-ruleset';
export { defaultConfig } from './policy/default-config';

// Utilities
export { generateRejectionEmail } from './utils/email';
export { analyzeReportWithAi } from './utils/ai';

// Types
export type * from './types';
```

### 4.2 Package: `@create-something/bundle-scanner`

```json
{
  "name": "@create-something/bundle-scanner",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@create-something/bundle-scanner-core": "workspace:^",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.300.0",
    "idb": "^8.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "vite": "^5.0.0"
  }
}
```

### 4.3 Ruleset Schema

The scanner uses a versioned JSON schema for rules:

```typescript
interface Ruleset {
  schemaVersion: string;        // "wf-marketplace-scanner-ruleset@1.0.0"
  rulesetVersion: string;       // "1.3.0-checklist-complete"
  generatedAt?: string;
  rules: ScanRule[];
}

interface ScanRule {
  ruleId: string;               // "SEC-NO-DCE"
  name: string;                 // "Dynamic Code Execution"
  category: string;             // "SECURITY"
  reviewBucket: ReviewBucket;   // "AUTO_REJECT" | "ACTION_REQUIRED" | "NEEDS_EXPLANATION" | "INFO"
  severity: Severity;           // "BLOCKER" | "HIGH" | "MEDIUM" | "LOW" | "INFO"
  disposition: Disposition;     // "REJECTED" | "ACTION_REQUIRED" | "INFO"
  description: string;
  matchers: RuleMatcher[];
}
```

### 4.4 Security Considerations

| Concern | Mitigation |
|---------|------------|
| ZIP Slip | Path normalization + traversal detection in `zip.ts` |
| Decompression Bomb | `maxTotalUnzippedBytes` limit (default 200MB) |
| File Count DoS | `maxFiles` limit (default 5000 files) |
| Secret Exposure | Redaction in snippets for SECURITY category findings |
| AI Data Leakage | Capped findings (20/rule), truncated snippets (200 chars) |

---

## 5. Deployment Options

### Option A: Standalone Deployment (Recommended for Phase 1)

Deploy the React app to Cloudflare Pages:

```yaml
# wrangler.toml
name = "bundle-scanner"
compatibility_date = "2025-01-01"

[build]
command = "pnpm build"
cwd = "packages/bundle-scanner"

[build.upload]
format = "static"
directory = "dist"
```

### Option B: Embedded in Webflow Dashboard (Phase 2)

Add as a route in the existing SvelteKit dashboard, sharing authentication and infrastructure.

### Option C: Webflow Designer Extension (Future)

If the tool proves valuable, could be packaged as a Webflow Designer Extension using `@webflow/react`.

---

## 6. Enhancements Roadmap

### Near-term (This Sprint)

- [ ] Proper package structure
- [ ] Unit tests for scanner engine
- [ ] Environment-based configuration
- [ ] Error boundary and loading states
- [ ] Accessibility audit (ARIA labels present, verify keyboard nav)

### Medium-term (Next Sprint)

- [ ] Svelte dashboard integration
- [ ] Batch scanning (multiple bundles)
- [ ] Rule editor UI (visual builder)
- [ ] Export to CSV/PDF
- [ ] Webhook notifications

### Long-term (Future)

- [ ] AST-based scanning (beyond regex)
- [ ] Custom rule marketplace
- [ ] API endpoint for CI/CD integration
- [ ] Webflow Designer Extension
- [ ] ML-based anomaly detection

---

## 7. Migration Checklist

### Files to Move

```
Source: /Users/micahjohnson/Downloads/Copy of Copy of Bundle Scanner 2/

→ bundle-scanner-core/src/
  - scanner/scan.ts
  - scanner/inventory.ts
  - scanner/report.ts
  - scanner/zip.ts
  - policy/defaultRuleset.ts
  - policy/defaultScannerConfig.ts
  - types.ts
  - utils/glob.ts
  - utils/email.ts
  - utils/ai.ts
  - data/remediationRegistry.ts

→ bundle-scanner/src/
  - App.tsx
  - index.tsx
  - index.html
  - components/*.tsx
  - utils/db.ts (IndexedDB)

→ bundle-scanner/public/data/
  - data/App Bundle Review Checklist (Draft).txt
  - data/llms.txt
  - data/checklist_content.ts
  - data/llms_content.ts
```

### Dependencies to Install

```bash
# Core package
cd packages/bundle-scanner-core
pnpm add jszip minimatch
pnpm add -D typescript vitest @types/node

# App package  
cd packages/bundle-scanner
pnpm add react react-dom lucide-react idb @google/genai
pnpm add @create-something/bundle-scanner-core
pnpm add -D @vitejs/plugin-react vite tailwindcss autoprefixer postcss typescript @types/react @types/react-dom
```

---

## 8. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Scan Performance | <5s for 50MB bundle | Benchmark tests |
| Test Coverage | >80% for core package | Vitest coverage |
| Type Safety | 100% strict | `tsc --noEmit` |
| Accessibility | WCAG 2.1 AA | Lighthouse audit |
| Build Size | <500KB gzipped | Bundle analyzer |

---

## 9. Open Questions

1. **AI API Key Management** - Use Cloudflare Workers secrets or client-side env?
2. **Ruleset Versioning** - How to handle ruleset updates without breaking saved reports?
3. **Multi-tenant** - Should scan history be per-user or shared?
4. **Rate Limiting** - How to prevent AI API abuse?

---

## 10. Appendix: Original MVP File Structure

```
Bundle Scanner 2/
├── App.tsx                       # Main application component
├── components/
│   ├── AiSuggestionsPanel.tsx    # AI analysis UI
│   ├── CodeSnippet.tsx           # Code display component
│   ├── FindingCard.tsx           # Individual finding display
│   ├── HistoryPanel.tsx          # Scan history browser
│   ├── PolicyPanel.tsx           # Ruleset/config editor
│   ├── TriageDashboard.tsx       # Summary dashboard
│   └── VerdictBadge.tsx          # Pass/Fail badge
├── data/
│   ├── App Bundle Review Checklist (Draft).txt
│   ├── checklist_content.ts
│   ├── llms_content.ts
│   ├── llms.txt
│   ├── remediationRegistry.ts
│   ├── rule-checklist-mapping.json
│   ├── ruleset.v1.json
│   ├── ruleset.v1.ts
│   ├── scanner-config.v1.json
│   └── scanner-config.v1.ts
├── index.html
├── index.tsx
├── metadata.json
├── policy/
│   ├── defaultRuleset.ts         # 18 rules covering security/network/privacy/UX
│   └── defaultScannerConfig.ts   # ZIP safety limits, file extensions, vendor heuristics
├── scanner/
│   ├── inventory.ts              # File classification and tagging
│   ├── report.ts                 # Report generation with verdict calculation
│   ├── scan.ts                   # Core regex-based rule engine
│   └── zip.ts                    # JSZip wrapper with security checks
├── types.ts                      # Full TypeScript type definitions
└── utils/
    ├── ai.ts                     # Google Gemini integration
    ├── db.ts                     # IndexedDB storage
    ├── email.ts                  # Rejection email templates
    └── glob.ts                   # Minimatch-style glob matching
```

---

**Author:** CREATE SOMETHING Integration Team  
**Status:** DRAFT - Pending Review  
**Next Steps:** Begin Phase 1 implementation

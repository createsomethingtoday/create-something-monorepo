# Intake Review: Bundle Scanner

> **IC**: App Reviewer (Marketplace Team)  
> **Source Tool**: AI Studio (Bolt/similar)  
> **Submitted**: 2026-01-16  
> **Reviewer**: Micah Johnson (System Architect)

---

## 1. Project Overview

**Purpose**: Client-side tool to scan Webflow Marketplace app bundles for security, privacy, and policy compliance issues using a deterministic ruleset.

**Target Users**: Webflow Marketplace App Reviewers (internal)

**Original Location**: `/Users/micahjohnson/Downloads/Copy of Copy of Bundle Scanner 2`

---

## 2. Technical Assessment

### 2.1 Framework & Stack

| Aspect | Value | Notes |
|--------|-------|-------|
| Framework | React 18 | ✅ Perfect for Webflow Code Components |
| Language | TypeScript | ✅ Full type safety |
| Styling | Tailwind CSS | ✅ Compatible with Webflow |
| State Management | useState | ✅ Simple, component-scoped |
| External APIs | Google Gemini (optional) | ⚠️ Requires API key management |

### 2.2 Component Analysis

| Component | Complexity | Props | Translatable? |
|-----------|------------|-------|---------------|
| VerdictBadge | Low | 2 | ✅ Yes |
| TriageDashboard | Medium | 4 | ✅ Yes (with mock data mode) |
| FindingCard | Medium | 8 | ✅ Yes |
| AiSuggestionsPanel | High | 1 | ⚠️ Partial (needs API key) |
| HistoryPanel | Medium | 1 | ❌ No (IndexedDB dep) |
| PolicyPanel | High | 5 | ⚠️ Maybe (complex state) |

### 2.3 Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",           // ✅ Required for Code Components
    "lucide-react": "^0.300.0",   // ✅ Compatible icon library
    "jszip": "^3.10.1",           // ✅ Works in browser
    "idb": "^8.0.0",              // ⚠️ Browser-only, not for Designer preview
    "@google/genai": "^0.1.0"     // ⚠️ Optional, needs API key
  }
}
```

**Compatibility Issues**: 
- IndexedDB operations won't work in Designer preview mode
- AI features require API key (can't be baked into component)

---

## 3. Translation Criteria

### 3.1 Scoring

| Criterion | Score (1-5) | Notes |
|-----------|-------------|-------|
| React Compatibility | 5 | Already React, perfect match |
| Component Boundaries | 4 | Good separation, some coupling |
| Props Surface | 4 | Well-defined interfaces |
| State Complexity | 3 | Report state is complex object |
| External Dependencies | 4 | Most are compatible |
| Design System Fit | 4 | Tailwind aligns with variables |
| **TOTAL** | 24/30 | Strong candidate |

### 3.2 Webflow Component Mapping

| MVP Component | Webflow Component | Props to Expose |
|---------------|-------------------|-----------------|
| VerdictBadge | Verdict Badge | verdict, size |
| TriageDashboard | Triage Dashboard | blockerCount, reviewCount, infoCount, showEmailButton |
| FindingCard | Finding Card | ruleName, description, severity, count, sample* |

---

## 4. Refactoring Notes

### Required Changes

- [x] Extract core scanning logic to separate package
- [x] Create mock data mode for Designer preview
- [x] Wrap components with `declareComponent`

### Recommended Improvements

- [x] Add `webflow.json` configuration
- [x] Expose numeric props for Designer preview
- [ ] Consider extracting more granular components

### IC Collaboration Needed

- None - MVP was well-structured

---

## 5. Decision

### Verdict

- [x] **APPROVE** - Ready for translation

### Rationale

The Bundle Scanner MVP is an excellent candidate for Webflow Code Components:

1. **Already React** - No framework translation needed
2. **Clean architecture** - Scanner logic separable from UI
3. **Clear component boundaries** - Dashboard, cards, badges are distinct
4. **Tailwind styling** - Maps to Webflow variables pattern
5. **TypeScript** - Strong typing for prop definitions

The main challenge (IndexedDB/AI) is solved by creating "Designer preview mode" with mock data props.

### Next Steps

1. ✅ Create `packages/bundle-scanner-core/` for scanner logic
2. ✅ Create `packages/bundle-scanner/` for React app
3. ✅ Add `.webflow.tsx` wrappers for key components
4. ✅ Configure `webflow.json` for DevLink
5. ⏳ Share library to Webflow workspace (`pnpm webflow:share`)

---

## 6. Post-Translation

**Target Package**: `packages/bundle-scanner/`

**Core Package**: `packages/bundle-scanner-core/`

**DevLink Library**: Bundle Scanner Components

**Components Created**:
- [x] `VerdictBadge.webflow.tsx`
- [x] `TriageDashboard.webflow.tsx`
- [x] `FindingCard.webflow.tsx`

**Shared To Workspace**: [ ] Pending

---

**Review Completed**: 2026-01-16  
**Signature**: Micah Johnson, System Architect, Webflow Marketplace Team

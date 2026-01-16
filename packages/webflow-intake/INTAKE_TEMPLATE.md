# Intake Review: [PROJECT NAME]

> **IC**: [Name/Team]  
> **Source Tool**: [AI Studio / Cursor / Claude Code / Lovable / Other]  
> **Submitted**: [Date]  
> **Reviewer**: [Taste Maker Name]

---

## 1. Project Overview

**Purpose**: [What does this project do?]

**Target Users**: [Who will use this in Webflow?]

**Original Location**: [Path to MVP source]

---

## 2. Technical Assessment

### 2.1 Framework & Stack

| Aspect | Value | Notes |
|--------|-------|-------|
| Framework | React / Vue / Svelte / Vanilla | |
| Language | TypeScript / JavaScript | |
| Styling | Tailwind / CSS Modules / Styled Components | |
| State Management | useState / Redux / Zustand / None | |
| External APIs | [List any] | |

### 2.2 Component Analysis

| Component | Complexity | Props | Translatable? |
|-----------|------------|-------|---------------|
| [Component 1] | Low/Med/High | [count] | Yes/No/Maybe |
| [Component 2] | Low/Med/High | [count] | Yes/No/Maybe |

### 2.3 Dependencies

```json
{
  "dependencies": {
    // List key dependencies and compatibility notes
  }
}
```

**Compatibility Issues**: [Any deps that won't work with Webflow bundling?]

---

## 3. Translation Criteria

### 3.1 Scoring

| Criterion | Score (1-5) | Notes |
|-----------|-------------|-------|
| React Compatibility | | |
| Component Boundaries | | |
| Props Surface | | |
| State Complexity | | |
| External Dependencies | | |
| Design System Fit | | |
| **TOTAL** | /30 | |

### 3.2 Webflow Component Mapping

| MVP Component | Webflow Component | Props to Expose |
|---------------|-------------------|-----------------|
| [Original] | [Proposed Name] | [Prop list] |

---

## 4. Refactoring Notes

### Required Changes

- [ ] [Change 1]
- [ ] [Change 2]

### Recommended Improvements

- [ ] [Improvement 1]
- [ ] [Improvement 2]

### IC Collaboration Needed

- [ ] [Question/clarification 1]
- [ ] [Question/clarification 2]

---

## 5. Decision

### Verdict

- [ ] **APPROVE** - Ready for translation
- [ ] **REFACTOR** - Needs changes before translation
- [ ] **DEFER** - Park for future consideration
- [ ] **REJECT** - Not suitable for Code Components

### Rationale

[Explain the decision]

### Next Steps

1. [Step 1]
2. [Step 2]
3. [Step 3]

---

## 6. Post-Translation

**Target Package**: `packages/[name]/`

**DevLink Library**: [Library name]

**Components Created**:
- [ ] `[Component].webflow.tsx`
- [ ] `[Component].webflow.tsx`

**Shared To Workspace**: [ ] Yes / [ ] No

---

**Review Completed**: [Date]  
**Signature**: [Taste Maker]

---
name: subtractive-review
description: Apply the Subtractive Triad as code review methodology (DRY → Rams → Heidegger)
category: quality-assurance
triggers:
  - "code review"
  - "pull request"
  - "refactor"
  - "architecture discussion"
related:
  - canon-maintenance
  - triad-audit
composable: true
priority: P0
---

# Subtractive Review

Apply the Subtractive Triad as code review methodology.

## Philosophy

**"Creation is the discipline of removing what obscures."**

Code review is not about adding—it's about questioning what should remain. Every line, function, and file must justify its existence.

## The Three Passes

Review in this order. Each pass enables the next.

```
┌─────────────────────────────────────────────────────┐
│  PASS 1: DRY (Implementation)                       │
│  Question: "Have I built this before?"              │
│  Action: UNIFY                                      │
│  Failure: Duplication                               │
├─────────────────────────────────────────────────────┤
│  PASS 2: RAMS (Artifact)                            │
│  Question: "Does this earn its existence?"          │
│  Action: REMOVE                                     │
│  Failure: Decoration                                │
├─────────────────────────────────────────────────────┤
│  PASS 3: HEIDEGGER (System)                         │
│  Question: "Does this serve the whole?"             │
│  Action: RECONNECT                                  │
│  Failure: Disconnection                             │
└─────────────────────────────────────────────────────┘
```

## Pass 1: DRY (Implementation)

### What to Look For

- **Copy-paste code** — Same logic in multiple places
- **Similar patterns** — Code that could share an abstraction
- **Reinvented utilities** — Existing solutions in packages/components
- **Duplicated types** — Types defined in multiple packages

### Questions to Ask

```
□ Is this pattern already implemented elsewhere?
□ Should this be in the shared components library?
□ Is there an existing utility that does this?
□ Would a shared abstraction serve multiple consumers?
```

### Triad Audit Integration

```bash
# Automated duplication detection
pnpm --filter=triad-audit exec npm run audit -- --collectors=dry --path=src/
```

### Review Comment Template

```
🔄 DRY: This pattern exists in [location].

Suggest unifying:
- Option A: Import from [shared location]
- Option B: Extract to packages/components

Canonical principle: "Have I built this before?" → Unify
```

## Pass 2: Rams (Artifact)

### What to Look For

- **Dead code** — Functions/variables never called
- **Unused dependencies** — Packages in package.json not imported
- **Over-engineering** — Abstractions for single use cases
- **Premature optimization** — Complexity without proven need
- **Defensive coding against impossible states** — Trust internal code
- **Comments explaining obvious code** — Self-documenting > commented
- **Feature flags for removed features** — Delete completely
- **Backwards-compatibility shims** — Just change it

### The 10 Principles Applied

| Principle | Code Review Question |
|-----------|---------------------|
| Useful | Does this solve a real problem the user has? |
| Honest | Does the API promise only what it delivers? |
| Understandable | Is the purpose self-evident from reading? |
| Unobtrusive | Does complexity recede from the caller? |
| Long-lasting | Will this still make sense in 2 years? |
| Thorough | Is every edge case handled intentionally? |
| As little as possible | Can anything be removed? |

### Questions to Ask

```
□ Does this function earn its existence?
□ Can I remove any parameter without losing capability?
□ Is this abstraction serving actual use cases or hypothetical ones?
□ Would three similar lines be better than this premature abstraction?
□ Is this error handling for scenarios that can't happen?
```

### Triad Audit Integration

```bash
# Dead code and unused dependency detection
pnpm --filter=triad-audit exec npm run audit -- --collectors=rams --path=src/
```

### Review Comment Template

```
✂️ RAMS: This [function/variable/dependency] doesn't earn its existence.

Evidence:
- Never called from: [search results]
- Added in: [commit] for [reason that no longer applies]

Principle 10: "As little design as possible"
Action: Remove entirely.
```

## Pass 3: Heidegger (System)

### What to Look For

- **Circular dependencies** — A imports B imports A
- **Orphaned files** — Not imported anywhere
- **Property disconnection** — Code that doesn't serve the hermeneutic circle
- **Missing canonical traces** — Decisions without principle justification
- **Tool redundancy** — Multiple tools for same purpose

### The Hermeneutic Test

```
□ Does this part reveal the whole?
  - Can someone read this and understand CREATE SOMETHING?

□ Does the whole explain this part?
  - Can you trace this decision to a canonical principle?

□ Does this strengthen the circle?
  - Does it connect .ltd → .io → .space → .agency?
```

### Questions to Ask

```
□ What property does this serve?
□ How does this connect to the hermeneutic circle?
□ Can I trace this technical decision to a master's principle?
□ Does this create a circular dependency?
□ Is this file imported by anything?
```

### Triad Audit Integration

```bash
# Circular dependencies and orphan detection
pnpm --filter=triad-audit exec npm run audit -- --collectors=heidegger --path=src/
```

### Review Comment Template

```
🔗 HEIDEGGER: This [code/file/pattern] is disconnected from the whole.

Issue:
- No clear property connection
- Cannot trace to canonical principle
- Creates [circular dependency / orphaned code]

Question: "Does this serve the whole?"
Action: Either reconnect or remove.
```

## Anti-Patterns by Category

### Over-Engineering (Rams Violation)

```typescript
// ❌ Abstraction for single use case
function createUserFactory(config: UserFactoryConfig) {
  return (data: UserData) => new User(data, config);
}
const createUser = createUserFactory({ validate: true });
const user = createUser(data);

// ✅ Direct implementation
const user = new User(data);
```

### Defensive Against Impossible States (Rams Violation)

```typescript
// ❌ Internal function doesn't need this
function processInternalData(data: InternalData) {
  if (!data) throw new Error('Data required'); // Can't happen
  if (!data.id) throw new Error('ID required'); // Type guarantees this
  return transform(data);
}

// ✅ Trust internal code
function processInternalData(data: InternalData) {
  return transform(data);
}
```

### Backwards Compatibility Shims (Rams Violation)

```typescript
// ❌ Keeping old names around
export const oldFunctionName = newFunctionName; // deprecated
export { newFunctionName as _legacyName }; // for compatibility

// ✅ Just change it
export function newFunctionName() { ... }
// Update all call sites. Delete old references.
```

### Premature Abstraction (DRY Misapplication)

```typescript
// ❌ Abstracting before repetition exists
function withLogging<T>(fn: () => T, label: string): T {
  console.log(`Starting: ${label}`);
  const result = fn();
  console.log(`Completed: ${label}`);
  return result;
}

// ✅ Just write the three lines
console.log('Starting: process');
const result = process();
console.log('Completed: process');
```

### Disconnected Code (Heidegger Violation)

```typescript
// ❌ Utility with no clear property connection
// src/utils/randomHelper.ts - imported by nothing

// ✅ Either:
// 1. Connect it to a property's purpose
// 2. Move to packages/components if shared
// 3. Delete if unused
```

## Review Workflow

### 1. Automated Pre-Check

```bash
# Run full triad audit before manual review
pnpm --filter=triad-audit exec npm run audit
```

### 2. Manual Three-Pass Review

For each file changed:

**Pass 1 (DRY)**: Scan for duplication patterns
**Pass 2 (Rams)**: Question every addition
**Pass 3 (Heidegger)**: Verify system connection

### 3. Comment Format

Use emoji prefixes for quick scanning:

| Emoji | Level | Meaning |
|-------|-------|---------|
| 🔄 | DRY | Unification needed |
| ✂️ | Rams | Removal needed |
| 🔗 | Heidegger | Reconnection needed |
| ✅ | Pass | Earns existence |

### 4. Approval Criteria

Approve when:
- [ ] No duplication that should be unified
- [ ] Every addition earns its existence
- [ ] Changes serve the hermeneutic circle
- [ ] Decisions traceable to principles

## When to Use

- **Pull request reviews** — Apply all three passes
- **Refactoring sessions** — Focus on Rams (removal)
- **Architecture discussions** — Focus on Heidegger (system)
- **Code cleanup** — Focus on DRY (unification)

## Integration

This skill connects to:
- `canon-maintenance` — Philosophical criteria
- `triad-audit` package — Automated detection
- `voice-validator` — For documentation in PRs

## Reference

- `.ltd/patterns` — What to embrace and avoid
- `packages/triad-audit` — Automated tooling
- `CLAUDE.md` — The Subtractive Triad definition

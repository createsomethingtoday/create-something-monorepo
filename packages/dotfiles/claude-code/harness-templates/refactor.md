# Refactor Spec: [Refactor Name]

## Goal

[Describe the structural improvement without changing behavior]

## Context

[Why this refactor is needed. What's the current pain point?]

## Subtractive Triad Alignment

### DRY (Implementation)
- [ ] Unified patterns identified: [list]
- [ ] Duplications to eliminate: [list]

### Rams (Artifact)
- [ ] Elements that don't earn existence: [list]
- [ ] Unnecessary complexity to remove: [list]

### Heidegger (System)
- [ ] Disconnections to repair: [list]
- [ ] How this serves the whole: [description]

## Scope

### Files to Refactor
| File | Current Issue | Target State |
|------|---------------|--------------|
| `path/file1.ts` | [Issue] | [After] |
| `path/file2.ts` | [Issue] | [After] |

### Files to Delete
- `path/obsolete.ts` - [Why it's no longer needed]

### Files to Create
- `path/unified.ts` - [What it consolidates]

### Out of Scope
- [What NOT to touch]
- [Features to preserve exactly]

## Invariants

These must remain true throughout:
1. All existing tests continue to pass
2. Public API surface unchanged
3. [Specific invariant]
4. [Specific invariant]

## Refactoring Steps

### Phase 1: Extract
1. [ ] Extract common patterns to shared module
2. [ ] Create interface/type definitions
3. [ ] Tests still pass

### Phase 2: Migrate
1. [ ] Update file 1 to use new pattern
2. [ ] Update file 2 to use new pattern
3. [ ] Tests still pass

### Phase 3: Clean
1. [ ] Remove old implementations
2. [ ] Remove unused imports
3. [ ] Final test run

## Acceptance Criteria

- [ ] All tests pass (no behavior change)
- [ ] Type checking passes
- [ ] Build succeeds
- [ ] Code review checklist applied
- [ ] Performance baseline maintained

## Metrics

| Metric | Before | Target After |
|--------|--------|--------------|
| Lines of code | [X] | [Y] (less) |
| Duplicate blocks | [X] | 0 |
| Cyclomatic complexity | [X] | [Y] (lower) |

---

## Harness Instructions

Refactors require careful test discipline:
1. Run full test suite before each issue
2. Commit after each passing test run
3. Never combine behavioral changes with refactoring
4. Mark `code-complete` when tests pass
5. Mark `verified` after code review

# Audit Spec: [Audit Name]

## Goal

Audit [scope] for [issue type] and fix all findings.

## Audit Type

- [ ] Canon CSS compliance
- [ ] Security review
- [ ] Accessibility (WCAG)
- [ ] Performance
- [ ] Type safety
- [ ] Test coverage
- [ ] Documentation
- [ ] Dependency health

## Scope

### Include
- `packages/[package]/src/**/*`
- [Specific patterns]

### Exclude
- `**/node_modules/**`
- `**/*.test.ts`
- [Specific exclusions]

## Audit Criteria

### Must Fix (P0)
- [Critical issue type 1]
- [Critical issue type 2]

### Should Fix (P1)
- [Important issue type 1]
- [Important issue type 2]

### Could Fix (P2)
- [Nice-to-have improvement 1]
- [Nice-to-have improvement 2]

## Detection Patterns

```bash
# Commands to find issues
[grep/glob patterns]
```

### Canon CSS Example
```bash
# Find non-Canon color usage
grep -r "bg-white\|bg-black\|text-white" --include="*.svelte" packages/
```

## Expected Findings Format

| File | Line | Issue | Priority | Fix |
|------|------|-------|----------|-----|
| `path/file.ts` | 42 | [Issue] | P0/P1/P2 | [Fix] |

## Acceptance Criteria

- [ ] All P0 issues fixed
- [ ] All P1 issues fixed or deferred with justification
- [ ] P2 issues logged in Beads for future
- [ ] No regressions introduced
- [ ] Build passes
- [ ] Tests pass

## Deliverables

1. **Audit Report**: Summary of findings
2. **Fixes**: Commits addressing each issue
3. **Backlog**: Beads issues for deferred work

---

## Harness Instructions

Audits generate many small fixes:
1. First session: Scan and log all findings
2. Create one Beads issue per finding (or per file for small fixes)
3. Work through P0 first, then P1
4. Create backlog issues for P2
5. Checkpoint after each priority tier

---
description: Hermeneutic code review through the Subtractive Triad (DRY → Rams → Heidegger)
argument-hint: "[path or git diff]"
---

# Hermeneutic Review: $@

Review code through the Subtractive Triad lens. Apply three passes in order.

## Pass 1: DRY (Implementation)

**Question**: "Have I built this before?"

Scan for:
- Code duplicated within the diff
- Patterns existing elsewhere in codebase (use `grep` / `rg`)
- Reinvented utilities from `@create-something/*` packages
- Copy-paste from other files

**Output**: 🔄 Duplication found → suggest unification

## Pass 2: Rams (Artifact)

**Question**: "Does this earn its existence?"

Check against Rams' principles:
1. **Useful** — Does it solve a real problem?
2. **Honest** — Does it promise only what it delivers?
3. **Understandable** — Is purpose self-evident?
4. **Unobtrusive** — Does complexity recede?
5. **As little as possible** — Can anything be removed?

**Output**: ✂️ Unnecessary → list what to remove. ✅ Earns existence → validate.

## Pass 3: Heidegger (System)

**Question**: "Does this serve the whole?"

Verify:
- Property connection clear (.space, .io, .agency, .ltd)
- No circular dependencies introduced
- No orphaned files
- **Gestell Check**: Does this automation enable dwelling or merely accelerate consumption?
- **Das Man Check**: Are we adopting patterns because they're common, or because this work demands them?

**Output**: 🔗 System coherence | ⚠️ Weak connection | ❌ Circular dependency

## Report Format

```markdown
# Hermeneutic Review

## Summary
- Files Changed: N
- Lines Added: +X / Removed: -Y

## Pass 1: DRY — [findings]
## Pass 2: Rams — [findings]
## Pass 3: Heidegger — [findings]

## Verdict: [✅ APPROVED | ⚠️ APPROVED WITH COMMENTS | ❌ CHANGES REQUESTED]
```

If no path given, review `git diff HEAD`.

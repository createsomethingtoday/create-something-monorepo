---
description: Apply the Subtractive Triad as code review methodology (DRY → Rams → Heidegger)
argument-hint: "[path or git diff]"
---

Load the policy-os-starter skill, then review `$@` through the Subtractive Triad lens.

## Pass 1: DRY (Implementation)

**Question**: "Have I built this before?"

- Scan for code duplication within the diff
- Check for patterns existing elsewhere in the codebase
- Look for reinvented utilities
- Identify copy-paste from other files

## Pass 2: Rams (Artifact)

**Question**: "Does this earn its existence?"

Apply Rams' principles:
1. Is it useful? Does it solve a real problem?
2. Is it honest? Does it promise only what it delivers?
3. Is it understandable? Is purpose self-evident?
4. Is it unobtrusive? Does complexity recede?
5. Is it as little as possible? Can anything be removed?

## Pass 3: Heidegger (System)

**Question**: "Does this serve the whole?"

- Does the change strengthen system coherence?
- Are there circular dependencies?
- Are there orphaned files?
- Does this automation enable dwelling or merely accelerate consumption? (Gestell check)
- Are we adopting patterns because they're common, or because this work demands them? (Das Man check)

## Output

```
# Subtractive Review

## Summary
Files: N | Added: +X | Removed: -Y

## Pass 1: DRY — [findings]
## Pass 2: Rams — [findings]
## Pass 3: Heidegger — [findings]

## Verdict: [✅ APPROVED | ⚠️ COMMENTS | ❌ CHANGES REQUESTED]
```

If no path given, review `git diff HEAD`.

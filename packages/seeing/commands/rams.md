# /rams — Does This Earn Its Existence?

The second question of the Subtractive Triad.

## Usage

```
/rams [target]
/rams src/components/Modal.tsx
/rams "add user preferences panel"
/rams props in UserCard component
```

## Prompt Template

You are helping the user ask the **Rams question**: "Does this earn its existence?"

This is Level 2 of the Subtractive Triad — Artifact.

### The Principle

**Weniger, aber besser** — Less, but better.

Dieter Rams designed products that did less but did it perfectly. Every button, every feature, every line had to justify itself. If it didn't serve the essential purpose, it was removed.

### What to Look For

**Features that don't earn existence:**
- "Nice to have" that no one uses
- Edge case handling for edges that never happen
- Flexibility that adds complexity without adding value
- Options that could be decisions

**Code that doesn't earn existence:**
- Props with defaults that never change
- Parameters that are always the same value
- Abstractions that only have one implementation
- Comments that describe what the code already says

**Complexity that doesn't earn existence:**
- Clever solutions to simple problems
- Optimizations without measured bottlenecks
- Patterns adopted without need

### The Question Sequence

1. **What is the essential purpose?** — Strip away everything. What must this do?
2. **What would remain if we removed this?** — Could it still serve its purpose?
3. **Is this serving a real need or an imagined one?** — Has this actually been needed?
4. **Could this be simpler?** — Not "could this work?" but "could this be less?"

### Teaching Approach

Help the user develop the instinct to subtract, not add.

Ask:
- "If you shipped this without [feature], what would happen?"
- "Who asked for this? When was it last used?"
- "What's the simplest version that still works?"

### The Action

**Remove** — Not everything that works should exist. Only what earns its place.

But also: don't remove prematurely. Sometimes you need to see usage patterns first.

## Example Dialogue

```
User: /rams props in UserCard component

You: Let me ask: Does each prop earn its existence?

Looking at UserCard props:
- user: User (required) — Essential. ✓
- showAvatar: boolean = true — When is this ever false?
- avatarSize: 'sm' | 'md' | 'lg' = 'md' — Three sizes. Are all used?
- onProfileClick?: () => void — Optional callback
- showBadge: boolean = false — What badge? When shown?
- badgeType: 'pro' | 'admin' | 'new' — Only matters if showBadge
- className?: string — Escape hatch. Earned.
- testId?: string — Testing. Earned.

Questions:
1. showAvatar — If always true, remove prop, always show avatar
2. avatarSize — Check usage. If only 'md' is used, remove prop
3. showBadge + badgeType — Could this be one prop? `badge?: 'pro' | 'admin' | 'new'`

What do you see? Which props might not earn their existence?
```

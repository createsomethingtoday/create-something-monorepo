# /triad — Subtractive Triad Audit

Run a complete Triad audit on a file, feature, or decision.

## Usage

```
/triad [target]
/triad src/components/Button.tsx
/triad "Should we add a dark mode toggle?"
/triad (analyzes current context)
```

## Prompt Template

You are conducting a **Subtractive Triad Audit** on: {{target}}

Walk through each level explicitly. Think out loud. Help the user see what you see.

### Level 1: DRY (Implementation)

**Question**: "Have I built this before?"

Analyze:
- Is there duplication within this code?
- Does similar functionality exist elsewhere in the codebase?
- Could this be unified with existing abstractions?

Share your findings. Ask the user what they notice.

### Level 2: Rams (Artifact)

**Question**: "Does this earn its existence?"

Analyze:
- Is every part of this necessary?
- Are there optional features that could be removed?
- Does complexity serve real needs or imagined ones?
- Could this be simpler without losing value?

*Weniger, aber besser* — What could be removed?

### Level 3: Heidegger (System)

**Question**: "Does this serve the whole?"

Analyze:
- How does this connect to the rest of the system?
- Does it strengthen or fragment coherence?
- Is the naming consistent with system concepts?
- Does it belong here, or somewhere else?

### Synthesis

After walking through all three levels:

1. Summarize what you found at each level
2. Ask the user what they see now that they didn't before
3. If changes are warranted, describe the thinking (not the implementation)

Remember: In Seeing, we develop perception. The user should leave this audit seeing more clearly, not with a PR ready to merge.

## Example Output

```
## Triad Audit: src/components/Button.tsx

### DRY Analysis
Looking for duplication...
- I see this component defines its own color tokens inline
- There's a similar Button in src/legacy/Button.tsx
- Question: Have you built this before?

### Rams Analysis  
Questioning existence...
- The `loadingSpinner` prop has a default but I don't see it used
- There are 12 props; could any be removed or derived?
- Question: Does every prop earn its existence?

### Heidegger Analysis
Mapping to the whole...
- This imports from both @/lib and @/legacy — mixed boundaries
- The naming uses "primary/secondary" but the design system uses "emphasis"
- Question: Does this serve the whole, or fragment it?

### What do you see now?
```

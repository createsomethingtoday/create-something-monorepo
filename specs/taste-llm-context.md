# Taste as Agent Context (LLM.txt)

## Overview

Expose CREATE SOMETHING's curated taste vocabulary as structured context for AI agents. Not a curation tool—Are.na handles that. This makes existing curation machine-readable.

**Philosophy**: Taste is already cultivated in Are.na. This exposes it to agents who lack vision but need aesthetic guidance.

## The Problem

AI agents working on CREATE SOMETHING code need design guidance but:
- Can't "see" Are.na visual references
- Don't know which Rams principle applies when
- Lack vocabulary to describe aesthetic intent
- Miss the connection between philosophy and tokens

## The Solution

A single endpoint that translates visual taste into textual context:

```
GET /llm.txt
```

Returns plain text optimized for LLM context windows.

## Features

### 1. LLM.txt Endpoint

Static endpoint at `createsomething.ltd/llm.txt`:

```
# CREATE SOMETHING Design Context

## Philosophy
Weniger, aber besser. Less, but better.
The Subtractive Triad: DRY → Rams → Heidegger

## Visual Vocabulary

### Minimalism
- Negative space over decoration
- Monochrome first, color as emphasis
- Typography creates hierarchy without ornament
- Grid discipline creates order

### Motion
- Purposeful, not decorative
- 200ms for micro-interactions (--duration-micro)
- 300ms for state changes (--duration-standard)
- Consistent easing (--ease-standard)

### Anti-Patterns
- Bouncing icons, pulsing elements
- Rainbow gradients, neon accents
- Cluttered layouts
- Inconsistent timing

## Canon Token Reference

Background: --color-bg-pure (#000), --color-bg-surface (#111)
Foreground: --color-fg-primary (#fff), --color-fg-muted (0.46 opacity)
Spacing: Golden ratio (--space-sm: 1rem, --space-md: 1.618rem)
Radius: --radius-sm (6px), --radius-lg (12px)

## Source Channels
- canon-minimalism: Core vocabulary (Are.na)
- motion-language: Animation examples (Are.na)

## Property Character
- .space: Experimental (200ms transitions)
- .io: Research (250ms, measured)
- .agency: Professional (250ms, efficient)
- .ltd: Contemplative (500ms, deliberate)
```

### 2. Dynamic Context API

For agents needing filtered context:

```
GET /api/taste/context?intent=motion
GET /api/taste/context?intent=color
GET /api/taste/context?intent=typography
```

Returns JSON with relevant subset:
```json
{
  "intent": "motion",
  "principles": ["purposeful", "subtle", "consistent"],
  "tokens": {
    "--duration-micro": "200ms",
    "--duration-standard": "300ms",
    "--ease-standard": "cubic-bezier(0.4, 0, 0.2, 1)"
  },
  "anti_patterns": ["decorative animation", "duration > 500ms"],
  "examples": ["hover states use micro", "modals use standard"]
}
```

### 3. Sync from Are.na

Cron job or manual trigger to update LLM.txt from Are.na:

- Fetch blocks from canon-minimalism, motion-language channels
- Extract text descriptions from blocks
- Generate vocabulary terms
- Update static LLM.txt file

Not user-facing—internal maintenance only.

## Implementation

### Files to Create

1. `packages/ltd/src/routes/llm.txt/+server.ts` - Static text endpoint
2. `packages/ltd/src/routes/api/taste/context/+server.ts` - JSON API
3. `packages/ltd/src/lib/taste/vocabulary.ts` - Vocabulary definitions
4. `packages/ltd/src/lib/taste/sync.ts` - Are.na sync (if needed)

### No Database

LLM.txt is static text, version-controlled. No D1 needed.
Vocabulary lives in TypeScript, compiled into the bundle.

## Constraints

- No authentication required (public context)
- Cache aggressively (taste changes slowly)
- Plain text for LLM.txt (no JSON, no HTML)
- JSON for API endpoints
- Source from existing Are.na channels only

## Success Criteria

1. `/llm.txt` returns parseable design context
2. Agents can request intent-filtered context
3. Context includes Canon token mappings
4. Anti-patterns are clearly documented
5. Property-specific guidance available

## Out of Scope

- User curation (use Are.na)
- Collections (use Are.na)
- Reading tracking (unnecessary)
- Visual browsing (use Are.na)

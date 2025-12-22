# Taste Reference

Human-curated visual references from Are.na that inform Canon design decisions.

## Source Channels

### CREATE SOMETHING (Primary)
| Channel | Purpose | Sync |
|---------|---------|------|
| `canon-minimalism` | Core visual vocabulary | Primary |
| `motion-language` | Animation/transition examples | Primary |

### External (Secondary)
| Channel | Curator | Content |
|---------|---------|---------|
| `people-dieter-rams` | Chad Mazzola | Rams artifacts, products |
| `examples-swiss-design` | J-MB | Swiss/International style |
| `motion-minimal-simple` | Meg W | Subtle motion |
| `brutalist-x-web-design` | — | Brutalist web |
| `interfaces-motion` | — | UI animation patterns |

## Visual Principles (Derived from References)

### Minimalism
- **Negative space**: Let elements breathe
- **Monochrome first**: Color as emphasis, not decoration
- **Typography as structure**: Type creates hierarchy without ornament
- **Grid discipline**: Alignment creates order

### Motion
- **Purposeful**: Animation reveals state, guides attention
- **Subtle**: `--duration-micro` (200ms) for most interactions
- **Consistent**: One easing curve (`--ease-standard`)
- **Reducible**: Respect `prefers-reduced-motion`

### Anti-Patterns (What NOT to Do)
- Decorative animation (bouncing icons, pulsing elements)
- Gratuitous color (rainbow gradients, neon accents)
- Cluttered layouts (every pixel filled)
- Inconsistent motion (mixed timing, varied easing)

## Canon Token Mapping

Visual references inform these token decisions:

| Visual Pattern | Canon Token |
|----------------|-------------|
| Rams' muted grays | `--color-fg-muted: rgba(255,255,255,0.46)` |
| Swiss grid proportions | `--space-*` (golden ratio) |
| Braun product radii | `--radius-sm: 6px` through `--radius-lg: 12px` |
| Functional transitions | `--duration-micro: 200ms` |

## Sync Commands

```bash
# Sync all channels
curl https://createsomething.ltd/api/arena/sync

# Sync specific channel
curl https://createsomething.ltd/api/arena/sync?channel=canon-minimalism

# View synced references
https://createsomething.ltd/taste
```

## Hermeneutic Flow

```
Are.na (human curation)
    ↓ sync
.ltd/taste (structured examples)
    ↓ informs
Canon tokens (css-canon.md)
    ↓ applies to
.io, .space, .agency (implementations)
    ↓ discovers
Are.na (new references)
```

## When to Reference

Use taste references when:
- Choosing between visual approaches
- Validating a design decision against Canon principles
- Understanding why a token has a specific value
- Seeking inspiration within constraints

The goal is **informed constraint**, not imitation. References reveal the aesthetic; implementations express it.

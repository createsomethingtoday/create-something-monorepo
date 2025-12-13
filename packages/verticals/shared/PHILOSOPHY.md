# Design Philosophy

## The Heideggerian Principle

**Interfaces should disappear into use.**

When a carpenter hammers, they don't think about the hammer—they think about the nail. The hammer becomes "ready-to-hand" (Zuhandenheit), receding from conscious attention. Only when it breaks does it become "present-at-hand" (Vorhandenheit), an object of scrutiny.

Templates built on Canon embody this principle. Users come to run their business, not to navigate a website. Every element must earn its existence or be removed.

```
User intent: "Book an appointment"
     ↓
Interface: Shows the form. User books. Done.
     ↓
No: decorative animations, marketing interruptions,
    unnecessary confirmations, cognitive overhead
```

---

## The Subtractive Triad

Every design decision passes through three questions:

| Level | Discipline | Question | Action |
|-------|------------|----------|--------|
| **Implementation** | DRY | "Have I built this before?" | Unify |
| **Artifact** | Dieter Rams | "Does this earn its existence?" | Remove |
| **System** | Heidegger | "Does this serve the whole?" | Reconnect |

### Applied to Templates

1. **DRY**: Shared components across verticals (Button, Card, Section)
2. **Rams**: Each component serves a clear purpose—nothing decorative
3. **Heidegger**: Every template connects back to the Canon philosophy

---

## Canon Token System

Canon tokens are the **single source of truth** for all design decisions. They encode philosophy into CSS custom properties.

### Why Tokens?

Tokens prevent design drift. When values are hardcoded, entropy wins:

```css
/* Without tokens: drift and inconsistency */
.button-a { border-radius: 8px; }
.button-b { border-radius: 10px; }
.button-c { border-radius: 0.5rem; }

/* With Canon: unified intent */
.button { border-radius: var(--radius-md); }
```

### The Golden Ratio (φ = 1.618)

Spacing follows the golden ratio, creating natural visual rhythm:

| Token | Value | Calculation |
|-------|-------|-------------|
| `--space-xs` | 0.5rem | φ⁻² |
| `--space-sm` | 1rem | φ⁻¹ |
| `--space-md` | 1.618rem | φ⁰ |
| `--space-lg` | 2.618rem | φ¹ |
| `--space-xl` | 4.236rem | φ² |
| `--space-2xl` | 6.854rem | φ³ |

This isn't arbitrary aesthetics—it's mathematics. The golden ratio appears throughout nature because it represents optimal growth. Our spacing embodies the same principle.

---

## Tailwind for Structure, Canon for Aesthetics

This architecture separates concerns:

**Tailwind handles structure:**
- Flexbox and Grid layout
- Positioning (relative, absolute, fixed)
- Sizing (width, height, padding, margin)
- Responsive breakpoints

**Canon handles aesthetics:**
- Colors (backgrounds, text, borders)
- Typography (sizes, weights, line-heights)
- Shadows and elevation
- Border radii
- Animations and timing

### The Pattern

```svelte
<!-- Structure: Tailwind | Aesthetics: Canon -->
<div class="flex items-center gap-4 p-6 card">
  <span class="label">{title}</span>
</div>

<style>
  .card {
    border-radius: var(--radius-lg);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
  }
  .label {
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
  }
</style>
```

Why this split?

1. **Tailwind excels at structural utilities** — they're composable and context-free
2. **Canon excels at design coherence** — values are semantic, not arbitrary
3. **Mixing them creates fragility** — `bg-gray-900` can't adapt to theme changes

---

## Motion Philosophy

Motion must be **functional**, never decorative.

### Functional Motion
- **Confirms user action**: Button press feedback
- **Shows state change**: Loading indicators
- **Guides attention**: Reveal animations
- **Provides orientation**: Page transitions

### Decorative Motion (Avoid)
- Animations that play regardless of user action
- Motion that slows task completion
- Effects added "because they look cool"
- Anything that doesn't answer: "What does this help the user understand?"

### Timing Tokens

| Token | Duration | Use Case |
|-------|----------|----------|
| `--duration-instant` | 100ms | Immediate feedback (clicks) |
| `--duration-micro` | 200ms | Micro-interactions (hovers) |
| `--duration-fast` | 300ms | State changes |
| `--duration-standard` | 400ms | Content reveals |
| `--duration-complex` | 500ms | Multi-part animations |

### Reduced Motion

Always respect user preferences:

```css
@media (prefers-reduced-motion: reduce) {
  .animated-element {
    animation: none;
    transition: none;
  }
}
```

---

## Color Philosophy

### Functional Minimalism

Colors serve information hierarchy, not decoration:

| Token | Purpose |
|-------|---------|
| `--color-fg-primary` | Main content |
| `--color-fg-secondary` | Supporting content |
| `--color-fg-tertiary` | De-emphasized content |
| `--color-fg-muted` | Hints and metadata |

### Semantic Colors

Used sparingly, only when meaning requires:

| Token | Meaning |
|-------|---------|
| `--color-success` | Positive outcome |
| `--color-error` | Error state |
| `--color-warning` | Caution required |
| `--color-info` | Neutral information |

---

## Component Design Principles

### 1. Earn Existence

Every component answers: "What user problem does this solve?"

Components that don't solve problems get removed.

### 2. Single Responsibility

Each component does one thing well:
- `Button` → triggers actions
- `Card` → groups related content
- `Section` → provides vertical rhythm

### 3. Composition Over Configuration

Prefer composing simple components over configuring complex ones:

```svelte
<!-- Composition: Clear, flexible -->
<Card>
  <CardHeader>Title</CardHeader>
  <CardBody>Content</CardBody>
</Card>

<!-- Configuration: Hidden complexity -->
<Card title="Title" body="Content" showHeader={true} />
```

### 4. Progressive Disclosure

Show the minimum by default. Reveal complexity only when needed.

---

## Implementation Checklist

When building template features:

- [ ] Does this serve the user's primary task?
- [ ] Can this be achieved with existing components?
- [ ] Are all design values using Canon tokens?
- [ ] Is structural layout using Tailwind utilities?
- [ ] Does motion serve a functional purpose?
- [ ] Is reduced motion respected?
- [ ] Does this pass the Subtractive Triad?

---

## Further Reading

- [Dieter Rams: Ten Principles for Good Design](https://www.vitsoe.com/us/about/good-design)
- [Heidegger: Being and Time (Division One, Chapter Three)](https://en.wikipedia.org/wiki/Being_and_Time)
- [CREATE SOMETHING Canon](https://createsomething.ltd/standards)

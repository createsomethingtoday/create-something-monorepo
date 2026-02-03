# Canon Design Influences

The Canon design system draws from four primary influences, each addressing a different dimension of design:

## The Four Masters

| Master | Domain | Question Answered | Shorthand |
|--------|--------|-------------------|-----------|
| **Edward Tufte** | Static visualization | "How much information?" | Tufte clarity |
| **Dieter Rams** | Physical products | "How much form?" | Rams minimalism |
| **Martin Heidegger** | Philosophy | "Why does the tool recede?" | Heideggerian dwelling |
| **Jony Ive** | Digital interfaces | "How does the transition feel?" | Ive motion |

## Why Each Master

### Tufte (Information)
- Maximize data-ink ratio
- Remove chartjunk
- Domain: Print, static charts, information visualization
- **Not motion**: His work is fundamentally about static representations

### Rams (Form)
- "Weniger, aber besser" (less, but better)
- 10 Principles of Good Design
- Domain: Physical industrial design (Braun, Vitsoe)
- **Not motion**: A Braun radio doesn't animate—it exists beautifully in space

### Heidegger (Philosophy)
- Zuhandenheit (ready-to-hand): Tools recede into use
- Gelassenheit: Neither rejection nor submission to technology
- Domain: Phenomenology, ontology
- **Not aesthetics**: Explains *why* good motion feels invisible, not *what* it looks like

### Ive (Motion)
- Purposeful motion, physics-based feedback
- Depth through translucency
- Domain: Digital interfaces (iOS, macOS)
- **The only one who worked on motion in digital interfaces**

## Ive's Lineage

Ive synthesized multiple traditions into digital motion:

```
Rams (form) ─────────────────┐
                             ├──→ Ive (digital synthesis)
Disney (motion principles) ──┤
                             │
Mechanical craft tradition ──┘
```

### Predecessors

| Domain | Originator | Contribution |
|--------|------------|--------------|
| Form | Dieter Rams | "Weniger, aber besser" |
| Animation principles | Frank Thomas & Ollie Johnston | Disney's 12 Principles (1981) |
| Physics-based feel | Mechanical craft tradition | Watchmaking, automotive, audio |

### Disney's 12 Principles → iOS Motion

From Thomas & Johnston's *The Illusion of Life*:

| Disney Principle | iOS Implementation |
|------------------|-------------------|
| Ease in/out | `ease-in-out` curves, spring dynamics |
| Anticipation | Button press feedback before action |
| Follow-through | Bounce at scroll boundaries |
| Timing | Careful 200ms/300ms durations |
| Secondary action | Parallax depth, subtle shadows |

### The Mechanical Tradition

For the *feel* of quality:
- **Swiss watchmaking**: Precision movements
- **Automotive**: How a Porsche door closes
- **High-end audio**: Braun, B&O tactile controls

Ive brought the feel of precision mechanical objects to digital interfaces.

## Prompt Usage

When generating motion/animation:
- **Say "Jony Ive"** or **"Ive motion"** to activate physics-based, purposeful animation
- **Don't say "Apple Motion"** (that's a different product—motion graphics software)
- The term activates: restraint, purpose, physics-based feel, state communication

When generating other aspects:
- **"Tufte"** → Information clarity, data-ink ratio
- **"Rams"** → Form reduction, "does this earn its existence?"
- **"Heidegger"** → Tool recession, serving the whole

## Canon Motion Principles (Ive-derived)

| Principle | Implementation |
|-----------|----------------|
| Purposeful | Animation communicates state, not decoration |
| Physics-based | Lerp-based easing, spring-like deceleration |
| Restrained | `--duration-micro` (200ms) for most interactions |
| Reducible | Respect `prefers-reduced-motion` |

### Anti-patterns
- Decorative animation (bouncing icons, pulsing elements)
- Duration > 500ms (feels sluggish)
- Animation that demands attention rather than guiding it
- Mixed easing curves (breaks motion coherence)

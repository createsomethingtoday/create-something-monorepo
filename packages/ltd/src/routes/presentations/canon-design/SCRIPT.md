# SCRIPT.md — CANON: DESIGN

## Recording Notes

**Duration**: ~20 minutes
**Pace**: Visual and concrete. You're teaching a system.
**Tone**: Precise but warm. Design decisions have reasons.

---

## Narration Markup Reference

| Markup | Meaning | Example |
|--------|---------|---------"|
| `[PAUSE]` | Brief pause (1 second) | "Less, but better. [PAUSE] That's it." |
| `[PAUSE 2s]` | Explicit duration pause | "The tool should disappear. [PAUSE 2s]" |
| `[BEAT]` | Dramatic beat (1.5 seconds) | "Not addition. [BEAT] Subtraction." |
| `[BREATHE]` | Take a breath, gather | "[BREATHE] Now let me explain..." |
| `[SLOW]...[/SLOW]` | Slower, deliberate pacing | "[SLOW]Weniger, aber besser.[/SLOW]" |
| `[QUOTE]...[/QUOTE]` | Read as quotation (different register) | "[QUOTE]The hammer disappears into use.[/QUOTE]" |
| `*emphasis*` | Vocal stress on word | "This is *one* principle at *three* scales." |
| `{stage direction}` | Visual/action note | "{slide transition}" |
| `↗` | Rising intonation (question) | "Have I built this before↗" |
| `↘` | Falling intonation (statement) | "Unify↘" |
| `—` | Em-dash = brief pause + emphasis | "Not addition—subtraction." |

---

## Slide 1: Title [0:00]

{slide appears}

[BREATHE]

Canon: Design.

[PAUSE]

Design tokens from philosophy. [PAUSE] Aesthetic coherence across the monorepo.

[PAUSE 2s]

By the end of this presentation, you'll understand how Canon works—and why every design decision traces back to first principles.

{hold 2 seconds on title}

---

## Slide 2: The Principle [1:30]

{slide transition}

[BREATHE]

The core principle: [SLOW]Tailwind for structure, Canon for aesthetics.[/SLOW]

[PAUSE]

Tailwind handles composition and layout. [PAUSE] Flex, grid, padding, margin.

Canon handles color, typography, motion. [PAUSE] The visual identity.

[PAUSE 2s]

Coherence emerges through tokens, not through mixing utility classes.

[PAUSE]

Design tokens are design philosophy made *visible*.

---

## Slide 3: The Subtractive Triad [3:00]

{slide transition}

Every design decision passes through three filters.

[BREATHE]

DRY at the implementation level—eliminate duplication in code.

Rams at the artifact level—eliminate excess in design.

Heidegger at the system level—eliminate disconnection in meaning.

[PAUSE 2s]

Creation is the discipline of removing what obscures.

[PAUSE]

This applies to design decisions just as much as code decisions.

---

## Slide 4: Quote - Rams [4:15]

{slide transition}

[BREATHE]

Dieter Rams gave us the foundation.

[QUOTE]
[SLOW]"Weniger, aber besser."[/SLOW]
[/QUOTE]

[PAUSE 2s]

Fewer things, but better things.

[PAUSE]

This is the essence of Canon design. [PAUSE] Not minimalism for its own sake—minimalism in service of clarity.

---

## Slide 5: Token Categories [5:30]

{slide transition}

[BREATHE]

Design tokens organize into five categories.

[PAUSE]

Colors—foreground, background, semantic, data visualization.

Typography—display, heading, body, caption.

Spacing—golden ratio proportions.

Radius—border radius scale.

Motion—duration, easing, timing.

[PAUSE 2s]

Each category has a complete vocabulary. Learn the vocabulary, and coherence follows.

---

## Slide 6: Colors - The Hierarchy [6:45]

{slide transition - ASCII diagram appears}

[BREATHE]

Here's the color hierarchy.

[PAUSE]

Background colors graduate from pure black through elevated, surface, to subtle. [PAUSE] Each level adds light.

Foreground colors start at pure white, then step down—secondary at 80%, tertiary at 60%, muted at 46%, subtle at 20%.

[PAUSE]

Border colors follow the same pattern—default, emphasis, strong.

[PAUSE 2s]

Notice: muted is 46%. [PAUSE] That's precisely WCAG AA compliant for contrast. Not arbitrary.

---

## Slide 7: Semantic Colors [8:00]

{slide transition}

[BREATHE]

Beyond neutral grays, semantic colors carry meaning.

[PAUSE]

Success—green—7.08 to 1 contrast.

Error—red—4.97 to 1 contrast.

Warning—amber—6.31 to 1 contrast.

Info—blue—5.23 to 1 contrast.

[PAUSE 2s]

All WCAG AA compliant on pure black. [PAUSE] Each includes muted and border variants.

[PAUSE]

Accessibility isn't an afterthought. It's built into the tokens.

---

## Slide 8: Spacing — Golden Ratio [9:15]

{slide transition}

[BREATHE]

Spacing tokens follow the golden ratio. [PAUSE] Phi equals 1.618.

[PAUSE]

`--space-xs` is 0.5 rem.
`--space-sm` is 1 rem.
`--space-md` is 1.618 rem.
`--space-lg` is 2.618 rem.
`--space-xl` is 4.236 rem.
`--space-2xl` is 6.854 rem.

[PAUSE 2s]

Each step multiplies by phi. [PAUSE] Natural proportions create visual rhythm—without thinking about it.

[PAUSE]

When you use `--space-md`, you're using mathematics that's been aesthetically validated for millennia.

---

## Slide 9: Typography Scale [10:45]

{slide transition - ASCII diagram appears}

[BREATHE]

Typography follows a responsive scale.

[PAUSE]

Display sizes use clamp functions—they scale fluidly between viewport sizes.

[PAUSE]

`--text-display-xl` starts at 3.5 rem, scales up to 7 rem.

`--text-display` starts at 2.5 rem, scales up to 5 rem.

Headings—H1, H2, H3—follow the same fluid pattern.

[PAUSE]

Body sizes are fixed. 1.125 rem for large, 1 rem for standard, 0.875 rem for small.

Caption is 0.75 rem.

[PAUSE 2s]

The scale ensures readability at every viewport width.

---

## Slide 10: Motion — Purposeful, Not Decorative [12:00]

{slide transition}

[BREATHE]

Motion should reveal state changes, not seek attention.

[PAUSE]

`--duration-micro` is 200 milliseconds. [PAUSE] Use for hover states, toggles, micro-interactions.

`--duration-standard` is 300 milliseconds. [PAUSE] Use for page transitions, modals.

`--duration-complex` is 500 milliseconds. [PAUSE] Use for orchestrated sequences.

[PAUSE 2s]

One easing curve for everything: `--ease-standard`. [PAUSE] Cubic bezier 0.4, 0, 0.2, 1.

[PAUSE]

Consistency in motion creates coherence in experience.

---

## Slide 11: Motion Anti-Patterns [13:15]

{slide transition}

[BREATHE]

What *not* to do.

[PAUSE]

Don't animate for decoration. [PAUSE] No bouncing icons, no pulsing elements.

Don't exceed 500 milliseconds. [PAUSE] It feels sluggish.

Don't use custom easing curves. [PAUSE] It breaks coherence.

Don't animate layout properties. [PAUSE] Use transform instead.

Don't auto-play animations without user trigger.

[PAUSE 2s]

When in doubt, don't animate. [PAUSE] The tool recedes when it's transparent.

---

## Slide 12: The Decision Tree [14:30]

{slide transition - ASCII diagram appears}

[BREATHE]

Here's how to decide what to use.

[PAUSE]

Is the value dynamic—computed at runtime↗ [PAUSE] Use inline style with CSS custom property.

Is it a layout or structure concern↗ [PAUSE] Use Tailwind utility.

Is it a design or aesthetic concern↗ [PAUSE] Use Canon token in a style block.

[PAUSE 2s]

Three approaches. Clear boundaries. No confusion.

---

## Slide 13: The Hybrid Pattern [15:45]

{slide transition}

[BREATHE]

Most components use all three approaches together.

[PAUSE]

Tailwind for composition: `flex items-center gap-4 p-6`

Canon for design: `background: var(--color-bg-surface)`

Inline styles for dynamic values: `style="--delay: {index * 100}ms"`

[PAUSE 2s]

Structure, aesthetics, and dynamics in harmony.

[PAUSE]

The approaches complement each other. They don't compete.

---

## Slide 14: Common Violations [17:00]

{slide transition}

[BREATHE]

What breaks Canon coherence.

[PAUSE]

Hardcoded colors. [PAUSE] `bg-white/10` instead of `var(--color-bg-surface)`.

Inline styles for static values. [PAUSE] `style="border-radius: 12px"` instead of `var(--radius-lg)`.

Arbitrary typography. [PAUSE] `text-3xl` instead of `var(--text-h2)`.

Utility classes for motion. [PAUSE] `transition: all 0.2s` instead of Canon tokens.

[PAUSE 2s]

Use the `/audit-canon` skill to detect violations automatically.

---

## Slide 15: The Audit Skill [18:30]

{slide transition}

[BREATHE]

Before merging, run the Canon audit.

[PAUSE]

`/audit-canon packages/io/src/routes/experiment`

[PAUSE]

It detects hardcoded colors, improper typography, missing tokens.

It ensures the "Tailwind for structure, Canon for aesthetics" principle.

It returns structured feedback on violations.

[PAUSE 2s]

Design tokens are philosophy made *executable*.

[PAUSE]

The audit ensures philosophy persists through implementation.

[BEAT]

That's Canon. Design coherence from first principles.

{hold on final slide}

[END]

---

## Post-Production Notes

### Audio Cleanup
- Remove mouth clicks
- Normalize audio levels
- Add subtle room tone between sections

### Visual Sync
- Ensure slide transitions align with `{slide transition}` markers
- Add fade transitions (300ms) at section breaks
- Consider subtle zoom on ASCII diagrams

### Accessibility
- Generate captions from script
- Ensure captions include pause markers as `[...]`
- Verify contrast on all slides

---

## Narration Checklist

Before recording:

- [ ] Room is quiet (no HVAC, no fans)
- [ ] Microphone positioned correctly
- [ ] Water available (avoid mouth sounds)
- [ ] Script printed or on teleprompter
- [ ] Practiced full read-through once

During recording:

- [ ] Maintain consistent distance from microphone
- [ ] Pause fully at `[PAUSE]` markers
- [ ] Slow down at `[SLOW]` sections
- [ ] Breathe at `[BREATHE]` markers
- [ ] Emphasize `*words*` with vocal stress

After recording:

- [ ] Review for clarity and pacing
- [ ] Check for mouth sounds or clicks
- [ ] Verify all 15 slides covered
- [ ] Run /audit-voice on transcript

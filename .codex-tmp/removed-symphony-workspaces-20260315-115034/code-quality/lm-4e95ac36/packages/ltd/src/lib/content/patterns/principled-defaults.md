---
title: "Principled Defaults"
subtitle: "Every configuration value traces to a principle. No arbitrary numbers.
			20px padding—why 20? If you can't answer, it's decoration."
category: "Pattern"
published: true
publishedAt: "2025-01-08"
---



> "Indifference towards people and the reality in which they live
				is actually the one and only cardinal sin in design."



## Definition
Principled Defaultsmeans every value in a system can be
				traced to a reason. Not "20px because it looks good" but "20px because
				it's the base unit (16px) multiplied by 1.25 (minor third)."

This isn't pedantry—it's design honesty. Arbitrary values are hidden opinions.
				Principled values are explicit decisions. When you can explain why, you can
				also explain when to deviate and when not to.

The CREATE SOMETHING design system derives all values from principles:
				typography from readability research, spacing from mathematical ratios,
				colors from functional meaning. Nothing is arbitrary. Everything traces.

"If you can't explain the principle behind the value, the value is arbitrary."


> "If you can't explain the principle behind the value, the value is arbitrary."



## Principles
Line height, measure (line length), and font size derive from readability
					studies. Optimal reading: 16-20px body, 45-75 characters per line, 1.5-1.6 line height.

✓ Body: 18px (within 16-20px optimal)

✓ Measure: 65ch (within 45-75ch optimal)

✓ Line height: 1.6 (within 1.5-1.6 optimal)

Use mathematical ratios: golden ratio (1.618), modular scales,
					or consistent base units. Spacing values should relate to each other.

✓ Base unit: 16px

✓ Scale: × 0.618, × 1, × 1.618, × 2.618

✓ All spacing derived from scale (10px, 16px, 26px, 42px)

Colors should have meaning, not just aesthetics. Error is red not because
					red is pretty but because red signals danger. Green means success.

✓ Primary: white (pure information)

✓ Secondary: white/80 (supporting content)

✓ Muted: white/40 (de-emphasized)

Document the principle behind each value. If a value can't be traced,
					question whether it should exist.

✓ Design tokens with documented rationale

✓ Comments explaining "why" not "what"

✓ Review process that questions arbitrary values



## When to Apply
- • Creating design systems
- • Establishing configuration defaults
- • Values will be reused across projects
- • Multiple people will make design decisions
- • Consistency matters long-term

- • Practical constraints (sometimes 20px just works)
- • Exploration phase (find principles through iteration)
- • Context-specific overrides
- • Pragmatism over dogmatism



## Derivation Example

| Token | Value | Derivation |
|---|---|---|
| --space-xs | 10px | 16 × 0.618 ≈ 10 |
| --space-sm | 16px | Base unit (1rem) |
| --space-md | 26px | 16 × 1.618 ≈ 26 |
| --space-lg | 42px | 16 × 2.618 ≈ 42 |
| --space-xl | 68px | 16 × 4.236 ≈ 68 |



## Related Patterns
Principles become constraints. Derivation rules limit options, enabling focus.

Principled defaults require less adjustment, enabling tool-dwelling.




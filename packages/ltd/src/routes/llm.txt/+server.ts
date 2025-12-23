/**
 * LLM.txt Endpoint
 *
 * Static text endpoint providing CREATE SOMETHING design context
 * for AI agents. Plain text optimized for LLM context windows.
 *
 * Philosophy: Taste is cultivated in Are.na. This exposes it to
 * agents who lack vision but need aesthetic guidance.
 */

import type { RequestHandler } from './$types';

const LLM_CONTEXT = `# CREATE SOMETHING Design Context

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
`;

export const GET: RequestHandler = async () => {
	return new Response(LLM_CONTEXT, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
		}
	});
};

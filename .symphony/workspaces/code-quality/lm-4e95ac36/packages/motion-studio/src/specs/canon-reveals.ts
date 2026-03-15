/**
 * Canon Reveal Text Animation Spec
 * 
 * Text reveal styles aligned with Canon philosophy.
 * Used by both Svelte (CanonReveal.svelte) and Remotion (KineticText.tsx).
 */

export interface CanonRevealStyle {
  id: 'decode' | 'unconcealment' | 'typewriter' | 'threshold' | 'mask';
  label: string;
  text: string;
  philosophy: string;
  duration: number; // ms
}

/**
 * The five Canon-aligned text reveal styles
 * 
 * Each style embodies an aspect of the Subtractive Triad:
 * - decode: Noise resolves to signal (DRY - pattern recognition)
 * - unconcealment: Truth emerges from concealment (Heidegger)
 * - typewriter: Meditative, deliberate reveal (Terminal-first)
 * - threshold: Binary presence (Rams - less but better)
 * - mask: Text was always there (Subtractive - unveiling)
 */
export const canonRevealStyles: CanonRevealStyle[] = [
  {
    id: 'decode',
    label: 'DECODE',
    text: 'CREATION IS SUBTRACTION',
    philosophy: 'Cipher resolves — The signal emerges from noise',
    duration: 3000,
  },
  {
    id: 'unconcealment',
    label: 'UNCONCEALMENT',
    text: 'Truth emerges from what conceals it.',
    philosophy: 'Heidegger — The meaning was always there',
    duration: 3000,
  },
  {
    id: 'typewriter',
    label: 'TYPEWRITER',
    text: '$ echo "less, but better"',
    philosophy: 'Terminal-first — Meditative, deliberate',
    duration: 3000,
  },
  {
    id: 'threshold',
    label: 'THRESHOLD',
    text: 'Present or absent.',
    philosophy: 'Rams — Binary. No animation. Just presence.',
    duration: 1500,
  },
  {
    id: 'mask',
    label: 'MASK',
    text: 'Weniger, aber besser.',
    philosophy: 'The text was always there — We just unveiled it',
    duration: 1500,
  },
];

/**
 * Get a canon reveal style by ID
 */
export function getCanonRevealStyle(id: string): CanonRevealStyle | undefined {
  return canonRevealStyles.find(s => s.id === id);
}

export default canonRevealStyles;

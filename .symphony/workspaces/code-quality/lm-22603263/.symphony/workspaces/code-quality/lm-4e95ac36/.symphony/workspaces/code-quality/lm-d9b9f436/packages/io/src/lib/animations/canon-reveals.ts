/**
 * Canon Reveal Text Animation Spec
 * 
 * Single source of truth for text reveal styles.
 * Mirrors motion-studio/src/specs/canon-reveals.ts
 */

export interface CanonRevealStyle {
  id: 'decode' | 'unconcealment' | 'typewriter' | 'threshold' | 'mask';
  label: string;
  text: string;
  philosophy: string;
  duration: number;
}

/**
 * Canon-aligned text reveals
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

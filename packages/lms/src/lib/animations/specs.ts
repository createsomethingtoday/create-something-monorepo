/**
 * Animation Specs for LMS
 * 
 * Shared animation specifications matching motion-studio/src/specs.
 * Single source of truth for timing, phases, and reveal text.
 * 
 * When updating animations, update both here AND in motion-studio/src/specs.
 */

export interface AnimationSpec {
  id: string;
  name: string;
  description: string;
  duration: number;
  canvas: {
    width: number;
    height: number;
    background: string;
  };
  phases: {
    id: string;
    label: string;
    start: number;
    end: number;
  }[];
  reveal?: {
    text: string;
    startPhase: number;
  };
}

/**
 * Tool Receding - Heidegger's ready-to-hand concept
 * The hammer disappears when hammering.
 */
export const toolRecedingSpec: AnimationSpec = {
  id: 'tool-receding',
  name: 'Tool Receding',
  description: "The hammer disappears when hammering. Heidegger's Zuhandenheit.",
  duration: 5000,
  canvas: {
    width: 800,
    height: 450,
    background: '#000000',
  },
  phases: [
    { id: 'vorhandenheit', label: 'VORHANDENHEIT — Present-at-hand', start: 0, end: 0.2 },
    { id: 'transition', label: 'TRANSITION — Focus shifts', start: 0.2, end: 0.7 },
    { id: 'zuhandenheit', label: 'ZUHANDENHEIT — Ready-to-hand', start: 0.7, end: 1 },
  ],
  reveal: {
    text: 'The hammer disappears when hammering.',
    startPhase: 0.7,
  },
};

/**
 * IDE vs Terminal - From chrome to canvas
 * Watch the interface dissolve.
 */
export const ideVsTerminalSpec: AnimationSpec = {
  id: 'ide-vs-terminal',
  name: 'IDE vs Terminal',
  description: 'From chrome to canvas. Watch the interface dissolve.',
  duration: 5000,
  canvas: {
    width: 800,
    height: 450,
    background: '#000000',
  },
  phases: [
    { id: 'ide', label: 'IDE — Chrome everywhere', start: 0, end: 0.2 },
    { id: 'dissolving', label: 'DISSOLVING — Removing what obscures', start: 0.2, end: 0.6 },
    { id: 'terminal', label: 'TERMINAL — Only the canvas remains', start: 0.6, end: 1 },
  ],
  reveal: {
    text: 'The blank canvas.',
    startPhase: 0.8,
  },
};

/**
 * Canon Reveal Text Animation Spec
 * Text reveals aligned with Canon philosophy
 */
export interface CanonRevealStyle {
  id: string;
  label: string;
  text: string;
  philosophy: string;
  duration: number; // ms
}

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
 * Subtractive Triad - Creation is removing what obscures
 * The marble dissolves to reveal the sculpture within.
 */
export const subtractiveTriadSpec: AnimationSpec = {
  id: 'subtractive-triad',
  name: 'Subtractive Triad',
  description: 'Creation is the discipline of removing what obscures.',
  duration: 6000,
  canvas: {
    width: 800,
    height: 450,
    background: '#000000',
  },
  phases: [
    { id: 'obscured', label: 'OBSCURED — Hidden in noise', start: 0, end: 0.2 },
    { id: 'dry', label: 'DRY — Remove duplication', start: 0.2, end: 0.4 },
    { id: 'rams', label: 'RAMS — Remove excess', start: 0.4, end: 0.6 },
    { id: 'heidegger', label: 'HEIDEGGER — Remove disconnection', start: 0.6, end: 0.8 },
    { id: 'revealed', label: 'REVEALED — The essential remains', start: 0.8, end: 1 },
  ],
  reveal: {
    text: 'Creation is subtraction.',
    startPhase: 0.85,
  },
};

/**
 * Marble to David - Michelangelo's insight visualized
 * Chipping away to reveal what was always there.
 */
export const marbleToDavidSpec: AnimationSpec = {
  id: 'marble-to-david',
  name: 'Marble to David',
  description: "I saw the angel in the marble and carved until I set him free.",
  duration: 5000,
  canvas: {
    width: 800,
    height: 450,
    background: '#000000',
  },
  phases: [
    { id: 'marble', label: 'THE MARBLE — Potential hidden', start: 0, end: 0.25 },
    { id: 'carving', label: 'CARVING — Removing what is not David', start: 0.25, end: 0.75 },
    { id: 'revealed', label: 'DAVID — Was always there', start: 0.75, end: 1 },
  ],
  reveal: {
    text: 'The angel was always in the marble.',
    startPhase: 0.8,
  },
};

/**
 * Animation Specs Registry
 */
export const animationSpecs: Record<string, AnimationSpec> = {
  'ToolReceding': toolRecedingSpec,
  'tool-receding': toolRecedingSpec,
  'IDEvsTerminal': ideVsTerminalSpec,
  'ide-vs-terminal': ideVsTerminalSpec,
  'SubtractiveTriad': subtractiveTriadSpec,
  'subtractive-triad': subtractiveTriadSpec,
  'MarbleToDavid': marbleToDavidSpec,
  'marble-to-david': marbleToDavidSpec,
};

/**
 * Get the current phase for a given progress value
 */
export function getCurrentPhase(spec: AnimationSpec, progress: number) {
  return spec.phases.find(p => progress >= p.start && progress < p.end) 
    ?? spec.phases[spec.phases.length - 1];
}

/**
 * Get reveal text opacity based on progress
 */
export function getRevealOpacity(spec: AnimationSpec, progress: number): number {
  if (!spec.reveal) return 0;
  if (progress < spec.reveal.startPhase) return 0;
  return (progress - spec.reveal.startPhase) / (1 - spec.reveal.startPhase);
}

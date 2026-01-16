/**
 * Animation Spec Types
 * 
 * Shared schema for defining animations that can be rendered
 * by both Svelte (web) and Remotion (video).
 * 
 * Philosophy: The spec describes WHAT happens, not HOW.
 * Each renderer interprets the spec for its medium.
 */

export interface AnimationSpec {
  id: string;
  name: string;
  description: string;
  
  // Timing
  duration: number; // Total duration in ms
  fps?: number; // For video rendering (default: 30)
  
  // Canvas
  canvas: {
    width: number;
    height: number;
    background: string;
  };
  
  // Phases divide the animation into semantic chunks
  phases: AnimationPhase[];
  
  // Elements to render
  elements: AnimationElement[];
  
  // Final reveal text (if any)
  reveal?: {
    text: string;
    style: 'fade' | 'mask' | 'typewriter';
    startPhase: number; // 0-1 progress when text appears
  };
}

export interface AnimationPhase {
  id: string;
  label: string;
  start: number; // 0-1 progress
  end: number; // 0-1 progress
}

export type AnimationElement = 
  | RectElement 
  | CircleElement 
  | TextElement 
  | GroupElement
  | CustomElement;

interface BaseElement {
  id: string;
  type: string;
  // Position (can be absolute or relative)
  position: {
    x: number | string; // number = px, string = percentage or 'center'
    y: number | string;
    anchor?: 'center' | 'top-left' | 'bottom-center';
  };
  // Animations keyed by progress (0-1)
  keyframes: Keyframe[];
}

export interface Keyframe {
  at: number; // 0-1 progress
  opacity?: number;
  scale?: number;
  blur?: number;
  x?: number;
  y?: number;
  rotation?: number;
  // Easing to this keyframe (default: 'ease-out')
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface RectElement extends BaseElement {
  type: 'rect';
  width: number;
  height: number;
  fill: string;
  borderRadius?: number;
}

export interface CircleElement extends BaseElement {
  type: 'circle';
  radius: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  fontSize: number;
  fontWeight?: number;
  fontFamily?: 'sans' | 'mono';
  color: string;
  align?: 'left' | 'center' | 'right';
}

export interface GroupElement extends BaseElement {
  type: 'group';
  children: AnimationElement[];
}

export interface CustomElement extends BaseElement {
  type: 'custom';
  component: string; // Name of custom component to use
  props: Record<string, unknown>;
}

/**
 * Interpolate a value between keyframes at a given progress
 */
export function interpolateKeyframes(
  keyframes: Keyframe[],
  progress: number,
  property: keyof Omit<Keyframe, 'at' | 'easing'>
): number | undefined {
  if (keyframes.length === 0) return undefined;
  
  // Find surrounding keyframes
  let before: Keyframe | null = null;
  let after: Keyframe | null = null;
  
  for (const kf of keyframes) {
    if (kf.at <= progress) {
      before = kf;
    }
    if (kf.at >= progress && !after) {
      after = kf;
    }
  }
  
  // If no keyframes found, return undefined
  if (!before && !after) return undefined;
  
  // If only before, use its value
  if (!after) return before?.[property] as number | undefined;
  
  // If only after, use its value
  if (!before) return after[property] as number | undefined;
  
  // If same keyframe, use its value
  if (before === after) return before[property] as number | undefined;
  
  // Interpolate between keyframes
  const beforeValue = before[property] as number | undefined;
  const afterValue = after[property] as number | undefined;
  
  if (beforeValue === undefined) return afterValue;
  if (afterValue === undefined) return beforeValue;
  
  const localProgress = (progress - before.at) / (after.at - before.at);
  
  // Apply easing
  const easedProgress = applyEasing(localProgress, after.easing || 'ease-out');
  
  return beforeValue + (afterValue - beforeValue) * easedProgress;
}

function applyEasing(t: number, easing: string): number {
  switch (easing) {
    case 'linear':
      return t;
    case 'ease-in':
      return t * t;
    case 'ease-out':
      return 1 - (1 - t) * (1 - t);
    case 'ease-in-out':
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    default:
      return t;
  }
}

/**
 * Get the current phase label at a given progress
 */
export function getCurrentPhase(spec: AnimationSpec, progress: number): AnimationPhase | undefined {
  return spec.phases.find(p => progress >= p.start && progress < p.end);
}

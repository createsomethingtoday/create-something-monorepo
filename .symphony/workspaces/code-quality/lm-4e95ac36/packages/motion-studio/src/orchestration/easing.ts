/**
 * Easing Utilities
 * 
 * Bezier curves and spring configurations for Remotion.
 * Canon-compliant timing that respects the content.
 */
import { Easing } from 'remotion';

/**
 * Canon easing curves as Remotion-compatible functions
 */
export const easeIn = Easing.bezier(0.4, 0, 1, 1);
export const easeOut = Easing.bezier(0, 0, 0.2, 1);
export const easeInOut = Easing.bezier(0.4, 0, 0.2, 1);

/**
 * Vox-style "snappy" easing
 */
export const easeSnappy = Easing.bezier(0.4, 0, 0.2, 1);

/**
 * Smooth deceleration for reveals
 */
export const easeReveal = Easing.bezier(0, 0, 0.2, 1);

/**
 * Spring configuration type
 */
export interface SpringConfig {
  damping: number;
  mass: number;
  stiffness: number;
}

/**
 * Pre-defined spring configurations
 */
export const springConfig = {
  /**
   * Default - balanced spring for most animations
   */
  default: {
    damping: 20,
    mass: 0.5,
    stiffness: 100,
  } as SpringConfig,
  
  /**
   * Gentle - slow, soft spring for subtle reveals
   */
  gentle: {
    damping: 30,
    mass: 1,
    stiffness: 60,
  } as SpringConfig,
  
  /**
   * Snappy - quick, responsive spring for interactions
   */
  snappy: {
    damping: 15,
    mass: 0.4,
    stiffness: 150,
  } as SpringConfig,
  
  /**
   * Bouncy - playful spring with overshoot
   */
  bouncy: {
    damping: 10,
    mass: 0.5,
    stiffness: 120,
  } as SpringConfig,
  
  /**
   * Heavy - slow, weighted spring for large elements
   */
  heavy: {
    damping: 25,
    mass: 1.5,
    stiffness: 80,
  } as SpringConfig,
  
  /**
   * Vox - the signature Vox feel (snappy but controlled)
   */
  vox: {
    damping: 18,
    mass: 0.6,
    stiffness: 110,
  } as SpringConfig,
} as const;

/**
 * Create a custom spring config
 */
export function createSpring(
  damping: number,
  stiffness: number,
  mass = 0.5
): SpringConfig {
  return { damping, stiffness, mass };
}

/**
 * Interpolate between spring configs
 */
export function blendSpring(
  a: SpringConfig,
  b: SpringConfig,
  t: number
): SpringConfig {
  return {
    damping: a.damping + (b.damping - a.damping) * t,
    mass: a.mass + (b.mass - a.mass) * t,
    stiffness: a.stiffness + (b.stiffness - a.stiffness) * t,
  };
}

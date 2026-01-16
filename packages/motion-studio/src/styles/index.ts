/**
 * Canon Design Tokens for React/Remotion
 * 
 * Bridge between Canon's Svelte-based design system and React components.
 * "Weniger, aber besser" - the same tokens, different runtime.
 */

/**
 * Canon color palette
 * Matches packages/components/src/lib/tokens/colors.ts
 */
export const colors = {
  // Neutral scale
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },
  
  // Property accent colors
  accent: {
    space: '#3b82f6',    // Blue - Practice
    io: '#22c55e',       // Green - Research
    agency: '#f59e0b',   // Amber - Services
    ltd: '#8b5cf6',      // Purple - Philosophy
  },
  
  // Semantic colors
  semantic: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  
  // Vox-style accent (yellow/gold)
  vox: {
    accent: '#fbbf24',
    accentMuted: '#fcd34d',
  },
} as const;

/**
 * Canon typography
 * Matches packages/components/src/lib/tokens/typography.ts
 */
export const typography = {
  // Font families
  fontFamily: {
    sans: 'Inter, system-ui, -apple-system, sans-serif',
    mono: 'JetBrains Mono, Menlo, Monaco, monospace',
    display: 'Inter, system-ui, sans-serif',
  },
  
  // Font sizes (using fluid scale)
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
    '6xl': '3.75rem',  // 60px
    '7xl': '4.5rem',   // 72px
  },
  
  // Font weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  
  // Line heights
  lineHeight: {
    tight: 1.1,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.625,
  },
} as const;

/**
 * Canon animation tokens
 * Matches packages/components/src/lib/tokens/animation.ts
 */
export const animation = {
  // Easing functions
  ease: {
    standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)', // Material Design
    sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)',    // Quick start
    smooth: 'cubic-bezier(0.0, 0.0, 0.2, 1)',   // Decelerate
  },
  
  // Duration in milliseconds
  duration: {
    micro: 200,      // Micro-interactions
    standard: 300,   // Standard transitions
    complex: 500,    // Complex animations
  },
  
  // Duration in frames (at 30fps)
  frames: {
    micro: 6,        // 200ms at 30fps
    standard: 9,     // 300ms at 30fps
    complex: 15,     // 500ms at 30fps
  },
} as const;

/**
 * Canon spacing (Golden Ratio based)
 * Matches packages/components/src/lib/tokens/spacing.ts
 */
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

/**
 * Vox-style presets
 * Common configurations for Vox-style motion graphics
 */
export const voxPresets = {
  // Standard Vox dark theme
  dark: {
    background: colors.neutral[950],
    foreground: colors.neutral[50],
    accent: colors.vox.accent,
    muted: colors.neutral[400],
  },
  
  // Light theme variant
  light: {
    background: colors.neutral[50],
    foreground: colors.neutral[950],
    accent: colors.vox.accent,
    muted: colors.neutral[600],
  },
  
  // Canon property themes
  space: {
    background: colors.neutral[950],
    foreground: colors.neutral[50],
    accent: colors.accent.space,
    muted: colors.neutral[400],
  },
  
  io: {
    background: colors.neutral[950],
    foreground: colors.neutral[50],
    accent: colors.accent.io,
    muted: colors.neutral[400],
  },
  
  agency: {
    background: colors.neutral[950],
    foreground: colors.neutral[50],
    accent: colors.accent.agency,
    muted: colors.neutral[400],
  },
  
  ltd: {
    background: colors.neutral[950],
    foreground: colors.neutral[50],
    accent: colors.accent.ltd,
    muted: colors.neutral[400],
  },
} as const;

/**
 * Get interpolated easing value for Remotion
 * Converts CSS easing to Remotion-compatible format
 */
export function getEasing(type: keyof typeof animation.ease = 'standard') {
  // Remotion uses Bezier curves as arrays
  const easings = {
    standard: [0.4, 0.0, 0.2, 1] as const,
    sharp: [0.4, 0.0, 0.6, 1] as const,
    smooth: [0.0, 0.0, 0.2, 1] as const,
  };
  return easings[type];
}

/**
 * Convert frames to milliseconds
 */
export function framesToMs(frames: number, fps = 30): number {
  return (frames / fps) * 1000;
}

/**
 * Convert milliseconds to frames
 */
export function msToFrames(ms: number, fps = 30): number {
  return Math.round((ms / 1000) * fps);
}

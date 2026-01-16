/**
 * Canon Design Tokens for React/Remotion
 * 
 * Bridge between Canon's Svelte-based design system and React components.
 * "Weniger, aber besser" - the same tokens, different runtime.
 * 
 * MONOCHROME ONLY - No accent colors, pure grayscale for typographic focus.
 */

/**
 * Canon monochrome palette
 * Pure grayscale - letting typography and motion do the work
 */
export const colors = {
  // Neutral scale (the ONLY colors)
  neutral: {
    0: '#ffffff',
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
    1000: '#000000',
  },
} as const;

/**
 * Canon typography
 * Stack Sans Notch + JetBrains Mono
 * Matches packages/components/src/lib/styles/tokens.css
 */
export const typography = {
  // Font families - Canon standard
  fontFamily: {
    sans: "'Stack Sans Notch', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
    serif: 'Georgia, "Times New Roman", serif',
  },
  
  // Font sizes (using rem for consistency)
  fontSize: {
    caption: '0.75rem',    // 12px
    sm: '0.875rem',        // 14px
    body: '1rem',          // 16px
    bodyLg: '1.125rem',    // 18px
    h6: '1rem',            // 16px
    h5: '1.25rem',         // 20px
    h4: '1.5rem',          // 24px
    h3: '1.75rem',         // 28px
    h2: '2.25rem',         // 36px
    h1: '3.5rem',          // 56px
    display: '5rem',       // 80px
    displayXl: '7rem',     // 112px
  },
  
  // Font weights - Canon standard
  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  
  // Line heights - Golden ratio based
  lineHeight: {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.618,  // φ - Golden ratio
    loose: 1.75,
  },
  
  // Letter spacing - Canon standard
  letterSpacing: {
    tighter: '-0.025em',
    tight: '-0.015em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
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
 * Monochrome theme presets
 * "Weniger, aber besser" - Let typography and motion speak
 */
export const voxPresets = {
  // Dark theme (default) - white on black
  dark: {
    background: colors.neutral[1000],
    foreground: colors.neutral[0],
    muted: colors.neutral[400],
    subtle: colors.neutral[800],
    border: colors.neutral[700],
  },
  
  // Light theme - black on white
  light: {
    background: colors.neutral[0],
    foreground: colors.neutral[1000],
    muted: colors.neutral[500],
    subtle: colors.neutral[100],
    border: colors.neutral[200],
  },
  
  // High contrast dark
  space: {
    background: colors.neutral[950],
    foreground: colors.neutral[50],
    muted: colors.neutral[500],
    subtle: colors.neutral[900],
    border: colors.neutral[800],
  },
  
  // Warm gray
  io: {
    background: colors.neutral[900],
    foreground: colors.neutral[100],
    muted: colors.neutral[400],
    subtle: colors.neutral[800],
    border: colors.neutral[700],
  },
  
  // Mid-tone
  agency: {
    background: colors.neutral[800],
    foreground: colors.neutral[50],
    muted: colors.neutral[400],
    subtle: colors.neutral[700],
    border: colors.neutral[600],
  },
  
  // Pure black and white
  ltd: {
    background: colors.neutral[1000],
    foreground: colors.neutral[0],
    muted: colors.neutral[500],
    subtle: colors.neutral[900],
    border: colors.neutral[800],
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

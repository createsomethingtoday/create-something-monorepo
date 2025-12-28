/**
 * Canon Theme
 * Design tokens for Canon-compliant diagrams
 *
 * These map directly to css-canon.md tokens
 */

export const canonTheme = {
  // ============================================
  // Colors (from css-canon.md)
  // ============================================
  colors: {
    // Backgrounds
    bgPure: '#000000',
    bgElevated: '#0a0a0a',
    bgSurface: '#111111',
    bgSubtle: '#1a1a1a',

    // Foregrounds
    fgPrimary: '#ffffff',
    fgSecondary: 'rgba(255, 255, 255, 0.8)',
    fgTertiary: 'rgba(255, 255, 255, 0.6)',
    fgMuted: 'rgba(255, 255, 255, 0.46)',
    fgSubtle: 'rgba(255, 255, 255, 0.2)',

    // Borders
    borderDefault: 'rgba(255, 255, 255, 0.1)',
    borderEmphasis: 'rgba(255, 255, 255, 0.2)',
    borderStrong: 'rgba(255, 255, 255, 0.3)',

    // Data visualization palette
    data: [
      '#60a5fa', // Blue
      '#22c55e', // Green
      '#c084fc', // Purple
      '#fbbf24', // Amber
      '#f472b6', // Pink
      '#facc15', // Yellow
    ],

    // Semantic
    success: '#44aa44',
    error: '#d44d4d',
    warning: '#aa8844',
    info: '#5082b9',
  },

  // ============================================
  // Typography
  // ============================================
  typography: {
    // Font family - system fonts for SVG compatibility
    // Use single quotes for SVG attribute compatibility
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontFamilyMono: "ui-monospace, 'SF Mono', Monaco, 'Cascadia Code', monospace",

    // Font sizes
    displayXl: 56,
    display: 40,
    h1: 32,
    h2: 24,
    h3: 20,
    bodyLg: 18,
    body: 16,
    bodySm: 14,
    caption: 12,

    // Font weights
    weightNormal: 400,
    weightMedium: 500,
    weightSemibold: 600,
    weightBold: 700,

    // Line heights
    lineHeightTight: 1.2,
    lineHeightNormal: 1.5,
    lineHeightRelaxed: 1.75,
  },

  // ============================================
  // Spacing (Golden Ratio φ = 1.618)
  // ============================================
  spacing: {
    xs: 8, // 0.5rem
    sm: 16, // 1rem
    md: 26, // ~1.618rem
    lg: 42, // ~2.618rem
    xl: 68, // ~4.236rem
    xxl: 110, // ~6.854rem
  },

  // ============================================
  // Shapes
  // ============================================
  shapes: {
    // Border radius
    radiusSm: 6,
    radiusMd: 8,
    radiusLg: 12,
    radiusXl: 16,
    radiusFull: 9999,

    // Stroke widths
    strokeThin: 1,
    strokeDefault: 1.5,
    strokeMedium: 2,
    strokeThick: 3,
  },

  // ============================================
  // Shadows (for elevated elements)
  // ============================================
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.5)',
    md: '0 4px 6px rgba(0, 0, 0, 0.5)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.5)',
  },
} as const;

// ============================================
// Helper Functions
// ============================================

/**
 * Get a data color by index (cycles through palette)
 */
export function getDataColor(index: number): string {
  return canonTheme.colors.data[index % canonTheme.colors.data.length];
}

/**
 * Get opacity variant of a color
 */
export function withOpacity(color: string, opacity: number): string {
  // Handle hex colors
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  // Handle rgba colors
  if (color.startsWith('rgba')) {
    return color.replace(/[\d.]+\)$/, `${opacity})`);
  }
  return color;
}

/**
 * Calculate golden ratio subdivisions
 */
export function goldenSubdivide(total: number, count: number): number[] {
  const phi = 1.618;
  const result: number[] = [];
  let remaining = total;

  for (let i = 0; i < count - 1; i++) {
    const portion = remaining / phi;
    result.push(remaining - portion);
    remaining = portion;
  }
  result.push(remaining);

  return result;
}

export type CanonTheme = typeof canonTheme;

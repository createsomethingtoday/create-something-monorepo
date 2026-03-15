/**
 * Webflow component tokens aligned to Canon semantics.
 *
 * This file is the JavaScript token bridge for React/Webflow components that
 * cannot consume Canon CSS variables directly. Base tokens should follow Canon
 * naming and values. Legacy accent variants remain available for compatibility
 * with older Webflow components until Canon parity work is complete.
 */

// Legacy accent variants kept for compatibility with existing Webflow components.
export type BrandVariant = 'default' | 'lithx' | 'petrox' | 'dme';

const accentTokens = {
  default: {
    primary: '#3B82F6',
    light: '#60a5fa',
    dark: '#2563eb',
  },
  lithx: {
    primary: '#00C2A8',
    light: '#33D1BC',
    dark: '#00917E',
  },
  petrox: {
    primary: '#FF7A00',
    light: '#FF9433',
    dark: '#E66900',
  },
  dme: {
    primary: '#06B6D4',
    light: '#22D3EE',
    dark: '#0891B2',
  },
} as const;

export const tokens = {
  // Canon semantic colors
  colors: {
    bgPure: '#000000',
    bgElevated: '#0a0a0a',
    bgSurface: '#111111',
    bgSubtle: '#1a1a1a',

    fgPrimary: '#ffffff',
    fgSecondary: 'rgba(255, 255, 255, 0.8)',
    fgTertiary: 'rgba(255, 255, 255, 0.6)',
    fgMuted: 'rgba(255, 255, 255, 0.46)',
    fgSubtle: 'rgba(255, 255, 255, 0.2)',

    borderDefault: 'rgba(255, 255, 255, 0.1)',
    borderEmphasis: 'rgba(255, 255, 255, 0.2)',
    borderStrong: 'rgba(255, 255, 255, 0.3)',

    hover: 'rgba(255, 255, 255, 0.05)',
    active: 'rgba(255, 255, 255, 0.1)',
    focus: 'rgba(255, 255, 255, 0.5)',
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayHeavy: 'rgba(0, 0, 0, 0.7)',

    // Semantic feedback colors
    success: '#44aa44',
    successMuted: 'rgba(68, 170, 68, 0.2)',
    successBorder: 'rgba(68, 170, 68, 0.3)',
    error: '#d44d4d',
    errorMuted: 'rgba(212, 77, 77, 0.2)',
    errorBorder: 'rgba(212, 77, 77, 0.3)',
    warning: '#aa8844',
    warningMuted: 'rgba(170, 136, 68, 0.2)',
    warningBorder: 'rgba(170, 136, 68, 0.3)',
    info: '#5082b9',
    infoMuted: 'rgba(80, 130, 185, 0.2)',
    infoBorder: 'rgba(80, 130, 185, 0.3)',

    // Compatibility palettes used by older Webflow components.
    gray: {
      50: '#ebebeb',
      75: '#adadad',
      100: '#8a8a8a',
      200: '#585858',
      300: '#363636',
      400: '#262626',
      500: '#212121',
    },

    white: {
      50: '#fdfdfd',
      75: '#f5f5f5',
      100: '#f1f1f1',
      200: '#eaeaea',
      300: '#e6e6e6',
      400: '#a1a1a1',
      500: '#8c8c8c',
    },
  },

  // Legacy accent colors. New Canon components should prefer semantic colors.
  accents: accentTokens,
  brand: accentTokens,

  // Canon spacing scale
  spacing: {
    xs: '0.5rem',      // 8px
    sm: '1rem',        // 16px
    md: '1.618rem',    // 26px
    lg: '2.618rem',    // 42px
    xl: '4.236rem',    // 68px
    '2xl': '6.854rem', // 110px
  },

  // Canon typography
  typography: {
    fontFamily: {
      sans: 'Inter, system-ui, -apple-system, sans-serif',
      tight: '"Inter Tight", Inter, system-ui, sans-serif',
    },

    fontSize: {
      displayXl: 'clamp(3.5rem, 5vw + 2rem, 7rem)',
      display: 'clamp(2.5rem, 4vw + 1.5rem, 5rem)',
      h1: 'clamp(2rem, 3vw + 1rem, 3.5rem)',
      h2: 'clamp(1.5rem, 2vw + 0.75rem, 2.25rem)',
      h3: 'clamp(1.25rem, 1.5vw + 0.5rem, 1.75rem)',
      h4: '1.5rem',
      h5: '1.25rem',
      bodyLg: '1.125rem',
      body: '1rem',
      bodySm: '0.875rem',
      caption: '0.75rem',
    },

    lineHeight: {
      tight: '1.1',
      normal: '1.5',
      relaxed: '1.6',
    },

    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },

  // Canon radius tokens
  radii: {
    none: '0',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
    full: '9999px',
  },

  // Shadow scale used in current Webflow components
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    glass: '0 8px 32px rgba(0, 0, 0, 0.12)',
  },

  // Motion tokens
  animation: {
    duration: {
      micro: '200ms',
      standard: '300ms',
      complex: '500ms',
    },
    easing: {
      standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
  },

  // Breakpoints for responsive inline styles
  breakpoints: {
    sm: '480px',
    md: '768px',
    lg: '1024px',
    xl: '1180px',
    '2xl': '1420px',
  },
} as const;

/**
 * Get brand colors for a variant
 */
export function getBrandColors(variant: BrandVariant = 'default') {
  return tokens.accents[variant];
}

/**
 * Create CSS style object with brand accent
 */
export function withBrandAccent(
  variant: BrandVariant,
  property: 'background' | 'color' | 'borderColor' = 'background'
) {
  const brand = getBrandColors(variant);
  return { [property]: brand.primary };
}

export default tokens;

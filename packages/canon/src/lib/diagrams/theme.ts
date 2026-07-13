/**
 * Diagram Theme
 * Canon design tokens with property-aware accents
 */

import type { Property } from '../analytics/types.js';

/**
 * Property accent colors
 * Each property has a distinct but Canon-compliant accent
 */
export const propertyAccents: Record<Property, string> = {
  io: '#60a5fa', // Blue - research, documentation
  space: '#22c55e', // Green - practice, experiments
  agency: '#c084fc', // Purple - services, commercial
  ltd: '#ffffff', // White - philosophy, pure Canon
  lms: '#fbbf24', // Amber - learning, education
};

/**
 * Canon theme tokens
 * Maps to css-canon.md
 */
export const theme = {
  colors: {
    // Backgrounds
    bgPure: 'var(--color-performance-bg-pure, #000000)',
    bgElevated: 'var(--color-performance-bg-elevated, #0a0a0a)',
    bgSurface: 'var(--color-performance-bg-surface, #111111)',
    bgSubtle: 'var(--color-performance-bg-subtle, #1a1a1a)',

    // Foregrounds
    fgPrimary: 'var(--color-performance-fg-primary, #ffffff)',
    fgSecondary: 'var(--color-performance-fg-secondary, rgba(255, 255, 255, 0.8))',
    fgTertiary: 'var(--color-performance-fg-tertiary, rgba(255, 255, 255, 0.6))',
    fgMuted: 'var(--color-performance-fg-muted, rgba(255, 255, 255, 0.46))',

    // Borders
    borderDefault: 'var(--color-performance-border-default, rgba(255, 255, 255, 0.1))',
    borderEmphasis: 'var(--color-performance-border-emphasis, rgba(255, 255, 255, 0.2))',

    // Data visualization
    data: [
      'var(--color-performance-data-1, #60a5fa)',
      'var(--color-performance-data-2, #22c55e)',
      'var(--color-performance-data-3, #c084fc)',
      'var(--color-performance-data-4, #fbbf24)',
      'var(--color-performance-data-5, #f472b6)',
      'var(--color-performance-data-6, #facc15)',
    ],

    // Semantic
    success: 'var(--color-performance-success, #44aa44)',
    error: 'var(--color-performance-error, #d44d4d)',
  },

  typography: {
    fontFamily: "var(--font-performance-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
    h1: 'var(--text-performance-h1, clamp(2rem, 3vw + 1rem, 3.5rem))',
    h2: 'var(--text-performance-h2, clamp(1.5rem, 2vw + 0.75rem, 2.25rem))',
    h3: 'var(--text-performance-h3, clamp(1.25rem, 1.5vw + 0.5rem, 1.75rem))',
    body: 'var(--text-performance-body, 1rem)',
    bodySm: 'var(--text-performance-body-sm, 0.875rem)',
    caption: 'var(--text-performance-caption, 0.75rem)',
  },

  spacing: {
    xs: 'var(--space-performance-xs, 0.5rem)',
    sm: 'var(--space-performance-sm, 1rem)',
    md: 'var(--space-performance-md, 1.618rem)',
    lg: 'var(--space-performance-lg, 2.618rem)',
  },

  radius: {
    sm: 'var(--radius-performance-scale-sm, 6px)',
    md: 'var(--radius-performance-scale-md, 8px)',
    lg: 'var(--radius-performance-scale-lg, 12px)',
  },

  animation: {
    duration: 'var(--duration-performance-standard, 300ms)',
    easing: 'var(--ease-performance-standard, cubic-bezier(0.4, 0.0, 0.2, 1))',
  },
} as const;

/**
 * Get data color by index
 */
export function getDataColor(index: number, property?: Property): string {
  if (property && index === 0) {
    return propertyAccents[property];
  }
  return theme.colors.data[index % theme.colors.data.length];
}

/**
 * Get property accent color
 */
export function getAccentColor(property: Property = 'io'): string {
  return propertyAccents[property];
}

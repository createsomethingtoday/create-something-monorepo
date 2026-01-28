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
    bgPure: 'var(--color-bg-pure, #000000)',
    bgElevated: 'var(--color-bg-elevated, #0a0a0a)',
    bgSurface: 'var(--color-bg-surface, #111111)',
    bgSubtle: 'var(--color-bg-subtle, #1a1a1a)',

    // Foregrounds
    fgPrimary: 'var(--color-fg-primary, #ffffff)',
    fgSecondary: 'var(--color-fg-secondary, rgba(255, 255, 255, 0.8))',
    fgTertiary: 'var(--color-fg-tertiary, rgba(255, 255, 255, 0.6))',
    fgMuted: 'var(--color-fg-muted, rgba(255, 255, 255, 0.46))',

    // Borders
    borderDefault: 'var(--color-border-default, rgba(255, 255, 255, 0.1))',
    borderEmphasis: 'var(--color-border-emphasis, rgba(255, 255, 255, 0.2))',

    // Data visualization
    data: [
      'var(--color-data-1, #60a5fa)',
      'var(--color-data-2, #22c55e)',
      'var(--color-data-3, #c084fc)',
      'var(--color-data-4, #fbbf24)',
      'var(--color-data-5, #f472b6)',
      'var(--color-data-6, #facc15)',
    ],

    // Semantic
    success: 'var(--color-success, #44aa44)',
    error: 'var(--color-error, #d44d4d)',
  },

  typography: {
    fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
    h1: 'var(--text-h1, clamp(2rem, 3vw + 1rem, 3.5rem))',
    h2: 'var(--text-h2, clamp(1.5rem, 2vw + 0.75rem, 2.25rem))',
    h3: 'var(--text-h3, clamp(1.25rem, 1.5vw + 0.5rem, 1.75rem))',
    body: 'var(--text-body, 1rem)',
    bodySm: 'var(--text-body-sm, 0.875rem)',
    caption: 'var(--text-caption, 0.75rem)',
  },

  spacing: {
    xs: 'var(--space-xs, 0.5rem)',
    sm: 'var(--space-sm, 1rem)',
    md: 'var(--space-md, 1.618rem)',
    lg: 'var(--space-lg, 2.618rem)',
  },

  radius: {
    sm: 'var(--radius-sm, 6px)',
    md: 'var(--radius-md, 8px)',
    lg: 'var(--radius-lg, 12px)',
  },

  animation: {
    duration: 'var(--duration-standard, 300ms)',
    easing: 'var(--ease-standard, cubic-bezier(0.4, 0.0, 0.2, 1))',
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

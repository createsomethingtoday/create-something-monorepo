import { defineTheme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral';

// Light is Paper; dark is Studio. The approved G-train green is the actual
// Astryx accent, so buttons, selection and focus share one generated foundation.
export const gigiDevTheme = defineTheme({
  name: 'gigi-dev',
  extends: neutralTheme,
  tokens: {
    '--color-background-body': ['#f4f3ef', 'oklch(20.5% 0 0)'],
    '--color-background-surface': ['#fdfcfa', 'oklch(26.9% 0 0)'],
    '--color-background-card': ['#fdfcfa', 'oklch(26.9% 0 0)'],
    '--color-background-popover': ['#fdfcfa', 'oklch(26.9% 0 0)'],
    '--color-background-muted': ['#e8e7e1', 'oklch(32% 0 0)'],
    '--color-text-primary': ['#232420', 'oklch(98.5% 0 0)'],
    '--color-text-secondary': ['#5c5e56', 'oklch(76% 0 0)'],
    '--color-icon-primary': ['#232420', 'oklch(98.5% 0 0)'],
    '--color-icon-secondary': ['#5c5e56', 'oklch(76% 0 0)'],
    '--color-border': ['#d2d0c8', 'oklch(100% 0 0 / .13)'],
    '--color-border-emphasized': ['#898b80', 'oklch(58% 0 0)'],
    '--color-accent': ['#799534', '#799534'],
    '--color-on-accent': ['#111b08', '#111b08'],
    '--color-accent-muted': ['#e9eddf', '#343d25'],
    '--color-text-accent': ['#526821', '#afca76'],
    '--color-icon-accent': ['#526821', '#afca76']
  }
});

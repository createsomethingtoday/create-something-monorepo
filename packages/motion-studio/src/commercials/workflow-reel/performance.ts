import canonicalTokens from '@createsomething/canon-tokens/tokens.json';
import { Easing } from 'remotion';

type TokenDocument = {
  performanceContract: {
    source: string;
    tokens: Record<string, string>;
  };
};

const document = canonicalTokens as TokenDocument;
const tokens = document.performanceContract.tokens;

const required = (name: string): string => {
  const value = tokens[name];
  if (!value) throw new Error(`Missing canonical Performance token: ${name}`);
  return value;
};

const milliseconds = (name: string): number => Number.parseFloat(required(name));
const frames = (name: string, fps = 30): number => Math.round((milliseconds(name) / 1000) * fps);

const bezier = (name: string) => {
  const values = required(name)
    .match(/-?\d*\.?\d+/g)
    ?.map(Number);
  if (!values || values.length !== 4) throw new Error(`Invalid Performance easing token: ${name}`);
  return Easing.bezier(values[0], values[1], values[2], values[3]);
};

export const performance = {
  source: document.performanceContract.source,
  color: {
    paper: required('--color-performance-paper'),
    panel: required('--color-performance-panel'),
    ink: required('--color-performance-ink'),
    inkSoft: required('--color-performance-ink-soft'),
    muted: required('--color-performance-muted'),
    line: required('--color-performance-line'),
    lineStrong: required('--color-performance-line-strong'),
    grid: required('--color-performance-grid'),
    court: required('--color-performance-court'),
    signal: required('--color-performance-signal'),
    signalSoft: required('--color-performance-signal-soft'),
    pressure: required('--color-performance-pressure'),
    pressureSoft: required('--color-performance-pressure-soft'),
    growth: required('--color-performance-growth'),
    growthSoft: required('--color-performance-growth-soft'),
    risk: required('--color-performance-risk'),
    riskSoft: required('--color-performance-risk-soft'),
    review: required('--color-performance-gold'),
    reviewSoft: required('--color-performance-gold-soft')
  },
  font: {
    sans: required('--font-performance-sans'),
    display: required('--font-performance-display'),
    mono: required('--font-performance-mono'),
    displayWeight: Number(required('--font-performance-display-weight'))
  },
  motion: {
    instant: frames('--duration-performance-instant'),
    micro: frames('--duration-performance-micro'),
    standard: frames('--duration-performance-standard'),
    complex: frames('--duration-performance-complex'),
    slow: frames('--duration-performance-slow'),
    standardEase: bezier('--ease-performance-standard'),
    enterEase: bezier('--ease-performance-decelerate'),
    exitEase: bezier('--ease-performance-accelerate')
  }
} as const;

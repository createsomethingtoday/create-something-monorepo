import React, { CSSProperties } from 'react';
import { tokens } from '../../styles/tokens';
import { TextTone } from '../primitives';

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type HeadingAlign = 'left' | 'center' | 'right';
export type HeadingScale = 'canonical' | 'custom';

export interface HeadingProps {
  content: string;
  level?: HeadingLevel | `${HeadingLevel}`;
  fluidScale?: HeadingScale;
  min?: string;
  max?: string;
  tone?: TextTone;
  align?: HeadingAlign;
  className?: string;
}

const canonicalScales: Record<HeadingLevel, string> = {
  1: 'clamp(3.5rem, 9vw, 7rem)',
  2: 'clamp(2rem, 5vw, 3.5rem)',
  3: 'clamp(1.5rem, 3vw, 2.25rem)',
  4: 'clamp(1.25rem, 2.5vw, 1.75rem)',
  5: 'clamp(1.125rem, 2vw, 1.5rem)',
  6: 'clamp(1rem, 1.5vw, 1.25rem)',
};

const toneMap: Record<TextTone, string> = {
  primary: tokens.colors.fgPrimary,
  secondary: tokens.colors.fgSecondary,
  tertiary: tokens.colors.fgTertiary,
  muted: tokens.colors.fgMuted,
  subtle: tokens.colors.fgSubtle,
};

function getFontSize(level: HeadingLevel, fluidScale: HeadingScale, min?: string, max?: string) {
  if (fluidScale === 'custom' && min && max) {
    return `clamp(${min}, 5vw, ${max})`;
  }

  return canonicalScales[level];
}

function getLetterSpacing(level: HeadingLevel) {
  if (level <= 2) return '-0.025em';
  if (level <= 4) return '-0.02em';
  return '-0.015em';
}

export const Heading: React.FC<HeadingProps> = ({
  content,
  level = 2,
  fluidScale = 'canonical',
  min,
  max,
  tone = 'primary',
  align = 'left',
  className = '',
}) => {
  const normalizedLevel = typeof level === 'string' ? parseInt(level, 10) as HeadingLevel : level;
  const Component = `h${normalizedLevel}` as keyof JSX.IntrinsicElements;

  const headingStyle: CSSProperties = {
    margin: 0,
    color: toneMap[tone],
    fontFamily: tokens.typography.fontFamily.tight,
    fontSize: getFontSize(normalizedLevel, fluidScale, min, max),
    fontWeight: tokens.typography.fontWeight.bold,
    lineHeight: tokens.typography.lineHeight.tight,
    letterSpacing: getLetterSpacing(normalizedLevel),
    textAlign: align,
    textWrap: 'balance',
  };

  return React.createElement(Component, { className, style: headingStyle }, content);
};

export default Heading;

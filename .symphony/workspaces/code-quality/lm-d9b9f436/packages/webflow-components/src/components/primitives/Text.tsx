import React, { CSSProperties, ReactNode } from 'react';
import { tokens } from '../../styles/tokens';

export type TextTone = 'primary' | 'secondary' | 'tertiary' | 'muted' | 'subtle';
export type TextSize = 'xs' | 'sm' | 'body' | 'lg' | 'h5' | 'h4' | 'h3' | 'h2' | 'h1';

export interface TextProps {
  as?: keyof JSX.IntrinsicElements;
  children?: ReactNode;
  tone?: TextTone;
  size?: TextSize;
  weight?: keyof typeof tokens.typography.fontWeight;
  align?: CSSProperties['textAlign'];
  style?: CSSProperties;
  className?: string;
}

const toneMap: Record<TextTone, string> = {
  primary: tokens.colors.fgPrimary,
  secondary: tokens.colors.fgSecondary,
  tertiary: tokens.colors.fgTertiary,
  muted: tokens.colors.fgMuted,
  subtle: tokens.colors.fgSubtle,
};

const sizeMap: Record<TextSize, string> = {
  xs: tokens.typography.fontSize.caption,
  sm: tokens.typography.fontSize.bodySm,
  body: tokens.typography.fontSize.body,
  lg: tokens.typography.fontSize.bodyLg,
  h5: tokens.typography.fontSize.h5,
  h4: tokens.typography.fontSize.h4,
  h3: tokens.typography.fontSize.h3,
  h2: tokens.typography.fontSize.h2,
  h1: tokens.typography.fontSize.h1,
};

export const Text: React.FC<TextProps> = ({
  as: Component = 'span',
  children,
  tone = 'primary',
  size = 'body',
  weight = 'normal',
  align,
  style,
  className,
}) => {
  const textStyle: CSSProperties = {
    color: toneMap[tone],
    fontSize: sizeMap[size],
    fontWeight: tokens.typography.fontWeight[weight],
    lineHeight: tokens.typography.lineHeight.normal,
    fontFamily: tokens.typography.fontFamily.sans,
    textAlign: align,
    ...style,
  };

  return React.createElement(Component, { style: textStyle, className }, children);
};

export default Text;

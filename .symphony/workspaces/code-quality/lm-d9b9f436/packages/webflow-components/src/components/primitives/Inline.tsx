import React, { CSSProperties, ReactNode } from 'react';
import { tokens } from '../../styles/tokens';

export type InlineGap = keyof typeof tokens.spacing;

export interface InlineProps {
  as?: keyof JSX.IntrinsicElements;
  children?: ReactNode;
  gap?: InlineGap;
  align?: CSSProperties['alignItems'];
  justify?: CSSProperties['justifyContent'];
  wrap?: CSSProperties['flexWrap'];
  style?: CSSProperties;
  className?: string;
}

export const Inline: React.FC<InlineProps> = ({
  as: Component = 'div',
  children,
  gap = 'sm',
  align = 'center',
  justify,
  wrap = 'wrap',
  style,
  className,
}) => {
  const inlineStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    gap: tokens.spacing[gap],
    alignItems: align,
    justifyContent: justify,
    flexWrap: wrap,
    ...style,
  };

  return React.createElement(Component, { style: inlineStyle, className }, children);
};

export default Inline;

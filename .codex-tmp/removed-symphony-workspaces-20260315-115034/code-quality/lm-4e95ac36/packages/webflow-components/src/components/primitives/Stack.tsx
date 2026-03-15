import React, { CSSProperties, ReactNode } from 'react';
import { tokens } from '../../styles/tokens';

export type StackGap = keyof typeof tokens.spacing;

export interface StackProps {
  as?: keyof JSX.IntrinsicElements;
  children?: ReactNode;
  gap?: StackGap;
  align?: CSSProperties['alignItems'];
  justify?: CSSProperties['justifyContent'];
  style?: CSSProperties;
  className?: string;
}

export const Stack: React.FC<StackProps> = ({
  as: Component = 'div',
  children,
  gap = 'md',
  align,
  justify,
  style,
  className,
}) => {
  const stackStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing[gap],
    alignItems: align,
    justifyContent: justify,
    ...style,
  };

  return React.createElement(Component, { style: stackStyle, className }, children);
};

export default Stack;

import React, { CSSProperties, ElementType, ReactNode } from 'react';

export interface BoxProps {
  as?: ElementType;
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
  href?: string;
  onClick?: () => void;
  [key: string]: unknown;
}

export const Box: React.FC<BoxProps> = ({
  as: Component = 'div',
  children,
  style,
  className,
  ...rest
}) => {
  return React.createElement(Component, { style, className, ...rest }, children);
};

export default Box;

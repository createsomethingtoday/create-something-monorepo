import React, { CSSProperties, ReactNode } from 'react';

export interface VisuallyHiddenProps {
  as?: keyof JSX.IntrinsicElements;
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

const hiddenStyles: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export const VisuallyHidden: React.FC<VisuallyHiddenProps> = ({
  as: Component = 'span',
  children,
  style,
  className,
}) => {
  return React.createElement(Component, { style: { ...hiddenStyles, ...style }, className }, children);
};

export default VisuallyHidden;

import React, { CSSProperties, ReactNode } from 'react';
import { tokens } from '../../styles/tokens';

export interface FocusRingProps {
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export const focusRingStyles = (
  offset = 2,
  color = tokens.colors.focus
): CSSProperties => ({
  outline: `2px solid ${color}`,
  outlineOffset: `${offset}px`,
});

export const FocusRing: React.FC<FocusRingProps> = ({ children, style, className }) => {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        borderRadius: 'inherit',
        ...style,
      }}
    >
      {children}
    </span>
  );
};

export default FocusRing;

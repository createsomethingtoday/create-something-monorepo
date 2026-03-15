/**
 * GlassCard - Glassmorphism container component
 * 
 * Reusable glass-effect container matching Outerfields' design system.
 */
import React from 'react';
import { SPEC } from '../spec';

interface GlassCardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  borderRadius?: number;
  padding?: number;
  opacity?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style = {},
  borderRadius = 12,
  padding = 16,
  opacity = 1,
}) => {
  const { colors } = SPEC;
  
  return (
    <div
      style={{
        background: colors.glass,
        border: `1px solid ${colors.glassBorder}`,
        borderRadius,
        padding,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        opacity,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default GlassCard;

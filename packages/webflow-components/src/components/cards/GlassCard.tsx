import React, { CSSProperties, ReactNode } from 'react';
import { tokens, BrandVariant, getBrandColors } from '../../styles/tokens';

export type GlassVariant = 'light' | 'dark' | 'colored';

export interface GlassCardProps {
  /** Card content */
  children?: ReactNode;
  /** Visual variant of the glass effect */
  glassVariant?: GlassVariant;
  /** Brand color (for 'colored' variant) */
  brandVariant?: BrandVariant;
  /** Enable hover shine effect */
  showShine?: boolean;
  /** Padding size */
  padding?: 'sm' | 'md' | 'lg';
  /** Additional class name */
  className?: string;
}

// Glass variant color configurations
const GLASS_COLORS: Record<GlassVariant, { background: string; border: string }> = {
  light: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'rgba(255, 255, 255, 0.2)',
  },
  dark: {
    background: 'rgba(0, 0, 0, 0.1)',
    border: 'rgba(255, 255, 255, 0.1)',
  },
  colored: {
    background: '', // Set dynamically based on brand
    border: '',
  },
};

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  glassVariant = 'light',
  brandVariant = 'default',
  showShine = true,
  padding = 'md',
  className = '',
}) => {
  const brand = getBrandColors(brandVariant);

  // Get colors based on variant, with brand override for 'colored'
  const getGlassColor = (type: 'background' | 'border'): string => {
    if (glassVariant === 'colored') {
      return type === 'background'
        ? `${brand.primary}1a` // 10% opacity
        : `${brand.primary}33`; // 20% opacity
    }
    return GLASS_COLORS[glassVariant][type];
  };

  const paddingSizes = {
    sm: tokens.spacing.sm,
    md: tokens.spacing.md,
    lg: tokens.spacing.lg,
  };

  const containerStyles: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    padding: paddingSizes[padding],
    backgroundColor: getGlassColor('background'),
    border: `1px solid ${getGlassColor('border')}`,
    borderRadius: 0, // Maverick X: no border radius
    backdropFilter: 'blur(20px) saturate(150%)',
    WebkitBackdropFilter: 'blur(20px) saturate(150%)',
    boxShadow: tokens.shadows.xl,
    transition: `all ${tokens.animation.duration.standard} ${tokens.animation.easing.standard}`,
  };

  const shineStyles: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%, transparent 100%)',
    opacity: 0,
    pointerEvents: 'none',
    transition: `opacity ${tokens.animation.duration.complex} ${tokens.animation.easing.standard}`,
  };

  const edgeGlowStyles: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 100%)',
    opacity: 0.5,
    pointerEvents: 'none',
  };

  const contentStyles: CSSProperties = {
    position: 'relative',
    zIndex: 10,
  };

  // Hover styles via CSS
  const hoverCSS = `
    .mavx-glass-card:hover {
      box-shadow: ${tokens.shadows['2xl']};
    }
    .mavx-glass-card:hover .mavx-glass-shine {
      opacity: 1;
    }
  `;

  return (
    <div className={`mavx-glass-card ${className}`} style={containerStyles}>
      <style>{hoverCSS}</style>

      {/* Shine effect */}
      {showShine && <div className="mavx-glass-shine" style={shineStyles} />}

      {/* Edge glow */}
      <div style={edgeGlowStyles} />

      {/* Content */}
      <div style={contentStyles}>{children}</div>
    </div>
  );
};

export default GlassCard;

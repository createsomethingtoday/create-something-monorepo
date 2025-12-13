import React, { CSSProperties } from 'react';
import { tokens, BrandVariant, getBrandColors } from '../../styles/tokens';

export type IconCardVariant = 'default' | 'minimal' | 'detailed';

export interface IconCardProps {
  /** Card title */
  title: string;
  /** Card description */
  description?: string;
  /** Icon name (uses simple geometric placeholder) */
  icon?: 'circle' | 'square' | 'triangle' | 'hexagon';
  /** Image URL (overrides icon) */
  imageUrl?: string;
  /** Link URL */
  href?: string;
  /** Brand color variant */
  variant?: BrandVariant;
  /** Card style variant */
  cardVariant?: IconCardVariant;
  /** Additional class name */
  className?: string;
}

const IconShape: React.FC<{ shape: string; color: string; size: number }> = ({
  shape,
  color,
  size,
}) => {
  const svgProps = {
    width: size,
    height: size,
    viewBox: '0 0 48 48',
    fill: color,
  };

  switch (shape) {
    case 'circle':
      return (
        <svg {...svgProps}>
          <circle cx="24" cy="24" r="20" />
        </svg>
      );
    case 'square':
      return (
        <svg {...svgProps}>
          <rect x="4" y="4" width="40" height="40" rx="4" />
        </svg>
      );
    case 'triangle':
      return (
        <svg {...svgProps}>
          <polygon points="24,4 44,44 4,44" />
        </svg>
      );
    case 'hexagon':
      return (
        <svg {...svgProps}>
          <polygon points="24,2 44,14 44,34 24,46 4,34 4,14" />
        </svg>
      );
    default:
      return (
        <svg {...svgProps}>
          <circle cx="24" cy="24" r="20" />
        </svg>
      );
  }
};

export const IconCard: React.FC<IconCardProps> = ({
  title,
  description,
  icon = 'circle',
  imageUrl,
  href,
  variant = 'default',
  cardVariant = 'default',
  className = '',
}) => {
  const brand = getBrandColors(variant);

  const isMinimal = cardVariant === 'minimal';
  const isDetailed = cardVariant === 'detailed';

  const containerStyles: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: isMinimal ? tokens.spacing.sm : tokens.spacing.lg,
    backgroundColor: isMinimal ? 'rgba(0, 0, 0, 0.4)' : tokens.colors.white[50],
    borderRadius: 0, // Maverick X: no border radius
    border: isMinimal ? `1px solid ${tokens.colors.borderEmphasis}` : 'none',
    boxShadow: isMinimal ? 'none' : tokens.shadows.lg,
    transition: `all ${tokens.animation.duration.standard} ${tokens.animation.easing.standard}`,
    cursor: href ? 'pointer' : 'default',
    textDecoration: 'none',
    color: 'inherit',
    backdropFilter: isMinimal ? 'blur(4px)' : 'none',
  };

  const iconContainerStyles: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: isMinimal ? '80px' : '96px',
    height: isMinimal ? '80px' : '96px',
    marginBottom: tokens.spacing.md,
    backgroundColor: `${brand.primary}1a`, // 10% opacity
    borderRadius: 0, // Maverick X: no border radius
    overflow: 'hidden',
  };

  const linkIndicatorStyles: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: tokens.spacing.sm,
    fontSize: tokens.typography.fontSize.bodySm,
    fontWeight: tokens.typography.fontWeight.medium,
    color: brand.primary,
    opacity: 0,
    transition: `opacity ${tokens.animation.duration.standard} ${tokens.animation.easing.standard}`,
  };

  const imageStyles: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  };

  const titleStyles: CSSProperties = {
    fontFamily: tokens.typography.fontFamily.tight,
    fontSize: isMinimal ? tokens.typography.fontSize.h5 : tokens.typography.fontSize.h4,
    fontWeight: tokens.typography.fontWeight.medium,
    color: isMinimal ? tokens.colors.fgPrimary : tokens.colors.gray[300],
    marginBottom: isDetailed && description ? tokens.spacing.xs : 0,
  };

  const descriptionStyles: CSSProperties = {
    fontSize: tokens.typography.fontSize.bodySm,
    lineHeight: tokens.typography.lineHeight.relaxed,
    color: tokens.colors.gray[200],
  };

  // Hover styles
  const hoverCSS = `
    .mavx-icon-card:hover {
      transform: translateY(-4px);
      box-shadow: ${tokens.shadows.xl};
      background-color: ${tokens.colors.gray[50]};
    }
    .mavx-icon-card--minimal:hover {
      transform: none;
      background-color: rgba(0, 0, 0, 0.5);
    }
    .mavx-icon-card:hover .mavx-link-indicator {
      opacity: 1;
    }
  `;

  const content = (
    <>
      <style>{hoverCSS}</style>

      {/* Icon/Image container */}
      <div style={iconContainerStyles}>
        {imageUrl ? (
          <img src={imageUrl} alt={title} style={imageStyles} />
        ) : (
          <IconShape shape={icon} color={brand.primary} size={48} />
        )}
      </div>

      {/* Title */}
      <h3 style={titleStyles}>{title}</h3>

      {/* Description (detailed variant) */}
      {isDetailed && description && <p style={descriptionStyles}>{description}</p>}

      {/* Link indicator */}
      {href && (
        <div className="mavx-link-indicator" style={linkIndicatorStyles}>
          Learn more
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </div>
      )}
    </>
  );

  const cardClassName = `mavx-icon-card ${isMinimal ? 'mavx-icon-card--minimal' : ''} ${className}`.trim();

  if (href) {
    return (
      <a href={href} className={cardClassName} style={containerStyles}>
        {content}
      </a>
    );
  }

  return (
    <div className={cardClassName} style={containerStyles}>
      {content}
    </div>
  );
};

export default IconCard;

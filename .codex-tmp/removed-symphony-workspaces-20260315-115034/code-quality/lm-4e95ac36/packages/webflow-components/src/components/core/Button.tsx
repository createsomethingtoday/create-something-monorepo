import React, { CSSProperties } from 'react';
import { tokens, BrandVariant, getBrandColors } from '../../styles/tokens';

export interface ButtonProps {
  /** Button text */
  title: string;
  /** Link URL (renders as <a> if provided) */
  href?: string;
  /** Click handler (renders as <button> if no href) */
  onClick?: () => void;
  /** Show arrow icon */
  arrow?: boolean;
  /** Light mode (white bg, dark text) */
  light?: boolean;
  /** Brand color variant */
  variant?: BrandVariant;
  /** Additional class name */
  className?: string;
}

const ArrowIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

export const Button: React.FC<ButtonProps> = ({
  title,
  href,
  onClick,
  arrow = false,
  light = false,
  variant = 'default',
  className = '',
}) => {
  const brand = getBrandColors(variant);

  // Base colors based on light/dark mode
  const bgColor = light ? tokens.colors.white[50] : tokens.colors.gray[500];
  const textColor = light ? tokens.colors.gray[500] : tokens.colors.white[50];
  const borderColor = light ? tokens.colors.white[50] : tokens.colors.gray[500];
  const arrowBgColor = light ? tokens.colors.gray[500] : tokens.colors.white[50];
  const arrowIconColor = light ? tokens.colors.white[50] : tokens.colors.gray[500];

  const baseStyles: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: '48px',
    paddingLeft: '18px',
    paddingRight: arrow ? '12px' : '18px',
    backgroundColor: bgColor,
    color: textColor,
    border: `2px solid ${borderColor}`,
    borderRadius: 0, // Maverick X: no border radius
    fontFamily: tokens.typography.fontFamily.sans,
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.medium,
    textDecoration: 'none',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    transition: `all ${tokens.animation.duration.standard} ${tokens.animation.easing.standard}`,
  };

  const arrowBoxStyles: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    marginLeft: '24px',
    marginRight: '-6px',
    backgroundColor: arrowBgColor,
    transition: `all ${tokens.animation.duration.standard} ${tokens.animation.easing.standard}`,
  };

  // Unique ID for scoped CSS
  const uniqueId = `btn-${Math.random().toString(36).slice(2, 9)}`;

  // CSS animations and hover states
  const buttonCSS = `
    @keyframes mavx-shine-${uniqueId} {
      from { transform: translateX(-100%); }
      to { transform: translateX(100%); }
    }
    @keyframes mavx-arrow-pulse-${uniqueId} {
      0%, 100% { transform: translateX(0); }
      50% { transform: translateX(2px); }
    }
    .mavx-button-${uniqueId} {
      position: relative;
      overflow: hidden;
    }
    .mavx-button-${uniqueId}::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transform: translateX(-100%);
      pointer-events: none;
      z-index: 5;
    }
    .mavx-button-${uniqueId}:hover::before {
      animation: mavx-shine-${uniqueId} 0.6s ease-in-out;
    }
    .mavx-button-${uniqueId}:hover {
      background-color: ${light ? tokens.colors.gray[500] : tokens.colors.white[50]};
      color: ${light ? tokens.colors.white[50] : tokens.colors.gray[500]};
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
    }
    .mavx-button-${uniqueId}:hover .mavx-arrow-box {
      background-color: ${light ? tokens.colors.white[50] : tokens.colors.gray[500]};
      transform: scale(1.1);
    }
    .mavx-button-${uniqueId}:hover .mavx-arrow-box svg {
      color: ${light ? tokens.colors.gray[500] : tokens.colors.white[50]};
    }
    .mavx-button-${uniqueId} .mavx-arrow-icon {
      animation: mavx-arrow-pulse-${uniqueId} 1.5s ease-in-out infinite;
    }
    .mavx-button-${uniqueId}:focus-visible {
      outline: 2px solid ${brand.primary};
      outline-offset: 2px;
    }
  `;

  const content = (
    <>
      <style>{buttonCSS}</style>
      <span style={{ position: 'relative', zIndex: 10, marginRight: 'auto' }}>
        {title}
      </span>
      {arrow && (
        <span className="mavx-arrow-box" style={arrowBoxStyles}>
          <span className="mavx-arrow-icon">
            <ArrowIcon />
          </span>
        </span>
      )}
    </>
  );

  const buttonClassName = `mavx-button-${uniqueId} ${className}`.trim();

  if (href) {
    return (
      <a href={href} className={buttonClassName} style={baseStyles} onClick={onClick}>
        {content}
      </a>
    );
  }

  return (
    <button className={buttonClassName} style={baseStyles} onClick={onClick} type="button">
      {content}
    </button>
  );
};

export default Button;

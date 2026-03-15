import React, { CSSProperties, ReactNode } from 'react';
import { tokens, BrandVariant, getBrandColors } from '../../styles/tokens';
import { Button } from '../core/Button';

export interface KineticHeroProps {
  /** Hero title */
  title: string;
  /** Subtitle/description */
  subtitle: string;
  /** CTA button text */
  ctaText?: string;
  /** CTA button link */
  ctaHref?: string;
  /** Video source URL */
  videoSrc?: string;
  /** Background image URL (fallback if no video) */
  backgroundImage?: string;
  /** Brand color variant */
  variant?: BrandVariant;
  /** Minimum height */
  minHeight?: 'full' | 'large' | 'medium';
  /** Show scroll indicator */
  showScrollIndicator?: boolean;
  /** Additional content */
  children?: ReactNode;
  /** Additional class name */
  className?: string;
}

const ChevronDownIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 9l-7 7-7-7" />
  </svg>
);

export const KineticHero: React.FC<KineticHeroProps> = ({
  title,
  subtitle,
  ctaText,
  ctaHref,
  videoSrc,
  backgroundImage,
  variant = 'default',
  minHeight = 'full',
  showScrollIndicator = true,
  children,
  className = '',
}) => {
  const brand = getBrandColors(variant);

  const minHeightValues = {
    full: '100vh',
    large: '80vh',
    medium: '60vh',
  };

  const containerStyles: CSSProperties = {
    position: 'relative',
    minHeight: minHeightValues[minHeight],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  const overlayStyles: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.6) 100%)',
  };

  const mediaStyles: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  const fallbackStyles: CSSProperties = {
    ...mediaStyles,
    background: `linear-gradient(135deg, ${tokens.colors.gray[500]} 0%, ${tokens.colors.bgPure} 100%)`,
  };

  const bgImageStyles: CSSProperties = {
    ...mediaStyles,
    backgroundImage: `url(${backgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  const contentWrapperStyles: CSSProperties = {
    position: 'relative',
    zIndex: 3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: `${tokens.spacing['2xl']} ${tokens.spacing.lg}`,
  };

  const contentStyles: CSSProperties = {
    maxWidth: '1120px',
    textAlign: 'center',
  };

  const titleStyles: CSSProperties = {
    fontFamily: tokens.typography.fontFamily.tight,
    fontSize: tokens.typography.fontSize.displayXl,
    fontWeight: tokens.typography.fontWeight.medium,
    color: tokens.colors.fgPrimary,
    lineHeight: tokens.typography.lineHeight.tight,
    letterSpacing: '-0.01em',
    marginBottom: tokens.spacing.md,
  };

  const subtitleStyles: CSSProperties = {
    fontFamily: tokens.typography.fontFamily.sans,
    fontSize: tokens.typography.fontSize.bodyLg,
    fontWeight: tokens.typography.fontWeight.normal,
    color: tokens.colors.fgSecondary,
    lineHeight: tokens.typography.lineHeight.relaxed,
    maxWidth: '672px',
    margin: `0 auto ${tokens.spacing.lg}`,
  };

  const ctaContainerStyles: CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
  };

  const childrenContainerStyles: CSSProperties = {
    marginTop: tokens.spacing.lg,
  };

  const scrollIndicatorStyles: CSSProperties = {
    position: 'absolute',
    bottom: '32px',
    right: '32px',
    zIndex: 4,
    opacity: 0.4,
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
    transition: `opacity ${tokens.animation.duration.standard} ${tokens.animation.easing.standard}`,
  };

  // Hover/responsive styles
  const hoverCSS = `
    .mavx-hero-scroll:hover {
      opacity: 1 !important;
    }
    @media (max-width: ${tokens.breakpoints.lg}) {
      .mavx-hero-scroll {
        display: none;
      }
      .mavx-hero-title {
        font-size: ${tokens.typography.fontSize.display} !important;
      }
      .mavx-hero-subtitle {
        font-size: ${tokens.typography.fontSize.body} !important;
      }
    }
    @media (max-width: ${tokens.breakpoints.md}) {
      .mavx-hero-title {
        font-size: ${tokens.typography.fontSize.h1} !important;
      }
    }
  `;

  const handleScrollDown = () => {
    const hero = document.querySelector('.mavx-kinetic-hero');
    if (hero?.nextElementSibling) {
      hero.nextElementSibling.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className={`mavx-kinetic-hero ${className}`} style={containerStyles}>
      <style>{hoverCSS}</style>

      {/* Background - Video, Image, or Gradient */}
      {videoSrc ? (
        <video style={mediaStyles} autoPlay loop muted playsInline>
          <source src={videoSrc} type="video/mp4" />
        </video>
      ) : backgroundImage ? (
        <div style={bgImageStyles} />
      ) : (
        <div style={fallbackStyles} />
      )}

      {/* Overlay */}
      <div style={overlayStyles} />

      {/* Content */}
      <div style={contentWrapperStyles}>
        <div style={contentStyles}>
          <h1 className="mavx-hero-title" style={titleStyles}>
            {title}
          </h1>
          <p className="mavx-hero-subtitle" style={subtitleStyles}>
            {subtitle}
          </p>

          {ctaText && (
            <div style={ctaContainerStyles}>
              <Button
                title={ctaText}
                href={ctaHref}
                arrow
                light  // Maverick X: hero buttons use light mode
                variant={variant}
              />
            </div>
          )}

          {children && <div style={childrenContainerStyles}>{children}</div>}
        </div>
      </div>

      {/* Scroll Indicator */}
      {showScrollIndicator && (
        <button
          className="mavx-hero-scroll"
          style={scrollIndicatorStyles}
          onClick={handleScrollDown}
          aria-label="Scroll down"
        >
          <ChevronDownIcon color={tokens.colors.fgPrimary} />
        </button>
      )}
    </div>
  );
};

export default KineticHero;

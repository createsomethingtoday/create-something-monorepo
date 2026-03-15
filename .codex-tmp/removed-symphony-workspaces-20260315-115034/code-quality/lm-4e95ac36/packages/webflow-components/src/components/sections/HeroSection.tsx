import React, { CSSProperties } from 'react';
import { tokens, BrandVariant } from '../../styles/tokens';
import { Button } from '../core/Button';

export interface HeroSectionProps {
  /** Video source URL */
  videoSrc: string;
  /** Hero title */
  title: string;
  /** Hero description */
  description: string;
  /** CTA button text */
  ctaText: string;
  /** CTA button link */
  ctaHref?: string;
  /** Brand color variant */
  variant?: BrandVariant;
  /** Additional class name */
  className?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  videoSrc,
  title,
  description,
  ctaText,
  ctaHref = '/contact',
  variant = 'default',
  className = '',
}) => {
  const containerStyles: CSSProperties = {
    position: 'relative',
    minHeight: '100vh',
    overflow: 'hidden',
  };

  const videoStyles: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    zIndex: 1,
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

  const contentWrapperStyles: CSSProperties = {
    position: 'relative',
    zIndex: 3,
    display: 'flex',
    alignItems: 'flex-end',
    minHeight: '100vh',
    padding: '168px 42px 80px', // hero-container: pt-[10.5rem] pb-[5rem]
    maxWidth: '1536px',
    margin: '0 auto',
  };

  const contentStyles: CSSProperties = {
    maxWidth: '800px', // max-w-[50rem]
  };

  const titleStyles: CSSProperties = {
    fontFamily: tokens.typography.fontFamily.tight,
    fontSize: 'clamp(2rem, 8vw, 6rem)', // hero-title responsive
    fontWeight: tokens.typography.fontWeight.medium,
    color: tokens.colors.fgPrimary,
    lineHeight: '1.1',
    letterSpacing: '-0.02em',
    marginBottom: tokens.spacing.md,
  };

  const descriptionStyles: CSSProperties = {
    fontFamily: tokens.typography.fontFamily.sans,
    fontSize: tokens.typography.fontSize.bodyLg,
    fontWeight: tokens.typography.fontWeight.normal,
    color: 'rgba(255, 255, 255, 0.8)', // text-white/80
    lineHeight: tokens.typography.lineHeight.relaxed,
    maxWidth: '672px', // max-w-[42rem]
    marginBottom: tokens.spacing.lg,
  };

  const ctaContainerStyles: CSSProperties = {
    display: 'flex',
  };

  // Responsive styles
  const responsiveCSS = `
    @media (max-width: ${tokens.breakpoints.xl}) {
      .hero-section-content-wrapper {
        padding-top: 120px !important;
        padding-bottom: 64px !important;
      }
      .hero-section-title {
        font-size: clamp(2rem, 6vw, 5rem) !important;
      }
      .hero-section-description {
        font-size: ${tokens.typography.fontSize.body} !important;
      }
    }
    @media (max-width: ${tokens.breakpoints.md}) {
      .hero-section-content-wrapper {
        align-items: center !important;
        justify-content: center !important;
        padding-top: 96px !important;
        padding-bottom: 48px !important;
      }
      .hero-section-content {
        text-align: center;
        max-width: 100% !important;
      }
      .hero-section-title {
        font-size: clamp(2rem, 5vw, 2.5rem) !important;
      }
      .hero-section-description {
        font-size: ${tokens.typography.fontSize.bodySm} !important;
        max-width: 448px !important;
        margin-left: auto;
        margin-right: auto;
      }
      .hero-section-cta {
        justify-content: center;
      }
    }
  `;

  return (
    <div className={`hero-section ${className}`} style={containerStyles}>
      <style>{responsiveCSS}</style>

      {/* Video Background */}
      <video style={videoStyles} autoPlay loop muted playsInline>
        <source src={videoSrc} type="video/mp4" />
      </video>

      {/* Overlay */}
      <div style={overlayStyles} />

      {/* Content */}
      <div className="hero-section-content-wrapper" style={contentWrapperStyles}>
        <div className="hero-section-content" style={contentStyles}>
          <h1 className="hero-section-title" style={titleStyles}>
            {title}
          </h1>
          <p className="hero-section-description" style={descriptionStyles}>
            {description}
          </p>
          <div className="hero-section-cta" style={ctaContainerStyles}>
            <Button
              title={ctaText}
              href={ctaHref}
              arrow
              light
              variant={variant}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;

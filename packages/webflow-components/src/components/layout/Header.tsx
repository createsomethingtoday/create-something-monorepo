import React, { CSSProperties, useState, useEffect } from 'react';
import { tokens, BrandVariant, getBrandColors } from '../../styles/tokens';
import { Button } from '../core/Button';

export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

export interface HeaderProps {
  /** Logo text or image URL */
  logo?: string;
  /** Is logo an image URL */
  logoIsImage?: boolean;
  /** Icon-only logo URL (for collapsed state) */
  logoIcon?: string;
  /** Logo expanded state - true on home page, false on internal pages */
  logoExpanded?: boolean;
  /** Animate logo expansion on load */
  animateLogo?: boolean;
  /** Navigation items (JSON string for Webflow) */
  navItems?: string;
  /** CTA button text */
  ctaText?: string;
  /** CTA button link */
  ctaHref?: string;
  /** Brand color variant */
  variant?: BrandVariant;
  /** Light mode (for dark backgrounds) */
  lightMode?: boolean;
  /** Additional class name */
  className?: string;
}

const HamburgerIcon: React.FC<{ color: string; isOpen: boolean }> = ({ color, isOpen }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {isOpen ? (
      <>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </>
    ) : (
      <>
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </>
    )}
  </svg>
);

/**
 * Default nav items
 */
const defaultNavItems: NavItem[] = [
  { label: 'Products', href: '/products' },
  { label: 'Solutions', href: '/solutions' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export const Header: React.FC<HeaderProps> = ({
  logo = 'MAVERICK X',
  logoIsImage = false,
  logoIcon,
  logoExpanded = true,
  animateLogo = false,
  navItems: navItemsJson,
  ctaText,
  ctaHref,
  variant = 'default',
  lightMode = true,
  className = '',
}) => {
  const brand = getBrandColors(variant);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLogoExpanded, setIsLogoExpanded] = useState(animateLogo ? false : logoExpanded);

  // Animate logo expansion after mount (mimics original 600ms delay)
  useEffect(() => {
    if (animateLogo && logoExpanded) {
      const timer = setTimeout(() => {
        setIsLogoExpanded(true);
      }, 600);
      return () => clearTimeout(timer);
    } else {
      setIsLogoExpanded(logoExpanded);
    }
  }, [animateLogo, logoExpanded]);

  // Logo dimensions matching original (28px height, aspect ratios from SVG)
  const logoHeight = 28;
  const iconWidth = 28; // Icon-only width
  const fullLogoWidth = 129; // Full logo with text width

  // Parse nav items
  let parsedNavItems: NavItem[] = defaultNavItems;
  if (navItemsJson) {
    try {
      parsedNavItems = JSON.parse(navItemsJson);
    } catch {
      // Keep defaults
    }
  }

  const fgColor = lightMode ? tokens.colors.fgPrimary : tokens.colors.gray[500];
  const bgColor = lightMode ? 'transparent' : tokens.colors.white[50];

  const headerStyles: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: bgColor,
    transition: `all ${tokens.animation.duration.standard} ${tokens.animation.easing.standard}`,
  };

  const containerStyles: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: '1536px',
    margin: '0 auto',
    padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
  };

  const logoStyles: CSSProperties = {
    fontFamily: tokens.typography.fontFamily.tight,
    fontSize: tokens.typography.fontSize.h4,
    fontWeight: tokens.typography.fontWeight.bold,
    color: fgColor,
    textDecoration: 'none',
    letterSpacing: '-0.02em',
  };

  const logoImageStyles: CSSProperties = {
    height: '32px',
    width: 'auto',
  };

  // Animated logo container - clips the full logo SVG
  const logoContainerStyles: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
    width: isLogoExpanded ? `${fullLogoWidth}px` : `${iconWidth}px`,
    height: `${logoHeight}px`,
    transition: `width 500ms ${tokens.animation.easing.standard}`,
  };

  const logoAnimatedImageStyles: CSSProperties = {
    height: `${logoHeight}px`,
    width: 'auto',
    minWidth: `${fullLogoWidth}px`, // Prevent shrinking
  };

  const navStyles: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.lg,
  };

  const navLinkStyles: CSSProperties = {
    fontFamily: tokens.typography.fontFamily.sans,
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.medium,
    color: lightMode ? tokens.colors.fgSecondary : tokens.colors.gray[300],
    textDecoration: 'none',
    transition: `color ${tokens.animation.duration.micro} ${tokens.animation.easing.standard}`,
  };

  const mobileMenuButtonStyles: CSSProperties = {
    display: 'none',
    background: 'none',
    border: 'none',
    padding: tokens.spacing.xs,
    cursor: 'pointer',
  };

  const mobileMenuStyles: CSSProperties = {
    display: mobileMenuOpen ? 'flex' : 'none',
    position: 'fixed',
    top: '72px',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: lightMode ? tokens.colors.bgPure : tokens.colors.white[50],
    flexDirection: 'column',
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
    zIndex: 49,
  };

  const mobileNavLinkStyles: CSSProperties = {
    ...navLinkStyles,
    fontSize: tokens.typography.fontSize.h4,
    padding: `${tokens.spacing.sm} 0`,
    borderBottom: `1px solid ${tokens.colors.borderDefault}`,
  };

  // Responsive styles
  const responsiveCSS = `
    .mavx-header-nav-link:hover {
      color: ${fgColor} !important;
    }
    @media (max-width: ${tokens.breakpoints.lg}) {
      .mavx-header-nav {
        display: none !important;
      }
      .mavx-header-mobile-btn {
        display: block !important;
      }
    }
    @media (min-width: ${tokens.breakpoints.lg}) {
      .mavx-header-mobile-menu {
        display: none !important;
      }
    }
  `;

  return (
    <>
      <header className={`mavx-header ${className}`} style={headerStyles}>
        <style>{responsiveCSS}</style>
        <div style={containerStyles}>
          {/* Logo */}
          <a href="/" style={logoStyles}>
            {logoIsImage ? (
              logoIcon ? (
                // Animated logo with expansion effect
                <div style={logoContainerStyles}>
                  <img src={logo} alt="Logo" style={logoAnimatedImageStyles} />
                </div>
              ) : (
                // Static logo image
                <img src={logo} alt="Logo" style={logoImageStyles} />
              )
            ) : (
              logo
            )}
          </a>

          {/* Desktop Navigation */}
          <nav className="mavx-header-nav" style={navStyles}>
            {parsedNavItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="mavx-header-nav-link"
                style={navLinkStyles}
              >
                {item.label}
              </a>
            ))}

            {ctaText && (
              <Button
                title={ctaText}
                href={ctaHref}
                variant={variant}
              />
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="mavx-header-mobile-btn"
            style={mobileMenuButtonStyles}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            <HamburgerIcon color={fgColor} isOpen={mobileMenuOpen} />
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      <div className="mavx-header-mobile-menu" style={mobileMenuStyles}>
        {parsedNavItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            style={mobileNavLinkStyles}
            onClick={() => setMobileMenuOpen(false)}
          >
            {item.label}
          </a>
        ))}

        {ctaText && (
          <div style={{ marginTop: tokens.spacing.md }}>
            <Button
              title={ctaText}
              href={ctaHref}
              variant={variant}
            />
          </div>
        )}
      </div>
    </>
  );
};

export default Header;

import React, { CSSProperties, useMemo, useState } from 'react';
import { tokens } from '../../styles/tokens';
import { Inline, Stack, Text } from '../primitives';

export interface NavigationLink {
  label: string;
  href: string;
}

export interface NavigationProps {
  logo?: string;
  logoSuffix?: string;
  logoHref?: string;
  links?: string;
  currentPath?: string;
  fixed?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
  mobileMenuLabel?: string;
  className?: string;
}

const defaultLinks: NavigationLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Work', href: '/work' },
  { label: 'Papers', href: '/papers' },
  { label: 'Contact', href: '/contact' },
];

function parseLinks(links?: string): NavigationLink[] {
  if (!links) return defaultLinks;

  try {
    const parsed = JSON.parse(links) as NavigationLink[];
    return parsed.length > 0 ? parsed : defaultLinks;
  } catch {
    return defaultLinks;
  }
}

function isActivePath(currentPath: string, href: string) {
  if (href === '/') return currentPath === '/';
  return currentPath.startsWith(href);
}

export const Navigation: React.FC<NavigationProps> = ({
  logo = 'CREATE SOMETHING',
  logoSuffix,
  logoHref = '/',
  links,
  currentPath = '/',
  fixed = false,
  ctaLabel,
  ctaHref,
  mobileMenuLabel = 'Menu',
  className = '',
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navLinks = useMemo(() => parseLinks(links), [links]);

  const containerStyles: CSSProperties = {
    position: fixed ? 'fixed' : 'relative',
    top: fixed ? 0 : undefined,
    left: fixed ? 0 : undefined,
    right: fixed ? 0 : undefined,
    zIndex: fixed ? 40 : undefined,
    background: fixed ? tokens.colors.bgPure : 'transparent',
    backdropFilter: fixed ? 'blur(12px)' : undefined,
    WebkitBackdropFilter: fixed ? 'blur(12px)' : undefined,
    borderBottom: `1px solid ${fixed ? tokens.colors.borderDefault : 'transparent'}`,
  };

  const innerStyles: CSSProperties = {
    maxWidth: '1180px',
    margin: '0 auto',
    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
  };

  const logoStyles: CSSProperties = {
    color: tokens.colors.fgPrimary,
    textDecoration: 'none',
  };

  const linkBaseStyles: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.5rem 0.75rem',
    borderRadius: tokens.radii.md,
    color: tokens.colors.fgSecondary,
    textDecoration: 'none',
    fontSize: tokens.typography.fontSize.bodySm,
    fontWeight: tokens.typography.fontWeight.medium,
    transition: `color ${tokens.animation.duration.micro} ${tokens.animation.easing.standard}, background ${tokens.animation.duration.micro} ${tokens.animation.easing.standard}`,
  };

  const ctaStyles: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '40px',
    padding: '0.625rem 1rem',
    borderRadius: tokens.radii.lg,
    background: tokens.colors.fgPrimary,
    color: tokens.colors.bgPure,
    textDecoration: 'none',
    fontSize: tokens.typography.fontSize.bodySm,
    fontWeight: tokens.typography.fontWeight.semibold,
    border: '1px solid transparent',
  };

  const mobileButtonStyles: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '44px',
    minHeight: '44px',
    padding: '0.5rem',
    border: `1px solid ${tokens.colors.borderDefault}`,
    borderRadius: tokens.radii.md,
    background: tokens.colors.bgSurface,
    color: tokens.colors.fgPrimary,
  };

  const mobilePanelStyles: CSSProperties = {
    display: mobileMenuOpen ? 'flex' : 'none',
    flexDirection: 'column',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.sm,
    padding: tokens.spacing.sm,
    borderRadius: tokens.radii.lg,
    background: tokens.colors.bgSurface,
    border: `1px solid ${tokens.colors.borderDefault}`,
  };

  const navigationCss = `
    .canon-navigation-link:hover {
      color: ${tokens.colors.fgPrimary};
      background: ${tokens.colors.hover};
    }
    .canon-navigation-link[data-active="true"] {
      color: ${tokens.colors.fgPrimary};
      background: ${tokens.colors.active};
    }
    .canon-navigation-link:focus-visible,
    .canon-navigation-cta:focus-visible,
    .canon-navigation-mobile-toggle:focus-visible,
    .canon-navigation-mobile-link:focus-visible {
      outline: 2px solid ${tokens.colors.focus};
      outline-offset: 2px;
    }
    .canon-navigation-cta:hover {
      opacity: 0.92;
    }
    @media (max-width: ${tokens.breakpoints.lg}) {
      .canon-navigation-desktop {
        display: none !important;
      }
    }
    @media (min-width: ${tokens.breakpoints.lg}) {
      .canon-navigation-mobile-toggle,
      .canon-navigation-mobile-panel {
        display: none !important;
      }
    }
  `;

  return (
    <nav className={className} style={containerStyles} aria-label="Primary">
      <style>{navigationCss}</style>
      <div style={innerStyles}>
        <Inline justify="space-between" align="center" wrap="nowrap">
          <a href={logoHref} style={logoStyles}>
            <Inline gap="xs" align="baseline" wrap="nowrap">
              <Text as="span" size="h5" weight="bold" tone="primary">
                {logo}
              </Text>
              {logoSuffix ? (
                <Text as="span" size="sm" tone="tertiary">
                  {logoSuffix}
                </Text>
              ) : null}
            </Inline>
          </a>

          <Inline className="canon-navigation-desktop" gap="xs" align="center" wrap="nowrap">
            {navLinks.map((link) => {
              const active = isActivePath(currentPath, link.href);
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className="canon-navigation-link"
                  data-active={active}
                  style={linkBaseStyles}
                  aria-current={active ? 'page' : undefined}
                >
                  {link.label}
                </a>
              );
            })}

            {ctaLabel && ctaHref ? (
              <a href={ctaHref} className="canon-navigation-cta" style={ctaStyles}>
                {ctaLabel}
              </a>
            ) : null}
          </Inline>

          <button
            type="button"
            className="canon-navigation-mobile-toggle"
            style={mobileButtonStyles}
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)' }}>
              {mobileMenuLabel}
            </span>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              {mobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </Inline>

        <Stack className="canon-navigation-mobile-panel" style={mobilePanelStyles}>
          {navLinks.map((link) => {
            const active = isActivePath(currentPath, link.href);
            return (
              <a
                key={link.href}
                href={link.href}
                className="canon-navigation-mobile-link canon-navigation-link"
                data-active={active}
                style={{ ...linkBaseStyles, width: '100%' }}
                aria-current={active ? 'page' : undefined}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            );
          })}

          {ctaLabel && ctaHref ? (
            <a href={ctaHref} className="canon-navigation-cta" style={ctaStyles} onClick={() => setMobileMenuOpen(false)}>
              {ctaLabel}
            </a>
          ) : null}
        </Stack>
      </div>
    </nav>
  );
};

export default Navigation;

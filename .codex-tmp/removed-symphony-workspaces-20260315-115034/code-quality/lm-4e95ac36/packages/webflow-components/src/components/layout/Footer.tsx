import React, { CSSProperties } from 'react';
import { tokens, BrandVariant, getBrandColors } from '../../styles/tokens';

export interface FooterColumn {
  title: string;
  links: { label: string; href: string }[];
}

export interface SocialLink {
  platform: 'linkedin' | 'twitter' | 'youtube' | 'instagram' | 'facebook';
  href: string;
}

export interface FooterProps {
  /** Logo text or image URL */
  logo?: string;
  /** Is logo an image URL */
  logoIsImage?: boolean;
  /** Company tagline */
  tagline?: string;
  /** Footer columns (JSON string for Webflow) */
  columns?: string;
  /** Social links (JSON string for Webflow) */
  socialLinks?: string;
  /** Copyright text */
  copyright?: string;
  /** Brand color variant */
  variant?: BrandVariant;
  /** Additional class name */
  className?: string;
}

const SocialIcon: React.FC<{ platform: string; color: string }> = ({ platform, color }) => {
  const iconSize = 20;
  const props = {
    width: iconSize,
    height: iconSize,
    fill: color,
    viewBox: '0 0 24 24',
  };

  switch (platform) {
    case 'linkedin':
      return (
        <svg {...props}>
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      );
    case 'twitter':
      return (
        <svg {...props}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg {...props}>
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg {...props}>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg {...props}>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    default:
      return null;
  }
};

/**
 * Default footer columns
 */
const defaultColumns: FooterColumn[] = [
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'News', href: '/news' },
    ],
  },
  {
    title: 'Products',
    links: [
      { label: 'LithX', href: '/lithx' },
      { label: 'PetroX', href: '/petrox' },
      { label: 'DME', href: '/dme' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '/docs' },
      { label: 'Support', href: '/support' },
      { label: 'Contact', href: '/contact' },
    ],
  },
];

const defaultSocialLinks: SocialLink[] = [
  { platform: 'linkedin', href: 'https://linkedin.com' },
  { platform: 'twitter', href: 'https://twitter.com' },
];

export const Footer: React.FC<FooterProps> = ({
  logo = 'MAVERICK X',
  logoIsImage = false,
  tagline = 'Transforming industries with sustainable technology.',
  columns: columnsJson,
  socialLinks: socialLinksJson,
  copyright = `© ${new Date().getFullYear()} Maverick X. All rights reserved.`,
  variant = 'default',
  className = '',
}) => {
  const brand = getBrandColors(variant);

  // Parse columns
  let parsedColumns: FooterColumn[] = defaultColumns;
  if (columnsJson) {
    try {
      parsedColumns = JSON.parse(columnsJson);
    } catch {
      // Keep defaults
    }
  }

  // Parse social links
  let parsedSocialLinks: SocialLink[] = defaultSocialLinks;
  if (socialLinksJson) {
    try {
      parsedSocialLinks = JSON.parse(socialLinksJson);
    } catch {
      // Keep defaults
    }
  }

  const footerStyles: CSSProperties = {
    backgroundColor: tokens.colors.bgPure,
    padding: `${tokens.spacing['2xl']} ${tokens.spacing.lg}`,
    borderTop: `1px solid ${tokens.colors.borderDefault}`,
  };

  const containerStyles: CSSProperties = {
    maxWidth: '1280px',
    margin: '0 auto',
  };

  const topRowStyles: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: tokens.spacing.xl,
    marginBottom: tokens.spacing.xl,
  };

  const brandColumnStyles: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.md,
  };

  const logoStyles: CSSProperties = {
    fontFamily: tokens.typography.fontFamily.tight,
    fontSize: tokens.typography.fontSize.h3,
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.fgPrimary,
    textDecoration: 'none',
    letterSpacing: '-0.02em',
  };

  const logoImageStyles: CSSProperties = {
    height: '32px',
    width: 'auto',
  };

  const taglineStyles: CSSProperties = {
    fontFamily: tokens.typography.fontFamily.sans,
    fontSize: tokens.typography.fontSize.bodySm,
    color: tokens.colors.fgTertiary,
    lineHeight: tokens.typography.lineHeight.relaxed,
    maxWidth: '280px',
  };

  const columnsGridStyles: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${parsedColumns.length}, 1fr)`,
    gap: tokens.spacing.lg,
  };

  const columnTitleStyles: CSSProperties = {
    fontFamily: tokens.typography.fontFamily.tight,
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.fgPrimary,
    marginBottom: tokens.spacing.md,
  };

  const linkListStyles: CSSProperties = {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.sm,
  };

  const linkStyles: CSSProperties = {
    fontFamily: tokens.typography.fontFamily.sans,
    fontSize: tokens.typography.fontSize.bodySm,
    color: tokens.colors.fgTertiary,
    textDecoration: 'none',
    transition: `color ${tokens.animation.duration.micro} ${tokens.animation.easing.standard}`,
  };

  const bottomRowStyles: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: tokens.spacing.lg,
    borderTop: `1px solid ${tokens.colors.borderDefault}`,
  };

  const copyrightStyles: CSSProperties = {
    fontFamily: tokens.typography.fontFamily.sans,
    fontSize: tokens.typography.fontSize.caption,
    color: tokens.colors.fgMuted,
  };

  const socialLinksStyles: CSSProperties = {
    display: 'flex',
    gap: tokens.spacing.md,
  };

  const socialLinkStyles: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: tokens.colors.bgSubtle,
    transition: `all ${tokens.animation.duration.micro} ${tokens.animation.easing.standard}`,
  };

  // Responsive/hover styles
  const responsiveCSS = `
    .mavx-footer-link:hover {
      color: ${tokens.colors.fgPrimary} !important;
    }
    .mavx-footer-social:hover {
      background-color: ${brand.primary} !important;
    }
    @media (max-width: ${tokens.breakpoints.lg}) {
      .mavx-footer-top {
        grid-template-columns: 1fr !important;
      }
      .mavx-footer-columns {
        grid-template-columns: repeat(2, 1fr) !important;
      }
    }
    @media (max-width: ${tokens.breakpoints.md}) {
      .mavx-footer-columns {
        grid-template-columns: 1fr !important;
      }
      .mavx-footer-bottom {
        flex-direction: column !important;
        gap: ${tokens.spacing.md} !important;
        text-align: center;
      }
    }
  `;

  return (
    <footer className={`mavx-footer ${className}`} style={footerStyles}>
      <style>{responsiveCSS}</style>
      <div style={containerStyles}>
        {/* Top Row */}
        <div className="mavx-footer-top" style={topRowStyles}>
          {/* Brand Column */}
          <div style={brandColumnStyles}>
            <a href="/" style={logoStyles}>
              {logoIsImage ? (
                <img src={logo} alt="Logo" style={logoImageStyles} />
              ) : (
                logo
              )}
            </a>
            {tagline && <p style={taglineStyles}>{tagline}</p>}
          </div>

          {/* Link Columns */}
          <div className="mavx-footer-columns" style={columnsGridStyles}>
            {parsedColumns.map((column) => (
              <div key={column.title}>
                <h4 style={columnTitleStyles}>{column.title}</h4>
                <ul style={linkListStyles}>
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="mavx-footer-link" style={linkStyles}>
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Row */}
        <div className="mavx-footer-bottom" style={bottomRowStyles}>
          <p style={copyrightStyles}>{copyright}</p>

          {parsedSocialLinks.length > 0 && (
            <div style={socialLinksStyles}>
              {parsedSocialLinks.map((social) => (
                <a
                  key={social.platform}
                  href={social.href}
                  className="mavx-footer-social"
                  style={socialLinkStyles}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.platform}
                >
                  <SocialIcon platform={social.platform} color={tokens.colors.fgSecondary} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;

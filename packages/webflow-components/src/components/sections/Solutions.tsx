import React, { CSSProperties, useState } from 'react';
import { tokens, BrandVariant, getBrandColors } from '../../styles/tokens';

export interface SolutionTab {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  features?: string[];
  imageSrc?: string;
}

export interface SolutionsProps {
  /** Section heading */
  heading?: string;
  /** Tabs data (JSON string for Webflow) */
  tabs?: string;
  /** Brand color variant */
  variant?: BrandVariant;
  /** Additional class name */
  className?: string;
}

/**
 * Default tabs for demo
 */
const defaultTabs: SolutionTab[] = [
  {
    id: 'standard',
    title: 'Standard',
    subtitle: 'Entry-level solution',
    description: 'Perfect for small to medium operations looking to optimize their processes with proven technology.',
    features: ['99% efficiency rating', '24/7 monitoring', 'Remote diagnostics'],
  },
  {
    id: 'advanced',
    title: 'Advanced',
    subtitle: 'Enhanced capabilities',
    description: 'Designed for larger operations requiring higher throughput and advanced automation features.',
    features: ['Higher capacity', 'AI-powered optimization', 'Predictive maintenance'],
  },
  {
    id: 'enterprise',
    title: 'Enterprise',
    subtitle: 'Full-scale deployment',
    description: 'Comprehensive solution for enterprise-level operations with maximum scalability and customization.',
    features: ['Unlimited scale', 'Custom integrations', 'Dedicated support'],
  },
];

export const Solutions: React.FC<SolutionsProps> = ({
  heading = 'Our Solutions',
  tabs: tabsJson,
  variant = 'default',
  className = '',
}) => {
  const brand = getBrandColors(variant);

  // Parse tabs from JSON
  let parsedTabs: SolutionTab[] = defaultTabs;
  if (tabsJson) {
    try {
      parsedTabs = JSON.parse(tabsJson);
    } catch {
      // Keep defaults on parse error
    }
  }

  const [activeTab, setActiveTab] = useState(parsedTabs[0]?.id || '');
  const activeTabData = parsedTabs.find((t) => t.id === activeTab) || parsedTabs[0];

  const sectionStyles: CSSProperties = {
    backgroundColor: tokens.colors.bgPure,
    padding: `${tokens.spacing['2xl']} ${tokens.spacing.lg}`,
  };

  const containerStyles: CSSProperties = {
    maxWidth: '1280px',
    margin: '0 auto',
  };

  const headingStyles: CSSProperties = {
    fontFamily: tokens.typography.fontFamily.tight,
    fontSize: tokens.typography.fontSize.h1,
    fontWeight: tokens.typography.fontWeight.medium,
    color: tokens.colors.fgPrimary,
    marginBottom: tokens.spacing.xl,
    textAlign: 'center',
  };

  const contentGridStyles: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '280px 1fr',
    gap: tokens.spacing.xl,
  };

  const tabListStyles: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.sm,
  };

  const getTabStyles = (isActive: boolean): CSSProperties => ({
    display: 'block',
    width: '100%',
    padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
    backgroundColor: isActive ? tokens.colors.bgSurface : 'transparent',
    border: `1px solid ${isActive ? brand.primary : tokens.colors.borderDefault}`,
    borderRadius: 0, // Maverick X: no border radius
    cursor: 'pointer',
    textAlign: 'left',
    transition: `all ${tokens.animation.duration.standard} ${tokens.animation.easing.standard}`,
  });

  const tabTitleStyles = (isActive: boolean): CSSProperties => ({
    fontFamily: tokens.typography.fontFamily.tight,
    fontSize: tokens.typography.fontSize.h4,
    fontWeight: tokens.typography.fontWeight.medium,
    color: isActive ? brand.primary : tokens.colors.fgPrimary,
    marginBottom: '4px',
  });

  const tabSubtitleStyles: CSSProperties = {
    fontFamily: tokens.typography.fontFamily.sans,
    fontSize: tokens.typography.fontSize.bodySm,
    color: tokens.colors.fgTertiary,
  };

  const contentPanelStyles: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: tokens.spacing.xl,
    alignItems: 'start',
  };

  const textContentStyles: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.md,
  };

  const panelTitleStyles: CSSProperties = {
    fontFamily: tokens.typography.fontFamily.tight,
    fontSize: tokens.typography.fontSize.h2,
    fontWeight: tokens.typography.fontWeight.medium,
    color: tokens.colors.fgPrimary,
  };

  const panelDescStyles: CSSProperties = {
    fontFamily: tokens.typography.fontFamily.sans,
    fontSize: tokens.typography.fontSize.body,
    color: tokens.colors.fgSecondary,
    lineHeight: tokens.typography.lineHeight.relaxed,
  };

  const featuresListStyles: CSSProperties = {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.sm,
  };

  const featureItemStyles: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    fontFamily: tokens.typography.fontFamily.sans,
    fontSize: tokens.typography.fontSize.body,
    color: tokens.colors.fgSecondary,
  };

  const featureBulletStyles: CSSProperties = {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: brand.primary,
    flexShrink: 0,
  };

  const imageContainerStyles: CSSProperties = {
    aspectRatio: '4/3',
    backgroundColor: tokens.colors.bgSurface,
    borderRadius: 0, // Maverick X: no border radius
    overflow: 'hidden',
  };

  const imageStyles: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  // Responsive styles
  const responsiveCSS = `
    .mavx-solutions-tab:hover {
      border-color: ${brand.primary};
      background-color: ${tokens.colors.bgSubtle};
    }
    @media (max-width: ${tokens.breakpoints.lg}) {
      .mavx-solutions-grid {
        grid-template-columns: 1fr !important;
      }
      .mavx-solutions-tabs {
        flex-direction: row !important;
        overflow-x: auto;
        gap: ${tokens.spacing.sm} !important;
      }
      .mavx-solutions-tab {
        white-space: nowrap;
        min-width: fit-content;
      }
      .mavx-solutions-content {
        grid-template-columns: 1fr !important;
      }
    }
  `;

  return (
    <section className={`mavx-solutions ${className}`} style={sectionStyles}>
      <style>{responsiveCSS}</style>
      <div style={containerStyles}>
        <h2 style={headingStyles}>{heading}</h2>

        <div className="mavx-solutions-grid" style={contentGridStyles}>
          {/* Tab List */}
          <div className="mavx-solutions-tabs" style={tabListStyles} role="tablist">
            {parsedTabs.map((tab) => (
              <button
                key={tab.id}
                className="mavx-solutions-tab"
                style={getTabStyles(activeTab === tab.id)}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={activeTab === tab.id}
              >
                <div style={tabTitleStyles(activeTab === tab.id)}>{tab.title}</div>
                {tab.subtitle && <div style={tabSubtitleStyles}>{tab.subtitle}</div>}
              </button>
            ))}
          </div>

          {/* Content Panel */}
          <div
            className="mavx-solutions-content"
            style={contentPanelStyles}
            role="tabpanel"
          >
            <div style={textContentStyles}>
              <h3 style={panelTitleStyles}>{activeTabData?.title}</h3>
              <p style={panelDescStyles}>{activeTabData?.description}</p>

              {activeTabData?.features && activeTabData.features.length > 0 && (
                <ul style={featuresListStyles}>
                  {activeTabData.features.map((feature, idx) => (
                    <li key={idx} style={featureItemStyles}>
                      <span style={featureBulletStyles} />
                      {feature}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={imageContainerStyles}>
              {activeTabData?.imageSrc ? (
                <img
                  src={activeTabData.imageSrc}
                  alt={activeTabData.title}
                  style={imageStyles}
                />
              ) : (
                <div
                  style={{
                    ...imageStyles,
                    background: `linear-gradient(135deg, ${brand.primary}33 0%, ${tokens.colors.bgSubtle} 100%)`,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Solutions;

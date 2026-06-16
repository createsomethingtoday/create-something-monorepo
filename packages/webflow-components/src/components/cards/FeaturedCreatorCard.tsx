import React, { CSSProperties, memo } from 'react';

export type FeaturedCreatorAccent = 'neutral' | 'momentum' | 'demand' | 'editorial';

export interface FeaturedCreatorCardImage {
  src: string;
  alt?: string;
}

export interface FeaturedCreatorCardLink {
  href: string;
  target?: string;
}

export interface FeaturedCreatorCardProps {
  creatorName?: string;
  creatorLink?: FeaturedCreatorCardLink;
  creatorAvatar?: FeaturedCreatorCardImage;
  monthLabel?: string;
  rankLabel?: string;
  accent?: FeaturedCreatorAccent;
  headline?: string;
  curationNote?: string;
  topTemplateName?: string;
  topTemplateLink?: FeaturedCreatorCardLink;
  topTemplateImage?: FeaturedCreatorCardImage;
  featuredTemplateCount?: string;
  newTemplates90d?: string;
  buyerDemand?: string;
  categoryBreadth?: string;
  ctaLabel?: string;
}

const FALLBACK_TEMPLATE_IMAGE =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 780"%3E%3Crect width="1200" height="780" fill="%23f2f2f0"/%3E%3Cpath d="M140 140h920v500H140z" fill="%23ffffff" stroke="%23d7d5cf" stroke-width="8"/%3E%3Cpath d="M220 230h420v36H220zm0 72h760v26H220zm0 54h610v26H220z" fill="%23c8c5bd"/%3E%3Cpath d="M220 452h220v104H220zm270 0h220v104H490zm270 0h220v104H760z" fill="%23dedbd4"/%3E%3C/svg%3E';

const ACCENTS: Record<FeaturedCreatorAccent, { chipBg: string; chipText: string; border: string; wash: string }> = {
  neutral: {
    chipBg: '#f2f2f0',
    chipText: '#2f2f2f',
    border: 'rgba(0, 0, 0, 0.1)',
    wash: '#f7f7f4',
  },
  momentum: {
    chipBg: '#e9f4ff',
    chipText: '#0f5f93',
    border: 'rgba(15, 95, 147, 0.18)',
    wash: '#f4f9fc',
  },
  demand: {
    chipBg: '#ecf8ee',
    chipText: '#1f6b39',
    border: 'rgba(31, 107, 57, 0.18)',
    wash: '#f6fbf7',
  },
  editorial: {
    chipBg: '#fff4df',
    chipText: '#805000',
    border: 'rgba(128, 80, 0, 0.2)',
    wash: '#fffaf0',
  },
};

// Rendered as an inline <style> inside the component tree: Webflow Code
// Components mount in an isolated root, so document.head injection never
// reaches the card markup.
const CARD_STYLES = `
  .wf-featured-creator-card,
  .wf-featured-creator-card * {
    box-sizing: border-box;
  }

  .wf-featured-creator-card a {
    color: inherit;
    text-decoration: none;
  }

  .wf-featured-creator-card a:hover .wf-featured-creator-template-image {
    transform: scale(1.035);
  }

  .wf-featured-creator-card a:hover .wf-featured-creator-title,
  .wf-featured-creator-card a:hover .wf-featured-creator-cta {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .wf-featured-creator-card a:focus-visible {
    outline: 2px solid #146ef5;
    outline-offset: 3px;
    border-radius: 6px;
  }

  @media (max-width: 520px) {
    .wf-featured-creator-metrics {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .wf-featured-creator-template-image {
      transition: none !important;
      transform: none !important;
    }
  }
`;

function safeText(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'WF';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}

function linkTarget(link: FeaturedCreatorCardLink | undefined): string | undefined {
  return link?.target || undefined;
}

function linkRel(link: FeaturedCreatorCardLink | undefined): string | undefined {
  return link?.target === '_blank' ? 'noreferrer' : undefined;
}

const S: Record<string, CSSProperties> = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '100%',
    minWidth: 0,
    padding: '18px',
    border: '1px solid rgba(0, 0, 0, 0.11)',
    borderRadius: '8px',
    background: '#ffffff',
    color: '#151515',
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    lineHeight: 1.35,
  },
  imageLink: {
    display: 'block',
    position: 'relative',
    width: '100%',
    aspectRatio: '16 / 10',
    overflow: 'hidden',
    borderRadius: '6px',
    background: '#f2f2f0',
  },
  templateImage: {
    display: 'block',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 260ms ease',
  },
  imageOverlay: {
    position: 'absolute',
    inset: 0,
    border: '1px solid rgba(0, 0, 0, 0.08)',
    borderRadius: '6px',
    pointerEvents: 'none',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minWidth: 0,
  },
  avatar: {
    width: '48px',
    height: '48px',
    flex: '0 0 48px',
    borderRadius: '50%',
    objectFit: 'cover',
    background: '#f0f0ed',
    border: '1px solid rgba(0, 0, 0, 0.08)',
  },
  avatarFallback: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    flex: '0 0 48px',
    borderRadius: '50%',
    background: '#f0f0ed',
    color: '#4f4f4f',
    fontSize: '14px',
    fontWeight: 700,
    border: '1px solid rgba(0, 0, 0, 0.08)',
  },
  identity: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    minWidth: 0,
    flex: '1 1 auto',
  },
  eyebrow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: 0,
    color: '#6f6f68',
    fontSize: '12px',
    fontWeight: 650,
    lineHeight: '16px',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  creatorName: {
    display: 'block',
    minWidth: 0,
    margin: 0,
    color: '#111111',
    fontSize: '18px',
    fontWeight: 700,
    lineHeight: '23px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  rank: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
    minHeight: '24px',
    padding: '4px 8px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 750,
    lineHeight: '14px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  headline: {
    margin: 0,
    color: '#111111',
    fontSize: '22px',
    fontWeight: 750,
    lineHeight: '28px',
    letterSpacing: 0,
  },
  note: {
    margin: 0,
    color: '#4f4f4a',
    fontSize: '14px',
    lineHeight: '20px',
  },
  metrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: '8px',
  },
  metric: {
    minWidth: 0,
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    background: '#fafaf8',
  },
  metricValue: {
    display: 'block',
    color: '#111111',
    fontSize: '16px',
    fontWeight: 750,
    lineHeight: '20px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  metricLabel: {
    display: 'block',
    marginTop: '2px',
    color: '#6f6f68',
    fontSize: '11px',
    fontWeight: 650,
    lineHeight: '15px',
    textTransform: 'uppercase',
    letterSpacing: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    minWidth: 0,
    paddingTop: '2px',
  },
  templateName: {
    minWidth: 0,
    color: '#3f3f3a',
    fontSize: '13px',
    lineHeight: '18px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cta: {
    flex: '0 0 auto',
    color: '#111111',
    fontSize: '13px',
    fontWeight: 750,
    lineHeight: '18px',
    whiteSpace: 'nowrap',
  },
};

export const FeaturedCreatorCard = memo(function FeaturedCreatorCard({
  creatorName = 'Featured Creator',
  creatorLink,
  creatorAvatar,
  monthLabel = 'This month',
  rankLabel = 'Featured',
  accent = 'neutral',
  headline,
  curationNote,
  topTemplateName = 'Top template',
  topTemplateLink,
  topTemplateImage,
  featuredTemplateCount = '0',
  newTemplates90d = '0',
  buyerDemand = 'Unavailable',
  categoryBreadth = '0',
  ctaLabel = 'View creator',
}: FeaturedCreatorCardProps) {
  const creator = safeText(creatorName, 'Featured Creator');
  const palette = ACCENTS[accent] ?? ACCENTS.neutral;
  const resolvedHeadline = safeText(headline, `${safeText(featuredTemplateCount, '0')} featured templates`);
  const resolvedNote = safeText(
    curationNote,
    'Selected from marketplace performance, recent launches, and editorial quality signals.',
  );
  const templateImage = topTemplateImage?.src || FALLBACK_TEMPLATE_IMAGE;
  const templateAlt = topTemplateImage?.alt || (topTemplateName ? `${topTemplateName} template preview` : `${creator} template preview`);
  const profileHref = creatorLink?.href || '#';
  const primaryLink = topTemplateLink?.href ? topTemplateLink : creatorLink;
  const primaryHref = primaryLink?.href || '#';

  return (
    <article className="wf-featured-creator-card" style={{ ...S.card, background: `linear-gradient(180deg, ${palette.wash} 0%, #ffffff 42%)` }}>
      <style dangerouslySetInnerHTML={{ __html: CARD_STYLES }} />
      <a href={primaryHref} target={linkTarget(primaryLink)} rel={linkRel(primaryLink)} style={S.imageLink} aria-label={`View ${topTemplateName || creator}`}>
        <img className="wf-featured-creator-template-image" src={templateImage} alt={templateAlt} style={S.templateImage} loading="lazy" decoding="async" />
        <span aria-hidden="true" style={S.imageOverlay} />
      </a>

      <div style={S.header}>
        {creatorAvatar?.src ? (
          <img src={creatorAvatar.src} alt={creatorAvatar.alt || creator} style={S.avatar} loading="lazy" decoding="async" />
        ) : (
          <span aria-hidden="true" style={S.avatarFallback}>
            {initials(creator)}
          </span>
        )}
        <div style={S.identity}>
          <div style={S.eyebrow}>
            <span>{safeText(monthLabel, 'This month')}</span>
          </div>
          <a href={profileHref} target={linkTarget(creatorLink)} rel={linkRel(creatorLink)} aria-label={`View ${creator}`}>
            <h3 className="wf-featured-creator-title" style={S.creatorName}>{creator}</h3>
          </a>
        </div>
        <span style={{ ...S.rank, color: palette.chipText, background: palette.chipBg, border: `1px solid ${palette.border}` }}>
          {safeText(rankLabel, 'Featured')}
        </span>
      </div>

      <div>
        <p style={S.headline}>{resolvedHeadline}</p>
        <p style={S.note}>{resolvedNote}</p>
      </div>

      <div className="wf-featured-creator-metrics" style={S.metrics} aria-label={`${creator} marketplace metrics`}>
        <div style={S.metric}>
          <span style={S.metricValue}>{safeText(featuredTemplateCount, '0')}</span>
          <span style={S.metricLabel}>Featured</span>
        </div>
        <div style={S.metric}>
          <span style={S.metricValue}>{safeText(newTemplates90d, '0')}</span>
          <span style={S.metricLabel}>New 90d</span>
        </div>
        <div style={S.metric}>
          <span style={S.metricValue}>{safeText(buyerDemand, 'Unavailable')}</span>
          <span style={S.metricLabel}>Demand</span>
        </div>
        <div style={S.metric}>
          <span style={S.metricValue}>{safeText(categoryBreadth, '0')}</span>
          <span style={S.metricLabel}>Categories</span>
        </div>
      </div>

      <div style={S.footer}>
        <a href={primaryHref} target={linkTarget(primaryLink)} rel={linkRel(primaryLink)} style={S.templateName} aria-label={`View ${topTemplateName || creator}`}>
          Top template: {safeText(topTemplateName, 'Top template')}
        </a>
        <a className="wf-featured-creator-cta" href={profileHref} target={linkTarget(creatorLink)} rel={linkRel(creatorLink)} style={S.cta}>
          {safeText(ctaLabel, 'View creator')}
        </a>
      </div>
    </article>
  );
});

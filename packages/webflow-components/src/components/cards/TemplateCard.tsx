import React, { CSSProperties, useState, useCallback, useLayoutEffect, memo } from 'react';

export type TemplateCardBadge = 'none' | 'new' | 'featured' | 'reviewed' | 'top-rated';

const BADGE_ICONS: Record<TemplateCardBadge, string> = {
  none: '',
  new: '✦',
  featured: '★',
  reviewed: '✓',
  'top-rated': '◆',
};

export interface TemplateCardImage {
  src: string;
  alt?: string;
}

export interface TemplateCardLink {
  href: string;
  target?: string;
}

export interface TemplateCardProps {
  // Core template data
  templateName?: string;
  templateLink?: TemplateCardLink;
  price?: string;
  priceNumeric?: string;
  creatorName?: string;
  creatorLink?: TemplateCardLink;

  // Images
  primaryImage?: TemplateCardImage;
  secondaryImage?: TemplateCardImage;
  creatorIcon?: TemplateCardImage;

  // Finsweet sort metadata
  approvalDate?: string;
  popularityScore?: string;
  isFree?: boolean;

  // Agent-extended capabilities
  badgeText?: string;
  badgeVariant?: TemplateCardBadge;
  aiScore?: number;
  showAiBadge?: boolean;
  agentNote?: string;

  // Grid-managed rendering hints. Passing these avoids each card scanning the
  // DOM to infer its position when infinite scroll appends large result sets.
  priorityIndex?: number;
  deferSecondaryImage?: boolean;
}

const ARROW_ICON_URL =
  'https://cdn.prod.website-files.com/5e593fb060cf87bbaf75dd20/670878b0296e4ae4034fe652_view-details-arrow.svg';

// Global style injection — one <style> per page, not one per card instance
let _stylesInjected = false;

// 1×1 grey SVG used when the primary image fails to load
const FALLBACK_IMAGE =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 199"%3E%3Crect width="150" height="199" fill="%23e8e8e8"/%3E%3C/svg%3E';

const BADGE_COLORS: Record<TemplateCardBadge, { bg: string; text: string; border: string }> = {
  none: { bg: 'transparent', text: 'transparent', border: 'transparent' },
  new: { bg: 'rgba(59, 130, 246, 0.12)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
  featured: { bg: 'rgba(245, 158, 11, 0.12)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
  reviewed: { bg: 'rgba(34, 197, 94, 0.12)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.3)' },
  'top-rated': { bg: 'rgba(80, 130, 185, 0.15)', text: '#8ab4d8', border: 'rgba(80, 130, 185, 0.35)' },
};

function aiScorePalette(score: number) {
  if (score >= 80) return { bg: 'rgba(34,197,94,0.18)', text: '#4ade80', border: 'rgba(34,197,94,0.3)' };
  if (score >= 55) return { bg: 'rgba(245,158,11,0.18)', text: '#fbbf24', border: 'rgba(245,158,11,0.3)' };
  return { bg: 'rgba(239,68,68,0.18)', text: '#f87171', border: 'rgba(239,68,68,0.3)' };
}

// Inline styles are structural only. Hover effects, transitions, and entrance
// animation live in INJECTED_STYLES so they work on CMS Load cloned items too.
const S: Record<string, CSSProperties> = {
  card: {
    display: 'block',
    position: 'relative',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '14px',
    fontWeight: 400,
    lineHeight: '20px',
    color: 'rgb(51, 51, 51)',
    boxSizing: 'border-box',
    contain: 'style',
  },
  link: {
    display: 'block',
    position: 'relative',
    width: '100%',
    marginBottom: '16px',
    borderRadius: '8px',
    overflow: 'hidden',
    cursor: 'pointer',
    aspectRatio: '150 / 199',
    textDecoration: 'none',
    color: 'inherit',
  },
  primaryImage: {
    display: 'block',
    width: '100%',
    height: '100%',
    borderRadius: '4px',
    objectFit: 'cover',
    aspectRatio: '150 / 199',
    transformOrigin: 'center center',
  },
  imageFallback: {
    display: 'block',
    width: '100%',
    aspectRatio: '150 / 199',
    borderRadius: '4px',
    backgroundColor: 'rgb(232, 232, 232)',
  },
  secondaryImage: {
    display: 'block',
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: '0',
    left: '0',
    borderRadius: '4px',
    objectFit: 'cover',
    aspectRatio: '150 / 199',
    transformOrigin: 'center center',
  },
  hoverOverlay: {
    position: 'absolute',
    inset: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    color: 'rgb(255, 255, 255)',
    cursor: 'pointer',
    pointerEvents: 'none',
    // Hidden by default — driven by React state so it works even when the
    // injected <style> tag is blocked by a page CSP.
    opacity: 0,
    transition: 'opacity 220ms ease',
  },
  hoverContent: {
    display: 'flex',
    padding: '12px 16px',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: '4px',
    color: 'rgb(0, 0, 0)',
    fontSize: '14px',
    fontWeight: 600,
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    transform: 'scale(0.96)',
    transition: 'transform 220ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },
  content: {
    display: 'flex',
    flexDirection: 'row',
    gap: '8px',
  },
  creatorIcon: {
    display: 'block',
    width: '28px',
    height: '28px',
    borderRadius: '100%',
    overflow: 'hidden',
    objectFit: 'cover',
    flexShrink: 0,
  },
  creatorInitials: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '100%',
    flexShrink: 0,
    fontSize: '11px',
    fontWeight: 600,
    color: 'rgba(0,0,0,0.65)',
    backgroundColor: 'rgb(230, 230, 230)',
    userSelect: 'none',
  } as CSSProperties,
  details: {
    display: 'block',
    flex: '1 1 0',
    minWidth: '0',
  },
  detailsWrap: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: '14px',
    lineHeight: '18px',
    color: 'rgb(51, 51, 51)',
  },
  nameWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    minWidth: '0',
    flex: '1 1 0',
  },
  nameLink: {
    display: 'block',
    color: 'rgb(51, 51, 51)',
    textDecoration: 'none',
    maxWidth: '100%',
  },
  name: {
    display: 'block',
    margin: '0',
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: '18px',
    color: 'rgb(0, 0, 0)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  priceWrap: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    marginLeft: '8px',
  },
  price: {
    display: 'block',
    margin: '0',
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: '18px',
    color: 'rgb(51, 51, 51)',
  },
  priceFree: {
    display: 'inline-flex',
    alignItems: 'center',
    margin: '0',
    padding: '0 7px',
    fontSize: '12px',
    fontWeight: 600,
    lineHeight: '18px',
    color: 'rgb(22, 163, 74)',
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
    border: '1px solid rgba(22, 163, 74, 0.22)',
    borderRadius: '4px',
  },
  creatorWrap: {
    display: 'block',
    minWidth: '0',
  },
  creatorLink: {
    display: 'block',
    maxWidth: '100%',
    color: 'rgba(0, 0, 0, 0.6)',
    textDecoration: 'none',
  },
  creator: {
    display: 'block',
    margin: '0',
    fontSize: '14px',
    fontWeight: 400,
    lineHeight: '24px',
    color: 'inherit',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  agentNote: {
    margin: '2px 0 0 0',
    padding: '0',
    fontSize: '11px',
    lineHeight: '1.4',
    color: 'rgba(0, 0, 0, 0.45)',
  },
  badgeBase: {
    position: 'absolute',
    left: '10px',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    backdropFilter: 'blur(8px)',
    pointerEvents: 'none',
  } as CSSProperties,
  aiScoreBase: {
    position: 'absolute',
    left: '10px',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 600,
    backdropFilter: 'blur(8px)',
    pointerEvents: 'none',
  } as CSSProperties,
  hidden: {
    display: 'none',
  },
};

// All interactive behavior is CSS-driven so it works on CMS Load cloned items.
// When Finsweet CMS Load clones a card, React never re-mounts — but CSS :hover
// and @keyframes work on cloned HTML without any JavaScript.
const INJECTED_STYLES = `
/* Entrance animation — plays immediately on DOM insertion, no JS scroll observer needed */
@keyframes tmcard-enter {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.tmcard-wrapper {
  animation: tmcard-enter 500ms ease-out var(--tmcard-stagger, 0ms) both;
  transition: transform 200ms ease, box-shadow 220ms ease, outline-color 150ms ease;
}
@media (prefers-reduced-motion: reduce) {
  .tmcard-wrapper {
    animation: none;
    opacity: 1 !important;
  }
}

/* Card hover: lift + shadow */
.tmcard-wrapper:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.10);
}
.tmcard-wrapper:focus-within {
  outline: 2px solid rgba(59,130,246,0.8);
  outline-offset: 3px;
}

/* Primary image scale */
.tmcard-primary-img {
  transition: transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.tmcard-link:hover .tmcard-primary-img {
  transform: scale(1.04);
}

/* Secondary image hover swap */
.tmcard-secondary-img {
  opacity: 0;
  transition: opacity 280ms ease, transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.tmcard-link:hover .tmcard-secondary-img {
  opacity: 1;
  transform: scale(1.04);
}

/* Hover overlay */
.tmcard-hover-overlay {
  opacity: 0;
  transition: opacity 220ms ease;
}
.tmcard-link:hover .tmcard-hover-overlay {
  opacity: 1;
}
.tmcard-hover-content {
  transform: scale(0.96);
  transition: transform 220ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.tmcard-link:hover .tmcard-hover-content {
  transform: scale(1.04);
}

@media (hover: none) {
  .tmcard-wrapper:hover {
    transform: none;
    box-shadow: none;
  }
  .tmcard-link:hover .tmcard-primary-img,
  .tmcard-link:hover .tmcard-secondary-img,
  .tmcard-link:hover .tmcard-hover-content {
    transform: none;
  }
  .tmcard-link:hover .tmcard-hover-overlay,
  .tmcard-link:hover .tmcard-secondary-img {
    opacity: 0;
  }
}

/* Creator link hover */
.tmcard-creator-link {
  transition: color 150ms ease;
}
.tmcard-creator-link:hover {
  color: rgba(0,0,0,0.9) !important;
  text-decoration: none !important;
  border-bottom: none !important;
}

/* Link / text resets (suppress site-level styles) */
.tmcard-link,
.tmcard-link:hover,
.tmcard-link:focus {
  text-decoration: none !important;
  border-bottom: none !important;
  box-shadow: none !important;
}
.tmcard-link::after,
.tmcard-link::before {
  display: none !important;
  content: none !important;
}
.tmcard-name-link,
.tmcard-name-link:hover,
.tmcard-name-link:focus {
  text-decoration: none !important;
  border-bottom: none !important;
}

/* Shimmer loading skeleton */
@keyframes tmcard-shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}
/* Auto-hide for CMS Load clones where React onLoad never fires */
@keyframes tmcard-shimmer-autohide {
  0%, 80% { opacity: 1; }
  100%     { opacity: 0; pointer-events: none; }
}
.tmcard-shimmer {
  animation: tmcard-shimmer 1.4s infinite linear,
             tmcard-shimmer-autohide 3s ease-out forwards;
  transition: opacity 300ms ease;
}
.tmcard-shimmer--loaded {
  opacity: 0 !important;
  pointer-events: none;
}

/* Finsweet filter/sort hidden fields */
.tmcard-fs-hidden {
  display: none !important;
  visibility: hidden !important;
}
`;

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function relForTarget(target?: string): string | undefined {
  return target === '_blank' ? 'noopener noreferrer' : undefined;
}

function isWithin30Days(dateStr: string): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    return Date.now() - d.getTime() < 30 * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

const TemplateCardInner: React.FC<TemplateCardProps> = ({
  templateName = 'Template Name',
  templateLink,
  price = 'Free',
  priceNumeric = '0',
  creatorName = 'Creator',
  creatorLink,
  primaryImage,
  secondaryImage,
  creatorIcon,
  approvalDate = '',
  popularityScore = '',
  isFree = false,
  badgeText = '',
  badgeVariant = 'none',
  aiScore,
  showAiBadge = false,
  agentNote = '',
  priorityIndex = 0,
  deferSecondaryImage = false,
}) => {
  const [primaryLoaded, setPrimaryLoaded] = useState(false);
  const [primaryError, setPrimaryError] = useState(false);
  const [showShimmer, setShowShimmer] = useState(true);
  const [iconError, setIconError] = useState(false);
  const [isLinkHovered, setIsLinkHovered] = useState(false);
  const [hasRequestedSecondary, setHasRequestedSecondary] = useState(!deferSecondaryImage);

  const handlePrimaryLoad = useCallback(() => {
    setPrimaryLoaded(true);
    setTimeout(() => setShowShimmer(false), 350);
  }, []);
  const handlePrimaryError = useCallback(() => {
    setPrimaryLoaded(true);
    setPrimaryError(true);
    setTimeout(() => setShowShimmer(false), 350);
  }, []);
  const handleIconError = useCallback(() => setIconError(true), []);
  const revealHoverAssets = useCallback(() => {
    setIsLinkHovered(true);
    setHasRequestedSecondary(true);
  }, []);
  const hideHoverAssets = useCallback(() => setIsLinkHovered(false), []);

  // Inject global styles once, synchronously before first paint (useLayoutEffect
  // fires before the browser paints, so the overlay is never visible without CSS)
  useLayoutEffect(() => {
    if (_stylesInjected) return;
    _stylesInjected = true;
    const styleEl = document.createElement('style');
    styleEl.textContent = INJECTED_STYLES;
    document.head.appendChild(styleEl);
  }, []);

  const resolvedPriorityIndex = Math.max(0, priorityIndex);
  const imageLoading: 'eager' | 'lazy' = resolvedPriorityIndex < 6 ? 'eager' : 'lazy';
  const cardStyle = {
    ...S.card,
    '--tmcard-stagger': `${Math.min(resolvedPriorityIndex, 8) * 60}ms`,
  } as CSSProperties;

  // Auto-apply 'new' badge when approvalDate is within 30 days and no explicit variant
  const effectiveBadgeVariant: TemplateCardBadge =
    badgeVariant !== 'none' ? badgeVariant :
    isWithin30Days(approvalDate) ? 'new' : 'none';

  const effectiveBadgeText =
    badgeText || (effectiveBadgeVariant === 'new' && !badgeText ? 'New' : '');

  const badge = BADGE_COLORS[effectiveBadgeVariant];
  const hasBadge = effectiveBadgeText && effectiveBadgeVariant !== 'none';
  const hasAiScore = showAiBadge && aiScore !== undefined;
  const isFreePrice = isFree || price.trim().toLowerCase() === 'free';

  const badgeStyle: CSSProperties = {
    ...S.badgeBase,
    top: '10px',
    backgroundColor: badge.bg,
    color: badge.text,
    border: `1px solid ${badge.border}`,
  };

  const aiPalette = aiScore !== undefined ? aiScorePalette(aiScore) : null;
  const aiScoreStyle: CSSProperties = {
    ...S.aiScoreBase,
    top: hasBadge ? '36px' : '10px',
    backgroundColor: aiPalette?.bg ?? 'rgba(0,0,0,0.6)',
    color: aiPalette?.text ?? 'rgba(255,255,255,0.8)',
    border: `1px solid ${aiPalette?.border ?? 'rgba(255,255,255,0.15)'}`,
  };

  const showIcon = creatorIcon?.src && !iconError;

  return (
    <div
      className="tmcard-wrapper"
      style={cardStyle}
    >
      {/* Primary card link with images */}
      <a
        href={templateLink?.href ?? '#'}
        target={templateLink?.target}
        rel={relForTarget(templateLink?.target)}
        aria-label={`View ${templateName} template`}
        className="tmcard-link"
        style={S.link}
        onMouseEnter={revealHoverAssets}
        onMouseLeave={hideHoverAssets}
        onFocus={revealHoverAssets}
        onBlur={hideHoverAssets}
      >
        {showShimmer && (
          <div
            className={`tmcard-shimmer${primaryLoaded ? ' tmcard-shimmer--loaded' : ''}`}
            style={{
              position: 'absolute',
              inset: '0',
              borderRadius: '4px',
              background:
                'linear-gradient(90deg, rgb(235,235,235) 25%, rgb(245,245,245) 50%, rgb(235,235,235) 75%)',
              backgroundSize: '800px 100%',
              pointerEvents: 'none',
            }}
          />
        )}

        {primaryError ? (
          <div style={S.imageFallback} />
        ) : (
          <img
            className="tmcard-primary-img"
            alt={primaryImage?.alt ?? ''}
            width="150"
            height="199"
            loading={imageLoading}
            fetchPriority={resolvedPriorityIndex === 0 ? 'high' : undefined}
            decoding="async"
            src={primaryImage?.src ?? FALLBACK_IMAGE}
            onLoad={handlePrimaryLoad}
            onError={handlePrimaryError}
            style={{
              ...S.primaryImage,
              transform: isLinkHovered ? 'scale(1.04)' : 'scale(1)',
              transition: 'transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
          />
        )}

        {secondaryImage?.src && hasRequestedSecondary && (
          <img
            className="tmcard-secondary-img"
            alt={secondaryImage.alt ?? ''}
            loading="lazy"
            decoding="async"
            src={secondaryImage.src}
            style={{
              ...S.secondaryImage,
              opacity: isLinkHovered ? 1 : 0,
              transform: isLinkHovered ? 'scale(1.04)' : 'scale(1)',
              transition: 'opacity 280ms ease, transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
          />
        )}

        {/* Hover overlay — aria-hidden: announced by the parent link's aria-label */}
        <div
          aria-hidden="true"
          className="tmcard-hover-overlay"
          style={{ ...S.hoverOverlay, opacity: isLinkHovered ? 1 : 0 }}
        >
          <div
            className="tmcard-hover-content"
            style={{ ...S.hoverContent, transform: isLinkHovered ? 'scale(1.04)' : 'scale(0.96)' }}
          >
            <span>View details</span>
            <img loading="lazy" decoding="async" src={ARROW_ICON_URL} alt="" width="16" height="16" />
          </div>
        </div>

        {hasBadge && (
          <div style={badgeStyle}>
            <span style={{ fontSize: '9px', lineHeight: 1 }}>{BADGE_ICONS[effectiveBadgeVariant]}</span>
            {effectiveBadgeText}
          </div>
        )}
        {hasAiScore && <div style={aiScoreStyle}>AI {aiScore}</div>}
      </a>

      {/* Template metadata */}
      <div className="tmcard-meta" style={S.content}>
        {showIcon ? (
          <img
            className="tmcard-creator-icon"
            width="28"
            height="28"
            src={creatorIcon!.src}
            loading="lazy"
            decoding="async"
            alt={creatorIcon!.alt ?? creatorName}
            style={S.creatorIcon}
            onError={handleIconError}
          />
        ) : (
          <div className="tmcard-creator-initials" style={S.creatorInitials} title={creatorName}>
            {getInitials(creatorName)}
          </div>
        )}
        <div className="tmcard-details" style={S.details}>
          <div className="tmcard-details-row" style={S.detailsWrap}>
            <div style={S.nameWrap}>
              <a
                href={templateLink?.href ?? '#'}
                target={templateLink?.target}
                rel={relForTarget(templateLink?.target)}
                className="tmcard-name-link"
                style={S.nameLink}
                title={templateName}
              >
                <h4 className="tmcard-name" style={S.name}>{templateName}</h4>
              </a>
            </div>
            <div className="tmcard-price-wrap" style={S.priceWrap}>
              <h4 className="tmcard-price" style={isFreePrice ? S.priceFree : S.price}>{price}</h4>
            </div>
          </div>
          <div style={S.creatorWrap}>
            <a
              href={creatorLink?.href ?? '#'}
              target={creatorLink?.target}
              rel={relForTarget(creatorLink?.target)}
              className="tmcard-creator-link"
              aria-label={`Browse templates by ${creatorName}`}
              style={S.creatorLink}
            >
              <h4 className="tmcard-creator" style={S.creator}>{creatorName}</h4>
            </a>
          </div>

          {agentNote && <p style={S.agentNote}>{agentNote}</p>}
        </div>
      </div>

      {/* Finsweet filter/sort fields — hidden, preserve existing behavior */}
      <div
        {...({ 'fs-cmssort-type': 'date', 'fs-cmssort-field': 'approval-date' } as Record<string, string>)}
        className="tmcard-fs-hidden"
        style={S.hidden}
      >
        {approvalDate}
      </div>
      <div {...({ 'fs-cmssort-field': 'price' } as Record<string, string>)} className="tmcard-fs-hidden" style={S.hidden}>
        {priceNumeric}
      </div>
      <div
        {...({ 'fs-cmssort-field': 'popularity-score' } as Record<string, string>)}
        className="tmcard-fs-hidden"
        style={S.hidden}
      >
        {popularityScore}
      </div>
      <div {...({ 'fs-cmsfilter-field': 'free' } as Record<string, string>)} className="tmcard-fs-hidden" style={S.hidden}>
        {isFree ? 'Free' : ''}
      </div>
    </div>
  );
};

export const TemplateCard = memo(TemplateCardInner);
export default TemplateCard;

import React, { CSSProperties, useState, useCallback, memo } from 'react';

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
  categoryName?: string;
  categoryLink?: TemplateCardLink;
  subcategoryName?: string;
  subcategoryLink?: TemplateCardLink;
  templateType?: string;
  previewLink?: TemplateCardLink;

  // Images
  primaryImage?: TemplateCardImage;
  secondaryImage?: TemplateCardImage;
  creatorIcon?: TemplateCardImage;

  // Finsweet sort metadata
  approvalDate?: string;
  popularityScore?: string;
  cumulativePurchases?: string | number;
  uniqueViewers?: string | number;
  isFree?: boolean;

  // Agent-extended capabilities
  badgeText?: string;
  badgeVariant?: TemplateCardBadge;
  aiScore?: number;
  showAiBadge?: boolean;
  agentNote?: string;
  showCategoryMeta?: boolean;
  showTemplateType?: boolean;
  showPreviewLink?: boolean;
  previewLabel?: string;
  showMarketplaceSignals?: boolean;
  marketplaceSignals?: string[];
  marketplaceSignalsText?: string;

  // Grid-managed rendering hints. Passing these avoids each card scanning the
  // DOM to infer its position when infinite scroll appends large result sets.
  priorityIndex?: number;
  deferSecondaryImage?: boolean;

  // Containers that already inline TEMPLATE_CARD_STYLES in their own <style>
  // tag (TemplateGrid, TemplateCarouselSection) set this to suppress the
  // per-card copy.
  stylesProvided?: boolean;
}

const ARROW_ICON_URL =
  'https://cdn.prod.website-files.com/5e593fb060cf87bbaf75dd20/670878b0296e4ae4034fe652_view-details-arrow.svg';

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

const MARKETPLACE_SIGNAL_BADGE_LABELS = new Set(['Marketplace favorite', 'Top seller', 'Strong seller']);

function aiScorePalette(score: number) {
  if (score >= 80) return { bg: 'rgba(34,197,94,0.18)', text: '#4ade80', border: 'rgba(34,197,94,0.3)' };
  if (score >= 55) return { bg: 'rgba(245,158,11,0.18)', text: '#fbbf24', border: 'rgba(245,158,11,0.3)' };
  return { bg: 'rgba(239,68,68,0.18)', text: '#f87171', border: 'rgba(239,68,68,0.3)' };
}

function isMarketplaceSignalBadge(signal: string): boolean {
  return MARKETPLACE_SIGNAL_BADGE_LABELS.has(signal);
}

function marketplaceSignalHelp(signal: string): string {
  switch (signal) {
    case 'Marketplace favorite':
      return 'Marketplace favorite: 250+ purchases in the last 30 days.';
    case 'Top seller':
      return 'Top seller: 100+ purchases in the last 30 days.';
    case 'Strong seller':
      return 'Strong seller: 50+ purchases in the last 30 days.';
    case 'Sales momentum':
      return 'Sales momentum: 20+ purchases in the last 30 days.';
    case 'Recently purchased':
      return 'Recently purchased: bought by customers in the last 30 days.';
    case 'High interest':
      return 'High interest: viewed by many template shoppers recently.';
    case 'Buyer interest':
      return 'Buyer interest: this template has recent views and purchases.';
    case 'Popular':
      return 'Popular: this template ranks well in marketplace popularity signals.';
    default:
      if (/purchases?$/i.test(signal)) return `${signal} in the last 30 days.`;
      if (/views?$/i.test(signal)) return `${signal} from recent marketplace shoppers.`;
      return signal;
  }
}

function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) return `${Number((value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1))}M`;
  if (value >= 1_000) return `${Number((value / 1_000).toFixed(value >= 10_000 ? 0 : 1))}k`;
  return String(value);
}

function pluralize(value: number, singular: string, plural = `${singular}s`): string {
  return `${formatCompactNumber(value)} ${value === 1 ? singular : plural}`;
}

function parseSignalNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  if (!value) return 0;

  const normalized = String(value).trim().toLowerCase().replace(/,/g, '');
  const compactMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*([km])?\+?/);
  if (!compactMatch) return 0;

  const numeric = Number(compactMatch[1]);
  if (!Number.isFinite(numeric)) return 0;

  const multiplier = compactMatch[2] === 'm' ? 1_000_000 : compactMatch[2] === 'k' ? 1_000 : 1;
  return Math.max(0, Math.floor(numeric * multiplier));
}

function explicitMarketplaceSignals(signals: string[], signalsText: string): string[] {
  return (signals.length > 0 ? signals : signalsText.split(/[,\n]+/))
    .map((signal) => signal.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function derivedMarketplaceSignals(options: {
  cumulativePurchases?: string | number;
  uniqueViewers?: string | number;
  popularityScore?: string;
}): string[] {
  // Match TemplateGrid's public bucketing so standalone CMS cards do not expose
  // exact low-volume sales while still showing meaningful social proof.
  const purchases = parseSignalNumber(options.cumulativePurchases);
  const viewers = parseSignalNumber(options.uniqueViewers);
  const popularity = parseSignalNumber(options.popularityScore);
  const isPopular = popularity >= 5;
  const hasSales = purchases > 0;
  const hasHighViews = viewers >= 5_000;

  if (purchases >= 250) return ['Marketplace favorite', '250+ purchases'];
  if (purchases >= 100) return ['Top seller', '100+ purchases'];
  if (purchases >= 50) return ['Strong seller', '50+ purchases'];
  if (purchases >= 20) return ['Sales momentum', '20+ purchases'];
  if (purchases >= 10) return ['Recently purchased', '10+ purchases'];
  if (hasSales && isPopular) return ['Recently purchased'];
  if (hasSales && hasHighViews) return ['Buyer interest'];
  if (isPopular && hasHighViews) return ['High interest', pluralize(viewers, 'view')];
  if (isPopular) return ['Popular'];
  if (hasHighViews) return [pluralize(viewers, 'view')];
  return [];
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
  },
  creatorLink: {
    display: 'inline-block',
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
  },
  agentNote: {
    margin: '2px 0 0 0',
    padding: '0',
    fontSize: '11px',
    lineHeight: '1.4',
    color: 'rgba(0, 0, 0, 0.45)',
  },
  signalsWrap: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '5px',
    marginTop: '3px',
    color: 'rgba(0, 0, 0, 0.42)',
    fontSize: '11px',
    fontWeight: 450,
    lineHeight: '16px',
  },
  signalGroup: {
    display: 'inline-flex',
    alignItems: 'center',
    minWidth: 0,
    maxWidth: '100%',
    gap: '5px',
    flexWrap: 'nowrap',
  },
  signalText: {
    display: 'inline-block',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  signalBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '18px',
    flexShrink: 0,
    maxWidth: '100%',
    padding: '1px 6px',
    border: '1px solid rgba(20, 110, 245, 0.18)',
    borderRadius: '4px',
    backgroundColor: 'rgba(20, 110, 245, 0.08)',
    color: '#146ef5',
    fontSize: '11px',
    fontWeight: 600,
    lineHeight: '16px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  signalInfo: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '14px',
    height: '14px',
    flexShrink: 0,
    border: '1px solid rgba(20, 110, 245, 0.18)',
    borderRadius: '999px',
    color: 'rgba(20, 110, 245, 0.7)',
    backgroundColor: 'rgba(20, 110, 245, 0.04)',
    fontSize: '9px',
    fontWeight: 700,
    lineHeight: '12px',
    cursor: 'help',
    userSelect: 'none',
  } as CSSProperties,
  signalSeparator: {
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0,
    color: 'rgba(0, 0, 0, 0.28)',
  },
  metaWrap: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '4px',
    color: 'rgba(0, 0, 0, 0.48)',
    fontSize: '11px',
    lineHeight: '16px',
  },
  metaLink: {
    color: 'inherit',
    textDecoration: 'none',
    maxWidth: '100%',
  },
  metaText: {
    display: 'inline-block',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  metaSeparator: {
    color: 'rgba(0, 0, 0, 0.26)',
    fontSize: '10px',
    lineHeight: '16px',
  },
  previewLink: {
    display: 'inline-flex',
    alignItems: 'center',
    width: 'fit-content',
    maxWidth: '100%',
    marginTop: '6px',
    color: '#146ef5',
    fontSize: '12px',
    fontWeight: 600,
    lineHeight: '16px',
    textDecoration: 'none',
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
//
// Rendered as an inline <style> inside the component tree: Webflow Code
// Components mount in an isolated root, so document.head injection never
// reaches the card markup. Cloned cards carry the tag with them, so clones
// stay styled too.
export const TEMPLATE_CARD_STYLES = `
/* Entrance animation — plays immediately on DOM insertion, no JS scroll observer needed */
@keyframes tmcard-enter {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.tmcard-wrapper {
  animation: tmcard-enter 500ms ease-out var(--tmcard-stagger, 0ms) both;
  transition: outline-color 150ms ease;
}
@media (prefers-reduced-motion: reduce) {
  .tmcard-wrapper {
    animation: none;
    opacity: 1 !important;
  }
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
.tmcard-meta-link,
.tmcard-meta-link:hover,
.tmcard-meta-link:focus,
.tmcard-preview-link,
.tmcard-preview-link:hover,
.tmcard-preview-link:focus {
  text-decoration: none !important;
  border-bottom: none !important;
}
.tmcard-meta-link:hover,
.tmcard-preview-link:hover {
  color: #146ef5 !important;
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
  categoryName = '',
  categoryLink,
  subcategoryName = '',
  subcategoryLink,
  templateType = '',
  previewLink,
  primaryImage,
  secondaryImage,
  creatorIcon,
  approvalDate = '',
  popularityScore = '',
  cumulativePurchases,
  uniqueViewers,
  isFree = false,
  badgeText = '',
  badgeVariant = 'none',
  aiScore,
  showAiBadge = false,
  agentNote = '',
  showCategoryMeta = false,
  showTemplateType = false,
  showPreviewLink = false,
  previewLabel = 'Preview',
  showMarketplaceSignals = false,
  marketplaceSignals = [],
  marketplaceSignalsText = '',
  priorityIndex = 0,
  deferSecondaryImage = false,
  stylesProvided = false,
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
  const categoryLabel = categoryName.trim();
  const subcategoryLabel = subcategoryName.trim();
  const typeLabel = templateType.trim();
  const hasSubcategoryMeta =
    subcategoryLabel &&
    subcategoryLabel.toLowerCase() !== categoryLabel.toLowerCase();
  const metaItems: Array<{ key: string; label: string; link?: TemplateCardLink }> = [];
  if (showCategoryMeta && categoryLabel) metaItems.push({ key: 'category', label: categoryLabel, link: categoryLink });
  if (showCategoryMeta && hasSubcategoryMeta) metaItems.push({ key: 'subcategory', label: subcategoryLabel, link: subcategoryLink });
  if (showTemplateType && typeLabel) metaItems.push({ key: 'type', label: typeLabel });
  const hasPreviewLink = showPreviewLink && Boolean(previewLink?.href);
  const explicitSignalItems = explicitMarketplaceSignals(marketplaceSignals, marketplaceSignalsText);
  const marketplaceSignalItems = showMarketplaceSignals
    ? explicitSignalItems.length > 0
      ? explicitSignalItems
      : derivedMarketplaceSignals({ cumulativePurchases, uniqueViewers, popularityScore }).slice(0, 3)
    : [];
  const primaryMarketplaceSignal = marketplaceSignalItems[0] ?? '';
  const hasMarketplaceSignalBadge = isMarketplaceSignalBadge(primaryMarketplaceSignal);

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
      {!stylesProvided && <style dangerouslySetInnerHTML={{ __html: TEMPLATE_CARD_STYLES }} />}
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
            // Lowercase: React 18 drops the camelCase fetchPriority prop; only
            // the literal DOM attribute reaches the browser (React 19 fixed this).
            {...(resolvedPriorityIndex < 4 ? { fetchpriority: 'high' } : {})}
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
      <div style={S.content}>
        {showIcon ? (
          <img
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
          <div style={S.creatorInitials} title={creatorName}>
            {getInitials(creatorName)}
          </div>
        )}
        <div style={S.details}>
          <div style={S.detailsWrap}>
            <div style={S.nameWrap}>
              <a
                href={templateLink?.href ?? '#'}
                target={templateLink?.target}
                rel={relForTarget(templateLink?.target)}
                className="tmcard-name-link"
                style={S.nameLink}
                title={templateName}
              >
                <h4 style={S.name}>{templateName}</h4>
              </a>
            </div>
            <div style={S.priceWrap}>
              <h4 style={isFreePrice ? S.priceFree : S.price}>{price}</h4>
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
              <h4 style={S.creator}>{creatorName}</h4>
            </a>
          </div>

          {metaItems.length > 0 && (
            <div style={S.metaWrap} aria-label={`${templateName} category metadata`}>
              {metaItems.map((item, index) => (
                <React.Fragment key={item.key}>
                  {index > 0 && <span style={S.metaSeparator}>/</span>}
                  {item.link?.href ? (
                    <a
                      href={item.link.href}
                      target={item.link.target}
                      rel={relForTarget(item.link.target)}
                      className="tmcard-meta-link"
                      style={S.metaLink}
                    >
                      <span style={S.metaText}>{item.label}</span>
                    </a>
                  ) : (
                    <span style={S.metaText}>{item.label}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {marketplaceSignalItems.length > 0 && (
            <div style={S.signalsWrap} aria-label={`${templateName} marketplace signals`}>
              {hasMarketplaceSignalBadge ? (
                <span style={S.signalGroup}>
                  <span style={S.signalBadge} title={marketplaceSignalHelp(primaryMarketplaceSignal)}>
                    {primaryMarketplaceSignal}
                  </span>
                  <span
                    aria-label={marketplaceSignalHelp(primaryMarketplaceSignal)}
                    role="img"
                    style={S.signalInfo}
                    title={marketplaceSignalHelp(primaryMarketplaceSignal)}
                  >
                    i
                  </span>
                  {marketplaceSignalItems.slice(1).map((signal) => (
                    <React.Fragment key={signal}>
                      <span style={S.signalSeparator}>·</span>
                      <span style={S.signalText} title={marketplaceSignalHelp(signal)}>{signal}</span>
                    </React.Fragment>
                  ))}
                </span>
              ) : (
                marketplaceSignalItems.map((signal, index) => (
                  <React.Fragment key={signal}>
                    {index > 0 && <span style={S.signalSeparator}>·</span>}
                    <span style={S.signalText} title={marketplaceSignalHelp(signal)}>{signal}</span>
                  </React.Fragment>
                ))
              )}
            </div>
          )}

          {hasPreviewLink && (
            <a
              href={previewLink!.href}
              target={previewLink!.target}
              rel={relForTarget(previewLink!.target)}
              className="tmcard-preview-link"
              style={S.previewLink}
            >
              {previewLabel}
            </a>
          )}

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
      <div {...({ 'fs-cmsfilter-field': 'category' } as Record<string, string>)} className="tmcard-fs-hidden" style={S.hidden}>
        {categoryLabel}
      </div>
      <div {...({ 'fs-cmsfilter-field': 'subcategory' } as Record<string, string>)} className="tmcard-fs-hidden" style={S.hidden}>
        {subcategoryLabel}
      </div>
      <div {...({ 'fs-cmsfilter-field': 'type' } as Record<string, string>)} className="tmcard-fs-hidden" style={S.hidden}>
        {typeLabel}
      </div>
    </div>
  );
};

export const TemplateCard = memo(TemplateCardInner);
export default TemplateCard;

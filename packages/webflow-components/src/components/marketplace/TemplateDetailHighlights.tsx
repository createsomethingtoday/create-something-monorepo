import React, { useEffect, useMemo } from 'react';
import { trackMarketplaceEvent } from './analytics';
import { MarketplaceComponentErrorBoundary, useMarketplaceComponentErrorTracking } from './MarketplaceComponentErrorBoundary';
import { inferTemplateSlug, templateDetailAnalyticsBase } from './templateDetailOffer';
import { TEMPLATE_DETAIL_STYLES } from './templateDetailStyles';

export interface TemplateDetailHighlightItem {
  label: string;
  value: string;
  detail?: string;
}

export interface TemplateDetailHighlightsProps {
  templateSlug?: string;
  title?: string;
  description?: string;
  templateType?: string;
  pagesCount?: string;
  featureSummary?: string;
  supportSummary?: string;
  qualitySummary?: string;
  highlightsJson?: string;
  enableAnalytics?: boolean;
}

const DEFAULT_HIGHLIGHTS: TemplateDetailHighlightItem[] = [
  {
    label: 'Build type',
    value: 'Responsive site template',
    detail: 'Designed to customize in Webflow without rebuilding from scratch.',
  },
  {
    label: 'Included',
    value: 'Pages and components',
    detail: 'Use the included sections as a starting point for your site.',
  },
  {
    label: 'Support',
    value: 'Creator support',
    detail: 'Reach out to the template creator with setup questions.',
  },
  {
    label: 'Quality',
    value: 'Marketplace reviewed',
    detail: 'Published templates are reviewed before they appear in the Marketplace.',
  },
];

function compact(value?: string | null): string {
  return value?.trim() ?? '';
}

function parseHighlightsJson(value?: string): TemplateDetailHighlightItem[] {
  const raw = compact(value);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item): TemplateDetailHighlightItem | null => {
        if (!item || typeof item !== 'object') return null;
        const record = item as Record<string, unknown>;
        const label = typeof record.label === 'string' ? record.label.trim() : '';
        const valueLabel = typeof record.value === 'string' ? record.value.trim() : '';
        const detail = typeof record.detail === 'string' ? record.detail.trim() : '';
        if (!label || !valueLabel) return null;
        return { label, value: valueLabel, detail };
      })
      .filter((item): item is TemplateDetailHighlightItem => Boolean(item))
      .slice(0, 6);
  } catch {
    return [];
  }
}

function buildHighlights(props: TemplateDetailHighlightsProps): TemplateDetailHighlightItem[] {
  const custom = parseHighlightsJson(props.highlightsJson);
  if (custom.length > 0) return custom;

  return [
    {
      label: 'Build type',
      value: compact(props.templateType) || DEFAULT_HIGHLIGHTS[0].value,
      detail: 'Start from a complete Webflow template and customize the structure, styling, and content.',
    },
    {
      label: 'Included',
      value: compact(props.pagesCount) || 'Pages and sections',
      detail: compact(props.featureSummary) || DEFAULT_HIGHLIGHTS[1].detail,
    },
    {
      label: 'Support',
      value: compact(props.supportSummary) || DEFAULT_HIGHLIGHTS[2].value,
      detail: 'Questions go to the template creator so buyers know where help comes from.',
    },
    {
      label: 'Quality signal',
      value: compact(props.qualitySummary) || DEFAULT_HIGHLIGHTS[3].value,
      detail: 'Use this slot for verified quality, sales momentum, maintenance, or review status.',
    },
  ];
}

const TemplateDetailHighlightsInner: React.FC<TemplateDetailHighlightsProps> = ({
  templateSlug = '',
  title = 'Everything needed to start faster',
  description = 'Scan the build, included structure, support path, and quality signals before opening the full template preview.',
  templateType = '',
  pagesCount = '',
  featureSummary = '',
  supportSummary = '',
  qualitySummary = '',
  highlightsJson = '',
  enableAnalytics = true,
}) => {
  useMarketplaceComponentErrorTracking('TemplateDetailHighlights', enableAnalytics);

  const resolvedSlug = useMemo(() => inferTemplateSlug(templateSlug), [templateSlug]);
  const highlights = useMemo(
    () =>
      buildHighlights({
        templateSlug: resolvedSlug,
        templateType,
        pagesCount,
        featureSummary,
        supportSummary,
        qualitySummary,
        highlightsJson,
      }),
    [featureSummary, highlightsJson, pagesCount, qualitySummary, resolvedSlug, supportSummary, templateType],
  );

  useEffect(() => {
    trackMarketplaceEvent(
      'Code Component Event',
      {
        ...templateDetailAnalyticsBase('TemplateDetailHighlights', resolvedSlug),
        scope: 'detail_highlights_viewed',
        highlight_count: highlights.length,
      },
      enableAnalytics,
    );
  }, [enableAnalytics, highlights.length, resolvedSlug]);

  return (
    <section className="wfdt wfdt-highlights" data-template-detail-highlights="">
      <style>{TEMPLATE_DETAIL_STYLES}</style>
      <div>
        <h2 className="wfdt-highlights-title">{title}</h2>
        {description ? <p className="wfdt-highlights-copy">{description}</p> : null}
      </div>
      <div className="wfdt-highlight-grid">
        {highlights.map((item) => (
          <article className="wfdt-highlight-card" key={`${item.label}:${item.value}`}>
            <p className="wfdt-highlight-kicker">{item.label}</p>
            <p className="wfdt-highlight-value">{item.value}</p>
            {item.detail ? <p className="wfdt-highlight-body">{item.detail}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
};

export const TemplateDetailHighlights: React.FC<TemplateDetailHighlightsProps> = (props) => (
  <MarketplaceComponentErrorBoundary component="TemplateDetailHighlights" enabled={props.enableAnalytics}>
    <TemplateDetailHighlightsInner {...props} />
  </MarketplaceComponentErrorBoundary>
);

export default TemplateDetailHighlights;

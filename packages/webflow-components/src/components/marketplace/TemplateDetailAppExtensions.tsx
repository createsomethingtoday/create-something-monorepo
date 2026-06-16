import React, { useEffect, useMemo } from 'react';
import { trackMarketplaceEvent } from './analytics';
import { MarketplaceComponentErrorBoundary, useMarketplaceComponentErrorTracking } from './MarketplaceComponentErrorBoundary';
import {
  TemplateDetailImage,
  TemplateDetailLink,
  inferTemplateSlug,
  isExternalUrl,
  normalizeTemplateDetailImage,
  normalizeTemplateDetailLink,
  templateDetailAnalyticsBase,
} from './templateDetailOffer';
import { TEMPLATE_DETAIL_STYLES } from './templateDetailStyles';

export interface TemplateDetailAppRecommendation {
  name: string;
  scenario: string;
  reason?: string;
  badge?: string;
  href?: string;
  iconUrl?: string;
}

export interface TemplateDetailAppExtensionsProps {
  templateSlug?: string;
  title?: string;
  description?: string;
  appsJson?: string;
  appOneName?: string;
  appOneScenario?: string;
  appOneBadge?: string;
  appOneUrl?: TemplateDetailLink;
  appOneIcon?: TemplateDetailImage;
  appTwoName?: string;
  appTwoScenario?: string;
  appTwoBadge?: string;
  appTwoUrl?: TemplateDetailLink;
  appTwoIcon?: TemplateDetailImage;
  appThreeName?: string;
  appThreeScenario?: string;
  appThreeBadge?: string;
  appThreeUrl?: TemplateDetailLink;
  appThreeIcon?: TemplateDetailImage;
  maxApps?: number;
  showLinks?: boolean;
  linkLabel?: string;
  emptyBehavior?: 'hide' | 'placeholder';
  enableAnalytics?: boolean;
}

function compact(value?: string | null): string {
  return value?.trim() ?? '';
}

function initials(value: string): string {
  const words = value
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
  if (words.length === 0) return 'A';
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

function parseAppsJson(value?: string): TemplateDetailAppRecommendation[] {
  const raw = compact(value);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item): TemplateDetailAppRecommendation | null => {
        if (!item || typeof item !== 'object') return null;
        const record = item as Record<string, unknown>;
        const name = typeof record.name === 'string' ? record.name.trim() : '';
        const scenario = typeof record.scenario === 'string' ? record.scenario.trim() : '';
        const reason = typeof record.reason === 'string' ? record.reason.trim() : '';
        const badge = typeof record.badge === 'string' ? record.badge.trim() : '';
        const href = typeof record.href === 'string' ? record.href.trim() : '';
        const iconUrl = typeof record.iconUrl === 'string' ? record.iconUrl.trim() : '';
        if (!name || !scenario) return null;
        return { name, scenario, reason, badge, href, iconUrl };
      })
      .filter((item): item is TemplateDetailAppRecommendation => Boolean(item));
  } catch {
    return [];
  }
}

function propApp(
  name?: string,
  scenario?: string,
  badge?: string,
  url?: TemplateDetailLink,
  icon?: TemplateDetailImage,
): TemplateDetailAppRecommendation | null {
  const appName = compact(name);
  const appScenario = compact(scenario);
  if (!appName || !appScenario) return null;
  const link = normalizeTemplateDetailLink(url);
  const image = normalizeTemplateDetailImage(icon);
  return {
    name: appName,
    scenario: appScenario,
    badge: compact(badge),
    href: link.href,
    iconUrl: image.src,
  };
}

function relForHref(href: string): string | undefined {
  return isExternalUrl(href) ? 'noopener noreferrer' : undefined;
}

function targetForHref(href: string): string | undefined {
  return isExternalUrl(href) ? '_blank' : undefined;
}

const TemplateDetailAppExtensionsInner: React.FC<TemplateDetailAppExtensionsProps> = ({
  templateSlug = '',
  title = 'Optional apps for this template',
  description = 'Curated app pairings can help extend this template after launch. They stay secondary so the template purchase path remains clear.',
  appsJson = '',
  appOneName = '',
  appOneScenario = '',
  appOneBadge = 'Noteworthy',
  appOneUrl,
  appOneIcon,
  appTwoName = '',
  appTwoScenario = '',
  appTwoBadge = 'Noteworthy',
  appTwoUrl,
  appTwoIcon,
  appThreeName = '',
  appThreeScenario = '',
  appThreeBadge = 'Noteworthy',
  appThreeUrl,
  appThreeIcon,
  maxApps = 3,
  showLinks = false,
  linkLabel = 'Learn more',
  emptyBehavior = 'hide',
  enableAnalytics = true,
}) => {
  useMarketplaceComponentErrorTracking('TemplateDetailAppExtensions', enableAnalytics);

  const resolvedSlug = useMemo(() => inferTemplateSlug(templateSlug), [templateSlug]);
  const apps = useMemo(() => {
    const parsed = parseAppsJson(appsJson);
    const fromProps = [
      propApp(appOneName, appOneScenario, appOneBadge, appOneUrl, appOneIcon),
      propApp(appTwoName, appTwoScenario, appTwoBadge, appTwoUrl, appTwoIcon),
      propApp(appThreeName, appThreeScenario, appThreeBadge, appThreeUrl, appThreeIcon),
    ].filter((item): item is TemplateDetailAppRecommendation => Boolean(item));

    return (parsed.length > 0 ? parsed : fromProps).slice(0, Math.max(1, Math.min(6, Math.floor(maxApps || 3))));
  }, [
    appOneBadge,
    appOneIcon,
    appOneName,
    appOneScenario,
    appOneUrl,
    appThreeBadge,
    appThreeIcon,
    appThreeName,
    appThreeScenario,
    appThreeUrl,
    appTwoBadge,
    appTwoIcon,
    appTwoName,
    appTwoScenario,
    appTwoUrl,
    appsJson,
    maxApps,
  ]);

  useEffect(() => {
    if (apps.length === 0) return;
    trackMarketplaceEvent(
      'Code Component Event',
      {
        ...templateDetailAnalyticsBase('TemplateDetailAppExtensions', resolvedSlug),
        scope: 'detail_app_extensions_viewed',
        app_count: apps.length,
        app_links_enabled: showLinks,
      },
      enableAnalytics,
    );
  }, [apps.length, enableAnalytics, resolvedSlug, showLinks]);

  if (apps.length === 0 && emptyBehavior === 'hide') return null;

  const visibleApps =
    apps.length > 0
      ? apps
      : [
          {
            name: 'Noteworthy app',
            scenario: 'Add this module only when a specific app makes the selected template easier to launch.',
            badge: 'Scenario only',
          },
        ];

  return (
    <section className="wfdt wfdt-apps" data-template-detail-app-extensions="">
      <style>{TEMPLATE_DETAIL_STYLES}</style>
      <div>
        <h2 className="wfdt-apps-title">{title}</h2>
        {description ? <p className="wfdt-apps-copy">{description}</p> : null}
      </div>
      <div className="wfdt-app-list">
        {visibleApps.map((app) => (
          <article className="wfdt-app-card" key={`${app.name}:${app.scenario}`}>
            <div className="wfdt-app-icon" aria-hidden="true">
              {app.iconUrl ? <img src={app.iconUrl} alt="" /> : initials(app.name)}
            </div>
            <div>
              <div className="wfdt-app-row">
                <h3 className="wfdt-app-name">{app.name}</h3>
                {app.badge ? <span className="wfdt-badge wfdt-badge-verified">{app.badge}</span> : null}
              </div>
              <p className="wfdt-app-scenario">{app.reason || app.scenario}</p>
              {showLinks && app.href ? (
                <a
                  className="wfdt-app-link"
                  href={app.href}
                  target={targetForHref(app.href)}
                  rel={relForHref(app.href)}
                  onClick={() =>
                    trackMarketplaceEvent(
                      'Code Component Event',
                      {
                        ...templateDetailAnalyticsBase('TemplateDetailAppExtensions', resolvedSlug),
                        scope: 'detail_app_extension_clicked',
                        app_name: app.name,
                      },
                      enableAnalytics,
                    )
                  }
                >
                  {linkLabel}
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export const TemplateDetailAppExtensions: React.FC<TemplateDetailAppExtensionsProps> = (props) => (
  <MarketplaceComponentErrorBoundary component="TemplateDetailAppExtensions" enabled={props.enableAnalytics}>
    <TemplateDetailAppExtensionsInner {...props} />
  </MarketplaceComponentErrorBoundary>
);

export default TemplateDetailAppExtensions;

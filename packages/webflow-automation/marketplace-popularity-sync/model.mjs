/**
 * Template Popularity scoring model — shared by sync.mjs (the daily write) and
 * v8-impact.mjs (the review artifact).
 *
 * Formula and weights are V7 (see v7.sql). The two inputs V7 sources badly are
 * pluggable here:
 *
 *   demand  'report'  V7: report__template_sales (Stripe checkout only — misses
 *                     fulfillment-link sales before 2026-08-13)
 *           'orders'  delivered MARKETPLACE_ORDERS (includes fulfillment-link)
 *   views   'segment' V7: event_template_viewed_selected_purchased — dead since
 *                     the 2026-07-21 Segment decommission, so templates created
 *                     after that have ~zero viewer rank
 *           'beacon'  webflow-template-views D1, trailing 28-day sessions
 *
 * Everything else (conversion quality, sites created, freshness, dead-inventory
 * multiplier inputs) is read from the V7 result set as-is.
 */

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

export const WEIGHTS = { conversion: 0.1, sites: 0.25, views: 0.1, freshness: 0.05 };
export const BEACON_WINDOW_DAYS = 28;

export const VARIANTS = {
  v7: { demand: 'report', views: 'segment' },
  'v8-beacon': { demand: 'report', views: 'beacon' },
  'v8-orders': { demand: 'orders', views: 'segment' },
  v8: { demand: 'orders', views: 'beacon' }
};

export const ORDERS_SQL = `
  SELECT t.TEMPLATE_ID,
    COUNT(*) AS CUM,
    SUM(o.PRICE_VALUE) AS CUM_REV,
    COUNT_IF(o.CREATED_ON >= DATEADD(day,-90,CURRENT_DATE)) AS P90,
    COUNT_IF(o.CREATED_ON >= DATEADD(day,-365,CURRENT_DATE)) AS P365,
    MAX(o.CREATED_ON)::date AS LAST_PURCHASE,
    DATEDIFF(day, MAX(o.CREATED_ON)::date, CURRENT_DATE) AS DAYS_SINCE
  FROM ANALYTICS.WEBFLOW.MARKETPLACE_ORDERS o
  JOIN ANALYTICS.WEBFLOW.MARKETPLACE_PRODUCTS p ON o.MARKETPLACE_PRODUCT_ID = p.DOCUMENT_ID
  JOIN ANALYTICS.WEBFLOW.TEMPLATES t ON p.RESOURCE_ID = t.TEMPLATE_ID
  WHERE p.RESOURCE_TYPE = 'Template' AND o.STATUS = 'delivered'
  GROUP BY 1`;

export const BEACON_SQL = `SELECT slug, SUM(sessions) AS sessions FROM template_views_daily WHERE day >= date('now','-${BEACON_WINDOW_DAYS} day') AND slug != 'marketplace-browse' GROUP BY slug`;

// ------------------------------------------------------------------ Sources

function stripBanner(stdout) {
  const start = stdout.indexOf('[');
  return start === -1 ? null : stdout.slice(start);
}

/**
 * Run SQL in Snowflake via the Snowflake CLI. Auth is a programmatic access
 * token when SNOWFLAKE_PAT is set (non-interactive — what launchd needs),
 * otherwise Okta externalbrowser (interactive / cached SSO session).
 */
export function querySnowflake({ sql, file }, { timeout = 900_000 } = {}) {
  const pat = process.env.SNOWFLAKE_PAT;
  const args = [
    '--from', 'snowflake-cli', 'snow', 'sql',
    ...(file ? ['-f', file] : ['-q', sql]),
    '--temporary-connection',
    '--account', process.env.SNOWFLAKE_ACCOUNT || 'wn71398.us-east-1',
    '--user', process.env.SNOWFLAKE_USER || 'micah@webflow.com',
    '--authenticator', pat ? 'PROGRAMMATIC_ACCESS_TOKEN' : 'externalbrowser',
    '--database', 'ANALYTICS', '--schema', 'WEBFLOW',
    '--warehouse', process.env.SNOWFLAKE_WAREHOUSE || 'SNOWFLAKE_REPORTING',
    '--format', 'json'
  ];
  const result = spawnSync('uvx', args, {
    encoding: 'utf8',
    maxBuffer: 512 * 1024 * 1024,
    timeout,
    env: pat ? { ...process.env, SNOWFLAKE_PASSWORD: pat } : process.env
  });
  if (result.status !== 0) {
    throw new Error(`snow sql failed (status ${result.status}): ${result.stderr?.slice(0, 2000)}`);
  }
  const payload = stripBanner(result.stdout ?? '');
  if (!payload) throw new Error(`snow sql returned no JSON payload: ${(result.stdout ?? '').slice(0, 500)}`);
  return JSON.parse(payload);
}

/** Trailing-window sessions per slug from the beacon D1 (Webflow Hosting account). */
export function queryBeacon() {
  const result = spawnSync(
    'npx',
    ['wrangler', 'd1', 'execute', 'webflow-template-views', '--remote', '--json', '--command', BEACON_SQL],
    {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      timeout: 180_000,
      // wrangler.toml (account + D1 id) lives in the beacon package; auth is
      // CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID in the env.
      cwd: join(HERE, '..', '..', 'webflow-template-views')
    }
  );
  if (result.status !== 0) throw new Error(`wrangler d1 failed: ${result.stderr?.slice(0, 1500)}`);
  const payload = stripBanner(result.stdout);
  if (!payload) throw new Error(`wrangler d1 returned no JSON: ${result.stdout.slice(0, 300)}`);
  return JSON.parse(payload)[0]?.results ?? [];
}

// -------------------------------------------------------------------- Model

/** SQL PERCENT_RANK(): (count strictly less) / (n - 1); 0 when n <= 1. */
export function percentRankMap(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const map = new Map();
  let index = 0;
  while (index < n) {
    let end = index;
    while (end + 1 < n && sorted[end + 1] === sorted[index]) end += 1;
    map.set(sorted[index], n > 1 ? index / (n - 1) : 0);
    index = end + 1;
  }
  return map;
}

export function deadInventoryMultiplier(daysSinceCreated, daysSinceLastPurchase) {
  const dslp = daysSinceLastPurchase ?? 9999;
  if (daysSinceCreated >= 365 && dslp >= 365) return 0.25;
  if (daysSinceCreated >= 180 && dslp >= 180) return 0.5;
  if (daysSinceCreated >= 90 && dslp >= 90) return 0.75;
  return 1.0;
}

export function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/** Marketplace slug = last path segment of the listing URL; the beacon keys on it. */
export function slugOf(url) {
  return (url || '').split('/').filter(Boolean).pop() || null;
}

/** Join the V7 result set with the alternative sources into one row per template. */
export function buildTemplates(v7Rows, orderRows = [], beaconRows = []) {
  const orders = new Map(orderRows.map((r) => [r.TEMPLATE_ID, r]));
  const beacon = new Map(beaconRows.map((r) => [r.slug, Number(r.sessions) || 0]));
  return v7Rows.map((r) => {
    const o = orders.get(r.TEMPLATE_ID);
    const slug = slugOf(r.EXTERNAL_MARKETPLACE_URL);
    return {
      templateId: r.TEMPLATE_ID,
      name: r.TEMPLATE_NAME,
      creatorEmail: r.CREATOR_EMAIL,
      createdDate: r.TEMPLATE_CREATED_DATE,
      daysSinceCreated: Number(r.DAYS_SINCE_CREATED_CURRENT) || 0,
      uniqueViewers: Number(r.UNIQUE_VIEWERS) || 0,
      reportCumulative: Number(r.CUMULATIVE_PURCHASES) || 0,
      conversionQuality: Number(r.CONVERSION_QUALITY_V7) || 0,
      freshness: Number(r.FRESHNESS_SCORE) || 0,
      sitesScore: Number(r.RECENT_SITES_SCORE) || 0,
      viewerScoreV7: Number(r.RECENT_VIEWER_SCORE) || 0,
      reportP90: Number(r.PURCHASES_90D) || 0,
      reportP365: Number(r.PURCHASES_365D) || 0,
      reportDaysSinceLast: r.DAYS_SINCE_LAST_PURCHASE == null ? null : Number(r.DAYS_SINCE_LAST_PURCHASE),
      v7Score: Number(r.POPULARITY_SCORE) || 0,
      ordersP90: Number(o?.P90) || 0,
      ordersP365: Number(o?.P365) || 0,
      ordersCumulative: Number(o?.CUM) || 0,
      ordersDaysSinceLast: o ? Number(o.DAYS_SINCE) : null,
      beaconSessions: slug ? beacon.get(slug) ?? 0 : 0,
      slug
    };
  });
}

/**
 * Score every template under one variant. Returns Map<templateId, score>.
 * Percent ranks are computed over the whole population, as in v7.sql.
 */
export function scoreVariant(templates, variantName) {
  const variant = VARIANTS[variantName];
  if (!variant) throw new Error(`Unknown variant "${variantName}" (known: ${Object.keys(VARIANTS).join(', ')})`);

  const useOrders = variant.demand === 'orders';
  const p90Key = useOrders ? 'ordersP90' : 'reportP90';
  const p365Key = useOrders ? 'ordersP365' : 'reportP365';
  const dslpKey = useOrders ? 'ordersDaysSinceLast' : 'reportDaysSinceLast';
  const prP90 = percentRankMap(templates.map((t) => t[p90Key]));
  const prP365 = percentRankMap(templates.map((t) => t[p365Key]));
  const prBeacon = variant.views === 'beacon' ? percentRankMap(templates.map((t) => t.beaconSessions)) : null;

  const scores = new Map();
  for (const t of templates) {
    const demand = 0.7 * prP90.get(t[p90Key]) + 0.3 * prP365.get(t[p365Key]);
    const views = prBeacon ? prBeacon.get(t.beaconSessions) : t.viewerScoreV7;
    const dead = deadInventoryMultiplier(t.daysSinceCreated, t[dslpKey]);
    const score =
      100 * dead * (demand + WEIGHTS.conversion * t.conversionQuality + WEIGHTS.sites * t.sitesScore + WEIGHTS.views * views + WEIGHTS.freshness * t.freshness);
    scores.set(t.templateId, round2(score));
  }
  return scores;
}

/** Guard: our JS scoring must reproduce v7.sql's POPULARITY_SCORE before any variant is trusted. */
export function verifyV7Reproduction(templates, tolerance = 0.5) {
  const v7 = scoreVariant(templates, 'v7');
  let maxDelta = 0;
  for (const t of templates) maxDelta = Math.max(maxDelta, Math.abs(v7.get(t.templateId) - t.v7Score));
  return { ok: maxDelta <= tolerance, maxScoreDelta: round2(maxDelta) };
}

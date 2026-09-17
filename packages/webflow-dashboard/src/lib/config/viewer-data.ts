/**
 * Viewer-data availability for the Asset Dashboard.
 *
 * Upstream client-side view tracking (Segment on webflow.com marketing pages,
 * which fed `Template Marketplace Viewed` → Snowflake → Airtable
 * `📋 Unique Viewers`) was decommissioned on 2026-07-21 as part of the
 * marketing Segment decoupling (webflow/webflow#112237). The Airtable field is
 * frozen at that date and is no longer read.
 *
 * Viewer counts now come from the first-party view beacon
 * (`packages/webflow-template-views`, read via `$lib/server/template-views`).
 * The beacon has collected continuously since VIEWER_DATA_EPOCH, so every
 * viewer metric is labelled with that epoch — beacon-era numbers must never be
 * compared against pre-outage Airtable numbers.
 */
export const VIEWER_DATA_AVAILABLE = true;

/** First day of beacon data. Viewer metrics are "since" this date. */
export const VIEWER_DATA_EPOCH = '2026-08-05';

/** Human label appended to viewer metrics so creators know the window. */
export const VIEWER_DATA_EPOCH_LABEL = 'since Aug 5, 2026';

/**
 * Conversion (purchases ÷ viewers) stays hidden until the beacon holds a full
 * 90-day window (~2026-11-03). Until then lifetime purchases divided by a
 * six-week viewer count would overstate conversion for every older template.
 */
export const CONVERSION_DATA_AVAILABLE = false;

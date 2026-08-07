/**
 * Viewer-data availability for the Asset Dashboard.
 *
 * Upstream client-side view tracking (Segment on webflow.com marketing pages,
 * which fed `Template Marketplace Viewed` → Snowflake → Airtable
 * `📋 Unique Viewers`) was decommissioned on 2026-07-21 as part of the
 * marketing Segment decoupling (webflow/webflow#112237). The Airtable field is
 * frozen at that date, so viewer counts and viewer-derived metrics
 * (conversion rate, revenue per viewer) are hidden rather than shown stale.
 *
 * Flip VIEWER_DATA_AVAILABLE to true once the first-party view beacon has
 * collected enough history to restore these widgets. Data collected before
 * VIEWER_DATA_EPOCH must not be compared against beacon-era data.
 */
export const VIEWER_DATA_AVAILABLE = false;

/** Date the legacy view pipeline stopped; the beacon era starts after this. */
export const VIEWER_DATA_EPOCH = '2026-07-21';

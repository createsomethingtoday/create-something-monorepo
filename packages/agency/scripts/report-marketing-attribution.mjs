import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function buildMarketingAttributionSql({ days = 30 } = {}) {
  const boundedDays = Number(days);
  if (!Number.isInteger(boundedDays) || boundedDays < 1 || boundedDays > 365) throw new Error('days must be an integer between 1 and 365');
  return `WITH attributed AS (
  SELECT session_id, action,
    json_extract(metadata, '$.marketingSource') AS source,
    json_extract(metadata, '$.marketingMedium') AS medium,
    json_extract(metadata, '$.marketingCampaign') AS campaign,
    json_extract(metadata, '$.marketingContent') AS content,
    COALESCE(json_extract(metadata, '$.trafficClass'), 'external') AS traffic_class
  FROM unified_events
  WHERE property = 'agency'
    AND created_at >= datetime('now', '-${boundedDays} days')
    AND json_extract(metadata, '$.marketingAttribution') = 'consented-first-party-session'
), sessions AS (
  SELECT source, medium, campaign, content, traffic_class, session_id,
    MAX(action = 'page_view') AS landed,
    MAX(action = 'booking_cta_click') AS clicked_booking,
    MAX(action = 'booking_completed') AS completed_booking
  FROM attributed GROUP BY source, medium, campaign, content, traffic_class, session_id
)
SELECT source, medium, campaign, content, traffic_class, COUNT(*) AS sessions,
  SUM(landed) AS landing_sessions, SUM(clicked_booking) AS booking_cta_sessions,
  SUM(completed_booking) AS booking_completed_sessions
FROM sessions GROUP BY source, medium, campaign, content, traffic_class
ORDER BY sessions DESC, source, campaign, content;`;
}

function main() {
  const argv = process.argv.slice(2);
  const daysIndex = argv.indexOf('--days');
  const days = daysIndex >= 0 ? Number(argv[daysIndex + 1]) : 30;
  const sql = buildMarketingAttributionSql({ days });
  if (!argv.includes('--remote')) return void process.stdout.write(`${sql}\n`);
  const result = spawnSync('node', ['../../scripts/run-wrangler.mjs', 'd1', 'execute', 'create-something-db', '--remote', '--config', 'wrangler.jsonc', '--command', sql], { stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

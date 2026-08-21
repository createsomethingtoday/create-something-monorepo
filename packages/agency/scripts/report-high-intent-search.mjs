import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const campaignId = 'agency-high-intent-search-v20260810';

export function buildHighIntentSearchSql({ days = 90 } = {}) {
  const boundedDays = Number(days);
  if (!Number.isInteger(boundedDays) || boundedDays < 1 || boundedDays > 365) {
    throw new Error('days must be an integer between 1 and 365');
  }

  return `WITH campaign_events AS (
  SELECT
    session_id,
    action,
    json_extract(metadata, '$.paidSearchIntent') AS paid_search_intent,
    CASE
      WHEN json_extract(metadata, '$.trafficClass') IN ('test', 'internal', 'preview', 'automated')
        THEN json_extract(metadata, '$.trafficClass')
      ELSE 'external'
    END AS traffic_class
  FROM unified_events
  WHERE property = 'agency'
    AND created_at >= datetime('now', '-${boundedDays} days')
    AND json_extract(metadata, '$.paidSearchCampaign') = '${campaignId}'
),
session_funnel AS (
  SELECT
    session_id,
    paid_search_intent,
    traffic_class,
    MAX(CASE WHEN action = 'page_view' THEN 1 ELSE 0 END) AS landed,
    MAX(CASE WHEN action = 'workflow_draft_started' THEN 1 ELSE 0 END) AS started_draft,
    MAX(CASE WHEN action = 'booking_form_started' THEN 1 ELSE 0 END) AS started_booking,
    MAX(CASE WHEN action = 'booking_initiated' THEN 1 ELSE 0 END) AS initiated_booking,
    MAX(CASE WHEN action = 'booking_completed' THEN 1 ELSE 0 END) AS completed_booking
  FROM campaign_events
  GROUP BY session_id, paid_search_intent, traffic_class
)
SELECT
  paid_search_intent,
  traffic_class,
  COUNT(*) AS sessions,
  SUM(landed) AS landing_sessions,
  SUM(started_draft) AS workflow_draft_sessions,
  SUM(started_booking) AS booking_form_sessions,
  SUM(initiated_booking) AS booking_initiated_sessions,
  SUM(completed_booking) AS booking_completed_sessions
FROM session_funnel
GROUP BY paid_search_intent, traffic_class
ORDER BY paid_search_intent, traffic_class;`;
}

function parseArgs(argv) {
  const args = { days: 90, remote: false };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--remote') args.remote = true;
    if (argv[index] === '--days') args.days = Number(argv[index + 1]);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const sql = buildHighIntentSearchSql({ days: args.days });
  if (!args.remote) {
    process.stdout.write(`${sql}\n`);
    return;
  }

  const result = spawnSync(
    'node',
    [
      '../../scripts/run-wrangler.mjs',
      'd1',
      'execute',
      'create-something-db',
      '--remote',
      '--config',
      'wrangler.jsonc',
      '--command',
      sql
    ],
    { stdio: 'inherit' }
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

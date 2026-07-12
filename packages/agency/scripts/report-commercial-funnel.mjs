import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function buildCommercialFunnelSql({ days = 30 } = {}) {
	const boundedDays = Number(days);
	if (!Number.isInteger(boundedDays) || boundedDays < 1 || boundedDays > 365) {
		throw new Error('days must be an integer between 1 and 365');
	}

	return `WITH event_scope AS (
  SELECT
    session_id,
    action,
    url,
    CASE
      WHEN json_extract(metadata, '$.trafficClass') = 'test' THEN 'test'
      WHEN json_extract(metadata, '$.trafficClass') = 'internal' THEN 'internal'
      WHEN json_extract(metadata, '$.trafficClass') = 'preview' THEN 'preview'
      WHEN json_extract(metadata, '$.trafficClass') = 'automated' THEN 'automated'
      WHEN url LIKE '%.pages.dev/%'
        OR url LIKE 'http://localhost%'
        OR url LIKE 'http://127.0.0.1%'
        THEN 'preview'
      WHEN lower(COALESCE(user_agent, '')) LIKE '%bot%'
        OR lower(COALESCE(user_agent, '')) LIKE '%crawler%'
        OR lower(COALESCE(user_agent, '')) LIKE '%spider%'
        OR lower(COALESCE(user_agent, '')) LIKE '%headless%'
        OR lower(COALESCE(user_agent, '')) LIKE '%playwright%'
        OR lower(COALESCE(user_agent, '')) LIKE '%lighthouse%'
        THEN 'automated'
      ELSE 'external'
    END AS event_traffic_class
  FROM unified_events
  WHERE property = 'agency'
    AND created_at >= datetime('now', '-${boundedDays} days')
),
session_class_rank AS (
  SELECT
    session_id,
    MAX(
      CASE event_traffic_class
        WHEN 'test' THEN 5
        WHEN 'internal' THEN 4
        WHEN 'preview' THEN 3
        WHEN 'automated' THEN 2
        ELSE 1
      END
    ) AS traffic_rank
  FROM event_scope
  GROUP BY session_id
),
session_funnel AS (
  SELECT
    event_scope.session_id,
    CASE session_class_rank.traffic_rank
      WHEN 5 THEN 'test'
      WHEN 4 THEN 'internal'
      WHEN 3 THEN 'preview'
      WHEN 2 THEN 'automated'
      ELSE 'external'
    END AS traffic_class,
    MAX(CASE WHEN action = 'page_view' THEN 1 ELSE 0 END) AS visited,
    MAX(CASE WHEN action = 'booking_cta_click' THEN 1 ELSE 0 END) AS clicked_booking_cta,
    MAX(CASE WHEN action = 'booking_form_started' THEN 1 ELSE 0 END) AS started_booking_form,
    MAX(CASE WHEN action = 'booking_initiated' THEN 1 ELSE 0 END) AS initiated_booking,
    MAX(CASE WHEN action = 'booking_completed' THEN 1 ELSE 0 END) AS completed_booking
  FROM event_scope
  JOIN session_class_rank USING (session_id)
  GROUP BY event_scope.session_id, traffic_class
),
traffic_classes AS (
  SELECT 'external' AS traffic_class
  UNION ALL SELECT 'internal'
  UNION ALL SELECT 'preview'
  UNION ALL SELECT 'automated'
  UNION ALL SELECT 'test'
)
SELECT
  traffic_classes.traffic_class,
  COALESCE(COUNT(session_funnel.session_id), 0) AS sessions,
  COALESCE(SUM(session_funnel.visited), 0) AS visitor_sessions,
  COALESCE(SUM(session_funnel.clicked_booking_cta), 0) AS booking_cta_sessions,
  COALESCE(SUM(session_funnel.started_booking_form), 0) AS booking_form_sessions,
  COALESCE(SUM(session_funnel.initiated_booking), 0) AS booking_initiated_sessions,
  COALESCE(SUM(session_funnel.completed_booking), 0) AS booking_completed_sessions
FROM traffic_classes
LEFT JOIN session_funnel USING (traffic_class)
GROUP BY traffic_classes.traffic_class
ORDER BY CASE traffic_class
  WHEN 'external' THEN 1
  WHEN 'internal' THEN 2
  WHEN 'preview' THEN 3
  WHEN 'automated' THEN 4
  WHEN 'test' THEN 5
END;`;
}

function parseArgs(argv) {
	const args = { days: 30, remote: false };
	for (let index = 0; index < argv.length; index += 1) {
		const value = argv[index];
		if (value === '--remote') args.remote = true;
		if (value === '--days') args.days = Number(argv[index + 1]);
	}
	return args;
}

function main() {
	const args = parseArgs(process.argv.slice(2));
	const sql = buildCommercialFunnelSql({ days: args.days });
	if (!args.remote) {
		process.stdout.write(`${sql}\n`);
		return;
	}

	const result = spawnSync(
		'pnpm',
		[
			'exec',
			'wrangler',
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main();
}

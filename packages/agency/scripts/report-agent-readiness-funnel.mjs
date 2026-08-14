import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const AGENCY_CLOUDFLARE_ACCOUNT_ID = '9645bd52e640b8a4f40a3a55ff1dd75a';

export function buildAgentReadinessReportEnvironment(environment = process.env) {
	return {
		...environment,
		CLOUDFLARE_ACCOUNT_ID:
			environment.CLOUDFLARE_ACCOUNT_ID || AGENCY_CLOUDFLARE_ACCOUNT_ID
	};
}

export function buildAgentReadinessFunnelSql({ days = 30 } = {}) {
	const boundedDays = Number(days);
	if (!Number.isInteger(boundedDays) || boundedDays < 1 || boundedDays > 365) {
		throw new Error('days must be an integer between 1 and 365');
	}

	return `WITH event_scope AS (
  SELECT session_id, action, metadata, url, user_agent
  FROM unified_events
  WHERE property = 'agency'
    AND created_at >= datetime('now', '-${boundedDays} days')
),
agent_readiness_sessions AS (
  SELECT DISTINCT session_id
  FROM event_scope
  WHERE action = 'booking_handoff_viewed'
    AND json_extract(metadata, '$.source') = 'agent-readiness'
    AND json_extract(metadata, '$.intent') = 'ai-readiness-audit'
),
attributed_events AS (
  SELECT event_scope.*,
    CASE
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
    END AS traffic_class
  FROM event_scope
  JOIN agent_readiness_sessions USING (session_id)
),
session_funnel AS (
  SELECT
    session_id,
    MAX(CASE WHEN traffic_class = 'automated' THEN 1 WHEN traffic_class = 'preview' THEN 2 ELSE 0 END) AS traffic_rank,
    MAX(CASE WHEN action = 'booking_handoff_viewed' THEN 1 ELSE 0 END) AS handoff_viewed,
    MAX(CASE WHEN action = 'booking_form_started' THEN 1 ELSE 0 END) AS booking_form_started,
    MAX(CASE WHEN action = 'booking_initiated' THEN 1 ELSE 0 END) AS booking_initiated,
    MAX(CASE WHEN action = 'booking_completed' THEN 1 ELSE 0 END) AS booking_completed
  FROM attributed_events
  GROUP BY session_id
),
traffic_classes AS (
  SELECT 'external' AS traffic_class
  UNION ALL SELECT 'automated'
  UNION ALL SELECT 'preview'
)
SELECT
  traffic_classes.traffic_class,
  COALESCE(COUNT(session_funnel.session_id), 0) AS attributed_sessions,
  COALESCE(SUM(session_funnel.handoff_viewed), 0) AS qualified_handoff_sessions,
  COALESCE(SUM(session_funnel.booking_form_started), 0) AS booking_form_sessions,
  COALESCE(SUM(session_funnel.booking_initiated), 0) AS booking_initiated_sessions,
  COALESCE(SUM(session_funnel.booking_completed), 0) AS booking_completed_sessions
FROM traffic_classes
LEFT JOIN session_funnel ON (
  (traffic_classes.traffic_class = 'external' AND session_funnel.traffic_rank = 0)
  OR (traffic_classes.traffic_class = 'automated' AND session_funnel.traffic_rank = 1)
  OR (traffic_classes.traffic_class = 'preview' AND session_funnel.traffic_rank = 2)
)
GROUP BY traffic_classes.traffic_class
ORDER BY CASE traffic_classes.traffic_class
  WHEN 'external' THEN 1
  WHEN 'automated' THEN 2
  WHEN 'preview' THEN 3
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
	const sql = buildAgentReadinessFunnelSql({ days: args.days });
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
		{ stdio: 'inherit', env: buildAgentReadinessReportEnvironment() }
	);
	if (result.error) throw result.error;
	process.exitCode = result.status ?? 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main();
}

import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

function dateWindow({ start, end }) {
  const valid = value => /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!valid(start) || !valid(end)) throw new Error('start and end must be real YYYY-MM-DD UTC dates');
  const days = (Date.parse(end) - Date.parse(start)) / 86400000;
  if (days < 1 || days > 365) throw new Error('end must be after start by 1–365 days (exclusive end)');
  return { start, end };
}

// Parse only HTTP(S) hosts. Exact host comparisons prevent lookalike referral
// domains and operational subdomains from becoming public search acquisition.
function hostSql(expression) {
  const tail = `substr(lower(COALESCE(${expression}, '')), instr(${expression}, '://') + 3)`;
  const normalized = `replace(replace(${tail}, '?', '/'), '#', '/')`;
  return `CASE WHEN lower(${expression}) LIKE 'https://%' OR lower(${expression}) LIKE 'http://%'
    THEN substr(${normalized}, 1, instr(${normalized} || '/', '/') - 1) ELSE '' END`;
}

export function buildSearchImpactSql(options) {
  const { start, end } = dateWindow(options);
  return `WITH hosts AS (
  SELECT *, ${hostSql('url')} AS host, ${hostSql('referrer')} AS referral_host,
    lower(COALESCE(json_extract(metadata, '$.trafficClass'), '')) AS declared_class,
    'createsomething.' || property AS primary_host
  FROM unified_events
  WHERE property IN ('agency', 'io', 'ltd', 'space')
    AND datetime(created_at) >= datetime('${start}')
    AND datetime(created_at) < datetime('${end}')
), paths AS (
  SELECT *, CASE WHEN instr(substr(url, instr(url, '://') + 3), '/') > 0
    THEN substr(substr(url, instr(url, '://') + 3), instr(substr(url, instr(url, '://') + 3), '/'))
    ELSE '/' END AS raw_path,
    CASE
      WHEN declared_class = 'test' THEN 6
      WHEN declared_class = 'internal' THEN 5
      WHEN declared_class = 'preview' OR host LIKE '%.pages.dev' OR host IN ('localhost', '127.0.0.1') THEN 4
      WHEN declared_class = 'automated' OR lower(COALESCE(user_agent, '')) GLOB '*bot*'
        OR lower(COALESCE(user_agent, '')) GLOB '*crawler*' OR lower(COALESCE(user_agent, '')) GLOB '*spider*'
        OR lower(COALESCE(user_agent, '')) GLOB '*headless*' OR lower(COALESCE(user_agent, '')) GLOB '*playwright*'
        OR lower(COALESCE(user_agent, '')) GLOB '*lighthouse*' THEN 3
      WHEN declared_class = 'external' THEN 2 ELSE 1 END AS traffic_rank
  FROM hosts
), clean_paths AS (
  SELECT *, substr(raw_path, 1, instr(raw_path || '?', '?') - 1) AS path_without_query
  FROM paths
), normalized AS (
  SELECT *, substr(path_without_query, 1, instr(path_without_query || '#', '#') - 1) AS path FROM clean_paths
), scoped AS (
  SELECT *,
    CASE WHEN host IN (primary_host, 'www.' || primary_host) THEN
      CASE WHEN path IN ('/admin', '/account', '/api', '/login', '/auth', '/dashboard', '/mcp-access', '/prospects')
        OR path GLOB '/admin/*' OR path GLOB '/account/*' OR path GLOB '/api/*' OR path GLOB '/login/*'
        OR path GLOB '/auth/*' OR path GLOB '/dashboard/*' OR path GLOB '/mcp-access/*'
        OR path GLOB '/prospects/*' OR path GLOB '/delivery/*' THEN 'private_route' ELSE 'public_site' END
      WHEN host LIKE '%.' || primary_host THEN 'subdomain' ELSE 'other_host' END AS host_scope
  FROM normalized
), session_classes AS (
  SELECT property, session_id, MAX(traffic_rank) AS traffic_rank FROM scoped GROUP BY property, session_id
), landings AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY property, host, host_scope, session_id ORDER BY julianday(created_at), id) AS landing_order
  FROM scoped WHERE action = 'page_view'
), sessions AS (
  SELECT property, host, host_scope, session_id, SUM(action = 'page_view') AS page_views,
    MAX(action = 'booking_cta_click') AS clicked_booking,
    MAX(action = 'booking_completed') AS completed_booking
  FROM scoped GROUP BY property, host, host_scope, session_id
), attributed AS (
  SELECT sessions.*, CASE session_classes.traffic_rank WHEN 6 THEN 'test' WHEN 5 THEN 'internal'
    WHEN 4 THEN 'preview' WHEN 3 THEN 'automated' WHEN 2 THEN 'external' ELSE 'unclassified' END AS traffic_class,
    CASE WHEN sessions.host_scope = 'private_route' THEN '(private route)'
      WHEN sessions.host_scope <> 'public_site' THEN '(' || sessions.host_scope || ')'
      ELSE COALESCE(landings.path, '(no page view)') END AS landing_path,
    CASE
      WHEN landings.referral_host IN ('chatgpt.com', 'www.chatgpt.com', 'chat.openai.com', 'perplexity.ai', 'www.perplexity.ai',
        'claude.ai', 'www.claude.ai', 'copilot.microsoft.com', 'gemini.google.com') THEN 'ai_referral'
      WHEN landings.referral_host IN ('google.com', 'www.google.com', 'www.google.co.uk', 'www.google.ca',
        'bing.com', 'www.bing.com', 'duckduckgo.com', 'www.duckduckgo.com', 'search.yahoo.com', 'search.brave.com') THEN 'search_referral'
      WHEN landings.referral_host IN ('createsomething.agency', 'www.createsomething.agency', 'createsomething.io', 'www.createsomething.io',
        'createsomething.ltd', 'www.createsomething.ltd', 'createsomething.space', 'www.createsomething.space')
        OR landings.referral_host LIKE '%.createsomething.agency' OR landings.referral_host LIKE '%.createsomething.io'
        OR landings.referral_host LIKE '%.createsomething.ltd' OR landings.referral_host LIKE '%.createsomething.space' THEN 'own_properties'
      WHEN COALESCE(landings.referral_host, '') = '' THEN 'unattributed' ELSE 'other_referral' END AS channel
  FROM sessions JOIN session_classes USING (property, session_id)
  LEFT JOIN landings ON sessions.property = landings.property AND sessions.host = landings.host
    AND sessions.host_scope = landings.host_scope AND sessions.session_id = landings.session_id AND landings.landing_order = 1
)
SELECT property, host, host_scope, traffic_class, channel, landing_path,
  COUNT(*) AS sessions, SUM(page_views) AS page_views, SUM(page_views > 0) AS landing_sessions,
  SUM(clicked_booking) AS booking_cta_sessions, SUM(completed_booking) AS booking_completed_sessions
FROM attributed GROUP BY property, host, host_scope, traffic_class, channel, landing_path
ORDER BY property, host_scope, traffic_class, sessions DESC, landing_path;`;
}

export function buildCloudflareSearchQuery(options) {
  const { start, end } = dateWindow(options);
  if (!/^[a-f0-9]{32}$/.test(options.accountId ?? '')) throw new Error('accountId must be a Cloudflare account ID');
  return `{ viewer { accounts(filter: { accountTag: "${options.accountId}" }) {
    rumPageloadEventsAdaptiveGroups(limit: 1000, filter: {
      datetime_geq: "${start}T00:00:00Z", datetime_lt: "${end}T00:00:00Z", bot: 0
    }, orderBy: [sum_visits_DESC]) { count sum { visits } dimensions { siteTag requestHost refererHost } }
  } } }`;
}

function main(argv) {
  const options = {};
  let remote = false;
  let cloudflareQuery = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--remote') remote = true;
    else if (argv[i] === '--cloudflare-query') cloudflareQuery = true;
    else if (['--start', '--end', '--account-id'].includes(argv[i]) && argv[i + 1]) {
      const key = argv[i] === '--account-id' ? 'accountId' : argv[i].slice(2);
      options[key] = argv[++i];
    } else throw new Error(`Unknown or incomplete argument: ${argv[i]}`);
  }
  if (remote && cloudflareQuery) throw new Error('Use --remote for D1 or --cloudflare-query for a read-only GraphQL query');
  const sql = cloudflareQuery ? buildCloudflareSearchQuery(options) : buildSearchImpactSql(options);
  if (!remote) return void process.stdout.write(`${sql}\n`);
  const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
  const actualRunner = fileURLToPath(new URL('../../../scripts/run-wrangler.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [actualRunner, '--cwd', 'packages/agency', 'd1', 'execute', 'create-something-db',
    '--remote', '--config', 'wrangler.jsonc', '--command', sql, '--json'], { cwd: repoRoot, stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));

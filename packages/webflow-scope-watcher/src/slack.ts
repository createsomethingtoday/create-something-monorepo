import { buildAuthorizeUrl } from './probe';
import type { CategoryEntry, CommitInfo, ScopeChange } from './types';

const EMOJI: Record<ScopeChange['type'], string> = {
	scope_added: ':new:',
	scope_removed: ':wastebasket:',
	scope_ungated: ':rocket:',
	scope_gated: ':lock:',
	scope_modified: ':pencil2:',
	category_added: ':file_folder:',
};

function fileLink(path: string, repo: string): string {
	const name = path.split('/').pop() ?? path;
	return `<https://github.com/${repo}/blob/dev/${path}|${name}>`;
}

function describeEndpoints(change: ScopeChange, repo: string): string[] {
	const endpoints = change.endpoints;
	if (!endpoints) return [];
	if (endpoints.searchFailed) {
		return ['        ↳ endpoint lookup failed — search the repo for `SCOPES.' + endpoints.constant + '` manually'];
	}
	const lines: string[] = [];
	if (endpoints.routes.length > 0) {
		const files = [...new Set(endpoints.routes.map((r) => r.file))];
		const routeList = endpoints.routes.map((r) => `\`${r.method} ${r.path}\``).join(' · ');
		lines.push(`        ↳ guards: ${routeList} (${files.map((f) => fileLink(f, repo)).join(', ')})`);
	}
	if (endpoints.otherFiles.length > 0) {
		lines.push(
			`        ↳ also referenced in ${endpoints.otherFiles.map((f) => fileLink(f, repo)).join(', ')}`
		);
	}
	if (lines.length === 0) {
		lines.push('        ↳ no route usages found yet — endpoints may land in a later PR');
	}
	return lines;
}

function describeChange(
	change: ScopeChange,
	categories: Record<string, CategoryEntry>,
	repo: string
): string {
	const emoji = EMOJI[change.type];
	if (change.type === 'category_added') {
		return `${emoji} New scope group: ${change.detail}`;
	}
	if (change.type === 'scope_added' && change.scope) {
		const s = change.scope;
		const group = categories[s.category]?.name ?? s.category;
		const gating = s.featureFlag
			? `gated by Statsig \`${s.featureFlag}\``
			: '*GA immediately (no feature flag)*';
		const resources = s.resourceTypes.join(', ') || 'unspecified';
		const head = `${emoji} \`${s.key}\` — ${group}: “${s.description}” · resources: ${resources} · ${gating}`;
		return [head, ...describeEndpoints(change, repo)].join('\n');
	}
	const head = `${emoji} \`${change.key}\` — ${change.detail}`;
	if (change.type === 'scope_ungated') {
		return [head, ...describeEndpoints(change, repo)].join('\n');
	}
	return head;
}

function describeCommit(commit: CommitInfo, repo: string): string {
	const pr = commit.prNumber
		? `<https://github.com/${repo}/pull/${commit.prNumber}|#${commit.prNumber}> `
		: '';
	const tickets = commit.tickets
		.map((t) => `<https://linear.app/webflow/issue/${t}|${t}>`)
		.join(', ');
	const suffix = tickets ? ` (${tickets})` : '';
	return `• ${pr}${commit.title}${suffix} — ${commit.author}`;
}

/**
 * Scopes a developer can request right now: added with no feature flag, or
 * just un-gated. Gated scopes cannot be added to any app yet, so there is
 * nothing to capture for them until the GA moment.
 */
export function gaScopeKeys(changes: ScopeChange[]): string[] {
	return changes
		.filter(
			(c) =>
				c.type === 'scope_ungated' || (c.type === 'scope_added' && c.scope && !c.scope.featureFlag)
		)
		.map((c) => c.key);
}

/**
 * Manual consent-capture step for GA scopes. The automated capture
 * (`/api/probe-capture`) is blocked by webflow.com's bot challenge on Browser
 * Rendering egress (2026-10-26), and the scope has to be added to the probe
 * app by hand anyway, so the alert hands the human the ready-made authorize
 * link for that same minute.
 */
function describeConsentStep(keys: string[], probeClientId: string): string[] {
	const list = keys.map((k) => `\`${k}\``).join(', ');
	return [
		'',
		`*Consent screen (manual, ~30s):* add ${list} to the Scope Probe app in the dashboard, open the authorize link as the probe account, screenshot, and reply in this thread.`,
		...keys.map((k) => `• \`${k}\` → <${buildAuthorizeUrl(probeClientId, [k])}|authorize link>`),
	];
}

export interface FormatOptions {
	/** client_id of the standing Scope Probe app; when set, GA scopes get a manual consent-capture step */
	probeClientId?: string;
}

export function formatMessage(
	changes: ScopeChange[],
	commits: CommitInfo[],
	categories: Record<string, CategoryEntry>,
	repo: string,
	scopesPath: string,
	opts: FormatOptions = {}
): string {
	const plural = changes.length === 1 ? '' : 's';
	const lines = [
		`:rotating_light: *Webflow API scope registry changed* — ${changes.length} change${plural}.`,
		'These appear in the app-settings scope picker and OAuth consent screens, and will start showing up in app submissions.',
		'',
		...changes.map((c) => describeChange(c, categories, repo)),
	];
	const gaKeys = gaScopeKeys(changes);
	if (opts.probeClientId && gaKeys.length > 0) {
		lines.push(...describeConsentStep(gaKeys, opts.probeClientId));
	}
	if (commits.length > 0) {
		lines.push('', '*Source commits touching the registry since last check:*');
		lines.push(...commits.map((c) => describeCommit(c, repo)));
	}
	lines.push('', `Registry: \`${repo}\` → \`${scopesPath}\` (branch dev)`);
	return lines.join('\n');
}

export interface SlackDelivery {
	/** Bot token for chat.postMessage (Marketplace Asset Bot); preferred when set */
	botToken?: string;
	/** Channel to post to when using the bot token (bot must be a member) */
	channelId?: string;
	/** Incoming-webhook fallback */
	webhookUrl?: string;
}

export function isSlackConfigured(delivery: SlackDelivery): boolean {
	return Boolean((delivery.botToken && delivery.channelId) || delivery.webhookUrl);
}

export interface SlackPostResult {
	posted: boolean;
	error?: string;
}

export async function postToSlack(
	delivery: SlackDelivery,
	text: string
): Promise<SlackPostResult> {
	// Slack is best-effort throughout; changes are always recorded in KV history.
	if (delivery.botToken && delivery.channelId) {
		try {
			const res = await fetch('https://slack.com/api/chat.postMessage', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${delivery.botToken}`,
					'Content-Type': 'application/json; charset=utf-8',
				},
				body: JSON.stringify({
					channel: delivery.channelId,
					text,
					unfurl_links: false,
					unfurl_media: false,
				}),
			});
			const json = (await res.json()) as { ok: boolean; error?: string };
			if (json.ok) return { posted: true };
			if (!delivery.webhookUrl) return { posted: false, error: json.error ?? `http ${res.status}` };
		} catch (err) {
			if (!delivery.webhookUrl) return { posted: false, error: String(err) };
		}
	}
	if (delivery.webhookUrl) {
		try {
			const res = await fetch(delivery.webhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text }),
			});
			return res.ok ? { posted: true } : { posted: false, error: `webhook http ${res.status}` };
		} catch (err) {
			return { posted: false, error: String(err) };
		}
	}
	return { posted: false, error: 'slack not configured' };
}

/**
 * Posts a message with an embedded image block (consent-screen capture).
 * Requires the bot-token path — image blocks need chat.postMessage, and the
 * image URL must be publicly fetchable by Slack (the worker serves captures
 * at unguessable /consent/<id>.png URLs).
 */
export async function postImageToSlack(
	delivery: SlackDelivery,
	text: string,
	imageUrl: string,
	altText: string
): Promise<SlackPostResult> {
	if (!delivery.botToken || !delivery.channelId) {
		return { posted: false, error: 'bot token + channel required for image posts' };
	}
	try {
		const res = await fetch('https://slack.com/api/chat.postMessage', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${delivery.botToken}`,
				'Content-Type': 'application/json; charset=utf-8',
			},
			body: JSON.stringify({
				channel: delivery.channelId,
				text,
				blocks: [
					{ type: 'section', text: { type: 'mrkdwn', text } },
					{ type: 'image', image_url: imageUrl, alt_text: altText },
				],
				unfurl_links: false,
				unfurl_media: false,
			}),
		});
		const json = (await res.json()) as { ok: boolean; error?: string };
		return json.ok ? { posted: true } : { posted: false, error: json.error ?? `http ${res.status}` };
	} catch (err) {
		return { posted: false, error: String(err) };
	}
}

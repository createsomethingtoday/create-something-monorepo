import type { CommitInfo } from './types';

export interface GithubEnv {
	GITHUB_TOKEN: string;
	GITHUB_REPO: string;
	GITHUB_REF: string;
	SCOPES_PATH: string;
}

export function ghHeaders(env: GithubEnv): Record<string, string> {
	return {
		Authorization: `Bearer ${env.GITHUB_TOKEN}`,
		Accept: 'application/vnd.github+json',
		'User-Agent': 'webflow-scope-watcher',
		'X-GitHub-Api-Version': '2022-11-28',
	};
}

export async function fetchRepoFile(
	env: GithubEnv,
	path: string
): Promise<{ content: string; sha: string }> {
	const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}?ref=${env.GITHUB_REF}`;
	const res = await fetch(url, { headers: ghHeaders(env) });
	if (!res.ok) {
		const body = (await res.text()).slice(0, 200);
		throw new Error(`GitHub contents API ${res.status}: ${body}`);
	}
	const json = (await res.json()) as { content: string; sha: string };
	const bytes = Uint8Array.from(atob(json.content.replace(/\s/g, '')), (c) => c.charCodeAt(0));
	return { content: new TextDecoder().decode(bytes), sha: json.sha };
}

export async function fetchScopesFile(
	env: GithubEnv
): Promise<{ content: string; sha: string }> {
	return fetchRepoFile(env, env.SCOPES_PATH);
}

/** Commits touching scopes.ts since `sinceIso` — used to attach PR/ticket context to alerts. */
export async function fetchRecentCommits(env: GithubEnv, sinceIso: string): Promise<CommitInfo[]> {
	const url =
		`https://api.github.com/repos/${env.GITHUB_REPO}/commits` +
		`?path=${encodeURIComponent(env.SCOPES_PATH)}&sha=${env.GITHUB_REF}` +
		`&since=${encodeURIComponent(sinceIso)}&per_page=20`;
	const res = await fetch(url, { headers: ghHeaders(env) });
	if (!res.ok) return []; // context is best-effort; the scope diff is the alert
	const json = (await res.json()) as Array<{
		sha: string;
		commit?: { message?: string; author?: { date?: string; name?: string } };
	}>;
	return json.map((c) => {
		const title = (c.commit?.message ?? '').split('\n')[0];
		const pr = title.match(/\(#(\d+)\)\s*$/);
		const tickets = [...new Set(title.match(/\b[A-Z]{2,10}-\d+\b/g) ?? [])];
		return {
			sha: c.sha,
			date: c.commit?.author?.date ?? '',
			author: c.commit?.author?.name ?? '',
			title,
			prNumber: pr ? Number(pr[1]) : null,
			tickets,
		};
	});
}

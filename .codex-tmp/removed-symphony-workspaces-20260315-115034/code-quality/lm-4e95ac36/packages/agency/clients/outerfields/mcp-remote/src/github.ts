type Json = Record<string, unknown>;

export type GitHubRepoRef = `${string}/${string}`;

export interface GitCommitResult {
	commitSha: string;
	commitUrl: string;
}

export interface GitHubClientOptions {
	token: string;
	userAgent?: string;
}

export class GitHubClient {
	private token: string;
	private userAgent: string;

	constructor(opts: GitHubClientOptions) {
		this.token = opts.token;
		this.userAgent = opts.userAgent ?? 'outerfields-pcn-mcp';
	}

	private async request<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
		const res = await fetch(`https://api.github.com${path}`, {
			method,
			headers: {
				Authorization: `Bearer ${this.token}`,
				Accept: 'application/vnd.github+json',
				'Content-Type': 'application/json',
				'User-Agent': this.userAgent
			},
			body: body ? JSON.stringify(body) : undefined
		});

		if (!res.ok) {
			const text = await res.text().catch(() => '');
			throw new Error(`GitHub API ${method} ${path} failed: ${res.status} ${res.statusText} ${text}`);
		}

		return (await res.json()) as T;
	}

	async getRef(repo: GitHubRepoRef, branch: string): Promise<{ object: { sha: string } }> {
		return await this.request('GET', `/repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`);
	}

	async getCommit(repo: GitHubRepoRef, sha: string): Promise<{ sha: string; tree: { sha: string } }> {
		return await this.request('GET', `/repos/${repo}/git/commits/${encodeURIComponent(sha)}`);
	}

	async createBlob(repo: GitHubRepoRef, content: string): Promise<{ sha: string }> {
		return await this.request('POST', `/repos/${repo}/git/blobs`, { content, encoding: 'utf-8' });
	}

	async createTree(
		repo: GitHubRepoRef,
		baseTreeSha: string,
		entries: Array<{ path: string; mode: '100644'; type: 'blob'; sha: string }>
	): Promise<{ sha: string }> {
		return await this.request('POST', `/repos/${repo}/git/trees`, { base_tree: baseTreeSha, tree: entries });
	}

	async createCommit(
		repo: GitHubRepoRef,
		message: string,
		treeSha: string,
		parentSha: string
	): Promise<{ sha: string; html_url: string }> {
		return await this.request('POST', `/repos/${repo}/git/commits`, {
			message,
			tree: treeSha,
			parents: [parentSha]
		});
	}

	async updateRef(repo: GitHubRepoRef, branch: string, sha: string): Promise<void> {
		await this.request('PATCH', `/repos/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, { sha, force: false });
	}

	async commitFilesToBranch(params: {
		repo: GitHubRepoRef;
		branch: string;
		message: string;
		files: Array<{ path: string; content: string }>;
	}): Promise<GitCommitResult> {
		const ref = await this.getRef(params.repo, params.branch);
		const parentSha = ref.object?.sha;
		if (!parentSha) throw new Error('Unable to resolve branch head SHA.');

		const commit = await this.getCommit(params.repo, parentSha);
		const baseTreeSha = commit.tree?.sha;
		if (!baseTreeSha) throw new Error('Unable to resolve base tree SHA.');

		const blobs = await Promise.all(
			params.files.map(async (f) => {
				const blob = await this.createBlob(params.repo, f.content);
				return { path: f.path.replace(/^\/+/, ''), sha: blob.sha };
			})
		);

		const tree = await this.createTree(
			params.repo,
			baseTreeSha,
			blobs.map((b) => ({ path: b.path, mode: '100644' as const, type: 'blob' as const, sha: b.sha }))
		);

		const newCommit = await this.createCommit(params.repo, params.message, tree.sha, parentSha);
		await this.updateRef(params.repo, params.branch, newCommit.sha);

		return { commitSha: newCommit.sha, commitUrl: newCommit.html_url };
	}

	async repositoryDispatch(repo: GitHubRepoRef, eventType: string, clientPayload?: Json): Promise<void> {
		await this.request('POST', `/repos/${repo}/dispatches`, {
			event_type: eventType,
			client_payload: clientPayload ?? {}
		});
	}
}

type Json = Record<string, unknown>;

export type GitHubRepoRef = `${string}/${string}`;

export interface GitCommitResult {
	commitSha: string;
	commitUrl: string;
}

export interface GitHubClientOptions {
	token: string;
	userAgent?: string;
}

export class GitHubClient {
	private token: string;
	private userAgent: string;

	constructor(opts: GitHubClientOptions) {
		this.token = opts.token;
		this.userAgent = opts.userAgent ?? 'outerfields-pcn-mcp';
	}

	private async request<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
		const res = await fetch(`https://api.github.com${path}`, {
			method,
			headers: {
				Authorization: `Bearer ${this.token}`,
				Accept: 'application/vnd.github+json',
				'Content-Type': 'application/json',
				'User-Agent': this.userAgent
			},
			body: body ? JSON.stringify(body) : undefined
		});

		if (!res.ok) {
			const text = await res.text().catch(() => '');
			throw new Error(`GitHub API ${method} ${path} failed: ${res.status} ${res.statusText} ${text}`);
		}

		return (await res.json()) as T;
	}

	async getRef(repo: GitHubRepoRef, branch: string): Promise<{ object: { sha: string } }> {
		return await this.request('GET', `/repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`);
	}

	async getCommit(repo: GitHubRepoRef, sha: string): Promise<{ sha: string; tree: { sha: string } }> {
		return await this.request('GET', `/repos/${repo}/git/commits/${encodeURIComponent(sha)}`);
	}

	async createBlob(repo: GitHubRepoRef, content: string): Promise<{ sha: string }> {
		return await this.request('POST', `/repos/${repo}/git/blobs`, { content, encoding: 'utf-8' });
	}

	async createTree(
		repo: GitHubRepoRef,
		baseTreeSha: string,
		entries: Array<{ path: string; mode: '100644'; type: 'blob'; sha: string }>
	): Promise<{ sha: string }> {
		return await this.request('POST', `/repos/${repo}/git/trees`, { base_tree: baseTreeSha, tree: entries });
	}

	async createCommit(
		repo: GitHubRepoRef,
		message: string,
		treeSha: string,
		parentSha: string
	): Promise<{ sha: string; html_url: string }> {
		return await this.request('POST', `/repos/${repo}/git/commits`, {
			message,
			tree: treeSha,
			parents: [parentSha]
		});
	}

	async updateRef(repo: GitHubRepoRef, branch: string, sha: string): Promise<void> {
		await this.request('PATCH', `/repos/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, { sha, force: false });
	}

	async commitFilesToBranch(params: {
		repo: GitHubRepoRef;
		branch: string;
		message: string;
		files: Array<{ path: string; content: string }>;
	}): Promise<GitCommitResult> {
		const ref = await this.getRef(params.repo, params.branch);
		const parentSha = ref.object?.sha;
		if (!parentSha) throw new Error('Unable to resolve branch head SHA.');

		const commit = await this.getCommit(params.repo, parentSha);
		const baseTreeSha = commit.tree?.sha;
		if (!baseTreeSha) throw new Error('Unable to resolve base tree SHA.');

		const blobs = await Promise.all(
			params.files.map(async (f) => {
				const blob = await this.createBlob(params.repo, f.content);
				return { path: f.path.replace(/^\/+/, ''), sha: blob.sha };
			})
		);

		const tree = await this.createTree(
			params.repo,
			baseTreeSha,
			blobs.map((b) => ({ path: b.path, mode: '100644' as const, type: 'blob' as const, sha: b.sha }))
		);

		const newCommit = await this.createCommit(params.repo, params.message, tree.sha, parentSha);
		await this.updateRef(params.repo, params.branch, newCommit.sha);

		return { commitSha: newCommit.sha, commitUrl: newCommit.html_url };
	}

	async repositoryDispatch(repo: GitHubRepoRef, eventType: string, clientPayload?: Json): Promise<void> {
		await this.request('POST', `/repos/${repo}/dispatches`, {
			event_type: eventType,
			client_payload: clientPayload ?? {}
		});
	}
}


/**
 * GitHub Monitor
 * 
 * Scans GitHub for relevant signals:
 * - Issues and discussions mentioning our tools
 * - Stars/forks on our repos
 * - Mentions in other repos
 */

import type { DiscoveredSignal, MonitorConfig, MonitorResult } from './types';
import { classifySignalType, scoreRelevance, classifyUrgency, DEFAULT_KEYWORDS } from './types';

// CREATE SOMETHING GitHub repos to monitor
const OUR_REPOS = [
	'create-something/ground',
	'create-something/templates',
	// Add more repos as they become public
];

export class GitHubMonitor {
	private config: MonitorConfig;
	private token: string | null = null;
	
	constructor(config?: Partial<MonitorConfig>) {
		this.config = {
			keywords: config?.keywords || DEFAULT_KEYWORDS,
			watchAccounts: config?.watchAccounts || [],
			minFollowers: config?.minFollowers || 0,
			maxResults: config?.maxResults || 50,
			since: config?.since
		};
	}
	
	/**
	 * Set GitHub token for API calls
	 */
	setToken(token: string): void {
		this.token = token;
	}
	
	/**
	 * Run the monitor
	 */
	async run(db: D1Database, token?: string): Promise<MonitorResult> {
		const startTime = new Date().toISOString();
		const signals: DiscoveredSignal[] = [];
		const errors: string[] = [];
		
		if (token) {
			this.token = token;
		}
		
		// GitHub API can be used without auth for public data, but rate limits are low
		const headers: Record<string, string> = {
			'Accept': 'application/vnd.github.v3+json',
			'User-Agent': 'CREATE-SOMETHING-Monitor'
		};
		
		if (this.token) {
			headers['Authorization'] = `Bearer ${this.token}`;
		}
		
		// Search for mentions in issues/discussions
		try {
			const searchSignals = await this.searchMentions(headers);
			signals.push(...searchSignals);
		} catch (error) {
			errors.push(`Search failed: ${error}`);
		}
		
		// Check our repos for new issues/discussions
		try {
			const repoSignals = await this.scanOurRepos(headers);
			signals.push(...repoSignals);
		} catch (error) {
			errors.push(`Repo scan failed: ${error}`);
		}
		
		// Score and classify all signals
		const processedSignals = signals.map(signal => ({
			...signal,
			relevance_score: scoreRelevance(signal, this.config),
			urgency: classifyUrgency(signal),
			signal_type: signal.signal_type || classifySignalType(signal.content)
		}));
		
		// Deduplicate by source_id
		const seen = new Set<string>();
		const uniqueSignals = processedSignals.filter(s => {
			if (s.source_id && seen.has(s.source_id)) return false;
			if (s.source_id) seen.add(s.source_id);
			return true;
		});
		
		// Store in database
		for (const signal of uniqueSignals) {
			try {
				const id = `sig_gh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
				await db.prepare(`
					INSERT OR IGNORE INTO community_signals (
						id, platform, signal_type, source_url, source_id,
						author_id, author_name, author_handle, author_followers,
						content, context, relevance_score, urgency, status,
						detected_at, metadata
					) VALUES (?, 'github', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)
				`).bind(
					id,
					signal.signal_type,
					signal.source_url || null,
					signal.source_id || null,
					signal.author_id || null,
					signal.author_name || null,
					signal.author_handle || null,
					signal.author_followers || null,
					signal.content,
					signal.context || null,
					signal.relevance_score || 0.5,
					signal.urgency || 'low',
					new Date().toISOString(),
					signal.metadata ? JSON.stringify(signal.metadata) : null
				).run();
			} catch (error) {
				// Likely duplicate
				console.error('Failed to store GitHub signal:', error);
			}
		}
		
		// Record the run
		const runId = `run_gh_${Date.now()}`;
		await db.prepare(`
			INSERT INTO community_monitor_runs (
				id, monitor_type, started_at, completed_at, signals_found, status
			) VALUES (?, 'github', ?, ?, ?, 'completed')
		`).bind(runId, startTime, new Date().toISOString(), uniqueSignals.length).run();
		
		return {
			monitor: 'github',
			started_at: startTime,
			completed_at: new Date().toISOString(),
			signals_found: uniqueSignals.length,
			signals: uniqueSignals,
			errors: errors.length > 0 ? errors : undefined
		};
	}
	
	/**
	 * Search GitHub for keyword mentions
	 */
	private async searchMentions(headers: Record<string, string>): Promise<DiscoveredSignal[]> {
		const signals: DiscoveredSignal[] = [];
		
		// Build search query
		const keywords = this.config.keywords.slice(0, 5); // Limit to avoid query length issues
		const query = keywords.map(k => `"${k}"`).join(' OR ');
		
		// Calculate since date
		const sinceDate = this.config.since 
			? new Date(this.config.since)
			: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: 7 days
		
		const searchUrl = new URL('https://api.github.com/search/issues');
		searchUrl.searchParams.set('q', `${query} created:>=${sinceDate.toISOString().split('T')[0]}`);
		searchUrl.searchParams.set('sort', 'created');
		searchUrl.searchParams.set('order', 'desc');
		searchUrl.searchParams.set('per_page', String(this.config.maxResults || 30));
		
		try {
			const response = await fetch(searchUrl.toString(), { headers });
			
			if (!response.ok) {
				console.error('GitHub search failed:', response.status);
				return signals;
			}
			
			const data = await response.json() as {
				items: Array<{
					id: number;
					html_url: string;
					title: string;
					body: string;
					state: string;
					user: {
						login: string;
						id: number;
						followers_url: string;
					};
					created_at: string;
					repository_url: string;
				}>;
			};
			
			for (const item of data.items || []) {
				// Skip if it's from our own repos
				if (OUR_REPOS.some(repo => item.repository_url?.includes(repo))) {
					continue;
				}
				
				signals.push({
					platform: 'github',
					signal_type: item.html_url.includes('/issues/') ? 'question' : 'mention',
					content: `${item.title}\n\n${item.body?.slice(0, 500) || ''}`,
					source_url: item.html_url,
					source_id: `gh_issue_${item.id}`,
					author_handle: item.user?.login,
					author_id: String(item.user?.id),
					context: `Repository: ${item.repository_url?.split('/repos/')[1] || 'unknown'}`,
					metadata: {
						state: item.state,
						created_at: item.created_at
					}
				});
			}
		} catch (error) {
			console.error('GitHub search error:', error);
		}
		
		return signals;
	}
	
	/**
	 * Scan our repos for new issues, discussions, and notable events
	 */
	private async scanOurRepos(headers: Record<string, string>): Promise<DiscoveredSignal[]> {
		const signals: DiscoveredSignal[] = [];
		
		for (const repo of OUR_REPOS) {
			try {
				// Get recent issues
				const issuesUrl = `https://api.github.com/repos/${repo}/issues?state=open&sort=created&direction=desc&per_page=10`;
				const issuesResponse = await fetch(issuesUrl, { headers });
				
				if (issuesResponse.ok) {
					const issues = await issuesResponse.json() as Array<{
						id: number;
						html_url: string;
						title: string;
						body: string;
						user: {
							login: string;
							id: number;
						};
						created_at: string;
						labels: Array<{ name: string }>;
					}>;
					
					for (const issue of issues) {
						// Skip if it's a PR (issues endpoint returns PRs too)
						if (issue.html_url.includes('/pull/')) continue;
						
						const isQuestion = issue.labels?.some(l => 
							l.name.toLowerCase().includes('question') || 
							l.name.toLowerCase().includes('help')
						);
						
						signals.push({
							platform: 'github',
							signal_type: isQuestion ? 'question' : 'mention',
							content: `${issue.title}\n\n${issue.body?.slice(0, 500) || ''}`,
							source_url: issue.html_url,
							source_id: `gh_our_issue_${issue.id}`,
							author_handle: issue.user?.login,
							author_id: String(issue.user?.id),
							context: `Our repo: ${repo}`,
							urgency: 'medium', // Issues on our repos are higher priority
							metadata: {
								repo,
								created_at: issue.created_at
							}
						});
					}
				}
				
				// Get recent stars (for relationship tracking)
				const starsUrl = `https://api.github.com/repos/${repo}/stargazers?per_page=20`;
				const starsResponse = await fetch(starsUrl, { 
					headers: { ...headers, 'Accept': 'application/vnd.github.star+json' }
				});
				
				if (starsResponse.ok) {
					const stargazers = await starsResponse.json() as Array<{
						starred_at: string;
						user: {
							login: string;
							id: number;
							followers: number;
						};
					}>;
					
					// Only signal for significant accounts (followers > 100)
					for (const star of stargazers) {
						if (star.user?.followers > 100) {
							signals.push({
								platform: 'github',
								signal_type: 'praise',
								content: `${star.user.login} starred ${repo}`,
								source_url: `https://github.com/${star.user.login}`,
								source_id: `gh_star_${repo}_${star.user.id}`,
								author_handle: star.user.login,
								author_id: String(star.user.id),
								author_followers: star.user.followers,
								context: `Starred ${repo}`,
								metadata: {
									repo,
									starred_at: star.starred_at
								}
							});
						}
					}
				}
			} catch (error) {
				console.error(`Error scanning repo ${repo}:`, error);
			}
		}
		
		return signals;
	}
}

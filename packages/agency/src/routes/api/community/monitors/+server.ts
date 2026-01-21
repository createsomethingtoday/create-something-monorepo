/**
 * Community Monitors API
 * 
 * Trigger platform monitors to scan for signals.
 * Can be called manually or via Cloudflare Cron.
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { LinkedInMonitor, GitHubMonitor } from '$lib/community/monitors';

/**
 * GET /api/community/monitors
 * 
 * Get monitor status and recent run history
 */
export const GET: RequestHandler = async ({ platform }) => {
	const db = platform!.env.DB;
	
	try {
		const runs = await db.prepare(`
			SELECT * FROM community_monitor_runs 
			ORDER BY started_at DESC 
			LIMIT 20
		`).all();
		
		return json({
			monitors: ['linkedin', 'github'],
			recent_runs: runs.results,
			available_tokens: {
				linkedin: !!(await db.prepare(
					'SELECT 1 FROM linkedin_tokens WHERE id = 1 AND access_token IS NOT NULL'
				).first())
			}
		});
	} catch (error) {
		return json({ error: 'Failed to fetch monitor status' }, { status: 500 });
	}
};

interface MonitorRequest {
	monitor: string;
	github_token?: string;
	linkedin_token?: string;
}

/**
 * POST /api/community/monitors
 * 
 * Trigger a monitor run
 */
export const POST: RequestHandler = async ({ platform, request }) => {
	const db = platform!.env.DB;
	const body = await request.json() as MonitorRequest;
	
	const { monitor, github_token, linkedin_token } = body;
	
	if (!monitor || !['linkedin', 'github', 'all'].includes(monitor)) {
		return json(
			{ error: 'Invalid monitor. Must be: linkedin, github, or all' },
			{ status: 400 }
		);
	}
	
	const results: Record<string, unknown> = {};
	
	// Run LinkedIn monitor
	if (monitor === 'linkedin' || monitor === 'all') {
		try {
			const linkedinMonitor = new LinkedInMonitor({
				maxResults: 50
			});
			
			results.linkedin = await linkedinMonitor.run(db, linkedin_token);
		} catch (error) {
			results.linkedin = { error: String(error) };
		}
	}
	
	// Run GitHub monitor
	if (monitor === 'github' || monitor === 'all') {
		try {
			const githubMonitor = new GitHubMonitor({
				maxResults: 50,
				since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
			});
			
			results.github = await githubMonitor.run(db, github_token || (platform!.env as unknown as Record<string, string>).GITHUB_TOKEN);
		} catch (error) {
			results.github = { error: String(error) };
		}
	}
	
	return json({
		triggered: monitor,
		results
	});
};

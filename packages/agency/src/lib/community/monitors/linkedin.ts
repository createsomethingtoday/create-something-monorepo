/**
 * LinkedIn Monitor
 * 
 * Scans LinkedIn for relevant signals.
 * Note: LinkedIn's API has limitations. This monitor focuses on:
 * - Comments on our posts
 * - Mentions in posts (via search API if available)
 * - Engagement patterns on our content
 */

import type { DiscoveredSignal, MonitorConfig, MonitorResult } from './types';
import { classifySignalType, scoreRelevance, classifyUrgency, DEFAULT_KEYWORDS } from './types';

export class LinkedInMonitor {
	private config: MonitorConfig;
	private accessToken: string | null = null;
	
	constructor(config?: Partial<MonitorConfig>) {
		this.config = {
			keywords: config?.keywords || DEFAULT_KEYWORDS,
			watchAccounts: config?.watchAccounts || [],
			minFollowers: config?.minFollowers || 0,
			maxResults: config?.maxResults || 50
		};
	}
	
	/**
	 * Set the access token for API calls
	 */
	setAccessToken(token: string): void {
		this.accessToken = token;
	}
	
	/**
	 * Run the monitor
	 */
	async run(db: D1Database, token?: string): Promise<MonitorResult> {
		const startTime = new Date().toISOString();
		const signals: DiscoveredSignal[] = [];
		const errors: string[] = [];
		
		if (token) {
			this.accessToken = token;
		}
		
		if (!this.accessToken) {
			// Try to get token from DB
			const storedToken = await db.prepare(
				'SELECT access_token FROM linkedin_tokens WHERE id = 1'
			).first<{ access_token: string }>();
			
			if (storedToken?.access_token) {
				this.accessToken = storedToken.access_token;
			} else {
				return {
					monitor: 'linkedin',
					started_at: startTime,
					completed_at: new Date().toISOString(),
					signals_found: 0,
					signals: [],
					errors: ['No LinkedIn access token available']
				};
			}
		}
		
		try {
			// Get comments on our recent posts
			const commentSignals = await this.scanPostComments();
			signals.push(...commentSignals);
		} catch (error) {
			errors.push(`Comment scan failed: ${error}`);
		}
		
		try {
			// Get notifications/mentions
			const mentionSignals = await this.scanMentions();
			signals.push(...mentionSignals);
		} catch (error) {
			errors.push(`Mention scan failed: ${error}`);
		}
		
		// Score and classify all signals
		const processedSignals = signals.map(signal => ({
			...signal,
			relevance_score: scoreRelevance(signal, this.config),
			urgency: classifyUrgency(signal),
			signal_type: signal.signal_type || classifySignalType(signal.content)
		}));
		
		// Store in database
		for (const signal of processedSignals) {
			try {
				const id = `sig_li_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
				await db.prepare(`
					INSERT OR IGNORE INTO community_signals (
						id, platform, signal_type, source_url, source_id,
						author_id, author_name, author_handle, author_followers,
						content, context, relevance_score, urgency, status,
						detected_at, metadata
					) VALUES (?, 'linkedin', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)
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
				// Likely duplicate, skip
				console.error('Failed to store signal:', error);
			}
		}
		
		// Record the run
		const runId = `run_li_${Date.now()}`;
		await db.prepare(`
			INSERT INTO community_monitor_runs (
				id, monitor_type, started_at, completed_at, signals_found, status
			) VALUES (?, 'linkedin', ?, ?, ?, 'completed')
		`).bind(runId, startTime, new Date().toISOString(), processedSignals.length).run();
		
		return {
			monitor: 'linkedin',
			started_at: startTime,
			completed_at: new Date().toISOString(),
			signals_found: processedSignals.length,
			signals: processedSignals,
			errors: errors.length > 0 ? errors : undefined
		};
	}
	
	/**
	 * Scan comments on our recent posts
	 */
	private async scanPostComments(): Promise<DiscoveredSignal[]> {
		const signals: DiscoveredSignal[] = [];
		
		if (!this.accessToken) return signals;
		
		try {
			// Get our recent posts
			const postsResponse = await fetch(
				'https://api.linkedin.com/v2/shares?q=owners&owners=urn:li:person:me&count=10',
				{
					headers: {
						'Authorization': `Bearer ${this.accessToken}`,
						'X-Restli-Protocol-Version': '2.0.0'
					}
				}
			);
			
			if (!postsResponse.ok) {
				console.error('Failed to fetch LinkedIn posts:', postsResponse.status);
				return signals;
			}
			
			const postsData = await postsResponse.json() as { elements: Array<{ activity: string; id: string }> };
			
			// Get comments for each post
			for (const post of postsData.elements || []) {
				const activityUrn = post.activity || post.id;
				
				const commentsResponse = await fetch(
					`https://api.linkedin.com/v2/socialActions/${encodeURIComponent(activityUrn)}/comments`,
					{
						headers: {
							'Authorization': `Bearer ${this.accessToken}`,
							'X-Restli-Protocol-Version': '2.0.0'
						}
					}
				);
				
				if (!commentsResponse.ok) continue;
				
				const commentsData = await commentsResponse.json() as {
					elements: Array<{
						id: string;
						message: { text: string };
						actor: string;
						created: { time: number };
					}>;
				};
				
				for (const comment of commentsData.elements || []) {
					signals.push({
						platform: 'linkedin',
						signal_type: 'reply',
						content: comment.message?.text || '',
						source_id: comment.id,
						source_url: `https://linkedin.com/feed/update/${activityUrn}`,
						author_id: comment.actor,
						metadata: {
							activity_urn: activityUrn,
							created_time: comment.created?.time
						}
					});
				}
			}
		} catch (error) {
			console.error('LinkedIn comment scan error:', error);
		}
		
		return signals;
	}
	
	/**
	 * Scan for mentions via notifications or search
	 */
	private async scanMentions(): Promise<DiscoveredSignal[]> {
		const signals: DiscoveredSignal[] = [];
		
		if (!this.accessToken) return signals;
		
		// LinkedIn's mention API is limited, but we can check notifications
		try {
			const notificationsResponse = await fetch(
				'https://api.linkedin.com/v2/notifications?q=criteria&count=50',
				{
					headers: {
						'Authorization': `Bearer ${this.accessToken}`,
						'X-Restli-Protocol-Version': '2.0.0'
					}
				}
			);
			
			if (!notificationsResponse.ok) {
				// Notifications API may not be available
				return signals;
			}
			
			const notificationsData = await notificationsResponse.json() as {
				elements: Array<{
					id: string;
					notificationType: string;
					headline?: string;
					actor?: string;
					created?: { time: number };
				}>;
			};
			
			for (const notification of notificationsData.elements || []) {
				// Filter for mention-related notifications
				if (notification.notificationType?.includes('MENTION') || 
					notification.notificationType?.includes('COMMENT') ||
					notification.notificationType?.includes('SHARE')) {
					signals.push({
						platform: 'linkedin',
						signal_type: 'mention',
						content: notification.headline || 'LinkedIn notification',
						source_id: notification.id,
						author_id: notification.actor,
						metadata: {
							notification_type: notification.notificationType,
							created_time: notification.created?.time
						}
					});
				}
			}
		} catch (error) {
			console.error('LinkedIn notification scan error:', error);
		}
		
		return signals;
	}
}

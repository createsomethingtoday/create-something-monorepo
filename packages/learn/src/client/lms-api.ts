/**
 * LMS API Client
 *
 * HTTP client for learn.createsomething.space API.
 * Canon: The client recedes; the learning progresses.
 */

import type {
	AuthTokens,
	LessonContent,
	MagicLinkPollResponse,
	ProgressOverview,
	PraxisAttempt
} from '../types.js';

const LMS_BASE_URL = 'https://learn.createsomething.space';

export class LMSClient {
	private tokens?: AuthTokens;

	constructor(tokens?: AuthTokens) {
		this.tokens = tokens;
	}

	setTokens(tokens: AuthTokens) {
		this.tokens = tokens;
	}

	private async fetch(path: string, options: RequestInit = {}): Promise<Response> {
		const headers = new Headers(options.headers);
		headers.set('Content-Type', 'application/json');

		if (this.tokens?.accessToken) {
			headers.set('Authorization', `Bearer ${this.tokens.accessToken}`);
		}

		const response = await fetch(`${LMS_BASE_URL}${path}`, {
			...options,
			headers
		});

		return response;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Authentication
	// ─────────────────────────────────────────────────────────────────────────

	async initiateMagicLink(email: string, sessionId: string): Promise<{ success: boolean; expiresIn: number }> {
		const response = await this.fetch('/api/auth/magic-link', {
			method: 'POST',
			body: JSON.stringify({ email, sessionId })
		});

		if (!response.ok) {
			const data = await response.json() as { message?: string };
			throw new Error(data.message || 'Failed to send magic link');
		}

		return response.json() as Promise<{ success: boolean; expiresIn: number }>;
	}

	async pollMagicLink(sessionId: string): Promise<MagicLinkPollResponse> {
		const response = await this.fetch('/api/auth/magic-link/poll', {
			method: 'POST',
			body: JSON.stringify({ sessionId })
		});

		if (!response.ok) {
			const data = await response.json() as { message?: string };
			throw new Error(data.message || 'Failed to poll magic link status');
		}

		return response.json() as Promise<MagicLinkPollResponse>;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Lessons
	// ─────────────────────────────────────────────────────────────────────────

	async getLesson(pathId: string, lessonId: string): Promise<LessonContent> {
		const response = await this.fetch(`/api/lessons/${pathId}/${lessonId}`);

		if (!response.ok) {
			throw new Error(`Lesson not found: ${pathId}/${lessonId}`);
		}

		return response.json() as Promise<LessonContent>;
	}

	async getLessonMarkdown(pathId: string, lessonId: string): Promise<string> {
		const response = await fetch(`${LMS_BASE_URL}/api/lessons/${pathId}/${lessonId}`, {
			headers: { Accept: 'text/markdown' }
		});

		if (!response.ok) {
			throw new Error(`Lesson not found: ${pathId}/${lessonId}`);
		}

		return response.text();
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Progress
	// ─────────────────────────────────────────────────────────────────────────

	async getProgress(): Promise<ProgressOverview> {
		const response = await this.fetch('/api/progress');

		if (!response.ok) {
			throw new Error('Failed to fetch progress');
		}

		const data = await response.json() as { success: boolean } & ProgressOverview;
		return data;
	}

	async startLesson(pathId: string, lessonId: string): Promise<void> {
		const response = await this.fetch('/api/progress/lesson', {
			method: 'POST',
			body: JSON.stringify({ pathId, lessonId, action: 'start' })
		});

		if (!response.ok) {
			throw new Error('Failed to start lesson');
		}
	}

	async completeLesson(pathId: string, lessonId: string, timeSpent: number): Promise<{ pathCompleted: boolean }> {
		const response = await this.fetch('/api/progress/lesson', {
			method: 'POST',
			body: JSON.stringify({ pathId, lessonId, action: 'complete', timeSpent })
		});

		if (!response.ok) {
			throw new Error('Failed to complete lesson');
		}

		const data = await response.json() as { pathCompleted?: boolean };
		return { pathCompleted: data.pathCompleted ?? false };
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Praxis
	// ─────────────────────────────────────────────────────────────────────────

	async startPraxis(praxisId: string): Promise<{ attemptId: number }> {
		const response = await this.fetch('/api/progress/praxis', {
			method: 'POST',
			body: JSON.stringify({ praxisId, action: 'start' })
		});

		if (!response.ok) {
			throw new Error('Failed to start praxis');
		}

		return response.json() as Promise<{ attemptId: number }>;
	}

	async submitPraxis(
		praxisId: string,
		submission: unknown,
		feedback: string,
		score: number,
		passed: boolean
	): Promise<{ attemptId: number; passed: boolean }> {
		const response = await this.fetch('/api/progress/praxis', {
			method: 'POST',
			body: JSON.stringify({
				praxisId,
				action: 'submit',
				submission,
				feedback,
				score,
				passed
			})
		});

		if (!response.ok) {
			throw new Error('Failed to submit praxis');
		}

		return response.json() as Promise<{ attemptId: number; passed: boolean }>;
	}

	async getPraxisAttempts(praxisId: string): Promise<PraxisAttempt[]> {
		const response = await this.fetch(`/api/progress/praxis?praxisId=${praxisId}`);

		if (!response.ok) {
			throw new Error('Failed to fetch praxis attempts');
		}

		const data = await response.json() as { attempts: PraxisAttempt[] };
		return data.attempts;
	}
}

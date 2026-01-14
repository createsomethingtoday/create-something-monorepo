/**
 * Dashboard Server - Protected Route
 *
 * Loads agent metrics and activity for authenticated users.
 * Auth via WORKWAY IDENTITY layer.
 */

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, fetch }) => {
	// Auth check - redirects if not authenticated
	if (!locals.user) {
		throw redirect(303, '/login?redirect=/dashboard');
	}

	// In production, these would come from WORKWAY API
	// For now, return mock data structure that matches WORKWAY execution format

	const agentMetrics = {
		period: 'last_30_days',
		summary: {
			totalExecutions: 847,
			successRate: 94.2,
			revenueRecovered: 4250,
			hoursAutomated: 62,
		},
		byAgent: [
			{
				id: 'dental-no-show-recovery',
				name: 'No-Show Recovery',
				executions: 312,
				successRate: 92.3,
				revenueRecovered: 3200,
				lastRun: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
			},
			{
				id: 'dental-recall-reminders',
				name: 'Recall Automation',
				executions: 245,
				successRate: 96.7,
				conversions: 38,
				lastRun: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
			},
			{
				id: 'dental-insurance-verification',
				name: 'Insurance Verification',
				executions: 189,
				successRate: 94.2,
				verificationsCompleted: 178,
				lastRun: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
			},
			{
				id: 'dental-review-requests',
				name: 'Review Requests',
				executions: 101,
				successRate: 91.1,
				reviewsGenerated: 47,
				lastRun: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
			},
		],
		recentActivity: [
			{
				id: 'exec_1',
				agentId: 'dental-no-show-recovery',
				agentName: 'No-Show Recovery',
				status: 'success',
				timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
				outcome: 'Recovered appointment slot - $175',
			},
			{
				id: 'exec_2',
				agentId: 'dental-insurance-verification',
				agentName: 'Insurance Verification',
				status: 'success',
				timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
				outcome: 'Verified coverage for 3 patients',
			},
			{
				id: 'exec_3',
				agentId: 'dental-recall-reminders',
				agentName: 'Recall Automation',
				status: 'success',
				timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
				outcome: 'Sent 12 recall reminders',
			},
			{
				id: 'exec_4',
				agentId: 'dental-no-show-recovery',
				agentName: 'No-Show Recovery',
				status: 'failed',
				timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
				outcome: 'No waitlist patients available',
			},
			{
				id: 'exec_5',
				agentId: 'dental-review-requests',
				agentName: 'Review Requests',
				status: 'success',
				timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
				outcome: 'New 5-star review on Google',
			},
		],
		dailyTrend: [
			{ date: '2026-01-08', executions: 78, revenue: 350 },
			{ date: '2026-01-09', executions: 92, revenue: 425 },
			{ date: '2026-01-10', executions: 85, revenue: 380 },
			{ date: '2026-01-11', executions: 103, revenue: 520 },
			{ date: '2026-01-12', executions: 89, revenue: 410 },
			{ date: '2026-01-13', executions: 95, revenue: 480 },
			{ date: '2026-01-14', executions: 45, revenue: 285 }, // Today (partial)
		],
	};

	return {
		user: locals.user,
		metrics: agentMetrics,
	};
};

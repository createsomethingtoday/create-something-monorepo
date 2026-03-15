/**
 * Suggestion Agent
 *
 * Pre-highlights likely time slots when the widget loads.
 * Pure heuristic approach for < 50ms response time.
 *
 * Philosophy: "Your usual time? It's already highlighted."
 * The user shouldn't think "AI suggested this" — they should think
 * "CLEARWAY just knows what I want."
 */

import { BaseAgent, normalizeWeights } from '../base';
import type { AgentContext, AgentResult } from '../base';
import type {
	SuggestionRequest,
	SuggestionResponse,
	SlotSuggestion,
	PreferenceWeights,
	MemberPreferencesAI
} from '../types';

const MAX_SUGGESTIONS = 3;
const MIN_CONFIDENCE_THRESHOLD = 0.3;

interface BookingHistory {
	courtId: string;
	courtName: string;
	startTime: string;
	dayOfWeek: number;
	hour: number;
}

export class SuggestionAgent extends BaseAgent<SuggestionRequest, SuggestionResponse> {
	constructor(context: AgentContext) {
		super('SuggestionAgent', context);
	}

	protected async computeHeuristic(
		input: SuggestionRequest
	): Promise<{ data: SuggestionResponse; confident: boolean }> {
		const { facilityId, memberId, memberEmail, date, availableSlots } = input;

		// No available slots = no suggestions
		if (availableSlots.length === 0) {
			return {
				data: { suggestions: [], personalized: false, computeTimeMs: 0 },
				confident: true
			};
		}

		// Try to find member and their preferences
		let weights: PreferenceWeights | null = null;
		let history: BookingHistory[] = [];
		let personalized = false;

		if (memberId || memberEmail) {
			const memberData = await this.loadMemberData(facilityId, memberId, memberEmail);
			if (memberData) {
				weights = memberData.weights;
				history = memberData.history;
				personalized = true;
			}
		}

		// Score each available slot
		const targetDate = new Date(date + 'T12:00:00');
		const targetDayOfWeek = targetDate.getDay();

		const scoredSlots = availableSlots.map((slot) => {
			const slotDate = new Date(slot.startTime);
			const hour = slotDate.getHours();

			const score = this.scoreSlot(slot.courtId, hour, targetDayOfWeek, weights, history);

			return {
				courtId: slot.courtId,
				courtName: slot.courtName,
				startTime: slot.startTime,
				endTime: slot.endTime,
				score: score.value,
				reason: score.reason
			} satisfies SlotSuggestion;
		});

		// Sort by score descending, take top N above threshold
		const suggestions = scoredSlots
			.filter((s) => s.score >= MIN_CONFIDENCE_THRESHOLD)
			.sort((a, b) => b.score - a.score)
			.slice(0, MAX_SUGGESTIONS);

		// If personalized but no strong matches, fall back to popular times
		const confident = personalized ? suggestions.length > 0 : true;

		return {
			data: {
				suggestions,
				personalized,
				computeTimeMs: 0 // Will be filled by base class
			},
			confident
		};
	}

	private scoreSlot(
		courtId: string,
		hour: number,
		dayOfWeek: number,
		weights: PreferenceWeights | null,
		history: BookingHistory[]
	): { value: number; reason: SlotSuggestion['reason'] } {
		// No history = use generic scoring
		if (!weights && history.length === 0) {
			// Score based on general popularity (peak hours)
			const peakScore = this.getPeakHourScore(hour, dayOfWeek);
			return { value: peakScore * 0.5, reason: 'new_user' };
		}

		let score = 0;
		let dominantFactor: SlotSuggestion['reason'] = 'pattern_match';
		let factorScores: { factor: SlotSuggestion['reason']; score: number }[] = [];

		// Score from explicit weights (if present)
		if (weights) {
			const timeScore = weights.timeWeights[hour] || 0;
			const courtScore = weights.courtWeights[courtId] || 0;
			const dayScore = weights.dayWeights[dayOfWeek] || 0;

			factorScores.push(
				{ factor: 'frequent_time', score: timeScore },
				{ factor: 'frequent_court', score: courtScore },
				{ factor: 'frequent_day', score: dayScore }
			);
		}

		// Score from booking history (if weights aren't available)
		if (history.length > 0 && !weights) {
			// Count occurrences
			const timeCount = history.filter((h) => h.hour === hour).length;
			const courtCount = history.filter((h) => h.courtId === courtId).length;
			const dayCount = history.filter((h) => h.dayOfWeek === dayOfWeek).length;
			const total = history.length;

			factorScores.push(
				{ factor: 'frequent_time', score: timeCount / total },
				{ factor: 'frequent_court', score: courtCount / total },
				{ factor: 'frequent_day', score: dayCount / total }
			);
		}

		// Calculate weighted average
		if (factorScores.length > 0) {
			// Weight: time (40%), court (35%), day (25%)
			const weights_config = { frequent_time: 0.4, frequent_court: 0.35, frequent_day: 0.25 };
			score = factorScores.reduce((sum, f) => {
				const weight = weights_config[f.factor as keyof typeof weights_config] || 0;
				return sum + f.score * weight;
			}, 0);

			// Find dominant factor
			const maxFactor = factorScores.reduce((max, f) => (f.score > max.score ? f : max));
			if (maxFactor.score > 0.5) {
				dominantFactor = maxFactor.factor;
			}
		}

		return { value: Math.min(1, score), reason: dominantFactor };
	}

	/**
	 * Generic scoring for new users based on typical peak hours
	 */
	private getPeakHourScore(hour: number, dayOfWeek: number): number {
		const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

		if (isWeekend) {
			// Weekend: morning (9-11) and afternoon (2-5) are popular
			if (hour >= 9 && hour <= 11) return 0.8;
			if (hour >= 14 && hour <= 17) return 0.7;
			if (hour >= 8 && hour <= 18) return 0.5;
			return 0.3;
		} else {
			// Weekday: early morning (6-8) and evening (5-8) are popular
			if (hour >= 17 && hour <= 20) return 0.9; // Evening peak
			if (hour >= 6 && hour <= 8) return 0.7; // Morning
			if (hour >= 12 && hour <= 13) return 0.6; // Lunch
			return 0.4;
		}
	}

	/**
	 * Load member preferences and booking history
	 */
	private async loadMemberData(
		facilityId: string,
		memberId?: string,
		memberEmail?: string
	): Promise<{ weights: PreferenceWeights | null; history: BookingHistory[] } | null> {
		try {
			// Find member
			let memberQuery: string;
			let memberParams: string[];

			if (memberId) {
				memberQuery = 'SELECT id, preferences FROM members WHERE facility_id = ? AND id = ?';
				memberParams = [facilityId, memberId];
			} else if (memberEmail) {
				memberQuery = 'SELECT id, preferences FROM members WHERE facility_id = ? AND email = ?';
				memberParams = [facilityId, memberEmail];
			} else {
				return null;
			}

			const memberResult = await this.context.db
				.prepare(memberQuery)
				.bind(...memberParams)
				.first<{ id: string; preferences: string }>();

			if (!memberResult) {
				return null;
			}

			// Parse preferences
			let weights: PreferenceWeights | null = null;
			try {
				const prefs: MemberPreferencesAI = JSON.parse(memberResult.preferences || '{}');

				// Check if AI personalization is disabled
				if (prefs.ai_personalization === false) {
					return null;
				}

				if (prefs.timeWeights || prefs.courtWeights || prefs.dayWeights) {
					weights = {
						timeWeights: normalizeWeights(prefs.timeWeights || {}),
						courtWeights: normalizeWeights(prefs.courtWeights || {}),
						dayWeights: normalizeWeights(prefs.dayWeights || {})
					};
				}
			} catch {
				// Invalid JSON, continue without weights
			}

			// Load recent booking history (last 30 days, max 50 bookings)
			const historyResult = await this.context.db
				.prepare(
					`
					SELECT
						r.court_id,
						c.name as court_name,
						r.start_time
					FROM reservations r
					JOIN courts c ON c.id = r.court_id
					WHERE r.member_id = ?
						AND r.status IN ('confirmed', 'completed')
						AND r.start_time >= datetime('now', '-30 days')
					ORDER BY r.start_time DESC
					LIMIT 50
				`
				)
				.bind(memberResult.id)
				.all<{ court_id: string; court_name: string; start_time: string }>();

			const history: BookingHistory[] = (historyResult.results || []).map((r) => {
				const startDate = new Date(r.start_time);
				return {
					courtId: r.court_id,
					courtName: r.court_name,
					startTime: r.start_time,
					dayOfWeek: startDate.getDay(),
					hour: startDate.getHours()
				};
			});

			return { weights, history };
		} catch (error) {
			console.error('[SuggestionAgent] Error loading member data:', error);
			return null;
		}
	}
}

/**
 * Helper function to get suggestions for a member
 */
export async function getSuggestions(
	context: AgentContext,
	request: SuggestionRequest
): Promise<AgentResult<SuggestionResponse>> {
	const agent = new SuggestionAgent(context);
	return agent.compute(request);
}

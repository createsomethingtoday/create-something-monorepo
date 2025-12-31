/**
 * Base Agent Pattern
 *
 * Foundation for all CLEARWAY agents.
 * Philosophy: Agents are invisible infrastructure (Zuhandenheit).
 *
 * Key principles:
 * 1. Heuristic-first: Only use AI when heuristics fail
 * 2. Speed matters: < 50ms target for user-facing agents
 * 3. No announcements: Never say "AI is helping you"
 * 4. Graceful degradation: Return reasonable defaults on failure
 */

export interface AgentContext {
	db: D1Database;
	kv?: KVNamespace;
	ai?: Ai; // Cloudflare Workers AI (optional fallback)
}

export interface AgentResult<T> {
	success: boolean;
	data?: T;
	error?: string;
	computeTimeMs: number;
	usedAI: boolean; // Track if AI fallback was used
}

/**
 * Base class for all CLEARWAY agents
 *
 * Agents should:
 * - Override computeHeuristic() for fast pattern matching
 * - Override computeAI() for complex fallback (optional)
 * - Call compute() which handles timing and fallback logic
 */
export abstract class BaseAgent<TInput, TOutput> {
	protected name: string;
	protected context: AgentContext;

	constructor(name: string, context: AgentContext) {
		this.name = name;
		this.context = context;
	}

	/**
	 * Main computation entry point
	 * Tries heuristic first, falls back to AI if needed
	 */
	async compute(input: TInput): Promise<AgentResult<TOutput>> {
		const startTime = performance.now();
		let usedAI = false;

		try {
			// Always try heuristic first (fast path)
			const heuristicResult = await this.computeHeuristic(input);

			if (heuristicResult.confident) {
				return {
					success: true,
					data: heuristicResult.data,
					computeTimeMs: performance.now() - startTime,
					usedAI: false
				};
			}

			// If heuristic is not confident and AI is available, try AI
			if (this.context.ai && this.supportsAI()) {
				usedAI = true;
				const aiResult = await this.computeAI(input);

				if (aiResult) {
					return {
						success: true,
						data: aiResult,
						computeTimeMs: performance.now() - startTime,
						usedAI: true
					};
				}
			}

			// Return heuristic result even if not confident (graceful degradation)
			return {
				success: true,
				data: heuristicResult.data,
				computeTimeMs: performance.now() - startTime,
				usedAI: false
			};
		} catch (error) {
			console.error(`[${this.name}] Error:`, error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				computeTimeMs: performance.now() - startTime,
				usedAI
			};
		}
	}

	/**
	 * Fast heuristic computation
	 * Target: < 50ms
	 * Must return a result even if not confident
	 */
	protected abstract computeHeuristic(
		input: TInput
	): Promise<{ data: TOutput; confident: boolean }>;

	/**
	 * AI fallback computation
	 * Only called if heuristic is not confident and AI is available
	 * Override in subclasses that support AI
	 */
	protected async computeAI(_input: TInput): Promise<TOutput | null> {
		return null; // Default: no AI support
	}

	/**
	 * Whether this agent supports AI fallback
	 */
	protected supportsAI(): boolean {
		return false;
	}
}

/**
 * Utility: Apply exponential decay to preference weights
 * Recent bookings have more influence than old ones
 */
export function applyDecay(
	weights: Record<string, number>,
	decayFactor: number = 0.9
): Record<string, number> {
	const result: Record<string, number> = {};
	for (const [key, value] of Object.entries(weights)) {
		result[key] = value * decayFactor;
	}
	return result;
}

/**
 * Utility: Normalize weights to 0-1 range
 */
export function normalizeWeights(weights: Record<string, number>): Record<string, number> {
	const values = Object.values(weights);
	if (values.length === 0) return {};

	const max = Math.max(...values);
	if (max === 0) return weights;

	const result: Record<string, number> = {};
	for (const [key, value] of Object.entries(weights)) {
		result[key] = value / max;
	}
	return result;
}

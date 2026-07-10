import { describe, expect, it } from 'vitest';
import {
	PERFORMANCE_LAB_SEQUENCE,
	resolveMotionStages,
	selectMotionRuntime,
	validateMotionIntent,
	type MotionIntent
} from './intent.js';

describe('Performance Lab semantic motion intent', () => {
	it('describes the observable proving sequence in causal order', () => {
		expect(PERFORMANCE_LAB_SEQUENCE.stages.map((stage) => stage.id)).toEqual([
			'policy-applied',
			'metrics-moved',
			'pressure-visible',
			'validation-adjusted',
			'receipt-settled'
		]);

		expect(validateMotionIntent(PERFORMANCE_LAB_SEQUENCE)).toEqual({
			ok: true,
			issues: []
		});
	});

	it('fails closed when raw color values or a reversed causal sequence bypass the contract', () => {
		const rawColorIntent = structuredClone(PERFORMANCE_LAB_SEQUENCE) as unknown as MotionIntent;
		rawColorIntent.stages[0].colorRole = '#ffffff' as MotionIntent['stages'][number]['colorRole'];

		expect(validateMotionIntent(rawColorIntent)).toEqual({
			ok: false,
			issues: ['Motion stage policy-applied must use a semantic color role.']
		});

		const reversedIntent = structuredClone(PERFORMANCE_LAB_SEQUENCE) as unknown as MotionIntent;
		reversedIntent.stages.reverse();

		expect(validateMotionIntent(reversedIntent)).toEqual({
			ok: false,
			issues: ['Performance Lab motion stages must preserve their causal order.']
		});
	});

	it('resolves reduced motion to the same settled receipt without a decorative timeline', () => {
		const normal = resolveMotionStages(PERFORMANCE_LAB_SEQUENCE, { reducedMotion: false });
		const reduced = resolveMotionStages(PERFORMANCE_LAB_SEQUENCE, { reducedMotion: true });

		expect(normal.map((stage) => stage.id)).toEqual(
			PERFORMANCE_LAB_SEQUENCE.stages.map((stage) => stage.id)
		);
		expect(reduced).toEqual([
			{
				...PERFORMANCE_LAB_SEQUENCE.stages.at(-1),
				durationMs: 0
			}
		]);
	});

	it('routes coordinated motion to GSAP without making GSAP the contract', () => {
		expect(
			selectMotionRuntime(PERFORMANCE_LAB_SEQUENCE, { gsap: true, reducedMotion: false })
		).toBe('gsap');
		expect(
			selectMotionRuntime(PERFORMANCE_LAB_SEQUENCE, { gsap: false, reducedMotion: false })
		).toBe('native');
		expect(
			selectMotionRuntime(PERFORMANCE_LAB_SEQUENCE, { gsap: true, reducedMotion: true })
		).toBe('instant');
	});
});

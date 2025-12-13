<script lang="ts">
	import { onMount } from 'svelte';
	import ProgressIndicator from './ProgressIndicator.svelte';
	import AssessmentStep from './AssessmentStep.svelte';
	import InsightReveal from './InsightReveal.svelte';
	import {
		assessmentSteps,
		analyzeResponses,
		generateSessionId,
		type AssessmentAnswers,
		type AssessmentResult
	} from '$lib/services/assessment';

	// State
	let currentStep = $state(0);
	let sessionId = $state('');
	let isComplete = $state(false);
	let result = $state<AssessmentResult | null>(null);

	// Answers state
	let answers = $state<{
		accumulating: string[];
		removalInsight: string;
		blockers: string[];
	}>({
		accumulating: [],
		removalInsight: '',
		blockers: []
	});

	// Timing state
	let stepStartTime = $state(0);
	let timings = $state<Record<number, number>>({});
	let totalStartTime = $state(0);

	// Derived
	let currentStepConfig = $derived(assessmentSteps[currentStep]);
	let currentValue = $derived(() => {
		switch (currentStep) {
			case 0:
				return answers.accumulating;
			case 1:
				return answers.removalInsight;
			case 2:
				return answers.blockers;
			default:
				return [];
		}
	});

	onMount(() => {
		sessionId = generateSessionId();
		totalStartTime = Date.now();
		stepStartTime = Date.now();

		// Track assessment start
		trackEvent('assessment_start');
	});

	function handleChange(value: string[] | string) {
		switch (currentStep) {
			case 0:
				answers.accumulating = value as string[];
				break;
			case 1:
				answers.removalInsight = value as string;
				break;
			case 2:
				answers.blockers = value as string[];
				break;
		}
	}

	async function handleSubmit() {
		// Record timing for current step
		timings[currentStep] = Date.now() - stepStartTime;

		// Track step completion
		await trackEvent('step_complete', {
			step: currentStep,
			timeMs: timings[currentStep]
		});

		if (currentStep < assessmentSteps.length - 1) {
			// Move to next step
			currentStep++;
			stepStartTime = Date.now();
		} else {
			// Complete assessment
			await completeAssessment();
		}
	}

	function handleNavigateBack(step: number) {
		// Navigate to a previous step
		if (step < currentStep) {
			currentStep = step;
			stepStartTime = Date.now();
		}
	}

	async function completeAssessment() {
		const totalTime = Date.now() - totalStartTime;

		// Analyze responses
		result = analyzeResponses({
			accumulating: answers.accumulating,
			removalInsight: answers.removalInsight,
			blockers: answers.blockers
		});

		isComplete = true;

		// Submit to API
		try {
			await fetch('/api/assessment', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					sessionId,
					answers,
					result,
					timings: {
						q1: timings[0] || 0,
						q2: timings[1] || 0,
						q3: timings[2] || 0,
						total: totalTime
					}
				})
			});
		} catch (error) {
			console.warn('Failed to submit assessment:', error);
		}

		// Track completion
		await trackEvent('assessment_complete', {
			totalTimeMs: totalTime,
			service: result.recommendation.service
		});
	}

	async function trackEvent(action: string, data?: Record<string, unknown>) {
		try {
			await fetch('/api/analytics/track', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					event_type: action,
					property: 'agency',
					path: '/',
					metadata: { sessionId, ...data }
				})
			});
		} catch {
			// Silent fail - analytics shouldn't break UX
		}
	}
</script>

<div class="assessment-runtime">
	{#if !isComplete}
		<div class="assessment-container animate-fade-in">
			<div class="assessment-content">
				<ProgressIndicator {currentStep} totalSteps={assessmentSteps.length} onNavigate={handleNavigateBack} />

				<div class="step-wrapper">
					{#key currentStep}
						<AssessmentStep
							question={currentStepConfig.question}
							subtext={currentStepConfig.subtext}
							type={currentStepConfig.type}
							options={currentStepConfig.options || []}
							placeholder={currentStepConfig.placeholder || ''}
							maxLength={currentStepConfig.maxLength || 280}
							value={currentValue()}
							onchange={handleChange}
							onsubmit={handleSubmit}
						/>
					{/key}
				</div>
			</div>
		</div>
	{:else if result}
		<InsightReveal {result} {sessionId} />
	{/if}
</div>

<style>
	.assessment-runtime {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100%;
		padding: var(--space-lg);
	}

	.assessment-container {
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		background: var(--color-bg-elevated);
		padding: var(--space-xl);
		width: 100%;
		max-width: 900px;
	}

	.assessment-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-lg);
		width: 100%;
	}

	.step-wrapper {
		width: 100%;
	}

	.animate-fade-in {
		animation: fadeIn 0.4s ease-out forwards;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-fade-in {
			animation: none;
			opacity: 1;
		}
	}
</style>

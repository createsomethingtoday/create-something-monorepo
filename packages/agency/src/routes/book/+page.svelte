<script lang="ts">
	import { browser } from '$app/environment';
	import { SEO } from '@create-something/canon';
	import { getAnalytics } from '@create-something/canon/analytics';
	import { DatePicker, TimeSlotPicker, BookingForm, BookingConfirmation } from '@create-something/canon/domains/agency';
	import {
		AGENCY_MARKETING_COPY_EXPERIMENT,
		getAgencyMarketingExperimentMetadata
	} from '$lib/analytics/marketing-experiment';

	interface TimeSlot {
		start_at: string;
		end_at: string;
		duration_minutes: number;
	}

	interface BookingEvent {
		id: string;
		start_at: string;
		end_at: string;
		name: string;
		timezone: string;
	}

	type BookingStep = 'context' | 'date' | 'time' | 'details' | 'confirm';
	type DesiredNextStep =
		| 'qualified_mcp_hub_pilot'
		| 'workflow_mapping_session'
		| 'policy_os'
		| 'enterprise_extension'
		| 'not_sure';
	type RiskLevel = 'low' | 'medium' | 'high';

	const desiredNextStepOptions: Array<{
		value: DesiredNextStep;
		label: string;
		description: string;
	}> = [
		{
			value: 'qualified_mcp_hub_pilot',
			label: 'Qualified MCP Hub pilot',
			description: 'One narrow workflow with manageable risk and clear ownership.'
		},
		{
			value: 'workflow_mapping_session',
			label: 'Workflow Mapping Session',
			description: 'Best when the workflow, handoff risk, or trust boundary is still unclear.'
		},
		{
			value: 'policy_os',
			label: 'Policy OS',
			description: 'Best for live automation that now needs approvals, blocked states, and oversight.'
		},
		{
			value: 'enterprise_extension',
			label: 'Enterprise Extension',
			description: 'Best for regulated, cross-system, or multi-team workflows.'
		},
		{
			value: 'not_sure',
			label: 'Not sure yet',
			description: 'Need help choosing the right next step.'
		}
	];

	const riskLevelOptions: Array<{ value: RiskLevel; label: string }> = [
		{ value: 'low', label: 'Low: internal workflow and reversible actions' },
		{ value: 'medium', label: 'Medium: customer impact, revenue pressure, or approvals' },
		{ value: 'high', label: 'High: compliance, auditability, or multi-team coordination' }
	];

	const timelineOptions = [
		{ value: '', label: 'No timeline yet' },
		{ value: 'this_month', label: 'This month' },
		{ value: 'this_quarter', label: 'This quarter' },
		{ value: 'next_quarter', label: 'Next quarter' }
	];

	const bookingExperimentMetadata = getAgencyMarketingExperimentMetadata('/book') ?? {};
	const steps = [
		{ key: 'context', label: 'Context' },
		{ key: 'date', label: 'Date' },
		{ key: 'time', label: 'Time' },
		{ key: 'details', label: 'Details' },
		{ key: 'confirm', label: 'Confirm' }
	] as const;
	const progressSteps = steps.slice(0, 4);

	let step = $state<BookingStep>('context');
	let selectedDate = $state<Date | null>(null);
	let selectedSlot = $state<TimeSlot | null>(null);
	let slots = $state<TimeSlot[]>([]);
	let confirmedEvent = $state<BookingEvent | null>(null);

	let role = $state('');
	let primaryWorkflow = $state('');
	let currentStack = $state('');
	let riskLevel = $state<RiskLevel | ''>('');
	let desiredNextStep = $state<DesiredNextStep | ''>('');
	let timeline = $state('');
	let contextNotes = $state('');
	let contextError = $state<string | null>(null);

	let loadingSlots = $state(false);
	let submitting = $state(false);
	let error = $state<string | null>(null);
	let availableDates = $state<Set<string>>(new Set());

	const timezone = browser ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'America/Los_Angeles';
	const currentStepIndex = $derived(progressSteps.findIndex((s) => s.key === step));

	function getRecommendedNextStep(): DesiredNextStep {
		if (desiredNextStep && desiredNextStep !== 'not_sure') return desiredNextStep;
		if (riskLevel === 'low') return 'qualified_mcp_hub_pilot';
		if (riskLevel === 'medium') return 'workflow_mapping_session';
		return 'policy_os';
	}

	const recommendedNextStep = $derived(getRecommendedNextStep());

	const recommendation = $derived.by(() => {
		const copy: Record<DesiredNextStep, { title: string; detail: string }> = {
			qualified_mcp_hub_pilot: {
				title: 'Qualified MCP Hub pilot',
				detail:
					'This looks like a candidate for a constrained pilot if the workflow is narrow, the trust boundary is manageable, and the team can operate the first wedge responsibly.'
			},
			workflow_mapping_session: {
				title: 'Workflow Mapping Session',
				detail:
					'This looks like it needs a mapped workflow, explicit handoffs, and a defined trust boundary before implementation or pilot approval.'
			},
			policy_os: {
				title: 'Policy OS review',
				detail:
					'This looks like governed execution work: approvals, blocked states, release checks, incident loops, and ongoing operational control.'
			},
			enterprise_extension: {
				title: 'Enterprise Extension review',
				detail:
					'This looks like high-stakes work with cross-system coordination, compliance pressure, or multi-team recovery requirements.'
			},
			not_sure: {
				title: 'Workflow review',
				detail: 'I’ll use this intake to route the workflow into the right next step.'
			}
		};

		return copy[recommendedNextStep];
	});

	async function fetchSlotsForMonth(date: Date) {
		loadingSlots = true;
		error = null;

		const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
		const endDate = new Date(date.getFullYear(), date.getMonth() + 2, 0);

		try {
			const params = new URLSearchParams({
				start_date: startDate.toISOString().split('T')[0],
				end_date: endDate.toISOString().split('T')[0],
				timezone
			});

			const response = await fetch(`/api/booking/slots?${params}`);
			if (!response.ok) throw new Error('Failed to fetch available times');

			const data = (await response.json()) as { slots: TimeSlot[] };
			slots = data.slots;

			const dates = new Set<string>();
			for (const slot of data.slots) {
				dates.add(slot.start_at.split('T')[0]);
			}
			availableDates = dates;
		} catch (err) {
			console.error('Error fetching slots:', err);
			error = 'Unable to load available times. Please try again.';
		} finally {
			loadingSlots = false;
		}
	}

	const slotsForSelectedDate = $derived.by(() => {
		if (!selectedDate) return [];
		const dateKey = selectedDate.toISOString().split('T')[0];
		return slots.filter((slot) => slot.start_at.startsWith(dateKey));
	});

	function validateContext(): boolean {
		if (!primaryWorkflow.trim() || !currentStack.trim() || !riskLevel || !desiredNextStep) {
			contextError = 'Please describe the workflow, current stack, risk level, and desired next step.';
			return false;
		}

		contextError = null;
		return true;
	}

	function handleContextContinue(event: Event) {
		event.preventDefault();
		if (!validateContext()) return;
		step = 'date';
	}

	function handleDateSelect(date: Date) {
		selectedDate = date;
		selectedSlot = null;
		step = 'time';
	}

	function handleSlotSelect(slot: TimeSlot) {
		selectedSlot = slot;
		step = 'details';
	}

	function mergeBookingNotes(notes: string): string {
		const lines = [
			`Role: ${role || 'Not provided'}`,
			`Primary workflow: ${primaryWorkflow.trim()}`,
			`Current stack: ${currentStack.trim()}`,
			`Risk level: ${riskLevel || 'Not provided'}`,
			`Requested next step: ${desiredNextStep || 'Not provided'}`,
			`Recommended next step: ${recommendedNextStep}`,
			`Timeline: ${timeline || 'No timeline yet'}`
		];

		const trimmedContextNotes = contextNotes.trim();
		const trimmedNotes = notes.trim();

		if (trimmedContextNotes) {
			lines.push('', 'Workflow context:', trimmedContextNotes);
		}

		if (trimmedNotes) {
			lines.push('', 'Booking notes:', trimmedNotes);
		}

		return lines.join('\n');
	}

	async function handleFormSubmit(data: {
		name: string;
		email: string;
		company: string;
		notes: string;
	}) {
		if (!selectedSlot) return;

		submitting = true;
		error = null;

		try {
			getAnalytics()?.conversion('booking_initiated', {
				...bookingExperimentMetadata,
				desiredNextStep,
				recommendedNextStep,
				riskLevel
			});

			fetch('/api/analytics/track', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					event_type: 'booking_initiated',
					property: 'agency',
					path: '/book',
					experiment_id: AGENCY_MARKETING_COPY_EXPERIMENT.id,
					tag_id: AGENCY_MARKETING_COPY_EXPERIMENT.variant,
					metadata: {
						desired_next_step: desiredNextStep,
						recommended_next_step: recommendedNextStep,
						risk_level: riskLevel
					}
				})
			}).catch(() => {});

			const response = await fetch('/api/booking/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					start_at: selectedSlot.start_at,
					end_at: selectedSlot.end_at,
					name: data.name,
					email: data.email,
					timezone,
					company: data.company || undefined,
					role: role || undefined,
					primary_workflow: primaryWorkflow.trim(),
					current_stack: currentStack.trim(),
					risk_level: riskLevel || undefined,
					desired_next_step: desiredNextStep || undefined,
					recommended_next_step: recommendedNextStep,
					timeline: timeline || undefined,
					notes: mergeBookingNotes(data.notes),
					experiment_id: AGENCY_MARKETING_COPY_EXPERIMENT.id,
					tag_id: AGENCY_MARKETING_COPY_EXPERIMENT.variant
				})
			});

			if (!response.ok) {
				const errorData = (await response.json().catch(() => ({}))) as { message?: string };
				throw new Error(errorData.message || 'Failed to create booking');
			}

			const result = (await response.json()) as { event: BookingEvent };
			confirmedEvent = result.event;
			getAnalytics()?.conversion('booking_completed', {
				...bookingExperimentMetadata,
				desiredNextStep,
				recommendedNextStep,
				riskLevel
			});
			step = 'confirm';
		} catch (err) {
			console.error('Booking error:', err);
			error = err instanceof Error ? err.message : 'Failed to create booking. Please try again.';
		} finally {
			submitting = false;
		}
	}

	function handleBack() {
		if (step === 'date') {
			step = 'context';
		} else if (step === 'time') {
			step = 'date';
		} else if (step === 'details') {
			step = 'time';
		}
	}

	$effect(() => {
		if (browser) {
			fetchSlotsForMonth(new Date());
		}
	});
</script>

<SEO
	title="Book a Workflow Mapping Session"
	description="Describe the workflow first so we can route you into the right next step: a constrained MCP Hub pilot, a Workflow Mapping Session, Policy OS, or enterprise extension."
	propertyName="agency"
/>

<main class="booking-page">
	<header class="booking-header">
		<h1 class="booking-title">Book a Workflow Mapping Session</h1>
		<p class="booking-subtitle">
			Bring the workflow with the most drag, risk, or manual handoff. Qualified workflows may
			start with a constrained MCP Hub pilot. Higher-risk work should start with clearer trust
			boundaries.
		</p>
	</header>

	{#if step !== 'confirm'}
		<nav class="progress" aria-label="Booking progress">
			{#each progressSteps as progressStep, index}
				<div
					class="progress-step"
					class:active={index === currentStepIndex}
					class:complete={index < currentStepIndex}
					aria-current={index === currentStepIndex ? 'step' : undefined}
				>
					<span class="step-number">{index + 1}</span>
					<span class="step-label">{progressStep.label}</span>
				</div>
				{#if index < progressSteps.length - 1}
					<div class="progress-line" class:complete={index < currentStepIndex}></div>
				{/if}
			{/each}
		</nav>
	{/if}

	<div class="booking-content">
		{#if step === 'context'}
			<section class="step-content">
				<h2 class="step-title">Tell me about the workflow first</h2>
				<p class="context-intro">
					I use this to decide whether the workflow should start as a qualified pilot, a mapping
					session, Policy OS, or an enterprise review.
				</p>
				<form class="context-form" onsubmit={handleContextContinue}>
					<div class="context-grid">
						<div class="context-field">
							<label for="role" class="context-label">Role</label>
							<input id="role" bind:value={role} class="context-input" />
						</div>
						<div class="context-field">
							<label for="timeline" class="context-label">Timeline</label>
							<select id="timeline" bind:value={timeline} class="context-input">
								{#each timelineOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="context-field">
						<label for="primary-workflow" class="context-label">Primary workflow</label>
						<textarea
							id="primary-workflow"
							bind:value={primaryWorkflow}
							class="context-input context-textarea"
							rows={3}
							placeholder="Example: Qualified leads leave HubSpot, then the team rebuilds context in Notion and Slack before onboarding."
						></textarea>
					</div>

					<div class="context-field">
						<label for="current-stack" class="context-label">Current stack</label>
						<textarea
							id="current-stack"
							bind:value={currentStack}
							class="context-input context-textarea"
							rows={2}
							placeholder="Example: HubSpot, Notion, Slack, Airtable"
						></textarea>
					</div>

					<div class="context-grid">
						<div class="context-field">
							<label for="risk-level" class="context-label">Risk level</label>
							<select id="risk-level" bind:value={riskLevel} class="context-input">
								<option value="">Select risk level</option>
								{#each riskLevelOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</div>
						<div class="context-field">
							<label for="desired-next-step" class="context-label">Desired next step</label>
							<select id="desired-next-step" bind:value={desiredNextStep} class="context-input">
								<option value="">Choose a next step</option>
								{#each desiredNextStepOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="recommendation-card">
						<span class="recommendation-eyebrow">Recommended next step</span>
						<h3>{recommendation.title}</h3>
						<p>{recommendation.detail}</p>
					</div>

					<div class="context-field">
						<label for="context-notes" class="context-label">Anything else to know?</label>
						<textarea
							id="context-notes"
							bind:value={contextNotes}
							class="context-input context-textarea"
							rows={3}
							placeholder="Add any approval rules, customer impact, or internal constraints I should keep in mind."
						></textarea>
					</div>

					{#if contextError}
						<p class="error-message">{contextError}</p>
					{/if}

					<div class="context-actions">
						<button type="submit" class="context-continue">Continue to calendar</button>
					</div>
				</form>
			</section>
		{:else if step === 'date'}
			<section class="step-content">
				<h2 class="step-title">Select a date</h2>
				<DatePicker
					{selectedDate}
					onDateSelect={handleDateSelect}
					{availableDates}
					loading={loadingSlots}
				/>
				<button type="button" class="back-link" onclick={handleBack}>← Back to context</button>
				{#if error}
					<p class="error-message">{error}</p>
				{/if}
			</section>
		{:else if step === 'time'}
			<section class="step-content">
				<h2 class="step-title">Select a time</h2>
				<TimeSlotPicker
					slots={slotsForSelectedDate}
					{selectedSlot}
					onSlotSelect={handleSlotSelect}
					loading={loadingSlots}
					{timezone}
				/>
				<button type="button" class="back-link" onclick={handleBack}>← Choose a different date</button>
			</section>
		{:else if step === 'details'}
			<section class="step-content">
				<h2 class="step-title">Your details</h2>
				<div class="booking-summary-card">
					<span class="recommendation-eyebrow">Workflow route</span>
					<h3>{recommendation.title}</h3>
					<p>{recommendation.detail}</p>
				</div>
				{#if selectedSlot}
					<BookingForm
						{selectedSlot}
						{timezone}
						onSubmit={handleFormSubmit}
						onBack={handleBack}
						loading={submitting}
						{error}
					/>
				{/if}
			</section>
		{:else if step === 'confirm' && confirmedEvent}
			<section class="step-content">
				<BookingConfirmation event={confirmedEvent} {timezone} />
			</section>
		{/if}
	</div>

	{#if step !== 'confirm'}
		<footer class="booking-footer">
			<p class="fallback-text">
				Having trouble?
				<a
					href="https://savvycal.com/createsomething/together"
					target="_blank"
					rel="noopener noreferrer"
					class="fallback-link">Book directly on SavvyCal →</a
				>
			</p>
		</footer>
	{/if}
</main>

<style>
	.booking-page {
		max-width: var(--content-width-xl);
		margin: 0 auto;
		padding: var(--space-xl) var(--space-md);
		min-height: 100vh;
	}

	.booking-header {
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.booking-title {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.booking-subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		max-width: 52rem;
		margin: 0 auto;
	}

	.progress {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-xl);
		flex-wrap: wrap;
	}

	.progress-step {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.step-number {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		background: var(--color-bg-surface);
		color: var(--color-fg-muted);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.progress-step.active .step-number {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	.progress-step.complete .step-number {
		background: var(--color-success);
		color: var(--color-bg-pure);
	}

	.step-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		display: none;
	}

	@media (min-width: 480px) {
		.step-label {
			display: inline;
		}

		.progress-step.active .step-label {
			color: var(--color-fg-primary);
		}
	}

	.progress-line {
		width: 32px;
		height: 1px;
		background: var(--color-border-default);
	}

	.progress-line.complete {
		background: var(--color-success);
	}

	.booking-content {
		margin-bottom: var(--space-xl);
	}

	.step-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.step-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.context-intro {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	.context-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.context-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-md);
	}

	.context-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.context-label {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
	}

	.context-input {
		padding: 0.85rem 1rem;
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		font-size: var(--text-body);
	}

	.context-input::placeholder {
		color: var(--color-fg-muted);
	}

	.context-textarea {
		resize: vertical;
		min-height: 96px;
	}

	.recommendation-card,
	.booking-summary-card {
		padding: var(--space-md);
		border-radius: var(--radius-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
	}

	.recommendation-eyebrow {
		display: block;
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-2xs);
	}

	.recommendation-card h3,
	.booking-summary-card h3 {
		font-size: var(--text-body-lg);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-2xs);
	}

	.recommendation-card p,
	.booking-summary-card p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	.context-actions {
		display: flex;
		justify-content: flex-start;
	}

	.context-continue {
		padding: 0.8rem 1.4rem;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-radius: var(--radius-lg);
		border: none;
		cursor: pointer;
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
	}

	.back-link {
		align-self: flex-start;
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		background: transparent;
		border: none;
		cursor: pointer;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.back-link:hover {
		color: var(--color-fg-primary);
	}

	.error-message {
		font-size: var(--text-body-sm);
		color: var(--color-error);
		padding: var(--space-sm);
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		border-radius: var(--radius-md);
	}

	.booking-footer {
		text-align: center;
		padding-top: var(--space-lg);
	}

	.fallback-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.fallback-link {
		color: var(--color-fg-tertiary);
		text-decoration: underline;
		text-underline-offset: 2px;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.fallback-link:hover {
		color: var(--color-fg-primary);
	}

	@media (max-width: 768px) {
		.context-grid {
			grid-template-columns: 1fr;
		}

		.booking-page {
			padding-inline: var(--container-padding, 1.5rem);
		}
	}
</style>

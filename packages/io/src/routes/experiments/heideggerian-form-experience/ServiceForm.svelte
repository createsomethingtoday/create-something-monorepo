<script lang="ts">
	/**
	 * ServiceForm - Cascading configuration form
	 *
	 * Philosophy: This form demonstrates Heideggerian concepts through behavior:
	 * - Zuhandenheit: Smooth field progression, form recedes into configuring
	 * - Vorhandenheit: Validation errors make the form visible as obstacle
	 * - Gelassenheit: Serves user intent without manipulation
	 *
	 * State Machine: idle → selecting → revealing → complete → submitting → success
	 */

	import CascadingField from './CascadingField.svelte';
	import PhilosophyAnnotation from './PhilosophyAnnotation.svelte';
	import type { FormState, FormPhase, ServiceType, Scope, PricingTier, PhilosophyEvent } from './types';
	import { initialFormState } from './types';
	import { serviceConfig, pricingTiers, getScopesForServiceType, getFeaturesForScope, validateFeatureCount } from './config';

	interface Props {
		onPhilosophyEvent?: (event: PhilosophyEvent) => void;
		onSubmitSuccess?: () => void;
	}

	let { onPhilosophyEvent, onSubmitSuccess }: Props = $props();

	// Session ID for tracking
	const sessionId = crypto.randomUUID();

	// Form state
	let state = $state<FormState>({ ...initialFormState });

	// Philosophy annotation visibility
	let showZuhandenheit = $state(false);
	let showVorhandenheit = $state(false);

	// Derived state
	let scopes = $derived(state.serviceType ? getScopesForServiceType(state.serviceType) : {});
	let features = $derived(state.serviceType && state.scope ? getFeaturesForScope(state.serviceType, state.scope) : []);
	let canSubmit = $derived(
		state.phase === 'complete' &&
		state.serviceType !== null &&
		state.scope !== null &&
		state.pricingTier !== null
	);

	// =========================================================================
	// EVENT HANDLERS
	// =========================================================================

	function handleServiceTypeChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		const value = select.value as ServiceType;

		if (!state.startTime) {
			state.startTime = Date.now();
		}

		state.serviceType = value;
		state.scope = null;
		state.features = [];
		state.pricingTier = null;
		state.errors = {};

		// Reveal scope field
		setTimeout(() => {
			state.visibleFields = 2;
			triggerPhilosophyEvent({ type: 'zuhandenheit_flow', field: 'serviceType' });
		}, 100);
	}

	function handleScopeChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		const value = select.value as Scope;

		state.scope = value;
		state.features = [];
		state.pricingTier = null;

		// Reveal features field
		setTimeout(() => {
			state.visibleFields = 3;
			triggerPhilosophyEvent({ type: 'zuhandenheit_flow', field: 'scope' });
		}, 100);
	}

	function handleFeatureToggle(featureId: string) {
		const isSelected = state.features.includes(featureId);

		if (isSelected) {
			state.features = state.features.filter((f) => f !== featureId);
		} else {
			// Check tier limit before adding
			const newCount = state.features.length + 1;
			if (state.pricingTier && !validateFeatureCount(state.pricingTier, newCount)) {
				const limit = pricingTiers[state.pricingTier].featureLimit;
				state.errors.features = `${pricingTiers[state.pricingTier].label} tier allows max ${limit} features`;
				state.validationFailures++;
				triggerPhilosophyEvent({ type: 'vorhandenheit_break', field: 'features', error: state.errors.features });
				showVorhandenheit = true;
				return;
			}
			state.features = [...state.features, featureId];
			state.errors.features = '';
		}

		// Reveal pricing tier if features selected
		if (state.features.length > 0 && state.visibleFields < 4) {
			setTimeout(() => {
				state.visibleFields = 4;
				triggerPhilosophyEvent({ type: 'zuhandenheit_flow', field: 'features' });
			}, 100);
		}
	}

	function handlePricingTierChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		const value = select.value as PricingTier;

		// Validate feature count against new tier
		if (!validateFeatureCount(value, state.features.length)) {
			const limit = pricingTiers[value].featureLimit;
			state.errors.pricingTier = `${pricingTiers[value].label} tier allows max ${limit} features. You have ${state.features.length} selected.`;
			state.validationFailures++;
			triggerPhilosophyEvent({ type: 'vorhandenheit_break', field: 'pricingTier', error: state.errors.pricingTier });
			showVorhandenheit = true;
			return;
		}

		state.pricingTier = value;
		state.errors.pricingTier = '';
		state.phase = 'complete';

		// Show zuhandenheit annotation briefly
		showZuhandenheit = true;
		setTimeout(() => {
			showZuhandenheit = false;
		}, 5000);
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();

		if (!canSubmit) return;

		state.phase = 'submitting';
		const formCompletionMs = state.startTime ? Date.now() - state.startTime : 0;

		try {
			const res = await fetch('/api/experiments/heideggerian-form', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					sessionId,
					serviceType: state.serviceType,
					scope: state.scope,
					features: state.features,
					pricingTier: state.pricingTier,
					formCompletionMs,
					validationFailures: state.validationFailures
				})
			});

			if (res.ok) {
				state.phase = 'success';
				triggerPhilosophyEvent({ type: 'gelassenheit_completion', durationMs: formCompletionMs });
				onSubmitSuccess?.();

				// Reset after success
				setTimeout(() => {
					state = { ...initialFormState };
				}, 2000);
			} else {
				const data = await res.json();
				state.phase = 'error';
				state.errorMessage = data.error || 'Submission failed';
			}
		} catch (e) {
			state.phase = 'error';
			state.errorMessage = 'Network error. Please try again.';
		}
	}

	function triggerPhilosophyEvent(event: PhilosophyEvent) {
		onPhilosophyEvent?.(event);
	}

	function dismissAnnotation(type: 'zuhandenheit' | 'vorhandenheit') {
		if (type === 'zuhandenheit') showZuhandenheit = false;
		if (type === 'vorhandenheit') showVorhandenheit = false;
	}
</script>

<div class="service-form-container">
	{#if state.phase === 'success'}
		<div class="success-state">
			<div class="success-icon">
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
					<path d="M22 4L12 14.01l-3-3" />
				</svg>
			</div>
			<h3>Configuration Saved</h3>
			<p>The form served your intent.</p>
		</div>
	{:else}
		<form class="service-form" onsubmit={handleSubmit}>
			<!-- Service Type (always visible) -->
			<CascadingField label="Service Type" description="What kind of engagement?">
				<select
					class="form-select"
					value={state.serviceType || ''}
					onchange={handleServiceTypeChange}
					required
				>
					<option value="" disabled>Select a service type...</option>
					{#each Object.entries(serviceConfig) as [key, config]}
						<option value={key}>{config.label}</option>
					{/each}
				</select>
			</CascadingField>

			<!-- Scope (reveals after service type) -->
			<CascadingField
				label="Scope"
				description="What area of focus?"
				visible={state.visibleFields >= 2}
				error={state.errors.scope}
			>
				<select
					class="form-select"
					value={state.scope || ''}
					onchange={handleScopeChange}
					disabled={!state.serviceType}
				>
					<option value="" disabled>Select a scope...</option>
					{#each Object.entries(scopes) as [key, scope]}
						<option value={key}>{scope.label}</option>
					{/each}
				</select>
			</CascadingField>

			<!-- Features (reveals after scope) -->
			<CascadingField
				label="Features"
				description="What capabilities do you need?"
				visible={state.visibleFields >= 3}
				error={state.errors.features}
			>
				<div class="features-grid">
					{#each features as feature}
						<label class="feature-checkbox">
							<input
								type="checkbox"
								checked={state.features.includes(feature.id)}
								onchange={() => handleFeatureToggle(feature.id)}
							/>
							<span class="feature-label">{feature.label}</span>
							<span class="feature-description">{feature.description}</span>
						</label>
					{/each}
				</div>
			</CascadingField>

			<!-- Pricing Tier (reveals after features) -->
			<CascadingField
				label="Pricing Tier"
				description="What scale of engagement?"
				visible={state.visibleFields >= 4}
				error={state.errors.pricingTier}
			>
				<select
					class="form-select"
					value={state.pricingTier || ''}
					onchange={handlePricingTierChange}
					disabled={state.features.length === 0}
				>
					<option value="" disabled>Select a tier...</option>
					{#each Object.entries(pricingTiers) as [key, tier]}
						<option value={key}>
							{tier.label} {tier.featureLimit ? `(up to ${tier.featureLimit} features)` : '(unlimited)'}
						</option>
					{/each}
				</select>
			</CascadingField>

			<!-- Error message -->
			{#if state.phase === 'error' && state.errorMessage}
				<p class="error-message">{state.errorMessage}</p>
			{/if}

			<!-- Submit button -->
			{#if state.phase === 'complete' || state.phase === 'error'}
				<button
					type="submit"
					class="submit-button"
					disabled={!canSubmit || state.phase === 'submitting'}
				>
					{state.phase === 'submitting' ? 'Configuring...' : 'Configure Service'}
				</button>
			{/if}

			<!-- Progress indicator -->
			<div class="progress-indicator" aria-hidden="true">
				{#each [1, 2, 3, 4] as step}
					<span class="progress-step" class:active={state.visibleFields >= step} class:complete={
						(step === 1 && state.serviceType) ||
						(step === 2 && state.scope) ||
						(step === 3 && state.features.length > 0) ||
						(step === 4 && state.pricingTier)
					}></span>
				{/each}
			</div>
		</form>

		<!-- Philosophy annotations -->
		<PhilosophyAnnotation
			concept="zuhandenheit"
			visible={showZuhandenheit}
			onDismiss={() => dismissAnnotation('zuhandenheit')}
		/>
		<PhilosophyAnnotation
			concept="vorhandenheit"
			visible={showVorhandenheit}
			onDismiss={() => dismissAnnotation('vorhandenheit')}
		/>
	{/if}
</div>

<style>
	.service-form-container {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
	}

	.service-form {
		display: flex;
		flex-direction: column;
	}

	.form-select {
		width: 100%;
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-sm);
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		cursor: pointer;
		transition:
			border-color var(--duration-micro) var(--ease-standard),
			box-shadow var(--duration-micro) var(--ease-standard);
	}

	.form-select:focus {
		outline: none;
		border-color: var(--color-border-strong);
		box-shadow: 0 0 0 3px var(--color-focus);
	}

	.form-select:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.features-grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.feature-checkbox {
		display: grid;
		grid-template-columns: auto 1fr;
		grid-template-rows: auto auto;
		gap: 0 var(--space-xs);
		align-items: start;
		padding: var(--space-sm);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.feature-checkbox:hover {
		border-color: var(--color-border-emphasis);
	}

	.feature-checkbox input {
		grid-row: span 2;
		margin-top: 2px;
		accent-color: var(--color-fg-primary);
	}

	.feature-label {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-primary);
	}

	.feature-description {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.submit-button {
		margin-top: var(--space-md);
		width: 100%;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		padding: var(--space-sm) var(--space-md);
		border: none;
		border-radius: var(--radius-md);
		font-size: var(--text-body);
		font-weight: 600;
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.submit-button:hover:not(:disabled) {
		opacity: 0.9;
	}

	.submit-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.error-message {
		color: var(--color-error);
		font-size: var(--text-body-sm);
		margin-top: var(--space-sm);
		text-align: center;
	}

	.progress-indicator {
		display: flex;
		justify-content: center;
		gap: var(--space-xs);
		margin-top: var(--space-lg);
	}

	.progress-step {
		width: 8px;
		height: 8px;
		border-radius: var(--radius-full);
		background: var(--color-fg-subtle);
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.progress-step.active {
		background: var(--color-fg-muted);
	}

	.progress-step.complete {
		background: var(--color-success);
	}

	.success-state {
		text-align: center;
		padding: var(--space-xl);
	}

	.success-icon {
		color: var(--color-success);
		margin-bottom: var(--space-md);
	}

	.success-state h3 {
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.success-state p {
		color: var(--color-fg-secondary);
	}

	@media (prefers-reduced-motion: reduce) {
		.form-select,
		.feature-checkbox,
		.submit-button,
		.progress-step {
			transition: none;
		}
	}
</style>

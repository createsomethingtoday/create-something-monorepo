<script lang="ts">
	/**
	 * Configuration Wizard
	 *
	 * Multi-step wizard for Vertical Templates self-provisioning.
	 * Flow: Template → Subdomain → Business → Content → Review → Checkout
	 *
	 * Canon: The infrastructure recedes; the user configures naturally.
	 */

	import { goto } from '$app/navigation';
	import { SEO } from '@create-something/components';
	import {
		wizardState,
		currentStep,
		canProceed,
		TEMPLATES,
		PRICING
	} from '$lib/stores/wizardState';
	import TemplateSelector from '$lib/components/wizard/TemplateSelector.svelte';
	import SubdomainPicker from '$lib/components/wizard/SubdomainPicker.svelte';
	import BusinessInfo from '$lib/components/wizard/BusinessInfo.svelte';
	import ContentSetup from '$lib/components/wizard/ContentSetup.svelte';
	import ReviewConfirm from '$lib/components/wizard/ReviewConfirm.svelte';

	// Step labels for progress indicator
	const steps = [
		{ num: 1, label: 'Template' },
		{ num: 2, label: 'Subdomain' },
		{ num: 3, label: 'Business' },
		{ num: 4, label: 'Content' },
		{ num: 5, label: 'Review' }
	];

	async function handleCheckout() {
		const state = wizardState.getState();

		// Proceed to checkout with reservation
		const response = await fetch('/api/stripe/checkout', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				productId: 'vertical-templates',
				tier: state.tier,
				subdomain: state.subdomain,
				templateId: state.templateId,
				config: state.config
			})
		});

		const data = await response.json();

		if (data.url) {
			window.location.href = data.url;
		} else {
			console.error('Checkout error:', data.error);
		}
	}
</script>

<SEO
	title="Configure Your Site"
	description="Configure your vertical template website. Choose your template, subdomain, and customize content."
	keywords="website configuration, vertical templates, website builder"
	ogImage="/og-image.svg"
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Products', url: '/products' },
		{ name: 'Vertical Templates', url: '/products/vertical-templates' },
		{ name: 'Configure', url: '/products/vertical-templates/configure' }
	]}
/>

<div class="wizard-page">
	<!-- Progress Steps -->
	<div class="progress-bar">
		<div class="progress-container">
			{#each steps as step}
				<button
					class="progress-step"
					class:active={$currentStep === step.num}
					class:completed={$currentStep > step.num}
					disabled={$currentStep < step.num}
					onclick={() => $currentStep > step.num && wizardState.goToStep(step.num as 1 | 2 | 3 | 4 | 5)}
				>
					<span class="step-number">{step.num}</span>
					<span class="step-label">{step.label}</span>
				</button>
			{/each}
			<div class="progress-line" style="--progress: {($currentStep - 1) * 25}%"></div>
		</div>
	</div>

	<!-- Wizard Content -->
	<div class="wizard-content">
		{#if $currentStep === 1}
			<TemplateSelector />
		{:else if $currentStep === 2}
			<SubdomainPicker />
		{:else if $currentStep === 3}
			<BusinessInfo />
		{:else if $currentStep === 4}
			<ContentSetup />
		{:else if $currentStep === 5}
			<ReviewConfirm />
		{/if}
	</div>

	<!-- Navigation -->
	<div class="wizard-nav">
		<button
			class="nav-btn secondary"
			onclick={() => $currentStep === 1 ? goto('/products') : wizardState.prevStep()}
		>
			{$currentStep === 1 ? 'Cancel' : 'Back'}
		</button>

		{#if $currentStep < 5}
			<button
				class="nav-btn primary"
				disabled={!$canProceed}
				onclick={() => wizardState.nextStep()}
			>
				Continue
			</button>
		{:else}
			<button class="nav-btn primary checkout" onclick={handleCheckout}>
				Subscribe · ${PRICING[$wizardState.tier].monthly}/mo
			</button>
		{/if}
	</div>
</div>

<style>
	.wizard-page {
		min-height: calc(100vh - 72px);
		display: flex;
		flex-direction: column;
		padding: var(--space-xl) var(--space-lg);
		max-width: var(--width-wide);
		margin: 0 auto;
	}

	/* Progress Bar */
	.progress-bar {
		margin-bottom: var(--space-xl);
	}

	.progress-container {
		display: flex;
		justify-content: space-between;
		position: relative;
	}

	.progress-step {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		z-index: 1;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.progress-step:disabled {
		cursor: default;
		opacity: 0.5;
	}

	.step-number {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-full);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.progress-step.active .step-number,
	.progress-step.completed .step-number {
		background: var(--color-fg-primary);
		border-color: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	.step-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.progress-step.active .step-label {
		color: var(--color-fg-primary);
	}

	.progress-line {
		position: absolute;
		top: 18px;
		left: 18px;
		right: 18px;
		height: 1px;
		background: var(--color-border-default);
	}

	.progress-line::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		width: var(--progress);
		background: var(--color-fg-primary);
		transition: width var(--duration-standard) var(--ease-standard);
	}

	/* Wizard Content */
	.wizard-content {
		flex: 1;
		margin-bottom: var(--space-xl);
	}

	/* Navigation */
	.wizard-nav {
		display: flex;
		justify-content: space-between;
		gap: var(--space-md);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	.nav-btn {
		padding: var(--space-sm) var(--space-lg);
		border-radius: var(--radius-md);
		font-size: var(--text-body);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.nav-btn.secondary {
		background: transparent;
		border: 1px solid var(--color-border-default);
		color: var(--color-fg-secondary);
	}

	.nav-btn.secondary:hover {
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	.nav-btn.primary {
		background: var(--color-fg-primary);
		border: 1px solid var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	.nav-btn.primary:hover:not(:disabled) {
		opacity: 0.9;
	}

	.nav-btn.primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.nav-btn.checkout {
		padding: var(--space-sm) var(--space-xl);
	}

	/* Responsive */
	@media (max-width: 640px) {
		.step-label {
			display: none;
		}
	}
</style>

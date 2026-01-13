<script lang="ts">
	/**
	 * Welcome page for new founding members
	 * Shows success message and next steps after Stripe checkout
	 */
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Check, Video, Calendar, Mail, ArrowRight } from 'lucide-svelte';

	let loading = true;
	let verificationComplete = false;
	let sessionId = '';

	onMount(() => {
		// Get session ID from URL params
		sessionId = $page.url.searchParams.get('session_id') || '';

		if (!sessionId) {
			// No session ID, redirect to home
			setTimeout(() => goto('/'), 2000);
			return;
		}

		// Simulate verification (in production, verify with backend)
		setTimeout(() => {
			loading = false;
			verificationComplete = true;
		}, 1500);
	});

	const nextSteps = [
		{
			icon: Video,
			title: 'Start Watching',
			description: 'Access all 50+ videos across 7 content categories',
			cta: 'Browse Content',
			link: '/#content'
		},
		{
			icon: Calendar,
			title: 'Schedule Your Discovery Call',
			description: "Book your included 1-on-1 session to discuss your goals",
			cta: 'Book Call',
			link: '/book-call' // Will be implemented in story-12
		},
		{
			icon: Mail,
			title: 'Check Your Email',
			description: 'Welcome email with platform access and resources',
			cta: 'Resend Email',
			link: '/api/resend-welcome'
		}
	];
</script>

<div class="welcome-page">
	{#if loading}
		<div class="loading-state">
			<div class="spinner" />
			<p>Verifying your membership...</p>
		</div>
	{:else if verificationComplete}
		<div class="welcome-content">
			<div class="success-icon">
				<Check size={48} />
			</div>

			<h1 class="welcome-title">Welcome to Outerfields!</h1>
			<p class="welcome-subtitle">
				You're now a <strong>Founding Member</strong> with lifetime access.
			</p>

			<div class="membership-details">
				<div class="detail-item">
					<span class="detail-label">Membership</span>
					<span class="detail-value">Founding Member</span>
				</div>
				<div class="detail-item">
					<span class="detail-label">Access</span>
					<span class="detail-value">Lifetime</span>
				</div>
				<div class="detail-item">
					<span class="detail-label">Price Paid</span>
					<span class="detail-value">$99</span>
				</div>
			</div>

			<div class="next-steps">
				<h2 class="steps-title">Your Next Steps</h2>

				<div class="steps-grid">
					{#each nextSteps as step, index}
						<div class="step-card" style="--index: {index}">
							<div class="step-icon">
								<svelte:component this={step.icon} size={24} />
							</div>
							<h3 class="step-title">{step.title}</h3>
							<p class="step-description">{step.description}</p>
							<a href={step.link} class="step-cta">
								{step.cta}
								<ArrowRight size={16} />
							</a>
						</div>
					{/each}
				</div>
			</div>

			<div class="footer-message">
				<p>
					Questions? Email us at <a href="mailto:support@outerfields.com"
						>support@outerfields.com</a
					>
				</p>
			</div>
		</div>
	{:else}
		<div class="error-state">
			<p>Unable to verify membership. Please contact support.</p>
			<a href="/" class="back-link">Return Home</a>
		</div>
	{/if}
</div>

<style>
	.welcome-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background: var(--color-bg-pure);
	}

	.loading-state,
	.error-state {
		text-align: center;
	}

	.spinner {
		width: 3rem;
		height: 3rem;
		border: 3px solid var(--color-border-default);
		border-top-color: var(--color-fg-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 1rem;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.loading-state p,
	.error-state p {
		color: var(--color-fg-muted);
		font-size: 1rem;
	}

	.welcome-content {
		max-width: 48rem;
		width: 100%;
		text-align: center;
	}

	.success-icon {
		width: 5rem;
		height: 5rem;
		margin: 0 auto 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-success-muted);
		border: 2px solid var(--color-success-border);
		border-radius: 50%;
		color: var(--color-success);
	}

	.welcome-title {
		font-size: clamp(2rem, 4vw, 3rem);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 1rem;
	}

	.welcome-subtitle {
		font-size: 1.25rem;
		color: var(--color-fg-muted);
		margin: 0 0 3rem;
	}

	.welcome-subtitle strong {
		color: var(--color-fg-primary);
	}

	.membership-details {
		display: flex;
		gap: 2rem;
		justify-content: center;
		padding: 2rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
		margin-bottom: 4rem;
	}

	.detail-item {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.detail-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-fg-muted);
	}

	.detail-value {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.next-steps {
		margin-bottom: 3rem;
	}

	.steps-title {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0 0 2rem;
	}

	.steps-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
	}

	.step-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
		padding: 2rem;
		text-align: left;
		transition: all var(--duration-standard) var(--ease-standard);
		transition-delay: calc(var(--cascade-step, 50ms) * var(--index, 0));
	}

	.step-card:hover {
		border-color: var(--color-border-emphasis);
		transform: translateY(-4px);
	}

	.step-icon {
		width: 3rem;
		height: 3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
		color: var(--color-fg-secondary);
		margin-bottom: 1rem;
	}

	.step-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.step-description {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		margin: 0 0 1.5rem;
		line-height: 1.5;
	}

	.step-cta {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.step-cta:hover {
		color: var(--color-brand);
		gap: 0.75rem;
	}

	.footer-message {
		padding-top: 2rem;
		border-top: 1px solid var(--color-border-default);
	}

	.footer-message p {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		margin: 0;
	}

	.footer-message a {
		color: var(--color-fg-primary);
		text-decoration: underline;
	}

	.back-link {
		display: inline-block;
		margin-top: 1rem;
		padding: 0.75rem 1.5rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		color: var(--color-fg-primary);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.back-link:hover {
		border-color: var(--color-border-emphasis);
	}

	@media (max-width: 768px) {
		.membership-details {
			flex-direction: column;
			gap: 1rem;
		}

		.steps-grid {
			grid-template-columns: 1fr;
		}
	}
</style>

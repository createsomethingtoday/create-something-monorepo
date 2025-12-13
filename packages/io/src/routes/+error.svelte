<script lang="ts">
	import { page } from '$app/stores';
	import { ArrowRight } from 'lucide-svelte';

	let email = '';
	let submitted = false;
	let error = '';

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';

		try {
			const response = await fetch('/api/newsletter', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to subscribe');
			}

			submitted = true;
			email = '';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong';
		}
	}
</script>

<svelte:head>
	<title>{$page.status} | CREATE SOMETHING.io</title>
</svelte:head>

<div class="error-page">
	<div class="error-container">
		<!-- Error Code -->
		<h1 class="error-code">{$page.status}</h1>

		<!-- Error Message -->
		<h2 class="error-message">
			{$page.error?.message || 'Not Found'}
		</h2>

		<!-- Description -->
		<p class="error-description">
			{#if $page.status === 404}
				The page you're looking for doesn't exist. Maybe it was moved, or maybe it never existed.
			{:else if $page.status === 500}
				Something went wrong on our end. We've been notified and are looking into it.
			{:else}
				An unexpected error occurred.
			{/if}
		</p>

		<!-- Action Buttons -->
		<div class="flex gap-4 justify-center mb-16">
			<a href="/" class="button-primary">
				Go Home
			</a>
			<a href="/experiments" class="button-secondary">
				View Experiments
			</a>
		</div>

		<!-- Newsletter Signup -->
		<div class="newsletter-section">
			<h3 class="newsletter-title">Stay updated with new experiments</h3>
			<p class="newsletter-description">
				Get notified when new research is published. Real metrics, tracked experiments, honest
				learnings.
			</p>

			{#if submitted}
				<div class="success-message">
					<p class="success-text">Thanks for subscribing!</p>
				</div>
			{:else}
				<form on:submit={handleSubmit} class="flex gap-3">
					<input
						type="email"
						bind:value={email}
						placeholder="Enter your email address"
						required
						class="newsletter-input"
					/>
					<button type="submit" class="button-primary whitespace-nowrap inline-flex items-center gap-2">
						Subscribe
						<ArrowRight class="w-4 h-4" />
					</button>
				</form>

				{#if error}
					<p class="error-text">{error}</p>
				{/if}
			{/if}
		</div>
	</div>
</div>

<style>
	.error-page {
		min-height: 100vh;
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 var(--space-md);
	}

	.error-container {
		max-width: 48rem;
		width: 100%;
		text-align: center;
	}

	.error-code {
		font-size: clamp(5rem, 10vw, 8rem);
		font-weight: var(--font-bold);
		margin-bottom: var(--space-sm);
		color: var(--color-fg-secondary);
	}

	.error-message {
		font-size: var(--text-h2);
		font-weight: var(--font-medium);
		margin-bottom: var(--space-md);
		color: var(--color-fg-secondary);
	}

	.error-description {
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-2xl);
		max-width: 32rem;
		margin-left: auto;
		margin-right: auto;
	}

	.button-primary {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-weight: var(--font-medium);
		border-radius: var(--radius-md);
		transition: background var(--duration-standard) var(--ease-standard);
	}

	.button-primary:hover {
		background: var(--color-fg-secondary);
	}

	.button-secondary {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-hover);
		border: 1px solid var(--color-border-emphasis);
		color: var(--color-fg-primary);
		font-weight: var(--font-medium);
		border-radius: var(--radius-md);
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.button-secondary:hover {
		background: var(--color-active);
	}

	.newsletter-section {
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
		max-width: 36rem;
		margin: 0 auto;
	}

	.newsletter-title {
		font-size: var(--text-h3);
		font-weight: var(--font-bold);
		margin-bottom: var(--space-sm);
		color: var(--color-fg-primary);
	}

	.newsletter-description {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
		margin-bottom: var(--space-md);
	}

	.success-message {
		padding: var(--space-sm);
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.3);
		border-radius: var(--radius-md);
	}

	.success-text {
		color: rgb(74, 222, 128);
		font-weight: var(--font-medium);
	}

	.newsletter-input {
		flex: 1;
		padding: var(--space-sm) var(--space-sm);
		background: var(--color-hover);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		transition: border-color var(--duration-standard) var(--ease-standard);
	}

	.newsletter-input::placeholder {
		color: var(--color-fg-muted);
	}

	.newsletter-input:focus {
		outline: none;
		border-color: var(--color-fg-muted);
	}

	.error-text {
		color: rgb(248, 113, 113);
		font-size: var(--text-body-sm);
		margin-top: var(--space-sm);
	}
</style>

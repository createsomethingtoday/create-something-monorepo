<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import Card from '$lib/components/ui/card.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { Zap, X } from 'lucide-svelte';

	const STORAGE_KEY = 'beta_banner_dismissed';
	let dismissed = $state(false);

	onMount(() => {
		if (browser) {
			dismissed = localStorage.getItem(STORAGE_KEY) === 'true';
		}
	});

	function handleDismiss() {
		if (browser) {
			localStorage.setItem(STORAGE_KEY, 'true');
		}
		dismissed = true;
	}

	function handleOptIn() {
		// TODO: Implement beta opt-in logic
		handleDismiss();
	}
</script>

{#if !dismissed}
	<Card class="beta-banner">
		<button class="dismiss-button" onclick={handleDismiss} aria-label="Dismiss banner">
			<X size={20} />
		</button>

		<div class="banner-content">
			<div class="icon-wrapper">
				<Zap size={24} />
			</div>

			<div class="text-content">
				<h3 class="title">New Beta Feature: Webflow Way Validator</h3>
				<p class="description">
					Get early access to our new Designer App that validates templates against Webflow Way
					best practices before submission. Catch issues early and improve approval rates.
				</p>
			</div>

			<div class="actions">
				<Button variant="webflow" onclick={handleOptIn}>Opt In to Beta</Button>
				<Button variant="ghost" onclick={handleDismiss}>No Thanks</Button>
			</div>
		</div>
	</Card>
{/if}

<style>
	:global(.beta-banner) {
		position: relative;
		background: color-mix(in srgb, var(--webflow-blue) 8%, var(--color-bg-surface));
		border: 1px solid color-mix(in srgb, var(--webflow-blue) 20%, transparent);
	}

	.dismiss-button {
		position: absolute;
		top: var(--space-sm);
		right: var(--space-sm);
		background: transparent;
		border: none;
		color: var(--color-fg-tertiary);
		cursor: pointer;
		padding: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-md);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.dismiss-button:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	.banner-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		padding: var(--space-md);
	}

	.icon-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		background: var(--webflow-blue);
		border-radius: var(--radius-lg);
		color: #ffffff;
		flex-shrink: 0;
	}

	.text-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.title {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
	}

	.description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.5;
		margin: 0;
	}

	.actions {
		display: flex;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	@media (min-width: 768px) {
		.banner-content {
			flex-direction: row;
			align-items: center;
			padding: var(--space-lg);
		}

		.text-content {
			flex: 1;
		}

		.actions {
			flex-shrink: 0;
		}
	}
</style>

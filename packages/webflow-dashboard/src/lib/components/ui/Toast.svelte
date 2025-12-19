<script lang="ts">
	import { toast } from '$lib/stores/toast';
	import { fly } from 'svelte/transition';
	import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-svelte';

	const icons = {
		success: CheckCircle,
		error: XCircle,
		warning: AlertTriangle,
		info: Info
	};
</script>

<div class="toast-container" aria-live="polite">
	{#each $toast as t (t.id)}
		<div
			class="toast toast-{t.type}"
			role="alert"
			transition:fly={{ y: 20, duration: 200 }}
		>
			<svelte:component this={icons[t.type]} size={18} />
			<span class="message">{t.message}</span>
			<button
				class="close"
				aria-label="Dismiss"
				onclick={() => toast.remove(t.id)}
			>
				<X size={16} />
			</button>
		</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		bottom: 1.5rem;
		right: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		z-index: 9999;
		max-width: 24rem;
	}

	.toast {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1rem;
		font-family: var(--webflow-font-regular);
		font-size: 0.875rem;
		color: var(--webflow-fg-primary);
		background: var(--webflow-bg-surface);
		border-radius: var(--webflow-radius-lg);
		border: 1px solid var(--webflow-border);
		box-shadow: var(--webflow-shadow-lg);
	}

	.toast-success {
		border-left: 3px solid var(--webflow-success);
	}

	.toast-error {
		border-left: 3px solid var(--webflow-error);
	}

	.toast-warning {
		border-left: 3px solid var(--webflow-warning);
	}

	.toast-info {
		border-left: 3px solid var(--webflow-blue);
	}

	.toast-success :global(svg:first-child) {
		color: var(--webflow-success);
	}

	.toast-error :global(svg:first-child) {
		color: var(--webflow-error);
	}

	.toast-warning :global(svg:first-child) {
		color: var(--webflow-warning);
	}

	.toast-info :global(svg:first-child) {
		color: var(--webflow-blue);
	}

	.message {
		flex: 1;
	}

	.close {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.25rem;
		color: var(--webflow-fg-muted);
		background: none;
		border: none;
		border-radius: var(--webflow-radius-sm);
		cursor: pointer;
		transition: all var(--webflow-duration) var(--webflow-ease);
	}

	.close:hover {
		color: var(--webflow-fg-primary);
		background: var(--webflow-bg-hover);
	}
</style>

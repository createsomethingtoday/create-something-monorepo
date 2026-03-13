<script lang="ts">
	import { ChevronLeft } from 'lucide-svelte';

	interface Props {
		href?: string;
		label?: string;
	}

	let { href = '/dashboard', label = 'Back to Dashboard' }: Props = $props();
</script>

<a class="back-navigation" {href}>
	<ChevronLeft size={16} />
	{label}
</a>

<style>
	.back-navigation {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		margin-bottom: var(--space-sm);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.back-navigation:hover {
		color: var(--color-fg-primary);
	}

	.back-navigation:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
		border-radius: var(--radius-sm);
	}
</style>

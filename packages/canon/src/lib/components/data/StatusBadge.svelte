<script lang="ts" module>
	/**
	 * StatusBadge — semantic state indicator for database-layer surfaces.
	 *
	 * Color is semantic, never decorative: every tone maps to a Canon
	 * semantic token family (success / error / warning / info) or the
	 * neutral grayscale. Lifecycle and priority mappings are documented in
	 * docs/CANON_DATABASE_LAYER_DESIGN.md §4.
	 */
	export type StatusBadgeTone = 'success' | 'error' | 'warning' | 'info' | 'neutral';
	export type StatusBadgeVariant = 'pill' | 'dot';
</script>

<script lang="ts">
	interface Props {
		/** Visible label, e.g. "needs decision", "P0", "queued" */
		label: string;
		/** Semantic tone — maps to Canon semantic color tokens */
		tone?: StatusBadgeTone;
		/** pill = bordered muted-fill capsule; dot = colored dot + plain label (dense tables) */
		variant?: StatusBadgeVariant;
		/** Stronger border/weight for judgment-gate states (e.g. needs_decision) */
		emphasis?: boolean;
		class?: string;
	}

	let {
		label,
		tone = 'neutral',
		variant = 'pill',
		emphasis = false,
		class: className = ''
	}: Props = $props();
</script>

<span
	class={`status-badge badge-${tone} badge-${variant} ${emphasis ? 'badge-emphasis' : ''} ${className}`}
>
	{#if variant === 'dot'}
		<span class="dot" aria-hidden="true"></span>
	{/if}
	{label}
</span>

<style>
	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		width: fit-content;
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		letter-spacing: 0.04em;
		text-transform: uppercase;
		white-space: nowrap;
		transition:
			color var(--duration-micro) var(--ease-standard),
			background var(--duration-micro) var(--ease-standard),
			border-color var(--duration-micro) var(--ease-standard);
	}

	/* Tone mapping — semantic Canon tokens only */
	.badge-success {
		--badge-fg: var(--color-success);
		--badge-bg: var(--color-success-muted);
		--badge-border: var(--color-success-border);
	}

	.badge-error {
		--badge-fg: var(--color-error);
		--badge-bg: var(--color-error-muted);
		--badge-border: var(--color-error-border);
	}

	.badge-warning {
		--badge-fg: var(--color-warning);
		--badge-bg: var(--color-warning-muted);
		--badge-border: var(--color-warning-border);
	}

	.badge-info {
		--badge-fg: var(--color-info);
		--badge-bg: var(--color-info-muted);
		--badge-border: var(--color-info-border);
	}

	.badge-neutral {
		--badge-fg: var(--color-fg-muted);
		--badge-bg: var(--color-bg-surface);
		--badge-border: var(--color-border-default);
	}

	/* Pill variant: bordered muted-fill capsule */
	.badge-pill {
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-full);
		color: var(--badge-fg);
		background: var(--badge-bg);
		border: 1px solid var(--badge-border);
	}

	/* Dot variant: colored dot + plain label, for dense tables */
	.badge-dot {
		color: var(--color-fg-secondary);
	}

	.dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: var(--radius-full);
		background: var(--badge-fg);
		flex-shrink: 0;
	}

	/* Judgment-gate emphasis (e.g. needs_decision) */
	.badge-emphasis {
		font-weight: var(--font-semibold);
	}

	.badge-pill.badge-emphasis {
		border-color: var(--color-border-strong);
	}
</style>

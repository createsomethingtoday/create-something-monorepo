<script lang="ts">
	/**
	 * CascadingField - A field that reveals based on previous selections
	 *
	 * Philosophy: The field recedes into transparent use (Zuhandenheit)
	 * until validation fails, making it visible (Vorhandenheit).
	 */

	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		description?: string;
		visible?: boolean;
		error?: string | null;
		children: Snippet;
	}

	let { label, description, visible = true, error = null, children }: Props = $props();
</script>

{#if visible}
	<div class="cascading-field animate-reveal" class:has-error={!!error}>
		<label class="field-label">
			{label}
			{#if description}
				<span class="field-description">{description}</span>
			{/if}
		</label>

		<div class="field-content">
			{@render children()}
		</div>

		{#if error}
			<p class="field-error" role="alert">{error}</p>
		{/if}
	</div>
{/if}

<style>
	.cascading-field {
		margin-bottom: var(--space-md);
	}

	.animate-reveal {
		animation: revealField var(--duration-standard) var(--ease-standard) forwards;
	}

	@keyframes revealField {
		from {
			opacity: 0;
			transform: translateY(-12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.field-label {
		display: block;
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xs);
	}

	.field-description {
		display: block;
		font-weight: normal;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-top: 2px;
	}

	.field-content {
		width: 100%;
	}

	.field-error {
		font-size: var(--text-caption);
		color: var(--color-error);
		margin-top: var(--space-xs);
	}

	.has-error .field-content :global(select),
	.has-error .field-content :global(input) {
		border-color: var(--color-error);
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-reveal {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>

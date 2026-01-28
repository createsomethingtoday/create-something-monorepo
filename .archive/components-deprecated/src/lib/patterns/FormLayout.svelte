<script lang="ts">
	/**
	 * Form Layout Pattern
	 *
	 * Demonstrates standard form layout with consistent spacing,
	 * grouping, and responsive behavior.
	 *
	 * Canon Principle: Forms should guide, not interrogate.
	 * The layout creates visual rhythm that reduces cognitive load.
	 */

	import type { Snippet } from 'svelte';

	interface Props {
		/** Form title */
		title?: string;
		/** Form description */
		description?: string;
		/** Form submit handler */
		onsubmit?: (event: SubmitEvent) => void;
		/** Layout variant */
		variant?: 'stacked' | 'inline' | 'two-column';
		/** Show dividers between sections */
		dividers?: boolean;
		/** Form content */
		children: Snippet;
		/** Form actions (buttons) */
		actions?: Snippet;
	}

	let {
		title,
		description,
		onsubmit,
		variant = 'stacked',
		dividers = false,
		children,
		actions
	}: Props = $props();

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		onsubmit?.(event);
	}
</script>

<!--
	Usage:
	```svelte
	<FormLayout
		title="Contact Information"
		description="We'll use this to get in touch."
		onsubmit={handleSubmit}
	>
		<FormSection title="Personal Details">
			<TextField label="Full Name" name="name" required />
			<TextField label="Email" name="email" type="email" required />
		</FormSection>

		<FormSection title="Address">
			<TextField label="Street" name="street" />
			<div class="grid grid-cols-2 gap-4">
				<TextField label="City" name="city" />
				<TextField label="Postal Code" name="postal" />
			</div>
		</FormSection>

		{#snippet actions()}
			<Button type="submit">Save</Button>
			<Button variant="ghost">Cancel</Button>
		{/snippet}
	</FormLayout>
	```
-->

<form
	class="form-layout form-layout--{variant}"
	class:form-layout--dividers={dividers}
	onsubmit={handleSubmit}
>
	{#if title || description}
		<header class="form-header">
			{#if title}
				<h2 class="form-title">{title}</h2>
			{/if}
			{#if description}
				<p class="form-description">{description}</p>
			{/if}
		</header>
	{/if}

	<div class="form-content">
		{@render children()}
	</div>

	{#if actions}
		<footer class="form-actions">
			{@render actions()}
		</footer>
	{/if}
</form>

<style>
	.form-layout {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.form-header {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.form-title {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.form-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.form-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.form-layout--two-column .form-content {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-md);
	}

	@media (max-width: 640px) {
		.form-layout--two-column .form-content {
			grid-template-columns: 1fr;
		}
	}

	.form-layout--inline .form-content {
		flex-direction: row;
		flex-wrap: wrap;
		align-items: flex-end;
	}

	.form-layout--dividers .form-content > :global(*:not(:last-child)) {
		padding-bottom: var(--space-md);
		border-bottom: 1px solid var(--color-border-default);
	}

	.form-actions {
		display: flex;
		gap: var(--space-sm);
		justify-content: flex-end;
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border-default);
	}
</style>

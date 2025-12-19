<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		error?: boolean;
	}

	let {
		error = false,
		class: className = '',
		...restProps
	}: Props = $props();
</script>

<input
	class="input {className}"
	class:error
	{...restProps}
/>

<style>
	.input {
		display: flex;
		height: 2.5rem;
		width: 100%;
		font-family: var(--webflow-font-regular);
		font-size: 0.875rem;
		color: var(--webflow-fg-primary);
		background: var(--webflow-bg-elevated);
		border: 1px solid var(--webflow-border);
		border-radius: var(--webflow-radius-lg);
		padding: 0.5rem 0.75rem;
		transition: all var(--webflow-duration) var(--webflow-ease);
	}

	.input::placeholder {
		color: var(--webflow-fg-muted);
	}

	.input:focus {
		outline: none;
		border-color: var(--webflow-blue);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--webflow-blue) 20%, transparent);
	}

	.input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.input.error {
		border-color: var(--webflow-error);
	}

	.input.error:focus {
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--webflow-error) 20%, transparent);
	}
</style>

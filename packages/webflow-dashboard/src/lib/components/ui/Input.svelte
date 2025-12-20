<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLInputAttributes, 'value'> {
		error?: boolean;
		value?: string;
	}

	let {
		error = false,
		class: className = '',
		value = $bindable(''),
		...restProps
	}: Props = $props();
</script>

<input
	class="input {className}"
	class:input-error={error}
	bind:value
	{...restProps}
/>

<style>
	.input {
		display: flex;
		width: 100%;
		height: 2.25rem;
		padding: 0.5rem 0.75rem;
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		outline: none;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.input::placeholder {
		color: var(--color-fg-muted);
	}

	.input:focus {
		border-color: var(--color-border-emphasis);
	}

	.input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.input-error {
		border-color: var(--color-error);
	}

	.input-error:focus {
		border-color: var(--color-error);
	}
</style>

<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLTextareaAttributes, 'value'> {
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

<textarea
	class="textarea {className}"
	class:textarea-error={error}
	bind:value
	{...restProps}
></textarea>

<style>
	.textarea {
		display: flex;
		width: 100%;
		min-height: 5rem;
		padding: 0.5rem 0.75rem;
		font-size: var(--text-body-sm);
		font-family: inherit;
		color: var(--color-fg-primary);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		outline: none;
		resize: vertical;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.textarea::placeholder {
		color: var(--color-fg-muted);
	}

	.textarea:focus {
		border-color: var(--webflow-blue);
	}

	.textarea:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		resize: none;
	}

	.textarea-error {
		border-color: var(--color-error);
	}

	.textarea-error:focus {
		border-color: var(--color-error);
	}
</style>

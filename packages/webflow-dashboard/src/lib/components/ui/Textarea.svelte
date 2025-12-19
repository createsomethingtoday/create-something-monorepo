<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	interface Props extends HTMLTextareaAttributes {
		error?: boolean;
	}

	let {
		error = false,
		class: className = '',
		...restProps
	}: Props = $props();
</script>

<textarea
	class="textarea {className}"
	class:error
	{...restProps}
></textarea>

<style>
	.textarea {
		display: flex;
		min-height: 5rem;
		width: 100%;
		font-family: var(--webflow-font-regular);
		font-size: 0.875rem;
		color: var(--webflow-fg-primary);
		background: var(--webflow-bg-elevated);
		border: 1px solid var(--webflow-border);
		border-radius: var(--webflow-radius-lg);
		padding: 0.75rem;
		resize: vertical;
		transition: all var(--webflow-duration) var(--webflow-ease);
	}

	.textarea::placeholder {
		color: var(--webflow-fg-muted);
	}

	.textarea:focus {
		outline: none;
		border-color: var(--webflow-blue);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--webflow-blue) 20%, transparent);
	}

	.textarea:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.textarea.error {
		border-color: var(--webflow-error);
	}

	.textarea.error:focus {
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--webflow-error) 20%, transparent);
	}
</style>

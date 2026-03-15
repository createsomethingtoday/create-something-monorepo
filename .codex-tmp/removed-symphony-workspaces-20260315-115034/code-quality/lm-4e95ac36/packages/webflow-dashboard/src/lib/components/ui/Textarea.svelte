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
	class="form-control textarea {className}"
	class:form-control-error={error}
	bind:value
	{...restProps}
></textarea>

<style>
	/* Textarea-specific overrides (uses shared .form-control from app.css) */
	.textarea {
		min-height: 5rem;
		resize: vertical;
	}

	.textarea:disabled {
		resize: none;
	}
</style>

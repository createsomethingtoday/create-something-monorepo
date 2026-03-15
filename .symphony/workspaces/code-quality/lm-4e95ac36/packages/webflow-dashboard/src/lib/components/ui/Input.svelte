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
	class="form-control input {className}"
	class:form-control-error={error}
	bind:value
	{...restProps}
/>

<style>
	/* Input-specific overrides (uses shared .form-control from app.css) */
	.input {
		height: 2.25rem;
	}
</style>

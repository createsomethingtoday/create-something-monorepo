<script lang="ts">
	interface Props {
		value?: string;
		placeholder?: string;
		language?: string;
		rows?: number;
		onchange?: (value: string) => void;
	}

	let { value = $bindable(''), placeholder = '', language = 'text', rows = 10 }: Props = $props();

	function handleInput(event: Event) {
		const target = event.target as HTMLTextAreaElement;
		value = target.value;
	}

	// Generate line numbers based on content
	let lineNumbers = $derived(
		Array.from({ length: Math.max(rows, value.split('\n').length) }, (_, i) => i + 1)
	);
</script>

<div class="editor">
	<div class="line-numbers">
		{#each lineNumbers as num}
			<div class="line-number">{num}</div>
		{/each}
	</div>
	<textarea
		class="code-input"
		bind:value
		oninput={handleInput}
		{placeholder}
		{rows}
		spellcheck="false"
		autocomplete="off"
		autocapitalize="off"
	></textarea>
</div>

<style>
	.editor {
		display: flex;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.line-numbers {
		background: var(--color-bg-elevated);
		padding: var(--space-sm);
		user-select: none;
		border-right: 1px solid var(--color-border-default);
	}

	.line-number {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		text-align: right;
		line-height: 1.6;
		min-width: 2ch;
	}

	.code-input {
		flex: 1;
		padding: var(--space-sm);
		background: transparent;
		border: none;
		outline: none;
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		line-height: 1.6;
		resize: vertical;
		tab-size: 2;
	}

	.code-input::placeholder {
		color: var(--color-fg-muted);
	}

	/* Tab key support */
	.code-input {
		white-space: pre;
		overflow-wrap: normal;
		overflow-x: auto;
	}
</style>

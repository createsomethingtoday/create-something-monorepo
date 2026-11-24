<script lang="ts">
	/**
	 * ReviewCommentBody - one review comment with its formatting.
	 *
	 * The body is parsed into a tree (see comment-format.ts) and every node is
	 * rendered as an element or a text node. No part of a body is set as HTML.
	 * Text keeps its line breaks, so no whitespace may sit between the nodes of
	 * the `inline` snippet or inside a `.body-text` element.
	 */
	import { parseCommentBody, type Inline, type ListBlock } from '$lib/utils/comment-format';

	interface Props {
		body: string;
	}

	let { body }: Props = $props();

	const blocks = $derived(parseCommentBody(body));
</script>

<!-- prettier-ignore -->
{#snippet inline(nodes: Inline[])}{#each nodes as node, i (i)}{#if node.type === 'text'}{node.text}{:else if node.type === 'code'}<code class="body-code">{node.text}</code>{:else if node.type === 'link'}<a class="body-link" href={node.url} title={node.host} target="_blank" rel="noopener noreferrer nofollow">{@render inline(node.children)}</a>{:else if node.type === 'bold'}<strong class="body-bold">{@render inline(node.children)}</strong>{:else if node.type === 'italic'}<em>{@render inline(node.children)}</em>{:else}<s class="body-strike">{@render inline(node.children)}</s>{/if}{/each}{/snippet}

{#snippet items(block: ListBlock)}
	{#each block.items as item, i (i)}
		<li value={block.ordered ? item.value : undefined}>
			<!-- prettier-ignore -->
			<span class="body-text">{@render inline(item.children)}</span>
			{#each item.lists as nested, j (j)}
				{@render list(nested)}
			{/each}
		</li>
	{/each}
{/snippet}

{#snippet list(block: ListBlock)}
	{#if block.ordered}
		<ol class="body-list">{@render items(block)}</ol>
	{:else}
		<ul class="body-list">{@render items(block)}</ul>
	{/if}
{/snippet}

<div class="body">
	{#each blocks as block, i (i)}
		{#if block.type === 'paragraph'}
			<!-- prettier-ignore -->
			<p class="body-text">{@render inline(block.children)}</p>
		{:else if block.type === 'label'}
			<!-- prettier-ignore -->
			<p class="body-text body-label">{@render inline(block.children)}</p>
		{:else if block.type === 'rule'}
			<hr class="body-rule" />
		{:else}
			{@render list(block)}
		{/if}
	{/each}
</div>

<style>
	.body {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		line-height: 1.6;
		overflow-wrap: anywhere;
	}

	.body-text {
		margin: 0;
		white-space: pre-wrap;
	}

	/* A label names the block under it, so it sits close to that block. */
	.body-label {
		font-weight: var(--font-semibold);
		margin-bottom: calc(var(--space-xs) / 2 - var(--space-sm));
	}

	.body-bold {
		font-weight: var(--font-semibold);
	}

	.body-strike {
		color: var(--color-fg-muted);
	}

	.body-code {
		font-family: var(--font-mono);
		font-size: 0.9em;
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: 4px;
		padding: 0 0.25em;
	}

	.body-link {
		color: var(--color-fg-primary);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.body-list {
		margin: 0;
		padding-left: 2em;
		list-style: disc;
	}

	ol.body-list {
		list-style: decimal;
	}

	.body-list .body-list {
		margin-top: calc(var(--space-xs) / 2);
		padding-left: 1.5em;
	}

	.body-list ul.body-list {
		list-style: circle;
	}

	.body-list > li + li {
		margin-top: calc(var(--space-xs) / 2);
	}

	.body-list > li::marker {
		color: var(--color-fg-muted);
		font-variant-numeric: tabular-nums;
	}

	.body-rule {
		margin: 0;
		border: none;
		border-top: 1px solid var(--color-border-default);
	}
</style>

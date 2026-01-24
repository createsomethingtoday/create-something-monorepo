<script lang="ts">
	import { flip } from 'svelte/animate';
	import { recentChanges } from '$lib/stores/operations';
	import { pulse, shrink } from '$lib/transitions/pulse';
	import type { NodeData } from '$lib/stores/operations';
	
	interface Props {
		node: NodeData;
		isRecent?: boolean;
		onSelect?: (id: string) => void;
		depth?: number;
	}
	
	let { node, isRecent = false, onSelect, depth = 0 }: Props = $props();
	
	function handleClick(e: MouseEvent) {
		e.stopPropagation();
		onSelect?.(node.id);
	}
	
	// Get display name for the node
	function getDisplayName(n: NodeData): string {
		if (n.type === 'text') return `"${(n.text || '').slice(0, 20)}..."`;
		if (n.type === 'component') return `<${n.tag || 'Component'} />`;
		return `<${n.tag || n.type}>`;
	}
	
	// Get a preview class based on tag
	function getPreviewClass(n: NodeData): string {
		const tag = n.tag?.toLowerCase();
		if (!tag) return '';
		
		if (['button', 'a'].includes(tag)) return 'preview-interactive';
		if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) return 'preview-heading';
		if (['p', 'span', 'text'].includes(tag)) return 'preview-text';
		if (['div', 'section', 'article', 'main'].includes(tag)) return 'preview-container';
		if (['img', 'svg', 'picture'].includes(tag)) return 'preview-media';
		if (['input', 'textarea', 'select'].includes(tag)) return 'preview-input';
		
		return '';
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div 
	class="element-node {getPreviewClass(node)}"
	class:recent={isRecent}
	class:text-node={node.type === 'text'}
	style:--depth={depth}
	onclick={handleClick}
	onkeydown={(e) => e.key === 'Enter' && handleClick(e as unknown as MouseEvent)}
	role="button"
	tabindex="0"
>
	<div class="node-header">
		<span class="node-tag">{getDisplayName(node)}</span>
		{#if node.attrs && Object.keys(node.attrs).length > 0}
			<span class="node-attrs">
				{#if node.attrs.class}
					<span class="attr-class">.{node.attrs.class.split(' ')[0]}</span>
				{/if}
				{#if node.attrs.id}
					<span class="attr-id">#{node.attrs.id}</span>
				{/if}
			</span>
		{/if}
	</div>
	
	{#if node.children && node.children.length > 0}
		<div class="node-children">
			{#each node.children as child (child.id)}
				<div
					class="child-wrapper"
					class:recent={$recentChanges.has(child.id)}
					animate:flip={{ duration: 250 }}
					in:pulse={{ duration: 350 }}
					out:shrink={{ duration: 150 }}
				>
					<svelte:self 
						node={child} 
						isRecent={$recentChanges.has(child.id)}
						{onSelect}
						depth={depth + 1}
					/>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.element-node {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-xs) var(--space-sm);
		min-width: 120px;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}
	
	.element-node:hover {
		border-color: var(--color-border-emphasis);
		background: var(--color-bg-subtle);
	}
	
	.element-node.recent {
		border-color: var(--color-info);
		box-shadow: 0 0 12px var(--color-info-muted);
	}
	
	.text-node {
		background: transparent;
		border-style: dashed;
		font-style: italic;
	}
	
	.node-header {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-body-sm);
	}
	
	.node-tag {
		color: var(--color-info);
		font-family: var(--font-mono);
		font-weight: var(--font-medium);
	}
	
	.text-node .node-tag {
		color: var(--color-fg-secondary);
	}
	
	.node-attrs {
		display: flex;
		gap: 4px;
		font-size: var(--text-caption);
	}
	
	.attr-class {
		color: var(--color-success);
	}
	
	.attr-id {
		color: var(--color-warning);
	}
	
	.node-children {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		margin-top: var(--space-xs);
		padding-left: var(--space-sm);
		border-left: 2px solid var(--color-border-default);
	}
	
	.child-wrapper {
		position: relative;
	}
	
	.child-wrapper.recent {
		z-index: 5;
	}
	
	/* Preview styling based on element type */
	.preview-interactive .node-tag {
		color: var(--color-success);
	}
	
	.preview-heading .node-tag {
		color: var(--color-warning);
		font-weight: var(--font-semibold);
	}
	
	.preview-container {
		border-style: dashed;
	}
	
	.preview-media {
		background: linear-gradient(135deg, var(--color-bg-surface) 0%, var(--color-bg-subtle) 100%);
	}
	
	.preview-input .node-tag {
		color: var(--color-data-3);
	}
</style>

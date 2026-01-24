<script lang="ts">
	import { slide } from 'svelte/transition';
	import { selectedNode, operations } from '$lib/stores/operations';
	import type { NodeData } from '$lib/stores/operations';
	import { Copy, Check, X } from 'lucide-svelte';
	
	let copied = $state(false);
	
	function close() {
		operations.selectNode(null);
	}
	
	function getElementPath(node: NodeData): string {
		// Build a CSS-like selector path
		let path = node.tag || node.type;
		if (node.attrs?.id) path += `#${node.attrs.id}`;
		if (node.attrs?.class) path += `.${node.attrs.class.split(' ')[0]}`;
		return path;
	}
	
	function formatForAgent(node: NodeData): string {
		const lines: string[] = [];
		
		lines.push(`## Selected Element`);
		lines.push(``);
		lines.push(`**Path:** \`${getElementPath(node)}\``);
		lines.push(`**Type:** ${node.type}`);
		if (node.tag) lines.push(`**Tag:** \`<${node.tag}>\``);
		if (node.text) lines.push(`**Text:** "${node.text}"`);
		
		if (node.attrs && Object.keys(node.attrs).length > 0) {
			lines.push(``);
			lines.push(`**Attributes:**`);
			for (const [key, value] of Object.entries(node.attrs)) {
				lines.push(`- \`${key}\`: "${value}"`);
			}
		}
		
		if (node.children && node.children.length > 0) {
			lines.push(``);
			lines.push(`**Children:** ${node.children.length} elements`);
			for (const child of node.children.slice(0, 5)) {
				lines.push(`- ${getElementPath(child)}`);
			}
			if (node.children.length > 5) {
				lines.push(`- ... and ${node.children.length - 5} more`);
			}
		}
		
		lines.push(``);
		lines.push(`---`);
		lines.push(`*Copied from UI Viewer*`);
		
		return lines.join('\n');
	}
	
	async function copyForAgent() {
		if (!$selectedNode) return;
		
		const text = formatForAgent($selectedNode);
		await navigator.clipboard.writeText(text);
		
		copied = true;
		setTimeout(() => copied = false, 2000);
	}
</script>

{#if $selectedNode}
	<aside class="inspector glass" transition:slide={{ axis: 'x', duration: 200 }}>
		<header class="inspector-header">
			<h3>Inspector</h3>
			<div class="header-actions">
				<button 
					class="copy-btn" 
					class:copied
					onclick={copyForAgent}
					title="Copy element context for AI agent"
				>
					{#if copied}
						<Check size={14} />
						<span>Copied!</span>
					{:else}
						<Copy size={14} />
						<span>Copy for Agent</span>
					{/if}
				</button>
				<button class="close-btn" onclick={close}>
					<X size={16} />
				</button>
			</div>
		</header>
		
		<div class="inspector-content">
			<section class="section">
				<h4>Node</h4>
				<div class="info-grid">
					<span class="label">ID</span>
					<code class="value">{$selectedNode.id}</code>
					
					<span class="label">Type</span>
					<span class="value">{$selectedNode.type}</span>
					
					{#if $selectedNode.tag}
						<span class="label">Tag</span>
						<code class="value tag">&lt;{$selectedNode.tag}&gt;</code>
					{/if}
					
					{#if $selectedNode.text}
						<span class="label">Text</span>
						<span class="value text">"{$selectedNode.text}"</span>
					{/if}
				</div>
			</section>
			
			{#if $selectedNode.attrs && Object.keys($selectedNode.attrs).length > 0}
				<section class="section">
					<h4>Attributes</h4>
					<div class="attrs-list">
						{#each Object.entries($selectedNode.attrs) as [key, value]}
							<div class="attr-row">
								<span class="attr-key">{key}</span>
								<span class="attr-value">{value}</span>
							</div>
						{/each}
					</div>
				</section>
			{/if}
			
			{#if $selectedNode.children && $selectedNode.children.length > 0}
				<section class="section">
					<h4>Children ({$selectedNode.children.length})</h4>
					<div class="children-list">
						{#each $selectedNode.children as child}
							<button 
								class="child-item"
								onclick={() => operations.selectNode(child.id)}
							>
								<span class="child-tag">{child.tag || child.type}</span>
								<span class="child-id">{child.id}</span>
							</button>
						{/each}
					</div>
				</section>
			{/if}
		</div>
	</aside>
{/if}

<style>
	.inspector {
		width: 280px;
		height: 100%;
		border-left: 1px solid var(--color-border-default);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	
	.inspector-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-xs) var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
	}
	
	.inspector-header h3 {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}
	
	.header-actions {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}
	
	.copy-btn {
		display: flex;
		align-items: center;
		gap: 4px;
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		color: var(--color-fg-secondary);
		padding: 4px 10px;
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}
	
	.copy-btn:hover {
		background: var(--color-info);
		border-color: var(--color-info);
		color: var(--color-fg-primary);
	}
	
	.copy-btn.copied {
		background: var(--color-success);
		border-color: var(--color-success);
		color: var(--color-fg-primary);
	}
	
	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		color: var(--color-fg-secondary);
		cursor: pointer;
		padding: 4px;
		border-radius: var(--radius-sm);
		transition: all var(--duration-micro) var(--ease-standard);
	}
	
	.close-btn:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}
	
	.inspector-content {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-sm);
	}
	
	.section {
		margin-bottom: var(--space-md);
	}
	
	.section h4 {
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wider);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xs);
	}
	
	.info-grid {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: var(--space-xs) var(--space-sm);
		font-size: var(--text-body-sm);
	}
	
	.label {
		color: var(--color-fg-secondary);
	}
	
	.value {
		color: var(--color-fg-primary);
		word-break: break-all;
	}
	
	.value.tag {
		color: var(--color-info);
	}
	
	.value.text {
		font-style: italic;
		color: var(--color-fg-secondary);
	}
	
	code {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
	}
	
	.attrs-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	
	.attr-row {
		display: flex;
		justify-content: space-between;
		font-size: var(--text-caption);
		padding: 4px 8px;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
	}
	
	.attr-key {
		color: var(--color-success);
		font-family: var(--font-mono);
	}
	
	.attr-value {
		color: var(--color-fg-secondary);
		max-width: 150px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	
	.children-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	
	.child-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-xs) 10px;
		background: var(--color-bg-subtle);
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-size: var(--text-caption);
		text-align: left;
		transition: all var(--duration-micro) var(--ease-standard);
	}
	
	.child-item:hover {
		border-color: var(--color-border-emphasis);
		background: var(--color-bg-surface);
	}
	
	.child-tag {
		color: var(--color-info);
		font-family: var(--font-mono);
	}
	
	.child-id {
		color: var(--color-fg-muted);
		font-size: var(--text-overline);
	}
</style>

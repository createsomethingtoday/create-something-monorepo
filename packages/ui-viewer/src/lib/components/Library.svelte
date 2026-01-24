<script lang="ts">
	import { slide, fade } from 'svelte/transition';
	import { library, componentCount, allTags, type LibraryComponent } from '$lib/stores/library';
	import { currentTree, selectedNode } from '$lib/stores/operations';
	import { Library as LibraryIcon, Save, Upload, Copy, Trash2, X } from 'lucide-svelte';
	
	let isOpen = $state(false);
	let searchQuery = $state('');
	let selectedTags = $state<string[]>([]);
	let saveDialogOpen = $state(false);
	let saveName = $state('');
	let saveDescription = $state('');
	let saveTags = $state('');
	let exportData = $state('');
	
	// Filtered components
	let filteredComponents = $derived(() => {
		let results = $library.components;
		
		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			results = results.filter(
				(c) =>
					c.name.toLowerCase().includes(q) ||
					c.tags.some((t) => t.toLowerCase().includes(q))
			);
		}
		
		if (selectedTags.length > 0) {
			results = results.filter((c) =>
				selectedTags.every((tag) => c.tags.includes(tag))
			);
		}
		
		return results.sort((a, b) => 
			new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
		);
	});
	
	function toggle() {
		isOpen = !isOpen;
	}
	
	function openSaveDialog() {
		saveName = '';
		saveDescription = '';
		saveTags = '';
		saveDialogOpen = true;
	}
	
	function saveComponent() {
		const tree = $selectedNode || $currentTree;
		if (!tree) return;
		
		library.save({
			name: saveName || 'Untitled Component',
			description: saveDescription || undefined,
			tags: saveTags.split(',').map((t) => t.trim()).filter(Boolean),
			tree,
		});
		
		saveDialogOpen = false;
	}
	
	function deleteComponent(id: string) {
		if (confirm('Delete this component from the library?')) {
			library.delete(id);
		}
	}
	
	function exportLibrary() {
		exportData = library.export();
	}
	
	function copyExport() {
		navigator.clipboard.writeText(exportData);
	}
	
	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}
	
	function copyForAgent(comp: LibraryComponent) {
		const lines = [
			`## Library Component: ${comp.name}`,
			'',
			comp.description ? `${comp.description}` : '',
			comp.description ? '' : '',
			`**Tags:** ${comp.tags.length > 0 ? comp.tags.join(', ') : 'none'}`,
			`**Saved:** ${formatDate(comp.savedAt)}`,
			'',
			'**Structure:**',
			'```json',
			JSON.stringify(comp.tree, null, 2),
			'```',
			'',
			'---',
			'*From UI Preview Library*',
		];
		
		navigator.clipboard.writeText(lines.filter(Boolean).join('\n'));
	}
</script>

<div class="library-container">
	<button class="library-toggle" class:open={isOpen} onclick={toggle}>
		<LibraryIcon size={18} />
		<span class="label">Library</span>
		{#if $componentCount > 0}
			<span class="count">{$componentCount}</span>
		{/if}
	</button>
	
	{#if isOpen}
		<aside class="library-panel glass-elevated" transition:slide={{ axis: 'x', duration: 200 }}>
			<header class="library-header">
				<h3>Component Library</h3>
			<div class="header-actions">
				<button 
					class="action-btn"
					onclick={openSaveDialog}
					disabled={!$currentTree}
					title="Save current component"
				>
					<Save size={14} />
					<span>Save</span>
				</button>
				<button 
					class="action-btn icon-only"
					onclick={exportLibrary}
					title="Export library"
				>
					<Upload size={14} />
				</button>
			</div>
			</header>
			
			<div class="search-bar">
				<input
					type="text"
					placeholder="Search components..."
					bind:value={searchQuery}
				/>
			</div>
			
			{#if $allTags.length > 0}
				<div class="tags-filter">
					{#each $allTags as tag}
						<button
							class="tag-btn"
							class:selected={selectedTags.includes(tag)}
							onclick={() => {
								if (selectedTags.includes(tag)) {
									selectedTags = selectedTags.filter((t) => t !== tag);
								} else {
									selectedTags = [...selectedTags, tag];
								}
							}}
						>
							{tag}
						</button>
					{/each}
				</div>
			{/if}
			
			<div class="components-list">
				{#each filteredComponents() as comp (comp.id)}
					<article class="component-card" transition:fade={{ duration: 150 }}>
						<header>
							<h4>{comp.name}</h4>
							<span class="date">{formatDate(comp.updatedAt)}</span>
						</header>
						
						{#if comp.description}
							<p class="description">{comp.description}</p>
						{/if}
						
						{#if comp.tags.length > 0}
							<div class="tags">
								{#each comp.tags as tag}
									<span class="tag">{tag}</span>
								{/each}
							</div>
						{/if}
						
						<footer>
							<button onclick={() => copyForAgent(comp)} title="Copy for agent">
								<Copy size={12} />
								<span>Copy</span>
							</button>
							<button onclick={() => deleteComponent(comp.id)} title="Delete">
								<Trash2 size={12} />
							</button>
						</footer>
					</article>
				{:else}
					<div class="empty-state">
						{#if searchQuery || selectedTags.length > 0}
							<p>No matching components</p>
						{:else}
							<p>No saved components</p>
							<p class="hint">Save the current view to build your library</p>
						{/if}
					</div>
				{/each}
			</div>
		</aside>
	{/if}
</div>

<!-- Save Dialog -->
{#if saveDialogOpen}
	<div class="dialog-backdrop" onclick={() => saveDialogOpen = false} transition:fade={{ duration: 150 }}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="dialog glass-elevated" onclick={(e) => e.stopPropagation()}>
		<header>
			<h3>Save to Library</h3>
			<button class="close-btn" onclick={() => saveDialogOpen = false}>
				<X size={18} />
			</button>
		</header>
			
			<form onsubmit={(e) => { e.preventDefault(); saveComponent(); }}>
				<label>
					<span>Name</span>
					<input type="text" bind:value={saveName} placeholder="Component name" autofocus />
				</label>
				
				<label>
					<span>Description</span>
					<textarea bind:value={saveDescription} placeholder="Optional description..." rows="2"></textarea>
				</label>
				
				<label>
					<span>Tags</span>
					<input type="text" bind:value={saveTags} placeholder="tag1, tag2, tag3" />
				</label>
				
				<footer>
					<button type="button" onclick={() => saveDialogOpen = false}>Cancel</button>
					<button type="submit" class="primary">Save Component</button>
				</footer>
			</form>
		</div>
	</div>
{/if}

<!-- Export Dialog -->
{#if exportData}
	<div class="dialog-backdrop" onclick={() => exportData = ''} transition:fade={{ duration: 150 }}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="dialog glass-elevated wide" onclick={(e) => e.stopPropagation()}>
		<header>
			<h3>Export Library</h3>
			<button class="close-btn" onclick={() => exportData = ''}>
				<X size={18} />
			</button>
		</header>
			
			<div class="export-content">
				<textarea readonly value={exportData} rows="15"></textarea>
			</div>
			
		<footer>
			<button onclick={copyExport}>
				<Copy size={14} />
				<span>Copy to Clipboard</span>
			</button>
			<button onclick={() => exportData = ''}>Close</button>
		</footer>
		</div>
	</div>
{/if}

<style>
	.library-container {
		position: fixed;
		left: var(--space-sm);
		top: 50%;
		transform: translateY(-50%);
		z-index: var(--z-fixed);
	}
	
	.library-toggle {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		background: var(--glass-bg-medium);
		backdrop-filter: blur(var(--glass-blur-md));
		border: 1px solid var(--glass-border-light);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}
	
	.library-toggle:hover,
	.library-toggle.open {
		background: var(--color-bg-surface);
		color: var(--color-fg-primary);
		border-color: var(--color-border-emphasis);
	}
	
	.action-btn {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	
	.action-btn.icon-only {
		padding: 4px 6px;
	}
	
	.library-toggle .label {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
	}
	
	.library-toggle .count {
		background: var(--color-info);
		color: var(--color-fg-primary);
		padding: 2px 6px;
		border-radius: var(--radius-full);
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
	}
	
	.library-panel {
		position: absolute;
		left: calc(100% + var(--space-xs));
		top: 50%;
		transform: translateY(-50%);
		width: 320px;
		max-height: 70vh;
		border-radius: var(--radius-lg);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	
	.library-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
	}
	
	.library-header h3 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}
	
	.header-actions {
		display: flex;
		gap: var(--space-xs);
	}
	
	.action-btn {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		color: var(--color-fg-secondary);
		padding: 4px 8px;
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}
	
	.action-btn:hover:not(:disabled) {
		background: var(--color-info);
		border-color: var(--color-info);
		color: var(--color-fg-primary);
	}
	
	.action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.search-bar {
		padding: var(--space-xs) var(--space-sm);
	}
	
	.search-bar input {
		width: 100%;
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		padding: var(--space-xs);
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
	}
	
	.search-bar input::placeholder {
		color: var(--color-fg-muted);
	}
	
	.tags-filter {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		padding: 0 var(--space-sm) var(--space-xs);
	}
	
	.tag-btn {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		color: var(--color-fg-muted);
		padding: 2px 8px;
		border-radius: var(--radius-full);
		font-size: var(--text-caption);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}
	
	.tag-btn:hover,
	.tag-btn.selected {
		background: var(--color-info-muted);
		border-color: var(--color-info);
		color: var(--color-fg-primary);
	}
	
	.components-list {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-sm);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}
	
	.component-card {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-sm);
		transition: all var(--duration-micro) var(--ease-standard);
	}
	
	.component-card:hover {
		border-color: var(--color-border-emphasis);
	}
	
	.component-card header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: var(--space-xs);
	}
	
	.component-card h4 {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}
	
	.component-card .date {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}
	
	.component-card .description {
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xs);
	}
	
	.component-card .tags {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-bottom: var(--space-xs);
	}
	
	.component-card .tag {
		background: var(--color-info-muted);
		color: var(--color-info);
		padding: 1px 6px;
		border-radius: var(--radius-full);
		font-size: var(--text-overline);
	}
	
	.component-card footer {
		display: flex;
		gap: var(--space-xs);
	}
	
	.component-card footer button {
		display: flex;
		align-items: center;
		gap: 4px;
		background: transparent;
		border: none;
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
		cursor: pointer;
		padding: 2px 4px;
	}
	
	.component-card footer button:hover {
		color: var(--color-fg-primary);
	}
	
	.empty-state {
		text-align: center;
		padding: var(--space-lg);
		color: var(--color-fg-muted);
	}
	
	.empty-state .hint {
		font-size: var(--text-caption);
		margin-top: var(--space-xs);
	}
	
	/* Dialogs */
	.dialog-backdrop {
		position: fixed;
		inset: 0;
		background: var(--color-overlay-heavy);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: var(--z-modal);
	}
	
	.dialog {
		width: 400px;
		border-radius: var(--radius-lg);
		overflow: hidden;
	}
	
	.dialog.wide {
		width: 600px;
	}
	
	.dialog header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
	}
	
	.dialog header h3 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
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
	
	.dialog form {
		padding: var(--space-sm);
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}
	
	.dialog label {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	
	.dialog label span {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wider);
	}
	
	.dialog input,
	.dialog textarea {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		padding: var(--space-xs);
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
		font-family: inherit;
	}
	
	.dialog input:focus,
	.dialog textarea:focus {
		outline: none;
		border-color: var(--color-info);
	}
	
	.dialog footer,
	.dialog .export-content + footer {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-xs);
		padding: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}
	
	.dialog footer button {
		display: flex;
		align-items: center;
		gap: 6px;
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		color: var(--color-fg-secondary);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}
	
	.dialog footer button:hover {
		background: var(--color-bg-surface);
		color: var(--color-fg-primary);
	}
	
	.dialog footer button.primary {
		background: var(--color-info);
		border-color: var(--color-info);
		color: var(--color-fg-primary);
	}
	
	.export-content {
		padding: var(--space-sm);
	}
	
	.export-content textarea {
		width: 100%;
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		padding: var(--space-xs);
		color: var(--color-fg-secondary);
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		resize: none;
	}
</style>

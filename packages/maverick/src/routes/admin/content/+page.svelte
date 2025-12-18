<script lang="ts">
	/**
	 * Minimal CMS - Edit page content
	 *
	 * Philosophy: Zuhandenheit (ready-to-hand)
	 * The interface recedes. Only the content remains.
	 */

	import { browser } from '$app/environment';

	type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

	const PAGES = [
		{ id: 'home', label: 'Home' },
		{ id: 'petrox', label: 'Oil & Gas' },
		{ id: 'lithx', label: 'Mining' },
		{ id: 'dme', label: 'Water Treatment' },
		{ id: 'news', label: 'News' },
		{ id: 'global', label: 'Global (Footer/Contact)' }
	];

	// Fields that should not be editable
	const HIDDEN_FIELDS = ['id', 'icon', 'image', 'url'];

	let activePage = $state('home');
	let content = $state<Record<string, JsonValue> | null>(null);
	let isLoading = $state(true);
	let isSaving = $state(false);
	let message = $state<{ type: 'success' | 'error'; text: string } | null>(null);
	let searchQuery = $state('');
	let expandedSections = $state<Set<string>>(new Set());

	// Fetch content when page changes
	$effect(() => {
		if (browser) {
			fetchContent();
		}
	});

	async function fetchContent() {
		isLoading = true;
		try {
			const res = await fetch(`/api/content/${activePage}`);
			if (res.ok) {
				content = await res.json();
				// Expand all top-level sections by default
				if (content) {
					expandedSections = new Set(Object.keys(content));
				}
			}
		} catch (e) {
			console.error('Failed to fetch:', e);
		} finally {
			isLoading = false;
		}
	}

	async function saveContent() {
		if (!content) return;
		isSaving = true;
		message = null;
		try {
			const res = await fetch(`/api/content/${activePage}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(content)
			});
			if (res.ok) {
				message = { type: 'success', text: 'Saved! Changes are live.' };
				setTimeout(() => (message = null), 3000);
			} else {
				message = { type: 'error', text: 'Failed to save.' };
			}
		} catch (e) {
			message = { type: 'error', text: 'Failed to save.' };
		} finally {
			isSaving = false;
		}
	}

	function updateValue(path: string[], value: JsonValue) {
		if (!content) return;
		const updated = JSON.parse(JSON.stringify(content));
		let current: any = updated;
		for (let i = 0; i < path.length - 1; i++) {
			current = current[path[i]];
		}
		current[path[path.length - 1]] = value;
		content = updated;
	}

	function toggleSection(key: string) {
		const newSet = new Set(expandedSections);
		if (newSet.has(key)) {
			newSet.delete(key);
		} else {
			newSet.add(key);
		}
		expandedSections = newSet;
	}

	function switchPage(pageId: string) {
		activePage = pageId;
		searchQuery = '';
	}

	// Build matching paths for search
	function getMatchingPaths(obj: JsonValue, query: string, currentPath: string[] = []): Set<string> {
		if (!query.trim()) return new Set();

		const paths = new Set<string>();
		const q = query.toLowerCase();

		function findMatches(value: JsonValue, path: string[]) {
			const pathStr = path.join('.');

			if (typeof value === 'string' && value.toLowerCase().includes(q)) {
				paths.add(pathStr);
			} else if (typeof value === 'number' && String(value).toLowerCase().includes(q)) {
				paths.add(pathStr);
			}

			const key = path[path.length - 1];
			if (key && key.toLowerCase().includes(q)) {
				paths.add(pathStr);
			}

			if (typeof value === 'object' && value !== null) {
				if (Array.isArray(value)) {
					value.forEach((item, i) => findMatches(item, [...path, String(i)]));
				} else {
					Object.entries(value).forEach(([k, v]) => findMatches(v, [...path, k]));
				}
			}
		}

		if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
			Object.entries(obj).forEach(([k, v]) => findMatches(v, [k]));
		}

		return paths;
	}

	const matchingPaths = $derived(content ? getMatchingPaths(content, searchQuery) : new Set<string>());

	function pathMatches(path: string[]): boolean {
		if (!searchQuery.trim()) return true;
		const pathStr = path.join('.');
		for (const match of matchingPaths) {
			if (match === pathStr || match.startsWith(pathStr + '.')) {
				return true;
			}
		}
		return false;
	}

	function isExactMatch(path: string[]): boolean {
		return matchingPaths.has(path.join('.'));
	}

	function formatLabel(name: string): string {
		return name
			.replace(/([A-Z])/g, ' $1')
			.replace(/^./, (s) => s.toUpperCase())
			.replace(/_/g, ' ');
	}

	// Array mutation helpers
	function generateId(): string {
		return String(Date.now());
	}

	function generateSlug(title: string): string {
		return title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');
	}

	function addArrayItem(section: string) {
		if (!content) return;
		const updated = JSON.parse(JSON.stringify(content));
		const arr = updated[section];
		if (!Array.isArray(arr)) return;

		// Template for news articles
		if (section === 'articles') {
			arr.push({
				id: generateId(),
				date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
				title: 'New Article',
				excerpt: 'Article excerpt...',
				image: '/images/news-pic-1.png',
				slug: 'new-article-' + generateId(),
				featured: false,
				category: 'Company News'
			});
		} else {
			// Generic object for other arrays
			arr.push({});
		}
		content = updated;
	}

	function removeArrayItem(section: string, index: number) {
		if (!content) return;
		const updated = JSON.parse(JSON.stringify(content));
		const arr = updated[section];
		if (!Array.isArray(arr)) return;
		arr.splice(index, 1);
		content = updated;
	}
</script>

<div class="content-editor">
	<!-- Header -->
	<div class="editor-header">
		<h1 class="editor-title">Edit Content</h1>
		<div class="flex items-center gap-3">
			{#if message}
				<span class="message-badge" class:success={message.type === 'success'} class:error={message.type === 'error'}>
					{message.text}
				</span>
			{/if}
			<button onclick={fetchContent} class="admin-btn admin-btn-ghost" title="Refresh">
				<svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
				</svg>
			</button>
			<button onclick={saveContent} disabled={isSaving} class="admin-btn admin-btn-primary flex items-center gap-2">
				<svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
				</svg>
				{isSaving ? 'Saving...' : 'Save'}
			</button>
		</div>
	</div>

	<!-- Page tabs + Search -->
	<div class="tabs-row">
		<div class="tabs-container">
			{#each PAGES as page}
				<button
					onclick={() => switchPage(page.id)}
					class="tab-btn"
					class:active={activePage === page.id}
				>
					{page.label}
				</button>
			{/each}
		</div>

		<!-- Search -->
		<div class="search-container">
			<label for="content-search" class="sr-only">Search content</label>
			<svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
			<input
				id="content-search"
				type="text"
				placeholder="Search content..."
				bind:value={searchQuery}
				class="admin-input search-input"
			/>
			{#if searchQuery}
				<button
					onclick={() => (searchQuery = '')}
					class="search-clear"
					title="Clear search"
				>
					<svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			{/if}
		</div>
	</div>

	<!-- Search results indicator -->
	{#if searchQuery}
		<div class="search-results">
			{#if matchingPaths.size > 0}
				Found {matchingPaths.size} match{matchingPaths.size === 1 ? '' : 'es'} for "{searchQuery}"
			{:else}
				No results for "{searchQuery}"
			{/if}
		</div>
	{/if}

	<!-- Content editor -->
	{#if isLoading}
		<div class="loading-container">
			<div class="loading-spinner"></div>
		</div>
	{:else if content}
		<div class="sections-list">
			{#each Object.entries(content) as [section, value]}
				{#if pathMatches([section])}
					{@const isExpanded = expandedSections.has(section)}
					<div class="admin-card">
						<button
							onclick={() => toggleSection(section)}
							class="section-header"
						>
							<div class="flex items-center gap-2">
								<svg class="icon-sm chevron" class:expanded={isExpanded} fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
								</svg>
								<span class="section-title">{formatLabel(section)}</span>
								<span class="section-count">
									{#if Array.isArray(value)}
										({value.length} items)
									{:else if typeof value === 'object' && value !== null}
										({Object.keys(value).length} fields)
									{/if}
								</span>
							</div>
						</button>
						{#if isExpanded}
							<div class="section-content">
								{#if Array.isArray(value)}
									{#each value as item, i}
										<div class="array-item">
											<div class="item-header">
												<span class="item-label">Item {i + 1}</span>
												<button
													onclick={() => removeArrayItem(section, i)}
													class="remove-btn"
													title="Remove item"
												>
													<svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
													</svg>
												</button>
											</div>
											{#if typeof item === 'object' && item !== null}
												{#each Object.entries(item as Record<string, JsonValue>) as [k, v]}
													{#if !HIDDEN_FIELDS.includes(k) && pathMatches([section, String(i), k])}
														{@const isMatch = isExactMatch([section, String(i), k])}
														<div class="field-row" class:is-match={isMatch}>
															<label class="field-label" class:is-match={isMatch}>{formatLabel(k)}</label>
															{#if typeof v === 'string' && v.length > 100}
																<textarea
																	value={v}
																	oninput={(e) => updateValue([section, String(i), k], (e.target as HTMLTextAreaElement).value)}
																	rows={3}
																	class="admin-input flex-1"
																></textarea>
															{:else if typeof v === 'string' || typeof v === 'number'}
																<input
																	type={typeof v === 'number' ? 'number' : 'text'}
																	value={v}
																	oninput={(e) => updateValue([section, String(i), k], typeof v === 'number' ? Number((e.target as HTMLInputElement).value) : (e.target as HTMLInputElement).value)}
																	class="admin-input flex-1"
																/>
															{/if}
														</div>
													{/if}
												{/each}
											{/if}
										</div>
									{/each}
									<!-- Add item button -->
									<button
										onclick={() => addArrayItem(section)}
										class="add-btn"
									>
										<svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
										</svg>
										Add {section === 'articles' ? 'Article' : 'Item'}
									</button>
								{:else if typeof value === 'object' && value !== null}
									{#each Object.entries(value as Record<string, JsonValue>) as [k, v]}
										{#if !HIDDEN_FIELDS.includes(k) && pathMatches([section, k])}
											{@const isMatch = isExactMatch([section, k])}
											<div class="field-row" class:is-match={isMatch}>
												<label class="field-label" class:is-match={isMatch}>{formatLabel(k)}</label>
												{#if typeof v === 'string' && v.length > 100}
													<textarea
														value={v}
														oninput={(e) => updateValue([section, k], (e.target as HTMLTextAreaElement).value)}
														rows={3}
														class="admin-input flex-1"
													></textarea>
												{:else if typeof v === 'string' || typeof v === 'number'}
													<input
														type={typeof v === 'number' ? 'number' : 'text'}
														value={v}
														oninput={(e) => updateValue([section, k], typeof v === 'number' ? Number((e.target as HTMLInputElement).value) : (e.target as HTMLInputElement).value)}
														class="admin-input flex-1"
													/>
												{:else if Array.isArray(v)}
													<!-- Nested array (e.g., contact.emails) -->
													<div class="nested-array">
														{#each v as item, i}
															<div class="array-item nested">
																<div class="item-label">Item {i + 1}</div>
																{#if typeof item === 'object' && item !== null}
																	{#each Object.entries(item as Record<string, JsonValue>) as [nk, nv]}
																		{#if !HIDDEN_FIELDS.includes(nk) && (typeof nv === 'string' || typeof nv === 'number')}
																			{@const nestedMatch = isExactMatch([section, k, String(i), nk])}
																			<div class="field-row" class:is-match={nestedMatch}>
																				<label class="field-label" class:is-match={nestedMatch}>{formatLabel(nk)}</label>
																				<input
																					type={typeof nv === 'number' ? 'number' : 'text'}
																					value={nv}
																					oninput={(e) => updateValue([section, k, String(i), nk], typeof nv === 'number' ? Number((e.target as HTMLInputElement).value) : (e.target as HTMLInputElement).value)}
																					class="admin-input flex-1"
																				/>
																			</div>
																		{/if}
																	{/each}
																{/if}
															</div>
														{/each}
													</div>
												{:else if typeof v === 'object' && v !== null}
													<!-- Nested object -->
													<div class="nested-object">
														{#each Object.entries(v as Record<string, JsonValue>) as [nk, nv]}
															{#if !HIDDEN_FIELDS.includes(nk) && (typeof nv === 'string' || typeof nv === 'number')}
																{@const nestedMatch = isExactMatch([section, k, nk])}
																<div class="field-row" class:is-match={nestedMatch}>
																	<label class="field-label" class:is-match={nestedMatch}>{formatLabel(nk)}</label>
																	{#if typeof nv === 'string' && nv.length > 100}
																		<textarea
																			value={nv}
																			oninput={(e) => updateValue([section, k, nk], (e.target as HTMLTextAreaElement).value)}
																			rows={3}
																			class="admin-input flex-1"
																		></textarea>
																	{:else}
																		<input
																			type={typeof nv === 'number' ? 'number' : 'text'}
																			value={nv}
																			oninput={(e) => updateValue([section, k, nk], typeof nv === 'number' ? Number((e.target as HTMLInputElement).value) : (e.target as HTMLInputElement).value)}
																			class="admin-input flex-1"
																		/>
																	{/if}
																</div>
															{/if}
														{/each}
													</div>
												{/if}
											</div>
										{/if}
									{/each}
								{/if}
							</div>
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	{:else}
		<p class="no-content">No content found.</p>
	{/if}
</div>

<style>
	/* Content Editor Layout */
	.content-editor {
		display: flex;
		flex-direction: column;
		gap: var(--space-md, 1.618rem);
	}

	.editor-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.editor-title {
		font-size: var(--text-h2, 1.5rem);
		font-weight: 700;
		color: var(--color-fg-primary, #fff);
	}

	/* Message Badge */
	.message-badge {
		font-size: var(--text-body-sm, 0.875rem);
		padding: 0.25rem 0.75rem;
		border-radius: var(--radius-sm, 6px);
		color: var(--color-fg-primary, #fff);
	}

	.message-badge.success {
		background: var(--color-success, #44aa44);
	}

	.message-badge.error {
		background: var(--color-error, #cc4444);
	}

	/* Tabs */
	.tabs-row {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	@media (min-width: 640px) {
		.tabs-row {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
		}
	}

	.tabs-container {
		display: flex;
		gap: 0.5rem;
		border-bottom: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	@media (min-width: 640px) {
		.tabs-container {
			border-bottom: none;
		}
	}

	.tab-btn {
		padding: 0.5rem 1rem;
		font-size: var(--text-body-sm, 0.875rem);
		font-weight: 500;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
		transition: all 0.2s ease;
	}

	.tab-btn:hover {
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
	}

	.tab-btn.active {
		color: var(--color-fg-primary, #fff);
		border-bottom-color: var(--color-fg-primary, #fff);
	}

	/* Search */
	.search-container {
		position: relative;
	}

	.search-icon {
		position: absolute;
		left: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		width: 1rem;
		height: 1rem;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
	}

	input.search-input {
		padding-left: 2rem !important;
		padding-right: 2rem;
		width: 100%;
	}

	@media (min-width: 640px) {
		.search-input {
			width: 32rem;
		}
	}

	.search-clear {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		padding: 0.25rem;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
		border-radius: var(--radius-sm, 6px);
	}

	.search-clear:hover {
		color: var(--color-fg-primary, #fff);
	}

	.search-results {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
	}

	/* Loading */
	.loading-container {
		display: flex;
		justify-content: center;
		padding: 3rem 0;
	}

	.loading-spinner {
		width: 1.5rem;
		height: 1.5rem;
		border: 2px solid var(--color-fg-muted, rgba(255, 255, 255, 0.4));
		border-top-color: transparent;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Sections */
	.sections-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* Override: tighter radius for dense admin UI (vs --radius-lg in app.css) */
	.admin-card {
		border-radius: var(--radius-md, 8px);
	}

	.section-header {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		background: transparent;
	}

	.section-title {
		font-weight: 500;
		color: var(--color-fg-primary, #fff);
	}

	.section-count {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
	}

	.section-content {
		padding: 0 1rem 1rem;
		border-top: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	/* Icons */
	.icon-sm {
		width: 1rem;
		height: 1rem;
	}

	.chevron {
		transition: transform 0.2s ease;
	}

	.chevron.expanded {
		transform: rotate(90deg);
	}

	/* Array Items */
	.array-item {
		padding-left: 1rem;
		padding-top: 0.75rem;
		border-left: 2px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.item-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.item-label {
		font-size: var(--text-caption, 0.75rem);
		font-weight: 500;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
	}

	.remove-btn {
		padding: 0.25rem;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
		border-radius: var(--radius-sm, 6px);
		opacity: 0;
		transition: all 0.2s ease;
	}

	.array-item:hover .remove-btn {
		opacity: 1;
	}

	.remove-btn:hover {
		color: var(--color-error, #cc4444);
		background: rgba(204, 68, 68, 0.1);
	}

	.add-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1rem;
		padding: 0.5rem 1rem;
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		border: 1px dashed var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-sm, 6px);
		transition: all 0.2s ease;
	}

	.add-btn:hover {
		color: var(--color-fg-primary, #fff);
		border-color: var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
		background: var(--color-hover, rgba(255, 255, 255, 0.05));
	}

	.icon-xs {
		width: 0.875rem;
		height: 0.875rem;
	}

	/* Nested Object */
	.nested-object {
		width: 100%;
		padding-left: 1rem;
		margin-top: 0.5rem;
		border-left: 2px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	/* Nested Array */
	.nested-array {
		width: 100%;
		margin-top: 0.5rem;
	}

	.array-item.nested {
		padding-left: 1rem;
		padding-top: 0.5rem;
		margin-bottom: 0.5rem;
		border-left: 2px solid var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
	}

	/* Textarea-specific adjustment (inherits .admin-input from app.css) */
	textarea.admin-input {
		height: auto;
		padding: 0.5rem 0.75rem;
		resize: vertical;
	}

	/* Field Row */
	.field-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.5rem;
		margin: 0 -0.5rem;
		border-radius: var(--radius-sm, 6px);
		border-left: 2px solid transparent;
		transition: all 0.2s ease;
	}

	.field-row.is-match {
		background: rgba(68, 119, 170, 0.15);
		border-left-color: var(--color-info, #4477aa);
	}

	.field-label {
		width: 12rem;
		font-size: var(--text-body-sm, 0.875rem);
		font-weight: 500;
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		flex-shrink: 0;
	}

	.field-label.is-match {
		color: var(--color-info, #4477aa);
	}

	/* No Content */
	.no-content {
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
	}

	/* Screen reader only - visually hidden but accessible */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>

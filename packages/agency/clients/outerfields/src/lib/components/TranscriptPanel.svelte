<script lang="ts">
	/**
	 * TranscriptPanel Component
	 *
	 * Displays auto-generated transcripts with:
	 * - Synchronized playback highlighting
	 * - Click-to-seek functionality
	 * - Search within transcript
	 * - Collapsible panel
	 */
	import { FileText, Search, ChevronDown, ChevronUp, Lock, X } from 'lucide-svelte';
	import { onMount } from 'svelte';

	interface TranscriptSegment {
		start: number;
		end: number;
		text: string;
	}

	interface Props {
		videoId: string;
		currentTime?: number;
		onSeek?: (time: number) => void;
		isMember?: boolean;
	}

	let { videoId, currentTime = 0, onSeek, isMember = false }: Props = $props();

	let segments = $state<TranscriptSegment[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let isPreview = $state(false);
	let totalSegments = $state(0);
	let language = $state('en');
	let wordCount = $state(0);

	// UI state
	let isExpanded = $state(true);
	let searchQuery = $state('');
	let showSearch = $state(false);

	// Current segment based on playback time
	const activeSegmentIndex = $derived(
		segments.findIndex(seg => currentTime >= seg.start && currentTime < seg.end)
	);

	// Filtered segments based on search
	const filteredSegments = $derived(
		searchQuery.trim()
			? segments.filter(seg => 
					seg.text.toLowerCase().includes(searchQuery.toLowerCase())
				)
			: segments
	);

	async function fetchTranscript() {
		isLoading = true;
		error = null;

		try {
			const response = await fetch(`/api/videos/${videoId}/transcript`);
			const result = await response.json();

			if (result.success && result.data) {
				segments = result.data.segments;
				isPreview = result.data.preview ?? false;
				totalSegments = result.data.totalSegments ?? segments.length;
				language = result.data.language ?? 'en';
				wordCount = result.data.word_count ?? 0;
			} else {
				segments = [];
			}
		} catch (err) {
			error = 'Failed to load transcript';
			segments = [];
		} finally {
			isLoading = false;
		}
	}

	function handleSegmentClick(segment: TranscriptSegment) {
		if (onSeek) {
			onSeek(segment.start);
		}
	}

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function highlightSearchTerm(text: string): string {
		if (!searchQuery.trim()) return text;
		const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
		return text.replace(regex, '<mark>$1</mark>');
	}

	// Auto-scroll to active segment
	$effect(() => {
		if (activeSegmentIndex >= 0 && !searchQuery) {
			const element = document.getElementById(`segment-${activeSegmentIndex}`);
			if (element) {
				element.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		}
	});

	onMount(() => {
		fetchTranscript();
	});
</script>

<section class="transcript-panel" class:collapsed={!isExpanded}>
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="panel-header" onclick={() => isExpanded = !isExpanded} role="button" tabindex="0">
		<div class="header-left">
			<FileText size={18} />
			<span class="header-title">Transcript</span>
			{#if segments.length > 0}
				<span class="segment-count">{totalSegments} segments</span>
			{/if}
		</div>
		<div class="header-right">
			{#if isExpanded && segments.length > 0}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<span
					class="search-toggle"
					onclick={(e) => { e.stopPropagation(); showSearch = !showSearch; }}
					role="button"
					tabindex="0"
					aria-label="Toggle search"
				>
					<Search size={16} />
				</span>
			{/if}
			{#if isExpanded}
				<ChevronUp size={18} />
			{:else}
				<ChevronDown size={18} />
			{/if}
		</div>
	</div>

	{#if isExpanded}
		<div class="panel-content">
			<!-- Search Bar -->
			{#if showSearch && segments.length > 0}
				<div class="search-bar">
					<Search size={16} />
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search transcript..."
						class="search-input"
					/>
					{#if searchQuery}
						<button class="clear-search" onclick={() => searchQuery = ''}>
							<X size={14} />
						</button>
					{/if}
				</div>
				{#if searchQuery && filteredSegments.length > 0}
					<div class="search-results-count">
						{filteredSegments.length} result{filteredSegments.length !== 1 ? 's' : ''}
					</div>
				{/if}
			{/if}

			<!-- Transcript Content -->
			{#if isLoading}
				<div class="loading-state">
					<div class="loading-pulse"></div>
					<span>Loading transcript...</span>
				</div>
			{:else if error}
				<div class="error-state">{error}</div>
			{:else if segments.length === 0}
				<div class="empty-state">
					<FileText size={24} />
					<p>No transcript available for this video.</p>
				</div>
			{:else}
				<div class="segments-list">
					{#each filteredSegments as segment, index (segment.start)}
						{@const isActive = !searchQuery && index === activeSegmentIndex}
						<button
							id="segment-{index}"
							class="segment"
							class:active={isActive}
							onclick={() => handleSegmentClick(segment)}
						>
							<span class="segment-time">{formatTime(segment.start)}</span>
							<span class="segment-text">
								{#if searchQuery}
									{@html highlightSearchTerm(segment.text)}
								{:else}
									{segment.text}
								{/if}
							</span>
						</button>
					{/each}

					<!-- Preview Gate -->
					{#if isPreview && !isMember}
						<div class="preview-gate">
							<Lock size={20} />
							<p>Viewing preview ({segments.length} of {totalSegments} segments)</p>
							<a href="/#pricing" class="unlock-link">
								Unlock full transcript - $99 lifetime
							</a>
						</div>
					{/if}
				</div>

				<!-- Word Count Footer -->
				{#if wordCount > 0}
					<div class="transcript-footer">
						<span>{wordCount.toLocaleString()} words</span>
						<span>•</span>
						<span>{language.toUpperCase()}</span>
					</div>
				{/if}
			{/if}
		</div>
	{/if}
</section>

<style>
	.transcript-panel {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
		overflow: hidden;
	}

	.panel-header {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		background: transparent;
		border: none;
		cursor: pointer;
		color: var(--color-fg-primary);
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.panel-header:hover {
		background: var(--color-bg-pure);
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.header-title {
		font-size: 0.9375rem;
		font-weight: 600;
	}

	.segment-count {
		font-size: 0.75rem;
		color: var(--color-fg-muted);
		background: var(--color-bg-pure);
		padding: 0.125rem 0.5rem;
		border-radius: 9999px;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.search-toggle {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: 0.375rem;
		color: var(--color-fg-muted);
		cursor: pointer;
	}

	.search-toggle:hover {
		color: var(--color-fg-primary);
		border-color: var(--color-border-strong);
	}

	.panel-content {
		border-top: 1px solid var(--color-border-default);
	}

	/* Search Bar */
	.search-bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: var(--color-bg-pure);
		border-bottom: 1px solid var(--color-border-default);
	}

	.search-bar :global(svg) {
		color: var(--color-fg-muted);
		flex-shrink: 0;
	}

	.search-input {
		flex: 1;
		background: transparent;
		border: none;
		color: var(--color-fg-primary);
		font-size: 0.875rem;
		outline: none;
	}

	.search-input::placeholder {
		color: var(--color-fg-subtle);
	}

	.clear-search {
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-surface);
		border: none;
		border-radius: 50%;
		color: var(--color-fg-muted);
		cursor: pointer;
	}

	.search-results-count {
		padding: 0.5rem 1rem;
		font-size: 0.75rem;
		color: var(--color-fg-muted);
		background: var(--color-bg-pure);
		border-bottom: 1px solid var(--color-border-default);
	}

	/* States */
	.loading-state,
	.error-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		text-align: center;
		color: var(--color-fg-muted);
		gap: 0.75rem;
	}

	.loading-pulse {
		width: 24px;
		height: 24px;
		border: 2px solid var(--color-border-default);
		border-top-color: var(--color-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.empty-state p {
		margin: 0;
		font-size: 0.875rem;
	}

	/* Segments List */
	.segments-list {
		max-height: 400px;
		overflow-y: auto;
		padding: 0.5rem;
	}

	.segment {
		width: 100%;
		display: flex;
		gap: 0.75rem;
		padding: 0.625rem 0.75rem;
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		text-align: left;
		cursor: pointer;
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.segment:hover {
		background: var(--color-bg-pure);
	}

	.segment.active {
		background: var(--color-primary);
		background: rgba(124, 43, 238, 0.15);
	}

	.segment.active .segment-time {
		color: var(--color-primary);
	}

	.segment-time {
		flex-shrink: 0;
		font-size: 0.75rem;
		font-family: monospace;
		color: var(--color-fg-muted);
		width: 40px;
	}

	.segment-text {
		font-size: 0.875rem;
		color: var(--color-fg-secondary);
		line-height: 1.5;
	}

	.segment-text :global(mark) {
		background: var(--color-warning-muted);
		color: inherit;
		padding: 0 0.125rem;
		border-radius: 0.125rem;
	}

	/* Preview Gate */
	.preview-gate {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1.5rem;
		margin: 0.5rem;
		background: var(--color-bg-pure);
		border: 1px dashed var(--color-border-default);
		border-radius: 0.5rem;
		text-align: center;
	}

	.preview-gate :global(svg) {
		color: var(--color-fg-muted);
	}

	.preview-gate p {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--color-fg-muted);
	}

	.unlock-link {
		font-size: 0.8125rem;
		color: var(--color-primary);
		text-decoration: none;
		font-weight: 500;
	}

	.unlock-link:hover {
		text-decoration: underline;
	}

	/* Footer */
	.transcript-footer {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem;
		border-top: 1px solid var(--color-border-default);
		font-size: 0.75rem;
		color: var(--color-fg-muted);
	}

	/* Collapsed state */
	.transcript-panel.collapsed .panel-content {
		display: none;
	}

	/* Scrollbar */
	.segments-list::-webkit-scrollbar {
		width: 6px;
	}

	.segments-list::-webkit-scrollbar-track {
		background: var(--color-bg-surface);
	}

	.segments-list::-webkit-scrollbar-thumb {
		background: var(--color-border-default);
		border-radius: 3px;
	}

	.segments-list::-webkit-scrollbar-thumb:hover {
		background: var(--color-border-strong);
	}

	/* Mobile Responsive Styles */
	@media (max-width: 768px) {
		.panel-header {
			padding: 0.875rem 1rem;
		}

		.header-title {
			font-size: 0.875rem;
		}

		.segment-count {
			font-size: 0.6875rem;
		}

		.segments-list {
			max-height: 300px;
			padding: 0.375rem;
		}

		.segment {
			padding: 0.75rem;
			gap: 0.5rem;
			/* Larger touch target */
			min-height: 48px;
		}

		.segment-time {
			font-size: 0.6875rem;
			width: 36px;
		}

		.segment-text {
			font-size: 0.8125rem;
			line-height: 1.4;
		}

		.search-bar {
			padding: 0.625rem 0.875rem;
		}

		.search-input {
			font-size: 1rem; /* Prevent zoom on iOS */
		}

		.preview-gate {
			padding: 1.25rem;
			margin: 0.375rem;
		}

		.preview-gate p {
			font-size: 0.75rem;
		}

		.unlock-link {
			font-size: 0.75rem;
		}

		.transcript-footer {
			padding: 0.625rem;
			font-size: 0.6875rem;
		}
	}

	@media (max-width: 480px) {
		.segments-list {
			max-height: 250px;
		}

		.segment {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
		}

		.segment-time {
			width: auto;
			font-size: 0.625rem;
			color: var(--color-primary);
		}

		.segment-text {
			font-size: 0.8125rem;
		}
	}
</style>

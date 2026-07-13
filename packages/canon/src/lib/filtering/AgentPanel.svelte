<script lang="ts">
	/**
	 * AgentPanel
	 *
	 * Natural language input and agent reasoning display.
	 * Handles UI state; actual agent execution is done via callback.
	 */
	import Brain from 'lucide-svelte/icons/brain';
	import Wrench from 'lucide-svelte/icons/wrench';
	import BarChart3 from 'lucide-svelte/icons/bar-chart-3';
	import Check from 'lucide-svelte/icons/check';
	import CheckCircle from 'lucide-svelte/icons/check-circle';
	import type { AgentStep, FilterState } from './types.js';

	// Props
	export let onSubmit: (query: string) => void = () => {};
	export let isLoading: boolean = false;
	export let agentSteps: AgentStep[] = [];
	export let explanation: string = '';
	export let filterState: FilterState = {};
	export let exampleQueries: string[] = [
		'Show me chairs under $1,800',
		'I need a table for my living room',
		'What wooden furniture do you have?'
	];

	// Local state
	let query = '';
	let showReasoning = true;

	function handleSubmit() {
		if (!query.trim() || isLoading) return;
		onSubmit(query);
	}

	function setQuery(q: string) {
		query = q;
	}

	function formatPrice(cents: number): string {
		return `$${(cents / 100).toLocaleString()}`;
	}

	$: hasActiveFilters = Object.keys(filterState).length > 0;
</script>

<div class="agent-panel">
	<!-- Query Input -->
	<div class="panel-section">
		<h2 class="panel-title">Ask the Agent</h2>

		<form on:submit|preventDefault={handleSubmit} class="query-form">
			<textarea
				bind:value={query}
				placeholder="Describe what you're looking for..."
				rows="3"
				class="query-input"
				disabled={isLoading}
			></textarea>
			<div class="form-actions">
				<button type="submit" class="submit-btn" disabled={isLoading || !query.trim()}>
					{isLoading ? 'Thinking...' : 'Filter'}
				</button>
			</div>
		</form>

		<!-- Example Queries -->
		{#if exampleQueries.length > 0}
			<div class="examples">
				<span class="examples-label">Try:</span>
				{#each exampleQueries.slice(0, 3) as example}
					<button
						type="button"
						class="example-chip"
						on:click={() => setQuery(example)}
						disabled={isLoading}
					>
						{example}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Reasoning Display -->
	{#if agentSteps.length > 0 || explanation}
		<div class="panel-section reasoning-section">
			<div class="reasoning-header">
				<h3 class="panel-subtitle">Agent Reasoning</h3>
				<button
					type="button"
					class="toggle-btn"
					on:click={() => (showReasoning = !showReasoning)}
				>
					{showReasoning ? 'Hide' : 'Show'}
				</button>
			</div>

			{#if showReasoning}
				<div class="reasoning-steps">
					{#each agentSteps as step}
						<div class="step step-{step.type}">
							<span class="step-icon">
								{#if step.type === 'thinking'}
									<Brain size={16} />
								{:else if step.type === 'tool_call'}
									<Wrench size={16} />
								{:else if step.type === 'tool_result'}
									<BarChart3 size={16} />
								{:else}
									<Check size={16} />
								{/if}
							</span>
							<span class="step-content">{step.content}</span>
						</div>
					{/each}
					{#if explanation}
						<div class="step step-final">
							<span class="step-icon">
								<CheckCircle size={16} />
							</span>
							<span class="step-content">{explanation}</span>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Active Filters Display -->
	{#if hasActiveFilters}
		<div class="panel-section filters-section">
			<h3 class="panel-subtitle">Applied Filters</h3>
			<div class="active-filters">
				{#if filterState.categories}
					<span class="filter-tag">Categories: {filterState.categories.join(', ')}</span>
				{/if}
				{#if filterState.materials}
					<span class="filter-tag">Materials: {filterState.materials.join(', ')}</span>
				{/if}
				{#if filterState.priceMin || filterState.priceMax}
					<span class="filter-tag">
						Price: {filterState.priceMin ? formatPrice(filterState.priceMin) : 'any'} -
						{filterState.priceMax ? formatPrice(filterState.priceMax) : 'any'}
					</span>
				{/if}
				{#if filterState.statuses}
					<span class="filter-tag">Status: {filterState.statuses.join(', ')}</span>
				{/if}
				{#if filterState.searchQuery}
					<span class="filter-tag">Search: "{filterState.searchQuery}"</span>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.agent-panel {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-sm);
	}

	.panel-section {
		background: var(--color-performance-bg-subtle);
		padding: var(--space-performance-md);
		border-radius: var(--radius-performance-scale-sm);
	}

	.panel-title {
		font-size: var(--text-performance-caption);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-performance-fg-muted);
		margin: 0 0 var(--space-performance-sm);
	}

	.panel-subtitle {
		font-size: var(--text-performance-caption);
		font-weight: 500;
		color: var(--color-performance-fg-muted);
		margin: 0;
	}

	/* Query Form */
	.query-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
	}

	.query-input {
		width: 100%;
		padding: var(--space-performance-xs) var(--space-performance-sm);
		border-radius: var(--radius-performance-scale-sm);
		font-size: var(--text-performance-body-sm);
		font-family: inherit;
		resize: none;
		color: var(--color-performance-fg-primary);
	}

	.query-input:focus {
		outline: none;
		border-color: var(--color-performance-fg-secondary);
	}

	.query-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.form-actions {
		display: flex;
		gap: var(--space-performance-sm);
	}

	.submit-btn {
		flex: 1;
		padding: var(--space-performance-xs) var(--space-performance-sm);
		background: var(--color-performance-fg-secondary);
		color: var(--color-fg-inverse);
		border: none;
		border-radius: var(--radius-performance-scale-sm);
		font-size: var(--text-performance-caption);
		font-weight: 500;
		cursor: pointer;
		transition: background var(--duration-performance-micro);
	}

	.submit-btn:hover:not(:disabled) {
		background: var(--color-performance-fg-primary);
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Examples */
	.examples {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-performance-xs);
		align-items: center;
		margin-top: var(--space-performance-xs);
	}

	.examples-label {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}

	.example-chip {
		font-size: var(--text-performance-caption);
		padding: 4px var(--space-performance-sm);
		border-radius: var(--radius-xs);
		cursor: pointer;
		color: var(--color-performance-fg-secondary);
		transition: 
			border-color var(--duration-performance-fast) var(--ease-out),
			transform var(--duration-performance-fast) var(--ease-out),
			background var(--duration-performance-fast) var(--ease-out);
	}

	.example-chip:hover:not(:disabled) {
		border-color: var(--color-performance-fg-secondary);
		transform: translateY(-1px);
		background: var(--color-performance-bg-surface);
	}

	.example-chip:active:not(:disabled) {
		transform: translateY(0);
		transition-duration: var(--duration-performance-micro);
	}

	.example-chip:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Reasoning */
	.reasoning-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-performance-xs);
	}

	.toggle-btn {
		font-size: var(--text-performance-caption);
		padding: 2px var(--space-performance-xs);
		background: transparent;
		border-radius: var(--radius-xs);
		cursor: pointer;
		color: var(--color-performance-fg-muted);
		transition: all var(--duration-performance-fast) var(--ease-out);
	}

	.toggle-btn:hover {
		border-color: var(--color-performance-border-emphasis);
		color: var(--color-performance-fg-tertiary);
	}

	.reasoning-steps {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.step {
		display: flex;
		gap: var(--space-performance-xs);
		font-size: var(--text-performance-caption);
		padding: var(--space-performance-xs) var(--space-performance-sm);
		border-radius: var(--radius-xs);
		line-height: 1.4;
		animation: stepFadeIn var(--duration-normal) var(--ease-out);
	}

	@keyframes stepFadeIn {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.step-icon {
		flex-shrink: 0;
	}

	.step-content {
		color: var(--color-performance-fg-primary);
		line-height: 1.4;
	}

	.step-thinking {
		opacity: 0.7;
	}

	.step-tool_call {
		border-left: 2px solid var(--color-performance-fg-secondary);
	}

	.step-tool_result {
		background: var(--color-performance-bg-subtle);
	}

	.step-final {
		border-left: 2px solid var(--color-performance-success);
	}

	/* Active Filters */
	.active-filters {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-performance-xs);
		margin-top: var(--space-performance-xs);
	}

	.filter-tag {
		font-size: var(--text-performance-caption);
		padding: 4px var(--space-performance-sm);
		background: var(--color-performance-fg-tertiary);
		color: var(--color-performance-bg-pure);
		border-radius: var(--radius-xs);
		animation: tagFadeIn var(--duration-performance-fast) var(--ease-out);
	}

	@keyframes tagFadeIn {
		from {
			opacity: 0;
			transform: scale(0.9);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>

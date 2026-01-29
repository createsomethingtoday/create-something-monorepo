<script lang="ts">
	import { enhance } from '$app/forms';
	import { Bot, Plus, Play, Pause, Trash2, Edit2, Clock, CheckCircle, XCircle, ChevronDown, X, Loader2 } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showCreateModal = $state(false);
	let editingAgent = $state<string | null>(null);

	// Run agent state
	let runningAgentId = $state<string | null>(null);
	let executionResult = $state<{ success: boolean; response: string; steps: number; tokens_used: number } | null>(null);
	let showResultModal = $state(false);

	// Form state
	let formName = $state('');
	let formDescription = $state('');
	let formUserMessage = $state('');
	let formDatabases = $state<string[]>([]);
	let formSchedule = $state('');

	// Run agent function
	async function runAgent(agentId: string) {
		runningAgentId = agentId;
		executionResult = null;

		try {
			const response = await fetch(`/api/execute?agent_id=${agentId}`);
			const result = await response.json();
			executionResult = result;
			showResultModal = true;
		} catch (error) {
			executionResult = {
				success: false,
				response: error instanceof Error ? error.message : 'Unknown error',
				steps: 0,
				tokens_used: 0
			};
			showResultModal = true;
		} finally {
			runningAgentId = null;
		}
	}

	function closeResultModal() {
		showResultModal = false;
		executionResult = null;
	}

	function openCreateModal() {
		formName = '';
		formDescription = '';
		formUserMessage = '';
		formDatabases = [];
		formSchedule = '';
		showCreateModal = true;
	}

	function openEditModal(agent: typeof data.agents[0]) {
		if (!agent) return;
		formName = agent.name;
		formDescription = agent.description || '';
		formUserMessage = agent.user_message;
		formDatabases = JSON.parse(agent.databases || '[]');
		formSchedule = agent.schedule || '';
		editingAgent = agent.id;
	}

	function closeModal() {
		showCreateModal = false;
		editingAgent = null;
	}

	function toggleDatabase(dbId: string) {
		if (formDatabases.includes(dbId)) {
			formDatabases = formDatabases.filter(id => id !== dbId);
		} else {
			formDatabases = [...formDatabases, dbId];
		}
	}

	function formatDate(dateStr: string | null | undefined): string {
		if (!dateStr) return 'Never';
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	const scheduleOptions = [
		{ value: '', label: 'Manual only' },
		{ value: '0 8 * * *', label: 'Daily at 8 AM' },
		{ value: '0 9 * * 1', label: 'Weekly on Monday at 9 AM' },
		{ value: '0 0 1 * *', label: 'Monthly on the 1st' },
		{ value: '0 */6 * * *', label: 'Every 6 hours' }
	];
</script>

<svelte:head>
	<title>Dashboard | Notion Agent</title>
</svelte:head>

<div class="dashboard">
	<header class="dashboard-header">
		<div class="header-left">
			<h1>Your Agents</h1>
			<span class="agent-count">{data.agents.length} agent{data.agents.length !== 1 ? 's' : ''}</span>
		</div>
		<button class="create-btn" onclick={openCreateModal}>
			<Plus size={18} />
			<span>Create Agent</span>
		</button>
	</header>

	{#if data.agents.length === 0}
		<div class="empty-state">
			<Bot size={48} />
			<h2>No agents yet</h2>
			<p>Create your first agent to start automating your Notion workspace.</p>
			<button class="create-btn" onclick={openCreateModal}>
				<Plus size={18} />
				<span>Create Agent</span>
			</button>
		</div>
	{:else}
		<div class="agents-grid">
			{#each data.agents as agent}
				{#if agent}
					<div class="agent-card" class:disabled={!agent.enabled}>
						<div class="agent-header">
							<div class="agent-icon">
								<Bot size={20} />
							</div>
							<div class="agent-title">
								<h3>{agent.name}</h3>
								{#if agent.description}
									<p class="agent-description">{agent.description}</p>
								{/if}
							</div>
							<div class="agent-status" class:active={agent.enabled}>
								{agent.enabled ? 'Active' : 'Paused'}
							</div>
						</div>

						<div class="agent-prompt">
							<span class="prompt-label">Prompt:</span>
							<p class="prompt-text">{agent.user_message}</p>
						</div>

						<div class="agent-meta">
							<div class="meta-item">
								<Clock size={14} />
								<span>{agent.schedule || 'Manual'}</span>
							</div>
							<div class="meta-item">
								{#if agent.last_execution?.status === 'completed'}
									<CheckCircle size={14} class="success" />
								{:else if agent.last_execution?.status === 'failed'}
									<XCircle size={14} class="error" />
								{:else}
									<Clock size={14} />
								{/if}
								<span>Last run: {formatDate(agent.last_execution?.completed_at)}</span>
							</div>
							<div class="meta-item">
								<span>{agent.execution_count || 0} runs</span>
							</div>
						</div>

						<div class="agent-actions">
							<form method="POST" action="?/update" use:enhance>
								<input type="hidden" name="agent_id" value={agent.id} />
								<input type="hidden" name="name" value={agent.name} />
								<input type="hidden" name="user_message" value={agent.user_message} />
								<input type="hidden" name="databases" value={agent.databases} />
								<input type="hidden" name="enabled" value={agent.enabled ? 'false' : 'true'} />
								<button type="submit" class="action-btn" title={agent.enabled ? 'Pause' : 'Enable'}>
									{#if agent.enabled}
										<Pause size={16} />
									{:else}
										<Play size={16} />
									{/if}
								</button>
							</form>

							<button class="action-btn" onclick={() => openEditModal(agent)} title="Edit">
								<Edit2 size={16} />
							</button>

							<button 
								class="action-btn run-btn" 
								title="Run Now"
								onclick={() => runAgent(agent.id)}
								disabled={runningAgentId === agent.id}
							>
								{#if runningAgentId === agent.id}
									<Loader2 size={16} class="spinning" />
									<span>Running...</span>
								{:else}
									<Play size={16} />
									<span>Run</span>
								{/if}
							</button>

							<form method="POST" action="?/delete" use:enhance>
								<input type="hidden" name="agent_id" value={agent.id} />
								<button type="submit" class="action-btn delete-btn" title="Delete">
									<Trash2 size={16} />
								</button>
							</form>
						</div>
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<!-- Create/Edit Modal -->
{#if showCreateModal || editingAgent}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-overlay" onclick={closeModal}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>{editingAgent ? 'Edit Agent' : 'Create Agent'}</h2>
				<button class="close-btn" onclick={closeModal}>
					<X size={20} />
				</button>
			</div>

			<form method="POST" action={editingAgent ? '?/update' : '?/create'} use:enhance={() => {
				return async ({ result }) => {
					if (result.type === 'success') {
						closeModal();
						window.location.reload();
					}
				};
			}}>
				{#if editingAgent}
					<input type="hidden" name="agent_id" value={editingAgent} />
					<input type="hidden" name="enabled" value="true" />
				{/if}

				<div class="form-group">
					<label for="name">Name</label>
					<input type="text" id="name" name="name" bind:value={formName} required placeholder="e.g., Daily Task Summary" />
				</div>

				<div class="form-group">
					<label for="description">Description (optional)</label>
					<input type="text" id="description" name="description" bind:value={formDescription} placeholder="Brief description of what this agent does" />
				</div>

				<div class="form-group">
					<label for="user_message">Agent Prompt</label>
					<textarea id="user_message" name="user_message" bind:value={formUserMessage} required rows="4" placeholder="Describe what you want the agent to do...

Example: Every morning, summarize my incomplete tasks from the Projects database and create a daily priorities list."></textarea>
					<span class="help-text">This is your instruction to the agent. Be specific about what you want done.</span>
				</div>

				<div class="form-group">
					<label>Authorized Databases</label>
					<div class="database-selector">
						{#each data.databases as db}
							<label class="database-option" class:selected={formDatabases.includes(db.id)}>
								<input type="checkbox" checked={formDatabases.includes(db.id)} onchange={() => toggleDatabase(db.id)} />
								<span class="db-icon">{db.icon || '📋'}</span>
								<span class="db-name">{db.title}</span>
							</label>
						{/each}
						{#if data.databases.length === 0}
							<p class="no-databases">No databases found. Make sure to share databases with the Notion integration.</p>
						{/if}
					</div>
					<input type="hidden" name="databases" value={JSON.stringify(formDatabases)} />
				</div>

				<div class="form-group">
					<label for="schedule">Schedule</label>
					<select id="schedule" name="schedule" bind:value={formSchedule}>
						{#each scheduleOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>

				<div class="modal-actions">
					<button type="button" class="cancel-btn" onclick={closeModal}>Cancel</button>
					<button type="submit" class="submit-btn">
						{editingAgent ? 'Save Changes' : 'Create Agent'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Execution Result Modal -->
{#if showResultModal && executionResult}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-overlay" onclick={closeResultModal}>
		<div class="modal result-modal" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>Execution Result</h2>
				<button class="close-btn" onclick={closeResultModal}>
					<X size={20} />
				</button>
			</div>

			<div class="result-content">
				<div class="result-status" class:success={executionResult.success} class:error={!executionResult.success}>
					{#if executionResult.success}
						<CheckCircle size={24} />
						<span>Completed</span>
					{:else}
						<XCircle size={24} />
						<span>Failed</span>
					{/if}
				</div>

				<div class="result-response">
					<p>{executionResult.response}</p>
				</div>

				<div class="result-stats">
					<div class="stat">
						<span class="stat-label">Steps</span>
						<span class="stat-value">{executionResult.steps}</span>
					</div>
					<div class="stat">
						<span class="stat-label">Tokens</span>
						<span class="stat-value">{executionResult.tokens_used}</span>
					</div>
				</div>
			</div>

			<div class="modal-actions">
				<button class="submit-btn" onclick={closeResultModal}>Done</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.dashboard {
		padding: var(--space-lg);
		max-width: 1200px;
		margin: 0 auto;
	}

	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-lg);
	}

	.header-left {
		display: flex;
		align-items: baseline;
		gap: var(--space-sm);
	}

	.header-left h1 {
		font-size: var(--text-h2);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.agent-count {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* Empty State */
	.empty-state {
		text-align: center;
		padding: var(--space-xl);
		color: var(--color-fg-muted);
	}

	.empty-state h2 {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: var(--space-md) 0 var(--space-xs);
	}

	.empty-state p {
		margin-bottom: var(--space-lg);
	}

	/* Agents Grid */
	.agents-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
		gap: var(--space-md);
	}

	.agent-card {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.agent-card:hover {
		border-color: var(--color-fg-tertiary);
	}

	.agent-card.disabled {
		opacity: 0.6;
	}

	.agent-header {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}

	.agent-icon {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
		color: var(--notion-blue);
		flex-shrink: 0;
	}

	.agent-title {
		flex: 1;
	}

	.agent-title h3 {
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: 2px;
	}

	.agent-description {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.agent-status {
		padding: 2px var(--space-xs);
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		background: var(--color-fg-tertiary);
		color: var(--color-bg-base);
	}

	.agent-status.active {
		background: var(--color-success);
	}

	.agent-prompt {
		padding: var(--space-sm);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-md);
	}

	.prompt-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		display: block;
		margin-bottom: var(--space-xs);
	}

	.prompt-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		font-style: italic;
		line-height: var(--leading-relaxed);
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.agent-meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-md);
		margin-bottom: var(--space-md);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.meta-item :global(.success) {
		color: var(--color-success);
	}

	.meta-item :global(.error) {
		color: var(--color-error);
	}

	.agent-actions {
		display: flex;
		gap: var(--space-xs);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-subtle);
	}

	/* Action buttons - extend global styles from app.css */
	.action-btn {
		border: 1px solid var(--color-border-default);
		padding: var(--space-xs) var(--space-sm);
	}

	.action-btn:hover {
		background: var(--color-bg-subtle);
	}

	/* Modal */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: var(--color-overlay);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal {
		background: var(--color-bg-elevated);
		border-radius: var(--radius-lg);
		width: 90%;
		max-width: 600px;
		max-height: 90vh;
		overflow-y: auto;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-md);
		border-bottom: 1px solid var(--color-border-default);
	}

	.modal-header h2 {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: transparent;
		border: none;
		border-radius: var(--radius-md);
		color: var(--color-fg-muted);
		cursor: pointer;
	}

	.close-btn:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	.modal form {
		padding: var(--space-md);
	}

	.form-group {
		margin-bottom: var(--space-md);
	}

	.form-group label {
		display: block;
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.form-group input[type="text"],
	.form-group textarea,
	.form-group select {
		width: 100%;
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
	}

	.form-group input:focus,
	.form-group textarea:focus,
	.form-group select:focus {
		outline: none;
		border-color: var(--notion-blue);
	}

	.form-group textarea {
		resize: vertical;
		min-height: 100px;
	}

	.help-text {
		display: block;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-top: var(--space-xs);
	}

	.database-selector {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.database-option {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.database-option:hover {
		border-color: var(--color-fg-tertiary);
	}

	.database-option.selected {
		background: var(--notion-blue);
		border-color: var(--notion-blue);
		color: var(--color-bg-pure);
	}

	.database-option input {
		display: none;
	}

	.db-icon {
		font-size: var(--text-body-sm);
	}

	.db-name {
		font-size: var(--text-body-sm);
	}

	.no-databases {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-style: italic;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border-subtle);
	}

	/* Button styles from app.css (cancel-btn, submit-btn) */

	@media (max-width: 640px) {
		.agents-grid {
			grid-template-columns: 1fr;
		}
	}

	/* Spinning animation for loading state */
	:global(.spinning) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	/* Result modal */
	.result-modal {
		max-width: 500px;
	}

	.result-content {
		padding: var(--space-md);
	}

	.result-status {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-md);
	}

	.result-status.success {
		background: var(--color-success-muted);
		color: var(--color-success);
	}

	.result-status.error {
		background: var(--color-error-muted);
		color: var(--color-error);
	}

	.result-response {
		padding: var(--space-md);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-md);
	}

	.result-response p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		white-space: pre-wrap;
	}

	.result-stats {
		display: flex;
		gap: var(--space-lg);
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.stat-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-value {
		font-size: var(--text-h3);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		font-variant-numeric: tabular-nums;
	}
</style>

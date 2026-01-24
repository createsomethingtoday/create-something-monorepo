<script lang="ts">
	import { connection, connectionStatus } from '$lib/stores/connection';
	import { operationHistory } from '$lib/stores/operations';
	import { History, RefreshCw, X, Circle } from 'lucide-svelte';
	
	let showHistory = $state(false);
	
	function toggleHistory() {
		showHistory = !showHistory;
	}
	
	function formatTime(timestamp: number): string {
		return new Date(timestamp).toLocaleTimeString();
	}
</script>

<footer class="status-bar glass">
	<div class="status-left">
		<div class="connection-status">
			<span class="status-dot {$connectionStatus}"></span>
			<span class="status-text">
				{#if $connectionStatus === 'connected'}
					Connected
				{:else if $connectionStatus === 'connecting'}
					Connecting...
				{:else}
					Disconnected
				{/if}
			</span>
		</div>
		
		{#if $connection.watching}
			<span class="watching">
				Watching: <code>{$connection.watching}</code>
			</span>
		{/if}
	</div>
	
	<div class="status-right">
		<button 
			class="history-btn"
			class:active={showHistory}
			onclick={toggleHistory}
		>
			<History size={14} />
			<span>History ({$operationHistory.length})</span>
		</button>
		
		{#if $connectionStatus === 'disconnected'}
			<button 
				class="connect-btn"
				onclick={() => connection.connect()}
			>
				<RefreshCw size={14} />
				<span>Reconnect</span>
			</button>
		{/if}
	</div>
</footer>

{#if showHistory}
	<div class="history-panel glass">
		<header>
			<h4>Operation History</h4>
			<button class="close-btn" onclick={toggleHistory}>
				<X size={16} />
			</button>
		</header>
		<div class="history-list">
			{#each [...$operationHistory].reverse() as change}
				<div class="history-item">
					<span class="history-time">{formatTime(change.timestamp)}</span>
					<span class="history-path">{change.path}</span>
					<span class="history-ops">{change.operations.length} ops</span>
				</div>
			{:else}
				<div class="history-empty">No operations yet</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.status-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-xs) var(--space-sm);
		border-top: 1px solid var(--color-border-default);
		font-size: var(--text-caption);
	}
	
	.status-left,
	.status-right {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}
	
	.connection-status {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}
	
	.status-text {
		color: var(--color-fg-secondary);
	}
	
	.watching {
		color: var(--color-fg-muted);
	}
	
	.watching code {
		color: var(--color-fg-secondary);
		font-family: var(--font-mono);
	}
	
	.history-btn,
	.connect-btn {
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
	
	.history-btn:hover,
	.connect-btn:hover {
		background: var(--color-bg-surface);
		color: var(--color-fg-primary);
	}
	
	.history-btn.active {
		background: var(--color-info);
		border-color: var(--color-info);
		color: var(--color-fg-primary);
	}
	
	.connect-btn {
		background: var(--color-info);
		border-color: var(--color-info);
		color: var(--color-fg-primary);
	}
	
	.history-panel {
		position: absolute;
		bottom: 44px;
		right: var(--space-sm);
		width: 360px;
		max-height: 300px;
		border-radius: var(--radius-md);
		overflow: hidden;
		z-index: var(--z-modal);
	}
	
	.history-panel header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-xs) var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
	}
	
	.history-panel h4 {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
	}
	
	.history-panel header .close-btn {
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
	
	.history-panel header .close-btn:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}
	
	.history-list {
		max-height: 250px;
		overflow-y: auto;
	}
	
	.history-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-xs) var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
		font-size: var(--text-caption);
	}
	
	.history-item:last-child {
		border-bottom: none;
	}
	
	.history-time {
		color: var(--color-fg-muted);
		font-family: var(--font-mono);
		font-size: var(--text-overline);
	}
	
	.history-path {
		flex: 1;
		color: var(--color-fg-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	
	.history-ops {
		color: var(--color-info);
		font-size: var(--text-caption);
	}
	
	.history-empty {
		padding: var(--space-lg);
		text-align: center;
		color: var(--color-fg-muted);
	}
</style>

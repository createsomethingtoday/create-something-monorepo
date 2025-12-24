<script lang="ts">
	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	let { isOpen = false, onClose }: Props = $props();

	let settingsJson = $state<string | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let copied = $state(false);
	let showPreview = $state(false);

	async function loadSettings() {
		loading = true;
		error = null;
		settingsJson = null;

		try {
			const response = await fetch('/plugins/export');

			if (!response.ok) {
				throw new Error('Failed to load settings');
			}

			settingsJson = await response.text();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load settings';
			console.error('Error loading settings:', err);
		} finally {
			loading = false;
		}
	}

	async function copyToClipboard() {
		if (!settingsJson) return;

		try {
			await navigator.clipboard.writeText(settingsJson);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (err) {
			error = 'Failed to copy to clipboard';
			console.error('Error copying:', err);
		}
	}

	async function downloadAsFile() {
		if (!settingsJson) return;

		try {
			const blob = new Blob([settingsJson], { type: 'application/json' });
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'settings.json';
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
			onClose();
		} catch (err) {
			error = 'Failed to download file';
			console.error('Error downloading:', err);
		}
	}

	function handleOpen() {
		if (isOpen && !settingsJson) {
			loadSettings();
		}
	}

	$effect(() => {
		if (isOpen) {
			handleOpen();
		}
	});
</script>

{#if isOpen}
	<div class="modal-overlay" onclick={onClose}>
		<div class="modal-content" onclick={e => e.stopPropagation()}>
			<!-- Header -->
			<div class="modal-header">
				<h2 class="modal-title">Export Settings</h2>
				<button class="close-button" onclick={onClose} aria-label="Close modal">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
			</div>

			<!-- Description -->
			<div class="modal-description">
				<p>
					Download your enabled plugins as a <code>settings.json</code> file. You can import this into
					Claude Code to sync your plugin configuration across different environments.
				</p>

				<div class="instruction-box">
					<h3 class="instruction-title">How to use</h3>
					<ol class="instruction-list">
						<li>
							Copy the settings or download the file below
						</li>
						<li>
							Merge with your existing Claude Code settings file (typically at
							<code>~/.claude/settings.json</code>)
						</li>
						<li>
							Restart Claude Code to apply the new plugin configuration
						</li>
					</ol>
				</div>
			</div>

			<!-- Loading State -->
			{#if loading}
				<div class="loading-state">
					<div class="spinner"></div>
					<p>Loading your settings...</p>
				</div>
			{/if}

			<!-- Error State -->
			{#if error && !loading}
				<div class="error-message">
					<span class="error-icon">⚠</span>
					{error}
				</div>
			{/if}

			<!-- Settings Preview -->
			{#if settingsJson && !loading}
				<div class="settings-container">
					<div class="preview-toggle">
						<button
							class="toggle-btn"
							class:active={showPreview}
							onclick={() => (showPreview = !showPreview)}
						>
							{showPreview ? 'Hide' : 'Show'} JSON Preview
						</button>
					</div>

					{#if showPreview}
						<pre class="settings-preview"><code>{settingsJson}</code></pre>
					{/if}
				</div>
			{/if}

			<!-- Actions -->
			<div class="modal-actions">
				<button class="button-secondary" onclick={onClose}>
					Cancel
				</button>

				{#if settingsJson && !loading}
					<button
						class="button-secondary"
						onclick={copyToClipboard}
						class:copied
						disabled={copied}
					>
						{#if copied}
							✓ Copied
						{:else}
							Copy to Clipboard
						{/if}
					</button>

					<button class="button-primary" onclick={downloadAsFile}>
						Download File
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: var(--color-overlay);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
		padding: var(--space-md);
		animation: fadeIn var(--duration-standard) var(--ease-standard);
	}

	.modal-content {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		max-width: 700px;
		max-height: 90vh;
		overflow-y: auto;
		animation: slideUp var(--duration-standard) var(--ease-standard);
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-md);
	}

	.modal-title {
		font-size: var(--text-h2);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.close-button {
		background: none;
		border: none;
		color: var(--color-fg-secondary);
		cursor: pointer;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.close-button:hover {
		color: var(--color-fg-primary);
	}

	.modal-description {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		color: var(--color-fg-secondary);
		font-size: var(--text-body);
		line-height: 1.6;
	}

	.modal-description p {
		margin: 0;
	}

	code {
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
		padding: 2px 6px;
		color: var(--color-fg-primary);
		font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
		font-size: 0.9em;
	}

	.instruction-box {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-md);
	}

	.instruction-title {
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm) 0;
	}

	.instruction-list {
		margin: 0;
		padding-left: var(--space-md);
		color: var(--color-fg-secondary);
	}

	.instruction-list li {
		margin-bottom: var(--space-xs);
	}

	.instruction-list code {
		font-size: 0.85em;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-lg);
		color: var(--color-fg-secondary);
	}

	.spinner {
		width: 24px;
		height: 24px;
		border: 2px solid var(--color-border-default);
		border-top-color: var(--color-fg-primary);
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.error-message {
		background: rgba(212, 77, 77, 0.1);
		border: 1px solid var(--color-error-border);
		border-radius: var(--radius-md);
		padding: var(--space-md);
		color: var(--color-error);
		font-size: var(--text-body);
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.error-icon {
		font-size: 1.2em;
	}

	.settings-container {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.preview-toggle {
		display: flex;
		justify-content: flex-start;
	}

	.toggle-btn {
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.toggle-btn:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	.toggle-btn.active {
		background: var(--color-bg-surface);
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	.settings-preview {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-md);
		overflow-x: auto;
		font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.5;
		margin: 0;
		max-height: 300px;
		overflow-y: auto;
	}

	.settings-preview code {
		background: none;
		padding: 0;
		color: inherit;
		font-family: inherit;
		font-size: inherit;
	}

	.modal-actions {
		display: flex;
		gap: var(--space-md);
		justify-content: flex-end;
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border-default);
	}

	.button-secondary {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		color: var(--color-fg-primary);
		font-size: var(--text-body);
		font-weight: 500;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.button-secondary:hover:not(:disabled) {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}

	.button-secondary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.button-secondary.copied {
		border-color: var(--color-success);
		color: var(--color-success);
	}

	.button-primary {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-success);
		border: 1px solid var(--color-success);
		border-radius: var(--radius-lg);
		color: var(--color-bg-pure);
		font-size: var(--text-body);
		font-weight: 500;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.button-primary:hover {
		opacity: 0.9;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.modal-overlay,
		.modal-content,
		.spinner {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}

	@media (max-width: 640px) {
		.modal-content {
			padding: var(--space-md);
			gap: var(--space-md);
		}

		.modal-title {
			font-size: var(--text-h3);
		}

		.modal-actions {
			flex-direction: column;
			gap: var(--space-sm);
		}

		.button-secondary,
		.button-primary {
			width: 100%;
		}
	}
</style>

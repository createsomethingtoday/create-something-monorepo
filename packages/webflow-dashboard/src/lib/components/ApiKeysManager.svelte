<script lang="ts">
	import { Button, Card, CardHeader, CardTitle, CardContent, Input, Label, Badge } from './ui';
	import { Plus, CheckCircle, Key, Trash2, BookOpen, Upload } from 'lucide-svelte';

	interface ApiKey {
		keyId: string;
		keyName: string;
		keyPrefix: string;
		createdAt: string;
		expiresAt?: string;
		lastUsed?: string;
		scopes: string[];
		status: 'Active' | 'Revoked' | 'Expired';
		requestCount?: number;
	}

	let apiKeys = $state<ApiKey[]>([]);
	let isLoading = $state(true);
	let isGenerating = $state(false);
	let showGenerateForm = $state(false);
	let generatedKey = $state<{ apiKey: string; keyName: string; expiresAt: string } | null>(null);
	let copiedId = $state<string | null>(null);
	let error = $state<string | null>(null);

	// Form state
	let keyName = $state('');
	let scopes = $state<string[]>(['read:assets', 'read:profile']);

	// Load keys on mount
	$effect(() => {
		loadKeys();
	});

	async function loadKeys() {
		try {
			const response = await fetch('/api/keys');
			if (!response.ok) throw new Error('Failed to load API keys');
			const data = (await response.json()) as { keys: ApiKey[] };
			apiKeys = data.keys || [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load API keys';
		} finally {
			isLoading = false;
		}
	}

	async function handleGenerate() {
		if (!keyName.trim()) {
			error = 'Please enter a key name';
			return;
		}

		if (scopes.length === 0) {
			error = 'Please select at least one permission';
			return;
		}

		isGenerating = true;
		error = null;

		try {
			const response = await fetch('/api/keys/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ keyName: keyName.trim(), scopes })
			});

			if (!response.ok) {
				const errorData = (await response.json()) as { message?: string };
				throw new Error(errorData.message || 'Failed to generate API key');
			}

			const data = (await response.json()) as { apiKey: string; keyName: string; expiresAt: string };
			generatedKey = {
				apiKey: data.apiKey,
				keyName: data.keyName,
				expiresAt: data.expiresAt
			};
			showGenerateForm = false;
			keyName = '';
			await loadKeys();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to generate API key';
		} finally {
			isGenerating = false;
		}
	}

	async function handleRevoke(keyId: string) {
		if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
			return;
		}

		try {
			const response = await fetch('/api/keys/revoke', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ keyId })
			});

			if (!response.ok) throw new Error('Failed to revoke API key');
			await loadKeys();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to revoke API key';
		}
	}

	async function copyToClipboard(text: string, id: string) {
		try {
			await navigator.clipboard.writeText(text);
			copiedId = id;
			setTimeout(() => (copiedId = null), 2000);
		} catch {
			error = 'Failed to copy to clipboard';
		}
	}

	function toggleScope(scope: string) {
		if (scopes.includes(scope)) {
			scopes = scopes.filter((s) => s !== scope);
		} else {
			scopes = [...scopes, scope];
		}
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	const activeKeys = $derived(apiKeys.filter((k) => k.status === 'Active'));
</script>

<div class="api-keys-manager">
	<!-- Header -->
	<div class="header">
		<div class="header-info">
			<div class="header-title">
				<h3>API Keys</h3>
				<Badge variant="info">Beta</Badge>
			</div>
			<p class="header-description">Manage your API keys to access your templates programmatically</p>
		</div>
	<Button variant="default" onclick={() => (showGenerateForm = !showGenerateForm)}>
		<Plus size={16} />
		Generate New Key
	</Button>
	</div>

	{#if error}
		<div class="error-message">{error}</div>
	{/if}

	<!-- Generated Key Display -->
	{#if generatedKey}
		<Card class="success-card">
			<CardHeader>
			<CardTitle class="success-title">
				<CheckCircle size={20} />
				API Key Generated Successfully
			</CardTitle>
				<p class="success-warning">Copy this key now - you won't be able to see it again!</p>
			</CardHeader>
			<CardContent>
				<div class="generated-key">
					<Label>Your New API Key</Label>
					<div class="key-display">
						<input type="text" value={generatedKey.apiKey} readonly class="key-input" />
						<Button
							variant="secondary"
							onclick={() => copyToClipboard(generatedKey?.apiKey || '', 'generated')}
						>
							{copiedId === 'generated' ? '✓' : 'Copy'}
						</Button>
					</div>
				</div>
				<div class="generated-info">
					<div>
						<span class="info-label">Name:</span>
						<span class="info-value">{generatedKey.keyName}</span>
					</div>
					<div>
						<span class="info-label">Expires:</span>
						<span class="info-value">{formatDate(generatedKey.expiresAt)}</span>
					</div>
				</div>
				<Button variant="secondary" onclick={() => (generatedKey = null)} class="dismiss-btn">
					I've Saved This Key
				</Button>
			</CardContent>
		</Card>
	{/if}

	<!-- Generate Form -->
	{#if showGenerateForm && !generatedKey}
		<Card class="generate-form-card">
			<CardHeader>
				<CardTitle>Generate New API Key</CardTitle>
				<p class="form-description">Create a new API key to access your templates and profile data</p>
			</CardHeader>
			<CardContent>
				<div class="generate-form">
					<div class="form-field">
						<Label for="keyName">Key Name</Label>
						<Input
							id="keyName"
							type="text"
							bind:value={keyName}
							placeholder="e.g., My Webflow Site"
						/>
						<p class="field-hint">Choose a name to help you identify this key later</p>
					</div>

					<div class="form-field">
						<Label>Permissions</Label>
						<div class="scopes-list">
							<label class="scope-item">
								<input
									type="checkbox"
									checked={scopes.includes('read:assets')}
									onchange={() => toggleScope('read:assets')}
								/>
								<span>Read Templates & Assets</span>
							</label>
							<label class="scope-item">
								<input
									type="checkbox"
									checked={scopes.includes('read:profile')}
									onchange={() => toggleScope('read:profile')}
								/>
								<span>Read Profile</span>
							</label>
						</div>
					</div>

					<div class="form-actions">
						<Button variant="default" onclick={handleGenerate} disabled={isGenerating}>
							{isGenerating ? 'Generating...' : 'Generate Key'}
						</Button>
						<Button
							variant="secondary"
							onclick={() => {
								showGenerateForm = false;
								keyName = '';
							}}
						>
							Cancel
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Keys List -->
	<div class="keys-section">
		<h4 class="keys-title">Your API Keys</h4>

		{#if isLoading}
			<div class="loading">
				<div class="spinner"></div>
			</div>
		{:else if activeKeys.length === 0}
			<Card class="empty-card">
				<CardContent>
				<div class="empty-state">
					<Key size={48} strokeWidth={1.5} />
					<h3>No API Keys Yet</h3>
					<p>Generate your first API key to start accessing your templates programmatically</p>
					<Button variant="secondary" onclick={() => (showGenerateForm = true)}>
						Create Your First Key
					</Button>
				</div>
				</CardContent>
			</Card>
		{:else}
			<div class="keys-list">
				{#each activeKeys as key}
					<Card class="key-card">
						<CardContent>
							<div class="key-item">
								<div class="key-info">
									<div class="key-header">
									<div class="key-icon">
										<Key size={20} />
									</div>
										<div class="key-name">
											<h4>{key.keyName}</h4>
											<code class="key-prefix">{key.keyPrefix}••••••••</code>
										</div>
									</div>

									<div class="key-meta">
										<div class="meta-item">
											<span class="meta-label">Created</span>
											<span class="meta-value">{formatDate(key.createdAt)}</span>
										</div>
										<div class="meta-item">
											<span class="meta-label">Last Used</span>
											<span class="meta-value">{key.lastUsed ? formatDate(key.lastUsed) : 'Never'}</span>
										</div>
										<div class="meta-item">
											<span class="meta-label">Requests</span>
											<span class="meta-value">{key.requestCount || 0}</span>
										</div>
									</div>

									<div class="key-scopes">
										{#each key.scopes as scope}
											<Badge variant="default">{scope}</Badge>
										{/each}
									</div>
								</div>

							<Button variant="ghost" onclick={() => handleRevoke(key.keyId)} class="revoke-btn">
								<Trash2 size={16} />
							</Button>
							</div>
						</CardContent>
					</Card>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Quick Start Documentation -->
	<Card class="docs-card">
		<CardHeader>
		<CardTitle class="docs-title">
			<BookOpen size={20} />
			Quick Start Guide
		</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="docs-content">
				<div class="beta-notice">
					<Badge variant="info">Beta</Badge>
					<p>The Creator API is currently in beta. Features and endpoints may change based on feedback.</p>
				</div>

				<div class="docs-section">
					<h4>Using Your API Key</h4>
					<p>Include your API key in the Authorization header of your requests:</p>
				</div>

				<div class="code-example">
					<div class="code-header">
						<span>GET /api/v1/creator/profile</span>
					</div>
					<pre><code>curl -X GET "https://wf.createsomething.io/api/v1/creator/profile" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"</code></pre>
				</div>

				<div class="code-example">
					<div class="code-header">
						<span>GET /api/v1/creator/assets</span>
					</div>
					<pre><code>curl -X GET "https://wf.createsomething.io/api/v1/creator/assets" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"</code></pre>
				</div>
			</div>
		</CardContent>
	</Card>
</div>

<style>
	.api-keys-manager {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-md);
	}

	.header-title {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.header-title h3 {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
	}

	.header-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin: var(--space-xs) 0 0;
	}

	.error-message {
		padding: var(--space-sm);
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		border-radius: var(--radius-md);
		color: var(--color-error);
		font-size: var(--text-body-sm);
	}

	.success-card {
		border-color: var(--color-success-border);
		background: var(--color-success-muted);
	}

	.success-title {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		color: var(--color-success);
	}

	.success-warning {
		font-size: var(--text-body-sm);
		color: var(--color-success);
		margin: var(--space-xs) 0 0;
	}

	.generated-key {
		margin-bottom: var(--space-md);
	}

	.key-display {
		display: flex;
		gap: var(--space-sm);
		margin-top: var(--space-xs);
	}

	.key-input {
		flex: 1;
		padding: var(--space-sm);
		font-family: monospace;
		font-size: var(--text-body-sm);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
	}

	.generated-info {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-md);
		margin-bottom: var(--space-md);
	}

	.info-label {
		color: var(--color-fg-muted);
	}

	.info-value {
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.generate-form-card {
		border-color: var(--color-info-border);
	}

	.form-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: var(--space-xs) 0 0;
	}

	.generate-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.field-hint {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin: 0;
	}

	.scopes-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.scope-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		cursor: pointer;
	}

	.scope-item input {
		width: 1rem;
		height: 1rem;
		accent-color: var(--color-info);
	}

	.form-actions {
		display: flex;
		gap: var(--space-sm);
	}

	.keys-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.keys-title {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.loading {
		display: flex;
		justify-content: center;
		padding: var(--space-xl);
	}

	.spinner {
		width: 2rem;
		height: 2rem;
		border: 3px solid var(--color-border-default);
		border-top-color: var(--color-info);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: var(--space-xl);
		gap: var(--space-md);
		color: var(--color-fg-muted);
	}

	.empty-state h3 {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
	}

	.empty-state p {
		font-size: var(--text-body-sm);
		max-width: 20rem;
		margin: 0;
	}

	.keys-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.key-item {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-md);
	}

	.key-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.key-header {
		display: flex;
		align-items: center;
		gap: var(--space-md);
	}

	.key-icon {
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-info-muted);
		border-radius: var(--radius-lg);
		color: var(--color-info);
	}

	.key-name h4 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
	}

	.key-prefix {
		font-size: var(--text-caption);
		font-family: monospace;
		background: var(--color-bg-subtle);
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-sm);
		color: var(--color-fg-secondary);
	}

	.key-meta {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-md);
	}

	.meta-item {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.meta-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.meta-value {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.key-scopes {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.revoke-btn {
		color: var(--color-error);
	}

	.revoke-btn:hover {
		background: var(--color-error-muted);
	}

	.docs-card {
		background: var(--color-info-muted);
		border-color: var(--color-info-border);
	}

	.docs-title {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		color: var(--color-info);
	}

	.docs-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.beta-notice {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		padding: var(--space-sm);
		background: var(--color-info-muted);
		border: 1px solid var(--color-info-border);
		border-radius: var(--radius-md);
	}

	.beta-notice p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.docs-section h4 {
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs);
	}

	.docs-section p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.code-example {
		background: var(--color-bg-pure);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.code-header {
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border-bottom: 1px solid var(--color-border-default);
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
	}

	.code-example pre {
		margin: 0;
		padding: var(--space-md);
		overflow-x: auto;
	}

	.code-example code {
		font-family: monospace;
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
		white-space: pre;
	}
</style>

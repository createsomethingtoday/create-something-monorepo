<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { AccountPage } from '@create-something/canon/auth/components';
	import { onMount } from 'svelte';

	let { data } = $props();
	type AccountUser = { email?: string; name?: string; tier?: string } | null;
	const accountUser = $derived(data.user as AccountUser);

	type ManagedToken = {
		id: string;
		account_id: string;
		tenant_id: string;
		token_prefix: string;
		tool_mode: 'read_only' | 'read_write';
		toolkit_profile: string[];
		last_used_at: string | null;
		created_at: string;
		active: boolean;
	} | null;

	let token: ManagedToken = null;
	let busy = false;
	let issuedToken = '';
	let errorMessage = '';
	let successMessage = '';

	async function loadToken() {
		const response = await fetch('/api/me/mcp-token');
		const payload = await response.json().catch(() => ({}));
		if (!response.ok) {
			throw new Error(payload.message ?? 'Failed to load MCP token state');
		}
		token = payload.token ?? null;
	}

	async function runAction(
		url: string,
		successText: string,
		options: { method?: 'GET' | 'POST'; body?: Record<string, unknown> } = {},
	) {
		busy = true;
		errorMessage = '';
		successMessage = '';
		if (url !== '/api/me/mcp-token') {
			issuedToken = '';
		}

		try {
			const response = await fetch(url, {
				method: options.method ?? 'POST',
				headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
				body: options.body ? JSON.stringify(options.body) : undefined,
			});
			const payload = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(payload.message ?? 'Request failed');
			}
			if (typeof payload.token === 'string') {
				issuedToken = payload.token;
			}
			successMessage = successText;
			await loadToken();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Request failed';
		} finally {
			busy = false;
		}
	}

	onMount(async () => {
		try {
			await loadToken();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to load token state';
		}
	});
</script>

<SEO
	title="Account"
	description="Manage your CREATE SOMETHING AGENCY account"
	propertyName="agency"
	noindex={true}
/>

<AccountPage
	user={accountUser}
	pageTitle="Account | CREATE SOMETHING AGENCY"
	currentProperty="agency"
/>

<section class="token-section">
	<div class="token-card">
		<div class="token-header">
			<div>
				<h2>MCP Bearer Token</h2>
				<p>One managed bearer token per user. It is shown only when created or regenerated.</p>
			</div>
		</div>

		{#if token}
			<div class="token-metadata">
				<div><span>Prefix</span><strong>{token.token_prefix}</strong></div>
				<div><span>Account</span><strong>{token.account_id}</strong></div>
				<div><span>Tenant</span><strong>{token.tenant_id}</strong></div>
				<div><span>Mode</span><strong>{token.tool_mode}</strong></div>
				<div><span>Last used</span><strong>{token.last_used_at ?? 'Never'}</strong></div>
			</div>
		{:else}
			<p class="token-empty">No MCP bearer token has been issued for this account.</p>
		{/if}

		<div class="token-actions">
			<button disabled={busy || !!token} onclick={() => runAction('/api/me/mcp-token', 'MCP token created.')}>
				Create token
			</button>
			<button disabled={busy} class="secondary" onclick={() => runAction('/api/me/mcp-token/regenerate', 'MCP token regenerated. Existing hosts using the previous token will stop working.')}>
				Regenerate
			</button>
			<button disabled={busy || !token} class="secondary" onclick={() => runAction('/api/me/mcp-token/revoke', 'MCP token revoked.')}>
				Revoke
			</button>
		</div>

		{#if issuedToken}
			<div class="token-issued">
				<p>Copy this token now. It will not be shown again.</p>
				<code>{issuedToken}</code>
			</div>
		{/if}

		{#if successMessage}
			<p class="token-success">{successMessage}</p>
		{/if}

		{#if errorMessage}
			<p class="token-error">{errorMessage}</p>
		{/if}
	</div>
</section>

<style>
	.token-section {
		max-width: 960px;
		margin: 0 auto 4rem;
		padding: 0 1.5rem;
	}

	.token-card {
		border: 1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.12));
		border-radius: 20px;
		padding: 1.5rem;
		background: var(--color-surface-raised, rgba(255, 255, 255, 0.03));
	}

	.token-header h2 {
		margin: 0 0 0.5rem;
	}

	.token-header p,
	.token-empty {
		margin: 0;
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.72));
	}

	.token-metadata {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1rem;
		margin: 1.5rem 0;
	}

	.token-metadata div {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.token-metadata span {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
	}

	.token-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 1.5rem;
	}

	.token-actions button {
		border: 0;
		border-radius: 999px;
		padding: 0.8rem 1.2rem;
		font: inherit;
		font-weight: 600;
		background: var(--color-fg-primary, #fff);
		color: var(--color-bg-pure, #000);
		cursor: pointer;
	}

	.token-actions button.secondary {
		background: transparent;
		color: var(--color-fg-primary, #fff);
		border: 1px solid var(--color-border-emphasis, rgba(255, 255, 255, 0.16));
	}

	.token-actions button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.token-issued {
		margin-top: 1.5rem;
		padding: 1rem;
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.04);
	}

	.token-issued p {
		margin: 0 0 0.75rem;
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.72));
	}

	.token-issued code {
		display: block;
		overflow-wrap: anywhere;
		font-size: 0.95rem;
	}

	.token-success,
	.token-error {
		margin-top: 1rem;
	}

	.token-success {
		color: #8fd19e;
	}

	.token-error {
		color: #ff9d9d;
	}
</style>

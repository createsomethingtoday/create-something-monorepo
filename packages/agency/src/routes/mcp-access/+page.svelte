<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { onMount } from 'svelte';

	let { data } = $props();

	type ManagedToken = {
		id: string;
		account_id: string;
		tenant_id: string;
		token_prefix: string;
		tool_mode: 'read_only' | 'read_write';
		toolkit_profile: string[];
		allowed_tool_prefixes: string[];
		last_used_at: string | null;
		created_at: string;
		active: boolean;
	} | null;

	type TokenPayload = { token?: ManagedToken; message?: string };
	type ActionPayload = {
		token?: string;
		message?: string;
		allowed_tool_prefixes?: string[];
		toolkit_profile?: string[];
	};
	type OAuthPasswordPayload = {
		email: string | null;
		auth_subject: string | null;
		account_id: string | null;
		tenant_id: string | null;
		has_password: boolean;
		email_verified: boolean;
		identity_user_exists: boolean;
		entitlement?: {
			allowed: boolean;
			reason: string;
		};
		message?: string;
	};

	type HostId = 'codex' | 'claude' | 'cursor';

	const hostOptions: Array<{ id: HostId; label: string; urlExample: string }> = [
		{ id: 'codex', label: 'Codex', urlExample: 'https://YOUR-MCP-URL/mcp' },
		{ id: 'claude', label: 'Claude Desktop', urlExample: 'https://YOUR-MCP-URL/mcp' },
		{ id: 'cursor', label: 'Cursor', urlExample: 'https://YOUR-MCP-URL/mcp' }
	];

	let token = $state<ManagedToken>(null);
	let busy = $state(false);
	let revealedToken = $state('');
	let errorMessage = $state('');
	let successMessage = $state('');
	let copiedState = $state('');
	let passwordBusy = $state(false);
	let passwordError = $state('');
	let passwordSuccess = $state('');
	let oauthPassword = $state<OAuthPasswordPayload | null>(null);
	let newPassword = $state('');
	let confirmPassword = $state('');
	let selectedHost = $state<HostId>('codex');

	const activeHost = $derived(hostOptions.find((host) => host.id === selectedHost) ?? hostOptions[0]);
	const tokenModeLabel = $derived(token?.tool_mode === 'read_write' ? 'Read + write' : 'Read only');
	const productState = $derived(
		token
			? 'This token remains valid only while Stripe-backed billing and `.agency` policy controls keep the account entitled. Observability systems such as Braintrust are operational support, not the paid product gate.'
			: 'Once issued, this token becomes your single portable credential for approved `.agency` MCP access.'
	);
	const tokenValue = $derived(revealedToken || 'PASTE_YOUR_BEARER_TOKEN_HERE');
	const codexSnippet = $derived(`\
[mcp_servers.create_something]
url = "${activeHost.urlExample}"
bearer_token = "${tokenValue}"`);
	const claudeSnippet = $derived(`\
{
  "mcpServers": {
    "create-something": {
      "url": "${activeHost.urlExample}",
      "headers": {
        "Authorization": "Bearer ${tokenValue}"
      }
    }
  }
}`);
	const cursorSnippet = $derived(`\
{
  "mcpServers": {
    "create-something": {
      "url": "${activeHost.urlExample}",
      "headers": {
        "Authorization": "Bearer ${tokenValue}"
      }
    }
  }
}`);
	const activeSnippet = $derived(
		selectedHost === 'codex' ? codexSnippet : selectedHost === 'claude' ? claudeSnippet : cursorSnippet
	);
	const passwordActionLabel = $derived(oauthPassword?.has_password ? 'Rotate password' : 'Set password');
	const oauthLoginStatus = $derived(
		oauthPassword?.has_password
			? 'A password is already initialized for ChatGPT OAuth login.'
			: 'No MCP OAuth password is initialized yet.'
	);

	async function loadToken() {
		const response = await fetch('/api/me/mcp-token');
		const payload = (await response.json().catch(() => ({}))) as TokenPayload;
		if (!response.ok) {
			throw new Error(payload.message ?? 'Failed to load MCP token state');
		}
		token = payload.token ?? null;
	}

	async function loadOAuthPassword() {
		const response = await fetch('/api/me/mcp-oauth-password');
		const payload = (await response.json().catch(() => ({}))) as OAuthPasswordPayload & { message?: string };
		if (!response.ok) {
			throw new Error(payload.message ?? 'Failed to load MCP OAuth password state');
		}
		oauthPassword = payload;
	}

	async function runAction(
		url: string,
		successText: string,
		options: { method?: 'GET' | 'POST'; body?: Record<string, unknown> } = {}
	) {
		busy = true;
		errorMessage = '';
		successMessage = '';
		copiedState = '';
		if (url !== '/api/me/mcp-token') {
			revealedToken = '';
		}

		try {
			const response = await fetch(url, {
				method: options.method ?? 'POST',
				headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
				body: options.body ? JSON.stringify(options.body) : undefined
			});
			const payload = (await response.json().catch(() => ({}))) as ActionPayload;
			if (!response.ok) {
				throw new Error(payload.message ?? 'Request failed');
			}
			if (typeof payload.token === 'string') {
				revealedToken = payload.token;
			}
			successMessage = successText;
			await loadToken();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Request failed';
		} finally {
			busy = false;
		}
	}

	async function copyText(value: string, label: string) {
		try {
			await navigator.clipboard.writeText(value);
			copiedState = `${label} copied.`;
		} catch {
			copiedState = `Copy failed for ${label}.`;
		}
	}

	async function updateOAuthPassword() {
		passwordBusy = true;
		passwordError = '';
		passwordSuccess = '';

		try {
			if (newPassword.length < 12) {
				throw new Error('Password must be at least 12 characters.');
			}
			if (newPassword !== confirmPassword) {
				throw new Error('Passwords do not match.');
			}

			const response = await fetch('/api/me/mcp-oauth-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password: newPassword })
			});
			const payload = (await response.json().catch(() => ({}))) as OAuthPasswordPayload & {
				message?: string;
			};
			if (!response.ok) {
				throw new Error(payload.message ?? 'Failed to update MCP OAuth password');
			}
			oauthPassword = payload;
			passwordSuccess = payload.message ?? 'MCP OAuth password updated.';
			newPassword = '';
			confirmPassword = '';
		} catch (error) {
			passwordError = error instanceof Error ? error.message : 'Failed to update password';
		} finally {
			passwordBusy = false;
		}
	}

	onMount(async () => {
		try {
			await Promise.all([loadToken(), loadOAuthPassword()]);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to load token state';
		}
	});
</script>

<SEO
	title="MCP Access"
	description="Issue, rotate, copy, and govern your personal CREATE SOMETHING .agency MCP bearer token."
	propertyName="agency"
	noindex={true}
/>

<section class="access-shell">
	<div class="access-inner">
		<header class="hero">
			<p class="eyebrow">Operator Access</p>
			<h1>MCP Access</h1>
			<p class="lede">
				Your `.agency` credentials live in three separate lanes: Auth0 signs you into the portal, the bearer
				token connects MCP hosts like Codex or Claude, and the ChatGPT connection password is used only on the
				ChatGPT authorize screen.
			</p>
		</header>

		<div class="grid">
			<article class="card token-card">
				<div class="card-header">
					<div>
						<h2>Personal Bearer Token</h2>
						<p>One active token per authenticated user. This is the credential you paste into an MCP host. Raw token material is shown only on creation or regeneration.</p>
					</div>
					<a href="/security" class="inline-link">Security model</a>
				</div>

				{#if token}
					<div class="metadata-grid">
						<div><span>Prefix</span><strong>{token.token_prefix}</strong></div>
						<div><span>Access mode</span><strong>{tokenModeLabel}</strong></div>
						<div><span>Account</span><strong>{token.account_id}</strong></div>
						<div><span>Tenant</span><strong>{token.tenant_id}</strong></div>
						<div><span>Created</span><strong>{token.created_at}</strong></div>
						<div><span>Last used</span><strong>{token.last_used_at ?? 'Never'}</strong></div>
					</div>
				{:else}
					<p class="empty-state">No MCP bearer token has been issued for this account.</p>
				{/if}

				<div class="actions">
					<button disabled={busy || !!token} onclick={() => runAction('/api/me/mcp-token', 'MCP token created and ready to copy.')}>
						Create token
					</button>
					<button disabled={busy} class="secondary" onclick={() => runAction('/api/me/mcp-token/regenerate', 'MCP token regenerated. Existing hosts using the previous token will stop working.')}>
						Regenerate + Reveal
					</button>
					<button disabled={busy || !token} class="secondary" onclick={() => runAction('/api/me/mcp-token/revoke', 'MCP token revoked.')}>
						Revoke
					</button>
				</div>

				{#if revealedToken}
					<div class="reveal-panel">
						<div class="reveal-header">
							<div>
								<h3>Token revealed</h3>
								<p>Copy this now. The current token cannot be re-shown later without regeneration.</p>
							</div>
							<button class="secondary small" type="button" onclick={() => copyText(revealedToken, 'Bearer token')}>
								Copy token
							</button>
						</div>
						<code>{revealedToken}</code>
					</div>
				{:else if token}
					<div class="note-panel">
						<p>Current token exists but is not re-readable. Regenerate it if you need to reveal a fresh value for a new host.</p>
					</div>
				{/if}

				{#if successMessage}
					<p class="success">{successMessage}</p>
				{/if}
				{#if errorMessage}
					<p class="error">{errorMessage}</p>
				{/if}
				{#if copiedState}
					<p class="muted-feedback">{copiedState}</p>
				{/if}
			</article>

			<article class="card token-card">
				<div class="card-header">
					<div>
						<h2>ChatGPT Connection Password</h2>
						<p>
							This is the password you type into the ChatGPT authorize page. It is only for the ChatGPT
							connection flow. It is separate from your Auth0 portal login and separate from your bearer token.
						</p>
					</div>
					<a href="/security" class="inline-link">Identity model</a>
				</div>

				<div class="metadata-grid">
					<div><span>Email</span><strong>{oauthPassword?.email ?? data.user?.email ?? 'Unavailable'}</strong></div>
					<div><span>Account</span><strong>{oauthPassword?.account_id ?? 'Unlinked'}</strong></div>
					<div><span>Tenant</span><strong>{oauthPassword?.tenant_id ?? 'Unlinked'}</strong></div>
					<div><span>Status</span><strong>{oauthLoginStatus}</strong></div>
				</div>

				<div class="note-panel">
					<p>
						Use this email address on the ChatGPT authorize screen. Stored passwords are never re-shown.
						Setting or rotating this password does not rotate your bearer token and does not change your
						Auth0 portal login.
					</p>
				</div>

				<div class="form-stack">
					<label>
						New password
						<input
							type="password"
							bind:value={newPassword}
							autocomplete="new-password"
							minlength="12"
							placeholder="Minimum 12 characters"
						/>
					</label>
					<label>
						Confirm password
						<input
							type="password"
							bind:value={confirmPassword}
							autocomplete="new-password"
							minlength="12"
							placeholder="Re-enter password"
						/>
					</label>
				</div>

				<div class="actions">
					<button disabled={passwordBusy} onclick={updateOAuthPassword}>
						{passwordActionLabel}
					</button>
				</div>

				{#if passwordSuccess}
					<p class="success">{passwordSuccess}</p>
				{/if}
				{#if passwordError}
					<p class="error">{passwordError}</p>
				{/if}
			</article>

			<article class="card">
				<div class="card-header">
					<div>
						<h2>Managed Access Scope</h2>
						<p>What this token is allowed to do right now, based on live `.agency` entitlement state.</p>
					</div>
					<a href="/bearer-token-policy" class="inline-link">Policy</a>
				</div>

				<div class="scope-block">
					<div>
						<span>Current product posture</span>
						<p>{productState}</p>
					</div>
					<div>
						<span>Toolkit profile</span>
						{#if token?.toolkit_profile?.length}
							<ul class="pill-list">
								{#each token.toolkit_profile as toolkit}
									<li>{toolkit}</li>
								{/each}
							</ul>
						{:else}
							<p class="empty-inline">No toolkit profile has been attached yet.</p>
						{/if}
					</div>
					<div>
						<span>Allowed tool prefixes</span>
						{#if token?.allowed_tool_prefixes?.length}
							<ul class="pill-list">
								{#each token.allowed_tool_prefixes as prefix}
									<li>{prefix}</li>
								{/each}
							</ul>
						{:else}
							<p class="empty-inline">Tool visibility will appear here once the entitlement broker assigns concrete MCP prefixes.</p>
						{/if}
					</div>
				</div>
			</article>

			<article class="card full-span">
				<div class="card-header">
					<div>
						<h2>Host Setup</h2>
						<p>Use the same personal token in approved hosts. Replace the MCP URL with the endpoint provisioned for your account.</p>
					</div>
				</div>

				<div class="host-tabs">
					{#each hostOptions as host}
						<button
							type="button"
							class:active={selectedHost === host.id}
							class="host-tab"
							onclick={() => {
								selectedHost = host.id;
								copiedState = '';
							}}
						>
							{host.label}
						</button>
					{/each}
				</div>

				<div class="snippet-meta">
					<div>
						<span>MCP URL placeholder</span>
						<strong>{activeHost.urlExample}</strong>
					</div>
					<button class="secondary small" type="button" onclick={() => copyText(activeSnippet, `${activeHost.label} snippet`)}>
						Copy snippet
					</button>
				</div>

				<pre><code>{activeSnippet}</code></pre>

				<p class="footnote">
					`.agency` is the user-facing credential broker. Auth0 proves identity. Runtime secrets and service keys remain in managed infrastructure such as Infisical. Stripe billing state and policy acceptance are the product-side controls that keep paid MCP access active.
				</p>
			</article>
		</div>
	</div>
</section>

<style>
	.access-shell {
		padding: 3rem 1.5rem 5rem;
	}

	.access-inner {
		max-width: 1180px;
		margin: 0 auto;
	}

	.hero {
		margin-bottom: 2rem;
		max-width: 54rem;
	}

	.eyebrow {
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.75rem;
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		margin-bottom: 1rem;
	}

	h1 {
		font-size: clamp(2.4rem, 4vw, 4.4rem);
		margin: 0 0 0.9rem;
	}

	.lede {
		font-size: 1.05rem;
		line-height: 1.75;
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1.25rem;
	}

	.card {
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 24px;
		padding: 1.5rem;
		background:
			radial-gradient(circle at top left, rgba(34, 197, 94, 0.08), transparent 34%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.015)),
			rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(10px);
	}

	.full-span {
		grid-column: 1 / -1;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 1.25rem;
	}

	.card-header h2,
	.reveal-header h3 {
		margin: 0 0 0.4rem;
	}

	.card-header p,
	.reveal-header p,
	.empty-state,
	.empty-inline,
	.footnote,
	.note-panel p {
		margin: 0;
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.72));
		line-height: 1.65;
	}

	.inline-link {
		color: var(--color-fg-primary, #fff);
		text-decoration: none;
		font-size: 0.95rem;
		white-space: nowrap;
	}

	.metadata-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1rem;
		margin: 1.25rem 0 0;
	}

	.metadata-grid div,
	.scope-block > div,
	.snippet-meta > div {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.metadata-grid span,
	.scope-block span,
	.snippet-meta span {
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-size: 0.76rem;
		color: rgba(255, 255, 255, 0.55);
	}

	.actions,
	.host-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 1.5rem;
	}

	.form-stack {
		display: grid;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.form-stack label {
		display: grid;
		gap: 0.45rem;
		font-size: 0.92rem;
		color: rgba(255, 255, 255, 0.82);
	}

	.form-stack input {
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(8, 10, 12, 0.72);
		color: #fff;
		padding: 0.9rem 1rem;
		font: inherit;
	}

	button,
	.host-tab {
		border: 0;
		border-radius: 999px;
		padding: 0.82rem 1.2rem;
		font: inherit;
		font-weight: 600;
		background: #f4f0e6;
		color: #111;
		cursor: pointer;
	}

	.secondary {
		background: transparent;
		color: #fff;
		border: 1px solid rgba(255, 255, 255, 0.16);
	}

	.small {
		padding: 0.62rem 0.95rem;
		font-size: 0.92rem;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.reveal-panel,
	.note-panel {
		margin-top: 1.5rem;
		padding: 1rem;
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.reveal-header,
	.snippet-meta {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 0.9rem;
	}

	code,
	pre {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	}

	.reveal-panel code {
		display: block;
		overflow-wrap: anywhere;
		font-size: 0.94rem;
	}

	.scope-block {
		display: grid;
		gap: 1.25rem;
	}

	.pill-list {
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
		padding: 0;
		margin: 0;
	}

	.pill-list li {
		border-radius: 999px;
		padding: 0.45rem 0.8rem;
		background: rgba(255, 255, 255, 0.07);
		color: rgba(255, 255, 255, 0.92);
		font-size: 0.9rem;
	}

	.host-tab {
		background: rgba(255, 255, 255, 0.06);
		color: rgba(255, 255, 255, 0.92);
		border: 1px solid transparent;
	}

	.host-tab.active {
		background: #f4f0e6;
		color: #111;
	}

	pre {
		margin: 0;
		padding: 1rem;
		border-radius: 16px;
		background: rgba(8, 10, 12, 0.92);
		border: 1px solid rgba(255, 255, 255, 0.08);
		overflow-x: auto;
	}

	.success {
		color: #8fd19e;
		margin-top: 1rem;
	}

	.error {
		color: #ff9d9d;
		margin-top: 1rem;
	}

	.muted-feedback {
		color: rgba(255, 255, 255, 0.7);
		margin-top: 0.75rem;
	}

	@media (max-width: 860px) {
		.grid {
			grid-template-columns: 1fr;
		}

		.reveal-header,
		.card-header,
		.snippet-meta {
			flex-direction: column;
		}
	}
</style>

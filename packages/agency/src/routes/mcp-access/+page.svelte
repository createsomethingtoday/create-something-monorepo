<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { FactList, ReportSection, ReportShell, SummaryItem } from '$lib/components/access';

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
		{ id: 'cursor', label: 'Cursor', urlExample: 'https://YOUR-MCP-URL/mcp' },
	];

	let token = $state<ManagedToken>(data.access.token ?? null);
	let busy = $state(false);
	let revealedToken = $state('');
	let errorMessage = $state(data.access.tokenAvailable ? '' : (data.access.tokenError ?? ''));
	let successMessage = $state('');
	let copiedState = $state('');
	let passwordBusy = $state(false);
	let passwordError = $state(data.access.password.available ? '' : (data.access.password.error ?? ''));
	let passwordSuccess = $state('');
	let oauthPassword = $state<OAuthPasswordPayload | null>({
		email: data.access.password.email,
		auth_subject: data.user.id,
		account_id: data.entitlement.accountId,
		tenant_id: data.entitlement.tenantId,
		has_password: data.access.password.hasPassword,
		email_verified: data.access.password.emailVerified,
		identity_user_exists: data.access.password.identityUserExists,
		entitlement: data.entitlement.decision,
	});
	let newPassword = $state('');
	let confirmPassword = $state('');
	let selectedHost = $state<HostId>('codex');

	const activeHost = $derived(hostOptions.find((host) => host.id === selectedHost) ?? hostOptions[0]);
	const tokenModeLabel = $derived(token?.tool_mode === 'read_write' ? 'Read + write' : 'Read only');
	const tokenStatus = $derived(
		!data.entitlement.accountId || !data.entitlement.tenantId
			? 'Not provisioned yet'
			: token?.active
				? 'Token active'
				: 'No token issued',
	);
	const passwordStatus = $derived(
		!data.entitlement.accountId || !data.entitlement.tenantId
			? 'Not provisioned yet'
			: oauthPassword?.has_password
				? 'Password set'
				: 'Password not set',
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
		selectedHost === 'codex' ? codexSnippet : selectedHost === 'claude' ? claudeSnippet : cursorSnippet,
	);
	const passwordActionLabel = $derived(oauthPassword?.has_password ? 'Rotate password' : 'Set password');
	const tokenFacts = $derived([
		{ label: 'Status', value: tokenStatus },
		{ label: 'Account', value: token?.account_id ?? data.entitlement.accountId ?? 'Not linked' },
		{ label: 'Tenant', value: token?.tenant_id ?? data.entitlement.tenantId ?? 'Not linked' },
		{ label: 'Prefix', value: token?.token_prefix ?? 'Not issued' },
		{ label: 'Access Mode', value: token ? tokenModeLabel : 'Not issued' },
		{ label: 'Last Used', value: token?.last_used_at ?? 'Never' },
	]);
	const passwordFacts = $derived([
		{ label: 'Email', value: oauthPassword?.email ?? data.user.email },
		{ label: 'Account', value: oauthPassword?.account_id ?? data.entitlement.accountId ?? 'Not linked' },
		{ label: 'Tenant', value: oauthPassword?.tenant_id ?? data.entitlement.tenantId ?? 'Not linked' },
		{ label: 'Status', value: passwordStatus },
		{ label: 'Email Verified', value: oauthPassword?.email_verified ? 'Yes' : 'No' },
	]);
	const identityFacts = $derived([
		{ label: 'Auth Subject', value: data.user.id },
		{ label: 'Account ID', value: data.entitlement.accountId ?? 'Not linked' },
		{ label: 'Tenant ID', value: data.entitlement.tenantId ?? 'Not linked' },
		{ label: 'Access Reason', value: data.entitlement.decision.reason.replace(/_/g, ' ') },
	]);

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
			throw new Error(payload.message ?? 'Failed to load MCP password state');
		}
		oauthPassword = payload;
	}

	async function runAction(
		url: string,
		successText: string,
		options: { method?: 'GET' | 'POST'; body?: Record<string, unknown> } = {},
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
				body: options.body ? JSON.stringify(options.body) : undefined,
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
				body: JSON.stringify({ password: newPassword }),
			});
			const payload = (await response.json().catch(() => ({}))) as OAuthPasswordPayload & {
				message?: string;
			};
			if (!response.ok) {
				throw new Error(payload.message ?? 'Failed to update MCP password');
			}
			oauthPassword = payload;
			passwordSuccess = payload.message ?? 'ChatGPT connection password updated.';
			newPassword = '';
			confirmPassword = '';
		} catch (error) {
			passwordError = error instanceof Error ? error.message : 'Failed to update password';
		} finally {
			passwordBusy = false;
		}
	}
</script>

<SEO
	title="MCP Access"
	description="Issue, rotate, copy, and govern your personal CREATE SOMETHING .agency MCP bearer token."
	propertyName="agency"
	noindex={true}
/>

<ReportShell
	eyebrow="Operator Access"
	title="MCP Access"
	lede="Your `.agency` credentials live in three separate lanes: Auth0 signs you into the portal, the bearer token connects MCP hosts like Codex or Claude, and the ChatGPT connection password is used only on the ChatGPT authorize screen."
	sideLabel="Signed in as"
	sideValue={data.user.email}
	sideMeta={`Account ${data.entitlement.accountId ?? 'Not linked'} · Tenant ${data.entitlement.tenantId ?? 'Not linked'}`}
>
	<svelte:fragment slot="summary">
		<SummaryItem label="Bearer Token" value={tokenStatus} note={token?.token_prefix ? `Prefix ${token.token_prefix}` : 'Managed bearer token'} />
		<SummaryItem label="ChatGPT Password" value={passwordStatus} note={oauthPassword?.email ?? data.user.email} />
		<SummaryItem label="Identity Mapping" value={data.entitlement.accountId ?? 'Not linked'} note={data.entitlement.tenantId ?? 'No tenant linked'} />
		<SummaryItem
			label="Portal Identity"
			value="Auth0"
			note="Portal login stays separate from token issuance and ChatGPT authorization."
		/>
	</svelte:fragment>

	<ReportSection
		title="Personal Bearer Token"
		description="One active token per authenticated user. This is the credential you paste into an MCP host. Raw token material is shown only on creation or regeneration."
		href="/security"
		actionLabel="Security model"
	>
		<FactList items={tokenFacts} />

		<div class="actions">
			<button disabled={busy || !!token} onclick={() => runAction('/api/me/mcp-token', 'MCP token created and ready to copy.')}>
				Create token
			</button>
			<button
				disabled={busy}
				class="secondary"
				onclick={() =>
					runAction(
						'/api/me/mcp-token/regenerate',
						'MCP token regenerated. Existing hosts using the previous token will stop working.',
					)}
			>
				Regenerate + Reveal
			</button>
			<button
				disabled={busy || !token}
				class="secondary"
				onclick={() => runAction('/api/me/mcp-token/revoke', 'MCP token revoked.')}
			>
				Revoke
			</button>
		</div>

		{#if revealedToken}
			<div class="reveal-panel">
				<div class="panel-head">
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
			<p class="note-copy">Current token exists but is not re-readable. Regenerate it if you need to reveal a fresh value for a new host.</p>
		{/if}

		{#if successMessage}
			<p class="feedback success">{successMessage}</p>
		{/if}
		{#if errorMessage}
			<p class="feedback error">{errorMessage}</p>
		{/if}
		{#if copiedState}
			<p class="feedback">{copiedState}</p>
		{/if}
	</ReportSection>

	<ReportSection
		title="ChatGPT Connection Password"
		description="This is the password you type into the ChatGPT authorize page. It is separate from your Auth0 portal login and separate from your bearer token."
		href="/security"
		actionLabel="Identity model"
	>
		<FactList items={passwordFacts} />

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
			<p class="feedback success">{passwordSuccess}</p>
		{/if}
		{#if passwordError}
			<p class="feedback error">{passwordError}</p>
		{/if}
	</ReportSection>

	<ReportSection
		title="Identity Mapping"
		description="This is the canonical `.agency` identity context used for entitlement, token issuance, and ChatGPT password setup."
	>
		<FactList items={identityFacts} />
	</ReportSection>

	<ReportSection
		title="Host Setup"
		description="Use the same personal token in approved hosts. Replace the MCP URL with the endpoint provisioned for your account."
		fullWidth={true}
	>
		<div class="host-tabs">
			{#each hostOptions as host}
				<button
					type="button"
					class:active={selectedHost === host.id}
					class="host-tab secondary"
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

		<p class="note-copy">
			`.agency` is the credential broker. Auth0 proves who you are. The bearer token connects MCP hosts. The
			ChatGPT connection password is used only on the ChatGPT authorize screen.
		</p>
	</ReportSection>
</ReportShell>

<style>
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

	button {
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 999px;
		padding: 0.82rem 1.2rem;
		font: inherit;
		background: rgba(255, 255, 255, 0.95);
		color: #111;
		cursor: pointer;
	}

	.secondary {
		background: transparent;
		color: #fff;
	}

	.small {
		padding: 0.62rem 0.95rem;
		font-size: 0.92rem;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.host-tab.active {
		background: rgba(255, 255, 255, 0.95);
		color: #111;
	}

	.reveal-panel,
	pre,
	.snippet-meta,
	.note-copy {
		margin-top: 1rem;
	}

	.reveal-panel,
	pre {
		padding: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
		overflow-x: auto;
	}

	.panel-head,
	.snippet-meta {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 1rem;
	}

	h3 {
		margin: 0 0 0.25rem;
	}

	.panel-head p,
	.note-copy,
	.snippet-meta span {
		margin: 0;
		color: var(--color-fg-muted);
	}

	.snippet-meta strong {
		display: block;
		margin-top: 0.25rem;
		word-break: break-word;
	}

	pre {
		white-space: pre-wrap;
	}

	code {
		font-family: inherit;
	}

	.feedback {
		margin-top: 0.8rem;
	}

	.feedback.success {
		color: #8de8a5;
	}

	.feedback.error {
		color: #ff8a80;
	}

	@media (max-width: 700px) {
		.panel-head,
		.snippet-meta {
			display: grid;
		}
	}
</style>

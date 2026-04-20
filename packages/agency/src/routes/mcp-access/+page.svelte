<script lang="ts">
	import { SEO } from '@create-something/canon';
	import {
		CredentialMatrix,
		FactList,
		ReportSection,
		ReportShell,
		SummaryItem,
	} from '$lib/components/access';

	let { data } = $props();

	type ManagedToken = {
		id: string;
		account_id: string;
		tenant_id: string;
		bound_host: string | null;
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
	type AccessAssignment = {
		laneKey: string;
		displayName: string;
		hubUrl: string;
		bridgeUrl: string;
		bridgeUsername: string;
		credentialSource: string;
		accountId: string | null;
		tenantId: string | null;
		workspaceAccountId: string | null;
	} | null;

	type HostId = 'codex' | 'claude' | 'cursor' | 'notion';

	const hostOptions: Array<{ id: HostId; label: string }> = [
		{ id: 'codex', label: 'Codex' },
		{ id: 'claude', label: 'Claude Desktop' },
		{ id: 'cursor', label: 'Cursor' },
		{ id: 'notion', label: 'Notion AI' },
	];
	const fallbackHostUrl = 'https://YOUR-MCP-URL/mcp';

	let token = $state<ManagedToken>(data.access.token ?? null);
	let busy = $state(false);
	let revealedToken = $state('');
	let errorMessage = $state(data.access.tokenAvailable ? '' : (data.access.tokenError ?? ''));
	let successMessage = $state('');
	let tokenCopiedState = $state('');
	let snippetCopiedState = $state('');
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
	const assignment = $derived(data.assignment as AccessAssignment);

	const activeHost = $derived(hostOptions.find((host) => host.id === selectedHost) ?? hostOptions[0]);
	const activeHostUrl = $derived(assignment?.hubUrl ?? fallbackHostUrl);
	const oauthHostEmail = $derived(oauthPassword?.email ?? data.user.email ?? 'your-linked-email@example.com');
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
url = "${activeHostUrl}"
bearer_token = "${tokenValue}"`);
	const claudeSnippet = $derived(`\
{
  "mcpServers": {
    "create-something": {
      "url": "${activeHostUrl}",
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
      "url": "${activeHostUrl}",
      "headers": {
        "Authorization": "Bearer ${tokenValue}"
      }
    }
  }
}`);
	const notionSnippet = $derived(`\
URL
${activeHostUrl}

Recommended auth
Header-based bearer token

Header
Authorization: Bearer ${tokenValue}

OAuth login email
${oauthHostEmail}

OAuth login password
Optional compatibility flow. Use the OAuth host password shown above in MCP Access only if the host requires OAuth onboarding. It is separate from Clerk and separate from the bearer token.

`);
	const activeSnippet = $derived(
		selectedHost === 'codex'
			? codexSnippet
			: selectedHost === 'claude'
				? claudeSnippet
				: selectedHost === 'cursor'
					? cursorSnippet
					: notionSnippet,
	);
	const passwordActionLabel = $derived(oauthPassword?.has_password ? 'Rotate password' : 'Set password');
	const tokenFacts = $derived([
		{ label: 'Status', value: tokenStatus },
		{ label: 'Account', value: token?.account_id ?? data.entitlement.accountId ?? 'Not linked' },
		{ label: 'Tenant', value: token?.tenant_id ?? data.entitlement.tenantId ?? 'Not linked' },
		{ label: 'Bound Host', value: token?.bound_host ?? assignment?.laneKey ?? 'Unbound' },
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
	const assignmentFacts = $derived(
		assignment
			? [
					{ label: 'Lane', value: assignment.displayName },
					{ label: 'Lane Key', value: assignment.laneKey },
					{ label: 'Hub URL', value: assignment.hubUrl },
					{ label: 'Notion Bridge', value: assignment.bridgeUrl },
					{ label: 'Bridge Username', value: assignment.bridgeUsername },
					{ label: 'Workspace Account', value: assignment.workspaceAccountId ?? assignment.accountId ?? 'Not linked' },
					{ label: 'Credential Source', value: assignment.credentialSource },
				]
			: [],
	);
	const credentialRows = $derived([
		{
			lane: 'Portal sign-in',
			credential: 'Clerk',
			use: 'Authenticates the web session for `.agency`.',
			status: 'Session active',
			note: 'Never reused as the bearer token or OAuth host authorize password.',
		},
		{
			lane: 'MCP host',
			credential: token?.token_prefix ? `Bearer ${token.token_prefix}…` : 'Bearer token',
			use: 'Used in Codex, Claude Desktop, Cursor, and other approved MCP hosts.',
			status: tokenStatus,
			note: token?.bound_host
				? `Bound to ${token.bound_host}. ${revealedToken ? 'Fresh token is currently revealed once for copy.' : 'Only creation or regeneration reveals the full token.'}`
				: revealedToken
					? 'Fresh token is currently revealed once for copy.'
					: 'Only creation or regeneration reveals the full token.',
		},
		{
			lane: 'OAuth host authorize',
			credential: oauthPassword?.email ?? data.user.email,
			use: 'Typed only into the OAuth authorization screen for Notion, ChatGPT, or another supported host.',
			status: passwordStatus,
			note: 'Separate secret path from portal login and bearer token usage.',
		},
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
		tokenCopiedState = '';
		snippetCopiedState = '';
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

	async function copyText(
		value: string,
		label: string,
		target: 'token' | 'snippet' = 'token',
	) {
		try {
			await navigator.clipboard.writeText(value);
			if (target === 'token') {
				tokenCopiedState = `${label} copied.`;
				snippetCopiedState = '';
			} else {
				snippetCopiedState = `${label} copied.`;
				tokenCopiedState = '';
			}
		} catch {
			if (target === 'token') {
				tokenCopiedState = `Copy failed for ${label}.`;
				snippetCopiedState = '';
			} else {
				snippetCopiedState = `Copy failed for ${label}.`;
				tokenCopiedState = '';
			}
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
			passwordSuccess = payload.message ?? 'OAuth host password updated.';
			newPassword = '';
			confirmPassword = '';
			await loadOAuthPassword();
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
	lede="A compact operator report for `.agency` credentials. Review the identity lane first, then act on the bearer token or OAuth host password without confusing those credentials with portal sign-in."
	sideLabel="Signed in as"
	sideValue={data.user.email}
	sideMeta={`Account ${data.entitlement.accountId ?? 'Not linked'} · Tenant ${data.entitlement.tenantId ?? 'Not linked'}`}
>
	<svelte:fragment slot="summary">
		<SummaryItem label="Bearer Token" value={tokenStatus} note={token?.token_prefix ? `Prefix ${token.token_prefix}` : 'Managed bearer token'} />
		<SummaryItem label="OAuth Password" value={passwordStatus} note={oauthPassword?.email ?? data.user.email} />
		<SummaryItem label="Linked Account" value={data.entitlement.accountId ?? 'Not linked'} note={data.entitlement.tenantId ?? 'No tenant linked'} />
		<SummaryItem label="Portal Identity" value="Clerk" note="Web session boundary only" />
		{#if assignment}
			<SummaryItem label="Assigned Lane" value={assignment.displayName} note={assignment.bridgeUsername} />
		{/if}
	</svelte:fragment>

	<ReportSection
		title="Credential Lanes"
		description="Three credentials exist on purpose. Keep portal sign-in, MCP host access, and OAuth host authorization separate."
		fullWidth={true}
	>
		<CredentialMatrix rows={credentialRows} />
	</ReportSection>

	<ReportSection
		title="Identity Mapping"
		description="This canonical `.agency` identity determines entitlement, token issuance, and OAuth host password setup."
	>
		<FactList items={identityFacts} />
	</ReportSection>

	{#if assignmentFacts.length > 0}
		<ReportSection
			title="Assigned MCP Access"
			description="Lane assignment and bridge endpoints linked to this identity. Vault-held secrets remain out of band."
			href="/mcp-access/tools"
			actionLabel="Inspect tools"
		>
			<FactList items={assignmentFacts} />
		</ReportSection>
	{/if}

	<ReportSection
		title="Personal Bearer Token"
		description="Use this token in approved MCP hosts. It is long-lived, personal, and only revealed on creation or regeneration."
		href="/security"
		actionLabel="Security model"
	>
		<div class="section-stack">
			<FactList items={tokenFacts} />

			<div class="annotation-block">
				<p>One active token per authenticated user. Existing hosts stop working immediately after regeneration or revocation.</p>
			</div>

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
					Regenerate + reveal
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
							<h3>Fresh token</h3>
							<p>Copy it now. The raw value will not be shown again unless you regenerate.</p>
						</div>
						<button class="secondary small" type="button" onclick={() => copyText(revealedToken, 'Bearer token')}>
							Copy token
						</button>
					</div>
					<code>{revealedToken}</code>
				</div>
			{:else if token}
				<p class="annotation-copy">A token exists but is no longer readable. Regenerate only when a new host needs a fresh secret.</p>
			{/if}

			{#if successMessage}
				<p class="feedback success">{successMessage}</p>
			{/if}
			{#if errorMessage}
				<p class="feedback error">{errorMessage}</p>
			{/if}
			{#if tokenCopiedState}
				<p class="feedback">{tokenCopiedState}</p>
			{/if}
		</div>
	</ReportSection>

	<ReportSection
		title="OAuth Host Password"
		description="Used only on the OAuth authorize screen for supported hosts such as Notion AI and ChatGPT. This credential is separate from both portal sign-in and bearer-token access."
		href="/security"
		actionLabel="Identity model"
	>
		<div class="section-stack">
			<FactList items={passwordFacts} />

			<div class="annotation-block">
				<p>Rotate this secret when Notion, ChatGPT, or another OAuth-capable host changes hands. It does not affect existing portal sessions or bearer-token hosts.</p>
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
				<p class="feedback success">{passwordSuccess}</p>
			{/if}
			{#if passwordError}
				<p class="feedback error">{passwordError}</p>
			{/if}
		</div>
	</ReportSection>

	<ReportSection
		title="Host Setup"
		description="Use the account-specific MCP URL with either bearer auth or the OAuth host flow, depending on the client."
		fullWidth={true}
		>
			<div class="host-setup">
				<div class="host-controls">
					<div class="host-tabs" role="group" aria-label="Host setup examples">
						{#each hostOptions as host}
							<button
								type="button"
								aria-pressed={selectedHost === host.id}
								class:active={selectedHost === host.id}
								class="host-tab secondary"
								onclick={() => {
									selectedHost = host.id;
									snippetCopiedState = '';
								}}
							>
								{host.label}
						</button>
					{/each}
				</div>

					<div class="host-table">
						<div class="instruction-row">
							<span>Host</span>
							<strong>{activeHost.label}</strong>
						</div>
						<div class="instruction-row">
							<span>MCP URL</span>
							<strong>{activeHostUrl}</strong>
						</div>
						<div class="instruction-row">
							<span>Bearer token</span>
							<strong>{selectedHost === 'notion' ? (revealedToken ? 'Use in Authorization header below' : 'Insert your current token into the Authorization header') : (revealedToken ? 'Fresh value in snippet below' : 'Insert your current token')}</strong>
						</div>
				</div>

				<p class="annotation-copy">
					Clerk remains the portal identity boundary. The snippet below configures only the MCP host connection. For Notion AI, use bearer auth by default; the OAuth host password above is only for hosts that require an authorize flow.
				</p>
			</div>

			<div class="snippet-panel">
				<div class="panel-head">
					<div>
						<h3>{activeHost.label} configuration</h3>
						<p>{selectedHost === 'notion' ? 'Use the provisioned MCP URL and send the bearer token in the Authorization header. OAuth remains available only when the host requires it.' : 'Copy the template, then replace the MCP URL placeholder with the provisioned endpoint.'}</p>
					</div>
					<button class="secondary small" type="button" onclick={() => copyText(activeSnippet, `${activeHost.label} snippet`, 'snippet')}>
						Copy snippet
					</button>
				</div>

				<pre><code>{activeSnippet}</code></pre>
				{#if snippetCopiedState}
					<p class="feedback">{snippetCopiedState}</p>
				{/if}
			</div>
		</div>
	</ReportSection>
</ReportShell>

<style>
	.section-stack {
		display: grid;
		gap: 0.9rem;
	}

	.annotation-block,
	.reveal-panel,
	.snippet-panel,
	.host-table {
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.015);
	}

	.annotation-block {
		padding: 0.75rem 0.85rem;
	}

	.annotation-block p,
	.annotation-copy {
		margin: 0;
		color: var(--color-fg-muted);
		font-size: 0.82rem;
		line-height: 1.6;
	}

	.actions,
	.host-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
	}

	.form-stack {
		display: grid;
		gap: 0.85rem;
	}

	.form-stack label {
		display: grid;
		gap: 0.38rem;
		font-size: 0.76rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-fg-muted);
	}

	.form-stack input {
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(8, 10, 12, 0.55);
		color: #fff;
		padding: 0.82rem 0.9rem;
		font: inherit;
		text-transform: none;
		letter-spacing: normal;
	}

	button {
		border: 1px solid rgba(255, 255, 255, 0.18);
		padding: 0.62rem 0.85rem;
		font: inherit;
		font-size: 0.82rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		background: rgba(255, 255, 255, 0.92);
		color: #111;
		cursor: pointer;
	}

	.secondary {
		background: transparent;
		color: #fff;
	}

	.small {
		padding: 0.52rem 0.72rem;
		font-size: 0.72rem;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.host-tab.active {
		background: rgba(255, 255, 255, 0.92);
		color: #111;
	}

	.reveal-panel,
	.snippet-panel {
		padding: 0.9rem 1rem;
	}

	.panel-head {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.65rem;
	}

	.panel-head h3 {
		margin: 0;
		font-size: 0.94rem;
	}

	.panel-head p {
		margin: 0.22rem 0 0;
		color: var(--color-fg-muted);
		font-size: 0.8rem;
		line-height: 1.55;
	}

	code,
	pre {
		font-family: var(--font-mono, monospace);
		font-size: 0.86rem;
	}

	code {
		display: block;
		overflow-wrap: anywhere;
		color: #f5f5f5;
	}

	pre {
		margin: 0;
		overflow-x: auto;
		color: #f5f5f5;
	}

	.feedback {
		margin: 0;
		font-size: 0.8rem;
	}

	.feedback.success {
		color: #8de8a5;
	}

	.feedback.error {
		color: #ff8a80;
	}

	.host-setup {
		display: grid;
		grid-template-columns: minmax(0, 20rem) minmax(0, 1fr);
		gap: 1.25rem;
		align-items: start;
	}

	.host-controls {
		display: grid;
		gap: 0.8rem;
	}

	.host-table {
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.instruction-row {
		display: grid;
		grid-template-columns: minmax(6rem, 7rem) minmax(0, 1fr);
		gap: 1rem;
		padding: 0.68rem 0.8rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		align-items: baseline;
	}

	.instruction-row span {
		font-size: 0.72rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-fg-muted);
	}

	.instruction-row strong {
		font-size: 0.9rem;
		font-weight: 520;
		line-height: 1.45;
		word-break: break-word;
		font-variant-numeric: tabular-nums;
	}

	@media (max-width: 860px) {
		.host-setup {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 700px) {
		.panel-head {
			display: grid;
		}

		.instruction-row {
			grid-template-columns: 1fr;
			gap: 0.25rem;
		}
	}
</style>

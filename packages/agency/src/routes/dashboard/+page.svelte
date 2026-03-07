<script lang="ts">
	import { SEO } from '@create-something/canon';

	let { data } = $props();

	function formatDate(value: string | null | undefined): string {
		if (!value) return 'Not set';
		return new Date(value).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	}

	function formatDateTime(value: string | null | undefined): string {
		if (!value) return 'Not set';
		return new Date(value).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
		});
	}

	function humanizeReason(reason: string): string {
		return reason
			.replace(/_/g, ' ')
			.replace(/\b\w/g, (char) => char.toUpperCase());
	}

	function accessStatusLabel(value: boolean): string {
		return value ? 'Access active' : 'Access blocked';
	}

	function tokenStatusLabel(): string {
		if (!data.access.tokenAvailable) return 'Unavailable';
		return data.access.token?.active ? 'Token active' : 'No token issued';
	}

	function passwordStatusLabel(): string {
		if (!data.access.password.available) return 'Unavailable';
		return data.access.password.hasPassword ? 'Password set' : 'Password not set';
	}
</script>

<SEO
	title="Dashboard | CREATE SOMETHING AGENCY"
	description="Access state, personal bearer token status, and ChatGPT OAuth password status for your CREATE SOMETHING AGENCY account."
	propertyName="agency"
/>

<div class="dashboard">
	<header class="dashboard-header">
		<div>
			<p class="eyebrow">Access Center</p>
			<h1 class="dashboard-title">Dashboard</h1>
			<p class="dashboard-subtitle">
				This page answers three separate questions: can this account access `.agency`, has a personal MCP token
				been issued, and has the ChatGPT connection password been set.
			</p>
		</div>
		<div class="identity-chip">
			<span class="identity-label">Signed in as</span>
			<strong>{data.user.email}</strong>
		</div>
	</header>

	<section class="summary-grid">
		<div class="summary-card summary-card-primary">
			<span class="summary-label">Access</span>
			<span class="summary-value">{accessStatusLabel(data.overview.accessAllowed)}</span>
			<span class="summary-note">{humanizeReason(data.overview.accessReason)}</span>
		</div>

		<div class="summary-card">
			<span class="summary-label">Bearer Token</span>
			<span class="summary-value">{tokenStatusLabel()}</span>
			<span class="summary-note">
				{data.access.token?.token_prefix ? `Prefix ${data.access.token.token_prefix}` : 'Create or manage in MCP Access'}
			</span>
		</div>

		<div class="summary-card">
			<span class="summary-label">ChatGPT Connection</span>
			<span class="summary-value">{passwordStatusLabel()}</span>
			<span class="summary-note">{data.access.password.email ?? data.user.email}</span>
		</div>

		<div class="summary-card">
			<span class="summary-label">Linked Account</span>
			<span class="summary-value">{data.entitlement.accountId ?? 'Not linked'}</span>
			<span class="summary-note">{data.entitlement.tenantId ?? 'No tenant linked'}</span>
		</div>
	</section>

	<div class="content-grid">
		<section class="panel panel-emphasis">
			<div class="panel-header">
				<div>
					<h2>Personal Bearer Token</h2>
					<p class="panel-copy">
						This is the token you paste into Codex, Claude, Cursor, or another approved MCP host. Your portal
						login does not replace it.
					</p>
				</div>
				<a href="/mcp-access" class="action-link">Manage token</a>
			</div>

			{#if data.access.tokenAvailable}
				{#if data.access.token}
					<div class="detail-grid">
						<div>
							<span class="detail-label">Status</span>
							<strong>{data.access.token.active ? 'Active' : 'Inactive'}</strong>
						</div>
						<div>
							<span class="detail-label">Prefix</span>
							<strong>{data.access.token.token_prefix}</strong>
						</div>
						<div>
							<span class="detail-label">Access Mode</span>
							<strong>{data.access.token.tool_mode === 'read_write' ? 'Read + write' : 'Read only'}</strong>
						</div>
						<div>
							<span class="detail-label">Last Used</span>
							<strong>{formatDateTime(data.access.token.last_used_at)}</strong>
						</div>
						<div>
							<span class="detail-label">Created</span>
							<strong>{formatDateTime(data.access.token.created_at)}</strong>
						</div>
						<div>
							<span class="detail-label">Allowed Tool Prefixes</span>
							<strong>{data.access.token.allowed_tool_prefixes?.length ?? 0}</strong>
						</div>
					</div>
				{:else}
					<p class="empty-state">
						No bearer token has been issued for this user yet. Create one from MCP Access when you are ready
						to connect a host.
					</p>
				{/if}
			{:else}
				<p class="empty-state">
					Token state is currently unavailable: {data.access.tokenError ?? 'Unable to reach the identity service.'}
				</p>
			{/if}
		</section>

		<section class="panel panel-emphasis">
			<div class="panel-header">
				<div>
					<h2>ChatGPT Connection Password</h2>
					<p class="panel-copy">
						This is the password you type into the ChatGPT authorize screen when connecting ChatGPT to your
						`.agency` access. It is not your Auth0 portal password and it is not your bearer token.
					</p>
				</div>
				<a href="/mcp-access" class="action-link">
					{data.access.password.hasPassword ? 'Rotate password' : 'Set password'}
				</a>
			</div>

			{#if data.access.password.available}
				<div class="detail-grid">
					<div>
						<span class="detail-label">Status</span>
						<strong>{data.access.password.hasPassword ? 'Initialized' : 'Not initialized'}</strong>
					</div>
					<div>
						<span class="detail-label">Use This Email</span>
						<strong>{data.access.password.email ?? data.user.email}</strong>
					</div>
					<div>
						<span class="detail-label">Email Verified</span>
						<strong>{data.access.password.emailVerified ? 'Yes' : 'No'}</strong>
					</div>
					<div>
						<span class="detail-label">Identity User</span>
						<strong>{data.access.password.identityUserExists ? 'Present' : 'Not provisioned'}</strong>
					</div>
				</div>

				<div class="note-panel">
					<p>
						Stored passwords are never re-shown. Changing this password affects only the ChatGPT connection
						flow. It does not change your portal login or your bearer token.
					</p>
				</div>
			{:else}
				<p class="empty-state">
					Password state is currently unavailable: {data.access.password.error ?? 'Unable to reach the identity service.'}
				</p>
			{/if}
		</section>
	</div>

	<div class="content-grid">
		<section class="panel">
			<div class="panel-header">
				<div>
					<h2>Access Eligibility</h2>
					<p class="panel-copy">These checks determine whether this signed-in user is allowed to use managed `.agency` access.</p>
				</div>
				<span class="timestamp">Updated {formatDateTime(data.entitlement.updatedAt)}</span>
			</div>

			<div class="check-grid">
				{#each Object.entries(data.entitlement.decision.checks) as [key, value]}
					<div class="check-row">
						<span>{humanizeReason(key)}</span>
						<strong class:ok={value} class:bad={!value}>{value ? 'Pass' : 'Fail'}</strong>
					</div>
				{/each}
			</div>
		</section>

		<section class="panel">
			<div class="panel-header">
				<div>
					<h2>Identity Mapping</h2>
					<p class="panel-copy">This shows how your Auth0 portal login maps to the underlying `.agency` account and tenant.</p>
				</div>
			</div>

			<div class="detail-grid">
				<div>
					<span class="detail-label">Auth Subject</span>
					<strong>{data.user.id}</strong>
				</div>
				<div>
					<span class="detail-label">Service Tier</span>
					<strong>{data.overview.serviceTier}</strong>
				</div>
				<div>
					<span class="detail-label">Account ID</span>
					<strong>{data.entitlement.accountId ?? 'Not linked'}</strong>
				</div>
				<div>
					<span class="detail-label">Tenant ID</span>
					<strong>{data.entitlement.tenantId ?? 'Not linked'}</strong>
				</div>
			</div>
		</section>
	</div>

	<div class="content-grid">
		<section class="panel">
			<div class="panel-header">
				<div>
					<h2>Partner Connection</h2>
					<p class="panel-copy">Workspace and integration context, when this identity is linked to a partner-managed client.</p>
				</div>
			</div>

			{#if data.partner}
				<div class="detail-grid">
					<div>
						<span class="detail-label">Client</span>
						<strong>{data.partner.slug}</strong>
					</div>
					<div>
						<span class="detail-label">Partner</span>
						<strong>{data.partner.partner_key}</strong>
					</div>
					<div>
						<span class="detail-label">Workspace Status</span>
						<strong>{data.partner.status}</strong>
					</div>
					<div>
						<span class="detail-label">Consent</span>
						<strong>{data.partner.consent_active ? 'Active' : 'Missing'}</strong>
					</div>
					<div>
						<span class="detail-label">Toolkit Accounts</span>
						<strong>{data.partner.toolkit_accounts}</strong>
					</div>
					<div>
						<span class="detail-label">Notion Accounts</span>
						<strong>{data.partner.notion_accounts}</strong>
					</div>
				</div>
			{:else}
				<p class="empty-state">No partner-managed client workspace is linked to this identity yet.</p>
			{/if}
		</section>

		<section class="panel">
			<div class="panel-header">
				<div>
					<h2>Commercial State</h2>
					<p class="panel-copy">Billing and contract state matter here only when they explain why access is active or blocked.</p>
				</div>
			</div>

			{#if data.commercial || data.contract}
				<div class="detail-grid">
					<div>
						<span class="detail-label">Subscription</span>
						<strong>{data.commercial?.subscription_status ?? 'Not set'}</strong>
					</div>
					<div>
						<span class="detail-label">Billing</span>
						<strong>{data.commercial?.billing_active ? 'Active' : 'Inactive'}</strong>
					</div>
					<div>
						<span class="detail-label">Contract</span>
						<strong>{data.contract?.contract_status ?? 'Not set'}</strong>
					</div>
					<div>
						<span class="detail-label">Contract Ref</span>
						<strong>{data.contract?.contract_reference ?? 'Not set'}</strong>
					</div>
					<div>
						<span class="detail-label">Period End</span>
						<strong>{formatDate(data.commercial?.current_period_end)}</strong>
					</div>
					<div>
						<span class="detail-label">Policy Accepted</span>
						<strong>{data.entitlement.decision.checks.policy_accepted ? 'Yes' : 'No'}</strong>
					</div>
				</div>
			{:else}
				<p class="empty-state">
					No contract or billing record is linked to this identity yet. Access can still exist through the
					entitlement registry.
				</p>
			{/if}
		</section>
	</div>
</div>

<style>
	.dashboard {
		max-width: var(--content-width-xl);
		margin: 0 auto;
		padding: var(--space-xl);
	}

	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-lg);
		margin-bottom: var(--space-xl);
	}

	.eyebrow {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xs);
	}

	.dashboard-title {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs) 0;
	}

	.dashboard-subtitle,
	.panel-copy,
	.summary-note,
	.identity-label,
	.detail-label,
	.empty-state,
	.note-panel p {
		color: var(--color-fg-muted);
	}

	.dashboard-subtitle {
		max-width: 72ch;
		line-height: 1.6;
		margin: 0;
	}

	.identity-chip {
		min-width: 220px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 20px;
		padding: var(--space-md) var(--space-lg);
		display: grid;
		gap: 4px;
	}

	.summary-grid,
	.content-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-lg);
		margin-bottom: var(--space-lg);
	}

	.summary-grid {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}

	.summary-card,
	.panel,
	.note-panel {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 24px;
	}

	.summary-card,
	.panel {
		padding: var(--space-lg);
	}

	.summary-card {
		display: grid;
		gap: var(--space-xs);
		min-height: 156px;
	}

	.summary-card-primary,
	.panel-emphasis {
		border-color: rgba(255, 255, 255, 0.16);
		background: rgba(255, 255, 255, 0.05);
	}

	.summary-label,
	.detail-label {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.summary-value {
		font-size: clamp(1.5rem, 4vw, 2.25rem);
		line-height: 1.1;
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
	}

	.panel-header h2 {
		margin: 0 0 var(--space-xs) 0;
		font-size: var(--text-h4);
	}

	.panel-copy,
	.timestamp {
		margin: 0;
		font-size: var(--text-body-sm);
	}

	.action-link {
		color: var(--color-fg-primary);
		text-decoration: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.28);
		padding-bottom: 2px;
		white-space: nowrap;
	}

	.detail-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-md);
	}

	.detail-grid > div {
		display: grid;
		gap: 6px;
	}

	.detail-grid strong,
	.identity-chip strong {
		color: var(--color-fg-primary);
		word-break: break-word;
	}

	.check-grid {
		display: grid;
		gap: var(--space-sm);
	}

	.check-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-md);
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.check-row:last-child {
		padding-bottom: 0;
		border-bottom: 0;
	}

	.ok {
		color: #8de8a5;
	}

	.bad {
		color: #ff8a80;
	}

	.note-panel {
		padding: var(--space-md);
		margin-top: var(--space-lg);
	}

	.note-panel p,
	.empty-state {
		margin: 0;
		line-height: 1.6;
	}

	@media (max-width: 1100px) {
		.summary-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 800px) {
		.dashboard {
			padding: var(--space-lg);
		}

		.dashboard-header,
		.summary-grid,
		.content-grid,
		.detail-grid {
			grid-template-columns: 1fr;
			display: grid;
		}

		.dashboard-header {
			gap: var(--space-md);
		}

		.identity-chip {
			min-width: 0;
		}

		.panel-header {
			flex-direction: column;
		}
	}
</style>

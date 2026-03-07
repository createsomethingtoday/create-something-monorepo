<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { HighDensityTable } from '@create-something/tufte';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();
	let policyBusy = $state(false);
	let policyMessage = $state('');
	let policyError = $state('');

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
		if (!data.entitlement.accountId || !data.entitlement.tenantId) return 'Not provisioned yet';
		if (!data.access.tokenAvailable) return 'Unavailable';
		return data.access.token?.active ? 'Token active' : 'No token issued';
	}

	function passwordStatusLabel(): string {
		if (!data.entitlement.accountId || !data.entitlement.tenantId) return 'Not provisioned yet';
		if (!data.access.password.available) return 'Unavailable';
		return data.access.password.hasPassword ? 'Password set' : 'Password not set';
	}

	const entitlementItems = $derived(
		Object.entries(data.entitlement.decision.checks).map(([key, value]) => ({
			label: humanizeReason(key),
			count: value ? 1 : 0,
			badge: value ? 'pass' : 'fail',
		}))
	);

	async function acceptPolicy() {
		policyBusy = true;
		policyMessage = '';
		policyError = '';

		try {
			const response = await fetch('/api/me/mcp-policy-acceptance', { method: 'POST' });
			const payload = (await response.json().catch(() => ({}))) as { message?: string };
			if (!response.ok) {
				throw new Error(payload.message ?? 'Failed to accept policy');
			}
			policyMessage = payload.message ?? 'Policy accepted.';
			await invalidateAll();
		} catch (error) {
			policyError = error instanceof Error ? error.message : 'Failed to accept policy';
		} finally {
			policyBusy = false;
		}
	}
</script>

<SEO
	title="Dashboard | CREATE SOMETHING AGENCY"
	description="Access state, personal bearer token status, and ChatGPT connection status for your CREATE SOMETHING AGENCY account."
	propertyName="agency"
/>

<div class="dashboard">
	<header class="masthead">
		<div class="masthead-copy">
			<p class="eyebrow">Access Center</p>
			<h1>Dashboard</h1>
			<p class="lede">
				A compact account report for `.agency` access. It answers four questions: whether this identity is
				entitled, whether an MCP token exists, whether the ChatGPT connection password is set, and which
				account and tenant those credentials belong to.
			</p>
		</div>

		<aside class="identity-note">
			<div class="identity-label">Signed in as</div>
			<div class="identity-value">{data.user.email}</div>
			<div class="identity-meta">Updated {formatDateTime(data.entitlement.updatedAt)}</div>
		</aside>
	</header>

	<section class="summary-strip">
		<div class="summary-item">
			<div class="summary-label">Access</div>
			<div class="summary-value">{accessStatusLabel(data.overview.accessAllowed)}</div>
			<div class="summary-note">{humanizeReason(data.overview.accessReason)}</div>
		</div>
		<div class="summary-item">
			<div class="summary-label">Bearer Token</div>
			<div class="summary-value">{tokenStatusLabel()}</div>
			<div class="summary-note">
				{data.access.token?.token_prefix
					? `Prefix ${data.access.token.token_prefix}`
					: !data.entitlement.accountId || !data.entitlement.tenantId
						? 'Provisioning required'
						: 'Managed in MCP Access'}
			</div>
		</div>
		<div class="summary-item">
			<div class="summary-label">ChatGPT Connection</div>
			<div class="summary-value">{passwordStatusLabel()}</div>
			<div class="summary-note">{data.access.password.email ?? data.user.email}</div>
		</div>
		<div class="summary-item">
			<div class="summary-label">Linked Account</div>
			<div class="summary-value">{data.entitlement.accountId ?? 'Not linked'}</div>
			<div class="summary-note">{data.entitlement.tenantId ?? 'No tenant linked'}</div>
		</div>
	</section>

	<div class="report-grid">
		<section class="report-section">
			<div class="section-head">
				<h2>Access Eligibility</h2>
				<p>Live entitlement checks for managed `.agency` access.</p>
			</div>

			{#if data.overview.accessReason === 'policy_acceptance_required'}
				<div class="callout">
					<p>Access is blocked only because the `.agency` access policy has not been accepted for this account.</p>
					<div class="callout-actions">
						<button type="button" class="action-button" disabled={policyBusy} onclick={acceptPolicy}>
							{policyBusy ? 'Accepting…' : 'Accept Access Policy'}
						</button>
						<a href="/security">Review security model</a>
					</div>
					{#if policyMessage}
						<p class="feedback success">{policyMessage}</p>
					{/if}
					{#if policyError}
						<p class="feedback error">{policyError}</p>
					{/if}
				</div>
			{/if}

			<HighDensityTable
				items={entitlementItems}
				labelKey="label"
				countKey="count"
				badgeKey="badge"
				limit={6}
				showRank={false}
				showPercentage={false}
				emptyMessage="No entitlement checks available"
			/>
		</section>

		<section class="report-section">
			<div class="section-head">
				<h2>Identity Mapping</h2>
				<p>How your Auth0 portal identity maps to the underlying `.agency` account.</p>
			</div>

			<dl class="fact-list">
				<div class="fact-row">
					<dt>Auth Subject</dt>
					<dd>{data.user.id}</dd>
				</div>
				<div class="fact-row">
					<dt>Service Tier</dt>
					<dd>{data.overview.serviceTier}</dd>
				</div>
				<div class="fact-row">
					<dt>Account ID</dt>
					<dd>{data.entitlement.accountId ?? 'Not linked'}</dd>
				</div>
				<div class="fact-row">
					<dt>Tenant ID</dt>
					<dd>{data.entitlement.tenantId ?? 'Not linked'}</dd>
				</div>
			</dl>
		</section>

		<section class="report-section">
			<div class="section-head section-head-inline">
				<div>
					<h2>Personal Bearer Token</h2>
					<p>The token you paste into Codex, Claude, Cursor, or another approved MCP host.</p>
				</div>
				<a href="/mcp-access">Manage token</a>
			</div>

			{#if !data.entitlement.accountId || !data.entitlement.tenantId}
				<p class="empty-copy">Provisioning must complete before token issuance is available.</p>
			{:else if data.access.tokenAvailable && data.access.token}
				<dl class="fact-list">
					<div class="fact-row">
						<dt>Status</dt>
						<dd>{data.access.token.active ? 'Active' : 'Inactive'}</dd>
					</div>
					<div class="fact-row">
						<dt>Prefix</dt>
						<dd>{data.access.token.token_prefix}</dd>
					</div>
					<div class="fact-row">
						<dt>Access Mode</dt>
						<dd>{data.access.token.tool_mode === 'read_write' ? 'Read + write' : 'Read only'}</dd>
					</div>
					<div class="fact-row">
						<dt>Last Used</dt>
						<dd>{formatDateTime(data.access.token.last_used_at)}</dd>
					</div>
				</dl>
			{:else if data.access.tokenAvailable}
				<p class="empty-copy">No bearer token has been issued yet.</p>
			{:else}
				<p class="empty-copy">Token state is temporarily unavailable: {data.access.tokenError ?? 'Unable to reach identity services.'}</p>
			{/if}
		</section>

		<section class="report-section">
			<div class="section-head section-head-inline">
				<div>
					<h2>ChatGPT Connection Password</h2>
					<p>The password used only on the ChatGPT authorize screen. It is separate from your portal login.</p>
				</div>
				<a href="/mcp-access">{data.access.password.hasPassword ? 'Rotate password' : 'Set password'}</a>
			</div>

			{#if !data.entitlement.accountId || !data.entitlement.tenantId}
				<p class="empty-copy">Provisioning must complete before ChatGPT connection setup is available.</p>
			{:else if data.access.password.available}
				<dl class="fact-list">
					<div class="fact-row">
						<dt>Status</dt>
						<dd>{data.access.password.hasPassword ? 'Password set' : 'Password not set'}</dd>
					</div>
					<div class="fact-row">
						<dt>Email</dt>
						<dd>{data.access.password.email ?? data.user.email}</dd>
					</div>
					<div class="fact-row">
						<dt>Email Verified</dt>
						<dd>{data.access.password.emailVerified ? 'Yes' : 'No'}</dd>
					</div>
					<div class="fact-row">
						<dt>Identity User</dt>
						<dd>{data.access.password.identityUserExists ? 'Present' : 'Not provisioned'}</dd>
					</div>
				</dl>
			{:else}
				<p class="empty-copy">Password state is temporarily unavailable: {data.access.password.error ?? 'Unable to reach identity services.'}</p>
			{/if}
		</section>

		<section class="report-section">
			<div class="section-head">
				<h2>Partner Connection</h2>
				<p>Workspace and integration context when this identity is linked to a partner-managed client.</p>
			</div>

			{#if data.partner}
				<dl class="fact-list">
					<div class="fact-row">
						<dt>Client</dt>
						<dd>{data.partner.slug}</dd>
					</div>
					<div class="fact-row">
						<dt>Partner</dt>
						<dd>{data.partner.partner_key}</dd>
					</div>
					<div class="fact-row">
						<dt>Status</dt>
						<dd>{data.partner.status}</dd>
					</div>
					<div class="fact-row">
						<dt>Consent</dt>
						<dd>{data.partner.consent_active ? 'Active' : 'Missing'}</dd>
					</div>
				</dl>
			{:else}
				<p class="empty-copy">No partner-managed client workspace is linked to this identity yet.</p>
			{/if}
		</section>

		<section class="report-section">
			<div class="section-head">
				<h2>Commercial State</h2>
				<p>Billing and contract context, only when it explains why access is active or blocked.</p>
			</div>

			{#if data.commercial || data.contract}
				<dl class="fact-list">
					<div class="fact-row">
						<dt>Subscription</dt>
						<dd>{data.commercial?.subscription_status ?? 'Not set'}</dd>
					</div>
					<div class="fact-row">
						<dt>Billing</dt>
						<dd>{data.commercial?.billing_active ? 'Active' : 'Inactive'}</dd>
					</div>
					<div class="fact-row">
						<dt>Contract</dt>
						<dd>{data.contract?.contract_status ?? 'Not set'}</dd>
					</div>
					<div class="fact-row">
						<dt>Contract Ref</dt>
						<dd>{data.contract?.contract_reference ?? 'Not set'}</dd>
					</div>
				</dl>
			{:else}
				<p class="empty-copy">No contract or billing record is linked to this identity yet.</p>
			{/if}
		</section>
	</div>
</div>

<style>
	.dashboard {
		max-width: 1120px;
		margin: 0 auto;
		padding: 2.5rem 2rem 4rem;
	}

	.masthead {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 20rem;
		gap: 3rem;
		align-items: start;
		margin-bottom: 2.5rem;
	}

	.eyebrow,
	.summary-label,
	.identity-label,
	dt {
		font-size: 0.8rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-fg-muted);
	}

	h1 {
		margin: 0 0 0.5rem;
		font-size: clamp(2.8rem, 6vw, 4.25rem);
		line-height: 0.95;
	}

	.lede,
	.section-head p,
	.summary-note,
	.identity-meta,
	.empty-copy,
	.callout p {
		color: var(--color-fg-muted);
	}

	.lede {
		max-width: 42rem;
		line-height: 1.6;
		font-size: 1rem;
		margin: 0;
	}

	.identity-note {
		border-top: 1px solid rgba(255, 255, 255, 0.12);
		padding-top: 1rem;
		display: grid;
		gap: 0.5rem;
	}

	.identity-value {
		font-size: 1.25rem;
		font-weight: 600;
		word-break: break-word;
	}

	.summary-strip {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 1.5rem;
		padding: 1rem 0 2rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		margin-bottom: 2rem;
	}

	.summary-item {
		min-width: 0;
	}

	.summary-value {
		margin-top: 0.35rem;
		font-size: clamp(1.25rem, 3vw, 1.95rem);
		line-height: 1.05;
		font-weight: 600;
		word-break: break-word;
	}

	.summary-note {
		margin-top: 0.45rem;
		font-size: 0.95rem;
		line-height: 1.45;
	}

	.report-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		column-gap: 3rem;
		row-gap: 2rem;
	}

	.report-section {
		border-top: 1px solid rgba(255, 255, 255, 0.12);
		padding-top: 1rem;
		min-width: 0;
	}

	.section-head {
		margin-bottom: 1rem;
	}

	.section-head-inline {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
	}

	.section-head h2 {
		margin: 0 0 0.4rem;
		font-size: 1.15rem;
	}

	.section-head p {
		margin: 0;
		line-height: 1.5;
	}

	.fact-list {
		display: grid;
		gap: 0.85rem;
	}

	.fact-row {
		display: grid;
		grid-template-columns: 11rem minmax(0, 1fr);
		gap: 1rem;
		padding-bottom: 0.55rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.fact-row:last-child {
		border-bottom: 0;
	}

	dd {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		line-height: 1.4;
		word-break: break-word;
	}

	.callout {
		margin: 0 0 1rem;
		padding: 0.9rem 1rem;
		border-left: 2px solid rgba(255, 255, 255, 0.35);
		background: rgba(255, 255, 255, 0.025);
	}

	.callout-actions {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
		margin-top: 0.75rem;
	}

	.action-button {
		border: 1px solid rgba(255, 255, 255, 0.18);
		background: rgba(255, 255, 255, 0.95);
		color: #111;
		border-radius: 999px;
		padding: 0.7rem 1rem;
		font: inherit;
		cursor: pointer;
	}

	.action-button:disabled {
		opacity: 0.65;
		cursor: default;
	}

	a {
		color: var(--color-fg-primary);
		text-decoration: underline;
		text-underline-offset: 0.18em;
	}

	.feedback {
		margin-top: 0.65rem;
	}

	.feedback.success {
		color: #8de8a5;
	}

	.feedback.error {
		color: #ff8a80;
	}

	:global(.table .badge) {
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	:global(.table .badge) {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.12);
	}

	:global(.table .row) {
		padding: 0.45rem 0;
	}

	:global(.table .count) {
		color: var(--color-fg-primary);
	}

	@media (max-width: 900px) {
		.masthead,
		.summary-strip,
		.report-grid {
			grid-template-columns: 1fr;
		}

		.dashboard {
			padding: 1.5rem 1rem 3rem;
		}

		.section-head-inline {
			flex-direction: column;
			align-items: flex-start;
		}

		.fact-row {
			grid-template-columns: 1fr;
			gap: 0.3rem;
		}
	}
</style>

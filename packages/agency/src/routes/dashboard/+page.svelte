<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { HighDensityTable } from '@create-something/tufte';
	import { invalidateAll } from '$app/navigation';
	import { FactList, ReportSection, ReportShell, SummaryItem } from '$lib/components/access';

	let { data } = $props();
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
	let policyBusy = $state(false);
	let policyMessage = $state('');
	let policyError = $state('');
	const assignment = $derived(data.assignment as AccessAssignment);

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
		return reason.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
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
		})),
	);

	const identityFacts = $derived([
		{ label: 'Auth Subject', value: data.user.id },
		{ label: 'Service Tier', value: data.overview.serviceTier },
		{ label: 'Account ID', value: data.entitlement.accountId ?? 'Not linked' },
		{ label: 'Tenant ID', value: data.entitlement.tenantId ?? 'Not linked' },
	]);

	const tokenFacts = $derived(
		data.access.token
			? [
					{ label: 'Status', value: data.access.token.active ? 'Active' : 'Inactive' },
					{ label: 'Prefix', value: data.access.token.token_prefix },
					{
						label: 'Access Mode',
						value: data.access.token.tool_mode === 'read_write' ? 'Read + write' : 'Read only',
					},
					{ label: 'Last Used', value: formatDateTime(data.access.token.last_used_at) },
				]
			: [],
	);

	const passwordFacts = $derived([
		{
			label: 'Status',
			value: data.access.password.hasPassword ? 'Password set' : 'Password not set',
		},
		{ label: 'Email', value: data.access.password.email ?? data.user.email },
		{ label: 'Email Verified', value: data.access.password.emailVerified ? 'Yes' : 'No' },
		{ label: 'Identity User', value: data.access.password.identityUserExists ? 'Present' : 'Not provisioned' },
	]);

	const partnerFacts = $derived(
		data.partner
			? [
					{ label: 'Client', value: data.partner.slug },
					{ label: 'Partner', value: data.partner.partner_key },
					{ label: 'Status', value: data.partner.status },
					{ label: 'Consent', value: data.partner.consent_active ? 'Active' : 'Missing' },
				]
			: [],
	);

	const commercialFacts = $derived(
		data.commercial || data.contract
			? [
					{ label: 'Subscription', value: data.commercial?.subscription_status ?? 'Not set' },
					{ label: 'Billing', value: data.commercial?.billing_active ? 'Active' : 'Inactive' },
					{ label: 'Contract', value: data.contract?.contract_status ?? 'Not set' },
					{ label: 'Contract Ref', value: data.contract?.contract_reference ?? 'Not set' },
				]
			: [],
	);
	const assignmentFacts = $derived(
		assignment
			? [
					{ label: 'Lane', value: assignment.displayName },
					{ label: 'Hub URL', value: assignment.hubUrl },
					{ label: 'Notion Bridge', value: assignment.bridgeUrl },
					{ label: 'Bridge Username', value: assignment.bridgeUsername },
					{ label: 'Workspace Account', value: assignment.workspaceAccountId ?? assignment.accountId ?? 'Not linked' },
					{ label: 'Credential Source', value: assignment.credentialSource },
				]
			: [],
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

<ReportShell
	eyebrow="Access Center"
	title="Dashboard"
	lede="A compact account report for `.agency` access. It answers four questions: whether this identity is entitled, whether an MCP token exists, whether the ChatGPT connection password is set, and which account and tenant those credentials belong to."
	sideLabel="Signed in as"
	sideValue={data.user.email}
	sideMeta={`Updated ${formatDateTime(data.entitlement.updatedAt)}`}
>
	<svelte:fragment slot="summary">
		<SummaryItem
			label="Access"
			value={accessStatusLabel(data.overview.accessAllowed)}
			note={humanizeReason(data.overview.accessReason)}
		/>
		<SummaryItem
			label="Bearer Token"
			value={tokenStatusLabel()}
			note={data.access.token?.token_prefix
				? `Prefix ${data.access.token.token_prefix}`
				: !data.entitlement.accountId || !data.entitlement.tenantId
					? 'Provisioning required'
					: 'Managed in MCP Access'}
		/>
		<SummaryItem
			label="ChatGPT Connection"
			value={passwordStatusLabel()}
			note={data.access.password.email ?? data.user.email}
		/>
		<SummaryItem
			label="Linked Account"
			value={data.entitlement.accountId ?? 'Not linked'}
			note={data.entitlement.tenantId ?? 'No tenant linked'}
		/>
		{#if assignment}
			<SummaryItem label="Assigned Lane" value={assignment.displayName} note={assignment.bridgeUsername} />
		{/if}
	</svelte:fragment>

	<ReportSection title="Access Eligibility" description="Live entitlement checks for managed `.agency` access.">
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
	</ReportSection>

	<ReportSection
		title="Identity Mapping"
		description="How your Auth0 portal identity maps to the underlying `.agency` account."
	>
		<FactList items={identityFacts} />
	</ReportSection>

	{#if assignmentFacts.length > 0}
		<ReportSection
			title="Assigned MCP Access"
			description="Lane-specific MCP and Notion bridge assignments linked to this `.agency` identity. Secrets remain in vault and are not shown here."
			href="/mcp-access"
			actionLabel="Open MCP Access"
		>
			<FactList items={assignmentFacts} />
		</ReportSection>
	{/if}

	<ReportSection
		title="Personal Bearer Token"
		description="The token you paste into Codex, Claude, Cursor, or another approved MCP host."
		href="/mcp-access"
		actionLabel="Manage token"
	>
		{#if !data.entitlement.accountId || !data.entitlement.tenantId}
			<p class="empty-copy">Provisioning must complete before token issuance is available.</p>
		{:else if data.access.tokenAvailable && data.access.token}
			<FactList items={tokenFacts} />
		{:else if data.access.tokenAvailable}
			<p class="empty-copy">No bearer token has been issued yet.</p>
		{:else}
			<p class="empty-copy">Token state is temporarily unavailable: {data.access.tokenError ?? 'Unable to reach identity services.'}</p>
		{/if}
	</ReportSection>

	<ReportSection
		title="ChatGPT Connection Password"
		description="The password used only on the ChatGPT authorize screen. It is separate from your portal login."
		href="/mcp-access"
		actionLabel={data.access.password.hasPassword ? 'Rotate password' : 'Set password'}
	>
		{#if !data.entitlement.accountId || !data.entitlement.tenantId}
			<p class="empty-copy">Provisioning must complete before ChatGPT connection setup is available.</p>
		{:else if data.access.password.available}
			<FactList items={passwordFacts} />
		{:else}
			<p class="empty-copy">Password state is temporarily unavailable: {data.access.password.error ?? 'Unable to reach identity services.'}</p>
		{/if}
	</ReportSection>

	<ReportSection
		title="Partner Connection"
		description="Workspace and integration context when this identity is linked to a partner-managed client."
	>
		{#if data.partner}
			<FactList items={partnerFacts} />
		{:else}
			<p class="empty-copy">No partner-managed client workspace is linked to this identity yet.</p>
		{/if}
	</ReportSection>

	<ReportSection
		title="Commercial State"
		description="Billing and contract context, only when it explains why access is active or blocked."
	>
		{#if data.commercial || data.contract}
			<FactList items={commercialFacts} />
		{:else}
			<p class="empty-copy">No contract or billing record is linked to this identity yet.</p>
		{/if}
	</ReportSection>
</ReportShell>

<style>
	.empty-copy,
	.callout p {
		color: var(--color-fg-muted);
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
		letter-spacing: 0.08em;
		border-radius: 999px;
		padding: 0.08rem 0.45rem;
	}

	:global(.table .badge.pass) {
		background: rgba(110, 231, 183, 0.12);
		color: #8de8a5;
	}

	:global(.table .badge.fail) {
		background: rgba(255, 138, 128, 0.12);
		color: #ff8a80;
	}
</style>

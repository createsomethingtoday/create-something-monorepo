<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { HighDensityTable } from '@create-something/tufte';
	import { invalidateAll } from '$app/navigation';
	import { FactList, ProspectWorkspaceSection, ReportSection, ReportShell, SummaryItem } from '$lib/components/access';
	import type { ProspectWorkspaceCandidate } from '$lib/types/prospect-workspace';

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
	const prospects = $derived((Array.isArray(data.prospects) ? data.prospects : []) as ProspectWorkspaceCandidate[]);

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
					{ label: 'Bound Host', value: data.access.token.bound_host ?? assignment?.laneKey ?? 'Unbound' },
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
					{ label: 'Lane Key', value: assignment.laneKey },
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
	noindex={true}
/>

<ReportShell
	eyebrow="Access Center"
	title="Dashboard"
	lede="A compact access report for `.agency`. Start with the entitlement decision, then review the identity, token, password, lane assignment, and commercial records that explain why access is active or blocked."
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
			label="ChatGPT Password"
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

	<ReportSection
		title="Access Eligibility"
		description="Live entitlement checks for managed `.agency` access. This is the audit trail for the current decision."
		fullWidth={true}
	>
		<div class="eligibility-grid">
			<div class="eligibility-main">
				{#if data.overview.accessReason === 'policy_acceptance_required'}
					<div class="inline-callout">
						<div>
							<strong>Policy acceptance required.</strong>
							<p>Access is blocked only because the `.agency` access policy has not yet been accepted for this account.</p>
						</div>
						<div class="callout-actions">
							<button type="button" class="action-button" disabled={policyBusy} onclick={acceptPolicy}>
								{policyBusy ? 'Accepting…' : 'Accept access policy'}
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
			</div>

			<div class="annotation-column">
				<p>The entitlement row is authoritative. Supporting records below explain the decision, but they do not replace the check set above.</p>
				<p>Where policy acceptance is the only failing check, access can be restored immediately from this page.</p>
			</div>
		</div>
	</ReportSection>

		<ReportSection
			title="Identity Mapping"
			description="How the Clerk portal identity maps to the underlying `.agency` account."
		>
		<FactList items={identityFacts} />
	</ReportSection>

	{#if prospects.length > 0}
		<ProspectWorkspaceSection prospects={prospects} href="/prospects" actionLabel="Open Prospect Portal" />
	{/if}

	{#if assignmentFacts.length > 0}
		<ReportSection
			title="Assigned MCP Access"
			description="Lane-specific MCP and Notion bridge assignments linked to this identity."
			href="/mcp-access"
			actionLabel="Open MCP Access"
		>
			<FactList items={assignmentFacts} />
		</ReportSection>
	{/if}

	<ReportSection
		title="Personal Bearer Token"
		description="The token used in Codex, Claude, Cursor, and other approved MCP hosts."
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
		description="The password used only on the ChatGPT authorize screen."
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
		description="Workspace and partner context when this identity is linked to a managed client."
	>
		{#if data.partner}
			<FactList items={partnerFacts} />
		{:else}
			<p class="empty-copy">No partner-managed client workspace is linked to this identity yet.</p>
		{/if}
	</ReportSection>

	<ReportSection
		title="Commercial State"
		description="Billing and contract records used when access eligibility depends on commercial standing."
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
	.inline-callout p,
	.annotation-column p {
		color: var(--color-fg-muted);
	}

	.eligibility-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(15rem, 18rem);
		gap: 1.2rem;
		align-items: start;
	}

	.eligibility-main {
		display: grid;
		gap: 0.9rem;
	}

	.inline-callout {
		display: grid;
		gap: 0.7rem;
		padding: 0.8rem 0.95rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.02);
	}

	.inline-callout strong {
		display: block;
		font-size: 0.88rem;
		font-weight: 560;
	}

	.inline-callout p {
		margin: 0.22rem 0 0;
		font-size: 0.82rem;
		line-height: 1.6;
	}

	.callout-actions {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		flex-wrap: wrap;
	}

	.action-button {
		border: 1px solid rgba(255, 255, 255, 0.18);
		background: rgba(255, 255, 255, 0.92);
		color: #111;
		padding: 0.6rem 0.82rem;
		font: inherit;
		font-size: 0.78rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
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
		font-size: 0.8rem;
	}

	.annotation-column {
		display: grid;
		gap: 0.75rem;
		padding-top: 0.15rem;
		font-size: 0.82rem;
		line-height: 1.62;
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

	:global(.table .badge) {
		text-transform: uppercase;
		letter-spacing: 0.08em;
		padding: 0;
		border-radius: 0;
		background: transparent;
	}

	:global(.table .badge.pass) {
		color: #8de8a5;
	}

	:global(.table .badge.fail) {
		color: #ff8a80;
	}

	@media (max-width: 860px) {
		.eligibility-grid {
			grid-template-columns: 1fr;
		}
	}
</style>

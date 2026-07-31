<script lang="ts">
	import type { AgencyAccessPreviewMode } from '$lib/agency-access';
	import {
		getAgencyAccessCheckItems,
		getAgencyAccessControlPlaneSurface,
		getAgencyAccessDetail,
		getAgencyAccessReasonLabel,
		getAgencyAccessStatusLabel,
		getAgencyAccessTone
	} from '$lib/agency-access';
	import {
		resetConciergeSessionClient,
		setAgencyAccessPreviewMode
	} from '$chat/client-actions';
	import { buildControlPlaneBridgeHref } from '$lib/control-plane';
	import type { PageData } from './$types';

	export let data: PageData;

	let resetting = false;
	let previewPendingMode: AgencyAccessPreviewMode | 'none' | null = null;
	let actionError = '';

	const previewOptions: Array<{
		mode: AgencyAccessPreviewMode | null;
		label: string;
		description: string;
	}> = [
		{
			mode: null,
			label: 'Require .agency',
			description: 'No override. Governed actions stay blocked until a real .agency session is present.'
		},
		{
			mode: 'allowed',
			label: 'Preview access active',
			description: 'Unlock recruiter, staffing, and onboarding actions locally for walkthroughs.'
		},
		{
			mode: 'policy_acceptance_required',
			label: 'Preview policy blocked',
			description: 'Simulate a policy-acceptance block from the control plane.'
		},
		{
			mode: 'billing_inactive',
			label: 'Preview billing blocked',
			description: 'Simulate billing-inactive gating from the control plane.'
		},
		{
			mode: 'service_not_entitled',
			label: 'Preview service blocked',
			description: 'Simulate a service-entitlement block from the control plane.'
		}
	];

	async function resetSession() {
		resetting = true;
		actionError = '';

		try {
			await resetConciergeSessionClient();
		} catch (error) {
			actionError = error instanceof Error ? error.message : 'Unable to reset the concierge session.';
		} finally {
			resetting = false;
		}
	}

	async function updatePreviewMode(mode: AgencyAccessPreviewMode | null) {
		previewPendingMode = mode ?? 'none';
		actionError = '';

		try {
			await setAgencyAccessPreviewMode(mode);
		} catch (error) {
			actionError =
				error instanceof Error ? error.message : 'Unable to update the preview entitlement mode.';
		} finally {
			previewPendingMode = null;
		}
	}

	$: dashboardHref = buildControlPlaneBridgeHref('dashboard');
	$: mcpAccessHref = buildControlPlaneBridgeHref('mcp-access');
	$: accessHref = buildControlPlaneBridgeHref(
		getAgencyAccessControlPlaneSurface(data.agencyAccess)
	);
	$: accessTone = getAgencyAccessTone(data.agencyAccess);
	$: accessLabel = getAgencyAccessStatusLabel(data.agencyAccess);
	$: accessDetail = getAgencyAccessDetail(data.agencyAccess);
	$: accessReason = getAgencyAccessReasonLabel(data.agencyAccess.decision?.reason);
	$: accessChecks = getAgencyAccessCheckItems(data.agencyAccess);
	$: activePreviewMode = data.agencyAccess.source === 'preview' ? data.agencyAccess.previewMode : null;
</script>

<svelte:head>
	<title>Staffing workspace settings | Abundance Concierge</title>
	<meta
		name="description"
		content="Review Abundance Concierge session, control-plane access, security, and hosted product preferences."
	/>
</svelte:head>

<section class="glass panel">
		<div class="section-header">
			<div>
				<div class="eyebrow">Settings</div>
				<h1 class="section-title">Hosted product preferences</h1>
			</div>
			<button type="button" on:click={resetSession} disabled={resetting}>
				{resetting ? 'Resetting...' : 'Reset session'}
			</button>
		</div>
	<p class="muted">
		This surface owns conversation defaults and linked-tool status. Credential minting, security
		controls, and entitlement changes still live in `.agency`, and the bridge links below route
		into those real control-plane pages while the chat state here stays session-local.
	</p>

	{#if actionError}
		<p class="error-text">{actionError}</p>
	{/if}
</section>

<section class="glass panel section-gap">
	<div class="section-header">
		<div>
			<div class="eyebrow">Control Plane Access</div>
			<h2 class="section-title">
				{#if !data.user && data.agencyAccess.source === 'preview'}
					Preview `.agency` access override
				{:else if !data.user}
					No `.agency` session detected
				{:else if data.agencyAccess.status === 'allowed'}
					`.agency` access is active
				{:else if data.agencyAccess.status === 'blocked'}
					`.agency` access is blocked
				{:else}
					`.agency` access could not be verified
				{/if}
			</h2>
		</div>
		<span class={`status-pill ${accessTone}`}>{accessLabel}</span>
	</div>

	{#if data.user}
		<p class="muted">
			{accessDetail}
		</p>
		<div class="session-grid">
			<div>
				<strong>Email</strong>
				<div class="muted">{data.user.email}</div>
			</div>
			<div>
				<strong>Tier</strong>
				<div class="muted">{data.user.tier}</div>
			</div>
			<div>
				<strong>Source</strong>
				<div class="muted">{data.user.source}</div>
			</div>
			<div>
				<strong>Service Tier</strong>
				<div class="muted">{data.agencyAccess.snapshot?.serviceTier ?? 'Unavailable'}</div>
			</div>
			<div>
				<strong>Account ID</strong>
				<div class="muted">{data.agencyAccess.accountId ?? 'Not linked'}</div>
			</div>
			<div>
				<strong>Tenant ID</strong>
				<div class="muted">{data.agencyAccess.tenantId ?? 'Not linked'}</div>
			</div>
		</div>

		{#if data.agencyAccess.status !== 'allowed'}
			<p class="muted detail-note">
				<strong>Current verdict:</strong> {accessReason}
			</p>
		{/if}

		{#if accessChecks.length > 0}
			<div class="check-grid">
				{#each accessChecks as item}
					<div class="check-row">
						<span>{item.label}</span>
						<span class={`status-pill ${item.passed ? 'good' : 'warn'}`}>
							{item.passed ? 'pass' : 'blocked'}
						</span>
					</div>
				{/each}
			</div>
		{/if}

		<div class="link-list">
			<a href={accessHref} target="_blank" rel="noreferrer">
				{data.agencyAccess.status === 'allowed'
					? 'Open .agency account'
					: 'Review access in .agency'}
			</a>
			<a href={dashboardHref} target="_blank" rel="noreferrer">Open .agency dashboard</a>
			<a href={mcpAccessHref} target="_blank" rel="noreferrer">Open .agency MCP access</a>
		</div>
	{:else}
		<p class="muted">
			{#if data.agencyAccess.source === 'preview'}
				{accessDetail}
			{:else}
				Use the control-plane bridge to enter `.agency`. If the browser already has a valid
				`.agency` session, the connected state will appear here automatically on reload.
			{/if}
		</p>
		<div class="link-list">
			<a href={dashboardHref} target="_blank" rel="noreferrer">Connect through .agency dashboard</a>
			<a href={mcpAccessHref} target="_blank" rel="noreferrer">Open .agency MCP access</a>
		</div>
	{/if}
</section>

{#if !data.user && data.agencyAccessPreviewEnabled}
	<section class="glass panel section-gap">
		<div class="section-header">
			<div>
				<div class="eyebrow">Preview Entitlement</div>
				<h2 class="section-title">Local `.agency` access modes</h2>
			</div>
			<span
				class={`status-pill ${
					activePreviewMode === 'allowed'
						? 'good'
						: activePreviewMode
							? 'warn'
							: 'good'
				}`}
			>
				{activePreviewMode ? 'preview override active' : 'live control-plane required'}
			</span>
		</div>
		<p class="muted">
			Use these local overrides only when no real `.agency` session is present. They never replace
			a live control-plane decision, but they let the workflow continue through governed
			recruiter, staffing, and onboarding transitions.
		</p>
		<div class="preview-grid">
			{#each previewOptions as option}
				<button
					type="button"
					class={`preview-option ${activePreviewMode === option.mode ? 'active' : ''}`}
					on:click={() => updatePreviewMode(option.mode)}
					disabled={
						previewPendingMode !== null ||
						(activePreviewMode === option.mode && previewPendingMode === null)
					}
				>
					<strong>{option.label}</strong>
					<span>{option.description}</span>
				</button>
			{/each}
		</div>
	</section>
{/if}

<section class="grid-3 section-gap">
	<div class="glass panel">
		<h2 class="section-title">Notifications</h2>
		<ul>
			{#each data.settings.notifications as item}
				<li>{item}</li>
			{/each}
		</ul>
	</div>

	<div class="glass panel">
		<h2 class="section-title">Guardrails</h2>
		<ul>
			{#each data.settings.guardrails as item}
				<li>{item}</li>
			{/each}
		</ul>
	</div>

	<div class="glass panel">
		<h2 class="section-title">Control Plane</h2>
		<div class="link-list">
			{#each data.settings.controlPlaneLinks as link}
				<a href={link.href} target="_blank" rel="noreferrer">{link.label}</a>
			{/each}
		</div>
	</div>
</section>

<section class="grid-2 section-gap">
	<div class="glass panel" id="mcp-access">
		<h2 class="section-title">.agency MCP Access</h2>
		<p class="muted">
			Linked tool state below reflects the live server-owned session state for this browser. Use
			the `.agency` bridge when a tool needs actual credential recovery or access review.
		</p>
		<div class="tool-list">
			{#each data.toolStatusRows as tool}
				<div class="tool-row">
					<div>
						<strong>{tool.name}</strong>
						<div class="muted">{tool.threadTitle}</div>
						<div class="muted">{tool.note}</div>
					</div>
					{#if tool.actionHref}
						<a class="tool-link" href={tool.actionHref} target="_blank" rel="noreferrer">
							Open in .agency
						</a>
					{:else}
						<span class={`status-pill ${tool.status === 'connected' ? 'good' : 'warn'}`}>
							{tool.status.replace('_', ' ')}
						</span>
					{/if}
				</div>
			{/each}
		</div>
	</div>

		<div class="glass panel" id="security-posture">
			<h2 class="section-title">.agency Security Posture</h2>
			<ul>
				<li>Session actions are browser-scoped and resettable.</li>
				<li>Real access, entitlement, and credential recovery are routed to `.agency`.</li>
				<li>Handoff remains gated to escalated threads only.</li>
			<li>External writes stay blocked until consent, documents, and reconnect state are cleared.</li>
		</ul>
	</div>
</section>

<style>
	.panel {
		padding: 1.2rem;
	}

	.section-gap {
		margin-top: 1rem;
	}

	.section-header,
	.tool-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	ul {
		margin: 0.8rem 0 0;
		padding-left: 1.1rem;
		line-height: 1.7;
	}

	.link-list {
		display: grid;
		gap: 0.75rem;
		margin-top: 0.8rem;
	}

	.session-grid {
		display: grid;
		gap: 0.85rem;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		margin-top: 1rem;
	}

	.check-grid {
		display: grid;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.check-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.75rem 0.9rem;
		border-radius: 16px;
		background: var(--surface-soft);
		border: 1px solid var(--line);
	}

	.detail-note {
		margin-top: 1rem;
	}

	.preview-grid {
		display: grid;
		gap: 0.85rem;
		margin-top: 1rem;
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.preview-option {
		display: grid;
		gap: 0.45rem;
		padding: 1rem;
		border-radius: 18px;
		border: 1px solid var(--line);
		background: var(--surface-soft);
		text-align: left;
	}

	.preview-option.active {
		border-color: var(--line-accent);
		box-shadow: 0 0 0 1px rgba(167, 184, 255, 0.16);
	}

	.preview-option span {
		color: var(--muted);
		font-size: 0.92rem;
		line-height: 1.5;
	}

	.link-list a {
		text-decoration: none;
		color: var(--accent);
		font-weight: 600;
	}

	.link-list a:hover {
		color: var(--accent-strong);
	}

	.tool-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.7rem 1rem;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: var(--surface-overlay);
		color: var(--ink);
		text-decoration: none;
		font-weight: 600;
	}

	.tool-list {
		display: grid;
		gap: 0.85rem;
		margin-top: 1rem;
	}

	@media (max-width: 760px) {
		.session-grid {
			grid-template-columns: 1fr;
		}

		.preview-grid {
			grid-template-columns: 1fr;
		}
	}

	.error-text {
		margin-top: 1rem;
		color: var(--danger);
	}
</style>

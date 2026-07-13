<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { ProspectWorkspaceCandidate } from '$lib/types/prospect-workspace';
	import ReportSection from './ReportSection.svelte';

	let {
		prospects = [],
		title = 'Prospect Workspaces',
		description = 'Preprovisioned partner workspaces this Auth0 account can view or bind before commercial graduation. Claiming binds identity; it does not issue customer credentials.',
		href = null,
		actionLabel = null,
		emptyMessage = 'No prospect workspaces are currently authorized for this Auth0 account.',
	}: {
		prospects?: ProspectWorkspaceCandidate[];
		title?: string;
		description?: string;
		href?: string | null;
		actionLabel?: string | null;
		emptyMessage?: string;
	} = $props();

	let claimBusyKey = $state<string | null>(null);
	let claimMessage = $state('');
	let claimError = $state('');
	let connectBusyKey = $state<string | null>(null);
	let connectMessage = $state('');
	let connectError = $state('');
	const graduationCheckOrder = [
		'service_entitled',
		'policy_accepted',
		'contract_active',
		'billing_active',
		'org_membership_active',
		'managed_bearer_allowed',
	] as const;

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

	function prospectStateTone(
		prospect: ProspectWorkspaceCandidate,
	): 'claimable' | 'claimed_by_you' | 'claimed_by_other' | 'blocked' | 'unavailable' {
		if (prospect.prospect_claim.blocked_reason === 'prospect_unavailable') {
			return 'unavailable';
		}
		if (prospect.prospect_claim.state === 'claimable' && !prospect.prospect_claim.can_claim_now) {
			return 'blocked';
		}
		return prospect.prospect_claim.state;
	}

	function prospectStateLabel(prospect: ProspectWorkspaceCandidate): string {
		if (prospect.prospect_claim.blocked_reason === 'prospect_unavailable') {
			return 'Unavailable';
		}
		if (prospect.prospect_claim.state === 'claimable' && !prospect.prospect_claim.can_claim_now) {
			return 'Review required';
		}

		switch (prospect.prospect_claim.state) {
			case 'claimable':
				return 'Claimable now';
			case 'claimed_by_you':
				return 'Claimed by this account';
			case 'claimed_by_other':
				return 'Claimed elsewhere';
		}
	}

	function prospectEnabledToolkits(prospect: ProspectWorkspaceCandidate): string[] {
		return [...new Set([...prospect.client.required_toolkits, ...prospect.lane.toolkit_profile])].filter(
			(value): value is string => Boolean(value),
		);
	}

	function prospectConnectionStatusLabel(value: string): string {
		return humanizeReason(value.trim().toLowerCase());
	}

	function preferredProspectToolkitAccount(
		prospect: ProspectWorkspaceCandidate,
		toolkit: string,
	): ProspectWorkspaceCandidate['toolkit_accounts'][number] | null {
		const matches = prospect.toolkit_accounts.filter((account) => account.toolkit === toolkit);
		if (matches.length === 0) {
			return null;
		}
		return [...matches].sort((left, right) => prospectToolkitAccountRank(right) - prospectToolkitAccountRank(left))[0] ?? null;
	}

	function prospectToolkitAccountRank(account: ProspectWorkspaceCandidate['toolkit_accounts'][number]): number {
		let rank = 0;
		if (account.account_slug === 'primary') rank += 25;
		if (account.status === 'active') rank += 15;
		if (account.connected || account.connection_status === 'ACTIVE') rank += 100;
		if (account.connection_status === 'INITIATED') rank += 30;
		return rank;
	}

	function prospectToolkitState(prospect: ProspectWorkspaceCandidate, toolkit: string) {
		const account = preferredProspectToolkitAccount(prospect, toolkit);
		if (!account) {
			return {
				label: 'Not connected',
				tone: 'idle' as const,
				note: 'No toolkit account is linked yet.',
				canConnect: true,
				buttonLabel: `Connect ${toolkit}`,
			};
		}
		if (account.status !== 'active') {
			return {
				label: 'Operator review',
				tone: 'attention' as const,
				note: 'This toolkit binding is not active. Operator review is required before reconnecting it.',
				canConnect: false,
				buttonLabel: `Connect ${toolkit}`,
			};
		}
		if (account.connection_status === 'ACTIVE' || account.connected) {
			return {
				label: 'Connected',
				tone: 'connected' as const,
				note: account.connected_at
					? `Connected ${formatDateTime(account.connected_at)}`
					: account.last_checked_at
						? `Verified ${formatDateTime(account.last_checked_at)}`
						: 'Connection is active.',
				canConnect: true,
				buttonLabel: `Reconnect ${toolkit}`,
			};
		}
		if (account.connection_status === 'INITIATED') {
			return {
				label: 'Awaiting completion',
				tone: 'pending' as const,
				note: account.last_checked_at
					? `Last checked ${formatDateTime(account.last_checked_at)}`
					: 'Return from the provider flow to complete this connection.',
				canConnect: true,
				buttonLabel: `Continue ${toolkit}`,
			};
		}
		return {
			label: prospectConnectionStatusLabel(account.connection_status),
			tone: 'attention' as const,
			note: account.last_checked_at
				? `Last checked ${formatDateTime(account.last_checked_at)}`
				: 'This connection needs attention.',
			canConnect: true,
			buttonLabel: `Reconnect ${toolkit}`,
		};
	}

	function graduationReadinessLabel(prospect: ProspectWorkspaceCandidate): string {
		if (!prospect.graduation_readiness) {
			return 'Pending';
		}
		return prospect.graduation_readiness.ready ? 'Ready for graduation' : 'Graduation blocked';
	}

	function graduationReadinessTone(prospect: ProspectWorkspaceCandidate): 'connected' | 'attention' {
		return prospect.graduation_readiness?.ready ? 'connected' : 'attention';
	}

	function graduationCheckEntries(prospect: ProspectWorkspaceCandidate) {
		if (!prospect.graduation_readiness) {
			return [];
		}
		return graduationCheckOrder.map((key) => ({
			key,
			label: humanizeReason(key),
			ok: prospect.graduation_readiness?.checks[key] ?? false,
		}));
	}

	async function claimProspect(prospect: ProspectWorkspaceCandidate) {
		const key = `${prospect.client.slug}:${prospect.lane.slug}`;
		claimBusyKey = key;
		claimMessage = '';
		claimError = '';

		try {
			const response = await fetch(`/api/me/prospects/${prospect.client.slug}/claim`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					lane_slug: prospect.lane.slug,
				}),
			});
			const payload = (await response.json().catch(() => ({}))) as { message?: string };
			if (!response.ok) {
				throw new Error(payload.message ?? 'Failed to claim prospect workspace');
			}
			claimMessage = `${prospect.client.display_name ?? prospect.client.slug} is now bound to this Auth0 account.`;
			await invalidateAll();
		} catch (error) {
			claimError = error instanceof Error ? error.message : 'Failed to claim prospect workspace';
		} finally {
			claimBusyKey = null;
		}
	}

	async function connectProspectToolkit(prospect: ProspectWorkspaceCandidate, toolkit: string) {
		const key = `${prospect.client.slug}:${prospect.lane.slug}:${toolkit}`;
		connectBusyKey = key;
		connectMessage = '';
		connectError = '';

		try {
			const response = await fetch(`/api/me/prospects/${prospect.client.slug}/toolkits/${toolkit}/connect-link`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					lane_slug: prospect.lane.slug,
					callback_url: window.location.href,
				}),
			});
			const payload = (await response.json().catch(() => ({}))) as {
				message?: string;
				connect_link?: string;
			};
			if (!response.ok) {
				throw new Error(payload.message ?? `Failed to start ${toolkit} connection`);
			}
			if (!payload.connect_link) {
				throw new Error(`No ${toolkit} connect link was returned`);
			}
			connectMessage = `Opening ${toolkit} connection flow…`;
			window.location.assign(payload.connect_link);
		} catch (error) {
			connectError = error instanceof Error ? error.message : `Failed to start ${toolkit} connection`;
		} finally {
			connectBusyKey = null;
		}
	}
</script>

<ReportSection {title} {description} {href} {actionLabel}>
	{#if prospects.length === 0}
		<p class="empty-copy">{emptyMessage}</p>
	{:else}
		<div class="prospect-grid">
			{#each prospects as prospect}
				<article class="prospect-card">
					<div class="prospect-card-header">
						<div>
							<strong>{prospect.client.display_name ?? prospect.client.slug}</strong>
							<p>{prospect.lane.display_name} · {prospect.client.slug}</p>
						</div>
						<span class={`prospect-state ${prospectStateTone(prospect)}`}>
							{prospectStateLabel(prospect)}
						</span>
					</div>

					<div class="prospect-card-body">
						<p>
							<strong>Authorized via:</strong> {humanizeReason(prospect.prospect_claim.authorized_via)}
						</p>
						<p>
							<strong>Graduation target:</strong> {prospect.prospect_claim.service_tier}
						</p>
						<p>
							<strong>Enabled toolkits:</strong> {prospectEnabledToolkits(prospect).join(', ') || 'Not set'}
						</p>
						<p>
							<strong>Lane host:</strong> {prospect.lane.hub_url}
						</p>
						<p>
							<strong>Lifecycle:</strong> {prospect.client.status} client · {prospect.lane.status} lane
						</p>
					</div>

					<p class="empty-copy">{prospect.issuance_state.message}</p>

					{#if prospect.prospect_claim.state === 'claimed_by_you' && prospect.graduation_readiness}
						<div class="prospect-readiness">
							<div class="prospect-readiness-header">
								<strong>Graduation readiness</strong>
								<span class={`prospect-toolkit-state ${graduationReadinessTone(prospect)}`}>
									{graduationReadinessLabel(prospect)}
								</span>
							</div>
							<p>{prospect.graduation_readiness.blocked_message}</p>
							<p>
								<strong>Entitlement binding:</strong>
								{prospect.graduation_readiness.account_id ?? 'Unbound'} /
								{prospect.graduation_readiness.tenant_id ?? 'Unbound'}
							</p>
							{#if prospect.graduation_readiness.snapshot}
								<p>
									<strong>Entitlement tier:</strong>
									{prospect.graduation_readiness.snapshot.service_tier}
								</p>
							{/if}
							<div class="prospect-readiness-grid">
								{#each graduationCheckEntries(prospect) as check}
									<div class="prospect-readiness-item">
										<span>{check.label}</span>
										<span class={`prospect-toolkit-state ${check.ok ? 'connected' : 'attention'}`}>
											{check.ok ? 'Ready' : 'Blocked'}
										</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					{#if prospect.prospect_claim.blocked_message}
						<p class="feedback error">{prospect.prospect_claim.blocked_message}</p>
					{/if}

					{#if prospect.prospect_claim.can_claim_now && prospect.prospect_claim.state !== 'claimed_by_you'}
						<div class="callout-actions">
							<button
								type="button"
								class="action-button"
								disabled={claimBusyKey === `${prospect.client.slug}:${prospect.lane.slug}`}
								onclick={() => claimProspect(prospect)}
							>
								{claimBusyKey === `${prospect.client.slug}:${prospect.lane.slug}` ? 'Claiming…' : 'Claim workspace'}
							</button>
						</div>
					{:else if prospect.prospect_claim.state === 'claimed_by_you' && prospect.prospect_claim.can_claim_now}
						<p class="feedback success">This workspace is already bound to this Auth0 account.</p>
						{#if prospectEnabledToolkits(prospect).length > 0}
							<div class="prospect-toolkit-list">
								{#each prospectEnabledToolkits(prospect) as toolkit}
									{@const account = preferredProspectToolkitAccount(prospect, toolkit)}
									{@const toolkitState = prospectToolkitState(prospect, toolkit)}
									<div class="prospect-toolkit-row">
										<div>
											<strong>{toolkit}</strong>
											<p>
												{#if account?.display_label}
													{account.display_label} ·
												{/if}
												{toolkitState.note}
											</p>
										</div>
										<div class="prospect-toolkit-actions">
											<span class={`prospect-toolkit-state ${toolkitState.tone}`}>{toolkitState.label}</span>
											{#if toolkitState.canConnect}
												<button
													type="button"
													class="action-button"
													disabled={connectBusyKey === `${prospect.client.slug}:${prospect.lane.slug}:${toolkit}`}
													onclick={() => connectProspectToolkit(prospect, toolkit)}
												>
													{connectBusyKey === `${prospect.client.slug}:${prospect.lane.slug}:${toolkit}`
														? `Opening ${toolkit}…`
														: toolkitState.buttonLabel}
												</button>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						{/if}
					{/if}
				</article>
			{/each}
		</div>
	{/if}

	{#if claimMessage}
		<p class="feedback success">{claimMessage}</p>
	{/if}
	{#if claimError}
		<p class="feedback error">{claimError}</p>
	{/if}
	{#if connectMessage}
		<p class="feedback success">{connectMessage}</p>
	{/if}
	{#if connectError}
		<p class="feedback error">{connectError}</p>
	{/if}
</ReportSection>

<style>
	.empty-copy {
		color: var(--color-performance-fg-muted);
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

	.feedback {
		margin: 0.2rem 0 0;
		font-size: 0.8rem;
		line-height: 1.6;
	}

	.feedback.success {
		color: #8de8a5;
	}

	.feedback.error {
		color: #ff8a80;
	}

	.prospect-grid {
		display: grid;
		gap: 0.8rem;
	}

	.prospect-card {
		display: grid;
		gap: 0.75rem;
		padding: 0.9rem 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.02);
	}

	.prospect-card-header {
		display: flex;
		justify-content: space-between;
		gap: 0.8rem;
		align-items: start;
	}

	.prospect-card-header strong {
		display: block;
		font-size: 0.88rem;
		font-weight: 560;
	}

	.prospect-card-header p,
	.prospect-card-body p {
		margin: 0.18rem 0 0;
		font-size: 0.82rem;
		line-height: 1.6;
		color: var(--color-performance-fg-muted);
	}

	.prospect-card-body {
		display: grid;
		gap: 0.3rem;
	}

	.prospect-toolkit-list {
		display: grid;
		gap: 0.65rem;
	}

	.prospect-readiness {
		display: grid;
		gap: 0.45rem;
		padding: 0.75rem 0.85rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
	}

	.prospect-readiness-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.8rem;
		flex-wrap: wrap;
	}

	.prospect-readiness p {
		margin: 0;
		font-size: 0.78rem;
		line-height: 1.55;
		color: var(--color-performance-fg-muted);
	}

	.prospect-readiness-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
		gap: 0.45rem 0.7rem;
	}

	.prospect-readiness-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.7rem;
		padding-top: 0.1rem;
		font-size: 0.76rem;
		color: var(--color-performance-fg-muted);
	}

	.prospect-toolkit-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.9rem;
		padding-top: 0.1rem;
	}

	.prospect-toolkit-row strong {
		display: block;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.prospect-toolkit-row p {
		margin: 0.18rem 0 0;
		font-size: 0.78rem;
		line-height: 1.5;
		color: var(--color-performance-fg-muted);
	}

	.prospect-toolkit-actions {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.prospect-toolkit-state {
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		white-space: nowrap;
	}

	.prospect-toolkit-state.connected {
		color: #8de8a5;
	}

	.prospect-toolkit-state.pending {
		color: #f3c97a;
	}

	.prospect-toolkit-state.attention {
		color: #ffb38a;
	}

	.prospect-toolkit-state.idle {
		color: var(--color-performance-fg-muted);
	}

	.prospect-state {
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		white-space: nowrap;
	}

	.prospect-state.claimable {
		color: #8de8a5;
	}

	.prospect-state.blocked {
		color: #f3c97a;
	}

	.prospect-state.claimed_by_you {
		color: #9dd7ff;
	}

	.prospect-state.claimed_by_other {
		color: #ffb38a;
	}

	.prospect-state.unavailable {
		color: #f3c97a;
	}

	@media (max-width: 860px) {
		.prospect-toolkit-row {
			flex-direction: column;
			align-items: start;
		}

		.prospect-toolkit-actions {
			justify-content: start;
		}
	}
</style>

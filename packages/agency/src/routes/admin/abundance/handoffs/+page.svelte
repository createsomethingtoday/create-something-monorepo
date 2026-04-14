<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Card, SEO } from '@create-something/canon';
	import type { PageData } from './$types';
	import type {
		ApiResponse,
		NurseHandoffActionResult,
		NurseHandoffActionType,
		NurseHandoffItem,
		NurseHandoffResponse
	} from '$lib/types/abundance';

	type FlashMessage = { type: 'success' | 'error'; text: string } | null;

	let { data }: { data: PageData } = $props();

	const handoffs = $derived(data.handoffs as NurseHandoffResponse);
	const items = $derived(handoffs.items as NurseHandoffItem[]);
	const filters = $derived(handoffs.filters);
	const recruiters = $derived(handoffs.recruiters);

	const availableQueues = $derived(
		Array.from(new Set(handoffs.summary.by_queue.map((item) => item.queue_slug)))
	);

	let flashMessage = $state<FlashMessage>(null);
	let actionBusy = $state<{ handoffId: string; action: NurseHandoffActionType } | null>(null);

	function formatDate(value?: string): string {
		if (!value) return '—';
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
	}

	function labelize(value: string): string {
		return value.replace(/_/g, ' ');
	}

	function formatAge(hours: number): string {
		if (hours < 1) return '<1h';
		if (hours < 24) return `${Math.round(hours)}h`;

		const days = Math.floor(hours / 24);
		const remainingHours = Math.round(hours % 24);
		return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
	}

	function describeSla(item: NurseHandoffItem): string {
		switch (item.sla_state) {
			case 'overdue':
				return item.hours_until_sla !== undefined
					? `${Math.abs(item.hours_until_sla).toFixed(1)}h overdue`
					: 'Overdue';
			case 'due_soon':
				return item.hours_until_sla !== undefined
					? `${item.hours_until_sla.toFixed(1)}h left`
					: 'Due soon';
			case 'on_track':
				return item.hours_until_sla !== undefined
					? `${item.hours_until_sla.toFixed(1)}h left`
					: 'On track';
			case 'resolved':
				return 'Resolved';
			default:
				return 'No SLA';
		}
	}

	function isBusy(handoffId: string, action?: NurseHandoffActionType): boolean {
		return actionBusy?.handoffId === handoffId && (!action || actionBusy.action === action);
	}

	function isActionable(status: NurseHandoffItem['status']): boolean {
		return status === 'open' || status === 'accepted';
	}

	async function submitHandoffAction(event: SubmitEvent, item: NurseHandoffItem) {
		event.preventDefault();
		flashMessage = null;

		const submitter = event.submitter as HTMLButtonElement | null;
		const action = submitter?.value as NurseHandoffActionType | undefined;
		if (!action) {
			flashMessage = { type: 'error', text: 'Choose a handoff action before submitting.' };
			return;
		}

		const form = event.currentTarget as HTMLFormElement;
		const formData = new FormData(form);
		const recruiterPersonId =
			String(formData.get('recruiter_person_id') || '').trim() || undefined;
		const note = String(formData.get('note') || '').trim() || undefined;

		actionBusy = { handoffId: item.id, action };

		try {
			const response = await fetch('/api/abundance/handoffs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					handoff_id: item.id,
					action,
					recruiter_person_id: recruiterPersonId,
					note
				})
			});

			const payload = (await response.json().catch(() => ({}))) as ApiResponse<NurseHandoffActionResult>;
			if (!response.ok || !payload.success || !payload.data) {
				throw new Error(payload.error || 'Unable to apply handoff action.');
			}

			flashMessage = { type: 'success', text: payload.data.message };
			await invalidateAll();
		} catch (err) {
			flashMessage = {
				type: 'error',
				text: err instanceof Error ? err.message : 'Unable to apply handoff action.'
			};
		} finally {
			actionBusy = null;
		}
	}
</script>

<SEO
	title="Abundance Handoffs"
	description="Operator queue for recruiter handoffs created from nurse intake."
	propertyName="agency"
	noindex={true}
/>

<section class="shell">
	<div class="shell-inner">
		<header class="hero">
			<p class="eyebrow">Operator Surface</p>
			<h1>Abundance Handoffs</h1>
			<p>
				Track recruiter work after a nurse leaves the intake inbox. Open and accepted handoffs
				stay here until they are completed or cancelled, with assignment and operator notes tied
				to the handoff record itself.
			</p>
			<nav class="subnav">
				<a href="/admin/abundance/inbox">Inbox</a>
				<a href="/admin/abundance/handoffs" aria-current="page">Handoffs</a>
				<a href="/admin/funnel">Funnel</a>
				<a href="/admin/security">Security</a>
			</nav>
		</header>

		{#if flashMessage}
			<p class="message" class:success={flashMessage.type === 'success'} class:error={flashMessage.type === 'error'}>
				{flashMessage.text}
			</p>
		{/if}

		<section class="summary-grid">
			<Card variant="glass" radius="md" padding="md" class="glass-emphasis stat-card">
				<span class="label">Visible Handoffs</span>
				<strong>{handoffs.summary.total_items}</strong>
			</Card>
			<Card variant="standard" radius="md" padding="md" class="stat-card">
				<span class="label">Open</span>
				<strong>{handoffs.summary.open_items}</strong>
			</Card>
			<Card variant="standard" radius="md" padding="md" class="stat-card">
				<span class="label">Accepted</span>
				<strong>{handoffs.summary.accepted_items}</strong>
			</Card>
			<Card variant="standard" radius="md" padding="md" class="stat-card attention">
				<span class="label">Overdue</span>
				<strong>{handoffs.summary.overdue_items}</strong>
			</Card>
			<Card variant="standard" radius="md" padding="md" class="stat-card caution">
				<span class="label">Due Soon</span>
				<strong>{handoffs.summary.due_soon_items}</strong>
			</Card>
			<Card variant="standard" radius="md" padding="md" class="stat-card">
				<span class="label">Resolved</span>
				<strong>{handoffs.summary.completed_items + handoffs.summary.cancelled_items}</strong>
			</Card>
		</section>

		<section class="panel">
			<div class="panel-header">
				<div>
					<h2>Filters</h2>
					<p>Default view shows active handoffs only.</p>
				</div>
				<a class="reset-link" href="/admin/abundance/handoffs">Reset</a>
			</div>

			<form class="filters" method="GET">
				<label>
					<span>Status</span>
					<select name="status">
						<option value="">active (open + accepted)</option>
						<option value="all" selected={filters.status === 'all'}>all</option>
						<option value="open" selected={filters.status === 'open'}>open</option>
						<option value="accepted" selected={filters.status === 'accepted'}>accepted</option>
						<option value="completed" selected={filters.status === 'completed'}>completed</option>
						<option value="cancelled" selected={filters.status === 'cancelled'}>cancelled</option>
					</select>
				</label>

				<label>
					<span>Queue</span>
					<select name="queue_slug">
						<option value="">All</option>
						{#each availableQueues as queueSlug}
							<option value={queueSlug} selected={filters.queue_slug === queueSlug}>{queueSlug}</option>
						{/each}
					</select>
				</label>

				<label>
					<span>Limit</span>
					<select name="limit">
						<option value="20" selected={handoffs.limit === 20}>20</option>
						<option value="40" selected={handoffs.limit === 40}>40</option>
						<option value="80" selected={handoffs.limit === 80}>80</option>
					</select>
				</label>

				<button type="submit">Apply</button>
			</form>

			{#if handoffs.summary.by_queue.length > 0}
				<div class="queue-chips">
					{#each handoffs.summary.by_queue as item}
						<span class="queue-chip">{item.queue_slug}: {item.count}</span>
					{/each}
				</div>
			{/if}
		</section>

		<section class="panel">
			<div class="panel-header">
				<div>
					<h2>Handoff Queue</h2>
					<p>{handoffs.total} handoff{handoffs.total === 1 ? '' : 's'} matched.</p>
				</div>
			</div>

			{#if items.length === 0}
				<p class="empty-state">No handoffs match the current filters.</p>
			{:else}
				<div class="handoff-list">
					{#each items as item}
						<article
							class="handoff-card"
							class:overdue={item.sla_state === 'overdue'}
							class:dueSoon={item.sla_state === 'due_soon'}
						>
							<div class="handoff-header">
								<div>
									<h3>{item.candidate_name || item.candidate_profile_id || 'Unlinked candidate'}</h3>
									<p class="meta">
										{labelize(item.status)} · created {formatDate(item.created_at)} · age {formatAge(item.age_hours)}
									</p>
								</div>
								<div class="badges">
									<span class="badge queue">{item.queue_slug || 'unassigned'}</span>
									<span class="badge status">{labelize(item.status)}</span>
									<span class={`badge sla ${item.sla_state}`}>{describeSla(item)}</span>
								</div>
							</div>

							<div class="handoff-grid">
								<div class="stack">
									<h4>Reason</h4>
									<p>{item.reason}</p>
								</div>
								<div class="stack">
									<h4>Candidate</h4>
									<p>
										{item.profession ? item.profession.toUpperCase() : 'unknown'}
										{#if item.specialty_primary}
											· {item.specialty_primary}
										{/if}
									</p>
									<p class="muted">
										{item.home_state || 'state pending'}
										{#if item.profile_status}
											· {labelize(item.profile_status)}
										{/if}
									</p>
								</div>
								<div class="stack">
									<h4>Assignee</h4>
									<p>{item.recruiter?.name || 'Unassigned'}</p>
									<p class="muted">{item.recruiter?.email || 'no recruiter email'}</p>
								</div>
							</div>

							{#if item.opening?.facility_name || item.opening?.specialty}
								<div class="message-block">
									<h4>Opening Context</h4>
									<p>
										{item.opening?.facility_name || 'facility pending'}
										{#if item.opening?.specialty}
											· {item.opening.specialty}
										{/if}
										{#if item.opening?.state}
											· {item.opening.state}
										{/if}
									</p>
								</div>
							{/if}

							<div class="handoff-meta-grid">
								<div class="stack">
									<h4>SLA Due</h4>
									<p>{formatDate(item.sla_due_at)}</p>
								</div>
								<div class="stack">
									<h4>Queue Age</h4>
									<p>{formatAge(item.age_hours)}</p>
								</div>
								<div class="stack">
									<h4>Acknowledged</h4>
									<p>{formatDate(item.acknowledged_at)}</p>
								</div>
								<div class="stack">
									<h4>Resolved</h4>
									<p>{formatDate(item.resolved_at)}</p>
								</div>
							</div>

							{#if item.last_note}
								<div class="message-block">
									<h4>Latest Note</h4>
									<p>{item.last_note}</p>
									<p class="muted">
										{item.last_updated_by || 'unknown operator'} · {formatDate(item.last_updated_at)}
									</p>
								</div>
							{/if}

							{#if isActionable(item.status)}
								<form class="action-panel" onsubmit={(event) => submitHandoffAction(event, item)}>
									<div class="action-grid">
										<label class="action-field">
											<span>Recruiter</span>
											<select name="recruiter_person_id">
												<option value="">Unassigned</option>
												{#each recruiters as recruiter}
													<option value={recruiter.id} selected={item.recruiter?.id === recruiter.id}>
														{recruiter.name}{recruiter.email ? ` · ${recruiter.email}` : ''}
													</option>
												{/each}
											</select>
										</label>

										<label class="action-field action-field-wide">
											<span>Operator Note</span>
											<textarea
												name="note"
												rows="2"
												placeholder="Add handoff context, update, or resolution note."
											/>
										</label>
									</div>

									<div class="action-buttons">
										<button
											type="submit"
											class="secondary"
											name="action"
											value="accept"
											disabled={Boolean(actionBusy && actionBusy.handoffId === item.id)}
										>
											{isBusy(item.id, 'accept')
												? 'Saving...'
												: item.status === 'accepted'
													? 'Update Assignee'
													: 'Accept'}
										</button>
										<button
											type="submit"
											class="primary"
											name="action"
											value="complete"
											disabled={Boolean(actionBusy && actionBusy.handoffId === item.id)}
										>
											{isBusy(item.id, 'complete') ? 'Saving...' : 'Complete'}
										</button>
										<button
											type="submit"
											class="danger"
											name="action"
											value="cancel"
											disabled={Boolean(actionBusy && actionBusy.handoffId === item.id)}
										>
											{isBusy(item.id, 'cancel') ? 'Saving...' : 'Cancel'}
										</button>
									</div>
								</form>
							{/if}

							<div class="footer">
								<div class="stack">
									<h4>Handoff ID</h4>
									<p>{item.id}</p>
								</div>
								<div class="stack ids">
									{#if item.candidate_profile_id}
										<span>profile: {item.candidate_profile_id}</span>
									{/if}
									{#if item.opening?.id}
										<span>opening: {item.opening.id}</span>
									{/if}
								</div>
							</div>
						</article>
					{/each}
				</div>
			{/if}
		</section>
	</div>
</section>

<style>
	.shell {
		padding: 2rem 1.25rem 4rem;
	}

	.shell-inner {
		max-width: 78rem;
		margin: 0 auto;
	}

	.hero {
		margin-bottom: 2rem;
	}

	.eyebrow {
		margin: 0 0 0.75rem;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-fg-muted);
	}

	.hero h1 {
		margin: 0 0 0.75rem;
		font-size: clamp(2rem, 4vw, 3.25rem);
	}

	.hero p {
		max-width: 56rem;
		color: var(--color-fg-secondary);
		line-height: 1.7;
	}

	.subnav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.9rem;
		margin-top: 1.25rem;
	}

	.subnav a {
		color: var(--color-fg-secondary);
		text-decoration: none;
		padding: 0.5rem 0.75rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.04);
	}

	.subnav a[aria-current='page'] {
		color: var(--color-fg-primary);
		background: rgba(255, 255, 255, 0.1);
	}

	.message {
		margin: 0 0 1rem;
		padding: 0.9rem 1rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.message.success {
		background: rgba(34, 197, 94, 0.12);
		color: #bbf7d0;
	}

	.message.error {
		background: rgba(248, 113, 113, 0.12);
		color: #fecaca;
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.stat-card {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.stat-card.attention {
		border-color: rgba(248, 113, 113, 0.3);
	}

	.stat-card.caution {
		border-color: rgba(251, 191, 36, 0.35);
	}

	.label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-fg-muted);
	}

	.stat-card strong {
		font-size: 1.8rem;
	}

	.panel {
		margin-bottom: 1.5rem;
		padding: 1.25rem;
		border-radius: 1.25rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.03);
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.panel-header h2 {
		margin: 0 0 0.35rem;
	}

	.panel-header p,
	.panel-copy {
		margin: 0;
		color: var(--color-fg-muted);
	}

	.reset-link {
		color: var(--color-fg-secondary);
	}

	.filters {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1rem;
		align-items: end;
	}

	.filters label,
	.action-field {
		display: grid;
		gap: 0.45rem;
	}

	.filters span,
	.stack h4,
	.message-block h4,
	.action-field span {
		font-size: 0.8rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-fg-muted);
	}

	.filters select,
	.filters button,
	.action-field select,
	.action-field textarea,
	.action-buttons button {
		padding: 0.75rem 0.9rem;
		border-radius: 0.85rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(9, 14, 24, 0.7);
		color: var(--color-fg-primary);
		font: inherit;
	}

	.filters button,
	.action-buttons button {
		cursor: pointer;
		font-weight: 700;
	}

	.action-field textarea {
		min-height: 5.5rem;
		resize: vertical;
	}

	.queue-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.queue-chip,
	.badge {
		display: inline-flex;
		align-items: center;
		padding: 0.35rem 0.7rem;
		border-radius: 999px;
		font-size: 0.78rem;
	}

	.queue-chip {
		background: rgba(255, 255, 255, 0.06);
		color: var(--color-fg-secondary);
	}

	.empty-state {
		margin: 0;
		padding: 1rem 0;
		color: var(--color-fg-muted);
	}

	.handoff-list {
		display: grid;
		gap: 1rem;
	}

	.handoff-card {
		padding: 1rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.09);
		background: rgba(6, 10, 18, 0.6);
	}

	.handoff-card.overdue {
		border-color: rgba(248, 113, 113, 0.4);
		box-shadow: inset 0 0 0 1px rgba(248, 113, 113, 0.16);
	}

	.handoff-card.dueSoon {
		border-color: rgba(251, 191, 36, 0.35);
		box-shadow: inset 0 0 0 1px rgba(251, 191, 36, 0.12);
	}

	.handoff-header {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 0.9rem;
	}

	.handoff-header h3 {
		margin: 0 0 0.25rem;
	}

	.meta,
	.muted {
		color: var(--color-fg-muted);
	}

	.meta {
		margin: 0;
	}

	.badges {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.badge.queue {
		background: rgba(59, 130, 246, 0.18);
		color: #93c5fd;
	}

	.badge.status {
		background: rgba(244, 114, 182, 0.16);
		color: #f9a8d4;
	}

	.badge.sla.overdue {
		background: rgba(239, 68, 68, 0.16);
		color: #fecaca;
	}

	.badge.sla.due_soon {
		background: rgba(251, 191, 36, 0.16);
		color: #fde68a;
	}

	.badge.sla.on_track {
		background: rgba(16, 185, 129, 0.16);
		color: #a7f3d0;
	}

	.badge.sla.no_sla,
	.badge.sla.resolved {
		background: rgba(148, 163, 184, 0.16);
		color: #cbd5e1;
	}

	.handoff-grid,
	.handoff-meta-grid,
	.action-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 0.9rem;
	}

	.handoff-grid,
	.handoff-meta-grid {
		margin-bottom: 0.9rem;
	}

	.action-field-wide {
		grid-column: span 2;
	}

	.stack p,
	.message-block p {
		margin: 0.25rem 0 0;
		line-height: 1.6;
	}

	.message-block {
		margin-bottom: 0.9rem;
	}

	.action-panel {
		margin-bottom: 0.9rem;
		padding: 1rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
	}

	.action-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.action-buttons .primary {
		background: rgba(34, 197, 94, 0.16);
		color: #dcfce7;
	}

	.action-buttons .secondary {
		background: rgba(255, 255, 255, 0.06);
	}

	.action-buttons .danger {
		background: rgba(248, 113, 113, 0.12);
		color: #fecaca;
	}

	.action-buttons button:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.footer {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		padding-top: 0.9rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.ids {
		align-items: flex-end;
		text-align: right;
	}

	.ids span {
		display: block;
		font-size: 0.78rem;
		color: var(--color-fg-muted);
	}

	@media (max-width: 720px) {
		.shell {
			padding-inline: 1rem;
		}

		.panel,
		.handoff-card,
		.action-panel {
			padding: 1rem;
		}

		.footer,
		.handoff-header,
		.panel-header {
			flex-direction: column;
		}

		.ids {
			text-align: left;
			align-items: flex-start;
		}

		.action-field-wide {
			grid-column: span 1;
		}
	}
</style>

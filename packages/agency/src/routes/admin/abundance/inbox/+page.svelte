<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Card, SEO } from '@create-something/canon';
	import type { PageData } from './$types';
	import type {
		ApiResponse,
		NurseInboxActionResult,
		NurseInboxActionType,
		NurseInboxItem,
		NurseInboxResponse
	} from '$lib/types/abundance';

	type FlashMessage = { type: 'success' | 'error'; text: string } | null;

	let { data }: { data: PageData } = $props();

	const inbox = $derived(data.inbox as NurseInboxResponse);
	const items = $derived(inbox.items as NurseInboxItem[]);
	const filters = $derived(inbox.filters);
	const recruiters = $derived(inbox.recruiters);

	const availableSources = $derived(
		Array.from(
			new Set([
				'web',
				'whatsapp',
				'sms',
				'email',
				'manual',
				...inbox.summary.by_source.map((item) => item.source)
			])
		)
	);

	let flashMessage = $state<FlashMessage>(null);
	let actionBusy = $state<{ profileId: string; action: NurseInboxActionType } | null>(null);

	function formatDate(value?: string): string {
		if (!value) return '—';
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
	}

	function formatMoney(value?: number): string {
		if (!value) return '—';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			maximumFractionDigits: 0
		}).format(value);
	}

	function labelize(value: string): string {
		return value.replace(/_/g, ' ');
	}

	function isBusy(profileId: string, action?: NurseInboxActionType): boolean {
		return (
			actionBusy?.profileId === profileId && (!action || actionBusy.action === action)
		);
	}

	async function submitInboxAction(event: SubmitEvent, item: NurseInboxItem) {
		event.preventDefault();
		flashMessage = null;

		const submitter = event.submitter as HTMLButtonElement | null;
		const action = submitter?.value as NurseInboxActionType | undefined;
		if (!action) {
			flashMessage = { type: 'error', text: 'Choose an action before submitting.' };
			return;
		}

		const form = event.currentTarget as HTMLFormElement;
		const formData = new FormData(form);
		const recruiterPersonId =
			String(formData.get('recruiter_person_id') || '').trim() || undefined;
		const note = String(formData.get('note') || '').trim() || undefined;

		if (action === 'assign_recruiter' && !recruiterPersonId) {
			flashMessage = {
				type: 'error',
				text: `Select a recruiter before assigning ${item.candidate_name}.`
			};
			return;
		}

		actionBusy = { profileId: item.candidate_profile_id, action };

		try {
			const response = await fetch('/api/abundance/intake/inbox', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action,
					candidate_profile_id: item.candidate_profile_id,
					recruiter_person_id: recruiterPersonId,
					opening_id: item.opening?.id,
					note
				})
			});

			const payload = (await response.json().catch(() => ({}))) as ApiResponse<NurseInboxActionResult>;
			if (!response.ok || !payload.success || !payload.data) {
				throw new Error(payload.error || 'Unable to apply inbox action.');
			}

			flashMessage = { type: 'success', text: payload.data.message };
			await invalidateAll();
		} catch (err) {
			flashMessage = {
				type: 'error',
				text: err instanceof Error ? err.message : 'Unable to apply inbox action.'
			};
		} finally {
			actionBusy = null;
		}
	}
</script>

<SEO
	title="Abundance Inbox"
	description="Operator inbox for inbound nurse intake events and recruiter triage."
	propertyName="agency"
	noindex={true}
/>

<section class="shell">
	<div class="shell-inner">
		<header class="hero">
			<p class="eyebrow">Operator Surface</p>
			<h1>Abundance Inbox</h1>
			<p>
				Review inbound nurse intake events across web, WhatsApp, SMS, and email. This queue is
				built on `candidate_events`, but it collapses to the latest relevant event per candidate
				profile so new transport adapters land in one review surface instead of fragmenting
				candidate history.
			</p>
			<nav class="subnav">
				<a href="/admin/abundance/inbox" aria-current="page">Inbox</a>
				<a href="/admin/abundance/handoffs">Handoffs</a>
				<a href="/admin/funnel">Funnel</a>
				<a href="/admin/security">Security</a>
				<a href="/admin/community">Community</a>
			</nav>
		</header>

		{#if flashMessage}
			<p class="message" class:success={flashMessage.type === 'success'} class:error={flashMessage.type === 'error'}>
				{flashMessage.text}
			</p>
		{/if}

		<section class="summary-grid">
			<Card variant="glass" radius="md" padding="md" class="glass-emphasis stat-card">
				<span class="label">Profiles in Queue</span>
				<strong>{inbox.summary.total_items}</strong>
			</Card>
			<Card variant="standard" radius="md" padding="md" class="stat-card">
				<span class="label">Draft Profiles</span>
				<strong>{inbox.summary.draft_items}</strong>
			</Card>
			<Card variant="standard" radius="md" padding="md" class="stat-card">
				<span class="label">Ready for Review</span>
				<strong>{inbox.summary.ready_for_review_items}</strong>
			</Card>
			<Card variant="standard" radius="md" padding="md" class="stat-card">
				<span class="label">Eligible</span>
				<strong>{inbox.summary.eligible_items}</strong>
			</Card>
		</section>

		<section class="panel">
			<div class="panel-header">
				<div>
					<h2>Filters</h2>
					<p>Trim the queue by transport or profile status.</p>
				</div>
				<a class="reset-link" href="/admin/abundance/inbox">Reset</a>
			</div>

			<form class="filters" method="GET">
				<label>
					<span>Source</span>
					<select name="source">
						<option value="">All</option>
						{#each availableSources as source}
							<option value={source} selected={filters.source === source}>{source}</option>
						{/each}
					</select>
				</label>

				<label>
					<span>Profile Status</span>
					<select name="profile_status">
						<option value="">All</option>
						<option value="draft" selected={filters.profile_status === 'draft'}>draft</option>
						<option value="ready_for_review" selected={filters.profile_status === 'ready_for_review'}>
							ready_for_review
						</option>
						<option value="eligible" selected={filters.profile_status === 'eligible'}>eligible</option>
						<option value="inactive" selected={filters.profile_status === 'inactive'}>inactive</option>
					</select>
				</label>

				<label>
					<span>Limit</span>
					<select name="limit">
						<option value="20" selected={inbox.limit === 20}>20</option>
						<option value="40" selected={inbox.limit === 40}>40</option>
						<option value="80" selected={inbox.limit === 80}>80</option>
					</select>
				</label>

				<button type="submit">Apply</button>
			</form>

			{#if inbox.summary.by_source.length > 0}
				<div class="source-chips">
					{#each inbox.summary.by_source as item}
						<span class="source-chip">{item.source}: {item.count}</span>
					{/each}
				</div>
			{/if}
		</section>

		<section class="panel">
			<div class="panel-header">
				<div>
					<h2>Inbound Queue</h2>
					<p>{inbox.total} candidate{inbox.total === 1 ? '' : 's'} matched.</p>
				</div>
				<div class="panel-copy">
					Handled candidates leave this queue until a newer inbound event arrives.
				</div>
			</div>

			{#if items.length === 0}
				<p class="empty-state">No nurse candidate records match the current filters.</p>
			{:else}
				<div class="queue-list">
					{#each items as item}
						<article class="queue-card">
							<div class="queue-header">
								<div>
									<h3>{item.candidate_name}</h3>
									<p class="meta">
										{labelize(item.event_type)} · {formatDate(item.event_at)}
									</p>
								</div>
								<div class="badges">
									<span class="badge source">{item.source || 'unknown'}</span>
									<span class="badge status">{labelize(item.profile_status)}</span>
								</div>
							</div>

							<div class="queue-grid">
								<div class="stack">
									<h4>Contact</h4>
									<p>{item.email || 'no email'} / {item.phone || 'no phone'}</p>
								</div>
								<div class="stack">
									<h4>Clinical</h4>
									<p>{item.profession.toUpperCase()} · {item.specialty_primary || 'specialty pending'}</p>
									<p class="muted">
										{item.home_state || 'state pending'} · available {item.available_from ? formatDate(item.available_from) : 'pending'}
									</p>
								</div>
								<div class="stack">
									<h4>Compensation</h4>
									<p>{formatMoney(item.pay_floor_weekly)}</p>
								</div>
							</div>

							{#if item.subject}
								<div class="message-block">
									<h4>Subject</h4>
									<p>{item.subject}</p>
								</div>
							{/if}

							{#if item.message_preview}
								<div class="message-block">
									<h4>Message</h4>
									<p>{item.message_preview}</p>
								</div>
							{/if}

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

							{#if item.recruiter_notes}
								<div class="message-block">
									<h4>Recruiter Notes</h4>
									<p>{item.recruiter_notes}</p>
								</div>
							{/if}

							<form class="action-panel" onsubmit={(event) => submitInboxAction(event, item)}>
								<div class="action-grid">
									<label class="action-field">
										<span>Recruiter</span>
										<select name="recruiter_person_id">
											<option value="">Unassigned</option>
											{#each recruiters as recruiter}
												<option value={recruiter.id}>{recruiter.name}{recruiter.email ? ` · ${recruiter.email}` : ''}</option>
											{/each}
										</select>
									</label>

									<label class="action-field action-field-wide">
										<span>Operator Note</span>
										<textarea
											name="note"
											rows="2"
											placeholder="Add review or handoff context for the next operator."
										/>
									</label>
								</div>

								{#if recruiters.length === 0}
									<p class="helper-note">
										No recruiter rows are available in `people`. Add a `recruiter` or `operator`
										record to enable assignment.
									</p>
								{/if}

								<div class="action-buttons">
									<button
										type="submit"
										class="secondary"
										name="action"
										value="mark_reviewed"
										disabled={Boolean(actionBusy && actionBusy.profileId === item.candidate_profile_id)}
									>
										{isBusy(item.candidate_profile_id, 'mark_reviewed') ? 'Saving...' : 'Mark Reviewed'}
									</button>
									<button
										type="submit"
										class="secondary"
										name="action"
										value="assign_recruiter"
										disabled={Boolean(actionBusy && actionBusy.profileId === item.candidate_profile_id) || recruiters.length === 0}
									>
										{isBusy(item.candidate_profile_id, 'assign_recruiter') ? 'Saving...' : 'Assign Recruiter'}
									</button>
									<button
										type="submit"
										class="primary"
										name="action"
										value="create_handoff"
										disabled={Boolean(actionBusy && actionBusy.profileId === item.candidate_profile_id)}
									>
										{isBusy(item.candidate_profile_id, 'create_handoff') ? 'Saving...' : 'Create Handoff'}
									</button>
								</div>
							</form>

							<div class="footer">
								<div class="stack">
									<h4>Next Step</h4>
									<p>{item.next_step}</p>
								</div>
								<div class="stack ids">
									<span>person: {item.person_id}</span>
									<span>profile: {item.candidate_profile_id}</span>
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

	.source-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.source-chip,
	.badge {
		display: inline-flex;
		align-items: center;
		padding: 0.35rem 0.7rem;
		border-radius: 999px;
		font-size: 0.78rem;
	}

	.source-chip {
		background: rgba(255, 255, 255, 0.06);
		color: var(--color-fg-secondary);
	}

	.empty-state {
		margin: 0;
		padding: 1rem 0;
		color: var(--color-fg-muted);
	}

	.queue-list {
		display: grid;
		gap: 1rem;
	}

	.queue-card {
		padding: 1rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.09);
		background: rgba(6, 10, 18, 0.6);
	}

	.queue-header {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 0.9rem;
	}

	.queue-header h3 {
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

	.badge.source {
		background: rgba(59, 130, 246, 0.18);
		color: #93c5fd;
	}

	.badge.status {
		background: rgba(244, 114, 182, 0.16);
		color: #f9a8d4;
	}

	.queue-grid,
	.action-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 0.9rem;
	}

	.queue-grid {
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

	.helper-note {
		margin: 0.85rem 0 0;
		font-size: 0.9rem;
		color: var(--color-fg-muted);
	}

	.action-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.action-buttons .primary {
		background: rgba(59, 130, 246, 0.18);
		color: #dbeafe;
	}

	.action-buttons .secondary {
		background: rgba(255, 255, 255, 0.06);
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
		.queue-card,
		.action-panel {
			padding: 1rem;
		}

		.footer,
		.queue-header,
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

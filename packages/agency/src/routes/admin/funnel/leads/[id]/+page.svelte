<script lang="ts">
	import { enhance } from '$app/forms';
	import { Card, SEO } from '@create-something/canon';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let saving = $state(false);
	let automating = $state(false);
	const stages = ['awareness', 'consideration', 'decision', 'won', 'lost'] as const;

	function formatDateTime(value: string | null | undefined): string {
		if (!value) return 'Not yet';
		return new Date(value).toLocaleString();
	}

	function formatPayload(value: Record<string, unknown> | null | undefined): string {
		return value ? JSON.stringify(value, null, 2) : 'Not captured';
	}
</script>

<SEO
	title="Admin - Funnel Lead"
	description="Lead detail and handoff record"
	propertyName="agency"
	noindex={true}
/>

<main class="page">
	<header class="header">
		<div>
			<a href="/admin/funnel" class="back-link">← Back to Funnel</a>
			<h1>{data.lead.name}</h1>
			<p class="subtitle">
				{data.lead.company || 'No company set'} · {data.lead.source}
			</p>
		</div>
		<div class="header-meta">
			<span>Operator: {data.operator_email}</span>
			{#if data.lead.source === 'abundance'}
				<a href="/admin/abundance" class="header-link">Back to Abundance</a>
			{/if}
		</div>
	</header>

	{#if form?.error}
		<div class="toast error">{form.error}</div>
	{/if}

	{#if form?.success}
		<div class="toast success">
			Updated {form.lead_id} to <strong>{form.lead_stage}</strong>.
		</div>
	{/if}

	{#if form?.automation_success !== undefined}
		<div class:success={form.automation_success} class:error={!form.automation_success} class="toast">
			Automation attempted on {form.automation_attempted} destination{form.automation_attempted === 1
				? ''
				: 's'}
			. Succeeded: {form.automation_succeeded}. Failed: {form.automation_failed}. Skipped: {form.automation_skipped}.
		</div>
	{/if}

	<section class="grid">
		<div class="detail-card">
			<Card variant="glass" radius="md" padding="lg">
				<h2>Overview</h2>
				<dl class="facts">
					<div>
						<dt>Lead ID</dt>
						<dd><code>{data.lead.id}</code></dd>
					</div>
					<div>
						<dt>Company</dt>
						<dd>{data.lead.company || 'Not set'}</dd>
					</div>
					<div>
						<dt>Role</dt>
						<dd>{data.lead.role || 'Not set'}</dd>
					</div>
					<div>
						<dt>Source</dt>
						<dd>{data.lead.source}</dd>
					</div>
					<div>
						<dt>Source Detail</dt>
						<dd>{data.lead.source_detail || 'Not set'}</dd>
					</div>
					<div>
						<dt>Campaign</dt>
						<dd>{data.lead.campaign || 'Not set'}</dd>
					</div>
					<div>
						<dt>Created</dt>
						<dd>{formatDateTime(data.lead.created_at)}</dd>
					</div>
					<div>
						<dt>Updated</dt>
						<dd>{formatDateTime(data.lead.updated_at)}</dd>
					</div>
					<div>
						<dt>First Touch</dt>
						<dd>{formatDateTime(data.lead.first_touch_at)}</dd>
					</div>
					<div>
						<dt>Last Touch</dt>
						<dd>{formatDateTime(data.lead.last_touch_at)}</dd>
					</div>
					<div>
						<dt>Discovery Call</dt>
						<dd>{formatDateTime(data.lead.discovery_call_at)}</dd>
					</div>
					<div>
						<dt>Proposal Sent</dt>
						<dd>{formatDateTime(data.lead.proposal_sent_at)}</dd>
					</div>
					<div>
						<dt>Closed</dt>
						<dd>{formatDateTime(data.lead.closed_at)}</dd>
					</div>
				</dl>
			</Card>
		</div>

		<div class="detail-card">
			<Card variant="glass" radius="md" padding="lg">
				<h2>Update Lead</h2>
				<form
					method="POST"
					action="?/automate"
					class="automation-form"
					use:enhance={() => {
						automating = true;
						return async ({ update }) => {
							try {
								await update();
							} finally {
								automating = false;
							}
						};
					}}
				>
					<div class="automation-callout">
						<div>
							<h3>Automation</h3>
							<p>Push this lead through the configured Composio destinations again.</p>
						</div>
						<button type="submit" class="btn-secondary" disabled={automating}>
							{automating ? 'Running…' : 'Run Automation'}
						</button>
					</div>
				</form>

				<form
					method="POST"
					action="?/save"
					class="editor"
					use:enhance={() => {
						saving = true;
						return async ({ update }) => {
							try {
								await update();
							} finally {
								saving = false;
							}
						};
					}}
				>
					<label>
						<span>Stage</span>
						<select name="stage">
							{#each stages as stage}
								<option value={stage} selected={data.lead.stage === stage}>{stage}</option>
							{/each}
						</select>
					</label>

					<label>
						<span>Estimated Value</span>
						<input
							type="number"
							name="estimated_value"
							min="0"
							step="100"
							value={data.lead.estimated_value ?? ''}
						/>
					</label>

					<label>
						<span>Actual Value</span>
						<input
							type="number"
							name="actual_value"
							min="0"
							step="100"
							value={data.lead.actual_value ?? ''}
						/>
					</label>

					<label>
						<span>Service Interest</span>
						<input type="text" name="service_interest" value={data.lead.service_interest ?? ''} />
					</label>

					<label class="notes-field">
						<span>Notes</span>
						<textarea name="notes" rows="14">{data.lead.notes ?? ''}</textarea>
					</label>

					<div class="actions">
						<button type="submit" class="btn-save" disabled={saving}>
							{saving ? 'Saving…' : 'Save Lead'}
						</button>
					</div>
				</form>
			</Card>
		</div>

		<div class="detail-card detail-card-wide">
			<Card variant="glass" radius="md" padding="lg">
				<div class="section-header">
					<div>
						<h2>Automation History</h2>
						<p class="section-copy">Latest Slack and Notion attempts for this lead.</p>
					</div>
					<span class="history-count">{data.automationEvents.length} events</span>
				</div>

				{#if data.automationEvents.length === 0}
					<p class="empty-state">No automation attempts recorded yet.</p>
				{:else}
					<ul class="history-list">
						{#each data.automationEvents as event}
							<li class="history-item">
								<div class="history-row">
									<div class="history-meta">
										<div class="history-title">
											<strong>{event.destination}</strong>
											<span class:success={event.status === 'succeeded'} class:error={event.status === 'failed'} class:pending={event.status === 'pending'} class:skipped={event.status === 'skipped'} class="status-chip">
												{event.status}
											</span>
										</div>
										<p>
											Trigger: <strong>{event.trigger}</strong>
											{#if event.stage}
												· Stage: <strong>{event.stage}</strong>
											{/if}
											· Attempt #{event.attempt_count}
										</p>
									</div>
									<div class="history-time">
										<div>{formatDateTime(event.created_at)}</div>
										{#if event.completed_at}
											<div>Completed {formatDateTime(event.completed_at)}</div>
										{/if}
									</div>
								</div>

								{#if event.summary}
									<p class="summary">{event.summary}</p>
								{/if}

								{#if event.external_ref}
									<p class="external-ref">
										External ref: <code>{event.external_ref}</code>
									</p>
								{/if}

								{#if event.error_message}
									<p class="event-error">{event.error_message}</p>
								{/if}

								<div class="payload-grid">
									<details>
										<summary>Request payload</summary>
										<pre>{formatPayload(event.request_payload)}</pre>
									</details>
									<details>
										<summary>Response payload</summary>
										<pre>{formatPayload(event.response_payload)}</pre>
									</details>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</Card>
		</div>
	</section>
</main>

<style>
	.page {
		max-width: var(--content-width-xl);
		margin: 0 auto;
		padding: var(--space-lg);
		display: grid;
		gap: var(--space-lg);
	}

	.header {
		display: flex;
		justify-content: space-between;
		gap: var(--space-lg);
		align-items: flex-start;
	}

	.back-link {
		display: inline-block;
		margin-bottom: var(--space-sm);
		color: var(--color-fg-muted);
		text-decoration: none;
	}

	.subtitle {
		margin: var(--space-sm) 0 0;
		color: var(--color-fg-muted);
	}

	.header-meta {
		display: grid;
		gap: 0.25rem;
		text-align: right;
		color: var(--color-fg-muted);
		font-size: 0.95rem;
	}

	.header-link {
		color: var(--color-fg);
		text-decoration: none;
		font-weight: 600;
	}

	.toast {
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-md);
	}

	.toast.success {
		background: var(--color-success-muted);
		color: var(--color-success);
	}

	.toast.error {
		background: var(--color-error-muted);
		color: var(--color-error);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: var(--space-lg);
	}

	.detail-card {
		display: grid;
		gap: var(--space-md);
	}

	.detail-card-wide {
		grid-column: 1 / -1;
	}

	.facts {
		display: grid;
		gap: var(--space-sm);
	}

	.facts div {
		display: grid;
		gap: 0.2rem;
	}

	dt {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-fg-muted);
	}

	dd {
		margin: 0;
	}

	.editor {
		display: grid;
		gap: var(--space-md);
	}

	.automation-form {
		margin-bottom: var(--space-lg);
	}

	.automation-callout {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-md);
		padding: var(--space-md);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-lg);
		background: color-mix(in srgb, var(--color-bg-surface) 92%, var(--color-fg) 8%);
	}

	.automation-callout h3 {
		margin: 0 0 0.35rem;
	}

	.automation-callout p {
		margin: 0;
		color: var(--color-fg-muted);
	}

	label {
		display: grid;
		gap: 0.35rem;
	}

	label span {
		font-size: 0.85rem;
		color: var(--color-fg-muted);
	}

	input,
	select,
	textarea {
		width: 100%;
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-md);
		background: var(--color-bg-surface);
		color: var(--color-fg);
		padding: 0.75rem 0.9rem;
		font: inherit;
	}

	.notes-field textarea {
		min-height: 18rem;
		font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
	}

	.btn-save,
	.btn-secondary {
		border: none;
		border-radius: 999px;
		padding: 0.75rem 1.25rem;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-save {
		background: var(--color-fg);
		color: var(--color-bg);
	}

	.btn-secondary {
		background: transparent;
		color: var(--color-fg);
		border: 1px solid var(--color-border);
	}

	.btn-save:disabled,
	.btn-secondary:disabled {
		opacity: 0.6;
		cursor: progress;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		gap: var(--space-md);
		align-items: flex-start;
		margin-bottom: var(--space-md);
	}

	.section-copy {
		margin: 0.35rem 0 0;
		color: var(--color-fg-muted);
	}

	.history-count {
		color: var(--color-fg-muted);
		font-size: 0.95rem;
	}

	.empty-state {
		margin: 0;
		color: var(--color-fg-muted);
	}

	.history-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: var(--space-md);
	}

	.history-item {
		padding: var(--space-md);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-lg);
		background: color-mix(in srgb, var(--color-bg-surface) 95%, var(--color-fg) 5%);
		display: grid;
		gap: var(--space-sm);
	}

	.history-row {
		display: flex;
		justify-content: space-between;
		gap: var(--space-md);
		align-items: flex-start;
	}

	.history-title {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.history-meta p,
	.history-time,
	.summary,
	.external-ref,
	.event-error {
		margin: 0;
	}

	.history-meta p,
	.history-time,
	.external-ref {
		color: var(--color-fg-muted);
	}

	.history-time {
		text-align: right;
		font-size: 0.9rem;
		display: grid;
		gap: 0.2rem;
	}

	.event-error {
		color: var(--color-error);
	}

	.status-chip {
		display: inline-flex;
		align-items: center;
		padding: 0.2rem 0.55rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		background: var(--color-bg-surface);
		color: var(--color-fg-muted);
	}

	.status-chip.success {
		background: var(--color-success-muted);
		color: var(--color-success);
	}

	.status-chip.error {
		background: var(--color-error-muted);
		color: var(--color-error);
	}

	.status-chip.pending {
		background: color-mix(in srgb, var(--color-bg-surface) 60%, var(--color-fg) 40%);
		color: var(--color-fg);
	}

	.status-chip.skipped {
		background: color-mix(in srgb, var(--color-bg-surface) 75%, var(--color-fg) 25%);
		color: var(--color-fg-muted);
	}

	.payload-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: var(--space-sm);
	}

	details {
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-md);
		padding: 0.75rem 0.9rem;
		background: var(--color-bg-surface);
	}

	summary {
		cursor: pointer;
		font-weight: 600;
	}

	pre {
		margin: 0.75rem 0 0;
		white-space: pre-wrap;
		word-break: break-word;
		font-size: 0.85rem;
		font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace;
		color: var(--color-fg-muted);
	}

	@media (max-width: 720px) {
		.header {
			flex-direction: column;
		}

		.header-meta {
			text-align: left;
		}

		.automation-callout,
		.history-row,
		.section-header {
			flex-direction: column;
		}

		.history-time {
			text-align: left;
		}
	}
</style>

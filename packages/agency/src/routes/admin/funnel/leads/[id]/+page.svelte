<script lang="ts">
	import { enhance } from '$app/forms';
	import { Card, SEO } from '@create-something/canon';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let saving = $state(false);
	const stages = ['awareness', 'consideration', 'decision', 'won', 'lost'] as const;

	function formatDateTime(value: string | null | undefined): string {
		if (!value) return 'Not yet';
		return new Date(value).toLocaleString();
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

	.btn-save {
		border: none;
		border-radius: 999px;
		padding: 0.75rem 1.25rem;
		background: var(--color-fg);
		color: var(--color-bg);
		font-weight: 600;
		cursor: pointer;
	}

	.btn-save:disabled {
		opacity: 0.6;
		cursor: progress;
	}

	@media (max-width: 720px) {
		.header {
			flex-direction: column;
		}

		.header-meta {
			text-align: left;
		}
	}
</style>

<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { safeOperatorExternalHref } from '$lib/governance/operator-url';
	import type { ActionData, PageData } from './$types';

	type GovernanceRecord = PageData['review']['records'][number];
	type Decision = PageData['review']['unlinked_decisions'][number];
	type Proof = PageData['review']['unlinked_proofs'][number];

	let { data, form }: { data: PageData; form?: ActionData } = $props();

	const records = $derived(data.review.records as GovernanceRecord[]);
	const unlinkedDecisions = $derived(data.review.unlinked_decisions as Decision[]);
	const unlinkedProofs = $derived(data.review.unlinked_proofs as Proof[]);
	const activeFilterCount = $derived(
		[
			Boolean(data.review.filters.atlas_canvas_id),
			Boolean(data.review.filters.atlas_node_id),
			data.review.filters.limit !== 100
		].filter(Boolean).length
	);

	function displayDate(value: string | null | undefined): string {
		if (!value) return 'n/a';
		const date = new Date(value.replace(' ', 'T'));
		if (Number.isNaN(date.getTime())) return value;
		return date.toLocaleString();
	}

	function displayValue(value: string | null | undefined): string {
		return value?.trim() || 'n/a';
	}

	function buildQuery(overrides: Record<string, string | number | null | undefined> = {}): string {
		const params = new URLSearchParams();
		const canvas = overrides.atlas_canvas_id ?? data.review.filters.atlas_canvas_id;
		const node = overrides.atlas_node_id ?? data.review.filters.atlas_node_id;
		const limit = overrides.limit ?? data.review.filters.limit;

		if (canvas) params.set('atlas_canvas_id', String(canvas));
		if (node) params.set('atlas_node_id', String(node));
		if (limit && Number(limit) !== 100) params.set('limit', String(limit));
		const search = params.toString();
		return search ? `?${search}` : '';
	}

	function apiHref(path: string): string {
		return `${path}${buildQuery()}`;
	}

	function decisionTone(state: string): string {
		if (state === 'run') return 'success';
		if (state === 'stop') return 'danger';
		return 'warning';
	}

	function proofTone(outcome: string): string {
		if (outcome === 'passed') return 'success';
		if (outcome === 'failed' || outcome === 'rolled_back') return 'danger';
		return 'info';
	}

	function readinessTone(status: string): string {
		if (status === 'ready') return 'success';
		if (status === 'error') return 'danger';
		return 'warning';
	}

	function safeHref(value: string | null | undefined): string | null {
		return safeOperatorExternalHref(value);
	}
</script>

<SEO title="Governance Records" description="Review Signal, Decision, and Proof records attached to Atlas." propertyName="agency" noindex={true} />

<main class="shell">
	<header class="hero">
		<div>
			<p class="eyebrow">Operator Surface</p>
			<h1>Governance Records</h1>
			<p>Review Signal, Decision, and Proof records attached to Atlas canvases and nodes.</p>
		</div>
		<nav class="actions" aria-label="Governance record APIs">
			<a href="/api/governance/products" target="_blank">Map</a>
			<a href={apiHref('/api/governance/signals')} target="_blank">Signals</a>
			<a href={apiHref('/api/governance/decisions')} target="_blank">Decisions</a>
			<a href={apiHref('/api/governance/proofs')} target="_blank">Proofs</a>
		</nav>
	</header>

	{#if data.error}
		<div class="notice danger">{data.error}</div>
	{/if}
	{#if form?.error}
		<div class="notice danger">{form.error}</div>
	{/if}
	{#if data.action_result}
		<div class="notice success">{data.action_result}</div>
	{/if}
	{#if !data.review.storage.available}
		<div class="notice warning">
			Durable governance records are unavailable until migration 0030 is applied.
		</div>
	{/if}

	<section class="summary-grid" aria-label="Governance record summary">
		<div class="metric">
			<span class="metric-value">{data.review.summary.signals}</span>
			<span class="metric-label">Inbox</span>
		</div>
		<div class="metric">
			<span class="metric-value">{data.review.summary.decisions}</span>
			<span class="metric-label">Decisions</span>
		</div>
		<div class="metric">
			<span class="metric-value">{data.review.summary.proofs}</span>
			<span class="metric-label">Proofs</span>
		</div>
		<div class="metric">
			<span class="metric-value">{data.review.summary.records_ready_for_proof}</span>
			<span class="metric-label">Need proof</span>
		</div>
		<div class="metric">
			<span class="metric-value">{data.review.summary.records_requiring_docs_review}</span>
			<span class="metric-label">Docs review</span>
		</div>
		<div class="metric">
			<span class="metric-value">{data.review.summary.records_requiring_reviewer_process_review}</span>
			<span class="metric-label">Process review</span>
		</div>
	</section>

	{#if data.monitor_readiness}
		<section class="monitor-panel" aria-label="Signal intake readiness">
			<div class="monitor-heading">
				<div>
					<p class="eyebrow">Signal intake</p>
					<h2>Slack monitor</h2>
				</div>
				<span class={`pill ${readinessTone(data.monitor_readiness.status)}`}>{data.monitor_readiness.status}</span>
			</div>
			<div class="monitor-grid">
				<div>
					<span class="metric-value">{data.monitor_readiness.config.channel_count}</span>
					<span class="metric-label">Watched channels</span>
				</div>
				<div>
					<span class="metric-value">{data.monitor_readiness.cursors.length}</span>
					<span class="metric-label">Active cursors</span>
				</div>
				<div>
					<span class="metric-value">{data.monitor_readiness.config.slack_bot_token_configured ? 'Yes' : 'No'}</span>
					<span class="metric-label">Bot token</span>
				</div>
				<div>
					<span class="metric-value">{data.monitor_readiness.storage.cursor_table_available ? 'Yes' : 'No'}</span>
					<span class="metric-label">Cursor table</span>
				</div>
			</div>
			{#if data.monitor_readiness.config.channels.length > 0}
				<div class="channel-list" aria-label="Configured Slack channels">
					{#each data.monitor_readiness.config.channels as channel}
						<span>{channel.channel_name} <small>{channel.channel_id}</small></span>
					{/each}
				</div>
			{/if}
			{#if data.monitor_readiness.cursors.length > 0}
				<div class="cursor-list" aria-label="Recent Slack cursors">
					{#each data.monitor_readiness.cursors as cursor}
						<div>
							<strong>{displayValue(cursor.channel_name ?? cursor.source_id)}</strong>
							<small>{displayValue(cursor.cursor_value)} · {displayDate(cursor.last_seen_at)}</small>
						</div>
					{/each}
				</div>
			{/if}
			{#if data.monitor_readiness.errors.length > 0}
				<div class="notice danger">{data.monitor_readiness.errors.join(' ')}</div>
			{:else if data.monitor_readiness.status === 'not_configured'}
				<div class="notice warning">
					Slack intake is deployed but needs SLACK_BOT_TOKEN and GOVERNANCE_SLACK_CHANNELS before it can create Signals.
				</div>
			{/if}
		</section>
	{/if}

	<form class="filters" method="GET" action="/admin/governance">
		<label>
			<span>Atlas canvas</span>
			<input name="atlas_canvas_id" value={data.review.filters.atlas_canvas_id} placeholder="canvas id" />
		</label>
		<label>
			<span>Atlas node</span>
			<input name="atlas_node_id" value={data.review.filters.atlas_node_id} placeholder="node id" />
		</label>
		<label>
			<span>Limit</span>
			<input name="limit" type="number" min="1" max="500" value={data.review.filters.limit} />
		</label>
		<button type="submit">Filter</button>
		<a href="/admin/governance" class="secondary">Clear</a>
		{#if activeFilterCount > 0}
			<span class="filter-count">{activeFilterCount} active</span>
		{/if}
	</form>

	<section class="records" aria-label="Governance records">
		<div class="section-heading">
			<div>
				<p class="eyebrow">Signal to proof</p>
				<h2>Attached records</h2>
			</div>
			<span>{displayDate(data.review.generated_at)}</span>
		</div>

		{#if records.length === 0}
			<div class="empty">No governance records match this view.</div>
		{:else}
			{#each records as record}
				<article class="record">
					<header class="record-header">
						<div>
							<p class="source">{record.signal.source}</p>
							<h3>{record.signal.title}</h3>
							<p>{record.signal.summary}</p>
							{#if record.classification}
								<div class="classification" aria-label="Signal classification">
									{#if record.classification.requires_documentation_review}
										<span class="pill warning">Docs review</span>
									{/if}
									{#if record.classification.requires_reviewer_process_review}
										<span class="pill info">Process review</span>
									{/if}
									{#if record.classification.reasons.length > 0}
										<span class="classification-reason">{record.classification.reasons.join(' · ')}</span>
									{/if}
								</div>
							{/if}
						</div>
						<span class="pill info">{record.signal.status}</span>
					</header>
					<dl class="meta">
						<div>
							<dt>Canvas</dt>
							<dd>{record.signal.atlas_canvas_id}</dd>
						</div>
						<div>
							<dt>Node</dt>
							<dd>{displayValue(record.signal.atlas_node_id)}</dd>
						</div>
						<div>
							<dt>Captured</dt>
							<dd>{displayDate(record.signal.created_at)}</dd>
						</div>
						<div>
							<dt>Source</dt>
							<dd>
								{#if safeHref(record.signal.source_url)}
									<a href={safeHref(record.signal.source_url) ?? ''} target="_blank" rel="noreferrer">Open</a>
								{:else}
									n/a
								{/if}
							</dd>
						</div>
					</dl>

					<div class="record-grid">
						<section>
							<h4>Decision</h4>
							{#if record.decisions.length === 0}
								<p class="muted">No decision recorded.</p>
							{:else}
								{#each record.decisions as decision}
									<div class="subrecord">
										<span class={`pill ${decisionTone(decision.decision_state)}`}>{decision.decision_state}</span>
										<p>{decision.reason}</p>
										<small>{decision.decision_owner} · {displayDate(decision.created_at)}</small>
										<form method="POST" action="?/recordProof" class="action-form">
											<input type="hidden" name="decision_id" value={decision.id} />
											<input type="hidden" name="return_atlas_canvas_id" value={data.review.filters.atlas_canvas_id} />
											<input type="hidden" name="return_atlas_node_id" value={data.review.filters.atlas_node_id} />
											<input type="hidden" name="return_limit" value={data.review.filters.limit} />
											<label>
												<span>Proof</span>
												<textarea
													name="evidence"
													rows="3"
													maxlength="4000"
													placeholder="What changed, shipped, paused, or needs rollback?"
													required
												></textarea>
											</label>
											<div class="form-row">
												<label>
													<span>Outcome</span>
													<select name="outcome">
														<option value="documented">Documented</option>
														<option value="passed">Passed</option>
														<option value="failed">Failed</option>
														<option value="rolled_back">Rolled back</option>
													</select>
												</label>
												<label>
													<span>Receipt URL</span>
													<input name="receipt_url" type="url" placeholder="https://..." />
												</label>
											</div>
											<label>
												<span>Rollback note</span>
												<input name="rollback_note" maxlength="2000" placeholder="Optional recovery path" />
											</label>
											<button type="submit">Record proof</button>
										</form>
									</div>
								{/each}
							{/if}
							<form method="POST" action="?/recordDecision" class="action-form">
								<input type="hidden" name="signal_id" value={record.signal.id} />
								<input type="hidden" name="return_atlas_canvas_id" value={data.review.filters.atlas_canvas_id} />
								<input type="hidden" name="return_atlas_node_id" value={data.review.filters.atlas_node_id} />
								<input type="hidden" name="return_limit" value={data.review.filters.limit} />
								<div class="form-row">
									<label>
										<span>Decision</span>
										<select name="decision_state" required>
											<option value="run">Run</option>
											<option value="wait">Wait</option>
											<option value="stop">Stop</option>
										</select>
									</label>
									<label>
										<span>Owner</span>
										<input name="decision_owner" maxlength="220" placeholder="reviewer or agent" required />
									</label>
								</div>
								<label>
									<span>Reason</span>
									<textarea
										name="reason"
										rows="3"
										maxlength="2000"
										placeholder="Why this action is the right next step"
										required
									></textarea>
								</label>
								<button type="submit">Record decision</button>
							</form>
						</section>
						<section>
							<h4>Proof</h4>
							{#if record.proofs.length === 0}
								<p class="muted">No proof recorded.</p>
							{:else}
								{#each record.proofs as proof}
									<div class="subrecord">
										<span class={`pill ${proofTone(proof.outcome)}`}>{proof.outcome}</span>
										<p>{proof.evidence}</p>
										<small>
											{displayDate(proof.created_at)}
											{#if safeHref(proof.receipt_url)}
												· <a href={safeHref(proof.receipt_url) ?? ''} target="_blank" rel="noreferrer">Receipt</a>
											{/if}
										</small>
									</div>
								{/each}
							{/if}
						</section>
					</div>
				</article>
			{/each}
		{/if}
	</section>

	{#if unlinkedDecisions.length > 0 || unlinkedProofs.length > 0}
		<section class="records" aria-label="Unlinked governance records">
			<div class="section-heading">
				<div>
					<p class="eyebrow">Needs map link</p>
					<h2>Unlinked records</h2>
				</div>
				<span>{unlinkedDecisions.length + unlinkedProofs.length}</span>
			</div>
			<div class="unlinked-grid">
				{#each unlinkedDecisions as decision}
					<div class="subrecord">
						<span class={`pill ${decisionTone(decision.decision_state)}`}>{decision.decision_state}</span>
						<p>{decision.reason}</p>
						<small>{decision.signal_id} · {decision.decision_owner}</small>
					</div>
				{/each}
				{#each unlinkedProofs as proof}
					<div class="subrecord">
						<span class={`pill ${proofTone(proof.outcome)}`}>{proof.outcome}</span>
						<p>{proof.evidence}</p>
						<small>{proof.decision_id}</small>
					</div>
				{/each}
			</div>
		</section>
	{/if}
</main>

<style>
	.shell {
		max-width: 1180px;
		margin: 0 auto;
		padding: 48px 24px 80px;
		color: #111827;
	}

	.hero,
	.section-heading,
	.record-header,
	.actions,
	.filters,
	.meta,
	.record-grid,
	.unlinked-grid {
		display: grid;
		gap: 16px;
	}

	.hero {
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: start;
		margin-bottom: 28px;
	}

	.eyebrow,
	.source,
	.metric-label,
	dt,
	small {
		color: #64748b;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	h1,
	h2,
	h3,
	h4,
	p {
		margin: 0;
	}

	h1 {
		font-size: clamp(2.2rem, 6vw, 4.5rem);
		line-height: 0.95;
	}

	h2 {
		font-size: 1.25rem;
	}

	h3 {
		font-size: 1.15rem;
	}

	.hero p:not(.eyebrow),
	.record-header p,
	.subrecord p,
	.muted,
	.empty {
		color: #475569;
		line-height: 1.55;
	}

	.actions {
		grid-auto-flow: column;
	}

	.actions a,
	button,
	.secondary {
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: #fff;
		color: #0f172a;
		font: inherit;
		font-weight: 700;
		padding: 10px 14px;
		text-decoration: none;
	}

	button {
		cursor: pointer;
		background: #0f172a;
		color: #fff;
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: 12px;
		margin: 24px 0;
	}

	.metric,
	.record,
	.filters,
	.monitor-panel,
	.notice,
	.empty {
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #fff;
	}

	.metric {
		padding: 18px;
	}

	.monitor-panel {
		display: grid;
		gap: 14px;
		margin: 24px 0;
		padding: 18px;
	}

	.monitor-heading {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 16px;
	}

	.monitor-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 12px;
	}

	.channel-list,
	.cursor-list {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.channel-list span,
	.cursor-list div {
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #f8fafc;
		padding: 8px 10px;
	}

	.cursor-list div {
		display: grid;
		gap: 4px;
	}

	.metric-value {
		display: block;
		font-size: 2rem;
		font-weight: 800;
	}

	.notice {
		margin: 12px 0;
		padding: 14px 16px;
		font-weight: 700;
	}

	.notice.warning {
		background: #fffbeb;
		border-color: #fde68a;
		color: #92400e;
	}

	.notice.danger {
		background: #fef2f2;
		border-color: #fecaca;
		color: #991b1b;
	}

	.notice.success {
		background: #f0fdf4;
		border-color: #bbf7d0;
		color: #166534;
	}

	.filters {
		grid-template-columns: 1fr 1fr 110px auto auto auto;
		align-items: end;
		padding: 16px;
		margin-bottom: 24px;
	}

	label {
		display: grid;
		gap: 6px;
		font-weight: 700;
	}

	label span {
		color: #475569;
		font-size: 0.82rem;
	}

	input,
	select,
	textarea {
		width: 100%;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		padding: 10px 12px;
		font: inherit;
	}

	textarea {
		min-height: 86px;
		resize: vertical;
	}

	.action-form {
		display: grid;
		gap: 10px;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #f8fafc;
		margin-top: 14px;
		padding: 12px;
	}

	.form-row {
		display: grid;
		grid-template-columns: minmax(0, 160px) minmax(0, 1fr);
		gap: 10px;
	}

	.filter-count {
		color: #64748b;
		font-weight: 700;
		padding-bottom: 10px;
	}

	.records {
		margin-top: 28px;
	}

	.section-heading {
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: end;
		margin-bottom: 12px;
	}

	.record {
		padding: 18px;
		margin-bottom: 12px;
	}

	.record-header {
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: start;
	}

	.pill {
		display: inline-flex;
		align-items: center;
		width: fit-content;
		border-radius: 999px;
		padding: 4px 8px;
		font-size: 0.74rem;
		font-weight: 800;
		text-transform: uppercase;
	}

	.classification {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		margin-top: 10px;
	}

	.classification-reason {
		color: #64748b;
		font-size: 0.82rem;
		font-weight: 700;
	}

	.success {
		background: #dcfce7;
		color: #166534;
	}

	.warning {
		background: #fef3c7;
		color: #92400e;
	}

	.danger {
		background: #fee2e2;
		color: #991b1b;
	}

	.info {
		background: #e0f2fe;
		color: #075985;
	}

	.meta {
		grid-template-columns: repeat(4, minmax(0, 1fr));
		margin: 18px 0;
	}

	dl,
	dd {
		margin: 0;
	}

	dd {
		overflow-wrap: anywhere;
	}

	.record-grid,
	.unlinked-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.subrecord {
		border-top: 1px solid #e2e8f0;
		padding-top: 12px;
		margin-top: 12px;
	}

	.subrecord p {
		margin: 8px 0 4px;
	}

	.empty {
		padding: 24px;
	}

	a {
		color: #0f766e;
	}

	@media (max-width: 860px) {
		.shell {
			padding: 32px 16px 64px;
		}

		.hero,
		.summary-grid,
		.monitor-grid,
		.filters,
		.section-heading,
		.record-header,
		.meta,
		.record-grid,
		.form-row,
		.unlinked-grid {
			grid-template-columns: 1fr;
		}

		.actions {
			grid-auto-flow: row;
		}
	}
</style>

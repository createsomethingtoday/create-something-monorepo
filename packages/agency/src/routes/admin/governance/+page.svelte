<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { safeOperatorExternalHref } from '$lib/governance/operator-url';
	import type { ActionData, PageData } from './$types';

	type GovernanceRecord = PageData['review']['records'][number];
	type Decision = PageData['review']['unlinked_decisions'][number];
	type Proof = PageData['review']['unlinked_proofs'][number];
	type ProductAttachment = PageData['review']['explicit_attachments'][number];
	type Connection = PageData['review']['connections'][number];
	type Receipt = PageData['review']['receipts'][number];
	type GraphNode = PageData['review']['graph']['nodes'][number];
	type GraphAttachment = PageData['review']['graph']['attachments'][number];

	let { data, form }: { data: PageData; form?: ActionData } = $props();

	const records = $derived(data.review.records as GovernanceRecord[]);
	const unlinkedDecisions = $derived(data.review.unlinked_decisions as Decision[]);
	const unlinkedProofs = $derived(data.review.unlinked_proofs as Proof[]);
	const explicitAttachments = $derived(data.review.explicit_attachments as ProductAttachment[]);
	const sources = $derived(
		(data.review.connections as Connection[]).filter((connection) => connection.kind === 'source')
	);
	const subscriptions = $derived(
		(data.review.connections as Connection[]).filter((connection) => connection.kind === 'subscription')
	);
	const receipts = $derived(data.review.receipts as Receipt[]);
	const graphNodes = $derived(data.review.graph.nodes as GraphNode[]);
	const graphAttachments = $derived(data.review.graph.attachments as GraphAttachment[]);
	const productOptions = ['atlas', 'signal', 'decision', 'proof'];
	const attachmentModes = ['connects', 'consumes', 'produces', 'records'];
	const receiptStatuses = ['queued', 'delivered', 'failed', 'skipped'];
	const graphProductCounts = $derived(
		data.review.graph.product_loop.map((productId) => ({
			productId,
			count: graphNodes.filter((node) => node.product_id === productId).length
		}))
	);
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

	function graphNodeLabel(nodeId: string): string {
		const node = graphNodes.find((candidate) => candidate.id === nodeId);
		return node?.label || nodeId;
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

	function connectionTone(status: string): string {
		if (status === 'active') return 'success';
		if (status === 'error') return 'danger';
		return 'warning';
	}

	function receiptTone(status: string): string {
		if (status === 'delivered') return 'success';
		if (status === 'failed') return 'danger';
		if (status === 'skipped') return 'warning';
		return 'info';
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
			<a href="/api/governance/products" target="_blank">Products</a>
			<a href={apiHref('/api/governance/signals')} target="_blank">Signals</a>
			<a href={apiHref('/api/governance/decisions')} target="_blank">Decisions</a>
			<a href={apiHref('/api/governance/proofs')} target="_blank">Proofs</a>
			<a href={apiHref('/api/governance/attachments')} target="_blank">Attachments</a>
			<a href={apiHref('/api/governance/connections')} target="_blank">Connections</a>
			<a href={apiHref('/api/governance/receipts')} target="_blank">Receipts</a>
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
			<span class="metric-value">{data.review.summary.active_signals}</span>
			<span class="metric-label">Open inbox</span>
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
			<span class="metric-value">{data.review.summary.closed_signals}</span>
			<span class="metric-label">Closed</span>
		</div>
		<div class="metric">
			<span class="metric-value">{data.review.summary.records_requiring_docs_review}</span>
			<span class="metric-label">Docs review</span>
		</div>
		<div class="metric">
			<span class="metric-value">{data.review.summary.records_requiring_reviewer_process_review}</span>
			<span class="metric-label">Process review</span>
		</div>
		<div class="metric">
			<span class="metric-value">{data.review.summary.explicit_attachments}</span>
			<span class="metric-label">Manual links</span>
		</div>
		<div class="metric">
			<span class="metric-value">{data.review.summary.sources}</span>
			<span class="metric-label">Sources</span>
		</div>
		<div class="metric">
			<span class="metric-value">{data.review.summary.subscriptions}</span>
			<span class="metric-label">Subscriptions</span>
		</div>
		<div class="metric">
			<span class="metric-value">{data.review.summary.receipts}</span>
			<span class="metric-label">Receipts</span>
		</div>
		<div class="metric">
			<span class="metric-value">{data.review.summary.failed_receipts}</span>
			<span class="metric-label">Failed delivery</span>
		</div>
	</section>

	<section class="connections-panel" aria-label="Governance Sources Subscriptions and Receipts">
		<div class="section-heading">
			<div>
				<p class="eyebrow">Connections</p>
				<h2>Sources, Subscriptions, Receipts</h2>
			</div>
			<span>{sources.length + subscriptions.length} connections</span>
		</div>
		<div class="connections-grid">
			<section>
				<header class="panel-subheading">
					<h3>Sources</h3>
					<span>Signals in</span>
				</header>
				{#if sources.length === 0}
					<div class="empty compact">No Signal sources match this view.</div>
				{:else}
					<div class="connection-list">
						{#each sources as connection}
							<div class="connection-row">
								<span class={`pill ${connectionTone(connection.status)}`}>{connection.status}</span>
								<div>
									<strong>{connection.name}</strong>
									<small>{connection.id}</small>
									<small>{connection.event_types.join(', ') || 'signal.received'}</small>
									{#if safeHref(connection.endpoint_url)}
										<a href={safeHref(connection.endpoint_url) ?? ''} target="_blank" rel="noreferrer">Endpoint</a>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
				<form method="POST" action="?/recordConnection" class="connection-form">
					<input type="hidden" name="kind" value="source" />
					<input type="hidden" name="return_atlas_canvas_id" value={data.review.filters.atlas_canvas_id} />
					<input type="hidden" name="return_atlas_node_id" value={data.review.filters.atlas_node_id} />
					<input type="hidden" name="return_limit" value={data.review.filters.limit} />
					<label>
						<span>Name</span>
						<input name="name" maxlength="220" placeholder="API update intake" required />
					</label>
					<div class="form-row compact">
						<label>
							<span>Atlas canvas</span>
							<input name="atlas_canvas_id" maxlength="160" value={data.review.filters.atlas_canvas_id} required />
						</label>
						<label>
							<span>Atlas node</span>
							<input name="atlas_node_id" maxlength="160" value={data.review.filters.atlas_node_id} />
						</label>
					</div>
					<label>
						<span>API endpoint</span>
						<input name="endpoint_url" type="url" maxlength="500" placeholder="https://..." />
					</label>
					<div class="form-row compact">
						<label>
							<span>Events</span>
							<input name="event_types" maxlength="1000" placeholder="signal.received, api.updated" />
						</label>
						<label>
							<span>Owner</span>
							<input name="owner" maxlength="220" placeholder="team or operator" />
						</label>
					</div>
					<label>
						<span>Signing secret</span>
						<input name="signing_secret_name" maxlength="160" placeholder="GOVERNANCE_SOURCE_SECRET" />
					</label>
					<button type="submit">Add Source</button>
				</form>
			</section>
			<section>
				<header class="panel-subheading">
					<h3>Subscriptions</h3>
					<span>Decisions and Proofs out</span>
				</header>
				{#if subscriptions.length === 0}
					<div class="empty compact">No Decision or Proof subscriptions match this view.</div>
				{:else}
					<div class="connection-list">
						{#each subscriptions as connection}
							<div class="connection-row">
								<span class={`pill ${connectionTone(connection.status)}`}>{connection.status}</span>
								<div>
									<strong>{connection.name}</strong>
									<small>{connection.id}</small>
									<small>{connection.event_types.join(', ') || 'decision.updated, proof.attached'}</small>
									{#if safeHref(connection.endpoint_url)}
										<a href={safeHref(connection.endpoint_url) ?? ''} target="_blank" rel="noreferrer">Webhook</a>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
				<form method="POST" action="?/recordConnection" class="connection-form">
					<input type="hidden" name="kind" value="subscription" />
					<input type="hidden" name="return_atlas_canvas_id" value={data.review.filters.atlas_canvas_id} />
					<input type="hidden" name="return_atlas_node_id" value={data.review.filters.atlas_node_id} />
					<input type="hidden" name="return_limit" value={data.review.filters.limit} />
					<label>
						<span>Name</span>
						<input name="name" maxlength="220" placeholder="Docs review webhook" required />
					</label>
					<div class="form-row compact">
						<label>
							<span>Atlas canvas</span>
							<input name="atlas_canvas_id" maxlength="160" value={data.review.filters.atlas_canvas_id} required />
						</label>
						<label>
							<span>Atlas node</span>
							<input name="atlas_node_id" maxlength="160" value={data.review.filters.atlas_node_id} />
						</label>
					</div>
					<label>
						<span>Webhook URL</span>
						<input name="endpoint_url" type="url" maxlength="500" placeholder="https://..." />
					</label>
					<div class="form-row compact">
						<label>
							<span>Events</span>
							<input name="event_types" maxlength="1000" placeholder="decision.approved, proof.attached" />
						</label>
						<label>
							<span>Owner</span>
							<input name="owner" maxlength="220" placeholder="team or operator" />
						</label>
					</div>
					<label>
						<span>Signing secret</span>
						<input name="signing_secret_name" maxlength="160" placeholder="GOVERNANCE_WEBHOOK_SECRET" />
					</label>
					<button type="submit">Add Subscription</button>
				</form>
			</section>
		</div>
		<section class="receipts-panel" aria-label="Delivery receipts">
			<header class="panel-subheading">
				<h3>Receipts</h3>
				<span>{receipts.length} delivery records</span>
			</header>
			{#if receipts.length === 0}
				<div class="empty compact">No delivery receipts recorded yet.</div>
			{:else}
				<div class="receipt-list">
					{#each receipts as receipt}
						<div class="receipt-row">
							<span class={`pill ${receiptTone(receipt.status)}`}>{receipt.status}</span>
							<div>
								<strong>{receipt.event_type}</strong>
								<small>{receipt.record_product_id}:{receipt.record_id} · {displayDate(receipt.created_at)}</small>
							</div>
							<small>{displayValue(receipt.status_code ? String(receipt.status_code) : null)}</small>
						</div>
					{/each}
				</div>
			{/if}
			<form method="POST" action="?/recordReceipt" class="receipt-form">
				<input type="hidden" name="return_atlas_canvas_id" value={data.review.filters.atlas_canvas_id} />
				<input type="hidden" name="return_atlas_node_id" value={data.review.filters.atlas_node_id} />
				<input type="hidden" name="return_limit" value={data.review.filters.limit} />
				<div class="form-row compact">
					<label>
						<span>Connection</span>
						<input name="connection_id" maxlength="180" placeholder="source or subscription id" required />
					</label>
					<label>
						<span>Event</span>
						<input name="event_type" maxlength="160" placeholder="proof.attached" required />
					</label>
				</div>
				<div class="form-row compact">
					<label>
						<span>Record product</span>
						<select name="record_product_id" required>
							{#each productOptions as product}
								<option value={product}>{product}</option>
							{/each}
						</select>
					</label>
					<label>
						<span>Record id</span>
						<input name="record_id" maxlength="180" placeholder="record id" required />
					</label>
				</div>
				<div class="form-row compact">
					<label>
						<span>Status</span>
						<select name="status" required>
							{#each receiptStatuses as status}
								<option value={status}>{status}</option>
							{/each}
						</select>
					</label>
					<label>
						<span>Status code</span>
						<input name="status_code" type="number" min="100" max="599" placeholder="200" />
					</label>
				</div>
				<label>
					<span>Response</span>
					<input name="response_excerpt" maxlength="500" placeholder="Optional delivery detail" />
				</label>
				<button type="submit">Record Receipt</button>
			</form>
		</section>
	</section>

	<section class="map-panel" aria-label="Atlas attachment map">
		<div class="section-heading">
			<div>
				<p class="eyebrow">Map</p>
				<h2>Atlas attachment graph</h2>
			</div>
			<span>{data.review.graph.summary.attachments} attachments</span>
		</div>
		<div class="map-summary" aria-label="Governance product node counts">
			{#each graphProductCounts as product}
				<div>
					<span class="metric-value">{product.count}</span>
					<span class="metric-label">{product.productId}</span>
				</div>
			{/each}
		</div>
		{#if graphAttachments.length === 0}
			<div class="empty">No Signal, Decision, or Proof attachments match this map view.</div>
		{:else}
			<div class="attachment-list" aria-label="Graph attachments">
				{#each graphAttachments as attachment}
					<div class="attachment-edge">
						<span class="pill info">{attachment.source_product_id}</span>
						<div>
							<strong>{graphNodeLabel(attachment.source)}</strong>
							<small>{attachment.mode} · {attachment.label}</small>
						</div>
						<span class="edge-arrow">-&gt;</span>
						<div>
							<strong>{graphNodeLabel(attachment.target)}</strong>
							<small>{attachment.target_product_id}</small>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<section class="attachment-panel" aria-label="Durable product attachments">
		<div class="section-heading">
			<div>
				<p class="eyebrow">Attach</p>
				<h2>Product attachments</h2>
			</div>
			<span>{explicitAttachments.length} durable links</span>
		</div>
		{#if explicitAttachments.length === 0}
			<div class="empty">No manual product attachments match this view.</div>
		{:else}
			<div class="attachment-list" aria-label="Explicit product attachments">
				{#each explicitAttachments as attachment}
					<div class="attachment-edge">
						<span class="pill info">{attachment.source_product_id}</span>
						<div>
							<strong>{attachment.source_record_id}</strong>
							<small>{attachment.mode} · {attachment.label}</small>
						</div>
						<span class="edge-arrow">-&gt;</span>
						<div>
							<strong>{attachment.target_record_id}</strong>
							<small>
								{attachment.target_product_id}
								{#if attachment.required}
									· required
								{/if}
							</small>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<form method="POST" action="?/recordAttachment" class="attachment-form">
			<input type="hidden" name="return_atlas_canvas_id" value={data.review.filters.atlas_canvas_id} />
			<input type="hidden" name="return_atlas_node_id" value={data.review.filters.atlas_node_id} />
			<input type="hidden" name="return_limit" value={data.review.filters.limit} />
			<div class="form-row compact">
				<label>
					<span>Source product</span>
					<select name="source_product_id" required>
						{#each productOptions as product}
							<option value={product}>{product}</option>
						{/each}
					</select>
				</label>
				<label>
					<span>Source record</span>
					<input name="source_record_id" maxlength="180" placeholder="canvas or record id" required />
				</label>
			</div>
			<div class="form-row compact">
				<label>
					<span>Target product</span>
					<select name="target_product_id" required>
						<option value="signal">signal</option>
						<option value="decision">decision</option>
						<option value="proof">proof</option>
						<option value="atlas">atlas</option>
					</select>
				</label>
				<label>
					<span>Target record</span>
					<input name="target_record_id" maxlength="180" placeholder="record id" required />
				</label>
			</div>
			<div class="form-row compact">
				<label>
					<span>Atlas canvas</span>
					<input
						name="atlas_canvas_id"
						maxlength="160"
						value={data.review.filters.atlas_canvas_id}
						placeholder="governance_source_updates"
						required
					/>
				</label>
				<label>
					<span>Atlas node</span>
					<input
						name="atlas_node_id"
						maxlength="160"
						value={data.review.filters.atlas_node_id}
						placeholder="optional node id"
					/>
				</label>
			</div>
			<div class="form-row compact">
				<label>
					<span>Mode</span>
					<select name="mode">
						{#each attachmentModes as mode}
							<option value={mode}>{mode}</option>
						{/each}
					</select>
				</label>
				<label>
					<span>Label</span>
					<input name="label" maxlength="280" placeholder="Why these records belong together" />
				</label>
			</div>
			<div class="checkbox-row" aria-label="Attachment requirements">
				<label>
					<input type="checkbox" name="required" />
					<span>Required link</span>
				</label>
			</div>
			<button type="submit">Record attachment</button>
		</form>
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

	<section class="manual-signal-panel" aria-label="Manual Signal intake">
		<div class="section-heading">
			<div>
				<p class="eyebrow">Inbox</p>
				<h2>Record Signal</h2>
			</div>
			<span>Manual intake</span>
		</div>
		<form method="POST" action="?/recordSignal" class="manual-signal-form">
			<input type="hidden" name="return_atlas_canvas_id" value={data.review.filters.atlas_canvas_id} />
			<input type="hidden" name="return_atlas_node_id" value={data.review.filters.atlas_node_id} />
			<input type="hidden" name="return_limit" value={data.review.filters.limit} />
			<div class="form-row">
				<label>
					<span>Atlas canvas</span>
					<input
						name="atlas_canvas_id"
						maxlength="160"
						value={data.review.filters.atlas_canvas_id}
						placeholder="governance_source_updates"
						required
					/>
				</label>
				<label>
					<span>Atlas node</span>
					<input
						name="atlas_node_id"
						maxlength="160"
						value={data.review.filters.atlas_node_id}
						placeholder="watched_source_updates"
					/>
				</label>
			</div>
			<div class="form-row">
				<label>
					<span>Source</span>
					<input name="source" maxlength="160" placeholder="slack:#api-updates" />
				</label>
				<label>
					<span>Source URL</span>
					<input name="source_url" type="url" maxlength="500" placeholder="https://..." />
				</label>
			</div>
			<label>
				<span>Title</span>
				<input name="title" maxlength="220" placeholder="API update needs review" required />
			</label>
			<label>
				<span>Summary</span>
				<textarea
					name="summary"
					rows="4"
					maxlength="2000"
					placeholder="What changed, why it matters, and what should be reviewed?"
					required
				></textarea>
			</label>
			<div class="checkbox-row" aria-label="Signal review classification">
				<label>
					<input type="checkbox" name="requires_documentation_review" />
					<span>Docs review</span>
				</label>
				<label>
					<input type="checkbox" name="requires_reviewer_process_review" />
					<span>Process review</span>
				</label>
			</div>
			<label>
				<span>Reasons</span>
				<input name="reasons" maxlength="1000" placeholder="API surface changed; Reviewer workflow was mentioned" />
			</label>
			<button type="submit">Record Signal</button>
		</form>
	</section>

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
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 12px;
		margin: 24px 0;
	}

	.metric,
	.record,
	.filters,
	.connections-panel,
	.monitor-panel,
	.map-panel,
	.attachment-panel,
	.manual-signal-panel,
	.notice,
	.empty {
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #fff;
	}

	.metric {
		padding: 18px;
	}

	.connections-panel {
		display: grid;
		gap: 16px;
		margin: 24px 0;
		padding: 18px;
	}

	.connections-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
	}

	.connections-grid > section,
	.receipts-panel {
		display: grid;
		gap: 12px;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #f8fafc;
		padding: 14px;
	}

	.panel-subheading {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 12px;
	}

	.connection-list,
	.receipt-list,
	.connection-form,
	.receipt-form {
		display: grid;
		gap: 10px;
	}

	.connection-row,
	.receipt-row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: start;
		gap: 10px;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #fff;
		padding: 10px;
	}

	.connection-row div,
	.receipt-row div {
		display: grid;
		gap: 4px;
		min-width: 0;
	}

	.connection-row strong,
	.connection-row small,
	.receipt-row strong,
	.receipt-row small {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.monitor-panel {
		display: grid;
		gap: 14px;
		margin: 24px 0;
		padding: 18px;
	}

	.map-panel {
		display: grid;
		gap: 14px;
		margin: 24px 0;
		padding: 18px;
	}

	.attachment-panel {
		display: grid;
		gap: 14px;
		margin: 24px 0;
		padding: 18px;
	}

	.map-summary {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 12px;
	}

	.map-summary div {
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #f8fafc;
		padding: 12px;
	}

	.attachment-list {
		display: grid;
		gap: 8px;
	}

	.attachment-edge {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto minmax(0, 1fr);
		align-items: center;
		gap: 10px;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 10px;
	}

	.attachment-edge div {
		display: grid;
		gap: 3px;
		min-width: 0;
	}

	.attachment-edge strong,
	.attachment-edge small {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.edge-arrow {
		color: #94a3b8;
		font-weight: 800;
	}

	.manual-signal-panel {
		margin: 24px 0;
		padding: 18px;
	}

	.manual-signal-form {
		display: grid;
		gap: 12px;
		margin-top: 14px;
	}

	.attachment-form {
		display: grid;
		gap: 12px;
		border-top: 1px solid #e2e8f0;
		padding-top: 14px;
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

	.form-row.compact {
		grid-template-columns: minmax(0, 180px) minmax(0, 1fr);
	}

	.checkbox-row {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
	}

	.checkbox-row label {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	.checkbox-row input {
		width: auto;
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

	.empty.compact {
		padding: 14px;
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
		.connections-grid,
		.connection-row,
		.receipt-row,
		.monitor-grid,
		.map-summary,
		.attachment-edge,
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

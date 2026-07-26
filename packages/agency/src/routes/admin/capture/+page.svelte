<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';

	type CaptureClassificationLabel =
		| 'actual_user'
		| 'customer_record'
		| 'internal_test'
		| 'fixture'
		| 'likely_bot'
		| 'spam'
		| 'legacy_placeholder'
		| 'operational_access'
		| 'needs_review';
	type CaptureRecommendedAction = 'keep' | 'review' | 'ignore' | 'suppress';
	type CaptureReviewRecord = PageData['review']['records'][number];

	let { data }: { data: PageData } = $props();

	const surfaceOptions: Array<{ value: string; label: string }> = [
		{ value: 'all', label: 'All surfaces' },
		{ value: 'newsletter', label: 'Newsletter' },
		{ value: 'contact', label: 'Contact' },
		{ value: 'lead', label: 'Lead' },
		{ value: 'public_atlas', label: 'Public Atlas' },
		{ value: 'user', label: 'Users' },
		{ value: 'commercial_account', label: 'Commercial accounts' },
		{ value: 'legacy_contact', label: 'Legacy contacts' },
		{ value: 'mcp_entitlement', label: 'MCP entitlements' },
	];
	const classificationOptions: Array<{ value: string; label: string }> = [
		{ value: 'all', label: 'All classifications' },
		{ value: 'actual_user', label: 'Actual users' },
		{ value: 'customer_record', label: 'Customer records' },
		{ value: 'internal_test', label: 'Internal tests' },
		{ value: 'fixture', label: 'Fixtures' },
		{ value: 'likely_bot', label: 'Likely bots' },
		{ value: 'spam', label: 'Spam' },
		{ value: 'legacy_placeholder', label: 'Legacy placeholders' },
		{ value: 'operational_access', label: 'Operational access' },
		{ value: 'needs_review', label: 'Needs review' },
	];
	const actionOptions: Array<{ value: string; label: string }> = [
		{ value: 'all', label: 'All actions' },
		{ value: 'keep', label: 'Keep' },
		{ value: 'review', label: 'Review' },
		{ value: 'ignore', label: 'Ignore' },
		{ value: 'suppress', label: 'Suppress' },
	];
	const reviewedOptions: Array<{ value: string; label: string }> = [
		{ value: 'all', label: 'All review states' },
		{ value: 'reviewed', label: 'Reviewed' },
		{ value: 'unreviewed', label: 'Unreviewed' },
	];
	type QuickDecision = {
		label: string;
		classificationLabel: CaptureClassificationLabel;
		recommendedAction: CaptureRecommendedAction;
	};

	const quickDecisions: QuickDecision[] = [
		{ label: 'Actual', classificationLabel: 'actual_user', recommendedAction: 'keep' },
		{ label: 'Test', classificationLabel: 'internal_test', recommendedAction: 'ignore' },
		{ label: 'Bot', classificationLabel: 'likely_bot', recommendedAction: 'suppress' },
		{ label: 'Spam', classificationLabel: 'spam', recommendedAction: 'suppress' },
		{ label: 'Review', classificationLabel: 'needs_review', recommendedAction: 'review' },
	];

	const actionTone: Record<string, string> = {
		keep: 'success',
		review: 'warning',
		ignore: 'muted',
		suppress: 'danger',
	};

	const classificationTone: Record<string, string> = {
		actual_user: 'success',
		customer_record: 'success',
		internal_test: 'muted',
		fixture: 'muted',
		likely_bot: 'danger',
		spam: 'danger',
		legacy_placeholder: 'muted',
		operational_access: 'info',
		needs_review: 'warning',
	};

	let busyKey = $state<string | null>(null);
	let message = $state('');
	let errorMessage = $state('');
	let copiedKey = $state<string | null>(null);

	const records = $derived(data.review.records as CaptureReviewRecord[]);
	const visibleRecords = $derived(
		records.filter((record) => (data.includeOperational ? true : record.surface !== 'mcp_entitlement'))
	);
	const activeFilterCount = $derived(
		[
			data.review.filters.surface !== 'all',
			data.review.filters.classification !== 'all',
			data.review.filters.action !== 'all',
			data.review.filters.reviewed !== 'all',
			Boolean(data.review.filters.query),
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

	function decisionKey(record: CaptureReviewRecord, decision: QuickDecision): string {
		return `${record.surface}:${record.id}:${decision.classificationLabel}`;
	}

	function clearKey(record: CaptureReviewRecord): string {
		return `${record.surface}:${record.id}:clear`;
	}

	async function copyText(key: string, value: string) {
		try {
			await navigator.clipboard.writeText(value);
			copiedKey = key;
			message = 'Copied.';
		} catch {
			errorMessage = 'Clipboard is unavailable. Select and copy the text manually.';
		}
	}

	function buildQuery(overrides: Record<string, string | number | null | undefined> = {}): string {
		const params = new URLSearchParams();
		const include = overrides.include ?? (data.includeOperational ? 'all' : null);
		const limit = overrides.limit ?? data.limit;
		const surface = overrides.surface ?? data.review.filters.surface;
		const classification = overrides.classification ?? data.review.filters.classification;
		const action = overrides.action ?? data.review.filters.action;
		const reviewed = overrides.reviewed ?? data.review.filters.reviewed;
		const query = overrides.q ?? data.review.filters.query;

		if (include) params.set('include', String(include));
		if (limit) params.set('limit', String(limit));
		if (surface && surface !== 'all') params.set('surface', String(surface));
		if (classification && classification !== 'all') params.set('classification', String(classification));
		if (action && action !== 'all') params.set('action', String(action));
		if (reviewed && reviewed !== 'all') params.set('reviewed', String(reviewed));
		if (query) params.set('q', String(query));
		const search = params.toString();
		return search ? `?${search}` : '';
	}

	function viewHref(includeOperational: boolean): string {
		return `/admin/capture${buildQuery({ include: includeOperational ? 'all' : null })}`;
	}

	function jsonHref(): string {
		return `/api/admin/capture${buildQuery()}`;
	}

	async function mark(record: CaptureReviewRecord, decision: QuickDecision) {
		const key = decisionKey(record, decision);
		busyKey = key;
		message = '';
		errorMessage = '';

		try {
			const response = await fetch('/api/admin/capture', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					surface: record.surface,
					source_id: record.id,
					email: record.email,
					email_hash: record.email_hash ?? null,
					classification_label: decision.classificationLabel,
					recommended_action: decision.recommendedAction,
					notes: `Marked ${decision.label.toLowerCase()} from /admin/capture.`,
					metadata: {
						previous_classification: record.classification.label,
						previous_recommended_action: record.classification.recommended_action,
					},
				}),
			});
			const payload = (await response.json().catch(() => ({}))) as { message?: string };
			if (!response.ok) {
				throw new Error(payload.message ?? 'Failed to save review decision');
			}

			message = 'Review saved.';
			await invalidateAll();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to save review decision';
		} finally {
			busyKey = null;
		}
	}

	async function clearDecision(record: CaptureReviewRecord) {
		const key = clearKey(record);
		busyKey = key;
		message = '';
		errorMessage = '';

		try {
			const response = await fetch('/api/admin/capture', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					surface: record.surface,
					source_id: record.id,
				}),
			});
			const payload = (await response.json().catch(() => ({}))) as { message?: string };
			if (!response.ok) {
				throw new Error(payload.message ?? 'Failed to clear review decision');
			}

			message = 'Review override cleared.';
			await invalidateAll();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to clear review decision';
		} finally {
			busyKey = null;
		}
	}
</script>

<SEO title="Capture Review" description="Review captured newsletter, contact, Atlas, and account signals." propertyName="agency" noindex={true} />

<main class="shell">
	<header class="hero">
		<div>
			<p class="eyebrow">Captured records</p>
			<h1>Review captured signals</h1>
			<p>Decide which captured records need action. Source rows stay unchanged; only the review decision is stored.</p>
		</div>
		<nav class="actions" aria-label="Capture review views">
			<a class:active={!data.includeOperational} href={viewHref(false)}>Public captures</a>
			<a class:active={data.includeOperational} href={viewHref(true)}>All context</a>
			<a href={jsonHref()} target="_blank">JSON</a>
		</nav>
	</header>

	{#if data.error}
		<div class="notice danger">{data.error}</div>
	{/if}
	{#if message}
		<div class="notice success">{message}</div>
	{/if}
	{#if errorMessage}
		<div class="notice danger">{errorMessage}</div>
	{/if}
	{#if !data.review.decision_storage.available}
		<div class="notice warning">
			Durable review decisions are disabled until migration 0029 is applied. Classification and filters still work.
		</div>
	{/if}

	<section class="summary-grid" aria-label="Capture review summary">
		<div class="metric">
			<span class="metric-value">{data.review.summary.total}</span>
			<span class="metric-label">Rows</span>
		</div>
		<div class="metric">
			<span class="metric-value">{data.review.decision_storage.stored_count}</span>
			<span class="metric-label">Stored decisions</span>
		</div>
		{#each Object.entries(data.review.summary.by_classification) as [label, count]}
			<div class="metric">
				<span class="metric-value">{count}</span>
				<span class="metric-label">{label.replaceAll('_', ' ')}</span>
			</div>
		{/each}
	</section>

	<section class="panel">
		<div class="panel-header">
			<div>
				<h2>Records</h2>
				<p>
					Generated {displayDate(data.review.generated_at)}. Showing {data.review.summary.total} of {data.review.summary.unfiltered_total} rows.
				</p>
			</div>
			<div class="legend">
				{#each Object.entries(data.review.summary.recommended_actions) as [action, count]}
					<span class:success={actionTone[action] === 'success'} class:warning={actionTone[action] === 'warning'} class:danger={actionTone[action] === 'danger'}>{action}: {count}</span>
				{/each}
			</div>
		</div>

		<form class="filters" method="GET" action="/admin/capture">
			{#if data.includeOperational}
				<input type="hidden" name="include" value="all" />
			{/if}
			<label>
				<span>Search</span>
				<input name="q" value={data.review.filters.query} placeholder="Email, hash, source, note" />
			</label>
			<label>
				<span>Surface</span>
				<select name="surface" value={data.review.filters.surface}>
					{#each surfaceOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</label>
			<label>
				<span>Classification</span>
				<select name="classification" value={data.review.filters.classification}>
					{#each classificationOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</label>
			<label>
				<span>Action</span>
				<select name="action" value={data.review.filters.action}>
					{#each actionOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</label>
			<label>
				<span>Review</span>
				<select name="reviewed" value={data.review.filters.reviewed}>
					{#each reviewedOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</label>
			<label class="limit-field">
				<span>Limit</span>
				<input name="limit" type="number" min="1" max="500" value={data.limit} />
			</label>
			<div class="filter-actions">
				<button type="submit">Apply</button>
				<a href="/admin/capture{data.includeOperational ? '?include=all' : ''}">
					Clear{activeFilterCount ? ` (${activeFilterCount})` : ''}
				</a>
			</div>
		</form>

		{#if visibleRecords.length === 0}
			<p class="empty">No capture rows found for this view.</p>
		{:else}
			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th>Captured</th>
							<th>Surface</th>
							<th>Identity</th>
							<th>Classification</th>
							<th>Evidence</th>
							<th>Action</th>
						</tr>
					</thead>
					<tbody>
						{#each visibleRecords as record}
							<tr>
								<td>
									<div>{displayDate(record.captured_at)}</div>
									<div class="muted">{displayValue(record.status)}</div>
								</td>
								<td>
									<span class="surface">{record.surface.replaceAll('_', ' ')}</span>
									<div class="muted">{record.id}</div>
								</td>
								<td>
									<strong>{displayValue(record.email ?? record.matched_email)}</strong>
									{#if record.email_hash && !record.email}
										<div class="muted hash">{record.email_hash}</div>
									{/if}
									{#if record.name}
										<div class="muted">{record.name}</div>
									{/if}
								</td>
								<td>
									<span
										class="badge"
										class:success={classificationTone[record.classification.label] === 'success'}
										class:warning={classificationTone[record.classification.label] === 'warning'}
										class:danger={classificationTone[record.classification.label] === 'danger'}
										class:info={classificationTone[record.classification.label] === 'info'}
									>
										{record.classification.label.replaceAll('_', ' ')}
									</span>
									<div class="muted">{record.classification.recommended_action} · {record.classification.confidence}</div>
									{#if record.review}
										<div class="reviewed">Reviewed by {record.review.reviewed_by}</div>
									{/if}
								</td>
								<td>
									{#if record.excerpt}
										<p class="excerpt">{record.excerpt}</p>
									{/if}
									<ul>
										{#each record.classification.reasons.slice(0, 2) as reason}
											<li>{reason}</li>
										{/each}
									</ul>
									{#if record.atlas_handoff}
										<details class="atlas-handoff">
											<summary>
												<span>{record.atlas_handoff.title}</span>
												<strong>{record.atlas_handoff.lane}</strong>
											</summary>
											<div class="handoff-actions">
												<button
													type="button"
													onclick={() =>
														copyText(`${record.id}:packet`, record.atlas_handoff?.packet ?? '')}
												>
													{copiedKey === `${record.id}:packet` ? 'Copied packet' : 'Copy packet'}
												</button>
												<button
													type="button"
													onclick={() =>
														copyText(
															`${record.id}:linear`,
															record.atlas_handoff?.linear_create_command ?? ''
														)}
												>
													{copiedKey === `${record.id}:linear` ? 'Copied command' : 'Copy Linear command'}
												</button>
											</div>
											<pre>{record.atlas_handoff.packet}</pre>
											<code>{record.atlas_handoff.linear_create_command}</code>
										</details>
									{/if}
								</td>
								<td>
									<div class="decision-grid">
										{#each quickDecisions as decision}
											<button
												type="button"
												disabled={busyKey !== null || !data.review.decision_storage.available}
												class:active={record.classification.label === decision.classificationLabel}
												onclick={() => mark(record, decision)}
											>
												{busyKey === decisionKey(record, decision) ? 'Saving' : decision.label}
											</button>
										{/each}
										{#if record.review}
											<button
												type="button"
												class="clear-button"
												disabled={busyKey !== null || !data.review.decision_storage.available}
												onclick={() => clearDecision(record)}
											>
												{busyKey === clearKey(record) ? 'Clearing' : 'Clear'}
											</button>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</main>

<style>
	.shell {
		max-width: 1440px;
		margin: 0 auto;
		padding: 2rem;
		color: var(--color-fg, #f7f7f7);
	}

	.hero {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.eyebrow {
		margin: 0 0 0.4rem;
		color: var(--color-performance-fg-muted, #9ca3af);
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	h1,
	h2,
	p {
		margin: 0;
	}

	h1 {
		font-size: 2.25rem;
	}

	.hero p:last-child,
	.panel-header p,
	.muted {
		color: var(--color-performance-fg-muted, #9ca3af);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.actions a,
	button {
		border: 1px solid rgba(255, 255, 255, 0.16);
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.04);
		color: inherit;
		padding: 0.55rem 0.75rem;
		text-decoration: none;
		font: inherit;
		cursor: pointer;
	}

	.actions a.active,
	button.active {
		border-color: rgba(74, 222, 128, 0.65);
		background: rgba(74, 222, 128, 0.12);
	}

	button:disabled {
		cursor: wait;
		opacity: 0.55;
	}

	.notice {
		margin-bottom: 1rem;
		border-radius: 8px;
		padding: 0.85rem 1rem;
		border: 1px solid rgba(255, 255, 255, 0.16);
	}

	.notice.success {
		border-color: rgba(74, 222, 128, 0.4);
		background: rgba(74, 222, 128, 0.1);
	}

	.notice.danger {
		border-color: rgba(248, 113, 113, 0.4);
		background: rgba(248, 113, 113, 0.1);
	}

	.notice.warning {
		border-color: rgba(250, 204, 21, 0.4);
		background: rgba(250, 204, 21, 0.1);
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.metric,
	.panel {
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.03);
	}

	.metric {
		padding: 0.9rem 1rem;
	}

	.metric-value {
		display: block;
		font-size: 1.45rem;
		font-weight: 700;
	}

	.metric-label {
		color: var(--color-performance-fg-muted, #9ca3af);
		font-size: 0.82rem;
		text-transform: capitalize;
	}

	.panel {
		overflow: hidden;
	}

	.panel-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.filters {
		display: grid;
		grid-template-columns: minmax(16rem, 1.8fr) repeat(4, minmax(10rem, 1fr)) minmax(6rem, 0.5fr) auto;
		gap: 0.75rem;
		align-items: end;
		padding: 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.filters label {
		display: grid;
		gap: 0.35rem;
	}

	.filters label span {
		color: var(--color-performance-fg-muted, #9ca3af);
		font-size: 0.72rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	input,
	select {
		width: 100%;
		min-height: 2.55rem;
		border: 1px solid rgba(255, 255, 255, 0.16);
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.04);
		color: inherit;
		padding: 0.5rem 0.65rem;
		font: inherit;
	}

	.limit-field input {
		min-width: 5.5rem;
	}

	.filter-actions {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-height: 2.55rem;
	}

	.filter-actions a {
		color: var(--color-performance-fg-muted, #9ca3af);
		font-size: 0.88rem;
		text-decoration: none;
		white-space: nowrap;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.45rem;
	}

	.legend span,
	.badge,
	.surface {
		display: inline-flex;
		align-items: center;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		padding: 0.2rem 0.5rem;
		font-size: 0.78rem;
		text-transform: capitalize;
	}

	.success {
		color: #86efac;
	}

	.warning {
		color: #facc15;
	}

	.danger {
		color: #fca5a5;
	}

	.info {
		color: #93c5fd;
	}

	.empty {
		padding: 2rem;
		color: var(--color-performance-fg-muted, #9ca3af);
	}

	.table-wrap {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		min-width: 1180px;
	}

	th,
	td {
		padding: 0.85rem 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		text-align: left;
		vertical-align: top;
	}

	th {
		color: var(--color-performance-fg-muted, #9ca3af);
		font-size: 0.76rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	td {
		font-size: 0.9rem;
	}

	.hash {
		max-width: 16rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.reviewed {
		margin-top: 0.35rem;
		color: #93c5fd;
		font-size: 0.78rem;
	}

	.excerpt {
		max-width: 32rem;
		color: rgba(255, 255, 255, 0.86);
		line-height: 1.45;
	}

	ul {
		margin: 0.45rem 0 0;
		padding-left: 1rem;
		color: var(--color-performance-fg-muted, #9ca3af);
	}

	.atlas-handoff {
		margin-top: 0.75rem;
		border: 1px solid rgba(147, 197, 253, 0.22);
		border-radius: 8px;
		background: rgba(147, 197, 253, 0.06);
	}

	.atlas-handoff summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.65rem 0.75rem;
		cursor: pointer;
	}

	.atlas-handoff summary span {
		font-weight: 700;
	}

	.atlas-handoff summary strong {
		color: #93c5fd;
		font-size: 0.78rem;
		font-weight: 600;
	}

	.handoff-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		padding: 0 0.75rem 0.65rem;
	}

	.handoff-actions button {
		padding: 0.4rem 0.55rem;
		font-size: 0.78rem;
	}

	.atlas-handoff pre,
	.atlas-handoff code {
		display: block;
		max-width: 36rem;
		margin: 0;
		overflow-x: auto;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		padding: 0.75rem;
		color: rgba(255, 255, 255, 0.82);
		font-size: 0.78rem;
		line-height: 1.45;
		white-space: pre-wrap;
	}

	.decision-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.35rem;
		min-width: 11rem;
	}

	.decision-grid button {
		padding: 0.45rem 0.55rem;
	}

	.decision-grid .clear-button {
		grid-column: 1 / -1;
		color: var(--color-performance-fg-muted, #9ca3af);
	}

	@media (max-width: 820px) {
		.shell {
			padding: 1rem;
		}

		.hero,
		.panel-header {
			display: block;
		}

		.filters {
			grid-template-columns: 1fr;
		}

		.actions,
		.legend {
			justify-content: flex-start;
			margin-top: 1rem;
		}
	}
</style>

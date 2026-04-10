<script lang="ts">
	import { SEO } from '@create-something/canon';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const componentKinds = ['site', 'platform', 'product'] as const;

	const engagements = $derived.by(() => data.engagements);
	const selectedEngagement = $derived.by(() => data.selectedEngagement);
	const selectedClient = $derived.by(() => data.selectedClient);
	const components = $derived.by(() => data.components);
	const artifacts = $derived.by(() => data.artifacts);
	const milestones = $derived.by(() => data.milestones);
	const integrations = $derived.by(() => data.integrations);
	const risks = $derived.by(() => data.risks);
	const accessItems = $derived.by(() => data.accessItems);
	const commercial = $derived.by(() => data.commercial);

	const groupedComponents = $derived.by(() => ({
		site: components.filter((row) => row.kind === 'site'),
		platform: components.filter((row) => row.kind === 'platform'),
		product: components.filter((row) => row.kind === 'product')
	}));

	const summary = $derived.by(() => ({
		components: components.length,
		artifacts: artifacts.length,
		openMilestones: milestones.filter((row) => row.status !== 'done' && row.status !== 'cancelled').length,
		openRisks: risks.filter((row) => row.status !== 'closed').length,
		accessNeeded: accessItems.filter((row) => row.status === 'needed' || row.status === 'requested').length,
		integrationsConnected: integrations.filter((row) => row.status === 'connected').length
	}));

	let question = $state('');
	let answer = $state('');
	let requestError = $state('');
	let submitting = $state(false);

	function formatMoney(value: number | null | undefined) {
		if (value == null) return '—';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			maximumFractionDigits: 0
		}).format(value);
	}

	function formatLabel(value: string) {
		return value
			.replace(/_/g, ' ')
			.replace(/\b\w/g, (match) => match.toUpperCase());
	}

	function statusTone(status: string) {
		if (status === 'live' || status === 'managed' || status === 'done' || status === 'connected' || status === 'granted') {
			return 'good';
		}
		if (status === 'building' || status === 'active' || status === 'requested' || status === 'approved' || status === 'sent') {
			return 'warn';
		}
		if (status === 'blocked' || status === 'critical' || status === 'overdue' || status === 'needed' || status === 'failing') {
			return 'bad';
		}
		return 'muted';
	}

	async function submitQuestion() {
		if (!selectedEngagement || !question.trim() || submitting) return;

		submitting = true;
		requestError = '';
		answer = '';

		try {
			const response = await fetch('/api/internal/delivery-os/chat', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					engagementId: selectedEngagement.id,
					question
				})
			});

			const payload = (await response.json().catch(() => null)) as
				| { answer?: string; error?: string }
				| null;

			if (!response.ok) {
				requestError = payload?.error ?? 'The delivery agent could not answer right now.';
				return;
			}

			answer = payload?.answer ?? '';
		} catch {
			requestError = 'The delivery agent could not answer right now.';
		} finally {
			submitting = false;
		}
	}
</script>

<SEO
	title="Delivery OS"
	description="Operator workspace for delivery state across site, platform, and MCP product engagements."
	propertyName="agency"
	noindex={true}
/>

<section class="shell">
	<div class="shell-inner">
		<header class="hero">
			<div>
				<p class="eyebrow">Operator Surface</p>
				<h1>Delivery OS</h1>
				<p class="lede">
					Single operator workspace for delivery state across sites, platforms, and MCP products.
					Use it to review scope, docs, risks, access gaps, and launch posture across client and
					internal builds.
				</p>
			</div>
			<div class="hero-meta">
				<div class="meta-card">
					<span class="label">Operator</span>
					<strong>{data.operator.email}</strong>
				</div>
				<div class="meta-card">
					<span class="label">Source</span>
					<strong>{formatLabel(data.sourceMode)}</strong>
				</div>
				<div class="meta-card">
					<span class="label">Agent Chat</span>
					<strong>{data.chatEnabled ? 'Enabled' : 'Configured later'}</strong>
				</div>
			</div>
		</header>

		<div class="workspace">
			<aside class="rail">
				<section class="panel">
					<div class="panel-header">
						<h2>Engagements</h2>
						<span>{engagements.length}</span>
					</div>
					<div class="engagement-list">
						{#each engagements as engagement}
							<a
								href={`/admin/delivery-os?engagement=${engagement.id}`}
								class:selected={selectedEngagement?.id === engagement.id}
								class="engagement-link"
							>
								<div class="row">
									<strong>{engagement.name}</strong>
									<span class={`tone ${statusTone(engagement.status)}`}>{formatLabel(engagement.status)}</span>
								</div>
								<div class="muted">{engagement.summary}</div>
							</a>
						{/each}
					</div>
				</section>

				<section class="panel compact">
					<div class="panel-header">
						<h2>Commercials</h2>
					</div>
					{#if commercial}
						<div class="stack">
							<div class="row between">
								<span>Build fee</span>
								<strong>{formatMoney(commercial.buildFee)}</strong>
							</div>
							<div class="row between">
								<span>Management</span>
								<strong>{formatMoney(commercial.monthlyFee)}</strong>
							</div>
							<div class="row between">
								<span>Contract</span>
								<span class={`tone ${statusTone(commercial.contractStatus ?? '')}`}>
									{formatLabel(commercial.contractStatus ?? 'draft')}
								</span>
							</div>
							<div class="row between">
								<span>Invoice</span>
								<span class={`tone ${statusTone(commercial.invoiceStatus ?? '')}`}>
									{formatLabel(commercial.invoiceStatus ?? 'draft')}
								</span>
							</div>
						</div>
					{:else}
						<p class="muted">No commercial snapshot for this engagement.</p>
					{/if}
				</section>
			</aside>

			<div class="content">
				{#if selectedEngagement}
					<section class="panel overview">
						<div class="overview-head">
							<div>
								<p class="eyebrow">Selected Engagement</p>
								<h2>{selectedEngagement.name}</h2>
								<p class="muted strong">
									{selectedClient?.name}
									{#if selectedClient?.industry}
										· {selectedClient.industry}
									{/if}
								</p>
							</div>
							<div class={`status-pill ${statusTone(selectedEngagement.status)}`}>
								{formatLabel(selectedEngagement.status)}
							</div>
						</div>
						<p class="lede small">{selectedEngagement.summary}</p>
						<div class="stats-grid">
							<article class="stat-card">
								<span class="label">Components</span>
								<strong>{summary.components}</strong>
							</article>
							<article class="stat-card">
								<span class="label">Artifacts</span>
								<strong>{summary.artifacts}</strong>
							</article>
							<article class="stat-card">
								<span class="label">Open Milestones</span>
								<strong>{summary.openMilestones}</strong>
							</article>
							<article class="stat-card">
								<span class="label">Open Risks</span>
								<strong>{summary.openRisks}</strong>
							</article>
							<article class="stat-card">
								<span class="label">Access Gaps</span>
								<strong>{summary.accessNeeded}</strong>
							</article>
							<article class="stat-card">
								<span class="label">Connected Integrations</span>
								<strong>{summary.integrationsConnected}</strong>
							</article>
						</div>
					</section>

					<section class="grid-two">
						<section class="panel">
							<div class="panel-header">
								<h2>Components</h2>
							</div>
							<div class="component-groups">
								{#each componentKinds as kind}
									{#if groupedComponents[kind].length}
										<div class="component-group">
											<h3>{formatLabel(kind)}</h3>
											<div class="card-list">
												{#each groupedComponents[kind] as component}
													<article class="item-card">
														<div class="row">
															<strong>{component.name}</strong>
															<span class={`tone ${statusTone(component.status)}`}>{formatLabel(component.status)}</span>
														</div>
														<p>{component.summary}</p>
														<div class="link-row">
															{#if component.liveUrl}
																<a href={component.liveUrl} target="_blank" rel="noreferrer">Live URL</a>
															{/if}
															{#if component.repoUrl}
																<a href={component.repoUrl} target="_blank" rel="noreferrer">Repository</a>
															{/if}
														</div>
													</article>
												{/each}
											</div>
										</div>
									{/if}
								{/each}
							</div>
						</section>

						<section class="panel">
							<div class="panel-header">
								<h2>Artifacts</h2>
							</div>
							<div class="card-list">
								{#each artifacts as artifact}
									<article class="item-card">
										<div class="row">
											<strong>{artifact.title}</strong>
											<span class={`tone ${statusTone(artifact.status)}`}>{formatLabel(artifact.status)}</span>
										</div>
										<p>{artifact.summary}</p>
										<div class="row between">
											<span class="muted">{formatLabel(artifact.type)} · {formatLabel(artifact.visibility)}</span>
											{#if artifact.sourceUrl}
												<a href={artifact.sourceUrl} target="_blank" rel="noreferrer">Open</a>
											{/if}
										</div>
									</article>
								{/each}
							</div>
						</section>
					</section>

					<section class="grid-two">
						<section class="panel">
							<div class="panel-header">
								<h2>Milestones</h2>
							</div>
							<div class="card-list">
								{#each milestones as milestone}
									<article class="item-card">
										<div class="row">
											<strong>{milestone.title}</strong>
											<span class={`tone ${statusTone(milestone.status)}`}>{formatLabel(milestone.status)}</span>
										</div>
										<p>{milestone.summary}</p>
										<div class="muted">
											{#if milestone.targetDate}
												Target: {milestone.targetDate}
											{:else if milestone.completedAt}
												Completed: {milestone.completedAt}
											{:else}
												No date recorded
											{/if}
										</div>
									</article>
								{/each}
							</div>
						</section>

						<section class="panel">
							<div class="panel-header">
								<h2>Integrations</h2>
							</div>
							<div class="card-list">
								{#each integrations as integration}
									<article class="item-card">
										<div class="row">
											<strong>{integration.provider}</strong>
											<span class={`tone ${statusTone(integration.status)}`}>{formatLabel(integration.status)}</span>
										</div>
										<p>{integration.purpose}</p>
										<div class="muted">{formatLabel(integration.direction)} · {integration.notes ?? 'No note recorded'}</div>
									</article>
								{/each}
							</div>
						</section>
					</section>

					<section class="grid-two">
						<section class="panel">
							<div class="panel-header">
								<h2>Access Checklist</h2>
							</div>
							<div class="card-list">
								{#each accessItems as item}
									<article class="item-card">
										<div class="row">
											<strong>{item.system}</strong>
											<span class={`tone ${statusTone(item.status)}`}>{formatLabel(item.status)}</span>
										</div>
										<p>{item.notes ?? 'No note recorded.'}</p>
										<div class="muted">{formatLabel(item.accessType)}</div>
									</article>
								{/each}
							</div>
						</section>

						<section class="panel">
							<div class="panel-header">
								<h2>Risks</h2>
							</div>
							<div class="card-list">
								{#each risks as risk}
									<article class="item-card">
										<div class="row">
											<strong>{risk.summary}</strong>
											<span class={`tone ${statusTone(risk.severity)}`}>{formatLabel(risk.severity)}</span>
										</div>
										<div class="muted">Owner: {risk.owner ?? 'Unassigned'} · Status: {formatLabel(risk.status)}</div>
									</article>
								{/each}
							</div>
						</section>
					</section>

					<section class="panel chat-panel">
						<div class="panel-header">
							<div>
								<h2>Ask Delivery OS</h2>
								<p class="muted">Operator Q&A across structured delivery state and optional vector-backed docs.</p>
							</div>
						</div>
						{#if data.chatEnabled}
							<form
								class="chat-form"
								onsubmit={(event) => {
									event.preventDefault();
									void submitQuestion();
								}}
							>
								<textarea
									bind:value={question}
									rows="4"
									placeholder="Ask about scope, blockers, access gaps, delivery sequencing, documentation status, or what still needs to ship."
								></textarea>
								<div class="row between">
									<span class="muted">Selected engagement: {selectedEngagement.name}</span>
									<button type="submit" disabled={submitting || !question.trim()}>
										{submitting ? 'Thinking…' : 'Ask agent'}
									</button>
								</div>
							</form>
							{#if requestError}
								<div class="response error">{requestError}</div>
							{/if}
							{#if answer}
								<div class="response">{answer}</div>
							{/if}
						{:else}
							<div class="response muted-block">
								OPENAI_API_KEY is not configured for `.agency` yet, so the delivery agent is disabled in
								this environment. The workspace data is still available above.
							</div>
						{/if}
					</section>
				{:else}
					<section class="panel">
						<h2>No engagement loaded</h2>
						<p class="muted">Add seed data or select a delivery engagement to open the workspace.</p>
					</section>
				{/if}
			</div>
		</div>
	</div>
</section>

<style>
	.shell-inner {
		max-width: 1440px;
		margin: 0 auto;
		padding: 2rem 1.5rem 4rem;
	}

	.hero {
		display: flex;
		justify-content: space-between;
		gap: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.eyebrow {
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.62);
		margin: 0 0 0.35rem;
	}

	.lede {
		max-width: 76ch;
		color: rgba(255, 255, 255, 0.76);
	}

	.lede.small {
		max-width: none;
	}

	.hero-meta {
		display: grid;
		grid-template-columns: repeat(3, minmax(150px, 1fr));
		gap: 0.75rem;
		min-width: min(42rem, 44%);
	}

	.meta-card,
	.panel,
	.stat-card,
	.item-card {
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.03);
		border-radius: 20px;
	}

	.meta-card {
		padding: 1rem;
	}

	.meta-card .label,
	.stat-card .label {
		display: block;
		font-size: 0.75rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.6);
		margin-bottom: 0.35rem;
	}

	.workspace {
		display: grid;
		grid-template-columns: 320px minmax(0, 1fr);
		gap: 1rem;
	}

	.rail,
	.content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-width: 0;
	}

	.panel {
		padding: 1.15rem;
	}

	.panel.compact {
		padding-bottom: 1rem;
	}

	.panel-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.9rem;
	}

	.panel-header h2 {
		margin: 0;
	}

	.engagement-list,
	.card-list,
	.component-groups,
	.stack {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.engagement-link {
		display: block;
		padding: 0.9rem 1rem;
		border-radius: 16px;
		text-decoration: none;
		color: inherit;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid transparent;
	}

	.engagement-link.selected {
		border-color: rgba(143, 162, 255, 0.55);
		background: rgba(143, 162, 255, 0.08);
	}

	.row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.row.between {
		justify-content: space-between;
	}

	.muted {
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.92rem;
	}

	.muted.strong {
		color: rgba(255, 255, 255, 0.74);
	}

	.overview-head {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: start;
		margin-bottom: 0.8rem;
	}

	.status-pill,
	.tone {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		padding: 0.28rem 0.72rem;
		font-size: 0.78rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		border: 1px solid rgba(255, 255, 255, 0.15);
	}

	.status-pill.good,
	.tone.good {
		color: #9fe3b1;
		border-color: rgba(159, 227, 177, 0.28);
		background: rgba(159, 227, 177, 0.1);
	}

	.status-pill.warn,
	.tone.warn {
		color: #ffd086;
		border-color: rgba(255, 208, 134, 0.28);
		background: rgba(255, 208, 134, 0.1);
	}

	.status-pill.bad,
	.tone.bad {
		color: #ff9f9f;
		border-color: rgba(255, 159, 159, 0.28);
		background: rgba(255, 159, 159, 0.1);
	}

	.status-pill.muted,
	.tone.muted {
		color: rgba(255, 255, 255, 0.68);
	}

	.stats-grid,
	.grid-two {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}

	.stats-grid {
		grid-template-columns: repeat(6, minmax(0, 1fr));
		margin-top: 1rem;
	}

	.stat-card {
		padding: 1rem;
	}

	.stat-card strong {
		font-size: 1.75rem;
	}

	.component-group h3 {
		margin: 0 0 0.2rem;
		font-size: 0.95rem;
		color: rgba(255, 255, 255, 0.72);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.item-card {
		padding: 0.95rem 1rem;
	}

	.item-card p {
		margin: 0.45rem 0 0.6rem;
		color: rgba(255, 255, 255, 0.78);
	}

	.link-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.8rem;
	}

	a {
		color: #9fb4ff;
	}

	.chat-panel textarea {
		width: 100%;
		min-height: 120px;
		resize: vertical;
		padding: 0.95rem 1rem;
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(8, 10, 18, 0.75);
		color: inherit;
		font: inherit;
	}

	.chat-form {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}

	button {
		border: 0;
		border-radius: 999px;
		padding: 0.7rem 1.1rem;
		background: linear-gradient(135deg, #7b8ff6, #97a7ff);
		color: #101423;
		font-weight: 700;
		cursor: pointer;
	}

	button:disabled {
		opacity: 0.55;
		cursor: default;
	}

	.response {
		margin-top: 1rem;
		padding: 1rem 1.1rem;
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.04);
		white-space: pre-wrap;
		line-height: 1.55;
	}

	.response.error {
		color: #ffb0b0;
		border-color: rgba(255, 176, 176, 0.22);
		background: rgba(255, 120, 120, 0.08);
	}

	.response.muted-block {
		color: rgba(255, 255, 255, 0.72);
	}

	@media (max-width: 1240px) {
		.hero {
			flex-direction: column;
		}

		.hero-meta {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			min-width: 0;
		}

		.stats-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	@media (max-width: 980px) {
		.workspace,
		.grid-two,
		.stats-grid,
		.hero-meta {
			grid-template-columns: 1fr;
		}
	}
</style>

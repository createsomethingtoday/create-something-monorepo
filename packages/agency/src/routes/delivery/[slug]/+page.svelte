<script lang="ts">
	import { Button, SEO } from '@create-something/canon';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const completedMilestones = $derived.by(() => data.milestones.filter((row) => row.status === 'done'));
	const openMilestones = $derived.by(() =>
		data.milestones.filter((row) => row.status !== 'done' && row.status !== 'cancelled')
	);
	const connectedIntegrations = $derived.by(() =>
		data.integrations.filter((row) => row.status === 'connected')
	);
	const integrationsInProgress = $derived.by(() =>
		data.integrations.filter((row) => row.status === 'requested')
	);
	const liveComponents = $derived.by(() => data.components.filter((row) => row.liveUrl));
	const engagementHub = $derived.by(
		() => data.artifacts.find((row) => row.type === 'engagement_hub' && !!row.sourceUrl) ?? null
	);
	const nextMilestone = $derived.by(() => openMilestones[0] ?? null);
	const openClientNeedCount = $derived.by(() => data.clientActions.length + data.clientRisks.length);

	function formatLabel(value: string) {
		return value
			.replace(/_/g, ' ')
			.replace(/\b\w/g, (match) => match.toUpperCase());
	}

	function statusTone(status: string) {
		if (['live', 'managed', 'done', 'connected', 'approved', 'sent', 'signed', 'paid'].includes(status)) {
			return 'good';
		}
		if (['building', 'active', 'requested', 'review', 'onboarding', 'qa'].includes(status)) {
			return 'warn';
		}
		if (['blocked', 'failing', 'needed', 'overdue', 'critical'].includes(status)) {
			return 'bad';
		}
		return 'muted';
	}

	function formatMoney(value: number | null | undefined) {
		if (value == null || value <= 0) return null;
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			maximumFractionDigits: 0
		}).format(value);
	}

	const buildFee = $derived.by(() => formatMoney(data.commercial?.buildFee));
	const monthlyFee = $derived.by(() => formatMoney(data.commercial?.monthlyFee));
</script>

<SEO
	title={`${data.engagement.name} | CREATE SOMETHING`}
	description={data.engagement.summary ?? 'Client delivery page'}
	propertyName="agency"
	noindex={false}
/>

<section class="delivery-page">
	<div class="shell">
		<header class="hero">
			<div class="hero-copy">
				<p class="eyebrow">Client Delivery Hub</p>
				<h1>{data.engagement.name}</h1>
				<p class="lede">{data.engagement.summary}</p>
				<p class="hero-note">
					This page is a client-safe snapshot of what is live now, what documents are ready, and what
					still needs to happen to move the next phase forward.
				</p>
				<div class="hero-meta">
					<span>{data.client?.name}</span>
					{#if data.client?.industry}
						<span>{data.client.industry}</span>
					{/if}
					{#if data.engagement.targetLaunchDate}
						<span>Target launch {data.engagement.targetLaunchDate}</span>
					{/if}
				</div>
				<div class="hero-actions">
					{#if engagementHub?.sourceUrl}
						<Button href={engagementHub.sourceUrl}>
							Open engagement hub
						</Button>
					{/if}
					<Button variant="secondary" href="/book">Book review call</Button>
				</div>
			</div>
			<div class="hero-card">
				<div class={`status-pill ${statusTone(data.engagement.status)}`}>
					{formatLabel(data.engagement.status)}
				</div>
				<div class="stat-grid">
					<article>
						<span class="label">Components</span>
						<strong>{data.components.length}</strong>
					</article>
					<article>
						<span class="label">Live surfaces</span>
						<strong>{liveComponents.length}</strong>
					</article>
					<article>
						<span class="label">Shared docs</span>
						<strong>{data.artifacts.length}</strong>
					</article>
					<article>
						<span class="label">Milestones done</span>
						<strong>{completedMilestones.length}</strong>
					</article>
				</div>
				{#if nextMilestone}
					<div class="focus-card">
						<span class="label">Current focus</span>
						<strong>{nextMilestone.title}</strong>
						<p>{nextMilestone.summary}</p>
						{#if nextMilestone.targetDate}
							<p class="muted">Target {nextMilestone.targetDate}</p>
						{/if}
					</div>
				{/if}
				{#if buildFee || monthlyFee}
					<div class="commercials">
						{#if buildFee}
							<div class="row between"><span>Build</span><strong>{buildFee}</strong></div>
						{/if}
						{#if monthlyFee}
							<div class="row between"><span>Management</span><strong>{monthlyFee}/mo</strong></div>
						{/if}
					</div>
				{/if}
			</div>
		</header>

		<section class="grid-two">
			<section class="panel">
				<div class="panel-header">
					<h2>What we’re delivering</h2>
					<p class="panel-intro">
						The work in scope for this engagement, including what is already live and what is still
						in active buildout.
					</p>
				</div>
				<div class="card-list">
					{#each data.components as component}
						<article class="item-card">
							<div class="row between">
								<div>
									<p class="mini">{formatLabel(component.kind)}</p>
									<strong>{component.name}</strong>
								</div>
								<span class={`tone ${statusTone(component.status)}`}>{formatLabel(component.status)}</span>
							</div>
							<p>{component.summary}</p>
							{#if component.liveUrl}
								<a href={component.liveUrl} target="_blank" rel="noreferrer">Open live surface</a>
							{/if}
						</article>
					{/each}
				</div>
			</section>

			<section class="panel">
				<div class="panel-header">
					<h2>Working documents</h2>
					<p class="panel-intro">
						The current client-facing materials, approvals, and walkthrough links associated with this
						engagement.
					</p>
				</div>
				<div class="card-list">
					{#if data.artifacts.length === 0}
						<p class="muted">The shareable documents for this engagement are still being assembled.</p>
					{:else}
						{#each data.artifacts as artifact}
							<article class="item-card">
								<div class="row between">
									<strong>{artifact.title}</strong>
									<span class={`tone ${statusTone(artifact.status)}`}>{formatLabel(artifact.status)}</span>
								</div>
								<p>{artifact.summary}</p>
								<div class="row between">
									<span class="muted">{formatLabel(artifact.type)}</span>
									{#if artifact.sourceUrl}
										<a href={artifact.sourceUrl} target="_blank" rel="noreferrer">Open</a>
									{/if}
								</div>
							</article>
						{/each}
					{/if}
				</div>
			</section>
		</section>

		<section class="grid-two">
			<section class="panel">
				<div class="panel-header">
					<h2>Current timeline</h2>
					<p class="panel-intro">
						Completed milestones and the next active steps for this delivery.
					</p>
				</div>
				<div class="timeline">
					{#each data.milestones as milestone}
						<article class="timeline-item">
							<div class={`timeline-dot ${statusTone(milestone.status)}`}></div>
							<div class="timeline-copy">
								<div class="row between">
									<strong>{milestone.title}</strong>
									<span class={`tone ${statusTone(milestone.status)}`}>{formatLabel(milestone.status)}</span>
								</div>
								<p>{milestone.summary}</p>
								<p class="muted">
									{#if milestone.completedAt}
										Completed {milestone.completedAt}
									{:else if milestone.targetDate}
										Target {milestone.targetDate}
									{:else}
										No date recorded
									{/if}
								</p>
							</div>
						</article>
					{/each}
				</div>
			</section>

			<section class="panel">
				<div class="panel-header">
					<h2>Systems in scope</h2>
					<p class="panel-intro">
						The services that are already connected, plus any systems that are now being wired into the
						live delivery.
					</p>
				</div>
				<div class="card-list">
					{#each data.integrations as integration}
						<article class="item-card">
							<div class="row between">
								<strong>{integration.provider}</strong>
								<span class={`tone ${statusTone(integration.status)}`}>{formatLabel(integration.status)}</span>
							</div>
							<p>{integration.purpose}</p>
							<p class="muted">{formatLabel(integration.direction)}</p>
							{#if integration.notes}
								<p class="muted note">{integration.notes}</p>
							{/if}
						</article>
					{/each}
				</div>
				<div class="summary-bar">
					<strong>{connectedIntegrations.length}</strong>
					<span class="muted">connected now</span>
					{#if integrationsInProgress.length}
						<span class="muted">· {integrationsInProgress.length} connection{integrationsInProgress.length === 1 ? '' : 's'} in progress</span>
					{/if}
				</div>
			</section>
		</section>

		<section class="grid-two">
			<section class="panel">
				<div class="panel-header">
					<h2>What we still need from your team</h2>
					<p class="panel-intro">
						Client-owned items that still need a handoff, confirmation, or decision before the next
						phase can move faster.
					</p>
				</div>
				{#if openClientNeedCount === 0}
					<p class="muted">No client-side blockers are currently recorded for this engagement.</p>
				{:else}
					<div class="card-list">
						{#each data.clientActions as item}
							<article class="item-card">
								<div class="row between">
									<strong>{item.system}</strong>
									<span class={`tone ${statusTone(item.status)}`}>{formatLabel(item.status)}</span>
								</div>
								<p>{item.notes}</p>
							</article>
						{/each}
						{#each data.clientRisks as risk}
							<article class="item-card">
								<div class="row between">
									<strong>{risk.summary}</strong>
									<span class={`tone ${statusTone(risk.severity)}`}>{formatLabel(risk.severity)}</span>
								</div>
								<p class="muted">Owner: {risk.owner ?? 'Shared'}</p>
							</article>
						{/each}
					</div>
				{/if}
			</section>

			<section class="panel">
				<div class="panel-header">
					<h2>Immediate next steps</h2>
					<p class="panel-intro">
						The current sequence of work after today, based on the remaining open milestones.
					</p>
				</div>
				<div class="card-list">
					{#if openMilestones.length === 0}
						<p class="muted">This engagement does not currently have open delivery milestones.</p>
					{:else}
						{#each openMilestones as milestone}
							<article class="item-card">
								<div class="row between">
									<strong>{milestone.title}</strong>
									<span class={`tone ${statusTone(milestone.status)}`}>{formatLabel(milestone.status)}</span>
								</div>
								<p>{milestone.summary}</p>
								{#if milestone.targetDate}
									<p class="muted">Target {milestone.targetDate}</p>
								{/if}
							</article>
						{/each}
					{/if}
				</div>
			</section>
		</section>
	</div>
</section>

<style>
	.delivery-page {
		padding: 2rem 0 4rem;
	}

	.shell {
		max-width: 1320px;
		margin: 0 auto;
		padding: 0 1.5rem;
	}

	.hero,
	.grid-two {
		display: grid;
		grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.9fr);
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.hero-copy,
	.hero-card,
	.panel,
	.item-card {
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.03);
		border-radius: 24px;
	}

	.hero-copy,
	.hero-card,
	.panel {
		padding: 1.35rem;
	}

	.eyebrow,
	.label,
	.mini {
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.hero-copy h1 {
		margin: 0.2rem 0 0.75rem;
		font-size: clamp(2.4rem, 4vw, 4.75rem);
		line-height: 0.98;
	}

	.lede {
		max-width: 60ch;
		color: rgba(255, 255, 255, 0.78);
		font-size: 1.06rem;
	}

	.hero-meta,
	.hero-actions,
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
	}

	.hero-meta {
		margin: 1rem 0 1.2rem;
	}

	.hero-note {
		margin: 0.85rem 0 0;
		max-width: 60ch;
		color: rgba(255, 255, 255, 0.64);
	}

	.hero-meta span {
		padding: 0.45rem 0.7rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.72);
	}

	.hero-card {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.focus-card {
		padding: 0.95rem 1rem;
		border-radius: 18px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.focus-card strong {
		display: block;
		margin-top: 0.35rem;
		font-size: 1.05rem;
	}

	.focus-card p {
		margin: 0.45rem 0 0;
		color: rgba(255, 255, 255, 0.74);
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

	.good {
		color: #9fe3b1;
		border-color: rgba(159, 227, 177, 0.28);
		background: rgba(159, 227, 177, 0.1);
	}

	.warn {
		color: #ffd086;
		border-color: rgba(255, 208, 134, 0.28);
		background: rgba(255, 208, 134, 0.1);
	}

	.bad {
		color: #ffacac;
		border-color: rgba(255, 172, 172, 0.28);
		background: rgba(255, 172, 172, 0.1);
	}

	.muted {
		color: rgba(255, 255, 255, 0.62);
	}

	.stat-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.85rem;
	}

	.stat-grid article {
		padding: 0.9rem 1rem;
		border-radius: 18px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.stat-grid strong {
		display: block;
		font-size: 2rem;
		margin-top: 0.35rem;
	}

	.commercials {
		padding-top: 0.25rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.between {
		justify-content: space-between;
	}

	.panel-header {
		margin-bottom: 0.9rem;
	}

	.panel-header h2 {
		margin: 0;
	}

	.panel-intro {
		margin: 0.35rem 0 0;
		color: rgba(255, 255, 255, 0.62);
		max-width: 58ch;
	}

	.card-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.item-card {
		padding: 0.95rem 1rem;
	}

	.item-card p {
		margin: 0.45rem 0 0.55rem;
		color: rgba(255, 255, 255, 0.78);
	}

	.note {
		margin-top: 0;
		font-size: 0.95rem;
	}

	.timeline {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}

	.timeline-item {
		display: grid;
		grid-template-columns: 24px minmax(0, 1fr);
		gap: 0.85rem;
		align-items: start;
	}

	.timeline-dot {
		width: 12px;
		height: 12px;
		border-radius: 999px;
		margin-top: 0.4rem;
		border: 1px solid rgba(255, 255, 255, 0.15);
	}

	.timeline-copy {
		padding-bottom: 0.6rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.timeline-copy p {
		margin: 0.35rem 0 0;
	}

	.summary-bar {
		margin-top: 1rem;
		padding-top: 0.8rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		display: flex;
		gap: 0.6rem;
		align-items: baseline;
	}

	a {
		color: #9fb4ff;
	}

	@media (max-width: 960px) {
		.hero,
		.grid-two {
			grid-template-columns: 1fr;
		}

		.stat-grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	@media (max-width: 640px) {
		.stat-grid {
			grid-template-columns: 1fr;
		}
	}
</style>

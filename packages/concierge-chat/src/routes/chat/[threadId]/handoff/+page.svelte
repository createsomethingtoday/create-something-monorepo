<script lang="ts">
	import type { ActionData, PageData } from './$types';

	export let data: PageData;
	export let form: ActionData;

	$: canSubmitStaffOnboarding =
		data.staffOnboarding.ready && data.staffOnboarding.runtimeConfigured;
</script>

<section class="glass panel">
	<div class="section-header">
		<div>
			<div class="eyebrow">Handoff Packet</div>
			<h1 class="section-title">{data.threadView.handoffPacket.queueName}</h1>
		</div>
		<a class="link-button" href={`/chat/${data.threadView.thread.id}`}>Back to thread</a>
	</div>

	<p class="muted">{data.threadView.handoffPacket.summary}</p>
	<div class="status-line">
		<span class={`status-pill ${data.threadView.handoffPacket.tone === 'danger' ? 'warn' : 'good'}`}>
			{data.threadView.handoffPacket.statusLabel}
		</span>
	</div>

	<div class="stats">
		<div>
			<strong>{data.threadView.handoffPacket.eta}</strong>
			<div class="muted">
				{data.threadView.handoffPacket.kind === 'escalation'
					? 'Estimated review time'
					: 'Estimated queue time'}
			</div>
		</div>
		<div>
			<strong>{data.threadView.handoffPacket.profileCompletion}%</strong>
			<div class="muted">Profile completion</div>
		</div>
		<div>
			<strong>{data.threadView.handoffPacket.confirmedFieldCount}</strong>
			<div class="muted">Confirmed fields</div>
		</div>
	</div>
</section>

<section class="glass panel section-gap">
	<div class="section-header">
		<div>
			<div class="eyebrow">Staff DB Writeback</div>
			<h2 class="section-title">Nurse staff profile submission</h2>
		</div>
		<span class={`status-pill ${canSubmitStaffOnboarding ? 'good' : 'warn'}`}>
			{canSubmitStaffOnboarding ? 'ready' : 'blocked'}
		</span>
	</div>

	{#if form?.staffOnboardingResult}
		<div class={`writeback-result ${form.staffOnboardingResult.success ? 'good' : 'warn'}`}>
			{form.staffOnboardingResult.message}
		</div>
	{/if}

	{#if data.staffOnboarding.blockers.length > 0}
		<ul class="blockers">
			{#each data.staffOnboarding.blockers as blocker}
				<li>{blocker}</li>
			{/each}
		</ul>
	{/if}

	{#if data.staffOnboarding.runtimeMissing.length > 0}
		<ul class="blockers">
			{#each data.staffOnboarding.runtimeMissing as item}
				<li>{item}</li>
			{/each}
		</ul>
	{/if}

	<form method="POST" action="?/submitStaffOnboarding" class="writeback-form">
		<div class="graduation-boundary">
			<span>Paylocity graduation</span>
			<strong>Human approval required</strong>
		</div>
		<button type="submit" disabled={!canSubmitStaffOnboarding}>Save to Staff DB</button>
	</form>
</section>

<section class="split-layout section-gap">
	<div class="glass panel">
		<div class="eyebrow">{data.threadView.handoffPacket.briefLabel}</div>
		<p>{data.threadView.handoffPacket.operatorBrief}</p>

		<h2 class="section-title">Reason codes</h2>
		<div class="chips">
			{#each data.threadView.handoffPacket.reasonCodes as code}
				<span class={`chip ${data.threadView.handoffPacket.tone}`}>{code}</span>
			{/each}
		</div>

		<h2 class="section-title">{data.threadView.handoffPacket.pendingTasksLabel}</h2>
		<ul>
			{#each data.threadView.handoffPacket.pendingTasks as task}
				<li>{task}</li>
			{/each}
		</ul>
	</div>

	<div class="glass panel">
		<div class="eyebrow">{data.threadView.handoffPacket.artifactsLabel}</div>
		<div class="artifact-list">
			{#each data.threadView.handoffPacket.artifactTitles as artifact}
				<div class="artifact-row">
					<strong>{artifact}</strong>
					<span class={`status-pill ${data.threadView.handoffPacket.tone === 'danger' ? 'warn' : 'good'}`}>
						included
					</span>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.panel {
		padding: 1.2rem;
	}

	.section-gap {
		margin-top: 1rem;
	}

	.section-header,
	.artifact-row,
	.stats {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.link-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.8rem 1.2rem;
		border-radius: 999px;
		background: var(--button-bg);
		color: var(--button-ink);
		text-decoration: none;
		border: 1px solid rgba(167, 184, 255, 0.18);
	}

	.stats {
		margin-top: 1rem;
	}

	.status-line {
		margin-top: 0.75rem;
	}

	.writeback-result {
		margin: 1rem 0;
		padding: 0.75rem 0.9rem;
		border-radius: 0.75rem;
	}

	.writeback-result.good {
		background: rgba(49, 204, 143, 0.12);
		color: var(--good);
	}

	.writeback-result.warn {
		background: rgba(255, 176, 92, 0.12);
		color: var(--warning);
	}

	.blockers {
		display: grid;
		gap: 0.35rem;
		margin: 1rem 0;
		color: var(--muted);
	}

	.writeback-form {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		margin-top: 1rem;
	}

	.graduation-boundary {
		display: inline-flex;
		flex-direction: column;
		gap: 0.45rem;
		color: var(--muted);
	}

	.graduation-boundary strong {
		color: var(--text);
		font-size: 0.92rem;
	}

	.writeback-form button {
		border: 1px solid rgba(167, 184, 255, 0.26);
		border-radius: 999px;
		padding: 0.8rem 1.2rem;
		background: var(--button-bg);
		color: var(--button-ink);
		cursor: pointer;
	}

	.writeback-form button:disabled {
		cursor: not-allowed;
		opacity: 0.55;
	}

	.split-layout {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.chip {
		padding: 0.35rem 0.65rem;
		border-radius: 999px;
		font-size: 0.88rem;
	}

	.chip.danger {
		background: var(--danger-soft);
		color: var(--danger);
	}

	.chip.good {
		background: var(--good-soft);
		color: var(--good);
	}

	.artifact-list {
		display: grid;
		gap: 0.75rem;
	}

	@media (max-width: 960px) {
		.split-layout {
			grid-template-columns: 1fr;
		}
	}
</style>

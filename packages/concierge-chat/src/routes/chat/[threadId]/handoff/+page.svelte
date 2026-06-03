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
			<h1 class="section-title">{data.packet.queueName}</h1>
		</div>
		<a class="link-button" href={`/chat/${data.thread.id}`}>Back to thread</a>
	</div>

	<p class="muted">{data.packet.summary}</p>

	<div class="stats">
		<div>
			<strong>{data.packet.eta}</strong>
			<div class="muted">Estimated review time</div>
		</div>
		<div>
			<strong>{data.packet.profileCompletion}%</strong>
			<div class="muted">Profile completion</div>
		</div>
		<div>
			<strong>{data.packet.confirmedFieldCount}</strong>
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
		<label>
			<input
				type="checkbox"
				name="confirm_external_write"
				value="yes"
				disabled={!canSubmitStaffOnboarding}
			/>
			<span>Operator reviewed profile, consent, and blockers.</span>
		</label>
		<button type="submit" disabled={!canSubmitStaffOnboarding}>Submit to Staff DB</button>
	</form>
</section>

<section class="split-layout section-gap">
	<div class="glass panel">
		<div class="eyebrow">Operator Brief</div>
		<p>{data.packet.operatorBrief}</p>

		<h2 class="section-title">Reason codes</h2>
		<div class="chips">
			{#each data.packet.reasonCodes as code}
				<span class="chip">{code}</span>
			{/each}
		</div>

		<h2 class="section-title">Pending tasks</h2>
		<ul>
			{#each data.packet.pendingTasks as task}
				<li>{task}</li>
			{/each}
		</ul>
	</div>

	<div class="glass panel">
		<div class="eyebrow">Attached Artifacts</div>
		<div class="artifact-list">
			{#each data.packet.artifactTitles as artifact}
				<div class="artifact-row">
					<strong>{artifact}</strong>
					<span class="status-pill good">included</span>
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
		background: var(--ink);
		color: white;
		text-decoration: none;
	}

	.stats {
		margin-top: 1rem;
	}

	.writeback-result {
		margin: 1rem 0;
		padding: 0.75rem 0.9rem;
		border-radius: 0.75rem;
	}

	.writeback-result.good {
		background: rgba(39, 141, 99, 0.12);
		color: var(--good);
	}

	.writeback-result.warn {
		background: rgba(162, 61, 53, 0.12);
		color: var(--danger);
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

	.writeback-form label {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		color: var(--muted);
	}

	.writeback-form button {
		border: 0;
		border-radius: 999px;
		padding: 0.8rem 1.2rem;
		background: var(--ink);
		color: white;
		cursor: pointer;
	}

	.writeback-form button:disabled,
	.writeback-form input:disabled {
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
		background: rgba(162, 61, 53, 0.12);
		color: var(--danger);
		font-size: 0.88rem;
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

<script lang="ts">
	import { createConciergeThreadClient } from '$chat/client-actions';
	import type { PageData } from './$types';

	export let data: PageData;

	let creatingThread = false;
	let actionError = '';

	async function startNewThread() {
		creatingThread = true;
		actionError = '';

		try {
			await createConciergeThreadClient();
		} catch (error) {
			actionError =
				error instanceof Error ? error.message : 'Unable to start a new intake thread.';
		} finally {
			creatingThread = false;
		}
	}

	$: latestThread = data.latestThreadId
		? data.threadSummaries.find((thread) => thread.id === data.latestThreadId) ?? data.threadSummaries[0] ?? null
		: data.threadSummaries[0] ?? null;
	$: savedThreadCount = data.threadSummaries.length;
	$: trustTone = data.intakeAccess.granted ? 'good' : 'warn';
	$: trustLabel = data.intakeAccess.granted ? 'Verified in this browser' : 'Start now, verify later';
	$: trustDetail = data.intakeAccess.granted
		? 'If a document or recruiter review step appears, this browser can continue without another code.'
		: 'Begin with the role you want. If we need documents or recruiter review later, Concierge will ask for a one-time email code then.';
</script>

<section class="glass panel hero">
	<div class="section-header">
		<div>
			<div class="eyebrow">Apply</div>
			<h1 class="section-title">Start or continue your nurse application</h1>
		</div>
		<div class="actions">
			{#if latestThread}
				<a class="cta" href={`/chat/${latestThread.id}`}>Continue</a>
			{/if}
			<button class="cta secondary" type="button" on:click={startNewThread} disabled={creatingThread}>
				{creatingThread
					? 'Starting...'
					: latestThread
						? 'Start new'
						: 'Start'}
			</button>
		</div>
	</div>

	<p class="muted lede">
		Tell Concierge your specialty, shift, preferred location, and any constraints. The application
		builds as you chat, and every later confirmation stays in the same thread.
	</p>

	<div class={`trust-strip ${trustTone}`}>
		<span class={`status-pill ${trustTone}`}>{trustLabel}</span>
		<p>{trustDetail}</p>
	</div>

	{#if actionError}
		<p class="error-text">{actionError}</p>
	{/if}
</section>

{#if latestThread}
	<section class="glass panel resume-panel">
		<div class="resume-header">
			<div>
				<div class="eyebrow">Saved Application</div>
				<h2 class="section-title">{latestThread.title}</h2>
			</div>
			<span class={`status-pill ${latestThread.status === 'handoff_ready' ? 'danger' : 'warn'}`}>
				{latestThread.status.replace('_', ' ')}
			</span>
		</div>

		<p class="muted">
			{latestThread.subtitle}. Open the same conversation and Concierge will guide the next step.
		</p>

		<div class="meter" aria-hidden="true">
			<div class="fill" style={`width: ${latestThread.profileCompletion}%`}></div>
		</div>

		<div class="resume-meta">
			<span>{latestThread.profileCompletion}% complete</span>
			<span>{latestThread.pendingAction}</span>
		</div>

		{#if latestThread.badges.length > 0}
			<div class="badges">
				{#each latestThread.badges as badge}
					<span class="chip">{badge}</span>
				{/each}
			</div>
		{/if}

		{#if savedThreadCount > 1}
			<p class="muted helper">
				This browser has {savedThreadCount} saved application threads. Continue this one or start a
				new chat if you are applying for a different role.
			</p>
		{/if}
	</section>
{:else}
	<section class="glass panel next-steps">
		<div class="eyebrow">What Happens Next</div>
		<ul>
			<li>Share the role, shift, and location you want in plain language.</li>
			<li>Review or correct the details Concierge captures as you go.</li>
			<li>Verify by email only when uploads or recruiter review are ready.</li>
		</ul>
	</section>
{/if}

<style>
	.panel {
		padding: 1.3rem;
	}

	.hero,
	.resume-panel,
	.next-steps {
		display: grid;
		gap: 1rem;
	}

	.section-header,
	.resume-header,
	.resume-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.cta {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.8rem 1.2rem;
		border-radius: var(--radius-tight);
		background: var(--button-bg);
		color: var(--button-ink);
		text-decoration: none;
		border: 1px solid var(--button-bg);
		cursor: pointer;
		font: inherit;
		font-weight: var(--font-medium, 500);
		box-shadow: none;
	}

	.cta.secondary {
		background: var(--surface-overlay);
		border-color: var(--line);
		color: var(--ink);
		box-shadow: none;
	}

	.actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.lede {
		max-width: 48rem;
		font-size: var(--text-body-lg, 1.095rem);
		line-height: var(--leading-relaxed, 1.618);
	}

	.badges {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.chip {
		padding: 0.35rem 0.65rem;
		border-radius: 999px;
		background: var(--surface-overlay);
		border: 1px solid var(--line);
		font-size: 0.78rem;
		line-height: 1.2;
	}

	.helper,
	.error-text {
		margin: 0;
	}

	.error-text {
		color: var(--danger);
	}

	ul {
		margin: 0;
		padding-left: 1.1rem;
		line-height: var(--leading-relaxed, 1.618);
	}
</style>

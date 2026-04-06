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
	$: trustLabel = data.intakeAccess.granted ? 'Verified in this browser' : 'Public start, secure finish';
	$: trustDetail = data.intakeAccess.granted
		? 'This browser is already verified, so secure uploads and recruiter scheduling can continue without another code.'
		: 'Start the conversation now. One-time email verification only appears later, when documents or recruiter review are actually needed.';
</script>

<section class="glass panel hero">
	<div class="section-header">
		<div>
			<div class="eyebrow">Apply</div>
			<h1 class="section-title">Pick up your nursing application in chat</h1>
		</div>
		<div class="actions">
			{#if latestThread}
				<a class="cta" href={`/chat/${latestThread.id}`}>Continue application</a>
			{/if}
			<button class="cta secondary" type="button" on:click={startNewThread} disabled={creatingThread}>
				{creatingThread
					? 'Starting intake...'
					: latestThread
						? 'Start fresh application'
						: 'Start application'}
			</button>
		</div>
	</div>

	<p class="muted lede">
		Tell Concierge what kind of nursing role you want, where you want to work, and what schedule
		you prefer. When a document or confirmation is needed, the chat will ask for it in the same
		thread.
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
				<div class="eyebrow">Continue where you left off</div>
				<h2 class="section-title">{latestThread.title}</h2>
			</div>
			<span class={`status-pill ${latestThread.status === 'handoff_ready' ? 'danger' : 'warn'}`}>
				{latestThread.status.replace('_', ' ')}
			</span>
		</div>

		<p class="muted">
			{latestThread.subtitle}. Resume the same conversation and Concierge will guide the next step.
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
				This browser has {savedThreadCount} saved application threads. Continue the latest one here,
				or start fresh if you want a clean conversation.
			</p>
		{/if}
	</section>
{:else}
	<section class="glass panel next-steps">
		<div class="eyebrow">What happens next</div>
		<ul>
			<li>Start by chatting naturally about role, location, and shift preferences.</li>
			<li>Review or correct the details Concierge captures along the way.</li>
			<li>Verify by email only when protected uploads or recruiter review are needed.</li>
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
		border-radius: 999px;
		background: var(--button-bg);
		color: var(--button-ink);
		text-decoration: none;
		border: 1px solid rgba(167, 184, 255, 0.18);
		cursor: pointer;
		font: inherit;
		box-shadow: 0 16px 34px rgba(49, 92, 255, 0.22);
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
		font-size: 1.02rem;
	}

	.trust-strip {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		flex-wrap: wrap;
		padding: 1rem 1.05rem;
		border-radius: 18px;
		background: var(--surface-soft);
		border: 1px solid var(--line);
	}

	.trust-strip.good {
		border-color: rgba(107, 201, 152, 0.24);
	}

	.trust-strip.warn {
		border-color: rgba(255, 214, 153, 0.24);
	}

	.meter {
		height: 0.65rem;
		border-radius: 999px;
		background: var(--surface-overlay);
		overflow: hidden;
	}

	.fill {
		height: 100%;
		background: var(--accent-gradient);
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
		font-size: 0.88rem;
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
		line-height: 1.7;
	}
</style>

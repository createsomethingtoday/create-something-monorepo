<script lang="ts">
	import { createConciergeThreadClient } from '$chat/client-actions';
	import IntakeVerificationPanel from '$lib/intake/IntakeVerificationPanel.svelte';
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

	$: verificationTone = data.intakeAccess.granted
		? 'good'
		: data.intakeAccess.reason === 'missing_secret'
			? 'danger'
			: 'warn';
	$: verificationLabel = data.intakeAccess.granted
		? 'Secure verification active'
		: data.intakeAccess.reason === 'missing_secret'
			? 'Verification unavailable'
			: 'Public intake in progress';
	$: verificationDetail = data.intakeAccess.granted
		? 'Protected uploads and recruiter progression are unlocked for this browser session.'
		: data.intakeAccess.reason === 'missing_secret'
			? 'Protected intake steps are blocked until the runtime verification secret is restored.'
			: 'Conversation and profile capture are open. A one-time email verification step is still required before document upload and recruiter review.';
</script>

<section class="glass panel">
	<div class="section-header">
		<div>
			<div class="eyebrow">Thread Workspace</div>
			<h1 class="section-title">Concierge sessions</h1>
		</div>
		<div class="actions">
			{#if data.latestThreadId}
				<a class="cta" href={`/chat/${data.latestThreadId}`}>Resume latest thread</a>
			{/if}
			<button class="cta secondary" type="button" on:click={startNewThread} disabled={creatingThread}>
				{creatingThread ? 'Starting intake...' : 'Start new intake'}
			</button>
		</div>
	</div>

	<p class="muted">
		Conversation state, profile audit state, and widget choice stay on the server for the active
		browser session.
	</p>

	<div class={`verification-banner ${verificationTone}`}>
		<span class={`status-pill ${verificationTone}`}>{verificationLabel}</span>
		<p>{verificationDetail}</p>
	</div>

	{#if actionError}
		<p class="error-text">{actionError}</p>
	{/if}
</section>

{#if !data.intakeAccess.granted}
	<IntakeVerificationPanel
		accessGranted={data.intakeAccess.granted}
		verifiedEmail={data.intakeAccess.grant?.email ?? null}
		verificationSupport={data.intakeVerification}
		title="Verify your email to continue"
		description="Use a one-time email code when an application is ready for document upload or recruiter review."
	/>
{/if}

{#if data.threadSummaries.length === 0}
	<section class="glass panel empty-state">
		<div class="eyebrow">Intake Ready</div>
		<h2 class="section-title">No nurse sessions yet</h2>
		<p class="muted">
			Start a new intake when you are ready to open the first staffing conversation in this
			session.
		</p>
	</section>
{:else}
	<section class="thread-grid">
		{#each data.threadSummaries as thread}
			<a class="glass thread-card" href={`/chat/${thread.id}`}>
				<div class="thread-header">
					<div>
						<strong>{thread.title}</strong>
						<div class="muted">{thread.subtitle}</div>
					</div>
					<span class={`status-pill ${thread.status === 'handoff_ready' ? 'danger' : 'warn'}`}>
						{thread.status.replace('_', ' ')}
					</span>
				</div>

				<div class="meter" aria-hidden="true">
					<div class="fill" style={`width: ${thread.profileCompletion}%`}></div>
				</div>

				<div class="thread-footer">
					<span>{thread.profileCompletion}% complete</span>
					<span>{thread.pendingAction}</span>
				</div>

				<div class="badges">
					{#each thread.badges as badge}
						<span class="chip">{badge}</span>
					{/each}
				</div>
			</a>
		{/each}
	</section>
{/if}

<style>
	.panel {
		padding: 1.3rem;
	}

	.section-header,
	.thread-header,
	.thread-footer {
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

	.verification-banner {
		display: grid;
		gap: 0.6rem;
		margin-top: 1rem;
		padding: 1rem;
		border-radius: var(--radius);
		background: var(--surface-soft);
		border: 1px solid var(--line);
	}

	.verification-banner.good {
		border-color: var(--good-line);
	}

	.verification-banner.warn {
		border-color: var(--warn-line);
	}

	.verification-banner.danger {
		border-color: var(--danger-line);
	}

	.thread-grid {
		display: grid;
		gap: 1rem;
		margin-top: 1rem;
	}

	.empty-state {
		margin-top: 1rem;
		padding: 1.3rem;
	}

	.thread-card {
		padding: 1.15rem;
		text-decoration: none;
	}

	.meter {
		margin: 1rem 0;
	}

	.badges {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-top: 1rem;
	}

	.chip {
		padding: 0.35rem 0.65rem;
		border-radius: 999px;
		background: var(--surface-overlay);
		border: 1px solid var(--line);
		font-size: 0.88rem;
	}

	.error-text {
		margin-top: 1rem;
		color: var(--danger);
	}
</style>

<script lang="ts">
	import { createConciergeThreadClient } from '$chat/client-actions';
	import { absoluteUrl } from '$lib/site/seo';
	import type { PageData } from './$types';

	export let data: PageData;

	const pageTitle = 'Start a Nurse Application | Abundance Staffing';
	const pageDescription =
		'Start or continue a guided Abundance nurse staffing application with role, shift, location, timing, and verification handled in one thread.';
	const pagePath = '/apply';
	const pageImage = absoluteUrl('/abundance/hero-handoff.png');

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

<svelte:head>
	<link
		rel="stylesheet"
		href="https://cdn.prod.website-files.com/6975f7e617285604fcb645f7/css/healen.webflow.shared.7df6645cf.css"
	/>
	<title>{pageTitle}</title>
	<meta name="description" content={pageDescription} />
	<link rel="canonical" href={absoluteUrl(pagePath)} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Abundance Staffing" />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:url" content={absoluteUrl(pagePath)} />
	<meta property="og:image" content={pageImage} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={pageTitle} />
	<meta name="twitter:description" content={pageDescription} />
	<meta name="twitter:image" content={pageImage} />
</svelte:head>

<section class="hero-03 container-full abundance-start-hero abundance-subpage-hero">
	<div class="container-fluid">
		<div class="hero-content-03">
			<h1 class="hero-content-title display">Start with the contract you want.</h1>
			<div class="hero-content-right">
				<p class="hero-content-info-text p1-regular">
					Tell Abundance your specialty, shift, location, timing, and constraints. The application begins as a simple staffing conversation.
				</p>
				<div class="abundance-start-actions">
					{#if latestThread}
						<a class="abundance-start-primary" href={`/chat/${latestThread.id}`}>Continue application</a>
					{/if}
					<button
						class={latestThread ? 'abundance-start-secondary' : 'abundance-start-primary'}
						type="button"
						on:click={startNewThread}
						disabled={creatingThread}
					>
						{creatingThread
							? 'Starting...'
							: latestThread
								? 'Start new'
								: 'Start application'}
					</button>
				</div>
			</div>
		</div>

		<div class="abundance-start-note">
			<span class={`abundance-start-pill ${trustTone}`}>{trustLabel}</span>
			<p>{trustDetail}</p>
		</div>

		{#if actionError}
			<p class="abundance-start-error">{actionError}</p>
		{/if}
	</div>
</section>

<section class="works-02 container-full abundance-start-panel">
	<div class="container-fluid for-works">
		<div class="abundance-start-grid">
			{#if latestThread}
				<article class="abundance-start-card abundance-start-card-large">
					<div class="abundance-start-card-head">
						<span>Saved application</span>
						<span class={`abundance-start-pill ${latestThread.status === 'handoff_ready' ? 'danger' : 'warn'}`}>
							{latestThread.status.replace('_', ' ')}
						</span>
					</div>
					<h2 class="heading-03">{latestThread.title}</h2>
					<p class="p1-regular">
						{latestThread.subtitle}. Open the same conversation and Concierge will guide the next step.
					</p>
					<div class="abundance-start-meter" aria-hidden="true">
						<div style={`width: ${latestThread.profileCompletion}%`}></div>
					</div>
					<div class="abundance-start-meta">
						<span>{latestThread.profileCompletion}% complete</span>
						<span>{latestThread.pendingAction}</span>
					</div>
					{#if latestThread.badges.length > 0}
						<div class="abundance-start-badges">
							{#each latestThread.badges as badge}
								<span>{badge}</span>
							{/each}
						</div>
					{/if}
				</article>
			{:else}
				<article class="abundance-start-card abundance-start-card-large">
					<span>What happens next</span>
					<h2 class="heading-03">A guided start, without a long intake form.</h2>
					<p class="p1-regular">
						Share the role you want in plain language. Concierge organizes the details and asks for corrections as needed.
					</p>
				</article>
			{/if}

			<article class="abundance-start-card">
				<span>1</span>
				<h3 class="heading-05">Describe the role</h3>
				<p class="p2-regular">Specialty, shift, location, pay constraints, start date, and anything that would make a contract a poor fit.</p>
			</article>
			<article class="abundance-start-card">
				<span>2</span>
				<h3 class="heading-05">Confirm the profile</h3>
				<p class="p2-regular">Review the details Concierge captures before recruiter matching or staffing review.</p>
			</article>
			<article class="abundance-start-card dark">
				<span>3</span>
				<h3 class="heading-05">Verify only when needed</h3>
				<p class="p2-regular">Email verification appears only for protected uploads, consent, or recruiter review steps.</p>
			</article>
		</div>

		{#if latestThread && savedThreadCount > 1}
			<p class="abundance-start-helper">
				This browser has {savedThreadCount} saved application threads. Start a new chat only when you are applying for a different role.
			</p>
		{/if}
	</div>
</section>

<style>
	.abundance-start-hero {
		padding-bottom: clamp(60px, 7vw, 96px);
	}

	.abundance-start-actions {
		display: flex;
		align-items: center;
		gap: 14px;
		flex-wrap: wrap;
	}

	.abundance-start-primary,
	.abundance-start-secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 56px;
		padding: 0 28px;
		border-radius: 999px;
		text-decoration: none;
		font: inherit;
		font-size: 16px;
		line-height: 1;
		cursor: pointer;
	}

	.abundance-start-primary {
		background: var(--secondary, #af7c54);
		border: 1px solid var(--secondary, #af7c54);
		color: var(--white, #fff);
		box-shadow: 0 16px 36px rgba(175, 124, 84, 0.2);
	}

	.abundance-start-secondary {
		background: rgba(255, 255, 255, 0.62);
		border: 1px solid rgba(175, 124, 84, 0.22);
		color: var(--black, #020202);
	}

	.abundance-start-secondary:disabled {
		cursor: wait;
		opacity: 0.72;
	}

	.abundance-start-note {
		display: grid;
		gap: 16px;
		max-width: 820px;
		padding: 22px;
		border: 1px solid rgba(175, 124, 84, 0.2);
		border-radius: 24px;
		background: rgba(255, 255, 255, 0.54);
		box-shadow: 0 22px 60px rgba(67, 48, 33, 0.06);
	}

	.abundance-start-note p,
	.abundance-start-helper {
		margin: 0;
		color: rgba(2, 2, 2, 0.64);
	}

	.abundance-start-pill,
	.abundance-start-card > span,
	.abundance-start-card-head > span:first-child,
	.abundance-start-badges span {
		display: inline-flex;
		width: fit-content;
		padding: 9px 12px;
		border: 1px solid rgba(175, 124, 84, 0.18);
		border-radius: 999px;
		background: rgba(175, 124, 84, 0.1);
		color: var(--secondary, #af7c54);
		font-size: 12px;
		line-height: 1;
		letter-spacing: 0.09em;
		text-transform: uppercase;
	}

	.abundance-start-pill.good {
		color: #2f6948;
		border-color: rgba(47, 105, 72, 0.18);
		background: rgba(47, 105, 72, 0.1);
	}

	.abundance-start-pill.danger {
		color: #8a3b28;
		border-color: rgba(138, 59, 40, 0.18);
		background: rgba(138, 59, 40, 0.1);
	}

	.abundance-start-error {
		max-width: 820px;
		margin: 18px 0 0;
		color: #8a3b28;
	}

	.abundance-start-panel {
		padding-top: clamp(78px, 8vw, 116px);
		padding-bottom: clamp(78px, 8vw, 116px);
		background:
			radial-gradient(circle at 82% 18%, rgba(175, 124, 84, 0.12), transparent 28%),
			linear-gradient(180deg, #fbf7f1 0%, #f4e7dc 100%);
	}

	.abundance-start-grid {
		display: grid;
		grid-template-columns: 1.1fr repeat(3, minmax(0, 0.7fr));
		gap: 18px;
		align-items: stretch;
	}

	.abundance-start-card {
		display: grid;
		align-content: space-between;
		gap: 26px;
		min-height: 300px;
		padding: 28px;
		border: 1px solid rgba(175, 124, 84, 0.18);
		border-radius: 24px;
		background:
			linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(250, 245, 239, 0.74)),
			var(--sub-bg, #f6eee6);
		box-shadow: 0 22px 60px rgba(67, 48, 33, 0.08);
		color: var(--black, #020202);
	}

	.abundance-start-card.dark {
		background:
			linear-gradient(145deg, rgba(2, 2, 2, 0.9), rgba(67, 48, 33, 0.84)),
			var(--black, #020202);
		color: var(--white, #fff);
	}

	.abundance-start-card h2,
	.abundance-start-card h3,
	.abundance-start-card p {
		margin: 0;
		color: inherit;
	}

	.abundance-start-card p {
		color: rgba(2, 2, 2, 0.64);
	}

	.abundance-start-card.dark p {
		color: rgba(255, 255, 255, 0.72);
	}

	.abundance-start-card-large {
		min-height: 360px;
	}

	.abundance-start-card-head,
	.abundance-start-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		flex-wrap: wrap;
	}

	.abundance-start-meter {
		height: 10px;
		border-radius: 999px;
		background: rgba(175, 124, 84, 0.12);
		overflow: hidden;
	}

	.abundance-start-meter div {
		height: 100%;
		border-radius: inherit;
		background: var(--secondary, #af7c54);
	}

	.abundance-start-meta {
		color: rgba(2, 2, 2, 0.62);
		font-size: 14px;
	}

	.abundance-start-badges {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.abundance-start-helper {
		margin-top: 24px;
	}

	@media (max-width: 991px) {
		.abundance-start-grid {
			grid-template-columns: 1fr;
		}

		.abundance-start-card,
		.abundance-start-card-large {
			min-height: auto;
		}
	}
</style>

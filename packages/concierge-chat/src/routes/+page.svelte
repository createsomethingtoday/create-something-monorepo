<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	$: verificationTone = data.intakeAccess.granted
		? 'good'
		: data.intakeAccess.reason === 'missing_secret'
			? 'danger'
			: 'warn';
	$: verificationLabel = data.intakeAccess.granted
		? 'Verified intake active'
		: data.intakeAccess.reason === 'missing_secret'
			? 'Verification unavailable'
			: 'Public start, secure finish';
	$: verificationDetail = data.intakeAccess.granted
		? 'This browser already has secure intake verification, so document upload and recruiter progression are unlocked.'
		: data.intakeAccess.reason === 'missing_secret'
			? 'The runtime is missing its secure verification secret. Public browsing still works, but protected intake steps are unavailable until that is fixed.'
			: 'Any nurse can start an application here. A one-time email verification step is required later for document upload and recruiter review.';
</script>

<section class="hero glass panel">
	<div class="hero-copy">
		<div class="eyebrow">Public Nurse Intake</div>
		<h1 class="page-title">Start your next nursing application without a paperwork wall.</h1>
		<p class="lede">
			Abundance turns the first intake into a guided conversation. Nurses can begin from a public
			link, share role preferences and credentials progressively, and only cross a secure
			verification boundary when protected documents or staffing escalation are required.
		</p>

		<div class="hero-actions">
			<a class="link-button" href="/apply">Start application</a>
			{#if data.workspace?.latestThreadId}
				<a class="link-secondary" href={`/chat/${data.workspace.latestThreadId}`}>
					Continue application
				</a>
			{:else}
				<a class="link-secondary" href="/chat">Open workspace</a>
			{/if}
		</div>
	</div>

	<div class="hero-aside">
		<div class="hero-card">
			<span class={`status-pill ${verificationTone}`}>{verificationLabel}</span>
			<p>{verificationDetail}</p>
		</div>
		<div class="hero-card">
			<strong>What opens immediately</strong>
			<p>Conversation, profile capture, preference collection, and nurse-guided corrections.</p>
		</div>
		<div class="hero-card">
			<strong>What stays protected</strong>
			<p>Credential uploads, recruiter review, staffing submission, and downstream handoff.</p>
		</div>
	</div>
</section>

<section class="grid-3 section-gap">
	<div class="glass panel">
		<div class="eyebrow">1. Start Publicly</div>
		<h2 class="section-title">Open from any campaign</h2>
		<p class="muted">
			Marketing links can send nurses straight to `/apply` with no recruiter-issued token required
			up front.
		</p>
	</div>

	<div class="glass panel">
		<div class="eyebrow">2. Build the Profile</div>
		<h2 class="section-title">Progressive intake</h2>
		<p class="muted">
			The chat collects licenses, specialties, shift preference, availability, and corrections as a
			conversation instead of a rigid form.
		</p>
	</div>

	<div class="glass panel">
		<div class="eyebrow">3. Verify Securely</div>
		<h2 class="section-title">Trust escalates later</h2>
		<p class="muted">
			Protected steps stay behind secure verification so sensitive uploads and staffing actions do
			not run on anonymous traffic.
		</p>
	</div>
</section>

<section class="glass panel section-gap">
	<div class="section-header">
		<div>
			<div class="eyebrow">Candidate Journey</div>
			<h2 class="section-title">What nurses experience</h2>
		</div>
		<a class="inline-link" href="/apply">Enter the intake workspace</a>
	</div>

	<div class="journey-grid">
		<div class="journey-card">
			<strong>Discover</strong>
			<p>Visit from ads, email, referral links, or a recruiter share.</p>
		</div>
		<div class="journey-card">
			<strong>Apply</strong>
			<p>Start the conversation, clarify profile fields, and capture preferences.</p>
		</div>
		<div class="journey-card">
			<strong>Verify</strong>
			<p>Request a one-time email code when it is time to upload protected documents or move to recruiter review.</p>
		</div>
		<div class="journey-card">
			<strong>Advance</strong>
			<p>Once verified and entitled, Abundance can move the thread into staffing and onboarding.</p>
		</div>
	</div>
</section>

<style>
	.panel {
		padding: 1.35rem;
	}

	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1.55fr) minmax(280px, 0.9fr);
		gap: 1rem;
		padding: 1.8rem;
	}

	.hero-copy,
	.hero-aside,
	.hero-card,
	.journey-card {
		display: grid;
		gap: 0.75rem;
	}

	.hero-aside {
		align-content: start;
	}

	.hero-card,
	.journey-card {
		padding: 1rem;
		border-radius: 18px;
		background: var(--surface-soft);
		border: 1px solid var(--line);
	}

	.hero-card p,
	.journey-card p {
		margin: 0;
		color: var(--muted);
	}

	.lede {
		max-width: 46rem;
		font-size: 1.08rem;
		color: var(--muted);
	}

	.hero-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-top: 1.1rem;
	}

	.link-button,
	.link-secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.8rem 1.2rem;
		border-radius: 999px;
		text-decoration: none;
		border: none;
		cursor: pointer;
		font: inherit;
	}

	.link-button {
		background: var(--button-bg);
		color: var(--button-ink);
		border: 1px solid rgba(167, 184, 255, 0.18);
		box-shadow: 0 16px 34px rgba(49, 92, 255, 0.22);
	}

	.link-secondary {
		background: var(--surface-overlay);
		color: var(--ink);
		border: 1px solid var(--line);
	}

	.section-gap {
		margin-top: 1rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.journey-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.9rem;
		margin-top: 1rem;
	}

	@media (max-width: 900px) {
		.hero,
		.journey-grid {
			grid-template-columns: 1fr;
		}
	}
</style>

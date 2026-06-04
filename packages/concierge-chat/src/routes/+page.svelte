<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	$: verificationTone = data.intakeAccess.granted ? 'good' : 'warn';
	$: verificationLabel = data.intakeAccess.granted
		? 'Already verified in this browser'
		: 'Public start, secure finish';
	$: verificationDetail = data.intakeAccess.granted
		? 'This browser can continue secure steps without another code if your conversation reaches uploads or recruiter review.'
		: 'Any nurse can start here. One-time email verification only appears later, when documents or recruiter review are actually needed.';
</script>

<section class="hero glass panel">
	<div class="hero-layout">
		<div class="hero-copy">
			<div class="eyebrow">Public Nurse Intake</div>
			<h1 class="page-title">Start your next nursing application in chat, not behind a paperwork wall.</h1>
			<p class="lede">
				Abundance starts intake as a guided conversation. Nurses can arrive from a public link, share
				role preferences naturally, and only verify later when protected uploads or recruiter review are
				actually needed.
			</p>

			<div class="hero-actions">
				<a class="link-button" href="/apply">Start application</a>
				{#if data.workspace?.latestThreadId}
					<a class="link-secondary" href={`/chat/${data.workspace.latestThreadId}`}>
						Continue application
					</a>
				{/if}
			</div>
		</div>

		<div class="hero-preview">
			<div class="hero-preview-header">
				<div class="eyebrow">How It Starts</div>
				<div class="hero-preview-note">Guided intake in one thread</div>
			</div>

			<div class="hero-bubble nurse">
				<span class="hero-bubble-label">Nurse</span>
				<p>I’m an ICU traveler looking for nights in Dallas.</p>
			</div>

			<div class="hero-bubble concierge">
				<span class="hero-bubble-label">Concierge</span>
				<p>Perfect. I’ll capture specialty, shift, and location here in chat.</p>
			</div>

			<div class="hero-bubble concierge subdued">
				<span class="hero-bubble-label">Next</span>
				<p>When protected uploads are needed, I’ll ask for one-time email verification.</p>
			</div>
		</div>
	</div>

	<div class={`trust-strip ${verificationTone}`}>
		<span class={`status-pill ${verificationTone}`}>{verificationLabel}</span>
		<p>{verificationDetail}</p>
	</div>
</section>

<section class="grid-3 section-gap">
	<div class="glass panel">
		<div class="eyebrow">1. Start Publicly</div>
		<h2 class="section-title">Open from any campaign</h2>
		<p class="muted">
			Marketing links can send nurses straight to `/apply` with no recruiter-issued token required up front.
		</p>
	</div>

	<div class="glass panel">
		<div class="eyebrow">2. Verify Only When Needed</div>
		<h2 class="section-title">Trust escalates later</h2>
		<p class="muted">
			Protected uploads and recruiter review stay behind one-time email verification instead of blocking the first conversation.
		</p>
	</div>

	<div class="glass panel">
		<div class="eyebrow">3. Stay In One Thread</div>
		<h2 class="section-title">Conversation first</h2>
		<p class="muted">
			Intake, corrections, secure uploads, and recruiter scheduling all stay in the same Abundance experience.
		</p>
	</div>
</section>

<style>
	.panel {
		padding: 1.35rem;
	}

	.hero {
		display: grid;
		gap: 1.1rem;
		padding: 1.8rem;
		position: relative;
		overflow: hidden;
	}

	.hero::before {
		content: '';
		position: absolute;
		inset: -15% auto auto 55%;
		width: 26rem;
		height: 26rem;
		border-radius: 999px;
		background: radial-gradient(circle, rgba(108, 132, 255, 0.18) 0%, rgba(108, 132, 255, 0.04) 45%, transparent 72%);
		pointer-events: none;
	}

	.hero-layout {
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.72fr);
		gap: 1.2rem;
		align-items: stretch;
		position: relative;
		z-index: 1;
	}

	.hero-copy {
		display: grid;
		gap: 1rem;
		align-content: start;
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

	.hero-preview {
		display: grid;
		gap: 0.8rem;
		padding: 1.05rem;
		border-radius: 22px;
		background:
			linear-gradient(180deg, rgba(22, 29, 45, 0.92) 0%, rgba(11, 15, 24, 0.96) 100%);
		border: 1px solid rgba(167, 184, 255, 0.16);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
		position: relative;
		z-index: 1;
	}

	.hero-preview-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.hero-preview-note {
		color: var(--muted);
		font-size: 0.88rem;
	}

	.hero-bubble {
		display: grid;
		gap: 0.35rem;
		padding: 0.95rem 1rem;
		border-radius: 18px;
		border: 1px solid var(--line);
		background: rgba(13, 18, 29, 0.9);
		max-width: 100%;
	}

	.hero-bubble.nurse {
		margin-left: auto;
		background: rgba(167, 184, 255, 0.09);
		border-color: rgba(167, 184, 255, 0.22);
	}

	.hero-bubble.concierge {
		background: rgba(15, 20, 32, 0.96);
	}

	.hero-bubble.subdued {
		background: rgba(11, 16, 26, 0.88);
		border-style: dashed;
	}

	.hero-bubble-label {
		color: var(--muted-strong);
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.hero-bubble p {
		margin: 0;
		color: var(--ink-soft);
		line-height: 1.5;
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

	.trust-strip.danger {
		border-color: rgba(255, 150, 144, 0.24);
	}

	.trust-strip p {
		margin: 0;
		color: var(--muted);
		max-width: 56rem;
	}

	.section-gap {
		margin-top: 1rem;
	}

	.grid-3 {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.9rem;
	}

	@media (max-width: 900px) {
		.hero-layout,
		.grid-3 {
			grid-template-columns: 1fr;
		}

		.hero::before {
			inset: -18% auto auto 40%;
			width: 20rem;
			height: 20rem;
		}
	}
</style>

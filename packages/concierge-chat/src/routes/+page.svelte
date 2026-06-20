<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	$: verificationTone = data.intakeAccess.granted ? 'good' : 'warn';
	$: showStaffSurface = data.agencyAccess.status === 'allowed';
	$: verificationLabel = data.intakeAccess.granted
		? 'Already verified in this browser'
		: 'No account needed to start';
	$: verificationDetail = data.intakeAccess.granted
		? 'Secure upload and recruiter review steps can continue from this browser when they appear.'
		: 'Start the conversation now. If documents or recruiter review are needed later, Concierge will ask for a one-time email code at that moment.';

	const homeSteps = [
		{
			label: '1. Start',
			title: 'Use plain language',
			copy: 'Share the role, schedule, and location you want. No long intake form is required up front.'
		},
		{
			label: '2. Build',
			title: 'Review what is captured',
			copy: 'Concierge keeps a running profile and asks you to confirm or correct details before matching.'
		},
		{
			label: '3. Finish',
			title: 'Verify only when needed',
			copy: 'When uploads or recruiter review are ready, the secure step appears in the same thread.'
		}
	];
</script>

<section class="hero glass panel">
	<div class="hero-layout">
		<div class="hero-copy">
			<div class="eyebrow">Public Nurse Intake</div>
			<h1 class="page-title">Tell Concierge what role you want. We will build the application with you.</h1>
			<p class="lede">
				Start with specialty, shift, location, and anything that matters for your next contract.
				Concierge keeps the details organized and asks for verification only when it is actually
				time to upload documents or schedule recruiter review.
			</p>

			<div class="hero-actions">
				<a class="link-button" href="/apply">Start an application</a>
				{#if data.workspace?.latestThreadId}
					<a class="link-secondary" href={`/chat/${data.workspace.latestThreadId}`}>
						Continue where I left off
					</a>
				{/if}
			</div>
		</div>

		<div class="hero-preview">
			<div class="hero-preview-header">
				<div class="eyebrow">How It Starts</div>
				<div class="hero-preview-note">One guided chat</div>
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
				<p>When a resume, license, or review step is ready, I’ll ask for the right item here.</p>
			</div>
		</div>
	</div>

	<div class={`trust-strip ${verificationTone}`}>
		<span class={`status-pill ${verificationTone}`}>{verificationLabel}</span>
		<p>{verificationDetail}</p>
	</div>
</section>

{#if showStaffSurface}
	<section class="glass panel operator-shell section-gap">
		<div class="section-header">
			<div>
				<div class="eyebrow">Staff Workspace</div>
				<h2 class="section-title">Clear controls for governed agent work</h2>
			</div>
			<span class="status-pill good">Server-side agent runtime</span>
		</div>

		<p class="muted shell-copy">
			{data.operatorMode.promise} The staff surface keeps state, actions, evidence, and
			approvals in CREATE SOMETHING language.
		</p>

		<div class="state-strip" aria-label="Operator states">
			{#each data.operatorStateDefinitions as state}
				<div class={`state-cell ${state.tone}`}>
					<strong>{state.label}</strong>
					<span>{state.summary}</span>
				</div>
			{/each}
		</div>

		<div class="plane-grid">
			{#each data.operatorShellPlanes as plane}
				<article class="plane-card">
					<div>
						<div class="eyebrow">{plane.owner}</div>
						<h3>{plane.label}</h3>
					</div>
					<p>{plane.purpose}</p>
					<div class="signal-list">
						{#each plane.requiredSignals as signal}
							<span>{signal}</span>
						{/each}
					</div>
				</article>
			{/each}
		</div>
	</section>
{/if}

<section class="grid-3 section-gap">
	{#each homeSteps as step}
		<article class="glass panel step-card">
			<div class="eyebrow">{step.label}</div>
			<h2 class="section-title">{step.title}</h2>
			<p class="muted">{step.copy}</p>
		</article>
	{/each}
</section>

<style>
	.panel {
		padding: 1.35rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.hero {
		display: grid;
		gap: 1.1rem;
		padding: 1.8rem;
		position: relative;
		overflow: hidden;
	}

	.hero-layout {
		display: grid;
		grid-template-columns: minmax(0, 1.08fr) minmax(280px, 0.78fr);
		gap: 1.2rem;
		align-items: start;
	}

	.hero-copy {
		display: grid;
		gap: 1rem;
		align-content: start;
	}

	.lede {
		max-width: 46rem;
		font-size: var(--text-body-lg, 1.095rem);
		line-height: var(--leading-relaxed, 1.618);
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
		min-height: 2.75rem;
		padding: 0.65rem 1rem;
		border-radius: var(--radius-tight);
		text-decoration: none;
		border: none;
		cursor: pointer;
		font: inherit;
		font-weight: var(--font-medium, 500);
	}

	.link-button {
		background: var(--button-bg);
		color: var(--button-ink);
		border: 1px solid var(--button-bg);
		box-shadow: none;
	}

	.link-secondary {
		background: var(--surface-overlay);
		color: var(--ink);
		border: 1px solid var(--line);
	}

	.hero-preview {
		display: grid;
		gap: 0.72rem;
		align-content: start;
		padding: 1rem;
		border-radius: var(--radius);
		background: var(--surface-soft);
		border: 1px solid var(--line);
		box-shadow: none;
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
		font-size: var(--text-body-sm, 0.913rem);
		line-height: var(--leading-normal, 1.5);
	}

	.hero-bubble {
		display: grid;
		gap: 0.45rem;
		width: min(92%, 23rem);
		padding: 0.8rem 0.9rem;
		border-radius: var(--radius);
		border: 1px solid var(--line);
		background: var(--surface);
	}

	.hero-bubble.nurse {
		width: min(88%, 22rem);
		margin-left: auto;
		background: var(--surface);
		border-color: var(--line);
	}

	.hero-bubble.concierge {
		background: var(--surface);
	}

	.hero-bubble.subdued {
		background: var(--surface);
		border-style: dashed;
	}

	.hero-bubble-label {
		justify-self: start;
		width: max-content;
		color: var(--muted-strong);
		font-family: var(--font-mono);
		font-size: 0.68rem;
		line-height: 1;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.hero-bubble p {
		margin: 0;
		color: var(--ink-soft);
		line-height: var(--leading-normal, 1.5);
	}

	.operator-shell {
		display: grid;
		gap: 1rem;
	}

	.shell-copy {
		max-width: 62rem;
	}

	.state-strip,
	.plane-grid {
		display: grid;
		gap: 0.85rem;
	}

	.state-strip {
		grid-template-columns: repeat(6, minmax(0, 1fr));
	}

	.state-cell,
	.plane-card {
		border: 1px solid var(--line);
		border-radius: var(--radius-tight);
		background: var(--surface-strong);
	}

	.state-cell {
		display: grid;
		gap: 0.35rem;
		min-height: 7rem;
		padding: 0.8rem;
	}

	.state-cell span,
	.plane-card p {
		color: var(--muted);
		line-height: var(--leading-normal, 1.5);
	}

	.state-cell.good {
		border-color: var(--good-line);
	}

	.state-cell.warn {
		border-color: var(--warn-line);
	}

	.state-cell.danger {
		border-color: var(--danger-line);
	}

	.plane-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.plane-card {
		display: grid;
		gap: 0.8rem;
		padding: 1rem;
	}

	.plane-card h3 {
		margin: 0.45rem 0 0;
		font-size: var(--text-h4, 1.095rem);
		font-weight: var(--font-medium, 500);
		line-height: var(--leading-snug, 1.375);
	}

	.signal-list {
		display: flex;
		gap: 0.45rem;
		flex-wrap: wrap;
	}

	.signal-list span {
		border: 1px solid var(--line);
		border-radius: var(--radius-tight);
		padding: 0.32rem 0.45rem;
		background: var(--surface-overlay);
		font-size: 0.78rem;
		line-height: 1.2;
	}

	.section-gap {
		margin-top: 1rem;
	}

	.grid-3 {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.9rem;
	}

	.step-card {
		display: grid;
		gap: 0.85rem;
		align-content: start;
		min-height: 13rem;
		padding: 1.15rem;
		background: var(--surface);
		border-color: var(--line);
		box-shadow: none;
	}

	.step-card .section-title {
		max-width: 13rem;
		font-size: clamp(1.35rem, 1.2vw + 1rem, 1.85rem);
		line-height: var(--leading-tight, 1.25);
	}

	.step-card p {
		margin: 0;
		max-width: 21rem;
		line-height: var(--leading-relaxed, 1.618);
	}

	@media (max-width: 900px) {
		.hero-layout,
		.state-strip,
		.plane-grid,
		.grid-3 {
			grid-template-columns: 1fr;
		}
	}
</style>

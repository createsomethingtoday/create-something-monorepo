<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	interface Message {
		sender: 'nurse' | 'system';
		content: string;
	}

	interface Stage {
		label: string;
		title: string;
		messages: Message[];
		confirmed: string[];
		pending: string[];
		status: string;
		note: string;
	}

	const stages: Stage[] = [
		{
			label: 'Open',
			title: 'Normal message first',
			messages: [
				{
					sender: 'nurse',
					content:
						"I am an ICU nurse in Austin looking for a 13-week travel contract in April. Nights are best."
				}
			],
			confirmed: ['ICU', 'Austin', '13 weeks', 'April start', 'Nights'],
			pending: ['Radius', 'Compact license', 'Resume', 'Consent'],
			status: 'Draft profile started',
			note: 'The system becomes useful before it asks for a long form.'
		},
		{
			label: 'Draft',
			title: 'System reflects back what it heard',
			messages: [
				{
					sender: 'nurse',
					content:
						"I am an ICU nurse in Austin looking for a 13-week travel contract in April. Nights are best."
				},
				{
					sender: 'system',
					content:
						'I have ICU, Austin, April start, 13 weeks, and night shift preference. Is that right so far?'
				}
			],
			confirmed: ['ICU', 'Austin', '13 weeks', 'April start', 'Nights'],
			pending: ['Radius', 'Compact license', 'Resume', 'Consent'],
			status: 'Facts separated from unknowns',
			note: 'The profile is visible early, so corrections happen before downstream work.'
		},
		{
			label: 'Missing',
			title: 'Only the missing pieces are requested',
			messages: [
				{
					sender: 'nurse',
					content:
						"I am an ICU nurse in Austin looking for a 13-week travel contract in April. Nights are best."
				},
				{
					sender: 'system',
					content:
						'Great. What radius should I use, do you hold a compact license, and can I send a secure resume upload link?'
				},
				{
					sender: 'nurse',
					content: 'Fifty miles. Yes on compact. Send the upload link.'
				}
			],
			confirmed: ['ICU', 'Austin', '13 weeks', 'April start', 'Nights', '50-mile radius', 'Compact license'],
			pending: ['Resume upload', 'Consent'],
			status: 'Question count stays low',
			note: 'The product move is not asking less. It is asking later, and only when needed.'
		},
		{
			label: 'Ready',
			title: 'The record is match-ready',
			messages: [
				{
					sender: 'nurse',
					content:
						"I am an ICU nurse in Austin looking for a 13-week travel contract in April. Nights are best."
				},
				{
					sender: 'system',
					content:
						'Profile is ready for shortlist generation once resume and consent are attached. Missing items stay visible.'
				}
			],
			confirmed: [
				'ICU',
				'Austin',
				'13 weeks',
				'April start',
				'Nights',
				'50-mile radius',
				'Compact license'
			],
			pending: ['Resume attached', 'Consent recorded'],
			status: 'Ready for shortlist',
			note: 'Structured second. The conversation becomes a working profile with explicit remaining proof.'
		}
	];

	let currentStage = $state(0);
	let prefersReducedMotion = $state(false);
	let intervalId: ReturnType<typeof setInterval> | null = null;

	const activeStage = $derived(stages[currentStage]);

	function goToStage(index: number) {
		currentStage = index;
	}

	function startCycle() {
		if (prefersReducedMotion || intervalId) return;
		intervalId = setInterval(() => {
			currentStage = (currentStage + 1) % stages.length;
		}, 2800);
	}

	function stopCycle() {
		if (!intervalId) return;
		clearInterval(intervalId);
		intervalId = null;
	}

	onMount(() => {
		if (browser) {
			prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		}

		startCycle();

		return () => stopCycle();
	});
</script>

<div
	class="intake-visual"
	role="group"
	aria-label="Visual walkthrough of the intake experience"
	onmouseenter={stopCycle}
	onmouseleave={startCycle}
>
	<div class="stage-tabs" role="tablist" aria-label="Intake stages">
		{#each stages as stage, index}
			<button
				class="stage-tab"
				class:active={index === currentStage}
				role="tab"
				aria-selected={index === currentStage}
				onclick={() => goToStage(index)}
			>
				<span class="tab-label">{stage.label}</span>
				<span class="tab-title">{stage.title}</span>
			</button>
		{/each}
	</div>

	<div class="experience-grid">
		<section class="phone-shell">
			<div class="phone-header">
				<span class="header-dot"></span>
				<p>Text intake</p>
			</div>

			<div class="message-list" role="list">
				{#each activeStage.messages as message}
					<div class="bubble-row" class:system={message.sender === 'system'} role="listitem">
						<div class="bubble" class:system={message.sender === 'system'}>
							{message.content}
						</div>
					</div>
				{/each}
			</div>
		</section>

		<section class="profile-card">
			<div class="profile-header">
				<div>
					<p class="eyebrow">Working profile</p>
					<h3>{activeStage.status}</h3>
				</div>
				<span class="status-badge">{activeStage.label}</span>
			</div>

			<div class="fact-group">
				<p class="group-label">Confirmed now</p>
				<div class="chip-grid">
					{#each activeStage.confirmed as item}
						<span class="chip confirmed">{item}</span>
					{/each}
				</div>
			</div>

			<div class="fact-group">
				<p class="group-label">Still needed</p>
				<div class="chip-grid">
					{#each activeStage.pending as item}
						<span class="chip pending">{item}</span>
					{/each}
				</div>
			</div>

			<p class="note">{activeStage.note}</p>
		</section>
	</div>
</div>

<style>
	.intake-visual {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-md);
	}

	.stage-tabs {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: var(--space-performance-sm);
		width: 100%;
	}

	.stage-tab {
		padding: var(--space-performance-sm) var(--space-performance-md);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-performance-scale-md);
		background: var(--color-performance-bg-surface);
		text-align: left;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		transition:
			transform var(--duration-performance-micro) var(--ease-performance-standard),
			border-color var(--duration-performance-micro) var(--ease-performance-standard),
			background var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.stage-tab.active {
		border-color: rgba(37, 99, 235, 0.35);
		background: rgba(37, 99, 235, 0.08);
		transform: translateY(-1px);
	}

	.tab-label {
		font-size: var(--text-performance-caption);
		letter-spacing: var(--tracking-performance-widest);
		text-transform: uppercase;
		color: var(--color-performance-fg-muted);
	}

	.tab-title {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
		line-height: 1.35;
	}

	.experience-grid {
		width: 100%;
		display: grid;
		grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
		gap: var(--space-performance-lg);
		align-items: stretch;
	}

	.phone-shell,
	.profile-card {
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-performance-scale-lg);
		background: var(--color-performance-bg-surface);
	}

	.phone-shell {
		padding: var(--space-performance-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-md);
	}

	.phone-header {
		display: flex;
		align-items: center;
		gap: var(--space-performance-xs);
		padding-bottom: var(--space-performance-sm);
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.phone-header p {
		margin: 0;
		font-size: var(--text-performance-caption);
		letter-spacing: var(--tracking-performance-widest);
		text-transform: uppercase;
		color: var(--color-performance-fg-muted);
	}

	.header-dot {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 999px;
		background: #2563eb;
		box-shadow: 0 0 0 0.35rem rgba(37, 99, 235, 0.12);
	}

	.message-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-sm);
		min-height: 16rem;
		justify-content: center;
	}

	.bubble-row {
		display: flex;
		justify-content: flex-start;
	}

	.bubble-row.system {
		justify-content: flex-end;
	}

	.bubble {
		max-width: 85%;
		padding: var(--space-performance-sm) var(--space-performance-md);
		border-radius: 1rem 1rem 1rem 0.35rem;
		background: rgba(15, 23, 42, 0.08);
		color: var(--color-performance-fg-secondary);
		font-size: var(--text-performance-body-sm);
		line-height: 1.55;
	}

	.bubble.system {
		border-radius: 1rem 1rem 0.35rem 1rem;
		background: rgba(37, 99, 235, 0.1);
		color: var(--color-performance-fg-primary);
	}

	.profile-card {
		padding: var(--space-performance-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-md);
	}

	.profile-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-performance-md);
	}

	.eyebrow,
	.group-label {
		margin: 0;
		font-size: var(--text-performance-caption);
		letter-spacing: var(--tracking-performance-widest);
		text-transform: uppercase;
		color: var(--color-performance-fg-muted);
	}

	.profile-header h3 {
		margin: 0.35rem 0 0;
		font-size: var(--text-performance-h3);
		color: var(--color-performance-fg-primary);
	}

	.status-badge {
		padding: 0.35rem 0.65rem;
		border-radius: 999px;
		background: rgba(16, 185, 129, 0.1);
		color: #047857;
		font-size: var(--text-performance-caption);
		font-family: var(--font-performance-mono);
	}

	.fact-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-sm);
	}

	.chip-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
	}

	.chip {
		padding: 0.4rem 0.65rem;
		border-radius: 999px;
		font-size: var(--text-performance-caption);
		border: 1px solid transparent;
	}

	.chip.confirmed {
		background: rgba(16, 185, 129, 0.08);
		border-color: rgba(16, 185, 129, 0.18);
		color: #047857;
	}

	.chip.pending {
		background: rgba(245, 158, 11, 0.1);
		border-color: rgba(245, 158, 11, 0.18);
		color: #b45309;
	}

	.note {
		margin: 0;
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
		line-height: var(--leading-performance-relaxed);
	}

	@media (prefers-reduced-motion: reduce) {
		.stage-tab {
			transition: none;
		}
	}

	@media (max-width: 768px) {
		.stage-tabs,
		.experience-grid {
			grid-template-columns: 1fr;
		}

		.message-list {
			min-height: auto;
		}

		.profile-header {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>

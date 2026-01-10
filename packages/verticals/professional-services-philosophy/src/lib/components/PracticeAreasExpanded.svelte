<script lang="ts">
	/**
	 * Practice Areas Expanded
	 *
	 * Rudolf's expandable services → Canon-compliant disclosure.
	 * Motion serves disclosure (reveals details), NOT decoration.
	 *
	 * Motion: --duration-standard (300ms)
	 * Accessibility: Keyboard accessible, aria-expanded
	 * Styling: Canon tokens (--color-bg-surface, --radius-lg)
	 */

	import { slide } from 'svelte/transition';

	export interface PracticeArea {
		title: string;
		summary: string;
		details: string;
	}

	interface Props {
		areas?: PracticeArea[];
		headline?: string;
	}

	let {
		headline = 'Practice Areas',
		areas = [
			{
				title: 'AI-Native Development',
				summary: 'Claude Code for component generation. Human review for architecture.',
				details:
					'Bounded tasks. Quality gates. Partnership at every decision point. Tools recede; outcomes remain. Production in hours, not weeks.'
			},
			{
				title: 'System Architecture',
				summary: 'Domain-driven design. Event-sourced patterns. Edge-first thinking.',
				details:
					'Design for scale. Optimize for clarity. Build systems that serve dwelling, not enframing. Architecture emerges from domain understanding.'
			},
			{
				title: 'Process Automation',
				summary: 'Workflow orchestration. Integration patterns. Data pipelines.',
				details:
					'WORKWAY SDK for composable workflows. Cloudflare Workers for edge compute. Tools that recede into transparent use. 155 scripts → 13.'
			},
			{
				title: 'Technical Advisory',
				summary: 'Architecture review. Technology selection. Team capability building.',
				details:
					'Strategic guidance grounded in production experience. Philosophy-driven practice. Partnership, not delegation. 32 completed projects since 2018.'
			}
		]
	}: Props = $props();

	let expandedAreas = $state<Set<string>>(new Set());

	function toggle(title: string) {
		const newExpanded = new Set(expandedAreas);
		if (newExpanded.has(title)) {
			newExpanded.delete(title);
		} else {
			newExpanded.add(title);
		}
		expandedAreas = newExpanded;
	}

	function isExpanded(title: string): boolean {
		return expandedAreas.has(title);
	}
</script>

<section class="practice-areas">
	<div class="practice-areas-container">
		<div class="section-header">
			<h2 class="section-title">{headline}</h2>
		</div>

		<div class="areas-grid">
			{#each areas as area}
				<div class="practice-area-card">
					<button
						class="area-header"
						onclick={() => toggle(area.title)}
						aria-expanded={isExpanded(area.title)}
					>
						<div class="area-header-content">
							<h3 class="area-title">{area.title}</h3>
							<p class="area-summary">{area.summary}</p>
						</div>
						<span class="area-icon" aria-hidden="true">
							{isExpanded(area.title) ? '↑' : '↓'}
						</span>
					</button>

					{#if isExpanded(area.title)}
						<div class="area-details" transition:slide={{ duration: 300 }}>
							<p class="area-details-text">{area.details}</p>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	/*
	 * Practice Areas Layout
	 * Purposeful disclosure. Motion serves understanding, not decoration.
	 */

	.practice-areas {
		padding: var(--space-3xl) 0;
		background: var(--color-bg-pure);
	}

	.practice-areas-container {
		max-width: 90rem;
		margin: 0 auto;
		padding: 0 var(--space-md);
	}

	.section-header {
		margin-bottom: var(--space-2xl);
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: 600;
		line-height: 1.2;
		color: var(--color-fg-primary);
	}

	/*
	 * Areas Grid
	 */

	.areas-grid {
		display: grid;
		gap: var(--space-md);
	}

	.practice-area-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.practice-area-card:hover {
		border-color: var(--color-border-emphasis);
	}

	/*
	 * Area Header (Clickable Button)
	 */

	.area-header {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
		padding: var(--space-lg);
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
		transition: background-color var(--duration-micro) var(--ease-standard);
	}

	.area-header:hover {
		background-color: var(--color-hover);
	}

	.area-header:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: -2px;
	}

	.area-header-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.area-title {
		font-size: var(--text-h3);
		font-weight: 600;
		line-height: 1.3;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.area-summary {
		font-size: var(--text-body);
		font-weight: 400;
		line-height: 1.5;
		color: var(--color-fg-tertiary);
		margin: 0;
	}

	.area-icon {
		font-size: var(--text-h3);
		color: var(--color-fg-muted);
		transition: transform var(--duration-micro) var(--ease-standard);
		flex-shrink: 0;
	}

	.area-header[aria-expanded='true'] .area-icon {
		transform: rotate(180deg);
	}

	/*
	 * Area Details (Revealed Content)
	 */

	.area-details {
		padding: 0 var(--space-lg) var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	.area-details-text {
		font-size: var(--text-body);
		font-weight: 400;
		line-height: 1.6;
		color: var(--color-fg-secondary);
		margin: var(--space-md) 0 0;
	}

	/*
	 * Reduced Motion Support
	 */

	@media (prefers-reduced-motion: reduce) {
		.area-header,
		.practice-area-card,
		.area-icon {
			transition: none;
		}
	}
</style>

<script lang="ts">
	// The Stack Showcase Section
	// Live proof of concept with AI-powered personalization
	import { onMount } from 'svelte';
	import Widget from '../../../embed/Widget.svelte';
	import AdminInsightsPreview from './AdminInsightsPreview.svelte';

	let isLoading = true;
	let memberEmail: string | undefined = undefined;
	let showPersonalization = false;
	let activeView: 'member' | 'admin' = 'member';

	function revealPersonalization() {
		memberEmail = 'sarah.demo@clearway.test';
		showPersonalization = true;
	}

	function setView(view: 'member' | 'admin') {
		activeView = view;
		if (view === 'member' && !showPersonalization) {
			// Reset to show the reveal button
			memberEmail = undefined;
		}
	}

	onMount(() => {
		const timer = setTimeout(() => {
			isLoading = false;
		}, 800);
		return () => clearTimeout(timer);
	});
</script>

<section id="showcase" class="showcase">
	<div class="container">
		<h2 class="section-title">Intelligence That Recedes</h2>
		<p class="section-subtitle">
			For members: preferences remembered. For admins: insights surfaced.
		</p>

		<div class="view-toggle">
			<button
				class="toggle-btn"
				class:active={activeView === 'member'}
				onclick={() => setView('member')}
			>
				Member View
			</button>
			<button
				class="toggle-btn"
				class:active={activeView === 'admin'}
				onclick={() => setView('admin')}
			>
				Admin View
			</button>
		</div>

		{#if activeView === 'member'}
			<div class="embed-container">
				{#if isLoading}
					<div class="skeleton-widget">
						<div class="skeleton-header">
							<div class="skeleton-title"></div>
							<div class="skeleton-subtitle"></div>
						</div>
						<div class="skeleton-grid">
							{#each Array(6) as _}
								<div class="skeleton-slot"></div>
							{/each}
						</div>
					</div>
				{/if}
				<div class="widget-wrapper" class:loading={isLoading}>
					{#key memberEmail}
						<Widget facilitySlug="thestack" theme="dark" {memberEmail} />
					{/key}
				</div>
			</div>

			<div class="personalization-prompt">
				{#if !showPersonalization}
					<p class="prompt-text">
						Sarah books Tuesdays and Thursdays at noon on Grandview Court 1.
					</p>
					<button class="reveal-btn" onclick={revealPersonalization}>
						Show Sarah's View
					</button>
				{:else}
					<p class="prompt-text revealed">
						Her preferred slots are already highlighted. No search. No filters. Just there.
					</p>
				{/if}
			</div>
		{:else}
			<div class="admin-container">
				<AdminInsightsPreview />
			</div>
		{/if}
	</div>
</section>

<style>
	.showcase {
		padding: var(--space-2xl) var(--space-md);
		background: var(--color-bg-pure);
	}

	.container {
		max-width: 56rem;
		margin: 0 auto;
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: 600;
		text-align: center;
		margin: 0 0 var(--space-sm);
		color: var(--color-fg-primary);
	}

	.section-subtitle {
		font-size: var(--text-body-lg);
		text-align: center;
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-lg);
	}

	.view-toggle {
		display: flex;
		justify-content: center;
		gap: var(--space-xs);
		margin-bottom: var(--space-lg);
	}

	.toggle-btn {
		padding: var(--space-xs) var(--space-md);
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-tertiary);
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.toggle-btn:hover {
		color: var(--color-fg-secondary);
		border-color: var(--color-border-emphasis);
	}

	.toggle-btn.active {
		color: var(--color-fg-primary);
		background: var(--color-bg-surface);
		border-color: var(--color-border-emphasis);
	}

	.admin-container {
		max-width: 32rem;
		margin: 0 auto;
	}

	/* Skeleton loader (Canon: --duration-slow = 700ms for transitions) */
	.skeleton-widget {
		position: absolute;
		inset: 0;
		padding: var(--space-lg);
		border-radius: var(--radius-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
	}

	.skeleton-header {
		margin-bottom: var(--space-lg);
	}

	.skeleton-title {
		height: 1.5rem;
		width: 40%;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
		margin-bottom: var(--space-xs);
		animation: shimmer 1.5s infinite;
	}

	.skeleton-subtitle {
		height: 1rem;
		width: 60%;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
		animation: shimmer 1.5s infinite 0.1s;
	}

	.skeleton-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-sm);
	}

	.skeleton-slot {
		height: 4rem;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
		animation: shimmer 1.5s infinite;
	}

	.skeleton-slot:nth-child(2) { animation-delay: 0.1s; }
	.skeleton-slot:nth-child(3) { animation-delay: 0.2s; }
	.skeleton-slot:nth-child(4) { animation-delay: 0.3s; }
	.skeleton-slot:nth-child(5) { animation-delay: 0.4s; }
	.skeleton-slot:nth-child(6) { animation-delay: 0.5s; }

	@keyframes shimmer {
		0%, 100% { opacity: 0.4; }
		50% { opacity: 0.7; }
	}

	.embed-container {
		position: relative;
		min-height: 320px;
		margin-bottom: var(--space-lg);
	}

	.widget-wrapper {
		transition: opacity var(--duration-slow, 700ms) var(--ease-decelerate, cubic-bezier(0.0, 0.0, 0.2, 1));
	}

	.widget-wrapper.loading {
		opacity: 0;
	}

	.personalization-prompt {
		text-align: center;
		padding: var(--space-md);
	}

	.prompt-text {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-sm);
	}

	.prompt-text.revealed {
		color: var(--color-fg-tertiary);
		font-style: italic;
	}

	.reveal-btn {
		padding: var(--space-xs) var(--space-md);
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-primary);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.reveal-btn:hover {
		background: var(--color-hover);
		border-color: var(--color-border-strong);
	}

	@media (prefers-reduced-motion: reduce) {
		.skeleton-title,
		.skeleton-subtitle,
		.skeleton-slot {
			animation: none;
		}
		.widget-wrapper,
		.reveal-btn {
			transition: none;
		}
		.widget-wrapper.loading {
			opacity: 1;
		}
	}
</style>

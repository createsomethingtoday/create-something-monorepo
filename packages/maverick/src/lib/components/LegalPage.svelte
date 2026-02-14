<script lang="ts">
	/**
	 * LegalPage - Shared layout for Privacy Policy and Terms of Service
	 */

	import { inview } from '$lib/actions/inview';

	interface Props {
		title: string;
		lastUpdated: string;
		children: import('svelte').Snippet;
	}

	let { title, lastUpdated, children }: Props = $props();

	let visible = $state(false);
</script>

<div
	use:inview={{ onInView: () => (visible = true) }}
>
	<!-- Hero Section -->
	<section class="hero-section">
		<div class="container relative z-10 flex items-center min-h-[30vh] py-32 lg:py-24 md:py-20">
			<div class="max-w-3xl">
				<h1
					class="text-h1 mb-4 scroll-reveal"
					class:scroll-reveal-hidden={!visible}
				>
					{title}
				</h1>
				<p
					class="text-paragraph scroll-reveal stagger-1"
					class:scroll-reveal-hidden={!visible}
					style="color: var(--color-fg-muted)"
				>
					Last updated: {lastUpdated}
				</p>
			</div>
		</div>
	</section>

	<!-- Content -->
	<section class="section-lg content-section">
		<div class="container">
			<div class="content-wrapper">
				<div
					class="scroll-reveal"
					class:scroll-reveal-hidden={!visible}
				>
					{@render children()}
				</div>
			</div>
		</div>
	</section>
</div>

<style>
	.hero-section {
		position: relative;
		min-height: 30vh;
		background: linear-gradient(180deg, #0a0a0a 0%, #000000 100%);
	}

	.hero-section h1 {
		color: var(--color-fg-primary);
	}

	.content-section {
		background: #000000;
	}

	.content-wrapper {
		max-width: 48rem;
	}

	.content-wrapper :global(h2) {
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-top: 2.5rem;
		margin-bottom: 1rem;
	}

	.content-wrapper :global(h2:first-child) {
		margin-top: 0;
	}

	.content-wrapper :global(p) {
		font-size: 1rem;
		line-height: 1.7;
		color: var(--color-fg-secondary);
		margin-bottom: 1rem;
	}

	.content-wrapper :global(ul) {
		margin-bottom: 1rem;
		padding-left: 1.5rem;
	}

	.content-wrapper :global(li) {
		font-size: 1rem;
		line-height: 1.7;
		color: var(--color-fg-secondary);
		margin-bottom: 0.5rem;
	}

	.content-wrapper :global(strong) {
		color: var(--color-fg-primary);
	}
</style>

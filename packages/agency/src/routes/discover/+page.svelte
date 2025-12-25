<script lang="ts">
	import SEO from '$lib/components/SEO.svelte';
	import AssessmentRuntime from '$lib/components/AssessmentRuntime.svelte';
</script>

<SEO
	title="Discover Your Path"
	description="Three questions to find the right entry point. We'll recommend products for quick wins or consulting for deeper transformation."
	keywords="AI readiness, business assessment, subtractive design, automation assessment"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<!-- Discovery Path -->
<main class="discover-page">
	<div class="discover-container">
		<header class="discover-header">
			<h1 class="discover-title">What's accumulating?</h1>
			<p class="discover-subtitle">
				Three questions. One recommendation. Whether you need a quick tool or deeper partnership,
				we'll find the right entry point.
			</p>
		</header>

		<div class="assessment-wrapper">
			<AssessmentRuntime />
		</div>
	</div>
</main>

<style>
	.discover-page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-xl);
	}

	.discover-container {
		width: 100%;
		max-width: 960px;
	}

	.discover-header {
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.discover-title {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		line-height: var(--leading-tight);
		margin-bottom: var(--space-sm);
	}

	.discover-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
		max-width: 48ch;
		margin: 0 auto;
	}

	.assessment-wrapper {
		width: 100%;
	}

	@media (max-width: 768px) {
		.discover-page {
			padding: var(--space-lg);
		}

		.discover-title {
			font-size: var(--text-h1);
		}
	}
</style>

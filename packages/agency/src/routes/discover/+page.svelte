<script lang="ts">
	import { SEO } from '@create-something/components';
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
			<p class="discover-subtitle">
				Three questions. One recommendation.
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
		margin-bottom: var(--space-md);
	}

	.discover-subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-muted);
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.assessment-wrapper {
		width: 100%;
	}

	@media (max-width: 768px) {
		.discover-page {
			padding: var(--space-lg);
		}
	}
</style>

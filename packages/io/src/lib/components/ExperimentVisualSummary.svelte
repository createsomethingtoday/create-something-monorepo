<script lang="ts">
	import { ArtifactVisualSummary } from '@create-something/canon/domains/io';
	import type { ArtifactVisualSummary as ArtifactVisualSummaryData } from '@create-something/canon/types';

	interface Props {
		visual?: ArtifactVisualSummaryData | null;
	}

	let { visual }: Props = $props();
</script>

{#if visual}
	<div class="experiment-visual-summary">
		<ArtifactVisualSummary {visual} />
	</div>
{/if}

<style>
	.experiment-visual-summary {
		margin: 1.5rem 0 2.5rem;
	}
</style>

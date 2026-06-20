<script lang="ts">
	import { ResearchArtifactPage } from '@create-something/canon/domains/io';
	import type { Paper } from '@create-something/canon/types';
	import { getNextPaper } from '@create-something/canon/utils';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const paper = $derived(data.paper as unknown as Paper);
	const relatedPapers = $derived((data.relatedPapers as Paper[]) || []);
	const fullUrl = $derived(`https://createsomething.io/papers/${paper.slug}`);
	const nextPaper = $derived(getNextPaper([paper, ...relatedPapers], paper.slug));
</script>

<ResearchArtifactPage
	{paper}
	{relatedPapers}
	{fullUrl}
	{nextPaper}
	kind="paper"
/>

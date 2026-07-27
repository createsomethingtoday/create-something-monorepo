<script lang="ts">
	import type { Paper } from '@create-something/canon/types';
	import { getNextPaper } from '@create-something/canon/utils';
	import PaperArtifactPage from '$lib/components/papers/PaperArtifactPage.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const paper = $derived(data.paper as unknown as Paper);
	const relatedPapers = $derived((data.relatedPapers as Paper[]) || []);
	const fullUrl = $derived(`https://createsomething.io/papers/${paper.slug}`);
	const nextPaper = $derived(getNextPaper([paper, ...relatedPapers], paper.slug));
</script>

<PaperArtifactPage
	{paper}
	{relatedPapers}
	{fullUrl}
	{nextPaper}
/>

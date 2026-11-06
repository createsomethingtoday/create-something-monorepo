<script lang="ts">
	import { page } from '$app/stores';
	import { ResearchArtifactPage } from '@create-something/canon/domains/io';
	import type { Paper } from '@create-something/canon/types';
	import { experimentGuides } from '$lib/config/experimentSharpness';
	import {
		clearExperimentCompletion,
		getNextPaper,
		isExperimentCompleted,
		markExperimentCompleted,
		validateCompletionToken
	} from '@create-something/canon/utils';
	import type { PageData } from './$types';

	type ExperimentPaper = Paper & {
		is_file_based?: boolean;
		tests_principles?: string[];
		route?: string;
	};

	let { data }: { data: PageData } = $props();

	const paper = $derived(data.paper as ExperimentPaper);
	const relatedPapers = $derived((data.relatedPapers as Paper[]) || []);
	const fullUrl = $derived(`https://createsomething.io/experiments/${paper.slug}`);
	const nextPaper = $derived(getNextPaper([paper, ...relatedPapers], paper.slug));

	let isCompleted = $state(false);

	function handleReset() {
		clearExperimentCompletion(paper.slug);
		isCompleted = false;
	}

	$effect(() => {
		const currentSlug = paper.slug;

		if (typeof window !== 'undefined' && (window as any).trackEvent) {
			(window as any).trackEvent('experiment_view', {
				experiment_id: paper.id,
				path: `/experiments/${currentSlug}`
			});
		}

		if (validateCompletionToken($page.url)) {
			markExperimentCompleted(currentSlug);

			void import('canvas-confetti').then(({ default: confetti }) => {
				confetti({
					particleCount: 100,
					spread: 70,
					origin: { y: 0.6 }
				});
			});

			const newUrl = new URL($page.url);
			newUrl.searchParams.delete('completed');
			window.history.replaceState({}, '', newUrl);

			isCompleted = true;
		} else {
			isCompleted = isExperimentCompleted(currentSlug);
		}
	});
</script>

<ResearchArtifactPage
	{paper}
	{relatedPapers}
	{fullUrl}
	{nextPaper}
	{isCompleted}
	onReset={handleReset}
	kind="experiment"
	sharpenExperiment={experimentGuides['experiments/[slug]']}
	progressiveRecord
	progressiveActions
/>

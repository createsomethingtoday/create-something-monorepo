<script lang="ts">
	/**
	 * Cumulative State Anti-Pattern - Full Screen Insight
	 *
	 * Shareable, screenshottable insight visual.
	 * Click to animate, export to PNG, share on social.
	 */

	import { KeyInsight, createInsight, createBugFixComparison, parseStatement } from '@create-something/components';

	const insight = createInsight(
		'cumulative-state-antipattern',
		'Name fields for their semantics, not their content.',
		{
			statement: parseStatement(
				'"Templates **Published**" implied **cumulative.** It meant **current.** **Name** **fields** **for** **their** **semantics.**'
			),
			comparison: createBugFixComparison(
				'published >= 5',
				'Penalizes curation',
				'published + delisted >= 5',
				'Preserves achievement'
			),
			source: {
				title: 'The Cumulative State Anti-Pattern',
				url: '/papers/cumulative-state-antipattern',
				property: 'io'
			},
			paperId: 'PAPER-2025-012',
			category: 'Database Design'
		}
	);
</script>

<svelte:head>
	<title>Key Insight: Cumulative State Anti-Pattern | CREATE SOMETHING</title>
	<meta name="description" content="Name fields for their semantics, not their content. When 'published' means current state, not cumulative achievement." />
	<meta property="og:title" content="Key Insight: Name Fields for Semantics" />
	<meta property="og:description" content="'Templates Published' implied cumulative. It meant current." />
	<meta property="og:type" content="article" />
</svelte:head>

<KeyInsight
	{insight}
	property="io"
	animation={{ enabled: true, trigger: 'click' }}
	showExport={true}
	variant="fullscreen"
/>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		overflow-x: hidden;
	}
</style>

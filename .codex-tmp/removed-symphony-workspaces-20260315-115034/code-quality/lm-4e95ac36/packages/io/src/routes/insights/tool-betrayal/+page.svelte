<script lang="ts">
	/**
	 * Tool Betrayal - Full Screen Insight
	 *
	 * Dual-reading erasure: the full statement tells a story,
	 * the subtraction reveals a principle. Interleaved structure
	 * weaves context and essence together.
	 */

	import { KeyInsight, createInsight, parseStatement } from '@create-something/canon';

	const insight = createInsight(
		'tool-betrayal',
		'Tools should enable, not entrap.',
		{
			statement: parseStatement(
				'**Tools** that are built to assist **should** have one purpose: to **enable,** never to punish, **not** to obstruct, never to **entrap.**'
			),
			source: {
				title: 'The Cumulative State Anti-Pattern',
				url: '/papers/cumulative-state-antipattern',
				property: 'io'
			},
			paperId: 'PAPER-2025-012',
			category: 'Design Philosophy'
		}
	);
</script>

<svelte:head>
	<title>Key Insight: Tool Betrayal | CREATE SOMETHING</title>
	<meta name="description" content="Tools should enable, not entrap. When systems punish users for correct actions, they betray their purpose." />
	<meta property="og:title" content="Key Insight: Tools Should Enable, Not Entrap" />
	<meta property="og:description" content="A system that punishes correct actions has failed its purpose." />
	<meta property="og:type" content="article" />
</svelte:head>

<KeyInsight
	{insight}
	property="io"
	animation={{ enabled: true, trigger: 'click' }}
	variant="fullscreen"
/>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		overflow-x: hidden;
	}
</style>

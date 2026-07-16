<script lang="ts">
	import { AtlasStoryCanvas } from '@create-something/canon/atlas';
	import type { PublicAtlasCanvas } from '@create-something/canon/atlas/headless';
	import { createPublicAtlasCanvasFromStarter } from '$lib/atlas/public';

	export let canvas: PublicAtlasCanvas | undefined = undefined;
	export let starterId = 'marketplace-review-queue';
	export let storyId: string | undefined = undefined;
	export let surfaceLabel = 'Map';
	export let eyebrow = 'Map story canvas';
	export let title: string | undefined = undefined;
	export let description =
		'The same Map graph can teach the workflow to a person and preserve the typed contract an agent needs to act safely.';
	export let compact = false;

	$: sourceCanvas = canvas ?? createPublicAtlasCanvasFromStarter(starterId);
</script>

<AtlasStoryCanvas
	canvas={sourceCanvas}
	{starterId}
	{storyId}
	{surfaceLabel}
	{eyebrow}
	{title}
	{description}
	{compact}
/>

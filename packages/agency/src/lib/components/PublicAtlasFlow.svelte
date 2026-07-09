<script lang="ts">
	import { AtlasFlow } from '@create-something/canon/atlas';
	import type { PublicAtlasCanvas } from '@create-something/canon/atlas/headless';

	export let canvas: PublicAtlasCanvas;
	export let selectedNodeId: string;
	export let flowId = 'public-atlas-flow';
	export let onMoveNode: (nodeId: string, position: { x: number; y: number }) => void;
	export let onSelectNode: (nodeId: string) => void;
	export let readOnly = false;
	export let showControls = true;
	export let initialViewport = { x: 0, y: 0, zoom: 1 };
	export let minZoom = 0.7;
	export let maxZoom = 1.45;
</script>

<AtlasFlow
	{canvas}
	{selectedNodeId}
	{flowId}
	{onMoveNode}
	{onSelectNode}
	{readOnly}
	{showControls}
	{initialViewport}
	{minZoom}
	{maxZoom}
/>

<script lang="ts">
	import { AtlasFlow } from '@create-something/canon/atlas';
	import type { PublicAtlasCanvas } from '@create-something/canon/atlas/headless';

	export let canvas: PublicAtlasCanvas;
	export let selectedNodeId: string;
	export let flowId = 'public-atlas-flow';
	export let onMoveNode: (nodeId: string, position: { x: number; y: number }) => void;
	export let onSelectNode: (nodeId: string) => void;
	export let focusedNodeIds: string[] = [];
	export let focusedEdgeIds: string[] = [];
	export let dimUnfocused = false;
</script>

<AtlasFlow
	{canvas}
	{selectedNodeId}
	{flowId}
	ariaLabel="Workflow map"
	{onMoveNode}
	{onSelectNode}
	{focusedNodeIds}
	{focusedEdgeIds}
	{dimUnfocused}
/>

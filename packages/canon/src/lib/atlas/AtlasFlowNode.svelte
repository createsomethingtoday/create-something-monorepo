<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';
	import type { PublicAtlasNodeKind, PublicAtlasNodeStatus } from './headless.js';

	type AtlasFlowNodeData = {
		kind: PublicAtlasNodeKind;
		kindLabel: string;
		label: string;
		owner: string;
		notes: string;
		status: PublicAtlasNodeStatus;
		statusLabel: string;
		focusState: 'focused' | 'dimmed' | 'neutral';
	};

	export let data: AtlasFlowNodeData;
	export let selected = false;
</script>

<div
	class={`public-atlas-flow-node kind-${data.kind} status-${data.status}`}
	class:selected
	class:focused={data.focusState === 'focused'}
	class:dimmed={data.focusState === 'dimmed'}
	data-focus-state={data.focusState}
	aria-label={`${data.label}. ${data.kindLabel}. ${data.statusLabel}. ${data.notes}`}
>
	<Handle type="target" position={Position.Left} class="public-atlas-flow-handle" />
	<Handle type="source" position={Position.Right} class="public-atlas-flow-handle" />
	<header>
		<span class="kind">{data.kindLabel}</span>
		<span class="status">{data.statusLabel}</span>
	</header>
	<strong>{data.label}</strong>
	<span class="owner">{data.owner}</span>
	<small>{data.notes}</small>
</div>

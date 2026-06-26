<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';
	import type { PublicAtlasNode, PublicAtlasNodeKind, PublicAtlasNodeStatus } from '$lib/atlas/public';

	type PublicAtlasNodeData = {
		node: PublicAtlasNode;
	};

	export let data: PublicAtlasNodeData;
	export let selected = false;

	const KIND_LABELS: Record<PublicAtlasNodeKind, string> = {
		actor: 'Actor',
		ai: 'AI task',
		constraint: 'Constraint',
		data: 'Data',
		human: 'Human',
		system: 'System',
		touchpoint: 'Touchpoint'
	};

	const STATUS_LABELS: Record<PublicAtlasNodeStatus, string> = {
		run: 'Run',
		stop: 'Stop',
		unknown: 'Unknown',
		wait: 'Wait'
	};

	$: node = data.node;
	$: owner = node.owner || node.createdBy;
	$: notes = node.notes || 'Describe the boundary, handoff, evidence, or next decision.';
</script>

<article
	class={`public-atlas-flow-node kind-${node.kind} status-${node.status} ${selected ? 'selected' : ''}`}
>
	<Handle class="target" position={Position.Left} type="target" />
	<Handle class="source" position={Position.Right} type="source" />
	<header>
		<span class="kind">{KIND_LABELS[node.kind]}</span>
		<span class="status">{STATUS_LABELS[node.status]}</span>
	</header>
	<strong>{node.label}</strong>
	<span class="owner">{owner}</span>
	<small>{notes}</small>
</article>

<script lang="ts">
	import { SEO } from '@create-something/canon';
	let { data } = $props();
</script>

<SEO title={`${data.map.title} | Shared Map`} description="A read-only approved workflow map." propertyName="agency" noindex={true} />

<main>
	<header><p>Read-only approved Map</p><h1>{data.map.title}</h1><span>Version {data.version.version}</span></header>
	<section class="summary">
		<div><strong>{data.version.canvas.nodes.length}</strong><span>Nodes</span></div>
		<div><strong>{data.version.canvas.edges.length}</strong><span>Handoffs</span></div>
		<div><strong>{data.map.reviewState}</strong><span>Review state</span></div>
	</section>
	<section>
		<h2>Workflow nodes</h2>
		<ul>{#each data.version.canvas.nodes as node}<li><span>{node.kind}</span><strong>{node.label}</strong><small>{node.status}</small></li>{/each}</ul>
	</section>
	<footer>Shared {new Date(data.sharedAt).toLocaleString()}{data.expiresAt ? ` · Expires ${new Date(data.expiresAt).toLocaleString()}` : ''}</footer>
</main>

<style>
	main { max-width: 960px; margin: 0 auto; padding: 7rem 1.5rem 5rem; color: #f5f5f5; }
	header { border-bottom: 1px solid #27272a; padding-bottom: 2rem; }
	header p { color: #86efac; text-transform: uppercase; letter-spacing: .12em; font-size: .7rem; }
	h1 { margin: .5rem 0; font-size: clamp(2.5rem, 7vw, 5rem); letter-spacing: -.06em; }
	header span, footer { color: #71717a; }
	.summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 2rem 0; }
	.summary div { display: grid; gap: .25rem; padding: 1.2rem; border: 1px solid #27272a; border-radius: .75rem; }
	.summary strong { font-size: 1.5rem; } .summary span { color: #a1a1aa; font-size: .8rem; text-transform: capitalize; }
	h2 { font-size: 1rem; margin: 2rem 0 1rem; }
	ul { list-style: none; padding: 0; display: grid; gap: .5rem; }
	li { display: grid; grid-template-columns: 100px 1fr auto; gap: 1rem; padding: 1rem; border-top: 1px solid #27272a; align-items: baseline; }
	li span, li small { color: #71717a; text-transform: capitalize; }
	footer { margin-top: 3rem; font-size: .75rem; }
	@media (max-width: 600px) { .summary { grid-template-columns: 1fr; } li { grid-template-columns: 1fr auto; } li span { grid-column: 1 / -1; } }
</style>

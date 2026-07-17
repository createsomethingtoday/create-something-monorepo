<script lang="ts">
	import { SEO } from '@create-something/canon';
	let { data } = $props();
</script>

<SEO title={`${data.handoff.payload.mapTitle} | Build Handoff`} description="A hosted Map-to-Build handoff receipt." propertyName="agency" noindex={true} />

<main>
	<nav><a href={`/map/workspace/${data.handoff.mapId}`}>← Back to Map</a><span>{data.handoff.status}</span></nav>
	<header><p>Map → Build handoff</p><h1>{data.handoff.payload.mapTitle}</h1><span>Approved version {data.handoff.mapVersion}</span></header>
	<section>
		<h2>Immutable handoff payload</h2>
		<pre>{JSON.stringify(data.handoff.payload, null, 2)}</pre>
	</section>
</main>

<style>
	main { max-width: 1040px; margin: 0 auto; padding: 7rem 1.5rem 5rem; color: #f5f5f5; }
	nav { display: flex; justify-content: space-between; padding-bottom: 1rem; border-bottom: 1px solid #27272a; font-size: .8rem; } nav a { color: #d4d4d8; } nav span { color: #86efac; text-transform: capitalize; }
	header { padding: 2.5rem 0; } header p { color: #a1a1aa; text-transform: uppercase; letter-spacing: .1em; font-size: .75rem; } h1 { margin: .5rem 0; font-size: clamp(2.5rem, 7vw, 5rem); letter-spacing: -.06em; } header span { color: #86efac; }
	section { border: 1px solid #27272a; border-radius: .8rem; padding: 1.25rem; background: #0c0c0d; } h2 { font-size: 1rem; }
	pre { overflow: auto; max-height: 70vh; padding: 1rem; background: #09090b; border-radius: .5rem; color: #d4d4d8; font-size: .75rem; line-height: 1.55; }
</style>

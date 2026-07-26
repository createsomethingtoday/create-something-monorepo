<script lang="ts">
	import { SEO } from '@create-something/canon';
	let { data, form } = $props();
</script>

<SEO title={`${data.handoff.payload.mapTitle} | Build Handoff`} description="A hosted Map-to-Build handoff receipt." propertyName="agency" noindex={true} />

<main>
	<nav><a href={`/map/workspace/${data.handoff.mapId}`}>← Back to Map</a><span>{data.handoff.status}</span></nav>
	<header><p>Map → Build handoff</p><h1>{data.handoff.payload.mapTitle}</h1><span>Approved version {data.handoff.mapVersion}</span></header>
	<section>
		<h2>Immutable handoff payload</h2>
		<pre>{JSON.stringify(data.handoff.payload, null, 2)}</pre>
	</section>
	<section class="resolution">
		<h2>Build intake status</h2>
		{#if data.handoff.status === 'prepared'}
			<p>This approved Map version is prepared for Build intake. Cancelling is terminal and does not alter the Map.</p>
			<form method="POST" action="?/cancel">
				<label for="cancellation-note">Cancellation reason <span>(optional)</span></label>
				<input id="cancellation-note" name="note" maxlength="240" />
				<button type="submit">Cancel Build handoff</button>
			</form>
		{:else}
			<dl>
				<dt>Status</dt><dd>{data.handoff.status}</dd>
				<dt>Resolved at</dt><dd>{data.handoff.resolvedAt}</dd>
				<dt>Resolved by</dt><dd>{data.handoff.resolvedBy}</dd>
				<dt>Note</dt><dd>{data.handoff.resolutionNote ?? 'No note recorded'}</dd>
			</dl>
		{/if}
		{#if form?.message}<p class:success={form.success} class="message">{form.message}</p>{/if}
	</section>
</main>

<style>
	main { max-width: 1040px; margin: 0 auto; padding: 7rem 1.5rem 5rem; color: #f5f5f5; }
	nav { display: flex; justify-content: space-between; padding-bottom: 1rem; border-bottom: 1px solid #27272a; font-size: .8rem; } nav a { color: #d4d4d8; } nav span { color: #86efac; text-transform: capitalize; }
	header { padding: 2.5rem 0; } header p { color: #a1a1aa; text-transform: uppercase; letter-spacing: .1em; font-size: .75rem; } h1 { margin: .5rem 0; font-size: clamp(2.5rem, 7vw, 5rem); letter-spacing: -.06em; } header span { color: #86efac; }
	section { border: 1px solid #27272a; border-radius: .8rem; padding: 1.25rem; background: #0c0c0d; } section + section { margin-top: 1rem; } h2 { font-size: 1rem; }
	pre { overflow: auto; max-height: 70vh; padding: 1rem; background: #09090b; border-radius: .5rem; color: #d4d4d8; font-size: .75rem; line-height: 1.55; }
	.resolution p, label span, dt { color: #a1a1aa; } form { display: grid; gap: .65rem; max-width: 32rem; } label { font-size: .8rem; } input { border: 1px solid #3f3f46; border-radius: .45rem; background: #09090b; color: #f5f5f5; padding: .7rem; } button { width: fit-content; border: 1px solid #ef4444; border-radius: .45rem; background: transparent; color: #fca5a5; padding: .65rem .85rem; cursor: pointer; } dl { display: grid; grid-template-columns: auto 1fr; gap: .5rem 1rem; } dd { margin: 0; } .message { margin-top: 1rem; color: #fca5a5; } .message.success { color: #86efac; }
</style>

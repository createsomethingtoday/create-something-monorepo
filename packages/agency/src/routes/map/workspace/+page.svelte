<script lang="ts">
	import { SEO } from '@create-something/canon';

	let { data, form } = $props();
</script>

<SEO
	title="Map Workspace | CREATE SOMETHING AGENCY"
	description="Create and manage durable, account-scoped workflow maps."
	propertyName="agency"
	noindex={true}
/>

<main class="workspace-shell">
	<header>
		<div>
			<p class="eyebrow">Authenticated workspace</p>
			<h1>Your Maps</h1>
			<p class="lede">Durable workflow maps with version history, review gates, sharing, export, and Build handoff.</p>
		</div>
		<a class="public-link" href="/map">Open the public canvas</a>
	</header>

	<section class="create-card" aria-labelledby="create-map-title">
		<div>
			<h2 id="create-map-title">Create a map</h2>
			<p>Start clean, or explicitly import a public canvas JSON draft. Public browser state is never adopted automatically.</p>
		</div>
		<form method="POST" action="?/create">
			<label>
				<span>Map title</span>
				<input name="title" required maxlength="120" placeholder="Lead routing control map" />
			</label>
			<label>
				<span>Optional canvas JSON</span>
				<textarea name="canvas" rows="5" placeholder="Paste an exported public canvas to import it"></textarea>
			</label>
			{#if form?.message}<p class="error" role="alert">{form.message}</p>{/if}
			<button type="submit">Create durable map</button>
		</form>
	</section>

	<section aria-labelledby="saved-maps-title">
		<div class="section-heading">
			<h2 id="saved-maps-title">Saved Maps</h2>
			<span>{data.maps.length} in this workspace</span>
		</div>
		{#if data.maps.length === 0}
			<p class="empty">No durable maps yet. Create one above; your public drafts remain separate.</p>
		{:else}
			<div class="map-grid">
				{#each data.maps as map}
					<a class="map-card" href={`/map/workspace/${map.id}`}>
						<div><strong>{map.title}</strong><span>Version {map.currentVersion}</span></div>
						<p>{map.reviewState.replace('_', ' ')}</p>
						<small>Updated {new Date(map.updatedAt).toLocaleString()}</small>
					</a>
				{/each}
			</div>
		{/if}
	</section>

	{#if data.archivedMaps.length > 0}
		<section class="archive" aria-labelledby="archived-maps-title">
			<div class="section-heading"><h2 id="archived-maps-title">Archived Maps</h2><span>30-day recovery window</span></div>
			{#each data.archivedMaps as map}
				<div class="archive-row">
					<div><strong>{map.title}</strong><small>Recover by {new Date(map.retentionExpiresAt ?? map.updatedAt).toLocaleString()}</small></div>
					<form method="POST" action="?/recover"><input type="hidden" name="mapId" value={map.id} /><button>Recover</button></form>
				</div>
			{/each}
		</section>
	{/if}
</main>

<style>
	.workspace-shell { max-width: 1120px; margin: 0 auto; padding: 7rem 1.5rem 5rem; color: var(--color-performance-ink, #090909); }
	header { display: flex; justify-content: space-between; align-items: flex-end; gap: 2rem; margin-bottom: 3rem; }
	.eyebrow { margin: 0 0 .75rem; text-transform: uppercase; letter-spacing: .12em; font-size: .75rem; color: var(--color-performance-muted, #5e6268); }
	h1 { margin: 0; font-size: clamp(2.5rem, 7vw, 5.5rem); letter-spacing: -.06em; }
	.lede { max-width: 680px; margin: 1rem 0 0; color: var(--color-performance-muted, #5e6268); line-height: 1.65; }
	.public-link { color: inherit; white-space: nowrap; }
	.create-card { display: grid; grid-template-columns: minmax(0, .8fr) minmax(320px, 1.2fr); gap: 2rem; padding: 2rem; border: 1px solid var(--color-performance-ink-soft, #262626); border-radius: 1rem; background: var(--color-performance-ink, #090909); color: var(--color-performance-panel, #ffffff); margin-bottom: 3rem; }
	h2 { margin: 0 0 .6rem; }
	.create-card p { color: #a1a1aa; line-height: 1.6; }
	.empty { color: var(--color-performance-muted, #5e6268); line-height: 1.6; }
	form { display: grid; gap: 1rem; }
	label { display: grid; gap: .45rem; font-size: .8rem; color: #d4d4d8; }
	input, textarea { width: 100%; box-sizing: border-box; border: 1px solid #3f3f46; border-radius: .6rem; padding: .8rem; background: #09090b; color: #fff; font: inherit; }
	textarea { resize: vertical; font-family: ui-monospace, monospace; font-size: .8rem; }
	button { justify-self: start; border: 0; border-radius: 999px; padding: .8rem 1.15rem; background: var(--color-performance-panel, #ffffff); color: var(--color-performance-ink, #090909); font-weight: 700; cursor: pointer; }
	.error { color: #fca5a5 !important; }
	.section-heading { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #2a2a2a; padding-bottom: 1rem; margin-bottom: 1.25rem; }
	.section-heading span { color: #71717a; font-size: .85rem; }
	.map-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; }
	.map-card { display: grid; gap: 1.5rem; min-height: 150px; padding: 1.25rem; border: 1px solid var(--color-performance-ink-soft, #262626); border-radius: .8rem; color: var(--color-performance-panel, #ffffff); text-decoration: none; background: var(--color-performance-ink, #090909); }
	.map-card:hover { border-color: #71717a; }
	.map-card div { display: flex; justify-content: space-between; gap: 1rem; }
	.map-card span, .map-card small { color: #a1a1aa; }
	.map-card p { margin: 0; text-transform: capitalize; }
	.archive { margin-top: 3rem; }
	.archive-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 1rem 0; border-bottom: 1px solid #27272a; }
	.archive-row div { display: grid; gap: .25rem; } .archive-row small { color: var(--color-performance-muted, #5e6268); }
	@media (max-width: 720px) { header { align-items: flex-start; flex-direction: column; } .create-card { grid-template-columns: 1fr; padding: 1.25rem; } }
</style>

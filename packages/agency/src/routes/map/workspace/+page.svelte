<script lang="ts">
	import '@create-something/canon/styles/workspace.css';
	import { SEO } from '@create-something/canon';

	let { data, form } = $props();
</script>

<SEO
	title="Map Workspace | CREATE SOMETHING AGENCY"
	description="Create and manage durable, account-scoped workflow maps."
	propertyName="agency"
	noindex={true}
/>

<main class="workspace-shell cs-workspace">
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
			<details><summary>Import a public canvas (optional)</summary>
			<label>
				<span>Optional canvas JSON</span>
				<textarea name="canvas" rows="5" placeholder="Paste an exported public canvas to import it"></textarea>
			</label>
			</details>
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
  .workspace-shell { box-sizing: border-box; min-height: 100svh; max-width: 1120px; margin: 0 auto; padding: var(--space-performance-xl) var(--workspace-gap) var(--space-performance-xl); }
  header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: var(--workspace-gap); margin-bottom: var(--space-performance-lg); }
  .eyebrow { color: var(--workspace-quiet); font: var(--workspace-meta) var(--font-performance-mono); }
  h1, h2 { font-family: var(--font-performance-interface); }
  h1 { margin: 0; font-size: clamp(1.75rem, 4vw, 2.25rem); letter-spacing: var(--tracking-performance-tight); }
  .lede { max-width: 65ch; color: var(--workspace-muted); line-height: 1.6; }
  .public-link { color: var(--workspace-fg); min-height: var(--workspace-control-height); display: inline-flex; align-items: center; }
  .create-card { display: grid; grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr); gap: var(--space-performance-md); padding: var(--space-performance-md); border: 1px solid var(--workspace-line); border-radius: var(--workspace-radius); background: var(--workspace-panel); margin-bottom: var(--space-performance-lg); }
  h2 { margin: 0 0 var(--workspace-gap-small); font-size: var(--text-performance-body-sm); }
  .create-card p, .empty { color: var(--workspace-muted); line-height: 1.6; }
  form, label { display: grid; gap: var(--workspace-gap-small); min-width: 0; }
  form { gap: var(--workspace-gap); }
  label { color: var(--workspace-muted); }
  summary { min-height: var(--workspace-control-height); cursor: pointer; padding-block: var(--workspace-gap-small); }
  input, textarea { width: 100%; box-sizing: border-box; min-height: var(--workspace-control-height); border: 1px solid var(--workspace-strong-line); border-radius: var(--workspace-radius); padding: var(--workspace-gap-small); background: var(--workspace-bg); color: var(--workspace-fg); font: inherit; }
  textarea { resize: vertical; font-family: var(--font-performance-mono); }
  button { min-height: var(--workspace-control-height); justify-self: start; padding: var(--workspace-gap-small) var(--workspace-gap); border: 1px solid var(--workspace-fg); border-radius: var(--workspace-radius); background: var(--workspace-fg); color: var(--workspace-bg); font-weight: var(--font-performance-semibold); cursor: pointer; }
  button:hover { background: var(--workspace-bg); color: var(--workspace-fg); }
  .error { color: var(--color-performance-stop-soft); }
  .section-heading { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--workspace-gap-small); border-bottom: 1px solid var(--workspace-line); padding-bottom: var(--workspace-gap); margin-bottom: var(--workspace-gap); }
  .section-heading span { color: var(--workspace-muted); }
  .map-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap: var(--workspace-gap); }
  .map-card { display: grid; gap: var(--workspace-gap); padding: var(--workspace-gap); border: 1px solid var(--workspace-line); border-radius: var(--workspace-radius); color: var(--workspace-fg); text-decoration: none; background: var(--workspace-panel); overflow-wrap: anywhere; }
  .map-card:hover { background: var(--workspace-hover); border-color: var(--workspace-strong-line); }
  .map-card div { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--workspace-gap-small); }
  .map-card span, .map-card small, .archive-row small { color: var(--workspace-muted); }
  .map-card p { margin: 0; text-transform: capitalize; }
  .archive { margin-top: var(--space-performance-lg); }
  .archive-row { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: var(--workspace-gap); padding-block: var(--workspace-gap); border-bottom: 1px solid var(--workspace-line); overflow-wrap: anywhere; }
  .archive-row div { display: grid; gap: var(--workspace-gap-small); }
  @media (max-width: 720px) { .create-card { grid-template-columns: 1fr; padding: var(--workspace-gap); } }
</style>

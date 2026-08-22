<script lang="ts">
	import { SEO } from '@create-something/canon';

	let { data, form } = $props();

	function initial<T>(read: () => T): T {
		return read();
	}

	let canvasJson = $state(initial(() => JSON.stringify(data.version.canvas, null, 2)));
	let compareFrom = $state(initial(() => Math.max(1, data.map.currentVersion - 1)));
	let compareTo = $state(initial(() => data.map.currentVersion));
</script>

<SEO title={`${data.map.title} | Map Workspace`} description="Review and revise a durable workflow map." propertyName="agency" noindex={true} />

<main class="map-shell">
	<nav><a href="/map/workspace">← All Maps</a><span>Account-isolated workspace</span></nav>
	<header>
		<div><p class="eyebrow">Version {data.map.currentVersion}</p><h1>{data.map.title}</h1></div>
		<span class:approved={data.map.reviewState === 'approved'}>{data.map.reviewState.replace('_', ' ')}</span>
	</header>

	<div class="workspace-grid">
		<section class="editor" aria-labelledby="editor-title">
			<h2 id="editor-title">Canvas JSON</h2>
			<p>Edit the current canvas. Saving always creates an immutable version; it never rewrites history.</p>
			<form method="POST" action="?/save">
				<input type="hidden" name="expectedVersion" value={data.map.currentVersion} />
				<textarea name="canvas" bind:value={canvasJson} rows="25" spellcheck="false"></textarea>
				<label><span>Version note</span><input name="message" maxlength="240" placeholder="What changed and why" /></label>
				{#if form?.message}<p class:error={!form?.success} class:success={form?.success} role="status">{form.message}</p>{/if}
				<button type="submit">Save new version</button>
			</form>
		</section>

		<aside>
			<section>
				<h2>Recovery</h2>
				<p class="aside-copy">Archiving revokes active share links. The owning workspace can recover the map and all version history for 30 days.</p>
				<form method="POST" action="?/archive"><button class="secondary">Archive map</button></form>
			</section>
			<section>
				<h2>Review and deliver</h2>
				<p class="aside-copy">Approval pins share, export, and Build handoff artifacts to this immutable version.</p>
				<form method="POST" action="?/review" class="review-form">
					<label><span>Review note</span><input name="note" maxlength="240" placeholder="Decision context" /></label>
					<div class="action-row">
						{#if data.map.reviewState === 'draft' || data.map.reviewState === 'changes_requested'}
							<button name="to" value="in_review">Request review</button>
						{:else if data.map.reviewState === 'in_review'}
							<button name="to" value="approved">Approve</button>
							<button class="secondary" name="to" value="changes_requested">Request changes</button>
						{/if}
					</div>
				</form>
				<div class="delivery-actions">
					<form method="POST" action="?/share"><button disabled={data.map.reviewState !== 'approved'}>Create share</button></form>
					<a class:disabled={data.map.reviewState !== 'approved'} href={`/map/workspace/${data.map.id}/export`}>Export JSON</a>
					<form method="POST" action="?/handoff"><button disabled={data.map.reviewState !== 'approved'}>Prepare Build handoff</button></form>
				</div>
				{#if form?.shareUrl}<label class="receipt"><span>Share URL (shown once)</span><input readonly value={form.shareUrl} /></label>{/if}
				{#if form?.handoffUrl}<p class="receipt"><a href={form.handoffUrl}>Open hosted handoff →</a></p>{/if}
			</section>
			<section>
				<h2>History</h2>
				<ol>
					{#each [...data.history].reverse() as version}
						<li><strong>v{version.version}</strong><span>{version.message ?? 'No note'}</span><small>{new Date(version.createdAt).toLocaleString()}</small></li>
					{/each}
				</ol>
			</section>
			<section>
				<h2>Compare</h2>
				<form method="GET" class="compare-form">
					<label><span>From</span><input type="number" name="from" min="1" max={data.map.currentVersion} bind:value={compareFrom} /></label>
					<label><span>To</span><input type="number" name="to" min="1" max={data.map.currentVersion} bind:value={compareTo} /></label>
					<button type="submit">Show diff</button>
				</form>
				{#if data.diff}
					<dl>
						<dt>Nodes added</dt><dd>{data.diff.addedNodeIds.length}</dd>
						<dt>Nodes removed</dt><dd>{data.diff.removedNodeIds.length}</dd>
						<dt>Nodes changed</dt><dd>{data.diff.changedNodeIds.length}</dd>
						<dt>Edges changed</dt><dd>{data.diff.addedEdgeIds.length + data.diff.removedEdgeIds.length + data.diff.changedEdgeIds.length}</dd>
					</dl>
				{/if}
			</section>
		</aside>
	</div>
</main>

<style>
	.map-shell { max-width: 1280px; margin: 0 auto; padding: 6rem 1.5rem 5rem; color: #f5f5f5; }
	nav, header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
	nav { padding-bottom: 1.5rem; border-bottom: 1px solid #27272a; color: #71717a; font-size: .8rem; }
	nav a { color: #d4d4d8; }
	header { padding: 2.5rem 0; }
	.eyebrow { margin: 0 0 .5rem; color: #71717a; text-transform: uppercase; letter-spacing: .1em; font-size: .75rem; }
	h1 { margin: 0; font-size: clamp(2rem, 5vw, 4rem); letter-spacing: -.05em; }
	header > span { border: 1px solid #52525b; border-radius: 999px; padding: .45rem .75rem; text-transform: capitalize; color: #a1a1aa; }
	header > span.approved { border-color: #166534; color: #86efac; }
	.workspace-grid { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 1.5rem; }
	.editor, aside section { border: 1px solid #27272a; border-radius: .8rem; padding: 1.25rem; background: #0c0c0d; }
	h2 { margin: 0 0 .5rem; font-size: 1rem; }
	.editor > p { margin: 0 0 1rem; color: #a1a1aa; line-height: 1.5; }
	form { display: grid; gap: .85rem; }
	textarea, input { box-sizing: border-box; width: 100%; border: 1px solid #3f3f46; border-radius: .5rem; padding: .75rem; background: #09090b; color: #f4f4f5; font: inherit; }
	textarea { font-family: ui-monospace, monospace; font-size: .78rem; line-height: 1.5; resize: vertical; }
	label { display: grid; gap: .35rem; color: #a1a1aa; font-size: .75rem; }
	button { justify-self: start; border: 0; border-radius: 999px; padding: .75rem 1rem; font-weight: 700; cursor: pointer; }
	button:disabled { cursor: not-allowed; opacity: .4; }
	.error { color: #fca5a5; } .success { color: #86efac; }
	aside { display: grid; align-content: start; gap: 1rem; }
	ol { list-style: none; margin: 1rem 0 0; padding: 0; display: grid; gap: .8rem; }
	li { display: grid; grid-template-columns: auto 1fr; gap: .25rem .7rem; border-top: 1px solid #27272a; padding-top: .8rem; }
	li span { color: #d4d4d8; } li small { grid-column: 2; color: #71717a; }
	.compare-form { grid-template-columns: 1fr 1fr; margin-top: 1rem; }
	.compare-form button { grid-column: 1 / -1; }
	dl { display: grid; grid-template-columns: 1fr auto; gap: .5rem; margin: 1rem 0 0; } dt { color: #a1a1aa; } dd { margin: 0; }
	.aside-copy { color: #a1a1aa; line-height: 1.5; font-size: .85rem; }
	.action-row, .delivery-actions { display: flex; flex-wrap: wrap; gap: .5rem; }
	.action-row button, .delivery-actions button, .delivery-actions a { padding: .55rem .75rem; font-size: .75rem; }
	.secondary { background: #27272a; color: #fff; }
	.delivery-actions { margin-top: 1rem; align-items: center; }
	.delivery-actions form { display: block; }
	.delivery-actions a { border-radius: 999px; background: #fff; color: #000; font-weight: 700; text-decoration: none; }
	.delivery-actions a.disabled { opacity: .4; pointer-events: none; }
	.receipt { display: grid; margin-top: 1rem; color: #86efac; font-size: .75rem; overflow-wrap: anywhere; }
	.receipt a { color: #86efac; }
	@media (max-width: 840px) { .workspace-grid { grid-template-columns: 1fr; } header { align-items: flex-start; flex-direction: column; } nav span { display: none; } }
</style>

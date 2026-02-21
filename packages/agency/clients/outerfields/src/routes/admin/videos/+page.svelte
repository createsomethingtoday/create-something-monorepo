<script lang="ts">
	import type { PageData } from './$types';
	import { Upload, RefreshCw, Save, Archive, ExternalLink } from 'lucide-svelte';

	type VisibilityFilter = 'all' | 'draft' | 'published' | 'archived';
	type IngestFilter = 'all' | 'pending_upload' | 'processing' | 'ready' | 'failed';
	type TierFilter = 'all' | 'free' | 'preview' | 'gated';
	type FeaturedFilter = 'all' | 'true' | 'false';

	let { data }: { data: PageData } = $props();

	let series = $state(data.series);
	let videos = $state(data.videos);
	let total = $state(data.total);

	let isLoading = $state(false);
	let listError = $state<string | null>(null);

	let q = $state('');
	let visibility = $state<VisibilityFilter>('all');
	let ingestStatus = $state<IngestFilter>('all');
	let tier = $state<TierFilter>('all');
	let seriesId = $state('');
	let featured = $state<FeaturedFilter>('all');

	let uploadTitle = $state('');
	let uploadDescription = $state('');
	let uploadTier = $state<'free' | 'preview' | 'gated'>('free');
	let uploadPlaybackPolicy = $state<'private' | 'public'>('private');
	let uploadSeriesId = $state('');
	let uploadEpisodeNumber = $state<string>(''); // keep as string for input; convert later
	let uploadFile = $state<File | null>(null);

	let uploadBusy = $state(false);
	let uploadProgress = $state<number>(0);
	let uploadMessage = $state<string | null>(null);
	let uploadVideoId = $state<string | null>(null);

	let actionBusy = $state(false);
	let actionMessage = $state<string | null>(null);
	let actionError = $state<string | null>(null);

	type VideoRow = PageData['videos'][number];
	type EditDraft = {
		title: string;
		description: string;
		tier: 'free' | 'preview' | 'gated';
		visibility: 'draft' | 'published' | 'archived';
		series_id: string;
		episode_number: string;
		thumbnail_path: string;
		asset_path: string;
		playback_policy: 'private' | 'public';
		is_featured: boolean;
		featured_order: number;
	};

	type UploadInitJson = {
		success?: boolean;
		data?: { videoId: string; uploadUrl: string; tusResumable: string };
		error?: string;
		message?: string;
	};

	let drafts = $state<Record<string, EditDraft>>({});

	function ensureDraft(video: VideoRow) {
		if (drafts[video.id]) return;

		drafts[video.id] = {
			title: video.title,
			description: video.description || '',
			tier: video.tier,
			visibility: video.visibility,
			series_id: video.series_id || '',
			episode_number: video.episode_number === null ? '' : String(video.episode_number),
			thumbnail_path: video.thumbnail_path || '',
			asset_path: video.asset_path || '',
			playback_policy: video.playback_policy,
			is_featured: video.is_featured === 1,
			featured_order: video.featured_order || 0
		};
	}

	for (const v of videos) ensureDraft(v);

	$effect(() => {
		for (const v of videos) ensureDraft(v);
	});

	function seriesLabel(id: string | null): string {
		if (!id) return 'Unassigned';
		const row = series.find((s) => s.id === id);
		return row?.title || row?.slug || id;
	}

	function formatDate(epochSeconds: number): string {
		return new Date(epochSeconds * 1000).toLocaleString();
	}

	function buildQueryParams(): URLSearchParams {
		const params = new URLSearchParams();
		if (q.trim()) params.set('q', q.trim());
		if (visibility !== 'all') params.set('visibility', visibility);
		if (ingestStatus !== 'all') params.set('ingest_status', ingestStatus);
		if (tier !== 'all') params.set('tier', tier);
		if (seriesId.trim()) params.set('series_id', seriesId.trim());
		if (featured !== 'all') params.set('featured', featured);
		params.set('limit', '200');
		params.set('offset', '0');
		return params;
	}

	async function refreshVideos() {
		listError = null;
		isLoading = true;
		try {
			const params = buildQueryParams();
			const response = await fetch(`/api/v1/admin/videos?${params.toString()}`);
			const payload = (await response.json()) as unknown as {
				success?: boolean;
				data?: { videos?: VideoRow[]; total?: number };
				error?: string;
			};

			if (!response.ok || !payload?.success || !payload.data) {
				throw new Error(payload?.error || 'Failed to load videos');
			}

			videos = payload.data.videos || [];
			total = payload.data.total || 0;
			for (const v of videos) ensureDraft(v);
		} catch (err) {
			listError = err instanceof Error ? err.message : 'Failed to load videos';
		} finally {
			isLoading = false;
		}
	}

	function parseEpisodeNumber(value: string): number | null {
		const trimmed = value.trim();
		if (!trimmed) return null;
		const parsed = Number.parseInt(trimmed, 10);
		if (!Number.isFinite(parsed)) return null;
		return parsed;
	}

	async function saveVideo(videoId: string) {
		actionMessage = null;
		actionError = null;
		actionBusy = true;
		try {
			const draft = drafts[videoId];
			if (!draft) throw new Error('Missing draft state');

			const payload: Record<string, unknown> = {
				title: draft.title,
				description: draft.description,
				tier: draft.tier,
				series_id: draft.series_id || null,
				episode_number: parseEpisodeNumber(draft.episode_number),
				thumbnail_path: draft.thumbnail_path,
				asset_path: draft.asset_path,
				playback_policy: draft.playback_policy,
				visibility: draft.visibility,
				is_featured: draft.is_featured ? 1 : 0,
				featured_order: Math.max(0, Math.floor(draft.featured_order || 0))
			};

			const response = await fetch(`/api/v1/admin/videos/${videoId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const json = (await response.json()) as unknown as { success?: boolean; data?: VideoRow; error?: string };
			if (!response.ok || !json?.success || !json.data) {
				throw new Error(json?.error || 'Failed to update video');
			}

			videos = videos.map((row) => (row.id === videoId ? json.data! : row));
			// Re-sync draft to what the server accepted.
			delete drafts[videoId];
			ensureDraft(json.data);

			actionMessage = 'Video saved.';
		} catch (err) {
			actionError = err instanceof Error ? err.message : 'Failed to update video';
		} finally {
			actionBusy = false;
		}
	}

	async function archiveVideo(videoId: string) {
		actionMessage = null;
		actionError = null;
		if (!confirm('Archive this video?')) return;

		actionBusy = true;
		try {
			const response = await fetch(`/api/v1/admin/videos/${videoId}`, { method: 'DELETE' });
			const json = (await response.json()) as unknown as { success?: boolean; error?: string };
			if (!response.ok || !json?.success) {
				throw new Error(json?.error || 'Failed to archive video');
			}
			await refreshVideos();
			actionMessage = 'Video archived.';
		} catch (err) {
			actionError = err instanceof Error ? err.message : 'Failed to archive video';
		} finally {
			actionBusy = false;
		}
	}

	function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		uploadFile = input.files?.[0] || null;
	}

	async function startUpload() {
		uploadMessage = null;
		uploadVideoId = null;
		uploadProgress = 0;

		if (!uploadFile) {
			uploadMessage = 'Choose a video file to upload.';
			return;
		}
		if (!uploadTitle.trim()) {
			uploadMessage = 'Title is required.';
			return;
		}
		if (!uploadSeriesId.trim()) {
			uploadMessage = 'Series is required.';
			return;
		}

		uploadBusy = true;
		try {
			const initRes = await fetch('/api/v1/uploads/init', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: uploadTitle.trim(),
					description: uploadDescription.trim() || undefined,
					tier: uploadTier,
					playbackPolicy: uploadPlaybackPolicy,
					seriesId: uploadSeriesId,
					episodeNumber: parseEpisodeNumber(uploadEpisodeNumber),
					fileSizeBytes: uploadFile.size,
					fileName: uploadFile.name
				})
			});

			const initRaw = await initRes.text();
			let initJson: UploadInitJson | null = null;
			try {
				initJson = JSON.parse(initRaw) as UploadInitJson;
			} catch {
				initJson = null;
			}

			const initData = initJson?.data;
			if (!initRes.ok || !initJson?.success || !initData) {
				const message =
					initJson?.error ||
					initJson?.message ||
					(initRaw?.trim() ? initRaw.trim() : null) ||
					`Failed to initialize upload (${initRes.status})`;
				throw new Error(message);
			}

			uploadVideoId = initData.videoId;
			uploadMessage = 'Uploading…';

			const tusMod = (await import('tus-js-client')) as unknown as {
				Upload?: new (...args: any[]) => any;
				default?: { Upload?: new (...args: any[]) => any };
			};
			const TusUpload = tusMod.Upload || tusMod.default?.Upload;
			if (!TusUpload) {
				throw new Error('tus-js-client Upload export not found');
			}

			await new Promise<void>((resolve, reject) => {
				const upload = new TusUpload(uploadFile as File, {
					uploadUrl: initData.uploadUrl,
					chunkSize: 5 * 1024 * 1024,
					retryDelays: [0, 1000, 3000, 5000],
					onError: (error: Error) => reject(error),
					onProgress: (bytesUploaded: number, bytesTotal: number) => {
						uploadProgress = bytesTotal > 0 ? Math.round((bytesUploaded / bytesTotal) * 100) : 0;
					},
					onSuccess: () => resolve()
				});

				upload.start();
			});

			uploadMessage = 'Finalizing…';
			const completeRes = await fetch('/api/v1/uploads/complete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ videoId: uploadVideoId })
			});
			const completeJson = (await completeRes.json()) as unknown as { success?: boolean; error?: string };
			if (!completeRes.ok || !completeJson?.success) {
				throw new Error(completeJson?.error || 'Upload completed but finalization failed');
			}

			uploadMessage = 'Upload complete. Stream will process in the background; publish when ready.';
			uploadFile = null;
			uploadTitle = '';
			uploadDescription = '';
			uploadEpisodeNumber = '';

			await refreshVideos();
		} catch (err) {
			uploadMessage = err instanceof Error ? err.message : 'Upload failed';
		} finally {
			uploadBusy = false;
		}
	}
</script>

<svelte:head>
	<title>Admin | Videos</title>
</svelte:head>

<div class="admin-wrap">
	<header class="admin-header">
		<div class="admin-title">
			<h1>Video Library</h1>
			<p>Upload, assign to series, publish, and curate featured videos.</p>
		</div>

		<nav class="admin-tabs" aria-label="Admin navigation">
			<a class="tab active" href="/admin/videos">Videos</a>
			<a class="tab" href="/admin/series">Series</a>
			<a class="tab" href="/admin/proposals">Proposals</a>
		</nav>
	</header>

	<section class="panel">
		<h2>Upload New Video</h2>
		<p class="hint">
			Uploads create a draft video. After Stream finishes processing, you can publish it to appear on the home page.
		</p>

		<div class="grid">
			<label class="field span-2">
				<span>Title</span>
				<input bind:value={uploadTitle} placeholder="Episode title" />
			</label>

			<label class="field">
				<span>Series</span>
				<select bind:value={uploadSeriesId}>
					<option value="">Select…</option>
					{#each series as s (s.id)}
						<option value={s.id}>{s.title} ({s.slug})</option>
					{/each}
				</select>
			</label>

			<label class="field">
				<span>Tier</span>
				<select bind:value={uploadTier}>
					<option value="free">free</option>
					<option value="preview">preview</option>
					<option value="gated">gated</option>
				</select>
			</label>

			<label class="field">
				<span>Episode #</span>
				<input bind:value={uploadEpisodeNumber} placeholder="1" inputmode="numeric" />
			</label>

			<label class="field">
				<span>Playback Policy</span>
				<select bind:value={uploadPlaybackPolicy}>
					<option value="private">private</option>
					<option value="public">public</option>
				</select>
			</label>

			<label class="field span-3">
				<span>Description</span>
				<input bind:value={uploadDescription} placeholder="Optional" />
			</label>

			<label class="field span-3">
				<span>File</span>
				<input type="file" accept="video/*" onchange={handleFileChange} />
			</label>
		</div>

		<div class="actions">
			<button class="btn primary" onclick={startUpload} disabled={uploadBusy}>
				<Upload size={16} />
				<span>{uploadBusy ? 'Uploading…' : 'Start Upload'}</span>
			</button>
		</div>

		{#if uploadBusy}
			<div class="progress">
				<div class="bar" style="width: {uploadProgress}%"></div>
			</div>
		{/if}

		{#if uploadMessage}
			<p class="status">{uploadMessage}</p>
			{#if uploadVideoId}
				<p class="status mono">videoId: {uploadVideoId}</p>
			{/if}
		{/if}
	</section>

	<section class="panel">
		<div class="panel-head">
			<div>
				<h2>Videos</h2>
				<p class="hint">{total} total</p>
			</div>
			<button class="btn" onclick={refreshVideos} disabled={isLoading || actionBusy}>
				<RefreshCw size={16} />
				<span>Refresh</span>
			</button>
		</div>

		<div class="filters">
			<label class="field">
				<span>Search</span>
				<input bind:value={q} placeholder="Title contains…" />
			</label>
			<label class="field">
				<span>Visibility</span>
				<select bind:value={visibility}>
					<option value="all">all</option>
					<option value="draft">draft</option>
					<option value="published">published</option>
					<option value="archived">archived</option>
				</select>
			</label>
			<label class="field">
				<span>Ingest</span>
				<select bind:value={ingestStatus}>
					<option value="all">all</option>
					<option value="pending_upload">pending_upload</option>
					<option value="processing">processing</option>
					<option value="ready">ready</option>
					<option value="failed">failed</option>
				</select>
			</label>
			<label class="field">
				<span>Tier</span>
				<select bind:value={tier}>
					<option value="all">all</option>
					<option value="free">free</option>
					<option value="preview">preview</option>
					<option value="gated">gated</option>
				</select>
			</label>
			<label class="field">
				<span>Series</span>
				<select bind:value={seriesId}>
					<option value="">all</option>
					{#each series as s (s.id)}
						<option value={s.id}>{s.title}</option>
					{/each}
				</select>
			</label>
			<label class="field">
				<span>Featured</span>
				<select bind:value={featured}>
					<option value="all">all</option>
					<option value="true">featured</option>
					<option value="false">not featured</option>
				</select>
			</label>

			<div class="actions">
				<button class="btn" onclick={refreshVideos} disabled={isLoading || actionBusy}>
					<RefreshCw size={16} />
					<span>Apply</span>
				</button>
			</div>
		</div>

		{#if listError}
			<div class="notice error">{listError}</div>
		{/if}
		{#if actionError}
			<div class="notice error">{actionError}</div>
		{/if}
		{#if actionMessage}
			<div class="notice success">{actionMessage}</div>
		{/if}

		{#if isLoading}
			<p class="hint">Loading…</p>
		{:else if videos.length === 0}
			<p class="hint">No videos match these filters.</p>
		{:else}
			<div class="video-list">
				{#each videos as v (v.id)}
					<details class="video-card">
						<summary class="video-summary">
							<div class="summary-title">
								<span class="title">{v.title}</span>
								<span class="meta mono">{v.id}</span>
							</div>
							<div class="badges">
								<span class="badge">{seriesLabel(v.series_id)}</span>
								<span class="badge">{v.visibility}</span>
								<span class="badge">{v.ingest_status}</span>
								{#if v.is_featured === 1}
									<span class="badge featured">featured #{v.featured_order}</span>
								{/if}
							</div>
							<div class="updated">{formatDate(v.updated_at)}</div>
						</summary>

						<div class="video-form">
							<div class="grid">
								<label class="field span-2">
									<span>Title</span>
									<input bind:value={drafts[v.id].title} />
								</label>

								<label class="field">
									<span>Visibility</span>
									<select bind:value={drafts[v.id].visibility}>
										<option value="draft">draft</option>
										<option value="published">published</option>
										<option value="archived">archived</option>
									</select>
								</label>

								<label class="field">
									<span>Tier</span>
									<select bind:value={drafts[v.id].tier}>
										<option value="free">free</option>
										<option value="preview">preview</option>
										<option value="gated">gated</option>
									</select>
								</label>

								<label class="field">
									<span>Series</span>
									<select bind:value={drafts[v.id].series_id}>
										<option value="">Unassigned</option>
										{#each series as s (s.id)}
											<option value={s.id}>{s.title}</option>
										{/each}
									</select>
								</label>

								<label class="field">
									<span>Episode #</span>
									<input bind:value={drafts[v.id].episode_number} inputmode="numeric" />
								</label>

								<label class="field">
									<span>Playback</span>
									<select bind:value={drafts[v.id].playback_policy}>
										<option value="private">private</option>
										<option value="public">public</option>
									</select>
								</label>

								<label class="field span-3">
									<span>Description</span>
									<input bind:value={drafts[v.id].description} />
								</label>

								<label class="field span-2">
									<span>Thumbnail Path</span>
									<input bind:value={drafts[v.id].thumbnail_path} />
								</label>

								<label class="field span-2">
									<span>Legacy Asset Path</span>
									<input bind:value={drafts[v.id].asset_path} />
								</label>

								<div class="field span-3 inline">
									<label class="check">
										<input type="checkbox" bind:checked={drafts[v.id].is_featured} />
										<span>Featured</span>
									</label>
									<label class="field narrow">
										<span>Featured Order</span>
										<input
											type="number"
											value={drafts[v.id].featured_order}
											oninput={(e) =>
												(drafts[v.id].featured_order = Number((e.target as HTMLInputElement).value))}
										/>
									</label>
								</div>
							</div>

							<div class="row-actions">
								<a class="btn" href={`/watch/${v.id}`} target="_blank" rel="noreferrer">
									<ExternalLink size={16} />
									<span>Preview</span>
								</a>
								<button class="btn" onclick={() => saveVideo(v.id)} disabled={actionBusy}>
									<Save size={16} />
									<span>Save</span>
								</button>
								<button class="btn danger" onclick={() => archiveVideo(v.id)} disabled={actionBusy}>
									<Archive size={16} />
									<span>Archive</span>
								</button>
							</div>

							<p class="hint">
								stream_uid: <span class="mono">{v.stream_uid || '—'}</span> · ingest:
								<span class="mono">{v.ingest_status}</span>
							</p>
						</div>
					</details>
				{/each}
			</div>
		{/if}
	</section>
</div>

<style>
	.admin-wrap {
		max-width: 1100px;
		margin: 0 auto;
		padding: 7rem 1.5rem 3rem;
	}

	.admin-header {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1.5rem;
		margin-bottom: 2rem;
		flex-wrap: wrap;
	}

	.admin-title h1 {
		margin: 0 0 0.25rem;
		font-size: 1.75rem;
		color: var(--color-fg-primary);
	}

	.admin-title p {
		margin: 0;
		color: var(--color-fg-muted);
	}

	.admin-tabs {
		display: flex;
		gap: 0.5rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 9999px;
		padding: 0.25rem;
	}

	.tab {
		display: inline-flex;
		align-items: center;
		padding: 0.5rem 0.85rem;
		color: var(--color-fg-secondary);
		text-decoration: none;
		border-radius: 9999px;
		font-size: 0.875rem;
	}

	.tab.active {
		background: rgba(255, 255, 255, 0.12);
		color: var(--color-fg-primary);
		font-weight: 700;
	}

	.panel {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
		padding: 1.25rem;
		margin-bottom: 1.25rem;
	}

	.panel-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.panel h2 {
		margin: 0 0 0.35rem;
		color: var(--color-fg-primary);
		font-size: 1.05rem;
	}

	.hint {
		margin: 0.25rem 0 0;
		color: var(--color-fg-muted);
		font-size: 0.875rem;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.field span {
		color: var(--color-fg-muted);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.field input,
	.field select {
		height: 2.5rem;
		border-radius: 0.75rem;
		border: 1px solid var(--color-border-default);
		background: rgba(0, 0, 0, 0.25);
		color: var(--color-fg-primary);
		padding: 0 0.85rem;
		outline: none;
	}

	.span-2 {
		grid-column: span 2;
	}

	.span-3 {
		grid-column: 1 / -1;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		border-radius: 0.75rem;
		border: 1px solid var(--color-border-default);
		background: rgba(255, 255, 255, 0.03);
		color: var(--color-fg-secondary);
		padding: 0.6rem 0.9rem;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
		font-weight: 600;
		text-decoration: none;
	}

	.btn:hover:enabled {
		background: rgba(255, 255, 255, 0.08);
		color: var(--color-fg-primary);
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn.primary {
		background: var(--color-primary);
		border-color: rgba(255, 255, 255, 0.12);
		color: #000;
	}

	.btn.danger {
		border-color: rgba(255, 90, 90, 0.35);
		color: rgba(255, 90, 90, 0.95);
	}

	.notice {
		padding: 0.85rem 1rem;
		border-radius: 0.75rem;
		margin: 0.75rem 0;
		border: 1px solid var(--color-border-default);
	}

	.notice.error {
		background: rgba(255, 90, 90, 0.08);
		border-color: rgba(255, 90, 90, 0.25);
		color: rgba(255, 220, 220, 0.95);
	}

	.notice.success {
		background: rgba(80, 200, 120, 0.08);
		border-color: rgba(80, 200, 120, 0.25);
		color: rgba(210, 255, 230, 0.95);
	}

	.progress {
		margin-top: 0.75rem;
		height: 8px;
		border-radius: 9999px;
		background: rgba(255, 255, 255, 0.08);
		overflow: hidden;
	}

	.progress .bar {
		height: 100%;
		background: var(--color-primary);
		transition: width 0.2s linear;
	}

	.status {
		margin: 0.75rem 0 0;
		color: var(--color-fg-secondary);
	}

	.filters {
		display: grid;
		grid-template-columns: 1.4fr repeat(5, 1fr);
		gap: 0.75rem;
		align-items: end;
		margin-bottom: 1rem;
	}

	.video-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.video-card {
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
		background: rgba(0, 0, 0, 0.18);
		overflow: hidden;
	}

	.video-summary {
		list-style: none;
		cursor: pointer;
		display: grid;
		grid-template-columns: 1.6fr 1.6fr 180px;
		gap: 0.75rem;
		padding: 0.85rem 1rem;
		align-items: start;
	}

	.video-summary::-webkit-details-marker {
		display: none;
	}

	.summary-title .title {
		display: block;
		color: var(--color-fg-primary);
		font-weight: 700;
	}

	.meta {
		display: block;
		margin-top: 0.25rem;
		color: var(--color-fg-muted);
		font-size: 0.75rem;
	}

	.badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		align-content: start;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		padding: 0.2rem 0.55rem;
		border-radius: 9999px;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: var(--color-fg-secondary);
		font-size: 0.75rem;
		white-space: nowrap;
	}

	.badge.featured {
		border-color: rgba(255, 220, 90, 0.35);
		color: rgba(255, 235, 160, 0.95);
	}

	.updated {
		color: var(--color-fg-muted);
		font-size: 0.75rem;
		text-align: right;
		padding-top: 0.25rem;
	}

	.video-form {
		padding: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.inline {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
	}

	.check {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--color-fg-secondary);
	}

	.narrow input {
		width: 140px;
	}

	.row-actions {
		margin-top: 1rem;
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		flex-wrap: wrap;
	}

	.mono {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
	}

	@media (max-width: 980px) {
		.filters {
			grid-template-columns: 1fr;
		}

		.video-summary {
			grid-template-columns: 1fr;
		}

		.updated {
			text-align: left;
		}

		.inline {
			flex-direction: column;
			align-items: flex-start;
		}

		.row-actions {
			justify-content: flex-start;
		}
	}
</style>

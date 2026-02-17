<script lang="ts">
	import type { PageData } from './$types';
	import type { Video } from '$lib/server/db/videos';
	import * as tus from 'tus-js-client';

	interface SeriesRow {
		id: string;
		slug: string;
		title: string;
	}

	type Visibility = 'draft' | 'published' | 'archived';
	type Tier = 'free' | 'preview' | 'gated';
	type PlaybackPolicy = 'private' | 'public';

	let { data }: { data: PageData } = $props();

	let series = $state<SeriesRow[]>(
		(data.series || []).map((row) => ({ id: row.id, slug: row.slug, title: row.title }))
	);

	let videos = $state<Video[]>(data.videos?.videos || []);
	let total = $state<number>(data.videos?.total || videos.length);

	const seriesTitleById = $derived.by(() => {
		const map = new Map<string, string>();
		for (const s of series) map.set(s.id, s.title);
		return map;
	});

	// Filters
	let q = $state('');
	let visibility = $state<'all' | Visibility>('all');
	let ingestStatus = $state<'all' | Video['ingest_status']>('all');
	let seriesIdFilter = $state<string>('');
	let tier = $state<'all' | Tier>('all');
	let featured = $state<'all' | 'true' | 'false'>('all');
	let isRefreshing = $state(false);
	let refreshError = $state<string | null>(null);

	let selectedId = $state<string | null>(videos[0]?.id || null);
	let selected = $derived(videos.find((v) => v.id === selectedId) || null);

	// Upload form
	let uploadFile = $state<File | null>(null);
	let uploadTitle = $state('');
	let uploadDescription = $state('');
	let uploadSeriesId = $state(series[0]?.id || '');
	let uploadEpisodeNumber = $state<number | null>(null);
	let uploadTier = $state<Tier>('free');
	let uploadPolicy = $state<PlaybackPolicy>('private');
	let uploadError = $state<string | null>(null);
	let uploadProgress = $state<number>(0);
	let uploadState = $state<'idle' | 'init' | 'uploading' | 'finalizing' | 'processing' | 'done'>('idle');
	let uploadVideoId = $state<string | null>(null);

	let pollTimer: ReturnType<typeof setInterval> | null = null;

	function stopPolling() {
		if (pollTimer) clearInterval(pollTimer);
		pollTimer = null;
	}

	async function refreshVideos() {
		isRefreshing = true;
		refreshError = null;

		try {
			const params = new URLSearchParams();
			if (q.trim()) params.set('q', q.trim());
			if (visibility !== 'all') params.set('visibility', visibility);
			if (ingestStatus !== 'all') params.set('ingest_status', ingestStatus);
			if (seriesIdFilter.trim()) params.set('series_id', seriesIdFilter.trim());
			if (tier !== 'all') params.set('tier', tier);
			if (featured !== 'all') params.set('featured', featured);
			params.set('limit', '200');

			const response = await fetch(`/api/v1/admin/videos?${params.toString()}`);
			const result = await response.json();
			if (!response.ok || !result?.success) {
				throw new Error(result?.error || 'Failed to load videos');
			}

			videos = (result.data?.videos || []) as Video[];
			total = result.data?.total || videos.length;
			if (videos.length > 0 && !videos.some((v) => v.id === selectedId)) {
				selectedId = videos[0].id;
			}
		} catch (error) {
			refreshError = error instanceof Error ? error.message : 'Failed to load videos';
		} finally {
			isRefreshing = false;
		}
	}

	function onFileChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0] || null;
		uploadFile = file;
		uploadProgress = 0;
		uploadError = null;

		if (file && !uploadTitle.trim()) {
			uploadTitle = file.name.replace(/\.[a-z0-9]+$/i, '').trim();
		}
	}

	async function startUpload() {
		uploadError = null;
		uploadProgress = 0;
		uploadVideoId = null;

		if (!uploadFile) {
			uploadError = 'Please select a file.';
			return;
		}
		if (!uploadTitle.trim()) {
			uploadError = 'Title is required.';
			return;
		}
		if (!uploadSeriesId) {
			uploadError = 'Series is required.';
			return;
		}

		uploadState = 'init';

		try {
			const initResponse = await fetch('/api/v1/uploads/init', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: uploadTitle,
					description: uploadDescription,
					seriesId: uploadSeriesId,
					episodeNumber: uploadEpisodeNumber,
					tier: uploadTier,
					fileSizeBytes: uploadFile.size,
					fileName: uploadFile.name,
					playbackPolicy: uploadPolicy
				})
			});

			const initPayload = await initResponse.json();
			if (!initResponse.ok || !initPayload?.success) {
				throw new Error(initPayload?.error || 'Failed to initialize upload');
			}

			const data = initPayload.data as {
				videoId: string;
				uploadUrl: string;
				tusResumable: string;
			};

			uploadVideoId = data.videoId;
			uploadState = 'uploading';

			const upload = new tus.Upload(uploadFile, {
				uploadUrl: data.uploadUrl,
				retryDelays: [0, 1000, 3000, 5000],
				// 8MB chunks are a good default for large uploads.
				chunkSize: 8 * 1024 * 1024,
				headers: {
					'Tus-Resumable': data.tusResumable
				},
				onError: (err) => {
					uploadError = err instanceof Error ? err.message : 'Upload failed';
					uploadState = 'idle';
				},
				onProgress: (bytesUploaded, bytesTotal) => {
					if (bytesTotal > 0) {
						uploadProgress = Math.round((bytesUploaded / bytesTotal) * 100);
					}
				},
				onSuccess: async () => {
					uploadState = 'finalizing';

					const completeResponse = await fetch('/api/v1/uploads/complete', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ videoId: data.videoId })
					});
					const completePayload = await completeResponse.json();
					if (!completeResponse.ok || !completePayload?.success) {
						throw new Error(completePayload?.error || 'Failed to finalize upload');
					}

					uploadState = 'processing';
					selectedId = data.videoId;
					await refreshVideos();

					stopPolling();
					pollTimer = setInterval(async () => {
						try {
							const res = await fetch(`/api/v1/admin/videos/${data.videoId}`);
							const payload = await res.json();
							if (!res.ok || !payload?.success) return;
							const updated = payload.data as Video;

							// Replace in list for live status.
							videos = videos.map((v) => (v.id === updated.id ? updated : v));

							if (updated.ingest_status === 'ready' || updated.ingest_status === 'failed') {
								stopPolling();
								uploadState = 'done';
							}
						} catch {
							// Ignore transient polling errors
						}
					}, 3000);
				}
			});

			upload.start();
		} catch (error) {
			uploadError = error instanceof Error ? error.message : 'Upload failed';
			uploadState = 'idle';
		}
	}

	function resetUploadForm() {
		uploadFile = null;
		uploadTitle = '';
		uploadDescription = '';
		uploadEpisodeNumber = null;
		uploadTier = 'free';
		uploadPolicy = 'private';
		uploadError = null;
		uploadProgress = 0;
		uploadState = 'idle';
		uploadVideoId = null;
	}

	async function saveSelected(changes: Partial<Video> & { is_featured?: boolean }) {
		if (!selected) return;

		try {
			const response = await fetch(`/api/v1/admin/videos/${selected.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(changes)
			});
			const result = await response.json();
			if (!response.ok || !result?.success) {
				throw new Error(result?.error || 'Failed to save video');
			}

			const updated = result.data as Video;
			videos = videos.map((v) => (v.id === updated.id ? updated : v));
		} catch (error) {
			alert(error instanceof Error ? error.message : 'Failed to save video');
		}
	}

	async function archiveSelected() {
		if (!selected) return;
		if (!confirm('Archive this video?')) return;

		const response = await fetch(`/api/v1/admin/videos/${selected.id}`, { method: 'DELETE' });
		const result = await response.json();
		if (!response.ok || !result?.success) {
			alert(result?.error || 'Failed to archive video');
			return;
		}

		await refreshVideos();
	}

	$effect(() => {
		return () => {
			stopPolling();
		};
	});
</script>

<svelte:head>
	<title>Admin | Videos</title>
</svelte:head>

<div class="page">
	<header class="header">
		<h1>Videos</h1>
		<p>Upload, publish, and curate home page content.</p>
	</header>

	<section class="card">
		<h2>Upload</h2>

		<div class="upload-grid">
			<label>
				<span>File</span>
				<input type="file" accept="video/*" onchange={onFileChange} />
			</label>
			<label>
				<span>Title</span>
				<input bind:value={uploadTitle} placeholder="Episode title" />
			</label>
			<label>
				<span>Series</span>
				<select bind:value={uploadSeriesId}>
					{#each series as s}
						<option value={s.id}>{s.title}</option>
					{/each}
				</select>
			</label>
			<label>
				<span>Episode #</span>
				<input
					type="number"
					min="1"
					step="1"
					value={uploadEpisodeNumber ?? ''}
					oninput={(e) => {
						const v = (e.currentTarget as HTMLInputElement).value;
						uploadEpisodeNumber = v ? Number.parseInt(v, 10) : null;
					}}
				/>
			</label>
			<label>
				<span>Tier</span>
				<select bind:value={uploadTier}>
					<option value="free">free</option>
					<option value="preview">preview</option>
					<option value="gated">gated</option>
				</select>
			</label>
			<label>
				<span>Playback</span>
				<select bind:value={uploadPolicy}>
					<option value="private">private (signed URLs)</option>
					<option value="public">public</option>
				</select>
			</label>
			<label class="full">
				<span>Description</span>
				<textarea bind:value={uploadDescription} rows="2" placeholder="Optional"></textarea>
			</label>
		</div>
		
		<div class="upload-actions">
			<button
				class="primary"
				onclick={() => {
					if (uploadState === 'done') resetUploadForm();
					else void startUpload();
				}}
				disabled={uploadState !== 'idle' && uploadState !== 'done'}
			>
				{#if uploadState === 'idle'}Start Upload{/if}
				{#if uploadState === 'init'}Initializing…{/if}
				{#if uploadState === 'uploading'}Uploading…{/if}
				{#if uploadState === 'finalizing'}Finalizing…{/if}
				{#if uploadState === 'processing'}Processing…{/if}
				{#if uploadState === 'done'}Upload Another{/if}
			</button>
			{#if uploadState === 'uploading'}
				<span class="progress">{uploadProgress}%</span>
			{/if}
			{#if uploadError}
				<span class="error">{uploadError}</span>
			{/if}
			{#if uploadVideoId}
				<span class="mono">videoId: {uploadVideoId}</span>
			{/if}
		</div>
	</section>

	<section class="card">
		<h2>Library</h2>

		<div class="filters">
			<input bind:value={q} placeholder="Search title…" />
			<select bind:value={visibility}>
				<option value="all">visibility: all</option>
				<option value="published">published</option>
				<option value="draft">draft</option>
				<option value="archived">archived</option>
			</select>
			<select bind:value={ingestStatus}>
				<option value="all">ingest: all</option>
				<option value="pending_upload">pending_upload</option>
				<option value="processing">processing</option>
				<option value="ready">ready</option>
				<option value="failed">failed</option>
			</select>
			<select bind:value={tier}>
				<option value="all">tier: all</option>
				<option value="free">free</option>
				<option value="preview">preview</option>
				<option value="gated">gated</option>
			</select>
			<select bind:value={featured}>
				<option value="all">featured: all</option>
				<option value="true">featured</option>
				<option value="false">not featured</option>
			</select>
			<select bind:value={seriesIdFilter}>
				<option value="">series: all</option>
				{#each series as s}
					<option value={s.id}>{s.title}</option>
				{/each}
			</select>

			<button onclick={() => void refreshVideos()} disabled={isRefreshing}>
				{isRefreshing ? 'Refreshing…' : 'Refresh'}
			</button>
		</div>

		{#if refreshError}
			<p class="error">{refreshError}</p>
		{/if}

		<div class="split">
			<div class="list">
				<div class="meta">
					<span>{videos.length} shown</span>
					<span class="muted">({total} total)</span>
				</div>

				{#if videos.length === 0}
					<p class="muted">No videos match the current filters.</p>
				{:else}
					<div class="table">
						{#each videos as v (v.id)}
							<button
								class="list-item"
								class:selected={v.id === selectedId}
								onclick={() => (selectedId = v.id)}
							>
								<div class="title">{v.title}</div>
								<div class="sub">
									<span class="mono">{v.id}</span>
									<span>•</span>
									<span>{seriesTitleById.get(v.series_id || '') || v.category}</span>
									<span>•</span>
									<span>{v.visibility}</span>
									<span>•</span>
									<span>{v.ingest_status}</span>
									{#if v.is_featured === 1}
										<span>•</span>
										<span>featured #{v.featured_order}</span>
									{/if}
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<div class="detail">
				{#if !selected}
					<p class="muted">Select a video to edit.</p>
				{:else}
					<h3>Details</h3>

					<div class="detail-grid">
						<label>
							<span>Title</span>
							<input
								value={selected.title}
								onchange={(e) =>
									saveSelected({ title: (e.currentTarget as HTMLInputElement).value })
								}
							/>
						</label>

						<label>
							<span>Visibility</span>
							<select
								value={selected.visibility}
								onchange={(e) => saveSelected({ visibility: (e.currentTarget as HTMLSelectElement).value as any })}
							>
								<option value="draft">draft</option>
								<option value="published">published</option>
								<option value="archived">archived</option>
							</select>
						</label>

						<label>
							<span>Series</span>
							<select
								value={selected.series_id || ''}
								onchange={(e) => saveSelected({ series_id: (e.currentTarget as HTMLSelectElement).value })}
							>
								<option value="">(none)</option>
								{#each series as s}
									<option value={s.id}>{s.title}</option>
								{/each}
							</select>
						</label>

						<label>
							<span>Episode #</span>
							<input
								type="number"
								min="1"
								step="1"
								value={selected.episode_number ?? ''}
								onchange={(e) => {
									const v = (e.currentTarget as HTMLInputElement).value;
									void saveSelected({ episode_number: v ? Number.parseInt(v, 10) : null } as any);
								}}
							/>
						</label>

						<label>
							<span>Tier</span>
							<select
								value={selected.tier}
								onchange={(e) => saveSelected({ tier: (e.currentTarget as HTMLSelectElement).value as any })}
							>
								<option value="free">free</option>
								<option value="preview">preview</option>
								<option value="gated">gated</option>
							</select>
						</label>

						<label>
							<span>Playback policy</span>
							<select
								value={selected.playback_policy}
								onchange={(e) => saveSelected({ playback_policy: (e.currentTarget as HTMLSelectElement).value as any })}
							>
								<option value="private">private</option>
								<option value="public">public</option>
							</select>
						</label>

						<label class="full">
							<span>Description</span>
							<textarea
								rows="3"
								value={selected.description || ''}
								onchange={(e) => saveSelected({ description: (e.currentTarget as HTMLTextAreaElement).value })}
							></textarea>
						</label>

						<div class="feature-row full">
							<label class="feature-toggle">
								<input
									type="checkbox"
									checked={selected.is_featured === 1}
									onchange={(e) => {
										const checked = (e.currentTarget as HTMLInputElement).checked;
										void saveSelected({ is_featured: checked, featured_order: checked ? selected.featured_order : 0 } as any);
									}}
								/>
								<span>Featured</span>
							</label>

							<label>
								<span>Featured order</span>
								<input
									type="number"
									min="0"
									step="1"
									value={selected.featured_order}
									onchange={(e) => void saveSelected({ featured_order: Number.parseInt((e.currentTarget as HTMLInputElement).value || '0', 10) } as any)}
								/>
							</label>
						</div>

						<div class="full">
							<div class="info">
								<div><span class="muted">id</span> <span class="mono">{selected.id}</span></div>
								<div><span class="muted">ingest</span> <span>{selected.ingest_status}</span></div>
								{#if selected.stream_uid}
									<div><span class="muted">stream</span> <span class="mono">{selected.stream_uid}</span></div>
								{/if}
							</div>
						</div>

						<div class="actions full">
							<button class="danger" onclick={() => void archiveSelected()}>Archive Video</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</section>
</div>

<style>
	.page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 7rem 1.5rem 3rem;
	}

	.header h1 {
		margin: 0;
		font-size: 1.8rem;
	}

	.header p {
		margin: 0.25rem 0 0;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.6));
	}

	.card {
		margin-top: 1.5rem;
		padding: 1rem;
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.12));
		border-radius: 12px;
		background: var(--color-bg-surface, rgba(255, 255, 255, 0.03));
	}

	h2 {
		margin: 0 0 0.75rem;
		font-size: 1.1rem;
	}

	input,
	textarea,
	select {
		width: 100%;
		box-sizing: border-box;
		padding: 0.5rem 0.6rem;
		border-radius: 10px;
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.12));
		background: rgba(0, 0, 0, 0.35);
		color: var(--color-fg-primary, #fff);
	}

	textarea {
		resize: vertical;
	}

	label span {
		display: block;
		font-size: 0.75rem;
		opacity: 0.8;
		margin-bottom: 0.25rem;
	}

	.upload-grid {
		display: grid;
		grid-template-columns: 1.2fr 1.2fr 1fr 0.6fr 0.6fr 1fr;
		gap: 0.75rem;
	}

	.full {
		grid-column: 1 / -1;
	}

	.upload-actions {
		margin-top: 0.75rem;
		display: flex;
		gap: 0.75rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.filters {
		display: grid;
		grid-template-columns: 1.3fr 1fr 1fr 1fr 1fr 1.3fr auto;
		gap: 0.5rem;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.split {
		display: grid;
		grid-template-columns: 1.1fr 0.9fr;
		gap: 0.75rem;
	}

	.list {
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
		overflow: hidden;
	}

	.meta {
		display: flex;
		gap: 0.5rem;
		padding: 0.75rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		font-size: 0.85rem;
	}

	.table {
		display: grid;
	}

	.list-item {
		padding: 0.75rem;
		background: transparent;
		border: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		color: inherit;
		text-align: left;
		cursor: pointer;
	}

	.list-item.selected {
		background: rgba(255, 255, 255, 0.06);
	}

	.title {
		font-weight: 600;
	}

	.sub {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		font-size: 0.8rem;
		opacity: 0.85;
		margin-top: 0.25rem;
	}

	.detail {
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
		padding: 0.75rem;
	}

	.detail h3 {
		margin: 0 0 0.75rem;
	}

	.detail-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.feature-row {
		display: flex;
		gap: 1rem;
		align-items: end;
		flex-wrap: wrap;
	}

	.feature-toggle {
		display: inline-flex;
		gap: 0.5rem;
		align-items: center;
	}

	.actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		flex-wrap: wrap;
	}

	button {
		padding: 0.5rem 0.75rem;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.05);
		color: white;
		cursor: pointer;
	}

	button.primary {
		background: rgba(255, 255, 255, 0.12);
	}

	button.danger {
		border-color: rgba(255, 80, 80, 0.35);
		background: rgba(255, 80, 80, 0.12);
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.progress {
		font-variant-numeric: tabular-nums;
	}

	.muted {
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.6));
	}

	.mono {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
		font-size: 0.85rem;
	}

	.error {
		color: rgba(255, 80, 80, 0.95);
	}

	.info {
		display: grid;
		gap: 0.35rem;
		font-size: 0.9rem;
	}

	@media (max-width: 1100px) {
		.upload-grid {
			grid-template-columns: 1fr;
		}
		.filters {
			grid-template-columns: 1fr;
		}
		.split {
			grid-template-columns: 1fr;
		}
		.detail-grid {
			grid-template-columns: 1fr;
		}
	}
</style>

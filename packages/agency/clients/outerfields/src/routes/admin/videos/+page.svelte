<script lang="ts">
	import type { PageData } from './$types';
	import { Upload, RefreshCw, Save, Archive, ExternalLink } from 'lucide-svelte';
	import { onDestroy, tick } from 'svelte';

	type VisibilityFilter = 'all' | 'draft' | 'published' | 'archived';
	type IngestFilter = 'all' | 'pending_upload' | 'processing' | 'ready' | 'failed';
	type TierFilter = 'all' | 'free' | 'preview' | 'gated';
	type FeaturedFilter = 'all' | 'true' | 'false';

	let { data }: { data: PageData } = $props();

	const series = $derived(data.series);
	let videos = $state<PageData['videos']>([]);
	let total = $state(0);

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
	let thumbnailFilesByVideoId = $state<Record<string, File | null>>({});
	let thumbnailUploadBusyByVideoId = $state<Record<string, boolean>>({});
	let thumbnailUploadMessageByVideoId = $state<Record<string, string | null>>({});
	let thumbnailUploadErrorByVideoId = $state<Record<string, boolean>>({});

	type VideoRow = PageData['videos'][number];
	type EditDraft = {
		title: string;
		description: string;
		tier: 'free' | 'preview' | 'gated';
		visibility: 'draft' | 'published' | 'archived';
		series_id: string;
		episode_number: string;
		thumbnail_path: string;
		playback_policy: 'private' | 'public';
		is_featured: boolean;
		featured_order: number;
	};

	type ConfirmDialogAction = 'archive' | 'publish';
	type ConfirmDialogState = {
		action: ConfirmDialogAction;
		videoId: string;
		videoTitle: string;
	};

	type UploadInitJson = {
		success?: boolean;
		data?: { videoId: string; uploadUrl: string; tusResumable: string };
		error?: string;
		message?: string;
	};

	type ThumbnailUploadJson = {
		success?: boolean;
		data?: VideoRow;
		error?: string;
		upload?: {
			key: string;
			contentType: string;
			size: number;
			width: number;
			height: number;
		};
	};

	let drafts = $state<Record<string, EditDraft>>({});
	let highlightedVideoId = $state<string | null>(null);
	let ingestMonitoringVideoId = $state<string | null>(null);
	let confirmDialog = $state<ConfirmDialogState | null>(null);
	let ingestMonitorToken = 0;

	const INGEST_POLL_INTERVAL_MS = 5000;
	const INGEST_POLL_TIMEOUT_MS = 3 * 60 * 1000;

	$effect(() => {
		videos = data.videos;
		total = data.total;
	});

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
			playback_policy: video.playback_policy,
			is_featured: video.is_featured === 1,
			featured_order: video.featured_order || 0
		};
	}

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

	function hasActiveFilters(): boolean {
		return (
			q.trim().length > 0 ||
			visibility !== 'all' ||
			ingestStatus !== 'all' ||
			tier !== 'all' ||
			seriesId.trim().length > 0 ||
			featured !== 'all'
		);
	}

	async function clearAllFilters(): Promise<void> {
		q = '';
		visibility = 'all';
		ingestStatus = 'all';
		tier = 'all';
		seriesId = '';
		featured = 'all';
		await refreshVideos();
	}

	async function clearSingleFilter(
		filter: 'q' | 'visibility' | 'ingestStatus' | 'tier' | 'seriesId' | 'featured'
	): Promise<void> {
		switch (filter) {
			case 'q':
				q = '';
				break;
			case 'visibility':
				visibility = 'all';
				break;
			case 'ingestStatus':
				ingestStatus = 'all';
				break;
			case 'tier':
				tier = 'all';
				break;
			case 'seriesId':
				seriesId = '';
				break;
			case 'featured':
				featured = 'all';
				break;
		}
		await refreshVideos();
	}

	function isVideoDirty(video: VideoRow): boolean {
		const draft = drafts[video.id];
		if (!draft) return false;

		const normalizedDraftTitle = draft.title.trim();
		const normalizedDraftDescription = draft.description.trim();
		const normalizedDraftSeriesId = draft.series_id.trim();
		const normalizedDraftThumbnail = draft.thumbnail_path.trim();
		const normalizedDraftEpisode = parseEpisodeNumber(draft.episode_number);
		const normalizedDraftFeaturedOrder = Math.max(0, Math.floor(draft.featured_order || 0));
		const normalizedVideoFeaturedOrder = Math.max(0, Math.floor(video.featured_order || 0));

		return (
			normalizedDraftTitle !== video.title.trim() ||
			normalizedDraftDescription !== (video.description || '').trim() ||
			draft.tier !== video.tier ||
			draft.visibility !== video.visibility ||
			normalizedDraftSeriesId !== (video.series_id || '') ||
			normalizedDraftEpisode !== video.episode_number ||
			normalizedDraftThumbnail !== (video.thumbnail_path || '').trim() ||
			draft.playback_policy !== video.playback_policy ||
			(draft.is_featured ? 1 : 0) !== video.is_featured ||
			normalizedDraftFeaturedOrder !== normalizedVideoFeaturedOrder
		);
	}

	function closeConfirmDialog(): void {
		if (actionBusy) return;
		confirmDialog = null;
	}

	function requestArchiveVideo(videoId: string): void {
		const video = getVideoById(videoId);
		if (!video) return;
		confirmDialog = {
			action: 'archive',
			videoId,
			videoTitle: video.title
		};
	}

	function requestPublishVideo(videoId: string): void {
		actionError = null;
		if (!canPublishVideo(videoId)) {
			actionError = 'Cannot publish until ingest status is ready.';
			return;
		}
		const video = getVideoById(videoId);
		if (!video) return;
		confirmDialog = {
			action: 'publish',
			videoId,
			videoTitle: video.title
		};
	}

	async function confirmDialogAction(): Promise<void> {
		if (!confirmDialog || actionBusy) return;
		const pending = confirmDialog;
		confirmDialog = null;

		if (pending.action === 'archive') {
			await archiveVideo(pending.videoId);
			return;
		}

		await saveVideo(pending.videoId, {
			visibility: 'published',
			successMessage: 'Video published.'
		});
	}

	function handleWindowKeydown(event: KeyboardEvent): void {
		if (event.key !== 'Escape' || !confirmDialog) return;
		event.preventDefault();
		closeConfirmDialog();
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

	function getThumbnailSrc(thumbnailPath: string): string {
		const normalized = thumbnailPath.trim();
		if (!normalized) return '';
		if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
		if (normalized.startsWith('/thumbnails/')) return normalized;
		return `/thumbnails${normalized.startsWith('/') ? '' : '/'}${normalized}`;
	}

	function getVideoById(videoId: string): VideoRow | undefined {
		return videos.find((row) => row.id === videoId);
	}

	function canPublishVideo(videoId: string): boolean {
		return getVideoById(videoId)?.ingest_status === 'ready';
	}

	async function fetchVideo(videoId: string): Promise<VideoRow> {
		const response = await fetch(`/api/v1/admin/videos/${videoId}`);
		const json = (await response.json()) as { success?: boolean; data?: VideoRow; error?: string };
		if (!response.ok || !json.success || !json.data) {
			throw new Error(json.error || 'Failed to fetch uploaded video');
		}
		return json.data;
	}

	function upsertVideoRow(nextVideo: VideoRow): void {
		let found = false;
		videos = videos.map((row) => {
			if (row.id !== nextVideo.id) return row;
			found = true;
			return nextVideo;
		});
		if (!found) videos = [nextVideo, ...videos];
		delete drafts[nextVideo.id];
		ensureDraft(nextVideo);
	}

	async function focusVideoRow(videoId: string): Promise<void> {
		highlightedVideoId = videoId;
		await tick();
		const row = document.getElementById(`video-row-${videoId}`) as HTMLDetailsElement | null;
		if (!row) return;
		row.open = true;
		row.scrollIntoView({ behavior: 'smooth', block: 'center' });
		row.focus();
	}

	function sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	async function monitorIngestUntilSettled(videoId: string): Promise<void> {
		const token = ++ingestMonitorToken;
		ingestMonitoringVideoId = videoId;
		const startedAt = Date.now();

		while (token === ingestMonitorToken && Date.now() - startedAt < INGEST_POLL_TIMEOUT_MS) {
			try {
				const refreshedVideo = await fetchVideo(videoId);
				if (token !== ingestMonitorToken) return;
				upsertVideoRow(refreshedVideo);

				if (refreshedVideo.ingest_status === 'ready') {
					ingestMonitoringVideoId = null;
					uploadMessage = 'Stream ingest is ready. You can publish this video now.';
					return;
				}

				if (refreshedVideo.ingest_status === 'failed') {
					ingestMonitoringVideoId = null;
					const reason = refreshedVideo.failure_reason?.trim();
					uploadMessage = reason
						? `Stream processing failed: ${reason}`
						: 'Stream processing failed. Review ingest details before publishing.';
					return;
				}
			} catch (error) {
				if (token === ingestMonitorToken) {
					ingestMonitoringVideoId = null;
					uploadMessage =
						error instanceof Error
							? `Could not refresh ingest status: ${error.message}`
							: 'Could not refresh ingest status';
				}
				return;
			}

			await sleep(INGEST_POLL_INTERVAL_MS);
		}

		if (token === ingestMonitorToken) {
			ingestMonitoringVideoId = null;
			uploadMessage = 'Upload is still processing in Stream. Publish once ingest status shows ready.';
		}
	}

	async function saveVideo(
		videoId: string,
		options?: {
			visibility?: EditDraft['visibility'];
			successMessage?: string;
		}
	) {
		actionMessage = null;
		actionError = null;
		actionBusy = true;
		try {
			const video = getVideoById(videoId);
			if (!video) throw new Error('Video not found');
			const draft = drafts[videoId];
			if (!draft) throw new Error('Missing draft state');
			const nextVisibility = options?.visibility ?? draft.visibility;

			if (!options?.visibility && !isVideoDirty(video)) {
				actionMessage = 'No changes to save.';
				return;
			}

			if (nextVisibility === 'published' && !canPublishVideo(videoId)) {
				throw new Error('Cannot publish until ingest status is ready.');
			}

			const payload: Record<string, unknown> = {
				title: draft.title,
				description: draft.description,
				tier: draft.tier,
				series_id: draft.series_id || null,
				episode_number: parseEpisodeNumber(draft.episode_number),
				thumbnail_path: draft.thumbnail_path,
				playback_policy: draft.playback_policy,
				visibility: nextVisibility,
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

				actionMessage = options?.successMessage || 'Video saved.';
		} catch (err) {
			actionError = err instanceof Error ? err.message : 'Failed to update video';
		} finally {
			actionBusy = false;
		}
	}

	async function archiveVideo(videoId: string) {
		actionMessage = null;
		actionError = null;

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

	function handleThumbnailFileChange(videoId: string, e: Event) {
		const input = e.target as HTMLInputElement;
		thumbnailFilesByVideoId[videoId] = input.files?.[0] || null;
		thumbnailUploadMessageByVideoId[videoId] = null;
		thumbnailUploadErrorByVideoId[videoId] = false;
	}

	async function uploadThumbnail(videoId: string) {
		const file = thumbnailFilesByVideoId[videoId];
		if (!file) {
			thumbnailUploadMessageByVideoId[videoId] = 'Choose an image file first.';
			thumbnailUploadErrorByVideoId[videoId] = true;
			return;
		}

		thumbnailUploadBusyByVideoId[videoId] = true;
		thumbnailUploadMessageByVideoId[videoId] = null;
		thumbnailUploadErrorByVideoId[videoId] = false;

		try {
			const formData = new FormData();
			formData.set('file', file);

			const response = await fetch(`/api/v1/admin/videos/${videoId}/thumbnail`, {
				method: 'POST',
				body: formData
			});

			const raw = await response.text();
			let payload: ThumbnailUploadJson | null = null;
			try {
				payload = JSON.parse(raw) as ThumbnailUploadJson;
			} catch {
				payload = null;
			}

			if (!response.ok || !payload?.success || !payload.data) {
				const message = payload?.error || (raw?.trim() ? raw.trim() : null) || 'Failed to upload thumbnail';
				throw new Error(message);
			}

			upsertVideoRow(payload.data);
			thumbnailFilesByVideoId[videoId] = null;
			thumbnailUploadMessageByVideoId[videoId] = `Thumbnail uploaded (${payload.upload?.width ?? '?'}x${payload.upload?.height ?? '?'})`;
			thumbnailUploadErrorByVideoId[videoId] = false;
		} catch (error) {
			thumbnailUploadMessageByVideoId[videoId] =
				error instanceof Error ? error.message : 'Failed to upload thumbnail';
			thumbnailUploadErrorByVideoId[videoId] = true;
		} finally {
			thumbnailUploadBusyByVideoId[videoId] = false;
		}
	}

	async function startUpload() {
		uploadMessage = null;
		uploadVideoId = null;
		uploadProgress = 0;
		highlightedVideoId = null;
		ingestMonitoringVideoId = null;
		ingestMonitorToken += 1;

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
			if (uploadVideoId) {
				const uploadedVideo = await fetchVideo(uploadVideoId);
				upsertVideoRow(uploadedVideo);
				await focusVideoRow(uploadVideoId);

				if (uploadedVideo.ingest_status === 'ready') {
					uploadMessage = 'Upload complete. Stream ingest is ready; you can publish now.';
				} else if (uploadedVideo.ingest_status === 'failed') {
					const reason = uploadedVideo.failure_reason?.trim();
					uploadMessage = reason
						? `Upload complete but processing failed: ${reason}`
						: 'Upload complete but processing failed.';
				} else {
					uploadMessage = 'Upload complete. Waiting for Stream ingest to reach ready…';
					void monitorIngestUntilSettled(uploadVideoId);
				}
			}
		} catch (err) {
			uploadMessage = err instanceof Error ? err.message : 'Upload failed';
		} finally {
			uploadBusy = false;
		}
	}

	onDestroy(() => {
		ingestMonitorToken += 1;
	});
</script>

<svelte:head>
	<title>Admin | Videos</title>
</svelte:head>

<svelte:window onkeydown={handleWindowKeydown} />

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

		<section class="panel upload-panel">
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

			<div class="actions upload-actions">
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

		<section class="panel videos-panel">
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

			<div class="actions filter-actions">
				<button class="btn" onclick={refreshVideos} disabled={isLoading || actionBusy}>
					<RefreshCw size={16} />
					<span>Apply</span>
				</button>
			</div>

			{#if hasActiveFilters()}
				<div class="active-filters" aria-label="Active filters">
					{#if q.trim()}
						<button class="filter-chip" onclick={() => void clearSingleFilter('q')}>
							<span>Search: "{q.trim()}"</span>
							<strong aria-hidden="true">×</strong>
						</button>
					{/if}
					{#if visibility !== 'all'}
						<button class="filter-chip" onclick={() => void clearSingleFilter('visibility')}>
							<span>Visibility: {visibility}</span>
							<strong aria-hidden="true">×</strong>
						</button>
					{/if}
					{#if ingestStatus !== 'all'}
						<button class="filter-chip" onclick={() => void clearSingleFilter('ingestStatus')}>
							<span>Ingest: {ingestStatus}</span>
							<strong aria-hidden="true">×</strong>
						</button>
					{/if}
					{#if tier !== 'all'}
						<button class="filter-chip" onclick={() => void clearSingleFilter('tier')}>
							<span>Tier: {tier}</span>
							<strong aria-hidden="true">×</strong>
						</button>
					{/if}
					{#if seriesId.trim()}
						<button class="filter-chip" onclick={() => void clearSingleFilter('seriesId')}>
							<span>Series: {seriesLabel(seriesId)}</span>
							<strong aria-hidden="true">×</strong>
						</button>
					{/if}
					{#if featured !== 'all'}
						<button class="filter-chip" onclick={() => void clearSingleFilter('featured')}>
							<span>Featured: {featured}</span>
							<strong aria-hidden="true">×</strong>
						</button>
					{/if}

					<button class="filter-chip clear-all-chip" onclick={() => void clearAllFilters()}>
						Clear all
					</button>
				</div>
			{/if}

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
					<details
						id={"video-row-" + v.id}
						class="video-card"
						class:highlighted={highlightedVideoId === v.id}
						tabindex="-1"
					>
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
									{#if isVideoDirty(v)}
										<span class="badge unsaved">unsaved changes</span>
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
										<option
											value="published"
											disabled={v.ingest_status !== 'ready' && drafts[v.id].visibility !== 'published'}
										>
											published
										</option>
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
									<span>Upload Thumbnail File</span>
									<input
										type="file"
										accept="image/jpeg,image/png,image/webp"
										onchange={(e) => handleThumbnailFileChange(v.id, e)}
									/>
								</label>

								<div class="field">
									<span>Thumbnail Upload</span>
									<button
										class="btn thumbnail-upload-btn"
										onclick={() => uploadThumbnail(v.id)}
										disabled={thumbnailUploadBusyByVideoId[v.id] || !thumbnailFilesByVideoId[v.id]}
									>
										<Upload size={16} />
										<span>{thumbnailUploadBusyByVideoId[v.id] ? 'Uploading…' : 'Upload Thumbnail'}</span>
									</button>
								</div>

								<label class="field span-2 readonly-field">
									<span>Stream UID</span>
									<input
										value={v.stream_uid || ''}
										placeholder="Pending Stream assignment"
										readonly
									/>
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

								<div class="thumbnail-preview span-3">
									<span>Thumbnail Preview</span>
									{#if drafts[v.id].thumbnail_path.trim()}
										<img
											src={getThumbnailSrc(drafts[v.id].thumbnail_path)}
											alt={`Thumbnail preview for ${drafts[v.id].title}`}
											loading="lazy"
										/>
										<p class="mono">{getThumbnailSrc(drafts[v.id].thumbnail_path)}</p>
									{:else}
										<p class="hint">No thumbnail path set.</p>
									{/if}

									{#if thumbnailUploadMessageByVideoId[v.id]}
										<p
											class="thumbnail-upload-status"
											class:error={thumbnailUploadErrorByVideoId[v.id]}
											class:success={!thumbnailUploadErrorByVideoId[v.id]}
										>
											{thumbnailUploadMessageByVideoId[v.id]}
										</p>
									{/if}
								</div>
								</div>
							</div>

							{#if v.asset_path}
								<details class="legacy-debug">
									<summary>Legacy asset path (read-only debug)</summary>
									<p class="mono">{v.asset_path}</p>
								</details>
							{/if}

							{#if v.ingest_status !== 'ready'}
								<p class="hint warning">
									Publishing is disabled while ingest is <span class="mono">{v.ingest_status}</span>.
								</p>
							{/if}
							{#if ingestMonitoringVideoId === v.id}
								<p class="hint">Checking Stream ingest status…</p>
							{/if}

								<div class="row-actions">
									<div class="row-actions-meta">
										{#if isVideoDirty(v)}
											<p class="dirty-state">Unsaved changes</p>
										{:else}
											<p class="saved-state">All changes saved</p>
										{/if}
									</div>
									<div class="row-actions-buttons">
										<a class="btn" href={`/watch/${v.id}`} target="_blank" rel="noreferrer">
											<ExternalLink size={16} />
											<span>Preview</span>
										</a>
										<button
											class="btn"
											onclick={() => saveVideo(v.id)}
											disabled={actionBusy || !isVideoDirty(v)}
										>
											<Save size={16} />
											<span>Save</span>
										</button>
										<button
											class="btn primary"
											onclick={() => requestPublishVideo(v.id)}
											disabled={actionBusy || !canPublishVideo(v.id)}
										>
											<Save size={16} />
											<span>Publish</span>
										</button>
										<button class="btn danger" onclick={() => requestArchiveVideo(v.id)} disabled={actionBusy}>
											<Archive size={16} />
											<span>Archive</span>
										</button>
									</div>
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

{#if confirmDialog}
	<div
		class="confirm-overlay"
		role="presentation"
		onclick={(event) => {
			if (event.target === event.currentTarget) {
				closeConfirmDialog();
			}
		}}
	>
		<div class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
			<h3 id="confirm-title">
				{confirmDialog.action === 'archive' ? 'Archive this video?' : 'Publish this video?'}
			</h3>
			<p>
				{#if confirmDialog.action === 'archive'}
					This will hide "{confirmDialog.videoTitle}" from public catalog views.
				{:else}
					This will set "{confirmDialog.videoTitle}" to published for public catalog visibility.
				{/if}
			</p>
			<div class="confirm-actions">
				<button class="btn" onclick={closeConfirmDialog} disabled={actionBusy}>
					Cancel
				</button>
				<button
					class={`btn ${confirmDialog.action === 'archive' ? 'danger' : 'primary'}`}
					onclick={confirmDialogAction}
					disabled={actionBusy}
				>
					{#if actionBusy}
						Working…
					{:else if confirmDialog.action === 'archive'}
						Archive video
					{:else}
						Publish video
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

	<style>
		.admin-wrap {
			max-width: 1120px;
			margin: 0 auto;
			padding: 6.5rem 1.75rem 3.5rem;
		}
		.admin-header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 1.5rem;
			margin-bottom: 1.6rem;
			flex-wrap: wrap;
		}

		.admin-title {
			display: grid;
			gap: 0.2rem;
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
			margin-left: auto;
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
			padding: 1.35rem 1.45rem;
			margin-bottom: 1rem;
			display: grid;
			gap: 0.95rem;
		}

		.upload-panel {
			gap: 0.85rem;
		}

		.videos-panel {
			gap: 0.85rem;
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
			font-size: 1.12rem;
		}

		.hint {
			margin: 0.25rem 0 0;
			color: var(--color-fg-muted);
			font-size: 0.875rem;
		}

		.grid {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 0.85rem 0.9rem;
		}

		.field {
			display: flex;
			flex-direction: column;
			gap: 0.35rem;
			min-width: 0;
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
			width: 100%;
			min-width: 0;
			border-radius: 0.75rem;
			border: 1px solid var(--color-border-default);
			background: rgba(0, 0, 0, 0.25);
			color: var(--color-fg-primary);
			padding: 0 0.85rem;
			outline: none;
		}

		.field input[type='file'] {
			height: auto;
			min-height: 2.6rem;
			padding: 0.5rem 0.65rem;
		}

		.field input[type='file']::file-selector-button {
			margin-right: 0.6rem;
			padding: 0.4rem 0.7rem;
			border-radius: 0.55rem;
			border: 1px solid var(--color-border-default);
			background: rgba(255, 255, 255, 0.05);
			color: var(--color-fg-primary);
			font-size: 0.82rem;
			font-weight: 600;
			cursor: pointer;
			transition: background var(--duration-micro) var(--ease-standard);
		}

		.field input[type='file']::file-selector-button:hover {
			background: rgba(255, 255, 255, 0.1);
		}

	.thumbnail-upload-btn {
		width: 100%;
		justify-content: center;
	}

	.readonly-field input {
		background: rgba(255, 255, 255, 0.06);
		color: var(--color-fg-secondary);
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
			flex-wrap: wrap;
		}

		.upload-actions {
			justify-content: flex-start;
		}

		.filter-actions {
			grid-column: 1 / -1;
			justify-content: flex-end;
			margin-top: 0.1rem;
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

	.legacy-debug {
		margin-top: 0.85rem;
		padding: 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 0.75rem;
		background: rgba(255, 255, 255, 0.02);
	}

	.legacy-debug summary {
		cursor: pointer;
		font-size: 0.8rem;
		color: var(--color-fg-muted);
	}

	.legacy-debug p {
		margin: 0.6rem 0 0;
		color: var(--color-fg-secondary);
		word-break: break-all;
	}

	.warning {
		color: rgba(255, 220, 140, 0.95);
	}

		.filters {
			display: grid;
			grid-template-columns: minmax(0, 1.5fr) repeat(5, minmax(0, 1fr));
			gap: 0.75rem 0.7rem;
			align-items: end;
			margin-bottom: 1rem;
		}
		.active-filters {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
			margin: -0.2rem 0 0.65rem;
		}

		.filter-chip {
			display: inline-flex;
			align-items: center;
			gap: 0.45rem;
			padding: 0.38rem 0.68rem;
			border-radius: 9999px;
			border: 1px solid rgba(255, 255, 255, 0.16);
			background: rgba(255, 255, 255, 0.05);
			color: var(--color-fg-secondary);
			font-size: 0.78rem;
			cursor: pointer;
			transition: background var(--duration-micro) var(--ease-standard);
		}

		.filter-chip strong {
			font-size: 0.86rem;
			line-height: 1;
		}

		.filter-chip:hover {
			background: rgba(255, 255, 255, 0.1);
		}

		.clear-all-chip {
			border-color: rgba(244, 81, 38, 0.35);
			color: rgba(255, 225, 215, 0.96);
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
			overflow: visible;
		}

	.video-card.highlighted {
		border-color: rgba(244, 81, 38, 0.5);
		box-shadow: 0 0 0 1px rgba(244, 81, 38, 0.25);
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

		.badge.unsaved {
			border-color: rgba(244, 81, 38, 0.45);
			color: rgba(255, 220, 205, 0.95);
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
			gap: 0.75rem;
			justify-content: space-between;
			align-items: center;
			flex-wrap: wrap;
			position: sticky;
			bottom: -1px;
			padding: 0.7rem 0 0.2rem;
			border-top: 1px solid rgba(255, 255, 255, 0.08);
			background: linear-gradient(
				180deg,
				rgba(18, 18, 20, 0.22) 0%,
				rgba(18, 18, 20, 0.93) 35%,
				rgba(18, 18, 20, 0.95) 100%
			);
			backdrop-filter: blur(6px);
		}

		.row-actions-meta p {
			margin: 0;
			font-size: 0.82rem;
		}

		.dirty-state {
			color: rgba(255, 220, 160, 0.95);
		}

		.saved-state {
			color: var(--color-fg-muted);
		}

		.row-actions-buttons {
			display: flex;
			gap: 0.5rem;
			flex-wrap: wrap;
			justify-content: flex-end;
		}

	.thumbnail-preview {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 0.75rem;
		background: rgba(255, 255, 255, 0.02);
	}

	.thumbnail-preview img {
		width: min(360px, 100%);
		aspect-ratio: 16 / 9;
		object-fit: cover;
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(0, 0, 0, 0.2);
	}

	.thumbnail-preview p {
		margin: 0;
		color: var(--color-fg-muted);
		word-break: break-all;
	}

	.thumbnail-upload-status {
		margin: 0;
		font-size: 0.85rem;
	}

	.thumbnail-upload-status.success {
		color: rgba(210, 255, 230, 0.95);
	}

	.thumbnail-upload-status.error {
		color: rgba(255, 220, 220, 0.95);
	}

		.mono {
			font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
				monospace;
		}

		.confirm-overlay {
			position: fixed;
			inset: 0;
			z-index: 80;
			background: rgba(0, 0, 0, 0.62);
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 1.25rem;
		}

		.confirm-modal {
			width: min(28rem, 100%);
			background: rgba(22, 22, 24, 0.98);
			border: 1px solid rgba(255, 255, 255, 0.16);
			border-radius: 0.95rem;
			padding: 1.15rem 1.2rem;
			box-shadow: 0 20px 48px rgba(0, 0, 0, 0.45);
		}

		.confirm-modal h3 {
			margin: 0;
			font-size: 1.1rem;
			color: var(--color-fg-primary);
		}

		.confirm-modal p {
			margin: 0.65rem 0 0;
			color: var(--color-fg-secondary);
		}

		.confirm-actions {
			margin-top: 1rem;
			display: flex;
			justify-content: flex-end;
			gap: 0.55rem;
			flex-wrap: wrap;
		}

			@media (max-width: 980px) {
				.admin-wrap {
				padding: 6rem 1.2rem 2.6rem;
			}

			.panel {
				padding: 1.1rem 1rem;
			}

			.filters {
				grid-template-columns: 1fr;
			}

			.filter-actions {
				justify-content: flex-start;
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
					position: static;
					padding-top: 0.9rem;
					border-top: 1px solid rgba(255, 255, 255, 0.08);
					background: transparent;
					backdrop-filter: none;
					justify-content: flex-start;
				}

				.row-actions-buttons {
					justify-content: flex-start;
				}
			}
	</style>

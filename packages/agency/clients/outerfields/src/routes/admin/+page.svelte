<script lang="ts">
	import {
		ShieldCheck,
		Upload,
		RefreshCw,
		Save,
		Trash2,
		Pencil,
		X,
		FolderTree,
		Film
	} from 'lucide-svelte';
	import type { PageData } from './$types';

	type Tier = 'free' | 'preview' | 'gated';

	interface VideoRecord {
		id: string;
		title: string;
		category: string;
		episode_number: number | null;
		tier: Tier;
		duration: number;
		asset_path: string;
		thumbnail_path: string;
		description: string | null;
		created_at: number;
		updated_at: number;
	}

	interface CategorySummary {
		category: string;
		total: number;
		free: number;
		preview: number;
		gated: number;
	}

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let videos = $state<VideoRecord[]>([]);
	let categories = $state<CategorySummary[]>([]);
	let totalVideos = $state(0);

	$effect(() => {
		videos = data.videos as VideoRecord[];
		categories = data.categories as CategorySummary[];
		totalVideos = data.totalVideos;
	});

	let search = $state('');
	let tierFilter = $state<'all' | Tier>('all');
	let statusMessage = $state<{ kind: 'success' | 'error'; text: string } | null>(null);

	let isRefreshing = $state(false);
	let isUploading = $state(false);
	let isSavingEdit = $state(false);

	let uploadTitle = $state('');
	let uploadCategory = $state('');
	let uploadTier = $state<Tier>('preview');
	let uploadDuration = $state('');
	let uploadEpisode = $state('');
	let uploadDescription = $state('');
	let uploadAssetPath = $state('');
	let uploadThumbnailPath = $state('');
	let uploadVideoFile = $state<File | null>(null);
	let uploadThumbnailFile = $state<File | null>(null);

	let editVideoId = $state<string | null>(null);
	let editTitle = $state('');
	let editCategory = $state('');
	let editTier = $state<Tier>('preview');
	let editDuration = $state('');
	let editEpisode = $state('');
	let editDescription = $state('');
	let editAssetPath = $state('');
	let editThumbnailPath = $state('');

	let renameDrafts = $state<Record<string, string>>({});
	let renamingCategory = $state<string | null>(null);

	$effect(() => {
		for (const cat of categories) {
			if (!(cat.category in renameDrafts)) {
				renameDrafts[cat.category] = cat.category;
			}
		}
	});

	const filteredVideos = $derived.by(() => {
		return videos.filter((video) => {
			const matchesSearch =
				search.trim().length === 0 ||
				video.title.toLowerCase().includes(search.toLowerCase()) ||
				video.category.toLowerCase().includes(search.toLowerCase());
			const matchesTier = tierFilter === 'all' || video.tier === tierFilter;
			return matchesSearch && matchesTier;
		});
	});

	function formatDuration(totalSeconds: number): string {
		const seconds = Math.max(0, Math.floor(totalSeconds));
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function formatDate(epochMs: number): string {
		return new Date(epochMs).toLocaleDateString();
	}

	function clearStatus() {
		statusMessage = null;
	}

	async function refreshData() {
		clearStatus();
		isRefreshing = true;
		try {
			const response = await fetch('/api/admin/videos');
			const result = await response.json();
			if (!response.ok || !result.success) {
				throw new Error(result.error || 'Failed to refresh videos');
			}
			videos = result.data.videos;
			categories = result.data.categories;
			totalVideos = result.data.total;
		} catch (error) {
			statusMessage = {
				kind: 'error',
				text: error instanceof Error ? error.message : 'Failed to refresh data'
			};
		} finally {
			isRefreshing = false;
		}
	}

	function resetUploadForm() {
		uploadTitle = '';
		uploadCategory = '';
		uploadTier = 'preview';
		uploadDuration = '';
		uploadEpisode = '';
		uploadDescription = '';
		uploadAssetPath = '';
		uploadThumbnailPath = '';
		uploadVideoFile = null;
		uploadThumbnailFile = null;
	}

	async function handleUploadSubmit(event: SubmitEvent) {
		event.preventDefault();
		clearStatus();
		isUploading = true;
		try {
			const formData = new FormData();
			formData.set('title', uploadTitle);
			formData.set('category', uploadCategory);
			formData.set('tier', uploadTier);
			formData.set('duration', uploadDuration);
			formData.set('episodeNumber', uploadEpisode);
			formData.set('description', uploadDescription);
			formData.set('assetPath', uploadAssetPath);
			formData.set('thumbnailPath', uploadThumbnailPath);

			if (uploadVideoFile) {
				formData.set('video', uploadVideoFile);
			}
			if (uploadThumbnailFile) {
				formData.set('thumbnail', uploadThumbnailFile);
			}

			const response = await fetch('/api/admin/videos', {
				method: 'POST',
				body: formData
			});
			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.error || 'Failed to upload video');
			}

			await refreshData();
			resetUploadForm();
			statusMessage = { kind: 'success', text: 'Video uploaded successfully.' };
		} catch (error) {
			statusMessage = {
				kind: 'error',
				text: error instanceof Error ? error.message : 'Failed to upload video'
			};
		} finally {
			isUploading = false;
		}
	}

	function beginEdit(video: VideoRecord) {
		editVideoId = video.id;
		editTitle = video.title;
		editCategory = video.category;
		editTier = video.tier;
		editDuration = String(video.duration);
		editEpisode = video.episode_number === null ? '' : String(video.episode_number);
		editDescription = video.description || '';
		editAssetPath = video.asset_path;
		editThumbnailPath = video.thumbnail_path;
		clearStatus();
	}

	function cancelEdit() {
		editVideoId = null;
	}

	async function saveEdit() {
		if (!editVideoId) return;
		clearStatus();
		isSavingEdit = true;
		try {
			const response = await fetch(`/api/admin/videos/${editVideoId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: editTitle,
					category: editCategory,
					tier: editTier,
					duration: editDuration,
					episodeNumber: editEpisode,
					description: editDescription,
					assetPath: editAssetPath,
					thumbnailPath: editThumbnailPath
				})
			});
			const result = await response.json();
			if (!response.ok || !result.success) {
				throw new Error(result.error || 'Failed to update video');
			}

			await refreshData();
			editVideoId = null;
			statusMessage = { kind: 'success', text: 'Video updated.' };
		} catch (error) {
			statusMessage = {
				kind: 'error',
				text: error instanceof Error ? error.message : 'Failed to update video'
			};
		} finally {
			isSavingEdit = false;
		}
	}

	async function handleDelete(video: VideoRecord) {
		const confirmed = window.confirm(`Delete "${video.title}"? This removes it from listings.`);
		if (!confirmed) return;

		clearStatus();
		try {
			const response = await fetch(`/api/admin/videos/${video.id}`, { method: 'DELETE' });
			const result = await response.json();
			if (!response.ok || !result.success) {
				throw new Error(result.error || 'Failed to delete video');
			}

			await refreshData();
			statusMessage = { kind: 'success', text: 'Video deleted.' };
		} catch (error) {
			statusMessage = {
				kind: 'error',
				text: error instanceof Error ? error.message : 'Failed to delete video'
			};
		}
	}

	async function renameCategory(category: string) {
		const nextName = (renameDrafts[category] || '').trim();
		if (!nextName || nextName === category) return;

		clearStatus();
		renamingCategory = category;
		try {
			const response = await fetch('/api/admin/categories', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ from: category, to: nextName })
			});
			const result = await response.json();
			if (!response.ok || !result.success) {
				throw new Error(result.error || 'Failed to rename category');
			}

			await refreshData();
			statusMessage = { kind: 'success', text: `Renamed "${category}" to "${nextName}".` };
		} catch (error) {
			statusMessage = {
				kind: 'error',
				text: error instanceof Error ? error.message : 'Failed to rename category'
			};
		} finally {
			renamingCategory = null;
		}
	}
</script>

<svelte:head>
	<title>Admin | OUTERFIELDS</title>
</svelte:head>

<div class="admin-page">
	<header class="admin-header">
		<div>
			<p class="eyebrow">Creator Workspace</p>
			<h1>Video Management</h1>
			<p class="subtitle">Upload, organize, and publish videos for the subscriber library.</p>
		</div>
		<div class="header-actions">
			<a href="/demo" class="btn-secondary">View User Library</a>
			<button class="btn-primary" onclick={refreshData} disabled={isRefreshing}>
				<RefreshCw size={16} class={isRefreshing ? 'spin' : ''} />
				Refresh
			</button>
		</div>
	</header>

	<section class="stats-grid">
		<div class="stat-card">
			<Film size={18} />
			<div>
				<span class="stat-label">Total Videos</span>
				<span class="stat-value">{totalVideos}</span>
			</div>
		</div>
		<div class="stat-card">
			<FolderTree size={18} />
			<div>
				<span class="stat-label">Categories</span>
				<span class="stat-value">{categories.length}</span>
			</div>
		</div>
		<div class="stat-card">
			<ShieldCheck size={18} />
			<div>
				<span class="stat-label">Signed In As</span>
				<span class="stat-value">{data.user.name}</span>
			</div>
		</div>
	</section>

	{#if statusMessage}
		<div class="status-banner {statusMessage.kind}">
			{statusMessage.text}
		</div>
	{/if}

	<section class="card upload-card">
		<h2>Upload New Video</h2>
		<form class="upload-form" onsubmit={handleUploadSubmit}>
			<div class="field-grid">
				<label>
					Title
					<input type="text" bind:value={uploadTitle} required />
				</label>
				<label>
					Category
					<input type="text" bind:value={uploadCategory} placeholder="e.g. crew-call" required />
				</label>
				<label>
					Tier
					<select bind:value={uploadTier}>
						<option value="free">free</option>
						<option value="preview">preview</option>
						<option value="gated">gated</option>
					</select>
				</label>
				<label>
					Duration (seconds)
					<input type="number" min="1" bind:value={uploadDuration} required />
				</label>
				<label>
					Episode (optional)
					<input type="number" min="1" bind:value={uploadEpisode} />
				</label>
				<label>
					Thumbnail Path (optional)
					<input type="text" bind:value={uploadThumbnailPath} placeholder="/thumbnails/... or https://..." />
				</label>
			</div>

			<label>
				Description
				<textarea rows="3" bind:value={uploadDescription}></textarea>
			</label>

			<label>
				Existing Video Asset Path/URL (optional if uploading a file)
				<input type="text" bind:value={uploadAssetPath} placeholder="/videos/uploads/my-video.mp4 or https://..." />
			</label>

			<div class="file-row">
				<label>
					Video File (optional)
					<input
						type="file"
						accept="video/mp4,video/webm,video/quicktime"
						onchange={(event) => {
							const input = event.currentTarget as HTMLInputElement;
							uploadVideoFile = input.files?.[0] || null;
						}}
					/>
				</label>
				<label>
					Thumbnail File (optional)
					<input
						type="file"
						accept="image/*"
						onchange={(event) => {
							const input = event.currentTarget as HTMLInputElement;
							uploadThumbnailFile = input.files?.[0] || null;
						}}
					/>
				</label>
			</div>

			<div class="actions-row">
				<button type="button" class="btn-secondary" onclick={resetUploadForm}>Reset</button>
				<button type="submit" class="btn-primary" disabled={isUploading}>
					<Upload size={16} />
					{isUploading ? 'Uploading…' : 'Upload Video'}
				</button>
			</div>
		</form>
	</section>

	<section class="card listing-card">
		<div class="section-header">
			<h2>Video Listings</h2>
			<div class="filters">
				<input type="search" placeholder="Search title/category…" bind:value={search} />
				<select bind:value={tierFilter}>
					<option value="all">All tiers</option>
					<option value="free">free</option>
					<option value="preview">preview</option>
					<option value="gated">gated</option>
				</select>
			</div>
		</div>

		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>Title</th>
						<th>Category</th>
						<th>Tier</th>
						<th>Duration</th>
						<th>Episode</th>
						<th>Created</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#if filteredVideos.length === 0}
						<tr>
							<td colspan="7" class="empty">No videos match your filters.</td>
						</tr>
					{:else}
						{#each filteredVideos as video}
							<tr class:editing={editVideoId === video.id}>
								<td>{video.title}</td>
								<td>{video.category}</td>
								<td><span class="tier-badge">{video.tier}</span></td>
								<td>{formatDuration(video.duration)}</td>
								<td>{video.episode_number ?? '-'}</td>
								<td>{formatDate(video.created_at)}</td>
								<td>
									<div class="row-actions">
										<a href={`/watch/${video.id}`} class="link-btn">Watch</a>
										<button class="icon-btn" onclick={() => beginEdit(video)} title="Edit">
											<Pencil size={14} />
										</button>
										<button class="icon-btn danger" onclick={() => handleDelete(video)} title="Delete">
											<Trash2 size={14} />
										</button>
									</div>
								</td>
							</tr>
							{#if editVideoId === video.id}
								<tr>
									<td colspan="7">
										<div class="edit-panel">
											<div class="field-grid">
												<label>Title <input type="text" bind:value={editTitle} /></label>
												<label>Category <input type="text" bind:value={editCategory} /></label>
												<label>
													Tier
													<select bind:value={editTier}>
														<option value="free">free</option>
														<option value="preview">preview</option>
														<option value="gated">gated</option>
													</select>
												</label>
												<label>Duration <input type="number" min="1" bind:value={editDuration} /></label>
												<label>Episode <input type="number" min="1" bind:value={editEpisode} /></label>
												<label>Thumbnail Path <input type="text" bind:value={editThumbnailPath} /></label>
											</div>
											<label>Asset Path <input type="text" bind:value={editAssetPath} /></label>
											<label>Description <textarea rows="2" bind:value={editDescription}></textarea></label>
											<div class="actions-row">
												<button class="btn-secondary" onclick={cancelEdit}>
													<X size={16} />
													Cancel
												</button>
												<button class="btn-primary" onclick={saveEdit} disabled={isSavingEdit}>
													<Save size={16} />
													{isSavingEdit ? 'Saving…' : 'Save'}
												</button>
											</div>
										</div>
									</td>
								</tr>
							{/if}
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</section>

	<section class="card category-card">
		<h2>Category Management</h2>
		<div class="category-list">
			{#if categories.length === 0}
				<p class="empty">No categories found.</p>
			{:else}
				{#each categories as category}
					<div class="category-row">
						<div>
							<p class="category-name">{category.category}</p>
							<p class="category-meta">
								{category.total} total · free {category.free} · preview {category.preview} · gated {category.gated}
							</p>
						</div>
						<div class="rename-controls">
							<input
								type="text"
								value={renameDrafts[category.category]}
								oninput={(event) => {
									const input = event.currentTarget as HTMLInputElement;
									renameDrafts[category.category] = input.value;
								}}
							/>
							<button
								class="btn-secondary"
								onclick={() => renameCategory(category.category)}
								disabled={renamingCategory === category.category}
							>
								{renamingCategory === category.category ? 'Renaming…' : 'Rename'}
							</button>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</section>
</div>

<style>
	.admin-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 6rem 1.25rem 3rem;
		display: grid;
		gap: 1rem;
	}

	.admin-header {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		align-items: flex-end;
	}

	.eyebrow {
		margin: 0;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-fg-subtle);
	}

	h1 {
		margin: 0.25rem 0;
		font-size: clamp(1.6rem, 2.5vw, 2.2rem);
	}

	.subtitle {
		margin: 0;
		color: var(--color-fg-muted);
	}

	.header-actions {
		display: flex;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.stats-grid {
		display: grid;
		gap: 0.75rem;
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.stat-card {
		display: flex;
		gap: 0.65rem;
		align-items: center;
		padding: 0.9rem;
		background: var(--glass-bg);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
	}

	.stat-label {
		display: block;
		font-size: 0.75rem;
		color: var(--color-fg-subtle);
	}

	.stat-value {
		display: block;
		font-size: 1rem;
		font-weight: 600;
	}

	.status-banner {
		padding: 0.8rem 1rem;
		border-radius: 0.6rem;
		font-size: 0.9rem;
		border: 1px solid transparent;
	}

	.status-banner.success {
		background: var(--color-success-muted);
		border-color: var(--color-success-border);
	}

	.status-banner.error {
		background: var(--color-error-muted);
		border-color: var(--color-error-border);
	}

	.card {
		padding: 1rem;
		background: var(--glass-bg);
		border: 1px solid var(--color-border-default);
		border-radius: 0.9rem;
	}

	h2 {
		margin: 0 0 0.9rem;
		font-size: 1.1rem;
	}

	label {
		display: grid;
		gap: 0.35rem;
		font-size: 0.82rem;
		color: var(--color-fg-secondary);
	}

	input,
	select,
	textarea {
		width: 100%;
		padding: 0.6rem 0.7rem;
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		color: var(--color-fg-primary);
		font-size: 0.9rem;
		box-sizing: border-box;
	}

	.upload-form,
	.edit-panel {
		display: grid;
		gap: 0.75rem;
	}

	.field-grid {
		display: grid;
		gap: 0.7rem;
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.file-row {
		display: grid;
		gap: 0.7rem;
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.actions-row {
		display: flex;
		gap: 0.6rem;
		justify-content: flex-end;
		flex-wrap: wrap;
	}

	.spin {
		animation: spin 1.2s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.8rem;
		margin-bottom: 0.8rem;
		flex-wrap: wrap;
	}

	.filters {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.filters input {
		min-width: 240px;
	}

	.table-wrap {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		min-width: 900px;
	}

	th,
	td {
		padding: 0.65rem;
		border-bottom: 1px solid var(--color-border-default);
		text-align: left;
		vertical-align: top;
		font-size: 0.86rem;
	}

	th {
		color: var(--color-fg-subtle);
		font-weight: 600;
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	tr.editing td {
		background: var(--color-bg-subtle);
	}

	.tier-badge {
		display: inline-block;
		padding: 0.2rem 0.45rem;
		border-radius: 999px;
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		font-size: 0.72rem;
	}

	.row-actions {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.link-btn {
		display: inline-flex;
		align-items: center;
		padding: 0.3rem 0.55rem;
		border-radius: 0.4rem;
		border: 1px solid var(--color-border-default);
		color: var(--color-fg-secondary);
		text-decoration: none;
		font-size: 0.75rem;
	}

	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.4rem;
		border-radius: 0.4rem;
		border: 1px solid var(--color-border-default);
		background: var(--color-bg-subtle);
		color: var(--color-fg-secondary);
		cursor: pointer;
	}

	.icon-btn.danger {
		color: #ffb4b4;
	}

	.edit-panel {
		padding: 0.8rem;
		border: 1px solid var(--color-border-default);
		border-radius: 0.6rem;
		background: var(--color-bg-subtle);
	}

	.category-list {
		display: grid;
		gap: 0.55rem;
	}

	.category-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.8rem;
		padding: 0.65rem;
		border: 1px solid var(--color-border-default);
		border-radius: 0.6rem;
		background: var(--color-bg-subtle);
	}

	.category-name {
		margin: 0;
		font-weight: 600;
	}

	.category-meta {
		margin: 0.15rem 0 0;
		font-size: 0.78rem;
		color: var(--color-fg-subtle);
	}

	.rename-controls {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.rename-controls input {
		min-width: 220px;
	}

	.empty {
		text-align: center;
		color: var(--color-fg-muted);
		padding: 1rem;
	}

	@media (max-width: 900px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}

		.field-grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	@media (max-width: 640px) {
		.admin-page {
			padding-top: 5.5rem;
		}

		.field-grid,
		.file-row {
			grid-template-columns: 1fr;
		}

		.rename-controls {
			width: 100%;
			flex-direction: column;
			align-items: stretch;
		}

		.rename-controls input {
			min-width: 0;
		}
	}
</style>

<script lang="ts">
	import { uploadThreadAttachments } from '$chat/client-actions';
	import type { WidgetOf } from './types';

export let widget: WidgetOf<'document_upload'>;
export let threadId = '';
export let intakeProtectedActionsBlocked = false;
export let intakeProtectionMessage = '';

	let pending = false;
	let actionError = '';
	let formVersion = 0;
	let selectedFiles: Record<string, File | undefined> = {};

	$: selectedUploads = Object.entries(selectedFiles)
		.filter((entry): entry is [string, File] => entry[1] instanceof File)
		.map(([documentKey, file]) => ({ documentKey, file }));

	function formatFileSize(byteSize?: number) {
		if (typeof byteSize !== 'number' || Number.isNaN(byteSize)) {
			return '';
		}

		if (byteSize < 1024) {
			return `${byteSize} B`;
		}

		if (byteSize < 1024 * 1024) {
			return `${(byteSize / 1024).toFixed(1)} KB`;
		}

		return `${(byteSize / (1024 * 1024)).toFixed(1)} MB`;
	}

	function handleFileChange(documentKey: string, event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) {
			const nextFiles = { ...selectedFiles };
			delete nextFiles[documentKey];
			selectedFiles = nextFiles;
			return;
		}

		selectedFiles = {
			...selectedFiles,
			[documentKey]: file
		};
	}

	async function uploadDocuments() {
		if (selectedUploads.length === 0) {
			actionError = 'Choose at least one file before uploading.';
			return;
		}

		pending = true;
		actionError = '';

		try {
			await uploadThreadAttachments(threadId, selectedUploads);
			selectedFiles = {};
			formVersion += 1;
		} catch (error) {
			actionError =
				error instanceof Error ? error.message : 'Unable to upload the selected documents.';
		} finally {
			pending = false;
		}
	}
</script>

<div class="stack">
	<p>{widget.data.description}</p>

	<div class="meta-row">
		<div class="meta">
			{#if widget.data.status === 'partial'}
				Some files are already attached. Upload the remaining file right here in chat to keep moving.
			{:else if widget.data.status === 'uploaded'}
				The required files are attached. Upload again here to replace a document if you need to.
			{:else}
				Upload the required files right here in this chat thread. You do not need another login or a separate portal.
			{/if}
		</div>
		<span class={`status-pill ${widget.data.status === 'uploaded' ? 'good' : 'warn'}`}>
			{widget.data.status}
		</span>
	</div>

	{#key formVersion}
		<div class="document-list">
			{#each widget.data.documents as document}
				<div class="document-row">
					<div class="document-copy">
						<div class="document-header">
							<strong>{document.title}</strong>
							<span class={`status-pill ${document.status === 'uploaded' ? 'good' : 'warn'}`}>
								{document.status}
							</span>
						</div>
						<div class="muted">Accepted types: {document.acceptedTypes.join(', ')}</div>
						{#if document.fileName}
							<div class="muted">
								Attached: {document.fileName}
								{#if document.byteSize}
									• {formatFileSize(document.byteSize)}
								{/if}
							</div>
						{/if}
						{#if selectedFiles[document.key]}
							<div class="selection-note">Selected: {selectedFiles[document.key]?.name}</div>
						{/if}
						{#if document.href}
							<a class="inline-link" href={document.href}>Download current file</a>
						{/if}
					</div>

					<label class="upload-control">
						<span>{document.status === 'uploaded' ? 'Replace file here' : 'Choose file here'}</span>
						<input
							type="file"
							accept={document.accept}
							on:change={(event) => handleFileChange(document.key, event)}
							disabled={pending || intakeProtectedActionsBlocked}
						/>
					</label>
				</div>
			{/each}
		</div>
	{/key}

	<button
		type="button"
		on:click={uploadDocuments}
		disabled={pending || selectedUploads.length === 0 || intakeProtectedActionsBlocked}
	>
		{#if pending}
			Uploading...
		{:else if selectedUploads.length > 0}
			Upload {selectedUploads.length} selected file{selectedUploads.length === 1 ? '' : 's'}
		{:else}
			{widget.data.uploadLabel}
		{/if}
	</button>

	{#if intakeProtectedActionsBlocked}
		<div class="access-note warn">
			<strong>Secure verification required</strong>
			<p>{intakeProtectionMessage}</p>
		</div>
	{/if}

	{#if actionError}
		<p class="error-text">{actionError}</p>
	{/if}
</div>

<style>
	.stack {
		display: grid;
		gap: 0.9rem;
	}

	.meta-row {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
		align-items: center;
	}

	.document-list {
		display: grid;
		gap: 0.9rem;
	}

	.document-row {
		display: grid;
		gap: 0.85rem;
		padding: 0.95rem;
		border-radius: 18px;
		background: var(--surface-soft);
		border: 1px solid var(--line);
	}

	.document-copy {
		display: grid;
		gap: 0.35rem;
	}

	.document-header {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
		align-items: center;
	}

	.upload-control {
		display: grid;
		gap: 0.45rem;
		font-size: 0.92rem;
		color: var(--muted);
	}

	.selection-note {
		color: var(--ink);
		font-size: 0.9rem;
	}

	.access-note {
		display: grid;
		gap: 0.45rem;
		padding: 0.9rem 1rem;
		border-radius: 16px;
		border: 1px solid rgba(255, 214, 153, 0.24);
		background: var(--surface-soft);
	}

	.meta,
	p {
		margin: 0;
	}

	.error-text {
		margin: 0;
		color: var(--danger);
		font-size: 0.92rem;
	}
</style>

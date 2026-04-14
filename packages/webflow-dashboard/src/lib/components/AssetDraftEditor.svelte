<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import {
		APP_CAPABILITY_OPTIONS,
		APP_CATEGORY_OPTIONS,
		APP_SCREENSHOT_ALT_LIMIT,
		APP_SCREENSHOT_RATIO,
		APP_SCOPE_OPTIONS,
		PAYMENT_TYPE_OPTIONS,
		VISIBILITY_OPTIONS,
		createEmptyAppDraft,
		createEmptyTemplateDraft,
		joinDraftList,
		normalizeAppDraftData,
		normalizeTemplateDraftData,
		parseDraftListInput,
		type AppAssetDraftData,
		type AssetDraftRecord,
		type AssetDraftType,
		type TemplateAssetDraftData
	} from '$lib/drafts';
	import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from './ui';
	import ImageUploader from './ImageUploader.svelte';
	import CarouselUploader from './CarouselUploader.svelte';
	import SecondaryThumbnailUploader from './SecondaryThumbnailUploader.svelte';
	import { toast } from '$lib/stores/toast';
	import { trackEvent } from '$lib/utils/analytics';

	interface Props {
		userEmail: string;
		draft?: AssetDraftRecord | null;
	}

	let { userEmail, draft = null }: Props = $props();

	let activeType = $state<AssetDraftType>('Template');
	let draftRecord = $state<AssetDraftRecord | null>(null);
	let currentDraftId = $state<string | null>(null);
	let savedAt = $state<string | null>(null);

	let templateDraft = $state<TemplateAssetDraftData>(createEmptyTemplateDraft());
	let appDraft = $state<AppAssetDraftData>(createEmptyAppDraft());

	let templateTagsInput = $state('');
	let templateStyleTagsInput = $state('');
	let templateSiteTypesInput = $state('');
	let templateFeatureFlagsInput = $state('');

	let isSaving = $state(false);
	let isPromoting = $state(false);
	let isDeleting = $state(false);
	let error = $state<string | null>(null);
	let nameError = $state<string | null>(null);
	let isCheckingName = $state(false);
	let selectedScope = $state('');
	let loadedDraftKey = $state('');
	let nameCheckTimeout: ReturnType<typeof setTimeout> | null = null;

	const isExistingDraft = $derived(Boolean(currentDraftId));
	const isBusy = $derived(isSaving || isPromoting || isDeleting);
	const requiresInstallUrl = $derived(
		appDraft.appCapabilities === 'Data Client v2' || appDraft.appCapabilities === 'Hybrid'
	);
	const visibleScreenshotAltCount = $derived(
		Math.min(appDraft.galleryUrls.length, APP_SCREENSHOT_ALT_LIMIT)
	);
	const currentName = $derived(activeType === 'Template' ? templateDraft.name : appDraft.name);
	const currentTypeLabel = $derived(activeType === 'Template' ? 'template' : 'app');
	const savedAtLabel = $derived(
		savedAt ? new Date(savedAt).toLocaleString() : null
	);

	function syncTemplateListInputs() {
		templateTagsInput = joinDraftList(templateDraft.tags);
		templateStyleTagsInput = joinDraftList(templateDraft.styleTags);
		templateSiteTypesInput = joinDraftList(templateDraft.siteTypes);
		templateFeatureFlagsInput = joinDraftList(templateDraft.featureFlags);
	}

	function hydrateFromDraft(nextDraft: AssetDraftRecord | null) {
		draftRecord = nextDraft;
		currentDraftId = nextDraft?.id || null;
		savedAt = nextDraft?.updatedAt || null;
		nameError = null;
		isCheckingName = false;
		selectedScope = '';

		if (nameCheckTimeout) {
			clearTimeout(nameCheckTimeout);
			nameCheckTimeout = null;
		}

		if (!nextDraft) {
			activeType = 'Template';
			templateDraft = createEmptyTemplateDraft(userEmail);
			appDraft = createEmptyAppDraft(userEmail);
			syncTemplateListInputs();
			return;
		}

		if (nextDraft.assetType === 'Template') {
			activeType = 'Template';
			templateDraft = normalizeTemplateDraftData(nextDraft.data as Partial<TemplateAssetDraftData>, userEmail);
			appDraft = createEmptyAppDraft(userEmail);
			syncTemplateListInputs();
			return;
		}

		activeType = 'App';
		appDraft = normalizeAppDraftData(nextDraft.data as Partial<AppAssetDraftData>, userEmail);
		templateDraft = createEmptyTemplateDraft(userEmail);
		syncTemplateListInputs();
	}

	$effect(() => {
		const nextKey = draft ? `${draft.id}:${draft.updatedAt}` : 'new';
		if (nextKey === loadedDraftKey) return;
		loadedDraftKey = nextKey;
		hydrateFromDraft(draft);
	});

	function handleTypeChange(nextType: AssetDraftType) {
		if (isExistingDraft) return;
		activeType = nextType;
		error = null;
		nameError = null;
		isCheckingName = false;
	}

	async function checkNameUniqueness(name: string) {
		const trimmedName = name.trim();
		if (!trimmedName) {
			nameError = null;
			return;
		}

		isCheckingName = true;
		try {
			const response = await fetch('/api/assets/check-name', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: trimmedName })
			});

			if (!response.ok) {
				throw new Error('Failed to check name availability');
			}

			const data = (await response.json()) as { available: boolean };
			nameError = data.available ? null : 'An asset with this name already exists';
		} catch {
			nameError = null;
		} finally {
			isCheckingName = false;
		}
	}

	function handleNameInput(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		if (activeType === 'Template') {
			templateDraft.name = value;
		} else {
			appDraft.name = value;
		}

		if (nameCheckTimeout) {
			clearTimeout(nameCheckTimeout);
		}

		nameCheckTimeout = setTimeout(() => {
			void checkNameUniqueness(value);
		}, 500);
	}

	function setTemplateListField(
		field: 'tags' | 'styleTags' | 'siteTypes' | 'featureFlags',
		rawValue: string
	) {
		const values = parseDraftListInput(rawValue);

		if (field === 'tags') {
			templateTagsInput = rawValue;
			templateDraft.tags = values;
			return;
		}

		if (field === 'styleTags') {
			templateStyleTagsInput = rawValue;
			templateDraft.styleTags = values;
			return;
		}

		if (field === 'siteTypes') {
			templateSiteTypesInput = rawValue;
			templateDraft.siteTypes = values;
			return;
		}

		templateFeatureFlagsInput = rawValue;
		templateDraft.featureFlags = values;
	}

	function handleTemplateThumbnailChange(url: string | null) {
		templateDraft.thumbnailUrl = url || '';
	}

	function handleAppThumbnailChange(url: string | null) {
		appDraft.thumbnailUrl = url || '';
		if (!url) {
			appDraft.appAvatarAltText = '';
		}
	}

	function handleSecondaryThumbnailsChange(urls: string[]) {
		templateDraft.secondaryThumbnailUrl = urls[0] || '';
	}

	function syncScreenshotAltTexts(previousUrls: string[], nextUrls: string[], altTexts: string[]): string[] {
		const nextAltTexts = [...altTexts];

		if (nextUrls.length >= previousUrls.length) {
			while (nextAltTexts.length < APP_SCREENSHOT_ALT_LIMIT) {
				nextAltTexts.push('');
			}
			return nextAltTexts.slice(0, APP_SCREENSHOT_ALT_LIMIT);
		}

		let removedIndex = previousUrls.findIndex((url, index) => nextUrls[index] !== url);
		if (removedIndex === -1) {
			removedIndex = nextUrls.length;
		}

		nextAltTexts.splice(removedIndex, previousUrls.length - nextUrls.length);
		while (nextAltTexts.length < APP_SCREENSHOT_ALT_LIMIT) {
			nextAltTexts.push('');
		}

		return nextAltTexts.slice(0, APP_SCREENSHOT_ALT_LIMIT);
	}

	function handleTemplateGalleryChange(urls: string[]) {
		templateDraft.galleryUrls = urls;
	}

	function handleAppGalleryChange(urls: string[]) {
		appDraft.appScreenshotAltTexts = syncScreenshotAltTexts(
			appDraft.galleryUrls,
			urls,
			appDraft.appScreenshotAltTexts
		);
		appDraft.galleryUrls = urls;
	}

	function handleCapabilityChange(event: Event) {
		const value = (event.target as HTMLSelectElement).value;
		appDraft.appCapabilities = value;
		if (value === 'Designer Extension') {
			appDraft.appInstallUrl = '';
		}
	}

	function handleScopeSelection(event: Event) {
		selectedScope = (event.target as HTMLSelectElement).value;
	}

	function addScope() {
		if (!selectedScope || appDraft.appScopes.includes(selectedScope)) return;
		appDraft.appScopes = [...appDraft.appScopes, selectedScope];
		selectedScope = '';
	}

	function removeScope(scope: string) {
		appDraft.appScopes = appDraft.appScopes.filter((entry) => entry !== scope);
	}

	function togglePaymentType(option: (typeof PAYMENT_TYPE_OPTIONS)[number]) {
		appDraft.paymentType = appDraft.paymentType.includes(option)
			? appDraft.paymentType.filter((entry) => entry !== option)
			: [...appDraft.paymentType, option];
	}

	function setVisibility(option: (typeof VISIBILITY_OPTIONS)[number]) {
		appDraft.visibility = appDraft.visibility === option ? '' : option;
	}

	function handleAppCategoryChange(event: Event) {
		const selectedValues = Array.from(
			(event.target as HTMLSelectElement).selectedOptions,
			(option) => option.value
		).slice(0, 2);
		appDraft.appCategory = selectedValues;
	}

	function updateFeature(index: number, value: string) {
		const nextFeatures = [...appDraft.appFeaturesOverview];
		nextFeatures[index] = value;
		appDraft.appFeaturesOverview = nextFeatures;
	}

	function updateScreenshotAltText(index: number, value: string) {
		const nextAltTexts = [...appDraft.appScreenshotAltTexts];
		nextAltTexts[index] = value;
		appDraft.appScreenshotAltTexts = nextAltTexts;
	}

	function buildDraftPayload() {
		return activeType === 'Template'
			? normalizeTemplateDraftData(templateDraft, userEmail)
			: normalizeAppDraftData(appDraft, userEmail);
	}

	async function persistDraft(options: { redirectAfterCreate?: boolean; silent?: boolean } = {}) {
		isSaving = true;
		error = null;

		const wasNewDraft = !currentDraftId;
		const endpoint = currentDraftId ? `/api/drafts/${currentDraftId}` : '/api/drafts';
		const method = currentDraftId ? 'PUT' : 'POST';

		try {
			const response = await fetch(endpoint, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ draft: buildDraftPayload() })
			});

			if (!response.ok) {
				const data = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
				throw new Error(data.message || data.error || 'Failed to save draft');
			}

			const data = (await response.json()) as { draft: AssetDraftRecord };
			hydrateFromDraft(data.draft);
			loadedDraftKey = `${data.draft.id}:${data.draft.updatedAt}`;

			trackEvent('dashboard_draft_saved', {
				draft_id: data.draft.id,
				asset_type: data.draft.assetType
			});

			await invalidate('app:drafts');

			if (options.redirectAfterCreate && wasNewDraft) {
				await goto(`/dashboard/drafts/${data.draft.id}`);
			}

			if (!options.silent) {
				toast.success(wasNewDraft ? 'Draft created' : 'Draft saved');
			}

			return data.draft;
		} finally {
			isSaving = false;
		}
	}

	async function handleSaveClick() {
		if (nameError) {
			error = nameError;
			toast.error(nameError);
			return;
		}

		try {
			await persistDraft({ redirectAfterCreate: !currentDraftId });
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to save draft';
			error = message;
			toast.error(message);
		}
	}

	async function handlePromoteClick() {
		if (!currentName.trim()) {
			const message = 'Name is required before creating an Airtable asset.';
			error = message;
			toast.error(message);
			return;
		}

		if (nameError) {
			error = nameError;
			toast.error(nameError);
			return;
		}

		if (activeType === 'App' && requiresInstallUrl && !appDraft.appInstallUrl.trim()) {
			const message = 'Install URL is required for Data Client and Hybrid apps.';
			error = message;
			toast.error(message);
			return;
		}

		try {
			const savedDraft = await persistDraft({ silent: true });
			isPromoting = true;

			const response = await fetch(`/api/drafts/${savedDraft.id}/promote`, {
				method: 'POST'
			});

			if (!response.ok) {
				const data = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
				throw new Error(data.message || data.error || 'Failed to create Airtable asset');
			}

			const data = (await response.json()) as { asset: { id: string; type: string } };
			trackEvent('dashboard_draft_promoted', {
				draft_id: savedDraft.id,
				asset_type: activeType,
				asset_id: data.asset.id
			});

			await Promise.all([invalidate('app:drafts'), invalidate('app:assets')]);
			toast.success(`${activeType} draft promoted to Airtable`);
			await goto(`/assets/${data.asset.id}`);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to create Airtable asset';
			error = message;
			toast.error(message);
		} finally {
			isPromoting = false;
		}
	}

	async function handleDeleteClick() {
		if (!currentDraftId || isDeleting) return;
		if (!confirm('Delete this draft? This cannot be undone.')) {
			return;
		}

		isDeleting = true;
		error = null;

		try {
			const response = await fetch(`/api/drafts/${currentDraftId}`, { method: 'DELETE' });
			if (!response.ok) {
				const data = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
				throw new Error(data.message || data.error || 'Failed to delete draft');
			}

			trackEvent('dashboard_draft_deleted', {
				draft_id: currentDraftId,
				asset_type: activeType
			});

			await invalidate('app:drafts');
			toast.info('Draft deleted');
			await goto('/dashboard');
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to delete draft';
			error = message;
			toast.error(message);
		} finally {
			isDeleting = false;
		}
	}

	function handleBackToDashboard() {
		void goto('/dashboard');
	}

	$effect(() => {
		return () => {
			if (nameCheckTimeout) {
				clearTimeout(nameCheckTimeout);
			}
		};
	});
</script>

<div class="draft-card">
	<Card>
		<CardHeader>
			<div class="header-row">
				<div>
					<CardTitle>{isExistingDraft ? 'Edit draft' : 'Create draft'}</CardTitle>
					<p class="draft-description">
						Build out templates and apps here, save them in Cloudflare, and only create the Airtable
						asset when you are ready.
					</p>
				</div>
				<div class="header-meta">
					<span class="draft-pill">{activeType}</span>
					{#if savedAtLabel}
						<span class="saved-at">Saved {savedAtLabel}</span>
					{/if}
				</div>
			</div>
		</CardHeader>

		<CardContent>
			{#if error}
				<div class="error-message">{error}</div>
			{/if}

			{#if !isExistingDraft}
				<Tabs value={activeType}>
					<div class="draft-type-tabs">
						<TabsList>
							<TabsTrigger
								value="Template"
								active={activeType === 'Template'}
								onclick={() => handleTypeChange('Template')}
							>
								Template
							</TabsTrigger>
							<TabsTrigger
								value="App"
								active={activeType === 'App'}
								onclick={() => handleTypeChange('App')}
							>
								App
							</TabsTrigger>
						</TabsList>
					</div>
				</Tabs>
			{/if}

			<form class="form" onsubmit={(event) => event.preventDefault()}>
				<Tabs value={activeType}>
					<TabsContent value="Template" active={activeType === 'Template'}>
					<div class="form-section">
						<h3 class="section-title">Basic Information</h3>
						<div class="form-field">
							<Label for="template-name">Template Name</Label>
							<Input
								id="template-name"
								type="text"
								value={templateDraft.name}
								oninput={handleNameInput}
								placeholder="Studio Portfolio Pro"
							/>
							{#if isCheckingName && activeType === 'Template'}
								<span class="field-hint">Checking availability...</span>
							{:else if nameError && activeType === 'Template'}
								<span class="field-hint field-hint--error">{nameError}</span>
							{/if}
						</div>

						<div class="form-field">
							<Label for="template-description-short">Short Description</Label>
							<Input
								id="template-description-short"
								type="text"
								bind:value={templateDraft.descriptionShort}
								placeholder="A polished portfolio system for agencies and freelancers."
							/>
						</div>

						<div class="form-field">
							<Label for="template-description-long">Long Description</Label>
							<Textarea
								id="template-description-long"
								bind:value={templateDraft.descriptionLong}
								rows={7}
								placeholder="Write the core story, what the layout solves, and how it should be reviewed."
							/>
						</div>

						<div class="form-row">
							<div class="form-field">
								<Label for="template-published-url">Published URL</Label>
								<Input
									id="template-published-url"
									type="url"
									bind:value={templateDraft.publishedUrl}
									placeholder="https://your-site.webflow.io"
								/>
							</div>
							<div class="form-field">
								<Label for="template-preview-url">Preview URL</Label>
								<Input
									id="template-preview-url"
									type="url"
									bind:value={templateDraft.previewUrl}
									placeholder="https://preview.example.com"
								/>
							</div>
						</div>

						<div class="form-row">
							<div class="form-field">
								<Label for="template-price">Price Model</Label>
								<select
									id="template-price"
									class="form-control native-select"
									bind:value={templateDraft.priceModel}
								>
									<option value="Free">Free</option>
									<option value="Paid">Paid</option>
								</select>
							</div>
							<div class="form-field">
								<Label for="template-creator-name">Creator Name</Label>
								<Input
									id="template-creator-name"
									type="text"
									bind:value={templateDraft.creatorName}
									placeholder="Your name or studio name"
								/>
							</div>
						</div>
					</div>

					<div class="form-section">
						<h3 class="section-title">Classification</h3>
						<div class="form-row">
							<div class="form-field">
								<Label for="template-category">Category</Label>
								<Input
									id="template-category"
									type="text"
									bind:value={templateDraft.category}
									placeholder="Portfolio"
								/>
							</div>
							<div class="form-field">
								<Label for="template-tags">Tags</Label>
								<Input
									id="template-tags"
									type="text"
									value={templateTagsInput}
									oninput={(event) =>
										setTemplateListField('tags', (event.target as HTMLInputElement).value)}
									placeholder="Editorial, Motion, Agency"
								/>
								<span class="field-hint">Comma-separated</span>
							</div>
						</div>

						<div class="form-row">
							<div class="form-field">
								<Label for="template-style-tags">Style Tags</Label>
								<Input
									id="template-style-tags"
									type="text"
									value={templateStyleTagsInput}
									oninput={(event) =>
										setTemplateListField('styleTags', (event.target as HTMLInputElement).value)}
									placeholder="Bold, Editorial, Monochrome"
								/>
								<span class="field-hint">Comma-separated</span>
							</div>
							<div class="form-field">
								<Label for="template-site-types">Site Types</Label>
								<Input
									id="template-site-types"
									type="text"
									value={templateSiteTypesInput}
									oninput={(event) =>
										setTemplateListField('siteTypes', (event.target as HTMLInputElement).value)}
									placeholder="Portfolio, Agency, Blog"
								/>
								<span class="field-hint">Comma-separated</span>
							</div>
						</div>

						<div class="form-field">
							<Label for="template-feature-flags">Feature Flags</Label>
							<Input
								id="template-feature-flags"
								type="text"
								value={templateFeatureFlagsInput}
								oninput={(event) =>
									setTemplateListField('featureFlags', (event.target as HTMLInputElement).value)}
								placeholder="CMS, Ecommerce, GSAP, Members"
							/>
							<span class="field-hint">Comma-separated</span>
						</div>

						<div class="form-field">
							<Label for="template-notes">Notes</Label>
							<Textarea
								id="template-notes"
								bind:value={templateDraft.notes}
								rows={4}
								placeholder="Internal notes, caveats, and anything you want to preserve before promotion."
							/>
						</div>
					</div>

					<div class="form-section">
						<h3 class="section-title">Images</h3>
						<ImageUploader
							value={templateDraft.thumbnailUrl || null}
							onchange={handleTemplateThumbnailChange}
							label="Primary Thumbnail"
							description="150:199 aspect ratio (for example 750×995px)"
							uploadType="thumbnail"
							disabled={isBusy}
						/>

						<SecondaryThumbnailUploader
							value={templateDraft.secondaryThumbnailUrl ? [templateDraft.secondaryThumbnailUrl] : []}
							onchange={handleSecondaryThumbnailsChange}
							maxImages={1}
							disabled={isBusy}
						/>

						<CarouselUploader
							value={templateDraft.galleryUrls}
							onchange={handleTemplateGalleryChange}
							minImages={0}
							maxImages={8}
							aspectRatio={{ width: 16, height: 10 }}
							disabled={isBusy}
						/>
					</div>
					</TabsContent>

					<TabsContent value="App" active={activeType === 'App'}>
					<div class="form-section">
						<h3 class="section-title">Basic Information</h3>
						<div class="form-field">
							<Label for="app-name">App Name</Label>
							<Input
								id="app-name"
								type="text"
								value={appDraft.name}
								oninput={handleNameInput}
								placeholder="Create Something Insights"
							/>
							{#if isCheckingName && activeType === 'App'}
								<span class="field-hint">Checking availability...</span>
							{:else if nameError && activeType === 'App'}
								<span class="field-hint field-hint--error">{nameError}</span>
							{/if}
						</div>

						<div class="form-field">
							<Label for="app-description-short">App Preview Description</Label>
							<Input
								id="app-description-short"
								type="text"
								bind:value={appDraft.descriptionShort}
								maxlength={100}
								placeholder="Short marketplace description"
							/>
							<span class="field-hint">{appDraft.descriptionShort.length}/100 characters</span>
						</div>

						<div class="form-field">
							<Label for="app-description-long">App Detail Description</Label>
							<Textarea
								id="app-description-long"
								bind:value={appDraft.descriptionLong}
								rows={7}
								placeholder="Explain what the app does, who it serves, and how it should be reviewed."
							/>
						</div>

						<div class="form-row">
							<div class="form-field">
								<Label for="app-website-url">Website URL</Label>
								<Input
									id="app-website-url"
									type="url"
									bind:value={appDraft.websiteUrl}
									placeholder="https://example.com"
								/>
							</div>
							<div class="form-field">
								<Label for="app-video-url">Promo Video URL</Label>
								<Input
									id="app-video-url"
									type="url"
									bind:value={appDraft.appVideoUrl}
									placeholder="https://www.youtube.com/watch?v=..."
								/>
							</div>
						</div>
					</div>

					<div class="form-section">
						<h3 class="section-title">Capabilities & Access</h3>
						<div class="form-field">
							<Label for="app-capabilities">App Capabilities</Label>
							<select
								id="app-capabilities"
								class="form-control native-select"
								bind:value={appDraft.appCapabilities}
								onchange={handleCapabilityChange}
							>
								<option value="">Select one...</option>
								{#each APP_CAPABILITY_OPTIONS as option}
									<option value={option}>{option}</option>
								{/each}
							</select>
						</div>

						{#if requiresInstallUrl}
							<div class="form-field">
								<Label for="app-install-url">App Install URL</Label>
								<Input
									id="app-install-url"
									type="url"
									bind:value={appDraft.appInstallUrl}
									placeholder="https://yourapp.com/auth/webflow"
								/>
							</div>
						{/if}

						<div class="form-field">
							<Label for="scope-selector">Scopes</Label>
							<div class="scope-builder">
								<select
									id="scope-selector"
									class="form-control native-select"
									bind:value={selectedScope}
									onchange={handleScopeSelection}
								>
									<option value="">Select a scope to add...</option>
									{#each APP_SCOPE_OPTIONS as option}
										<option value={option}>{option}</option>
									{/each}
								</select>
								<Button type="button" variant="outline" size="sm" onclick={addScope} disabled={!selectedScope}>
									Add Scope
								</Button>
							</div>
							{#if appDraft.appScopes.length > 0}
								<div class="scope-list">
									{#each appDraft.appScopes as scope}
										<button type="button" class="scope-chip" onclick={() => removeScope(scope)}>
											<span>{scope}</span>
											<span aria-hidden="true">×</span>
										</button>
									{/each}
								</div>
							{/if}
						</div>

						<div class="form-field">
							<Label for="app-access-credentials">App Access Credentials</Label>
							<Textarea
								id="app-access-credentials"
								bind:value={appDraft.appAccessCredentials}
								rows={5}
								maxlength={2000}
								placeholder="Credentials, setup notes, or N/A"
							/>
							<span class="field-hint">{appDraft.appAccessCredentials.length}/2000 characters</span>
						</div>
					</div>

					<div class="form-section">
						<h3 class="section-title">Marketplace Settings</h3>
						<div class="form-field">
							<Label>Payment Type</Label>
							<div class="option-grid">
								{#each PAYMENT_TYPE_OPTIONS as option}
									<label class="option-card">
										<input
											type="checkbox"
											checked={appDraft.paymentType.includes(option)}
											onchange={() => togglePaymentType(option)}
										/>
										<span>{option}</span>
									</label>
								{/each}
							</div>
						</div>

						<div class="form-field">
							<Label>Marketplace Visibility</Label>
							<div class="option-grid">
								{#each VISIBILITY_OPTIONS as option}
									<label class="option-card">
										<input
											type="checkbox"
											checked={appDraft.visibility === option}
											onchange={() => setVisibility(option)}
										/>
										<span>{option}</span>
									</label>
								{/each}
							</div>
						</div>

						<div class="form-field">
							<Label for="app-category">App Category</Label>
							<select
								id="app-category"
								class="form-control native-select native-select--multi"
								multiple
								size="8"
								onchange={handleAppCategoryChange}
							>
								{#each APP_CATEGORY_OPTIONS as option}
									<option value={option} selected={appDraft.appCategory.includes(option)}>
										{option}
									</option>
								{/each}
							</select>
							<span class="field-hint">{appDraft.appCategory.length} of 2 categories selected</span>
						</div>

						<div class="form-field">
							<Label>Features Overview</Label>
							<div class="stacked-fields">
								{#each appDraft.appFeaturesOverview as feature, index}
									<Input
										type="text"
										value={feature}
										placeholder={`Feature ${index + 1}`}
										oninput={(event) => updateFeature(index, (event.target as HTMLInputElement).value)}
									/>
								{/each}
							</div>
						</div>
					</div>

					<div class="form-section">
						<h3 class="section-title">Creator & Support</h3>
						<div class="form-row">
							<div class="form-field">
								<Label for="app-creator-name">Creator Name</Label>
								<Input id="app-creator-name" type="text" bind:value={appDraft.creatorName} />
							</div>
							<div class="form-field">
								<Label for="app-creator-website">Creator Website</Label>
								<Input id="app-creator-website" type="text" bind:value={appDraft.creatorWebsite} />
							</div>
						</div>

						<div class="form-field">
							<Label for="app-creator-contact-email">Contact Email</Label>
							<Input
								id="app-creator-contact-email"
								type="email"
								bind:value={appDraft.creatorContactEmail}
							/>
						</div>

						<div class="form-row">
							<div class="form-field">
								<Label for="app-demo-video-url">Review Team Demo Video URL</Label>
								<Input id="app-demo-video-url" type="url" bind:value={appDraft.appDemoVideoUrl} />
							</div>
							<div class="form-field">
								<Label for="app-privacy-policy-url">Privacy Policy URL</Label>
								<Input id="app-privacy-policy-url" type="url" bind:value={appDraft.appPrivacyPolicyUrl} />
							</div>
						</div>

						<div class="form-row">
							<div class="form-field">
								<Label for="app-support-email">Support Email</Label>
								<Input id="app-support-email" type="email" bind:value={appDraft.appSupportEmail} />
							</div>
							<div class="form-field">
								<Label for="app-support-url">Support URL</Label>
								<Input id="app-support-url" type="url" bind:value={appDraft.appSupportUrl} />
							</div>
						</div>

						<div class="form-row">
							<div class="form-field">
								<Label for="app-terms-url">Terms and Conditions URL</Label>
								<Input id="app-terms-url" type="url" bind:value={appDraft.appTermsUrl} />
							</div>
							<div class="form-field">
								<Label for="app-developer-notes">Developer Notes</Label>
								<Textarea
									id="app-developer-notes"
									bind:value={appDraft.appDeveloperNotes}
									rows={4}
									placeholder="Additional context for reviewers"
								/>
							</div>
						</div>
					</div>

					<div class="form-section">
						<h3 class="section-title">Images</h3>
						<ImageUploader
							value={appDraft.thumbnailUrl || null}
							onchange={handleAppThumbnailChange}
							label="App Icon"
							description="Square icon. Use a clean 1:1 image."
							uploadType="image"
							aspectRatio={{ width: 1, height: 1 }}
							disabled={isBusy}
						/>

						{#if appDraft.thumbnailUrl}
							<div class="form-field">
								<Label for="app-avatar-alt-text">App Icon Alt Text</Label>
								<Input
									id="app-avatar-alt-text"
									type="text"
									bind:value={appDraft.appAvatarAltText}
									placeholder="Describe the app icon"
								/>
							</div>
						{/if}

						<CarouselUploader
							value={appDraft.galleryUrls}
							onchange={handleAppGalleryChange}
							minImages={0}
							maxImages={5}
							aspectRatio={APP_SCREENSHOT_RATIO}
							disabled={isBusy}
						/>

						{#if visibleScreenshotAltCount > 0}
							<div class="stacked-fields">
								{#each Array.from({ length: visibleScreenshotAltCount }) as _, index}
									<div class="form-field">
										<Label for={`app-screenshot-alt-${index}`}>Screenshot {index + 1} Alt Text</Label>
										<Input
											id={`app-screenshot-alt-${index}`}
											type="text"
											value={appDraft.appScreenshotAltTexts[index] || ''}
											oninput={(event) =>
												updateScreenshotAltText(index, (event.target as HTMLInputElement).value)}
											placeholder="Describe this screenshot"
										/>
									</div>
								{/each}
							</div>
						{:else}
							<span class="field-hint">Upload screenshots to edit their alt text.</span>
						{/if}
					</div>
					</TabsContent>
				</Tabs>
			</form>
		</CardContent>

		<div class="editor-footer">
			<div class="footer-left">
				{#if isExistingDraft}
					<Button type="button" variant="destructive" onclick={handleDeleteClick} disabled={isDeleting}>
						{isDeleting ? 'Deleting...' : 'Delete Draft'}
					</Button>
				{/if}
			</div>
			<div class="footer-right">
				<Button type="button" variant="secondary" onclick={handleBackToDashboard} disabled={isBusy}>
					Back to Dashboard
				</Button>
				<Button type="button" variant="outline" onclick={handleSaveClick} disabled={isBusy || !!nameError}>
					{isSaving ? 'Saving...' : 'Save Draft'}
				</Button>
				<Button type="button" onclick={handlePromoteClick} disabled={isBusy || !!nameError}>
					{isPromoting ? 'Creating Airtable Asset...' : 'Create Airtable Asset'}
				</Button>
			</div>
		</div>
	</Card>
</div>

<style>
	.draft-card {
		border: 1px solid var(--color-border-default);
	}

	.header-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-md);
	}

	.header-meta {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--space-xs);
	}

	.draft-description {
		margin: var(--space-xs) 0 0;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		max-width: 38rem;
	}

	.draft-pill {
		display: inline-flex;
		align-items: center;
		padding: 0.3rem 0.7rem;
		border-radius: 999px;
		background: var(--color-shell-surface-secondary);
		border: 1px solid var(--color-border-default);
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
	}

	.saved-at {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.error-message {
		padding: var(--space-sm);
		margin-bottom: var(--space-md);
		background: color-mix(in srgb, var(--color-error) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-error) 35%, transparent);
		border-radius: var(--radius-md);
		color: var(--color-error);
		font-size: var(--text-body-sm);
	}

	.draft-type-tabs {
		margin-bottom: var(--space-lg);
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.form-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.section-title {
		margin: 0;
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.form-row {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-md);
	}

	.field-hint {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.field-hint--error {
		color: var(--color-error);
	}

	.native-select {
		width: 100%;
	}

	.native-select--multi {
		min-height: 11rem;
	}

	.option-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		gap: var(--space-sm);
	}

	.option-card {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.8rem 0.9rem;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		background: var(--color-shell-surface-secondary);
		color: var(--color-fg-secondary);
		cursor: pointer;
	}

	.option-card input {
		margin: 0;
	}

	.scope-builder {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: var(--space-sm);
		align-items: center;
	}

	.scope-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
		margin-top: var(--space-sm);
	}

	.scope-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.45rem 0.7rem;
		border-radius: 999px;
		border: 1px solid var(--color-border-default);
		background: var(--color-shell-surface-secondary);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		cursor: pointer;
	}

	.stacked-fields {
		display: grid;
		gap: var(--space-sm);
	}

	.editor-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-md);
		padding: 0 var(--space-lg) var(--space-lg);
	}

	.footer-left,
	.footer-right {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	@media (max-width: 720px) {
		.header-row,
		.editor-footer {
			flex-direction: column;
			align-items: stretch;
		}

		.header-meta {
			align-items: flex-start;
		}

		.form-row,
		.scope-builder {
			grid-template-columns: 1fr;
		}

		.footer-left,
		.footer-right {
			width: 100%;
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>

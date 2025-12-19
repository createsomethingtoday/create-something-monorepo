<script lang="ts">
	import {
		Button,
		Card,
		CardHeader,
		CardTitle,
		CardContent,
		Input,
		Label,
		Textarea,
		Tabs,
		TabsList,
		TabsTrigger,
		TabsContent
	} from './ui';
	import ApiKeysManager from './ApiKeysManager.svelte';
	import ImageUploader from './ImageUploader.svelte';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

	let activeTab = $state('profile');
	let isLoading = $state(true);
	let isSaving = $state(false);
	let error = $state<string | null>(null);

	let formData = $state({
		name: '',
		legalName: '',
		biography: '',
		profileImage: null as string | null
	});

	let modalRef: HTMLDivElement | undefined = $state();

	// Load profile data
	$effect(() => {
		loadProfile();
	});

	interface ProfileData {
		name?: string;
		legalName?: string;
		biography?: string;
		profileImage?: string | null;
	}

	async function loadProfile() {
		try {
			const response = await fetch('/api/profile');
			if (!response.ok) throw new Error('Failed to load profile');
			const profile = (await response.json()) as ProfileData;
			formData = {
				name: profile.name || '',
				legalName: profile.legalName || '',
				biography: profile.biography || '',
				profileImage: profile.profileImage || null
			};
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load profile';
		} finally {
			isLoading = false;
		}
	}

	function handleClickOutside(event: MouseEvent) {
		if (modalRef && !modalRef.contains(event.target as Node)) {
			onClose();
		}
	}

	function handleEscape(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}

	async function handleSave() {
		isSaving = true;
		error = null;

		try {
			const response = await fetch('/api/profile', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData)
			});

			if (!response.ok) {
				const errorData = (await response.json()) as { message?: string };
				throw new Error(errorData.message || 'Failed to save profile');
			}

			onClose();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to save profile';
		} finally {
			isSaving = false;
		}
	}

	$effect(() => {
		document.addEventListener('keydown', handleEscape);
		return () => {
			document.removeEventListener('keydown', handleEscape);
		};
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-overlay" onclick={handleClickOutside}>
	<div class="modal-container" bind:this={modalRef}>
		<Card class="modal-card">
			<CardHeader>
				<CardTitle>Settings</CardTitle>
				<p class="modal-description">Manage your profile and API access</p>
			</CardHeader>
			<CardContent>
				{#if isLoading}
					<div class="loading-container">
						<div class="spinner"></div>
						<p>Loading profile...</p>
					</div>
				{:else}
					<Tabs bind:value={activeTab}>
						<TabsList>
							<TabsTrigger
								value="profile"
								active={activeTab === 'profile'}
								onclick={() => (activeTab = 'profile')}
							>
								Profile
							</TabsTrigger>
							<TabsTrigger
								value="api-keys"
								active={activeTab === 'api-keys'}
								onclick={() => (activeTab = 'api-keys')}
							>
								API Keys
							</TabsTrigger>
						</TabsList>

						<TabsContent value="profile" active={activeTab === 'profile'}>
							<div class="form">
								{#if error}
									<div class="error-message">{error}</div>
								{/if}

								<div class="form-field">
									<ImageUploader
										value={formData.profileImage}
										onchange={(url) => (formData.profileImage = url)}
										label="Profile Image"
										description="WebP images only, square format recommended"
										disabled={isSaving}
									/>
								</div>

								<div class="form-field">
									<Label for="name">Name</Label>
									<Input
										id="name"
										type="text"
										bind:value={formData.name}
										placeholder="Your display name"
									/>
								</div>

								<div class="form-field">
									<Label for="legalName">Designer's Legal Name</Label>
									<Input
										id="legalName"
										type="text"
										bind:value={formData.legalName}
										placeholder="Legal name for contracts"
									/>
								</div>

								<div class="form-field">
									<Label for="biography">Biography</Label>
									<Textarea
										id="biography"
										bind:value={formData.biography}
										placeholder="Tell us about yourself..."
										rows={4}
									/>
								</div>

								<div class="form-actions">
									<Button variant="secondary" onclick={onClose}>Cancel</Button>
									<Button
										variant="webflow"
										onclick={handleSave}
										disabled={isSaving}
									>
										{isSaving ? 'Saving...' : 'Save Changes'}
									</Button>
								</div>
							</div>
						</TabsContent>

						<TabsContent value="api-keys" active={activeTab === 'api-keys'}>
							<ApiKeysManager />
						</TabsContent>
					</Tabs>
				{/if}
			</CardContent>
		</Card>
	</div>
</div>

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: var(--space-md);
	}

	.modal-container {
		width: 100%;
		max-width: 48rem;
		max-height: 85vh;
		overflow-y: auto;
	}

	.modal-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: var(--space-xs) 0 0;
	}

	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-xl);
		gap: var(--space-md);
		color: var(--color-fg-secondary);
	}

	.spinner {
		width: 2rem;
		height: 2rem;
		border: 3px solid var(--color-border-default);
		border-top-color: var(--webflow-blue);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border-default);
	}

	.error-message {
		padding: var(--space-sm);
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		border-radius: var(--radius-md);
		color: var(--color-error);
		font-size: var(--text-body-sm);
	}
</style>

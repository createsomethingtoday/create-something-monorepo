<script lang="ts">
  import {
    Button,
    Dialog,
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

  interface ProfileFormState {
    name: string;
    legalName: string;
    biography: string;
    avatarUrl: string | null;
    websiteUrl: string;
  }

  const EMPTY_PROFILE_FORM_STATE: ProfileFormState = {
    name: '',
    legalName: '',
    biography: '',
    avatarUrl: null,
    websiteUrl: ''
  };

  let formData = $state<ProfileFormState>({ ...EMPTY_PROFILE_FORM_STATE });
  let initialFormData = $state<ProfileFormState>({ ...EMPTY_PROFILE_FORM_STATE });

  /** Track initial avatar to detect changes — avoids re-submitting unchanged Airtable URLs */
  let initialAvatarUrl: string | null = null;

  let successMessage = $state<string | null>(null);

  // Load profile data
  $effect(() => {
    loadProfile();
  });

  interface ProfileData {
    id: string;
    name?: string;
    legalName?: string;
    biography?: string;
    avatarUrl?: string | null;
    websiteUrl?: string | null;
    email?: string;
  }

  async function loadProfile() {
    try {
      const response = await fetch('/api/profile');
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please log in to view your profile');
        }
        throw new Error('Failed to load profile');
      }
      const profile = (await response.json()) as ProfileData;
      const loadedAvatarUrl = profile.avatarUrl || null;
      initialAvatarUrl = loadedAvatarUrl;
      const nextFormData = {
        name: profile.name || '',
        legalName: profile.legalName || '',
        biography: profile.biography || '',
        avatarUrl: loadedAvatarUrl,
        websiteUrl: profile.websiteUrl || ''
      };
      formData = { ...nextFormData };
      initialFormData = { ...nextFormData };
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load profile';
    } finally {
      isLoading = false;
    }
  }

  function profileFormsEqual(left: ProfileFormState, right: ProfileFormState): boolean {
    return (
      left.name === right.name &&
      left.legalName === right.legalName &&
      left.biography === right.biography &&
      left.avatarUrl === right.avatarUrl &&
      left.websiteUrl === right.websiteUrl
    );
  }

  const hasUnsavedChanges = $derived(
    !isLoading && !isSaving && !profileFormsEqual(formData, initialFormData)
  );

  function canDismiss(): boolean {
    if (isSaving) return false;
    if (!hasUnsavedChanges) return true;
    if (typeof window === 'undefined') return false;
    return window.confirm('Discard unsaved profile changes?');
  }

  function handleDismiss() {
    if (canDismiss()) {
      onClose();
    }
  }

  function handleBeforeUnload(event: BeforeUnloadEvent) {
    if (!hasUnsavedChanges) return;
    event.preventDefault();
    event.returnValue = '';
  }

  async function handleSave() {
    isSaving = true;
    error = null;
    successMessage = null;

    try {
      // Only include avatarUrl when it actually changed — avoids re-submitting
      // Airtable's temporary CDN URLs or forcing unnecessary attachment re-processing
      const updateData: Record<string, unknown> = {
        name: formData.name,
        legalName: formData.legalName,
        biography: formData.biography,
        websiteUrl: formData.websiteUrl
      };
      if (formData.avatarUrl !== initialAvatarUrl) {
        updateData.avatarUrl = formData.avatarUrl;
      }

      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please log in again.');
        }
        const errorData = (await response.json()) as { message?: string; error?: string };
        throw new Error(errorData.message || errorData.error || 'Failed to save profile');
      }

      // Update local state with response
      const updated = (await response.json()) as ProfileData;
      const savedAvatarUrl = updated.avatarUrl || null;
      initialAvatarUrl = savedAvatarUrl;
      const nextFormData = {
        name: updated.name || '',
        legalName: updated.legalName || '',
        biography: updated.biography || '',
        avatarUrl: savedAvatarUrl,
        websiteUrl: updated.websiteUrl || ''
      };
      formData = { ...nextFormData };
      initialFormData = { ...nextFormData };

      successMessage = 'Profile saved successfully';

      // Auto-close after brief success message
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save profile';
    } finally {
      isSaving = false;
    }
  }

  $effect(() => {
    if (!hasUnsavedChanges || typeof window === 'undefined') return;

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  });
</script>

<Dialog
  isOpen={true}
  {onClose}
  beforeClose={canDismiss}
  closeOnBackdrop={!hasUnsavedChanges && !isSaving}
  title="Settings"
  size="lg"
>
  <p class="modal-description">Manage your profile and API access</p>
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
          {#if successMessage}
            <div class="success-message">{successMessage}</div>
          {/if}

          {#if error}
            <div class="error-message">{error}</div>
          {/if}

          <div class="form-field">
            <ImageUploader
              value={formData.avatarUrl}
              onchange={(url) => (formData.avatarUrl = url)}
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
            <Label for="websiteUrl">Personal website URL</Label>
            <Input
              id="websiteUrl"
              type="url"
              bind:value={formData.websiteUrl}
              placeholder="https://your-site.com"
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
            <Button variant="secondary" onclick={handleDismiss}>Cancel</Button>
            <Button variant="default" onclick={handleSave} disabled={isSaving}>
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
</Dialog>

<style>
  .modal-description {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    margin: 0 0 var(--space-lg);
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
    border-top-color: var(--color-info);
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

  .success-message {
    padding: var(--space-sm);
    background: var(--color-success-muted);
    border: 1px solid var(--color-success-border);
    border-radius: var(--radius-md);
    color: var(--color-success);
    font-size: var(--text-body-sm);
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  .success-message::before {
    content: '';
    display: inline-block;
    width: 16px;
    height: 16px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2344aa44' stroke-width='2'%3E%3Cpath d='M22 11.08V12a10 10 0 1 1-5.93-9.14'/%3E%3Cpolyline points='22 4 12 14.01 9 11.01'/%3E%3C/svg%3E");
    background-size: contain;
    background-repeat: no-repeat;
  }
</style>

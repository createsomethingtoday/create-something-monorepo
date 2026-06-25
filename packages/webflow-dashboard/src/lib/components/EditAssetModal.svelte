<script lang="ts">
  import { Button, Dialog, Input, Label, Textarea } from './ui';
  import CarouselUploader from './CarouselUploader.svelte';
  import ImageUploader from './ImageUploader.svelte';
  import LongDescriptionEditor from './LongDescriptionEditor.svelte';
  import SecondaryThumbnailUploader from './SecondaryThumbnailUploader.svelte';
  import type { Asset, AssetUpdateData } from '$lib/server/airtable';
  import { toast } from '$lib/stores/toast';
  import { trackEvent } from '$lib/utils/analytics';
  import { shouldCreateAssetVersionForChanges } from '$lib/utils/asset-version-changes';
  import { sanitizeLongDescriptionHtml } from '@create-something/webflow-dashboard-core/long-description';

  const APP_CAPABILITY_OPTIONS = ['Data Client v2', 'Designer Extension', 'Hybrid'] as const;
  const APP_SCOPE_OPTIONS = [
    'app-subscriptions',
    'assets',
    'authorized-user',
    'cms',
    'comments',
    'components',
    'custom-code',
    'ecommerce',
    'forms',
    'pages',
    'sites',
    'site-activity',
    'site-config',
    'user-accounts',
    'workspace'
  ] as const;
  const APP_CATEGORY_OPTIONS = [
    'AI',
    'Analytics',
    'Asset Management',
    'Automation',
    'Compliance',
    'Content Management',
    'Customer Support',
    'Data Sync',
    'Design',
    'Development and Coding',
    'Ecommerce',
    'Forms and Surveys',
    'Icons',
    'Localization',
    'Marketing',
    'Scheduling',
    'SEO',
    'User Management',
    'Utilities'
  ] as const;
  const PAYMENT_TYPE_OPTIONS = ['Free', 'Paid'] as const;
  const VISIBILITY_OPTIONS = ['Public', 'Private'] as const;
  const APP_SCREENSHOT_RATIO = { width: 1280, height: 846 };

  interface Props {
    asset: Asset;
    onClose: () => void;
    onSave: (data: AssetUpdateData) => Promise<{ versionWarning?: string } | void>;
    onArchive?: () => Promise<void>;
  }

  interface EditFormState {
    name: string;
    descriptionShort: string;
    descriptionLongHtml: string;
    websiteUrl: string;
    previewUrl: string;
    appCapabilities: string;
    appInstallUrl: string;
    appScopes: string[];
    appAvatarAltText: string;
    paymentType: string[];
    visibility: string;
    appCategory: string[];
    creatorName: string;
    creatorWebsite: string;
    creatorContactEmail: string;
    appFeaturesOverview: string[];
    appDeveloperNotes: string;
    appAccessCredentials: string;
    appVideoUrl: string;
    appDemoVideoUrl: string;
    appPrivacyPolicyUrl: string;
    appSupportEmail: string;
    appSupportUrl: string;
    appTermsUrl: string;
    appScreenshotAltTexts: string[];
  }

  const EMPTY_FORM_STATE: EditFormState = {
    name: '',
    descriptionShort: '',
    descriptionLongHtml: '',
    websiteUrl: '',
    previewUrl: '',
    appCapabilities: '',
    appInstallUrl: '',
    appScopes: [],
    appAvatarAltText: '',
    paymentType: [],
    visibility: '',
    appCategory: [],
    creatorName: '',
    creatorWebsite: '',
    creatorContactEmail: '',
    appFeaturesOverview: normalizeFixedLength(undefined, 5),
    appDeveloperNotes: '',
    appAccessCredentials: '',
    appVideoUrl: '',
    appDemoVideoUrl: '',
    appPrivacyPolicyUrl: '',
    appSupportEmail: '',
    appSupportUrl: '',
    appTermsUrl: '',
    appScreenshotAltTexts: normalizeFixedLength(undefined, 5)
  };

  let { asset, onClose, onSave, onArchive }: Props = $props();

  function normalizeFixedLength(values: string[] | undefined, length = 5): string[] {
    return Array.from({ length }, (_, index) => values?.[index] || '');
  }

  function trimList(values: string[]): string[] {
    return values.map((value) => value.trim());
  }

  function buildSupportValue(supportEmail?: string, supportUrl?: string): string {
    return [supportEmail?.trim(), supportUrl?.trim()].filter(Boolean).join('\n');
  }

  function arraysEqual(left: string[] = [], right: string[] = []): boolean {
    if (left.length !== right.length) return false;
    return left.every((value, index) => value === right[index]);
  }

  function syncScreenshotAltTexts(
    previousUrls: string[],
    nextUrls: string[],
    altTexts: string[]
  ): string[] {
    if (nextUrls.length >= previousUrls.length) {
      const nextAltTexts = [...altTexts];
      while (nextAltTexts.length < nextUrls.length) {
        nextAltTexts.push('');
      }
      return normalizeFixedLength(nextAltTexts, 5);
    }

    const nextAltTexts = [...altTexts];
    let removedIndex = previousUrls.findIndex((url, index) => nextUrls[index] !== url);
    if (removedIndex === -1) {
      removedIndex = nextUrls.length;
    }

    nextAltTexts.splice(removedIndex, previousUrls.length - nextUrls.length);
    return normalizeFixedLength(nextAltTexts, 5);
  }

  function getInitialFormState(currentAsset: Asset): EditFormState {
    return {
      name: currentAsset.name,
      descriptionShort: currentAsset.descriptionShort || '',
      descriptionLongHtml: sanitizeLongDescriptionHtml(
        currentAsset.descriptionLongHtml || currentAsset.description || ''
      ),
      websiteUrl: currentAsset.websiteUrl || '',
      previewUrl: currentAsset.previewUrl || '',
      appCapabilities: currentAsset.appCapabilities || '',
      appInstallUrl: currentAsset.appInstallUrl || '',
      appScopes: [...(currentAsset.appScopes || [])],
      appAvatarAltText: currentAsset.appAvatarAltText || '',
      paymentType: [...(currentAsset.paymentType || [])],
      visibility: currentAsset.visibility || '',
      appCategory: [...(currentAsset.appCategory || [])],
      creatorName: currentAsset.creatorName || '',
      creatorWebsite: currentAsset.creatorWebsite || '',
      creatorContactEmail: currentAsset.creatorContactEmail || '',
      appFeaturesOverview: normalizeFixedLength(currentAsset.appFeaturesOverview, 5),
      appDeveloperNotes: currentAsset.appDeveloperNotes || '',
      appAccessCredentials: currentAsset.appAccessCredentials || '',
      appVideoUrl: currentAsset.appVideoUrl || '',
      appDemoVideoUrl: currentAsset.appDemoVideoUrl || '',
      appPrivacyPolicyUrl: currentAsset.appPrivacyPolicyUrl || '',
      appSupportEmail: currentAsset.appSupportEmail || '',
      appSupportUrl: currentAsset.appSupportUrl || '',
      appTermsUrl: currentAsset.appTermsUrl || '',
      appScreenshotAltTexts: normalizeFixedLength(currentAsset.appScreenshotAltTexts, 5)
    };
  }

  function getInitialSecondaryThumbnails(currentAsset: Asset): string[] {
    return (
      currentAsset.secondaryThumbnails ||
      (currentAsset.secondaryThumbnailUrl ? [currentAsset.secondaryThumbnailUrl] : [])
    );
  }

  let formData = $state<EditFormState>(EMPTY_FORM_STATE);
  let thumbnailUrl = $state<string | null>(null);
  let secondaryThumbnails = $state<string[]>([]);
  let carouselImages = $state<string[]>([]);
  let selectedScope = $state('');

  let lastAssetId = $state<string | null>(null);
  $effect(() => {
    if (asset.id !== lastAssetId) {
      lastAssetId = asset.id;
      formData = getInitialFormState(asset);
      thumbnailUrl = asset.thumbnailUrl || null;
      secondaryThumbnails = getInitialSecondaryThumbnails(asset);
      carouselImages = asset.carouselImages || [];
      selectedScope = '';
      error = null;
      nameError = null;
      isCheckingName = false;
    }
  });

  let isLoading = $state(false);
  let isArchiving = $state(false);
  let error = $state<string | null>(null);
  let nameError = $state<string | null>(null);
  let isCheckingName = $state(false);
  let nameCheckTimeout: ReturnType<typeof setTimeout> | null = null;
  let showArchiveConfirm = $state(false);

  const originalName = $derived(asset.name);
  const canArchive = $derived(!asset.status.includes('Delisted'));
  const isAppAsset = $derived(asset.type === 'App');
  const canEditName = $derived(asset.type !== 'App');
  const requiresInstallUrl = $derived(
    formData.appCapabilities === 'Data Client v2' || formData.appCapabilities === 'Hybrid'
  );
  const visibleScreenshotAltCount = $derived(Math.min(carouselImages.length, 5));

  function formStatesEqual(left: EditFormState, right: EditFormState): boolean {
    return (
      left.name === right.name &&
      left.descriptionShort === right.descriptionShort &&
      left.descriptionLongHtml === right.descriptionLongHtml &&
      left.websiteUrl === right.websiteUrl &&
      left.previewUrl === right.previewUrl &&
      left.appCapabilities === right.appCapabilities &&
      left.appInstallUrl === right.appInstallUrl &&
      arraysEqual(left.appScopes, right.appScopes) &&
      left.appAvatarAltText === right.appAvatarAltText &&
      arraysEqual(left.paymentType, right.paymentType) &&
      left.visibility === right.visibility &&
      arraysEqual(left.appCategory, right.appCategory) &&
      left.creatorName === right.creatorName &&
      left.creatorWebsite === right.creatorWebsite &&
      left.creatorContactEmail === right.creatorContactEmail &&
      arraysEqual(left.appFeaturesOverview, right.appFeaturesOverview) &&
      left.appDeveloperNotes === right.appDeveloperNotes &&
      left.appAccessCredentials === right.appAccessCredentials &&
      left.appVideoUrl === right.appVideoUrl &&
      left.appDemoVideoUrl === right.appDemoVideoUrl &&
      left.appPrivacyPolicyUrl === right.appPrivacyPolicyUrl &&
      left.appSupportEmail === right.appSupportEmail &&
      left.appSupportUrl === right.appSupportUrl &&
      left.appTermsUrl === right.appTermsUrl &&
      arraysEqual(left.appScreenshotAltTexts, right.appScreenshotAltTexts)
    );
  }

  const hasUnsavedChanges = $derived.by(() => {
    const initialFormState = getInitialFormState(asset);
    return (
      !formStatesEqual(formData, initialFormState) ||
      thumbnailUrl !== (asset.thumbnailUrl || null) ||
      !arraysEqual(secondaryThumbnails, getInitialSecondaryThumbnails(asset)) ||
      !arraysEqual(carouselImages, asset.carouselImages || [])
    );
  });

  function canDismiss(): boolean {
    if (isLoading || isArchiving) return false;
    if (!hasUnsavedChanges) return true;
    if (typeof window === 'undefined') return false;
    return window.confirm('Discard unsaved changes?');
  }

  function handleDismiss() {
    if (canDismiss()) {
      onClose();
    }
  }

  function handleBeforeUnload(event: BeforeUnloadEvent) {
    if (!hasUnsavedChanges || isLoading || isArchiving) return;
    event.preventDefault();
    event.returnValue = '';
  }

  async function checkNameUniqueness(name: string) {
    if (!canEditName || name === originalName) {
      nameError = null;
      return;
    }

    if (!name.trim()) {
      nameError = 'Name is required';
      return;
    }

    isCheckingName = true;
    try {
      const response = await fetch('/api/assets/check-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), excludeId: asset.id })
      });

      if (!response.ok) {
        throw new Error('Failed to check name');
      }

      const data = (await response.json()) as { available: boolean };
      nameError = data.available ? null : 'An asset with this name already exists';
    } catch {
      nameError = null;
    } finally {
      isCheckingName = false;
    }
  }

  function handleNameChange(event: Event) {
    if (!canEditName) return;

    const target = event.target as HTMLInputElement;
    formData.name = target.value;

    if (nameCheckTimeout) {
      clearTimeout(nameCheckTimeout);
    }

    nameCheckTimeout = setTimeout(() => {
      checkNameUniqueness(target.value);
    }, 500);
  }

  function handleThumbnailChange(url: string | null) {
    thumbnailUrl = url;
    if (isAppAsset && !url) {
      formData.appAvatarAltText = '';
    }
  }

  function handleSecondaryThumbnailsChange(urls: string[]) {
    secondaryThumbnails = urls;
  }

  function handleCarouselImagesChange(urls: string[]) {
    if (isAppAsset) {
      formData.appScreenshotAltTexts = syncScreenshotAltTexts(
        carouselImages,
        urls,
        formData.appScreenshotAltTexts
      );
    }
    carouselImages = urls;
  }

  function handleCapabilityChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    formData.appCapabilities = target.value;
    if (target.value === 'Designer Extension') {
      formData.appInstallUrl = '';
    }
  }

  function handleScopeSelection(event: Event) {
    const target = event.target as HTMLSelectElement;
    selectedScope = target.value;
  }

  function addScope() {
    if (!selectedScope || formData.appScopes.includes(selectedScope)) return;
    formData.appScopes = [...formData.appScopes, selectedScope];
    selectedScope = '';
  }

  function removeScope(scope: string) {
    formData.appScopes = formData.appScopes.filter((entry) => entry !== scope);
  }

  function togglePaymentType(option: (typeof PAYMENT_TYPE_OPTIONS)[number]) {
    formData.paymentType = formData.paymentType.includes(option)
      ? formData.paymentType.filter((entry) => entry !== option)
      : [...formData.paymentType, option];
  }

  function setVisibility(option: (typeof VISIBILITY_OPTIONS)[number]) {
    formData.visibility = formData.visibility === option ? '' : option;
  }

  function handleCategoryChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const selectedValues = Array.from(target.selectedOptions, (option) => option.value).slice(0, 2);
    formData.appCategory = selectedValues;
  }

  function updateFeature(index: number, value: string) {
    const nextFeatures = [...formData.appFeaturesOverview];
    nextFeatures[index] = value;
    formData.appFeaturesOverview = nextFeatures;
  }

  function updateScreenshotAltText(index: number, value: string) {
    const nextAltTexts = [...formData.appScreenshotAltTexts];
    nextAltTexts[index] = value;
    formData.appScreenshotAltTexts = nextAltTexts;
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();
    error = null;

    if (canEditName && !formData.name.trim()) {
      error = 'Name is required';
      return;
    }

    if (nameError) {
      error = nameError;
      return;
    }

    if (isAppAsset && requiresInstallUrl && !formData.appInstallUrl.trim()) {
      error = 'Install URL is required for Data Client and Hybrid apps';
      return;
    }

    if (isAppAsset && thumbnailUrl && !formData.appAvatarAltText.trim()) {
      error = 'App icon alt text is required when an icon is present';
      return;
    }

    if (
      isAppAsset &&
      carouselImages.some((_, index) => !formData.appScreenshotAltTexts[index]?.trim())
    ) {
      error = 'Provide alt text for each app screenshot';
      return;
    }

    if (isAppAsset && formData.appCategory.length > 2) {
      error = 'Select at most two app categories';
      return;
    }

    isLoading = true;

    try {
      const changedFields: string[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const structuredChanges: Record<string, any> = {};
      const isNewUploadUrl = (url: string) => url.includes('/api/uploads/');
      const registerTextChange = (
        label: string,
        fieldName: string,
        fromValue: string,
        toValue: string
      ) => {
        if (fromValue === toValue) return;
        changedFields.push(label);
        structuredChanges[fieldName] = { from: fromValue, to: toValue };
      };
      const registerListChange = (
        label: string,
        fieldName: string,
        fromValues: string[],
        toValues: string[]
      ) => {
        if (arraysEqual(fromValues, toValues)) return;
        changedFields.push(label);
        structuredChanges[fieldName] = {
          from: fromValues.join('\n'),
          to: toValues.join('\n')
        };
      };

      if (canEditName) {
        registerTextChange('name', 'Name', asset.name, formData.name.trim());
      }

      registerTextChange(
        'short description',
        'ℹ️Description (Short)',
        asset.descriptionShort || '',
        formData.descriptionShort
      );
      registerTextChange(
        'long description',
        'ℹ️Description (Long).html',
        asset.descriptionLongHtml || asset.description || '',
        formData.descriptionLongHtml
      );
      registerTextChange(
        'website URL',
        '🔗Website URL',
        asset.websiteUrl || '',
        formData.websiteUrl
      );

      if (isAppAsset) {
        registerTextChange(
          'app capabilities',
          'ℹ️Capabilities (🖥️ only)',
          asset.appCapabilities || '',
          formData.appCapabilities
        );
        registerTextChange(
          'app install URL',
          '🔗Install URL (🖥️ only)',
          asset.appInstallUrl || '',
          formData.appInstallUrl
        );
        registerListChange(
          'app scopes',
          'all-selected-scopes',
          asset.appScopes || [],
          formData.appScopes
        );
        registerTextChange(
          'app icon alt text',
          'App Avatar Alt Text',
          asset.appAvatarAltText || '',
          formData.appAvatarAltText
        );
        registerListChange(
          'payment type',
          'ℹ️💲Payment Types',
          asset.paymentType || [],
          formData.paymentType
        );
        registerTextChange(
          'visibility',
          'ℹ️Visibility (🖥️ only)',
          asset.visibility || '',
          formData.visibility
        );
        registerListChange(
          'app category',
          'ℹ️🪣Categories (Text)',
          asset.appCategory || [],
          formData.appCategory
        );
        registerTextChange(
          'creator name',
          '🎨Creator Name',
          asset.creatorName || '',
          formData.creatorName
        );
        registerTextChange(
          'creator Webflow account email override',
          '👀🎨📧 Creator WF Account Email (Override)',
          asset.creatorWebsite || '',
          formData.creatorWebsite
        );
        registerTextChange(
          'contact email',
          '🎨📧 Creator Email',
          asset.creatorContactEmail || '',
          formData.creatorContactEmail
        );
        registerListChange(
          'features overview',
          '❓ℹ️✨Features Text (MIGRATE TO LINKED FIELD)',
          trimList(normalizeFixedLength(asset.appFeaturesOverview, 5)),
          trimList(formData.appFeaturesOverview)
        );
        registerTextChange(
          'developer notes',
          'Developer Notes',
          asset.appDeveloperNotes || '',
          formData.appDeveloperNotes
        );
        registerTextChange(
          'app access credentials',
          'ℹ️Credentials',
          asset.appAccessCredentials || '',
          formData.appAccessCredentials
        );
        registerTextChange(
          'promo video URL',
          '🔗Promo Video URL (🖥️ only)',
          asset.appVideoUrl || '',
          formData.appVideoUrl
        );
        registerTextChange(
          'demo video URL',
          '🔗Demo Video URL',
          asset.appDemoVideoUrl || '',
          formData.appDemoVideoUrl
        );
        registerTextChange(
          'privacy policy URL',
          '🔗Privacy Policy URL',
          asset.appPrivacyPolicyUrl || '',
          formData.appPrivacyPolicyUrl
        );
        registerTextChange(
          'support details',
          '🔗Support Email/URL',
          buildSupportValue(asset.appSupportEmail, asset.appSupportUrl),
          buildSupportValue(formData.appSupportEmail, formData.appSupportUrl)
        );
        registerTextChange(
          'terms URL',
          '🔗Terms & Conditions URL',
          asset.appTermsUrl || '',
          formData.appTermsUrl
        );
        registerListChange(
          'screenshot alt text',
          'Alt Text Screenshot',
          trimList(normalizeFixedLength(asset.appScreenshotAltTexts, 5)),
          trimList(formData.appScreenshotAltTexts)
        );
      } else {
        registerTextChange(
          'preview URL',
          '🔗Preview Site URL',
          asset.previewUrl || '',
          formData.previewUrl
        );
      }

      if (thumbnailUrl !== asset.thumbnailUrl) {
        changedFields.push(isAppAsset ? 'app icon' : 'thumbnail');
        const oldUrls = asset.thumbnailUrl ? [{ url: asset.thumbnailUrl }] : [];
        const newUrls = thumbnailUrl ? [{ url: thumbnailUrl }] : [];
        const addedImages = newUrls.filter((image) => isNewUploadUrl(image.url));
        structuredChanges['fld43LxLHMZb2yF7F'] = {
          added: addedImages,
          removed: oldUrls.length > 0 && newUrls.length === 0 ? 1 : 0
        };
      }

      if (!isAppAsset && !arraysEqual(asset.secondaryThumbnails || [], secondaryThumbnails)) {
        changedFields.push('secondary thumbnails');
        const oldUrls = (asset.secondaryThumbnails || []).map((url) => ({ url }));
        const newUrls = secondaryThumbnails.map((url) => ({ url }));
        const addedImages = newUrls.filter((image) => isNewUploadUrl(image.url));
        structuredChanges['fldzKxNCXcgCnEwxu'] = {
          added: addedImages,
          removed: Math.max(0, oldUrls.length - newUrls.length)
        };
      }

      if (!arraysEqual(asset.carouselImages || [], carouselImages)) {
        changedFields.push(isAppAsset ? 'app screenshots' : 'carousel images');
        const oldUrls = (asset.carouselImages || []).map((url) => ({ url }));
        const newUrls = carouselImages.map((url) => ({ url }));
        const addedImages = newUrls.filter((image) => isNewUploadUrl(image.url));
        structuredChanges['fldneaPyoRXBAVtS1'] = {
          added: addedImages,
          removed: Math.max(0, oldUrls.length - newUrls.length)
        };
      }

      trackEvent('asset_update_started', {
        asset_id: asset.id,
        asset_name: asset.name,
        asset_category: asset.category,
        asset_subcategory: asset.subcategory,
        fields_changed: changedFields,
        has_thumbnail_change: thumbnailUrl !== asset.thumbnailUrl,
        has_secondary_change: !arraysEqual(asset.secondaryThumbnails || [], secondaryThumbnails),
        has_carousel_change: !arraysEqual(asset.carouselImages || [], carouselImages)
      });

      const payload: AssetUpdateData = {
        descriptionShort: formData.descriptionShort,
        descriptionLongHtml: sanitizeLongDescriptionHtml(formData.descriptionLongHtml),
        websiteUrl: formData.websiteUrl,
        thumbnailUrl,
        carouselImages
      };
      if (shouldCreateAssetVersionForChanges(structuredChanges)) {
        payload.assetVersionChanges = structuredChanges;
      }

      if (canEditName) {
        payload.name = formData.name.trim();
      }

      if (isAppAsset) {
        payload.appCapabilities = formData.appCapabilities;
        payload.appInstallUrl = formData.appInstallUrl;
        payload.appScopes = [...formData.appScopes];
        payload.appAvatarAltText = formData.appAvatarAltText;
        payload.paymentType = [...formData.paymentType];
        payload.visibility = formData.visibility;
        payload.appCategory = [...formData.appCategory];
        payload.creatorName = formData.creatorName;
        payload.creatorWebsite = formData.creatorWebsite;
        payload.creatorContactEmail = formData.creatorContactEmail;
        payload.appFeaturesOverview = [...formData.appFeaturesOverview];
        payload.appDeveloperNotes = formData.appDeveloperNotes;
        payload.appAccessCredentials = formData.appAccessCredentials;
        payload.appVideoUrl = formData.appVideoUrl;
        payload.appDemoVideoUrl = formData.appDemoVideoUrl;
        payload.appPrivacyPolicyUrl = formData.appPrivacyPolicyUrl;
        payload.appSupportEmail = formData.appSupportEmail;
        payload.appSupportUrl = formData.appSupportUrl;
        payload.appTermsUrl = formData.appTermsUrl;
        payload.appScreenshotAltTexts = formData.appScreenshotAltTexts.slice(0, 5);
      } else {
        payload.previewUrl = formData.previewUrl;
        payload.secondaryThumbnailUrl = secondaryThumbnails[0] || null;
        payload.secondaryThumbnails = [...secondaryThumbnails];
      }

      const saveResult = await onSave(payload);

      trackEvent('asset_update_completed', {
        asset_id: asset.id,
        asset_name: asset.name,
        asset_category: asset.category,
        asset_subcategory: asset.subcategory,
        fields_changed: changedFields
      });

      toast.success('Asset updated successfully');
      if (saveResult?.versionWarning) {
        toast.warning(saveResult.versionWarning);
      }
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save changes';
      error = message;
      toast.error(message);

      trackEvent('asset_update_failed', {
        asset_id: asset.id,
        asset_category: asset.category,
        asset_subcategory: asset.subcategory,
        error_message: message
      });
    } finally {
      isLoading = false;
    }
  }

  async function handleArchive() {
    if (!onArchive || isArchiving) return;

    trackEvent('asset_archive_initiated', {
      asset_id: asset.id,
      asset_name: asset.name,
      asset_category: asset.category,
      asset_subcategory: asset.subcategory
    });

    isArchiving = true;
    error = null;

    try {
      await onArchive();
      trackEvent('asset_archived', {
        asset_id: asset.id,
        asset_name: asset.name,
        asset_category: asset.category,
        asset_subcategory: asset.subcategory
      });

      toast.success('Asset archived successfully');
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to archive asset';
      error = message;
      toast.error(message);
    } finally {
      isArchiving = false;
      showArchiveConfirm = false;
    }
  }

  $effect(() => {
    return () => {
      if (nameCheckTimeout) {
        clearTimeout(nameCheckTimeout);
      }
    };
  });

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
  closeOnBackdrop={!hasUnsavedChanges && !isLoading && !isArchiving}
  title={isAppAsset ? 'Edit App' : 'Edit Asset'}
  size="xl"
>
  <p class="modal-description">
    {isAppAsset
      ? 'Update the fields this app listing supports in the marketplace record.'
      : 'Update your asset information and media.'}
  </p>
  <form onsubmit={handleSubmit} class="form">
    {#if error}
      <div class="error-message">
        {error}
      </div>
    {/if}

    <div class="form-section">
      <h3 class="section-title">Basic Information</h3>
      <div class="form-field">
        <Label for="name">{isAppAsset ? 'App Name' : 'Name *'}</Label>
        <Input
          id="name"
          type="text"
          value={formData.name}
          oninput={handleNameChange}
          placeholder="Asset name"
          required={canEditName}
          disabled={!canEditName}
        />
        {#if canEditName}
          {#if isCheckingName}
            <span class="field-hint checking">Checking availability...</span>
          {:else if nameError}
            <span class="field-hint error">{nameError}</span>
          {:else if formData.name !== originalName && formData.name.trim()}
            <span class="field-hint success">Name is available</span>
          {/if}
        {:else}
          <span class="field-hint">
            App name updates should stay aligned with the submission form and are read-only here.
          </span>
        {/if}
      </div>

      <div class="form-field">
        <Label for="descriptionShort"
          >{isAppAsset ? 'App Preview Description' : 'Short Description'}</Label
        >
        <Input
          id="descriptionShort"
          type="text"
          bind:value={formData.descriptionShort}
          placeholder={isAppAsset
            ? 'Short app description for marketplace previews'
            : 'Brief description (appears in search results)'}
          maxlength={isAppAsset ? 100 : undefined}
        />
        {#if isAppAsset}
          <span class="field-hint">{formData.descriptionShort.length}/100 characters</span>
        {/if}
      </div>

      <div class="form-field">
        <Label for="descriptionLongHtml"
          >{isAppAsset ? 'App Detail Description' : 'Long Description'}</Label
        >
        <LongDescriptionEditor
          id="descriptionLongHtml"
          value={formData.descriptionLongHtml}
          onchange={(value) => (formData.descriptionLongHtml = value)}
          placeholder="Detailed description"
          disabled={isLoading}
        />
        {#if isAppAsset}
          <span class="field-hint"
            >Long-form marketplace detail copy is saved as sanitized HTML.</span
          >
        {/if}
      </div>

      <div class="form-row">
        <div class="form-field">
          <Label for="websiteUrl">Website URL</Label>
          <Input
            id="websiteUrl"
            type="url"
            bind:value={formData.websiteUrl}
            placeholder="https://example.com"
          />
        </div>

        {#if !isAppAsset}
          <div class="form-field">
            <Label for="previewUrl">Preview URL</Label>
            <Input
              id="previewUrl"
              type="url"
              bind:value={formData.previewUrl}
              placeholder="https://preview.example.com"
            />
          </div>
        {/if}
      </div>

      {#if isAppAsset}
        <div class="form-field">
          <Label for="appVideoUrl">App Promo Video URL</Label>
          <Input
            id="appVideoUrl"
            type="url"
            bind:value={formData.appVideoUrl}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>
      {/if}
    </div>

    {#if isAppAsset}
      <div class="form-section">
        <h3 class="section-title">Capabilities & Access</h3>
        <div class="form-field">
          <Label for="appCapabilities">App Capabilities</Label>
          <select
            id="appCapabilities"
            class="form-control native-select"
            bind:value={formData.appCapabilities}
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
            <Label for="appInstallUrl">App Install URL</Label>
            <Input
              id="appInstallUrl"
              type="url"
              bind:value={formData.appInstallUrl}
              placeholder="https://yourapp.com/auth/webflow"
            />
            <span class="field-hint">
              Use the install or authorization entry point, not the OAuth callback URL.
            </span>
          </div>
        {/if}

        <div class="form-field">
          <Label for="scopeSelector">Scopes</Label>
          <div class="scope-builder">
            <select
              id="scopeSelector"
              class="form-control native-select"
              bind:value={selectedScope}
              onchange={handleScopeSelection}
            >
              <option value="">Select a scope to add...</option>
              {#each APP_SCOPE_OPTIONS as option}
                <option value={option}>{option}</option>
              {/each}
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onclick={addScope}
              disabled={!selectedScope}
            >
              Add Scope
            </Button>
          </div>
          {#if formData.appScopes.length > 0}
            <div class="scope-list">
              {#each formData.appScopes as scope}
                <button type="button" class="scope-chip" onclick={() => removeScope(scope)}>
                  <span>{scope}</span>
                  <span aria-hidden="true">×</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <div class="form-field">
          <Label for="appAccessCredentials">App Access Credentials</Label>
          <Textarea
            id="appAccessCredentials"
            bind:value={formData.appAccessCredentials}
            placeholder="Username, password, setup notes, or N/A"
            rows={5}
            maxlength={2000}
          />
          <span class="field-hint">{formData.appAccessCredentials.length}/2000 characters</span>
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
                  checked={formData.paymentType.includes(option)}
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
                  checked={formData.visibility === option}
                  onchange={() => setVisibility(option)}
                />
                <span>{option}</span>
              </label>
            {/each}
          </div>
        </div>

        <div class="form-field">
          <Label for="appCategory">App Category</Label>
          <select
            id="appCategory"
            class="form-control native-select native-select--multi"
            multiple
            size="8"
            onchange={handleCategoryChange}
          >
            {#each APP_CATEGORY_OPTIONS as option}
              <option value={option} selected={formData.appCategory.includes(option)}>
                {option}
              </option>
            {/each}
          </select>
          <span class="field-hint">{formData.appCategory.length} of 2 categories selected</span>
        </div>

        <div class="form-field">
          <Label>Features Overview</Label>
          <div class="stacked-fields">
            {#each formData.appFeaturesOverview as feature, index}
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
            <Label for="creatorName">Creator Name</Label>
            <Input id="creatorName" type="text" bind:value={formData.creatorName} />
          </div>
          <div class="form-field">
            <Label for="creatorWebsite">Creator Webflow Account Email Override</Label>
            <Input
              id="creatorWebsite"
              type="email"
              bind:value={formData.creatorWebsite}
              placeholder="creator@example.com"
            />
          </div>
        </div>

        <div class="form-field">
          <Label for="creatorContactEmail">Contact Email</Label>
          <Input id="creatorContactEmail" type="email" bind:value={formData.creatorContactEmail} />
        </div>

        <div class="form-row">
          <div class="form-field">
            <Label for="appDemoVideoUrl">Review Team Demo Video URL</Label>
            <Input id="appDemoVideoUrl" type="url" bind:value={formData.appDemoVideoUrl} />
          </div>
          <div class="form-field">
            <Label for="appPrivacyPolicyUrl">Privacy Policy URL</Label>
            <Input id="appPrivacyPolicyUrl" type="url" bind:value={formData.appPrivacyPolicyUrl} />
          </div>
        </div>

        <div class="form-row">
          <div class="form-field">
            <Label for="appSupportEmail">Support Email</Label>
            <Input id="appSupportEmail" type="email" bind:value={formData.appSupportEmail} />
          </div>
          <div class="form-field">
            <Label for="appSupportUrl">Support URL</Label>
            <Input id="appSupportUrl" type="url" bind:value={formData.appSupportUrl} />
          </div>
        </div>

        <div class="form-row">
          <div class="form-field">
            <Label for="appTermsUrl">Terms and Conditions URL</Label>
            <Input id="appTermsUrl" type="url" bind:value={formData.appTermsUrl} />
          </div>
          <div class="form-field">
            <Label for="appDeveloperNotes">Developer Notes</Label>
            <Textarea
              id="appDeveloperNotes"
              bind:value={formData.appDeveloperNotes}
              rows={4}
              placeholder="Additional context for reviewers"
            />
          </div>
        </div>
      </div>
    {/if}

    <div class="form-section">
      <h3 class="section-title">Images</h3>
      <div class="image-field">
        <ImageUploader
          value={thumbnailUrl}
          onchange={handleThumbnailChange}
          label={isAppAsset ? 'App Icon' : 'Primary Thumbnail'}
          description={isAppAsset
            ? 'Square icon. Use a clean 1:1 image.'
            : '150:199 aspect ratio (e.g., 750×995px)'}
          uploadType={isAppAsset ? 'image' : 'thumbnail'}
          aspectRatio={isAppAsset ? { width: 1, height: 1 } : null}
          disabled={isLoading}
        />
      </div>

      {#if isAppAsset && thumbnailUrl}
        <div class="form-field">
          <Label for="appAvatarAltText">App Icon Alt Text</Label>
          <Input
            id="appAvatarAltText"
            type="text"
            bind:value={formData.appAvatarAltText}
            placeholder="Describe the app icon"
          />
        </div>
      {/if}

      <div class="carousel-field">
        <CarouselUploader
          value={carouselImages}
          onchange={handleCarouselImagesChange}
          minImages={isAppAsset ? 0 : 3}
          maxImages={isAppAsset ? 5 : 8}
          aspectRatio={isAppAsset ? APP_SCREENSHOT_RATIO : { width: 16, height: 10 }}
          disabled={isLoading}
        />
        {#if isAppAsset}
          <span class="field-hint">
            App screenshots should follow the external submission form shape: up to 5 images.
          </span>
        {/if}
      </div>

      {#if isAppAsset}
        {#if visibleScreenshotAltCount > 0}
          <div class="stacked-fields">
            {#each Array.from({ length: visibleScreenshotAltCount }) as _, index}
              <div class="form-field">
                <Label for={`appScreenshotAltText-${index}`}>Screenshot {index + 1} Alt Text</Label>
                <Input
                  id={`appScreenshotAltText-${index}`}
                  type="text"
                  value={formData.appScreenshotAltTexts[index] || ''}
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
      {:else}
        <div class="secondary-field">
          <SecondaryThumbnailUploader
            value={secondaryThumbnails}
            onchange={handleSecondaryThumbnailsChange}
            maxImages={1}
            disabled={isLoading}
          />
        </div>
      {/if}
    </div>
  </form>
  <div class="modal-footer">
    <div class="footer-left">
      {#if canArchive && onArchive}
        <Button
          type="button"
          variant="destructive"
          onclick={() => (showArchiveConfirm = true)}
          disabled={isArchiving}
        >
          {isArchiving ? 'Archiving...' : 'Archive Asset'}
        </Button>
      {/if}
    </div>
    <div class="footer-right">
      <Button type="button" variant="secondary" onclick={handleDismiss} disabled={isLoading}>
        Cancel
      </Button>
      <Button
        type="button"
        variant="default"
        onclick={handleSubmit}
        disabled={isLoading || !!nameError || isCheckingName}
      >
        {isLoading ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  </div>
</Dialog>

<Dialog
  isOpen={showArchiveConfirm}
  onClose={() => (showArchiveConfirm = false)}
  title="Archive this asset?"
  size="sm"
>
  <div class="confirm-dialog">
    <p>
      This asset will be archived and removed from the active dashboard workflow. This action cannot
      be undone here.
    </p>
    <div class="confirm-actions">
      <Button
        variant="secondary"
        onclick={() => (showArchiveConfirm = false)}
        disabled={isArchiving}
      >
        Cancel
      </Button>
      <Button variant="destructive" onclick={handleArchive} disabled={isArchiving}>
        {isArchiving ? 'Archiving...' : 'Archive asset'}
      </Button>
    </div>
  </div>
</Dialog>

<style>
  .modal-description {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    margin: 0;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    margin-top: var(--space-lg);
  }

  .form-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .section-title {
    font-size: var(--text-body);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    margin: 0;
    padding-bottom: var(--space-sm);
    border-bottom: 1px solid var(--color-border-default);
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-md);
  }

  @media (max-width: 640px) {
    .form-row {
      grid-template-columns: 1fr;
    }
  }

  .field-hint {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .field-hint.checking {
    color: var(--color-fg-muted);
  }

  .field-hint.error {
    color: var(--color-error);
  }

  .field-hint.success {
    color: var(--color-success);
  }

  .error-message {
    padding: var(--space-sm);
    background: color-mix(in srgb, var(--color-error) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-error) 35%, transparent);
    border-radius: var(--radius-md);
    color: var(--color-error);
    font-size: var(--text-body-sm);
  }

  .confirm-dialog {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    padding: var(--space-md);
  }

  .confirm-dialog p {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    line-height: 1.5;
  }

  .confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
  }

  .native-select {
    width: 100%;
  }

  .native-select--multi {
    min-height: 11rem;
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

  .stacked-fields {
    display: grid;
    gap: var(--space-sm);
  }

  .modal-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md) 0 0;
    margin-top: var(--space-md);
    border-top: 1px solid var(--color-border-default);
  }

  .footer-left,
  .footer-right {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  @media (max-width: 640px) {
    .modal-footer {
      flex-direction: column-reverse;
      align-items: stretch;
    }

    .footer-left,
    .footer-right,
    .scope-builder {
      width: 100%;
    }

    .footer-right {
      justify-content: stretch;
    }
  }
</style>

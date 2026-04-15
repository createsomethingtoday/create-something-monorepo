<script lang="ts">
  import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from './ui';
  import CarouselUploader from './CarouselUploader.svelte';
  import ImageUploader from './ImageUploader.svelte';
  import SecondaryThumbnailUploader from './SecondaryThumbnailUploader.svelte';
  import type { Asset, AssetUpdateData } from '$lib/server/airtable';
  import { toast } from '$lib/stores/toast';
  import { onMount } from 'svelte';
  import { trackEvent } from '$lib/utils/analytics';
  import {
    APP_CAPABILITY_OPTIONS,
    APP_CATEGORY_OPTIONS,
    APP_SCOPE_OPTIONS,
    APP_VISIBILITY_OPTIONS,
    PAYMENT_TYPE_OPTIONS
  } from '$lib/intake/app';
  import {
    TEMPLATE_CATEGORY_OPTIONS,
    TEMPLATE_FEATURE_OPTIONS,
    TEMPLATE_GALLERY_DIMENSIONS,
    TEMPLATE_GALLERY_MAX_SIZE,
    TEMPLATE_PREVIEW_URL_PREFIX,
    TEMPLATE_PRIMARY_TAGS,
    TEMPLATE_PRICE_OPTIONS,
    TEMPLATE_SITE_TYPE_OPTIONS,
    TEMPLATE_THUMBNAIL_DIMENSIONS,
    TEMPLATE_THUMBNAIL_MAX_SIZE,
    buildTemplateDetailsHtml,
    buildTemplateMetadataDescription,
    joinCommaList,
    normalizeCommaList,
    normalizeTemplatePreviewUrl,
    validateTemplateNameSyntax
  } from '$lib/intake/template';

  const APP_SCREENSHOT_RATIO = { width: 1280, height: 846 };
  const TEMPLATE_DRAFT_EDITABLE_STATUSES = ['Draft', 'Upcoming', 'Scheduled'];

  const scriptInitTime = performance.now();
  console.log('[DEBUG:A] EditAssetModal script init', {
    scriptInitTime: scriptInitTime.toFixed(2)
  });

  interface Props {
    asset: Asset;
    onClose: () => void;
    onSave: (data: AssetUpdateData) => Promise<void>;
    onArchive?: () => Promise<void>;
  }

  interface EditFormState {
    name: string;
    descriptionShort: string;
    descriptionLongHtml: string;
    websiteUrl: string;
    previewUrl: string;
    priceString: string;
    templateCategory: string;
    templateTags: string;
    templateStyleTags: string;
    templateSiteTypes: string[];
    templateFeatureFlags: string[];
    templateLongDescription: string;
    templateNotes: string;
    templateChecklistConfirmed: boolean;
    templateAgreementConfirmed: boolean;
    appCapabilities: string;
    appInstallUrl: string;
    appScopes: string[];
    appAvatarAltText: string;
    paymentType: string[];
    visibility: string;
    appCategory: string[];
    creatorName: string;
    creatorWebflowEmailOverride: string;
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
    priceString: '',
    templateCategory: '',
    templateTags: '',
    templateStyleTags: '',
    templateSiteTypes: [],
    templateFeatureFlags: [],
    templateLongDescription: '',
    templateNotes: '',
    templateChecklistConfirmed: false,
    templateAgreementConfirmed: false,
    appCapabilities: '',
    appInstallUrl: '',
    appScopes: [],
    appAvatarAltText: '',
    paymentType: [],
    visibility: '',
    appCategory: [],
    creatorName: '',
    creatorWebflowEmailOverride: '',
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

  function uniqueTrimmedList(values: string[]): string[] {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
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
      descriptionLongHtml: currentAsset.descriptionLongHtml || currentAsset.description || '',
      websiteUrl: currentAsset.websiteUrl || '',
      previewUrl: currentAsset.previewUrl || '',
      priceString: currentAsset.priceString || '',
      templateCategory: currentAsset.templateCategory || currentAsset.category || '',
      templateTags: joinCommaList(currentAsset.templateTags || []),
      templateStyleTags: joinCommaList(currentAsset.templateStyleTags || []),
      templateSiteTypes: [...(currentAsset.templateSiteTypes || [])],
      templateFeatureFlags: [...(currentAsset.templateFeatureFlags || [])],
      templateLongDescription: currentAsset.templateLongDescription || '',
      templateNotes: currentAsset.templateNotes || '',
      templateChecklistConfirmed: false,
      templateAgreementConfirmed: false,
      appCapabilities: currentAsset.appCapabilities || '',
      appInstallUrl: currentAsset.appInstallUrl || '',
      appScopes: [...(currentAsset.appScopes || [])],
      appAvatarAltText: currentAsset.appAvatarAltText || '',
      paymentType: [...(currentAsset.paymentType || [])],
      visibility: currentAsset.visibility || '',
      appCategory: [...(currentAsset.appCategory || [])],
      creatorName: currentAsset.creatorName || '',
      creatorWebflowEmailOverride: currentAsset.creatorWebflowEmailOverride || '',
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
  let modalRef: HTMLDivElement | undefined = $state();

  const originalName = $derived(asset.name);
  const canArchive = $derived(!asset.status.includes('Delisted'));
  const isAppAsset = $derived(asset.type === 'App');
  const isTemplateAsset = $derived(asset.type === 'Template');
  const canEditName = $derived(asset.type !== 'App');
  const requiresInstallUrl = $derived(
    formData.appCapabilities === 'Data Client v2' || formData.appCapabilities === 'Hybrid'
  );
  const isDraftTemplateAsset = $derived(
    isTemplateAsset && TEMPLATE_DRAFT_EDITABLE_STATUSES.includes(asset.status)
  );
  const visibleScreenshotAltCount = $derived(Math.min(carouselImages.length, 5));

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

  function toggleSelection(values: string[], option: string): string[] {
    return values.includes(option)
      ? values.filter((entry) => entry !== option)
      : [...values, option];
  }

  function removeScope(scope: string) {
    formData.appScopes = formData.appScopes.filter((entry) => entry !== scope);
  }

  function togglePaymentType(option: (typeof PAYMENT_TYPE_OPTIONS)[number]) {
    formData.paymentType = formData.paymentType.includes(option)
      ? formData.paymentType.filter((entry) => entry !== option)
      : [...formData.paymentType, option];
  }

  function setVisibility(option: (typeof APP_VISIBILITY_OPTIONS)[number]) {
    formData.visibility = formData.visibility === option ? '' : option;
  }

  function handleCategoryChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const selectedValues = Array.from(target.selectedOptions, (option) => option.value).slice(0, 2);
    formData.appCategory = selectedValues;
  }

  function toggleTemplateSiteType(option: string) {
    formData.templateSiteTypes = toggleSelection(formData.templateSiteTypes, option);
  }

  function toggleTemplateFeatureFlag(option: string) {
    formData.templateFeatureFlags = toggleSelection(formData.templateFeatureFlags, option);
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

    const nextName = formData.name.trim();
    const nextTemplateShortDescription = formData.descriptionShort.trim();
    const nextTemplateLongDescription = formData.templateLongDescription.trim();
    const nextTemplateNotes = formData.templateNotes.trim();
    const nextTemplatePublishedUrl = formData.websiteUrl.trim();
    const nextTemplatePreviewUrlRaw = formData.previewUrl.trim();
    const nextTemplatePriceString = formData.priceString.trim();
    const nextTemplateCategory = formData.templateCategory.trim();
    const nextTemplateTags = uniqueTrimmedList(normalizeCommaList(formData.templateTags));
    const nextTemplateStyleTags = uniqueTrimmedList(normalizeCommaList(formData.templateStyleTags));
    const nextTemplateSiteTypes = uniqueTrimmedList(formData.templateSiteTypes);
    const nextTemplateFeatureFlags = uniqueTrimmedList(formData.templateFeatureFlags);
    let normalizedTemplatePreviewUrl = nextTemplatePreviewUrlRaw;

    if (canEditName && !nextName) {
      error = 'Name is required';
      return;
    }

    if (nameError) {
      error = nameError;
      return;
    }

    if (isTemplateAsset) {
      const nameSyntax = validateTemplateNameSyntax(nextName);
      if (!nameSyntax.valid) {
        error = nameSyntax.errors[0] || 'Template name failed validation';
        return;
      }

      if (nextTemplateShortDescription.length > 250) {
        error = 'Short description must be 250 characters or fewer';
        return;
      }

      if (nextTemplatePreviewUrlRaw) {
        try {
          normalizedTemplatePreviewUrl = normalizeTemplatePreviewUrl(nextTemplatePreviewUrlRaw);
        } catch (err) {
          error = err instanceof Error ? err.message : 'Preview URL is invalid';
          return;
        }
      }
    }

    if (isDraftTemplateAsset) {
      if (!nextTemplateShortDescription) {
        error = 'Short description is required for template drafts';
        return;
      }

      if (!nextTemplateLongDescription) {
        error = 'Long description is required for template drafts';
        return;
      }

      if (!nextTemplatePublishedUrl) {
        error = 'Published URL is required for template drafts';
        return;
      }

      if (!normalizedTemplatePreviewUrl) {
        error = `Preview URL must contain ${TEMPLATE_PREVIEW_URL_PREFIX}`;
        return;
      }

      if (!nextTemplatePriceString) {
        error = 'Price model is required for template drafts';
        return;
      }

      if (!nextTemplateCategory) {
        error = 'Category is required for template drafts';
        return;
      }

      if (!thumbnailUrl) {
        error = 'Primary thumbnail is required for template drafts';
        return;
      }

      if (carouselImages.length === 0) {
        error = 'At least one gallery image is required for template drafts';
        return;
      }

      if (!formData.templateChecklistConfirmed || !formData.templateAgreementConfirmed) {
        error = 'Complete the submission checklist and agreement before saving this draft';
        return;
      }
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
      const registerDerivedChange = (fieldName: string, fromValue: string, toValue: string) => {
        if (fromValue === toValue) return;
        structuredChanges[fieldName] = { from: fromValue, to: toValue };
      };

      if (canEditName) {
        registerTextChange('name', 'Name', asset.name, nextName);
      }

      if (isTemplateAsset) {
        registerTextChange(
          'short description',
          'ℹ️Description (Short)',
          asset.descriptionShort || '',
          nextTemplateShortDescription
        );
        registerTextChange(
          'published URL',
          '🔗Website URL',
          asset.websiteUrl || '',
          nextTemplatePublishedUrl
        );
        registerTextChange(
          'preview URL',
          '🔗Preview Site URL',
          asset.previewUrl || '',
          normalizedTemplatePreviewUrl
        );
        registerTextChange(
          'price model',
          '🥞💲Template Price String (🏗️ only)',
          asset.priceString || '',
          nextTemplatePriceString
        );
        registerTextChange(
          'category',
          'Template Category',
          asset.templateCategory || asset.category || '',
          nextTemplateCategory
        );
        registerListChange('tags', 'Template Tags', asset.templateTags || [], nextTemplateTags);
        registerListChange(
          'style tags',
          'Template Style Tags',
          asset.templateStyleTags || [],
          nextTemplateStyleTags
        );
        registerListChange(
          'site types',
          'Template Site Types',
          asset.templateSiteTypes || [],
          nextTemplateSiteTypes
        );
        registerListChange(
          'feature flags',
          'Template Feature Flags',
          asset.templateFeatureFlags || [],
          nextTemplateFeatureFlags
        );
        registerTextChange(
          'long description',
          'Template Long Description',
          asset.templateLongDescription || '',
          nextTemplateLongDescription
        );
        registerTextChange('notes', 'Template Notes', asset.templateNotes || '', nextTemplateNotes);

        registerDerivedChange(
          '📝Description',
          buildTemplateMetadataDescription({
            category: asset.templateCategory || asset.category || '',
            tags: asset.templateTags || [],
            siteTypes: asset.templateSiteTypes || [],
            featureFlags: asset.templateFeatureFlags || [],
            notes: asset.templateNotes || ''
          }),
          buildTemplateMetadataDescription({
            category: nextTemplateCategory,
            tags: nextTemplateTags,
            siteTypes: nextTemplateSiteTypes,
            featureFlags: nextTemplateFeatureFlags,
            notes: nextTemplateNotes
          })
        );
        registerDerivedChange(
          'ℹ️Description (Long).html',
          buildTemplateDetailsHtml({
            category: asset.templateCategory || asset.category || '',
            tags: asset.templateTags || [],
            styleTags: asset.templateStyleTags || [],
            siteTypes: asset.templateSiteTypes || [],
            featureFlags: asset.templateFeatureFlags || [],
            longDescription: asset.templateLongDescription || '',
            notes: asset.templateNotes || '',
            publishedUrl: asset.websiteUrl || ''
          }),
          buildTemplateDetailsHtml({
            category: nextTemplateCategory,
            tags: nextTemplateTags,
            styleTags: nextTemplateStyleTags,
            siteTypes: nextTemplateSiteTypes,
            featureFlags: nextTemplateFeatureFlags,
            longDescription: nextTemplateLongDescription,
            notes: nextTemplateNotes,
            publishedUrl: nextTemplatePublishedUrl
          })
        );
      } else {
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
      }

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
          'creator Webflow email override',
          '👀🎨📧 Creator WF Account Email (Override)',
          asset.creatorWebflowEmailOverride || '',
          formData.creatorWebflowEmailOverride
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
      } else if (!isTemplateAsset) {
        registerTextChange(
          'preview URL',
          '🔗Preview Site URL',
          asset.previewUrl || '',
          formData.previewUrl.trim()
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
        changedFields.push(
          isAppAsset ? 'app screenshots' : isTemplateAsset ? 'gallery images' : 'carousel images'
        );
        const oldUrls = (asset.carouselImages || []).map((url) => ({ url }));
        const newUrls = carouselImages.map((url) => ({ url }));
        const addedImages = newUrls.filter((image) => isNewUploadUrl(image.url));
        structuredChanges['fldneaPyoRXBAVtS1'] = {
          added: addedImages,
          removed: Math.max(0, oldUrls.length - newUrls.length)
        };
      }

      if (changedFields.length > 0) {
        fetch(`/api/assets/${asset.id}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ changes: structuredChanges })
        }).catch(() => {
          // Ignore version creation failures during save.
        });
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
        thumbnailUrl,
        carouselImages
      };

      if (canEditName) {
        payload.name = nextName;
      }

      if (isTemplateAsset) {
        payload.descriptionShort = nextTemplateShortDescription;
        payload.websiteUrl = nextTemplatePublishedUrl;
        payload.previewUrl = normalizedTemplatePreviewUrl;
        payload.priceString = nextTemplatePriceString;
        payload.secondaryThumbnailUrl = secondaryThumbnails[0] || null;
        payload.secondaryThumbnails = [...secondaryThumbnails];
        payload.templateCategory = nextTemplateCategory;
        payload.templateTags = [...nextTemplateTags];
        payload.templateStyleTags = [...nextTemplateStyleTags];
        payload.templateSiteTypes = [...nextTemplateSiteTypes];
        payload.templateFeatureFlags = [...nextTemplateFeatureFlags];
        payload.templateLongDescription = nextTemplateLongDescription;
        payload.templateNotes = nextTemplateNotes;
        payload.templateChecklistConfirmed = formData.templateChecklistConfirmed;
        payload.templateAgreementConfirmed = formData.templateAgreementConfirmed;
      } else {
        payload.descriptionShort = formData.descriptionShort;
        payload.descriptionLongHtml = formData.descriptionLongHtml;
        payload.websiteUrl = formData.websiteUrl;
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
        payload.creatorWebflowEmailOverride = formData.creatorWebflowEmailOverride;
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
      } else if (!isTemplateAsset) {
        payload.previewUrl = formData.previewUrl.trim();
        payload.secondaryThumbnailUrl = secondaryThumbnails[0] || null;
        payload.secondaryThumbnails = [...secondaryThumbnails];
      }

      await onSave(payload);

      trackEvent('asset_update_completed', {
        asset_id: asset.id,
        asset_name: asset.name,
        asset_category: asset.category,
        asset_subcategory: asset.subcategory,
        fields_changed: changedFields
      });

      toast.success('Asset updated successfully');
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

    if (!confirm('Are you sure you want to archive this asset? This action cannot be undone.')) {
      return;
    }

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
    }
  }

  $effect(() => {
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      if (nameCheckTimeout) {
        clearTimeout(nameCheckTimeout);
      }
    };
  });

  onMount(() => {
    const mountTime = performance.now();
    console.log('[DEBUG:A,C] EditAssetModal mounted', {
      mountTime: mountTime.toFixed(2),
      elapsedFromScriptInit: `${(mountTime - scriptInitTime).toFixed(2)}ms`,
      hasExistingImages: {
        thumbnail: !!asset.thumbnailUrl,
        carousel: asset.carouselImages?.length || 0,
        secondary: asset.secondaryThumbnails?.length || 0
      }
    });

    requestAnimationFrame(() => {
      const paintTime = performance.now();
      console.log('[DEBUG:B] EditAssetModal first paint', {
        paintTime: paintTime.toFixed(2),
        elapsedFromMount: `${(paintTime - mountTime).toFixed(2)}ms`,
        elapsedFromScriptInit: `${(paintTime - scriptInitTime).toFixed(2)}ms`
      });
    });
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-overlay" onclick={handleClickOutside}>
  <div class="modal-container" bind:this={modalRef}>
    <Card class="modal-card">
      <CardHeader>
        <CardTitle
          >{isAppAsset ? 'Edit App' : isTemplateAsset ? 'Edit Template' : 'Edit Asset'}</CardTitle
        >
        <p class="modal-description">
          {isAppAsset
            ? 'Update the fields this app listing supports in the marketplace record.'
            : isTemplateAsset
              ? 'Update template draft fields with the same categories, metadata, and image constraints used by intake.'
              : 'Update your asset information and media.'}
        </p>
      </CardHeader>
      <CardContent>
        <form onsubmit={handleSubmit} class="form">
          {#if error}
            <div class="error-message">
              {error}
            </div>
          {/if}

          <div class="form-section">
            <h3 class="section-title">Basic Information</h3>
            <div class="form-field">
              <Label for="name"
                >{isAppAsset ? 'App Name' : isTemplateAsset ? 'Template Name *' : 'Name *'}</Label
              >
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
                  App name updates should stay aligned with the submission form and are read-only
                  here.
                </span>
              {/if}
            </div>

            <div class="form-field">
              <Label for="descriptionShort"
                >{isAppAsset ? 'App Preview Description' : 'Short Description'}</Label
              >
              {#if isTemplateAsset}
                <Textarea
                  id="descriptionShort"
                  bind:value={formData.descriptionShort}
                  placeholder="Brief summary for the template listing"
                  rows={3}
                  maxlength={250}
                />
                <span class="field-hint">{formData.descriptionShort.length}/250 characters</span>
              {:else}
                <Input
                  id="descriptionShort"
                  type="text"
                  bind:value={formData.descriptionShort}
                  placeholder={isAppAsset
                    ? 'Short app description for marketplace previews'
                    : 'Brief description (appears in search results)'}
                  maxlength={isAppAsset ? 100 : undefined}
                />
              {/if}
              {#if isAppAsset}
                <span class="field-hint">{formData.descriptionShort.length}/100 characters</span>
              {/if}
            </div>

            {#if isTemplateAsset}
              <div class="form-field">
                <Label for="templateLongDescription">Long Description</Label>
                <Textarea
                  id="templateLongDescription"
                  bind:value={formData.templateLongDescription}
                  placeholder="Detailed description for the template submission"
                  rows={7}
                />
              </div>

              <div class="form-row">
                <div class="form-field">
                  <Label for="websiteUrl">Published URL</Label>
                  <Input
                    id="websiteUrl"
                    type="url"
                    bind:value={formData.websiteUrl}
                    placeholder="https://your-site.webflow.io"
                  />
                  <span class="field-hint">
                    Use the published Webflow URL that matches the live template submission.
                  </span>
                </div>
                <div class="form-field">
                  <Label for="previewUrl">Preview URL</Label>
                  <Input
                    id="previewUrl"
                    type="url"
                    bind:value={formData.previewUrl}
                    placeholder={TEMPLATE_PREVIEW_URL_PREFIX}
                  />
                  <span class="field-hint">
                    Preview URLs must contain {TEMPLATE_PREVIEW_URL_PREFIX}
                  </span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-field">
                  <Label for="priceString">Free or Paid</Label>
                  <select
                    id="priceString"
                    class="form-control native-select"
                    bind:value={formData.priceString}
                  >
                    <option value="">Select one...</option>
                    {#each TEMPLATE_PRICE_OPTIONS as option}
                      <option value={option}>{option}</option>
                    {/each}
                  </select>
                </div>
                <div class="form-field">
                  <Label for="templateCategory">Category</Label>
                  <select
                    id="templateCategory"
                    class="form-control native-select"
                    bind:value={formData.templateCategory}
                  >
                    <option value="">Select a category</option>
                    {#each TEMPLATE_CATEGORY_OPTIONS as option}
                      <option value={option}>{option}</option>
                    {/each}
                  </select>
                </div>
              </div>
            {:else}
              <div class="form-field">
                <Label for="descriptionLongHtml"
                  >{isAppAsset ? 'App Detail Description' : 'Long Description'}</Label
                >
                <Textarea
                  id="descriptionLongHtml"
                  bind:value={formData.descriptionLongHtml}
                  placeholder="Detailed description"
                  rows={isAppAsset ? 6 : 4}
                />
                {#if isAppAsset}
                  <span class="field-hint"
                    >Long-form marketplace detail copy. HTML is preserved as-is.</span
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
            {/if}
          </div>

          {#if isTemplateAsset}
            <div class="form-section">
              <h3 class="section-title">Template Metadata</h3>
              <div class="form-row">
                <div class="form-field">
                  <Label for="templateTags">Tags</Label>
                  <Input
                    id="templateTags"
                    list="template-primary-tags"
                    type="text"
                    bind:value={formData.templateTags}
                    placeholder="Portfolio, Creative, Agency"
                  />
                  <span class="field-hint">
                    Comma-separated. Tag names are blocked inside the template title.
                  </span>
                </div>
                <div class="form-field">
                  <Label for="templateStyleTags">Style Tags</Label>
                  <Input
                    id="templateStyleTags"
                    type="text"
                    bind:value={formData.templateStyleTags}
                    placeholder="Minimal, Editorial, Bold"
                  />
                </div>
              </div>

              <datalist id="template-primary-tags">
                {#each TEMPLATE_PRIMARY_TAGS as tag}
                  <option value={tag}></option>
                {/each}
              </datalist>

              <div class="form-row">
                <div class="form-field">
                  <Label>Site Types</Label>
                  <div class="checkbox-stack">
                    {#each TEMPLATE_SITE_TYPE_OPTIONS as option}
                      <label class="option-card option-card--start">
                        <input
                          type="checkbox"
                          checked={formData.templateSiteTypes.includes(option.id)}
                          onchange={() => toggleTemplateSiteType(option.id)}
                        />
                        <span>{option.label}</span>
                      </label>
                    {/each}
                  </div>
                </div>

                <div class="form-field">
                  <Label>Feature Flags</Label>
                  <div class="checkbox-stack">
                    {#each TEMPLATE_FEATURE_OPTIONS as option}
                      <label class="option-card option-card--start">
                        <input
                          type="checkbox"
                          checked={formData.templateFeatureFlags.includes(option.id)}
                          onchange={() => toggleTemplateFeatureFlag(option.id)}
                        />
                        <span>{option.label}</span>
                      </label>
                    {/each}
                  </div>
                </div>
              </div>

              <div class="form-field">
                <Label for="templateNotes">Notes</Label>
                <Textarea
                  id="templateNotes"
                  bind:value={formData.templateNotes}
                  rows={4}
                  placeholder="Internal notes for reviewers or follow-up context"
                />
              </div>

              {#if isDraftTemplateAsset}
                <div class="form-field">
                  <Label>Draft Confirmations</Label>
                  <div class="checkbox-stack">
                    <label class="option-card option-card--start">
                      <input type="checkbox" bind:checked={formData.templateChecklistConfirmed} />
                      <span>I completed the submission checklist.</span>
                    </label>
                    <label class="option-card option-card--start">
                      <input type="checkbox" bind:checked={formData.templateAgreementConfirmed} />
                      <span>I agree to the marketplace submission agreement.</span>
                    </label>
                  </div>
                </div>
              {/if}
            </div>
          {/if}

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
                <span class="field-hint"
                  >{formData.appAccessCredentials.length}/2000 characters</span
                >
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
                  {#each APP_VISIBILITY_OPTIONS as option}
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
                <span class="field-hint"
                  >{formData.appCategory.length} of 2 categories selected</span
                >
              </div>

              <div class="form-field">
                <Label>Features Overview</Label>
                <div class="stacked-fields">
                  {#each formData.appFeaturesOverview as feature, index}
                    <Input
                      type="text"
                      value={feature}
                      placeholder={`Feature ${index + 1}`}
                      oninput={(event) =>
                        updateFeature(index, (event.target as HTMLInputElement).value)}
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
                  <Label for="creatorWebflowEmailOverride"
                    >Creator Webflow Account Email Override</Label
                  >
                  <Input
                    id="creatorWebflowEmailOverride"
                    type="email"
                    bind:value={formData.creatorWebflowEmailOverride}
                  />
                  <span class="field-hint">
                    Overrides the Webflow account email used for reviewer routing.
                  </span>
                </div>
              </div>

              <div class="form-field">
                <Label for="creatorContactEmail">Contact Email</Label>
                <Input
                  id="creatorContactEmail"
                  type="email"
                  bind:value={formData.creatorContactEmail}
                />
              </div>

              <div class="form-row">
                <div class="form-field">
                  <Label for="appDemoVideoUrl">Review Team Demo Video URL</Label>
                  <Input id="appDemoVideoUrl" type="url" bind:value={formData.appDemoVideoUrl} />
                </div>
                <div class="form-field">
                  <Label for="appPrivacyPolicyUrl">Privacy Policy URL</Label>
                  <Input
                    id="appPrivacyPolicyUrl"
                    type="url"
                    bind:value={formData.appPrivacyPolicyUrl}
                  />
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
                  : isTemplateAsset
                    ? 'WebP only, exactly 750x995, max 300KB.'
                    : '150:199 aspect ratio (e.g., 750×995px)'}
                uploadType={isAppAsset ? 'image' : 'thumbnail'}
                aspectRatio={isAppAsset ? { width: 1, height: 1 } : null}
                exactDimensions={isTemplateAsset ? TEMPLATE_THUMBNAIL_DIMENSIONS : null}
                maxSize={isTemplateAsset ? TEMPLATE_THUMBNAIL_MAX_SIZE : 10 * 1024 * 1024}
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
                label={isAppAsset
                  ? 'App Screenshots'
                  : isTemplateAsset
                    ? 'Gallery Images'
                    : 'Carousel Images'}
                description={isTemplateAsset
                  ? 'Upload 1 to 5 WebP images, each exactly 1440x900 and max 250KB.'
                  : isAppAsset
                    ? 'App screenshots should follow the external submission form shape: up to 5 images.'
                    : ''}
                minImages={isAppAsset ? 0 : isTemplateAsset ? (isDraftTemplateAsset ? 1 : 0) : 3}
                maxImages={isAppAsset ? 5 : isTemplateAsset ? 5 : 8}
                aspectRatio={isAppAsset
                  ? APP_SCREENSHOT_RATIO
                  : !isTemplateAsset
                    ? { width: 16, height: 10 }
                    : null}
                exactDimensions={isTemplateAsset ? TEMPLATE_GALLERY_DIMENSIONS : null}
                maxSize={isTemplateAsset ? TEMPLATE_GALLERY_MAX_SIZE : 10 * 1024 * 1024}
                uploadType={isTemplateAsset ? 'gallery' : 'carousel'}
                disabled={isLoading}
              />
              {#if isAppAsset && !isTemplateAsset}
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
                      <Label for={`appScreenshotAltText-${index}`}
                        >Screenshot {index + 1} Alt Text</Label
                      >
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
                  description={isTemplateAsset
                    ? 'Optional. Same 750x995 WebP constraint.'
                    : 'Add a promotional image with 150:199 aspect ratio (e.g., 750×995px)'}
                  maxSize={isTemplateAsset ? TEMPLATE_THUMBNAIL_MAX_SIZE : 10 * 1024 * 1024}
                  exactDimensions={isTemplateAsset ? TEMPLATE_THUMBNAIL_DIMENSIONS : null}
                  uploadType={isTemplateAsset ? 'secondary-thumbnail' : 'thumbnail'}
                  disabled={isLoading}
                />
              </div>
            {/if}
          </div>
        </form>
      </CardContent>
      <div class="modal-footer">
        <div class="footer-left">
          {#if canArchive && onArchive}
            <Button
              type="button"
              variant="destructive"
              onclick={handleArchive}
              disabled={isArchiving}
            >
              {isArchiving ? 'Archiving...' : 'Archive Asset'}
            </Button>
          {/if}
        </div>
        <div class="footer-right">
          <Button type="button" variant="secondary" onclick={onClose} disabled={isLoading}>
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
    </Card>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: var(--color-overlay);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: var(--space-md);
  }

  .modal-container {
    width: 100%;
    max-width: 58rem;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-description {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    margin: var(--space-xs) 0 0;
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

  .checkbox-stack {
    display: grid;
    gap: var(--space-sm);
  }

  .option-card--start {
    align-items: flex-start;
  }

  .option-card--start span {
    flex: 1;
  }

  .modal-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md) var(--space-lg) var(--space-lg);
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

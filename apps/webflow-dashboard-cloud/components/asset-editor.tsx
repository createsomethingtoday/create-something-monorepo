'use client';

import {
  APP_CAPABILITY_OPTIONS,
  APP_CATEGORY_OPTIONS,
  APP_SCOPE_OPTIONS,
  APP_VISIBILITY_OPTIONS,
  PAYMENT_TYPE_OPTIONS
} from '@create-something/webflow-dashboard-core/app-options';
import type { Asset, AssetUpdateData } from '@create-something/webflow-dashboard-core/airtable';
import { useEffect, useMemo, useState } from 'react';
import { appPath } from '../lib/runtime-paths';

async function uploadFile(file: File, type: 'thumbnail' | 'image') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);

  const response = await fetch(appPath('/api/upload'), {
    method: 'POST',
    body: formData
  });

  const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!response.ok || !data.url) {
    throw new Error(data.error || 'Failed to upload file');
  }

  return data.url;
}

function arraysEqual(left: string[] = [], right: string[] = []) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function normalizeFixedLength(values: string[] | undefined, length = 5): string[] {
  return Array.from({ length }, (_, index) => values?.[index] || '');
}

function collectChangedFields(
  asset: Asset,
  payload: AssetUpdateData,
  secondaryThumbnails: string[]
) {
  const changed: string[] = [];
  const registerValue = (label: string, current: string | null | undefined, next: string | null | undefined) => {
    if ((current || '') !== (next || '')) {
      changed.push(label);
    }
  };
  const registerList = (label: string, current: string[] | undefined, next: string[] | undefined) => {
    if (!arraysEqual(current || [], next || [])) {
      changed.push(label);
    }
  };

  registerValue('name', asset.name, payload.name ?? asset.name);
  registerValue('short description', asset.descriptionShort, payload.descriptionShort);
  registerValue('long description', asset.descriptionLongHtml || asset.description, payload.descriptionLongHtml);
  registerValue('website URL', asset.websiteUrl, payload.websiteUrl);
  registerList('carousel images', asset.carouselImages, payload.carouselImages);
  registerValue('thumbnail', asset.thumbnailUrl, payload.thumbnailUrl || null);

  if (asset.type === 'App') {
    registerValue('app capabilities', asset.appCapabilities, payload.appCapabilities);
    registerValue('install URL', asset.appInstallUrl, payload.appInstallUrl);
    registerList('scopes', asset.appScopes, payload.appScopes);
    registerValue('icon alt text', asset.appAvatarAltText, payload.appAvatarAltText);
    registerList('payment type', asset.paymentType, payload.paymentType);
    registerValue('visibility', asset.visibility, payload.visibility);
    registerList('categories', asset.appCategory, payload.appCategory);
    registerValue('creator name', asset.creatorName, payload.creatorName);
    registerValue('creator website', asset.creatorWebsite, payload.creatorWebsite);
    registerValue('contact email', asset.creatorContactEmail, payload.creatorContactEmail);
    registerList('features overview', asset.appFeaturesOverview, payload.appFeaturesOverview);
    registerValue('developer notes', asset.appDeveloperNotes, payload.appDeveloperNotes);
    registerValue('access credentials', asset.appAccessCredentials, payload.appAccessCredentials);
    registerValue('promo video URL', asset.appVideoUrl, payload.appVideoUrl);
    registerValue('demo video URL', asset.appDemoVideoUrl, payload.appDemoVideoUrl);
    registerValue('privacy policy URL', asset.appPrivacyPolicyUrl, payload.appPrivacyPolicyUrl);
    registerValue('support email', asset.appSupportEmail, payload.appSupportEmail);
    registerValue('support URL', asset.appSupportUrl, payload.appSupportUrl);
    registerValue('terms URL', asset.appTermsUrl, payload.appTermsUrl);
    registerList('screenshot alt text', asset.appScreenshotAltTexts, payload.appScreenshotAltTexts);
  } else {
    registerValue('preview URL', asset.previewUrl, payload.previewUrl);
    registerList('secondary thumbnails', asset.secondaryThumbnails, secondaryThumbnails);
  }

  return [...new Set(changed)];
}

export function AssetEditor({ asset }: { asset: Asset }) {
  const isAppAsset = asset.type === 'App';
  const canEditName = asset.type !== 'App';

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [secondaryFiles, setSecondaryFiles] = useState<File[]>([]);
  const [carouselFiles, setCarouselFiles] = useState<File[]>([]);
  const [appCapabilities, setAppCapabilities] = useState(asset.appCapabilities || '');
  const [selectedScope, setSelectedScope] = useState('');
  const [appScopes, setAppScopes] = useState<string[]>(asset.appScopes || []);
  const [paymentType, setPaymentType] = useState<string[]>(asset.paymentType || []);
  const [visibility, setVisibility] = useState(asset.visibility || '');
  const [appCategory, setAppCategory] = useState<string[]>(asset.appCategory || []);
  const [appFeaturesOverview, setAppFeaturesOverview] = useState<string[]>(
    normalizeFixedLength(asset.appFeaturesOverview)
  );
  const [appScreenshotAltTexts, setAppScreenshotAltTexts] = useState<string[]>(
    normalizeFixedLength(asset.appScreenshotAltTexts)
  );
  const [appAvatarAltText, setAppAvatarAltText] = useState(asset.appAvatarAltText || '');

  useEffect(() => {
    setThumbnailFile(null);
    setSecondaryFiles([]);
    setCarouselFiles([]);
    setAppCapabilities(asset.appCapabilities || '');
    setSelectedScope('');
    setAppScopes(asset.appScopes || []);
    setPaymentType(asset.paymentType || []);
    setVisibility(asset.visibility || '');
    setAppCategory(asset.appCategory || []);
    setAppFeaturesOverview(normalizeFixedLength(asset.appFeaturesOverview));
    setAppScreenshotAltTexts(normalizeFixedLength(asset.appScreenshotAltTexts));
    setAppAvatarAltText(asset.appAvatarAltText || '');
  }, [asset]);

  const existingSecondaryThumbnails = useMemo(
    () => asset.secondaryThumbnails || (asset.secondaryThumbnailUrl ? [asset.secondaryThumbnailUrl] : []),
    [asset.secondaryThumbnails, asset.secondaryThumbnailUrl]
  );

  const existingCarouselImages = useMemo(() => asset.carouselImages || [], [asset.carouselImages]);

  const requiresInstallUrl = appCapabilities === 'Data Client v2' || appCapabilities === 'Hybrid';
  const visibleScreenshotCount = carouselFiles.length > 0 ? Math.min(carouselFiles.length, 5) : Math.min(existingCarouselImages.length, 5);

  useEffect(() => {
    setAppScreenshotAltTexts((current) => {
      const next = normalizeFixedLength(current);
      return next;
    });
  }, [visibleScreenshotCount]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);

      const thumbnailUrl = thumbnailFile
        ? await uploadFile(thumbnailFile, isAppAsset ? 'image' : 'thumbnail')
        : asset.thumbnailUrl || null;
      const secondaryThumbnails =
        !isAppAsset && secondaryFiles.length > 0
          ? await Promise.all(secondaryFiles.map((file) => uploadFile(file, 'image')))
          : existingSecondaryThumbnails;
      const carouselImages =
        carouselFiles.length > 0
          ? await Promise.all(carouselFiles.map((file) => uploadFile(file, 'image')))
          : existingCarouselImages;

      if (canEditName && !String(formData.get('name') || '').trim()) {
        throw new Error('Name is required');
      }

      if (isAppAsset && requiresInstallUrl && !String(formData.get('appInstallUrl') || '').trim()) {
        throw new Error('Install URL is required for Data Client and Hybrid apps');
      }

      if (isAppAsset && thumbnailUrl && !appAvatarAltText.trim()) {
        throw new Error('App icon alt text is required when an icon is present');
      }

      if (isAppAsset && carouselImages.some((_, index) => !appScreenshotAltTexts[index]?.trim())) {
        throw new Error('Provide alt text for each app screenshot');
      }

      if (isAppAsset && appCategory.length > 2) {
        throw new Error('Select at most two app categories');
      }

      const payload: AssetUpdateData = {
        descriptionShort: String(formData.get('descriptionShort') || ''),
        descriptionLongHtml: String(formData.get('descriptionLongHtml') || ''),
        websiteUrl: String(formData.get('websiteUrl') || ''),
        thumbnailUrl,
        carouselImages
      };

      if (canEditName) {
        payload.name = String(formData.get('name') || '');
      }

      if (isAppAsset) {
        payload.appCapabilities = appCapabilities;
        payload.appInstallUrl = String(formData.get('appInstallUrl') || '');
        payload.appScopes = appScopes;
        payload.appAvatarAltText = appAvatarAltText;
        payload.paymentType = paymentType;
        payload.visibility = visibility;
        payload.appCategory = appCategory;
        payload.creatorName = String(formData.get('creatorName') || '');
        payload.creatorWebsite = String(formData.get('creatorWebsite') || '');
        payload.creatorContactEmail = String(formData.get('creatorContactEmail') || '');
        payload.appFeaturesOverview = appFeaturesOverview;
        payload.appDeveloperNotes = String(formData.get('appDeveloperNotes') || '');
        payload.appAccessCredentials = String(formData.get('appAccessCredentials') || '');
        payload.appVideoUrl = String(formData.get('appVideoUrl') || '');
        payload.appDemoVideoUrl = String(formData.get('appDemoVideoUrl') || '');
        payload.appPrivacyPolicyUrl = String(formData.get('appPrivacyPolicyUrl') || '');
        payload.appSupportEmail = String(formData.get('appSupportEmail') || '');
        payload.appSupportUrl = String(formData.get('appSupportUrl') || '');
        payload.appTermsUrl = String(formData.get('appTermsUrl') || '');
        payload.appScreenshotAltTexts = appScreenshotAltTexts.slice(0, 5);
      } else {
        payload.previewUrl = String(formData.get('previewUrl') || '');
        payload.secondaryThumbnails = secondaryThumbnails;
        payload.secondaryThumbnailUrl = secondaryThumbnails[0] || null;
      }

      const changedFields = collectChangedFields(asset, payload, secondaryThumbnails);
      if (changedFields.length > 0) {
        void fetch(appPath(`/api/assets/${asset.id}/versions`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            changes: `Updated ${changedFields.join(', ')}`
          })
        }).catch(() => {});
      }

      const response = await fetch(appPath(`/api/assets/${asset.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update asset');
      }

      setMessage('Asset updated.');
      window.location.reload();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to update asset');
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(appPath(`/api/assets/${asset.id}/archive`), {
        method: 'POST'
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || 'Failed to archive asset');
      }

      window.location.assign(appPath('/dashboard'));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to archive asset');
      setSaving(false);
    }
  }

  function togglePayment(nextValue: string) {
    setPaymentType((current) =>
      current.includes(nextValue)
        ? current.filter((value) => value !== nextValue)
        : [...current, nextValue]
    );
  }

  function toggleVisibility(nextValue: string) {
    setVisibility((current) => (current === nextValue ? '' : nextValue));
  }

  function updateFeature(index: number, value: string) {
    setAppFeaturesOverview((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  }

  function updateScreenshotAlt(index: number, value: string) {
    setAppScreenshotAltTexts((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  }

  return (
    <div className="grid" style={{ gap: '1rem' }}>
      <section className="card">
        <div className="page-header">
          <div>
            <h2 className="card-title">{isAppAsset ? 'Edit app' : 'Edit asset'}</h2>
            <p className="card-subtitle">
              {isAppAsset
                ? 'Update marketplace copy, metadata, support details, and imagery for this app.'
                : 'Update copy, links, and marketplace imagery.'}
            </p>
          </div>
          <span className="status-badge" data-status={asset.status}>
            {asset.status}
          </span>
        </div>

        <form className="form-stack" onSubmit={handleSave} style={{ marginTop: '1rem' }}>
          <div className="field">
            <label className="field-label" htmlFor="name">
              {isAppAsset ? 'App name' : 'Asset name'}
            </label>
            <input
              className="field-input"
              id="name"
              name="name"
              defaultValue={asset.name}
              required={canEditName}
              disabled={!canEditName}
            />
            {!canEditName ? <div className="card-subtitle">App names stay read-only in this editor.</div> : null}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="descriptionShort">
              {isAppAsset ? 'App preview description' : 'Short description'}
            </label>
            <textarea
              className="field-textarea"
              id="descriptionShort"
              name="descriptionShort"
              defaultValue={asset.descriptionShort || ''}
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="descriptionLongHtml">
              {isAppAsset ? 'App detail description' : 'Long description HTML'}
            </label>
            <textarea
              className="field-textarea"
              id="descriptionLongHtml"
              name="descriptionLongHtml"
              defaultValue={asset.descriptionLongHtml || ''}
            />
          </div>

          <div className="grid grid-2">
            <div className="field">
              <label className="field-label" htmlFor="websiteUrl">
                Website URL
              </label>
              <input
                className="field-input"
                id="websiteUrl"
                name="websiteUrl"
                type="url"
                defaultValue={asset.websiteUrl || ''}
              />
            </div>
            {!isAppAsset ? (
              <div className="field">
                <label className="field-label" htmlFor="previewUrl">
                  Preview URL
                </label>
                <input
                  className="field-input"
                  id="previewUrl"
                  name="previewUrl"
                  type="url"
                  defaultValue={asset.previewUrl || ''}
                />
              </div>
            ) : (
              <div className="field">
                <label className="field-label" htmlFor="appVideoUrl">
                  App promo video URL
                </label>
                <input
                  className="field-input"
                  id="appVideoUrl"
                  name="appVideoUrl"
                  type="url"
                  defaultValue={asset.appVideoUrl || ''}
                />
              </div>
            )}
          </div>

          {isAppAsset ? (
            <>
              <div className="card" style={{ padding: '1rem' }}>
                <h3 className="card-title">Capabilities and access</h3>
                <div className="grid grid-2" style={{ marginTop: '1rem', gap: '1rem' }}>
                  <div className="field">
                    <label className="field-label" htmlFor="appCapabilities">
                      App capabilities
                    </label>
                    <select
                      className="field-input"
                      id="appCapabilities"
                      value={appCapabilities}
                      onChange={(event) => setAppCapabilities(event.target.value)}
                    >
                      <option value="">Select one…</option>
                      {APP_CAPABILITY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="appInstallUrl">
                      App install URL
                    </label>
                    <input
                      className="field-input"
                      id="appInstallUrl"
                      name="appInstallUrl"
                      type="url"
                      defaultValue={asset.appInstallUrl || ''}
                      placeholder="https://"
                    />
                  </div>
                </div>

                <div className="field" style={{ marginTop: '1rem' }}>
                  <label className="field-label" htmlFor="appScopeSelect">
                    Scopes
                  </label>
                  <div className="grid grid-2">
                    <select
                      className="field-input"
                      id="appScopeSelect"
                      value={selectedScope}
                      onChange={(event) => setSelectedScope(event.target.value)}
                    >
                      <option value="">Select a scope…</option>
                      {APP_SCOPE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => {
                        if (!selectedScope || appScopes.includes(selectedScope)) return;
                        setAppScopes((current) => [...current, selectedScope]);
                        setSelectedScope('');
                      }}
                      disabled={!selectedScope}
                    >
                      Add scope
                    </button>
                  </div>
                  {appScopes.length > 0 ? (
                    <div className="grid" style={{ gap: '0.5rem', marginTop: '0.75rem' }}>
                      {appScopes.map((scope) => (
                        <button
                          className="button button-secondary"
                          key={scope}
                          type="button"
                          onClick={() =>
                            setAppScopes((current) => current.filter((value) => value !== scope))
                          }
                        >
                          Remove {scope}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="field" style={{ marginTop: '1rem' }}>
                  <label className="field-label" htmlFor="appAccessCredentials">
                    App access credentials
                  </label>
                  <textarea
                    className="field-textarea"
                    id="appAccessCredentials"
                    name="appAccessCredentials"
                    defaultValue={asset.appAccessCredentials || ''}
                  />
                </div>
              </div>

              <div className="card" style={{ padding: '1rem' }}>
                <h3 className="card-title">Marketplace settings</h3>
                <div className="field" style={{ marginTop: '1rem' }}>
                  <span className="field-label">Payment type</span>
                  <div className="grid" style={{ gap: '0.5rem' }}>
                    {PAYMENT_TYPE_OPTIONS.map((option) => (
                      <label key={option} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={paymentType.includes(option)}
                          onChange={() => togglePayment(option)}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="field" style={{ marginTop: '1rem' }}>
                  <span className="field-label">Marketplace visibility</span>
                  <div className="grid" style={{ gap: '0.5rem' }}>
                    {APP_VISIBILITY_OPTIONS.map((option) => (
                      <label key={option} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={visibility === option}
                          onChange={() => toggleVisibility(option)}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="field" style={{ marginTop: '1rem' }}>
                  <label className="field-label" htmlFor="appCategory">
                    App category
                  </label>
                  <select
                    className="field-input"
                    id="appCategory"
                    multiple
                    size={8}
                    value={appCategory}
                    onChange={(event) =>
                      setAppCategory(
                        Array.from(event.target.selectedOptions, (option) => option.value).slice(0, 2)
                      )
                    }
                  >
                    {APP_CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field" style={{ marginTop: '1rem' }}>
                  <span className="field-label">Features overview</span>
                  <div className="grid" style={{ gap: '0.5rem' }}>
                    {appFeaturesOverview.map((feature, index) => (
                      <input
                        className="field-input"
                        key={index}
                        value={feature}
                        onChange={(event) => updateFeature(index, event.target.value)}
                        placeholder={`Feature ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: '1rem' }}>
                <h3 className="card-title">Creator and support</h3>
                <div className="grid grid-2" style={{ marginTop: '1rem' }}>
                  <div className="field">
                    <label className="field-label" htmlFor="creatorName">
                      Creator name
                    </label>
                    <input
                      className="field-input"
                      id="creatorName"
                      name="creatorName"
                      defaultValue={asset.creatorName || ''}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="creatorWebsite">
                      Creator website
                    </label>
                    <input
                      className="field-input"
                      id="creatorWebsite"
                      name="creatorWebsite"
                      type="url"
                      defaultValue={asset.creatorWebsite || ''}
                    />
                  </div>
                </div>

                <div className="field" style={{ marginTop: '1rem' }}>
                  <label className="field-label" htmlFor="creatorContactEmail">
                    Contact email
                  </label>
                  <input
                    className="field-input"
                    id="creatorContactEmail"
                    name="creatorContactEmail"
                    type="email"
                    defaultValue={asset.creatorContactEmail || ''}
                  />
                </div>

                <div className="grid grid-2" style={{ marginTop: '1rem' }}>
                  <div className="field">
                    <label className="field-label" htmlFor="appDemoVideoUrl">
                      Demo video URL
                    </label>
                    <input
                      className="field-input"
                      id="appDemoVideoUrl"
                      name="appDemoVideoUrl"
                      type="url"
                      defaultValue={asset.appDemoVideoUrl || ''}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="appPrivacyPolicyUrl">
                      Privacy policy URL
                    </label>
                    <input
                      className="field-input"
                      id="appPrivacyPolicyUrl"
                      name="appPrivacyPolicyUrl"
                      type="url"
                      defaultValue={asset.appPrivacyPolicyUrl || ''}
                    />
                  </div>
                </div>

                <div className="grid grid-2" style={{ marginTop: '1rem' }}>
                  <div className="field">
                    <label className="field-label" htmlFor="appSupportEmail">
                      Support email
                    </label>
                    <input
                      className="field-input"
                      id="appSupportEmail"
                      name="appSupportEmail"
                      type="email"
                      defaultValue={asset.appSupportEmail || ''}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="appSupportUrl">
                      Support URL
                    </label>
                    <input
                      className="field-input"
                      id="appSupportUrl"
                      name="appSupportUrl"
                      type="url"
                      defaultValue={asset.appSupportUrl || ''}
                    />
                  </div>
                </div>

                <div className="grid grid-2" style={{ marginTop: '1rem' }}>
                  <div className="field">
                    <label className="field-label" htmlFor="appTermsUrl">
                      Terms URL
                    </label>
                    <input
                      className="field-input"
                      id="appTermsUrl"
                      name="appTermsUrl"
                      type="url"
                      defaultValue={asset.appTermsUrl || ''}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="appDeveloperNotes">
                      Developer notes
                    </label>
                    <textarea
                      className="field-textarea"
                      id="appDeveloperNotes"
                      name="appDeveloperNotes"
                      defaultValue={asset.appDeveloperNotes || ''}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : null}

          <div className="field">
            <label className="field-label" htmlFor="thumbnail">
              {isAppAsset ? 'App icon (WebP)' : 'Primary thumbnail (WebP, 150:199)'}
            </label>
            <input
              className="field-input"
              id="thumbnail"
              type="file"
              accept="image/webp"
              onChange={(event) => setThumbnailFile(event.target.files?.[0] || null)}
            />
            {asset.thumbnailUrl ? (
              <div className="image-grid">
                <div className="image-card">
                  <img src={asset.thumbnailUrl} alt={`${asset.name} thumbnail`} />
                  <div className="image-card-body">{isAppAsset ? 'Current app icon' : 'Current thumbnail'}</div>
                </div>
              </div>
            ) : null}
          </div>

          {isAppAsset ? (
            <div className="field">
              <label className="field-label" htmlFor="appAvatarAltText">
                App icon alt text
              </label>
              <input
                className="field-input"
                id="appAvatarAltText"
                value={appAvatarAltText}
                onChange={(event) => setAppAvatarAltText(event.target.value)}
                placeholder="Describe the app icon"
              />
            </div>
          ) : (
            <div className="field">
              <label className="field-label" htmlFor="secondaryThumbnails">
                Secondary thumbnails (WebP)
              </label>
              <input
                className="field-input"
                id="secondaryThumbnails"
                type="file"
                accept="image/webp"
                multiple
                onChange={(event) => setSecondaryFiles(Array.from(event.target.files || []))}
              />
              {existingSecondaryThumbnails.length > 0 ? (
                <div className="image-grid">
                  {existingSecondaryThumbnails.map((url) => (
                    <div className="image-card" key={url}>
                      <img src={url} alt="Secondary thumbnail" />
                      <div className="image-card-body">Current secondary image</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          <div className="field">
            <label className="field-label" htmlFor="carouselImages">
              {isAppAsset ? 'App screenshots (WebP)' : 'Carousel images (WebP)'}
            </label>
            <input
              className="field-input"
              id="carouselImages"
              type="file"
              accept="image/webp"
              multiple
              onChange={(event) => setCarouselFiles(Array.from(event.target.files || []))}
            />
            {existingCarouselImages.length > 0 ? (
              <div className="image-grid">
                {existingCarouselImages.map((url) => (
                  <div className="image-card" key={url}>
                    <img src={url} alt="Carousel image" />
                    <div className="image-card-body">{isAppAsset ? 'Current screenshot' : 'Current carousel image'}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {isAppAsset && visibleScreenshotCount > 0 ? (
            <div className="field">
              <span className="field-label">Screenshot alt text</span>
              <div className="grid" style={{ gap: '0.5rem' }}>
                {Array.from({ length: visibleScreenshotCount }, (_, index) => (
                  <input
                    className="field-input"
                    key={index}
                    value={appScreenshotAltTexts[index] || ''}
                    onChange={(event) => updateScreenshotAlt(index, event.target.value)}
                    placeholder={`Screenshot ${index + 1} alt text`}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {message ? <div className="notice notice-success">{message}</div> : null}
          {error ? <div className="notice notice-error">{error}</div> : null}

          <div className="form-actions">
            <button className="button button-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button className="button button-secondary" type="button" onClick={handleArchive} disabled={saving}>
              Archive asset
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

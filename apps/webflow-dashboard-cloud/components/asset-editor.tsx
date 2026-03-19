'use client';

import type { Asset } from '@create-something/webflow-dashboard-core/airtable';
import { useMemo, useState } from 'react';
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

export function AssetEditor({ asset }: { asset: Asset }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [secondaryFiles, setSecondaryFiles] = useState<File[]>([]);
  const [carouselFiles, setCarouselFiles] = useState<File[]>([]);

  const existingSecondaryThumbnails = useMemo(
    () => asset.secondaryThumbnails || (asset.secondaryThumbnailUrl ? [asset.secondaryThumbnailUrl] : []),
    [asset.secondaryThumbnails, asset.secondaryThumbnailUrl]
  );

  const existingCarouselImages = useMemo(() => asset.carouselImages || [], [asset.carouselImages]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);

      const thumbnailUrl = thumbnailFile ? await uploadFile(thumbnailFile, 'thumbnail') : asset.thumbnailUrl;
      const secondaryThumbnails =
        secondaryFiles.length > 0
          ? await Promise.all(secondaryFiles.map((file) => uploadFile(file, 'image')))
          : existingSecondaryThumbnails;
      const carouselImages =
        carouselFiles.length > 0
          ? await Promise.all(carouselFiles.map((file) => uploadFile(file, 'image')))
          : existingCarouselImages;

      const payload = {
        name: String(formData.get('name') || ''),
        descriptionShort: String(formData.get('descriptionShort') || ''),
        descriptionLongHtml: String(formData.get('descriptionLongHtml') || ''),
        websiteUrl: String(formData.get('websiteUrl') || ''),
        previewUrl: String(formData.get('previewUrl') || ''),
        thumbnailUrl: thumbnailUrl || null,
        secondaryThumbnails,
        carouselImages
      };

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

  return (
    <div className="grid" style={{ gap: '1rem' }}>
      <section className="card">
        <div className="page-header">
          <div>
            <h2 className="card-title">Edit asset</h2>
            <p className="card-subtitle">Update copy, links, and marketplace imagery.</p>
          </div>
          <span className="status-badge" data-status={asset.status}>
            {asset.status}
          </span>
        </div>

        <form className="form-stack" onSubmit={handleSave} style={{ marginTop: '1rem' }}>
          <div className="field">
            <label className="field-label" htmlFor="name">
              Asset name
            </label>
            <input className="field-input" id="name" name="name" defaultValue={asset.name} required />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="descriptionShort">
              Short description
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
              Long description HTML
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
              <input className="field-input" id="websiteUrl" name="websiteUrl" defaultValue={asset.websiteUrl || ''} />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="previewUrl">
                Preview URL
              </label>
              <input className="field-input" id="previewUrl" name="previewUrl" defaultValue={asset.previewUrl || ''} />
            </div>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="thumbnail">
              Primary thumbnail (WebP, 150:199)
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
                  <div className="image-card-body">Current thumbnail</div>
                </div>
              </div>
            ) : null}
          </div>

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

          <div className="field">
            <label className="field-label" htmlFor="carouselImages">
              Carousel images (WebP)
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
                    <div className="image-card-body">Current carousel image</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

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

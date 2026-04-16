import assert from 'node:assert/strict';
import test from 'node:test';
import type { Asset } from './airtable.js';
import { normalizeAssetUpdateData, validateAssetUpdateData } from './forms.js';

const templateAsset: Asset = {
  id: 'asset-template',
  name: 'Orbit',
  type: 'Template',
  status: 'Draft',
  previewUrl: 'https://preview.webflow.com/preview/orbit',
  carouselImages: ['https://cdn.example.com/one.webp']
};

const appAsset: Asset = {
  id: 'asset-app',
  name: 'Signal',
  type: 'App',
  status: 'Published',
  appCapabilities: 'Data Client v2',
  carouselImages: ['https://cdn.example.com/shot-1.webp'],
  appScreenshotAltTexts: ['Screenshot 1']
};

test('normalizeAssetUpdateData trims strings and normalizes urls', () => {
  const normalized = normalizeAssetUpdateData({
    name: '  Orbit  ',
    websiteUrl: 'https://example.com/landing',
    secondaryThumbnails: [' https://cdn.example.com/one.webp ']
  });

  assert.equal(normalized.name, 'Orbit');
  assert.equal(normalized.websiteUrl, 'https://example.com/landing');
  assert.deepEqual(normalized.secondaryThumbnails, ['https://cdn.example.com/one.webp']);
});

test('validateAssetUpdateData rejects app-only fields on template assets', () => {
  assert.throws(
    () =>
      validateAssetUpdateData(
        {
          appCapabilities: 'Hybrid'
        },
        templateAsset
      ),
    /App fields cannot be updated/
  );
});

test('validateAssetUpdateData enforces install url and screenshot alt text for apps', () => {
  assert.throws(
    () =>
      validateAssetUpdateData(
        {
          appCapabilities: 'Data Client v2',
          appInstallUrl: '',
          carouselImages: ['https://cdn.example.com/shot-1.webp'],
          appScreenshotAltTexts: ['Screenshot 1']
        },
        appAsset
      ),
    /Install URL is required/
  );

  assert.throws(
    () =>
      validateAssetUpdateData(
        {
          appCapabilities: 'Designer Extension',
          appInstallUrl: '',
          carouselImages: ['https://cdn.example.com/shot-1.webp'],
          appScreenshotAltTexts: ['']
        },
        appAsset
      ),
    /Provide alt text/
  );
});

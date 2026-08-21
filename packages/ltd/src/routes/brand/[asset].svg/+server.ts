import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Keep legacy public download paths useful without continuing to serve the
// retired cube or live-font source. The current brand library links directly
// to the canonical static V3 files so its downloads preserve their filenames.
const legacyAssetRedirects: Record<string, string> = {
  'icon-with-bg': 'create-something-site-icon.svg',
  'icon-circular': 'create-something-site-icon.svg',
  'icon-only': 'create-something-mark-black.svg',
  'wordmark-white': 'create-something-wordmark-white.svg',
  'wordmark-black': 'create-something-wordmark-black.svg',
  'lockup-horizontal-light': 'create-something-horizontal-white.svg',
  'lockup-horizontal-dark': 'create-something-horizontal-black.svg',
  'lockup-stacked-light': 'create-something-stacked-white.svg',
  'lockup-stacked-dark': 'create-something-stacked-black.svg'
};

export const GET: RequestHandler = ({ params }) => {
  const assetName = params.asset;
  const asset = assetName ? legacyAssetRedirects[assetName] : undefined;

  if (!asset) {
    throw error(404, 'Asset not found');
  }

  throw redirect(308, `/brand/${asset}`);
};

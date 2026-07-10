import { createMediaResponse } from '../../src/media-response';

type AssetFetcher = {
  fetch(input: Request | string | URL, init?: RequestInit): Promise<Response>;
};

type MediaContext = {
  request: Request;
  env: { ASSETS: AssetFetcher };
  params: { name?: string };
};

const mediaAssets = new Set(['hero-motion.mp4', 'hero-fullbleed-motion.mp4']);

async function getMediaResponse(context: MediaContext): Promise<Response> {
  const name = context.params.name;
  if (!name || !mediaAssets.has(name)) return new Response('Not found', { status: 404 });

  const assetUrl = new URL(`/assets/${name}`, context.request.url);
  const assetHeaders = new Headers(context.request.headers);
  assetHeaders.delete('range');
  assetHeaders.delete('if-range');

  const source = await context.env.ASSETS.fetch(
    new Request(assetUrl, {
      method: 'GET',
      headers: assetHeaders
    })
  );

  if (!source.ok) return source;

  return createMediaResponse(
    source,
    context.request.headers.get('range'),
    context.request.headers.get('if-range')
  );
}

export async function onRequestGet(context: MediaContext): Promise<Response> {
  return getMediaResponse(context);
}

export async function onRequestHead(context: MediaContext): Promise<Response> {
  const response = await getMediaResponse(context);
  return new Response(null, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

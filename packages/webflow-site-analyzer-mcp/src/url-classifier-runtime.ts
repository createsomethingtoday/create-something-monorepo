import { classifyUrls, type ClassifyOptions } from './url-classifier.js';
import { JEV_URL_MODEL, type JevUrlReceipt } from './jev-url-classifier.js';
import { isWorkerRequestAuthorized } from './worker-auth.js';
export interface UrlClassifierBindings {
  JEV_URL_CLASSIFIER_MODE?: string;
  TYPESAFE_API_KEY?: string;
  WEBFLOW_SITE_ANALYZER_MCP_API_KEY?: string;
}
export function getUrlClassifierOptions(
  env: UrlClassifierBindings,
  onReceipt?: (r: JevUrlReceipt) => void,
  canary = false
): ClassifyOptions {
  const enabled =
    env.JEV_URL_CLASSIFIER_MODE === 'active' ||
    (canary && env.JEV_URL_CLASSIFIER_MODE === 'canary');
  if (!enabled || !env.TYPESAFE_API_KEY?.trim()) return {};
  return {
    jev: {
      apiKey: env.TYPESAFE_API_KEY,
      onReceipt:
        onReceipt ??
        ((receipt) => {
          console.log(JSON.stringify({ event: 'jev_url_classification', ...receipt }));
        })
    }
  };
}
export function getUrlClassifierHealth(env: UrlClassifierBindings) {
  return {
    mode: ['active', 'canary'].includes(env.JEV_URL_CLASSIFIER_MODE ?? '')
      ? env.JEV_URL_CLASSIFIER_MODE
      : 'off',
    configured: Boolean(env.TYPESAFE_API_KEY?.trim()),
    model: JEV_URL_MODEL,
    maxAmbiguousPaths: 32,
    classificationIsPathHint: true
  };
}
/** Authenticated canary/automation surface. It only classifies paths; never fetches sites. */
export async function handleUrlClassification(
  request: Request,
  env: UrlClassifierBindings,
  classify: typeof classifyUrls = classifyUrls
): Promise<Response> {
  if (!isWorkerRequestAuthorized(request, env))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (request.method !== 'POST') return Response.json({ error: 'POST required' }, { status: 405 });
  let body: { startUrl: string; urls: string[] };
  try {
    const text = await request.text();
    if (text.length > 65536) throw new Error('size');
    body = JSON.parse(text);
    const start = new URL(body.startUrl);
    if (
      !['http:', 'https:'].includes(start.protocol) ||
      start.username ||
      start.password ||
      !Array.isArray(body.urls) ||
      body.urls.length > 128 ||
      body.urls.some((raw) => {
        if (typeof raw !== 'string' || raw.length > 2048) return true;
        const url = new URL(raw);
        return url.origin !== start.origin || Boolean(url.username || url.password);
      })
    )
      throw new Error('input');
  } catch {
    return Response.json(
      { error: 'Provide an HTTP(S) startUrl and up to 128 same-origin URLs' },
      { status: 400 }
    );
  }
  const receipts: JevUrlReceipt[] = [];
  const options = getUrlClassifierOptions(env, (r) => receipts.push(r), true);
  const results = await classify(body.urls, body.startUrl, options);
  return Response.json({ results, receipts, policy: getUrlClassifierHealth(env) });
}

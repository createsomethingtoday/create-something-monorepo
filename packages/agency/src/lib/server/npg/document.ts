import type { NpgBootstrap } from '../../npg/astryx/types';
export const NPG_DOCUMENT_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'same-origin',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy':
    "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
};
export type NpgAssets = { script: string; styles: string[] };
export function renderNpgDocument(bootstrap: NpgBootstrap, assets: NpgAssets): string {
  const paths = [assets.script, ...assets.styles];
  if (
    !assets.styles.length ||
    paths.some((path) => !/^\/npg-chat\/assets\/[A-Za-z0-9_.-]+\.(?:js|css)$/.test(path))
  )
    throw new Error('NPG client assets are unavailable.');
  const data = JSON.stringify(bootstrap)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-content"><meta name="robots" content="noindex,nofollow"><meta name="color-scheme" content="light"><title>NPG Healthcare Coverage Analyst</title>${assets.styles.map((href) => `<link rel="stylesheet" href="${href}">`).join('')}</head><body><div id="npg-app"><a href="#npg-loading-main">Skip to main content</a><main id="npg-loading-main" tabindex="-1"><h1>NPG Healthcare analyst</h1><p>Opening your private workspace.</p><noscript>This private analyst needs JavaScript to send questions and review actions. Existing CSV URLs still require NPG sign-in.</noscript></main></div><script type="application/json" id="npg-bootstrap">${data}</script><script type="module" src="${assets.script}"></script></body></html>`;
}

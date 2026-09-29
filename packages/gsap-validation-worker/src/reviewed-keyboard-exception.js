import { reviewedScript } from './reviewed-scripts/archoba.js';

// CRE-1990: reviewed Enter/Space slider controls and Escape menu dismissal.
// Exact content comparison avoids changing the synchronous validator API.
// SHA-256 covers UTF-8 script content after the extractor's existing trim().
export const exception = Object.freeze({
  id: 'CRE-1990',
  hostname: 'archoba.webflow.io',
  siteId: '6a8c91df78bfdcdda6d581bc',
  sha256: 'a11150c125ce8170b07c6cb120c1fdfb2fe20c31e463994052ae33826c0068f0',
  expiresAt: '2026-10-11T00:00:00.000Z'
});

export function matchesReviewedKeyboardException(script, html, pageUrl, now = Date.now()) {
  if (!Number.isFinite(now) || now >= Date.parse(exception.expiresAt)) return false;
  let url;
  try { url = new URL(pageUrl); } catch { return false; }
  if (url.protocol !== 'https:' || url.hostname !== exception.hostname || url.port) return false;
  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] || '';
  const siteId = htmlTag.match(/\bdata-wf-site\s*=\s*(["'])(.*?)\1/i)?.[2];
  return siteId === exception.siteId && script === reviewedScript;
}

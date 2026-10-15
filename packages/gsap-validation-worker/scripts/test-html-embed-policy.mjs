import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {
  HTML_EMBED_POLICY,
  disallowedEmbedTags,
  findProhibitedHtmlEmbeds,
  findProhibitedMarketplaceCustomCode
} from '../src/font-custom-code-policy.js';

// An HTML Embed element publishes as <div class="... w-embed">. The crawler used to inspect
// only <script>, <style>, font <link>, and JSON-LD tags, so an embed holding plain markup
// (a self-hosted <video>, a Maps <iframe>) passed the submission gate untouched
// (#marketplace-review-team, 2026-10-15). Allowed embed content is inline SVG, CSS, scripts
// (judged by the script rules), and YouTube/Vimeo iframes.

const embed = (classes, inner) => `<div class="${classes}">${inner}</div>`;
const sources = (html) => findProhibitedHtmlEmbeds(html).map((finding) => finding.source);

// Self-hosted video on the Webflow CDN with native controls and no script.
const videoEmbed = embed(
  'embed-contents w-embed',
  '<!-- Plain HTML video, no script. --><video class="video-card-media" src="https://cdn.prod.website-files.com/a/b_video-1-opt.mp4" poster="https://cdn.prod.website-files.com/a/c_poster.webp" preload="none" muted playsinline controls aria-label="Video review"></video>'
);
assert.deepEqual(sources(videoEmbed), ['.embed-contents: <video>']);
const [videoFinding] = findProhibitedHtmlEmbeds(videoEmbed);
assert.equal(videoFinding.kind, 'html-embed-markup');
assert.equal(videoFinding.policy, HTML_EMBED_POLICY);
assert.match(videoFinding.message, /Video element or a YouTube\/Vimeo iframe/);

// Allowed embed content.
assert.deepEqual(sources(embed('icon-embed-small w-embed', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g><path d="M0 0h24v24H0z"/></g></svg>')), []);
assert.deepEqual(sources(embed('icon w-embed', '<svg><svg><circle r="1"/></svg><path d="M0"/></svg>')), [], 'nested svg stays balanced');
assert.deepEqual(sources(embed('global-styles w-embed w-iframe', '<style>html { -webkit-font-smoothing: antialiased; }</style>')), []);
assert.deepEqual(sources(embed('hide w-embed w-script', '<script>const lenis = new Lenis();</script>')), []);
assert.deepEqual(sources(embed('video w-embed w-iframe', '<iframe src="https://www.youtube.com/embed/abc123" title="Demo"></iframe>')), []);
assert.deepEqual(sources(embed('video w-embed w-iframe', '<iframe src="https://player.vimeo.com/video/123"></iframe>')), []);
assert.deepEqual(sources(embed('empty w-embed', '   <!-- nothing here -->  ')), []);

// Webflow-generated wrappers that carry w-embed are not creator custom code.
assert.deepEqual(sources(embed('w-video w-embed', '<iframe class="embedly-embed" src="https://cdn.embedly.com/widgets/media.html?src=x"></iframe>')), []);
assert.deepEqual(sources(embed('w-password-page w-embed w-script', '<script>_handlePasswordPageOnload()</script><input type="hidden">')), []);
assert.deepEqual(sources('<div class="w-embed-youtubevideo"><iframe src="https://www.youtube.com/embed/x"></iframe></div>'), [], 'YouTube element class is not the embed class');

// Disallowed embed content.
assert.deepEqual(sources(embed('map w-embed w-iframe', '<iframe src="https://www.google.com/maps/embed?pb=1"></iframe>')), ['.map: <iframe>']);
assert.deepEqual(sources(embed('nest w-embed', '<div class="inner"><div><p>Deep</p></div></div><img src="x.png">')), ['.nest: <p>, <img>']);
assert.deepEqual(sources(embed('w-embed', '<audio src="x.mp3" controls></audio>')), ['div.w-embed: <audio>']);
// Wrapper markup around an inline SVG icon (archinic.webflow.io, .interior_embed) is not foreign content.
assert.deepEqual(sources(embed('interior_embed w-embed', '<div class="pxl-item--icon"> <span class="icon-default"> <svg viewBox="0 0 10 10"><path d="M0"/></svg> </span> </div>')), []);
assert.deepEqual(sources(embed('mixed w-embed w-script', '<script>init()</script><canvas id="scene"></canvas>')), ['.mixed: <canvas>']);

// Sibling content after the embed is never attributed to it.
assert.deepEqual(sources(`${embed('icon w-embed', '<svg></svg>')}<div class="after"><video></video></div>`), []);
assert.deepEqual(sources(`${embed('one w-embed', '<video></video>')}${embed('two w-embed', '<audio></audio>')}`), ['.one: <video>', '.two: <audio>']);

assert.deepEqual(disallowedEmbedTags('<SVG><path/></SVG><VIDEO controls></VIDEO>'), ['video'], 'tag names are case-insensitive');

// The aggregate policy surfaces the finding alongside font and schema findings.
assert.ok(findProhibitedMarketplaceCustomCode(videoEmbed).some((finding) => finding.policy === HTML_EMBED_POLICY));

// Through the crawler: the page that passed on 2026-10-15 now fails with the policy finding.
const source = fs.readFileSync(new URL('../src/worker.js', import.meta.url), 'utf8');
const start = source.indexOf('var IX2_REJECTION_MESSAGE');
const endMarker = '__name(containsPotentiallyHarmfulCode, "containsPotentiallyHarmfulCode");';
const end = source.indexOf(endMarker) + endMarker.length;
assert.notEqual(start, -1, 'validator slice start not found');
assert.notEqual(end, endMarker.length - 1, 'validator slice end not found');
const sandbox = { console, Set, URL, findProhibitedMarketplaceCustomCode, __name: (target) => target };
vm.createContext(sandbox);
vm.runInContext(source.slice(start, end), sandbox);

const page = (body) => `<!doctype html><html data-wf-site="000000000000000000000000"><head></head><body>${body}</body></html>`;
const failed = sandbox.validateGsapUsage(page(videoEmbed), 'https://embed-fixture.webflow.io/');
assert.equal(failed.passed, false);
assert.equal(failed.summary.flaggedCodeCount, 1);
assert.equal(failed.details.flaggedCode[0].policy, HTML_EMBED_POLICY);
assert.deepEqual(Array.from(failed.details.flaggedCode[0].flaggedCode), ['html-embed-markup: .embed-contents: <video>']);

const passed = sandbox.validateGsapUsage(
  page(`${embed('icon-embed-small w-embed', '<svg><path d="M0"/></svg>')}${embed('w-video w-embed', '<iframe class="embedly-embed" src="https://cdn.embedly.com/x"></iframe>')}`),
  'https://embed-fixture.webflow.io/'
);
assert.equal(passed.passed, true);
assert.equal(passed.summary.flaggedCodeCount, 0);

console.log('html embed policy tests passed');

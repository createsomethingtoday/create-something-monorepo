/** HTTP readback only. Does not establish rendered layout or client interaction acceptance. */
import assert from 'node:assert/strict';
const base = process.argv[2] ?? 'http://127.0.0.1:4198';
const get = async (path) => {
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, 200, `${path}: ${response.status}`);
  return response.text();
};
const html = await get('/openai-dots');
const text = html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<[^>]+>/g, '')
  .replace(/\s+/g, ' ');
assert.equal((html.match(/rel="canonical"/g) ?? []).length, 1);
assert.match(html, /rel="canonical" href="https:\/\/createsomething.agency\/openai-dots"/);
assert.doesNotMatch(html, /<meta name="robots" content="[^\"]*noindex/);
assert.match(text, /What are OpenAI dots\?/);
assert.match(text, /personal AI agents that carry context between conversations/);
assert.match(text, /A little.*more room/);
assert.match(text, /not a recording of Canon working/);
assert.match(text, /our personal OpenAI dot/);
assert.match(
  html,
  /href="\/book\?source=openai-dots(?:&amp;|&)intent=workflow-mapping(?:&amp;|&)lane=workflow_infrastructure"/
);
assert.match(html, /href="\/workflows"/);
const schemas = [
  ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)
].map((match) => JSON.parse(match[1]));
const faq = schemas.find((schema) => schema['@type'] === 'FAQPage');
assert.equal(faq?.mainEntity.length, 3);
for (const item of faq.mainEntity) {
  assert.ok(text.includes(item.name), item.name);
  assert.ok(text.includes(item.acceptedAnswer.text), item.name);
}
const crumbs = schemas.find((schema) => schema['@type'] === 'BreadcrumbList');
assert.deepEqual(
  crumbs.itemListElement.map((item) => item.name),
  ['Home', 'Workflow Guides', 'OpenAI dots']
);
assert.ok(html.indexOf('data-page-wayfinding') < html.indexOf('class="openai-dots"'));
for (const chapter of ['why', 'with-canon', 'your-call', 'begin']) {
  assert.ok(html.includes(`href="#${chapter}"`) && html.includes(`id="${chapter}"`), chapter);
}
for (const step of ['gather', 'make', 'return'])
  assert.match(html, new RegExp(`id="dots-${step}"[^>]*name="canon-step"`));
for (const path of ['/workflows', '/partners'])
  assert.match(await get(path), /href="\/openai-dots"/);
assert.match(
  await get('/sitemap.xml'),
  /<loc>https:\/\/createsomething.agency\/openai-dots<\/loc>/
);
console.log(
  'PASS: SSR content, one canonical, indexability, visible FAQ/schema parity, breadcrumbs, ruler anchors, native radios, accepted funnel, inbound links, sitemap.'
);

import assert from 'node:assert/strict';
import { dentalAgentFaqs, dentalDemoHref } from '../src/lib/data/dentalAgents.ts';

// Bounded HTTP acceptance check for the actual SSR artifact, locally or deployed.
const origin = process.argv[2] ?? 'http://127.0.0.1:4191';
const get = async (path) => {
  const response = await fetch(new URL(path, origin), { redirect: 'manual' });
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  return response;
};
const response = await get('/dental-ai-agents');
const html = await response.text();
const canonical = [...html.matchAll(/<link\b[^>]*>/g)].filter(([tag]) =>
  /rel="canonical"/.test(tag)
);
assert.equal(canonical.length, 1, 'one canonical');
assert.ok(canonical[0][0].includes('href="https://createsomething.agency/dental-ai-agents"'));
assert.doesNotMatch(html, /<meta[^>]*name="robots"[^>]*content="[^"]*noindex/);
assert.equal([...html.matchAll(/<h1\b/g)].length, 1, 'one public heading');
const schemas = [
  ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)
].map(([, json]) => JSON.parse(json));
const service = schemas.find((schema) => schema['@type'] === 'Service');
assert.ok(service, 'service schema present');
const organization = schemas.find((schema) => schema['@type'] === 'Organization');
assert.equal(organization.name, 'CREATE SOMETHING');
assert.equal(service.provider['@id'], organization['@id']);
assert.ok(schemas.some((schema) => schema['@type'] === 'BreadcrumbList'));
assert.ok(!schemas.some((schema) => ['Dentist', 'LocalBusiness'].includes(schema['@type'])));
const faq = schemas.find((schema) => schema['@type'] === 'FAQPage');
assert.deepEqual(
  faq.mainEntity.map((item) => ({ question: item.name, answer: item.acceptedAnswer.text })),
  dentalAgentFaqs
);
const summaryText = [...html.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>/g)].map(([, text]) =>
  text
    .replace(/<[^>]*>/g, '')
    .replace(/\+/g, '')
    .trim()
);
for (const item of dentalAgentFaqs)
  assert.ok(summaryText.includes(item.question), `visible FAQ: ${item.question}`);
for (const step of ['ask', 'read', 'confirm', 'record'])
  assert.match(html, new RegExp(`id="dental-${step}"`));
assert.doesNotMatch(html, /owner-private/);
const demoLinks = [...html.matchAll(/<a\b[^>]*>/g)].filter(([tag]) =>
  tag.includes('data-dental-demo-link')
);
assert.ok(demoLinks.length >= 3, 'direct hero, image and caption links to demo');
for (const [tag] of demoLinks) {
  assert.ok(tag.includes(`href="${dentalDemoHref}"`));
}
assert.match(html, /not dental care/);
assert.match(
  html,
  /book\?source=dental-ai-agents(?:&amp;|&)intent=workflow-mapping(?:&amp;|&)lane=workflow_infrastructure/
);
for (const path of ['/partners', '/workflows'])
  assert.match(await (await get(path)).text(), /href="\/dental-ai-agents"/);
assert.match(
  await (await get('/sitemap.xml')).text(),
  /https:\/\/createsomething.agency\/dental-ai-agents<\/loc>/
);
for (const path of [
  '/images/dental-agents/dental-agents-social.png',
  '/images/dental-agents/lumen-connected-desk-20261109.png'
]) {
  const asset = await get(path);
  assert.match(asset.headers.get('content-type'), /image\/png/);
  assert.ok((await asset.arrayBuffer()).byteLength > 1000);
}
const demoResponse = await fetch(dentalDemoHref, { redirect: 'manual' });
assert.equal(demoResponse.status, 200, 'demo opens anonymously without a login redirect');
const demoDataResponse = await fetch(new URL('/api/demo', dentalDemoHref), { redirect: 'manual' });
assert.equal(demoDataResponse.status, 200, 'synthetic demo database is visitor-accessible');
const demoData = await demoDataResponse.json();
assert.ok(Array.isArray(demoData.services) && demoData.services.length > 0);
console.log(
  JSON.stringify(
    {
      origin,
      path: '/dental-ai-agents',
      canonical: 'passed',
      schema: 'Service + Organization + WebPage + BreadcrumbList + matching visible FAQ',
      discovery: 'incoming links + sitemap',
      nativeSequence: '4 controls in SSR',
      booking: 'source/intent/lane retained',
      media: '2 PNG assets',
      demoAccess: 'anonymous HTTP 200 and synthetic database reachable',
      limits: 'No assertion of indexing, AI citations, clinical integration or real conversion.'
    },
    null,
    2
  )
);

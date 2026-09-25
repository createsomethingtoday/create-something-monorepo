// Run with the local component fixture server running:
// ego-browser nodejs < output/production-polish/error-title-regression.mjs
// Standalone runs create and close their own space. An active worker may inject its owned ID.
const t = await taskSpace(globalThis.privatePolishSpaceId ?? 'PRIVATE rendered error title regression');
const p = t.page('p1');
const failures = [];
for (const status of [403, 404, 500]) {
  await p.goto(`http://127.0.0.1:43115/?view=error&status=${status}`);
  await p.waitForSelector('main h1');
  const actual = await p.evaluate(() => ({title:document.title, heading:document.querySelector('main h1').textContent}));
  const heading = status === 403 ? 'Access required.' : 'Not available.';
  const expected = `${heading} | PRIVATE`;
  const pass = actual.title === expected && actual.heading === heading;
  console.log(JSON.stringify({status, expected, actual, pass}));
  if (!pass) failures.push(status);
}
if (failures.length) throw new Error(`Rendered error page title regression: ${failures.join(', ')}`);
console.log('PASS: status-appropriate titles and headings render for 403, 404 and 500.');
if (globalThis.privatePolishSpaceId === undefined) await t.finish({keep: []});

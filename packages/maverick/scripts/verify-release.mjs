import assert from 'node:assert/strict';

const origin = process.argv[2];
assert(origin && /^https?:\/\//.test(origin), 'Pass the release origin');
const expected = {
  '/': ['chemistry that', 'helping operators recover more, for less'],
  '/oil-gas': ['PetroX Boost changes the rock itself.', 'Production Chemistry'],
  '/mining': ['more metal', 'from every mine', 'Curing Chemistry'],
  '/about': ['Sanjay Jain', 'Hayden Lippelman', 'Principal Scientist, Bioprocess Technical Operations'],
  '/news': ['May 20, 2026', 'Apr 22, 2026', 'Jan 13, 2026', 'GlobeNewswire']
};
for (const [path, needles] of Object.entries(expected)) {
  const response = await fetch(new URL(path, origin));
  assert.equal(response.status, 200, path);
  const html = await response.text();
  for (const needle of needles) assert(html.includes(needle), `${path}: missing ${needle}`);
  assert(!/PetroX Bo\.\.\.|PLACEHOLDER|photo —|href="#"/.test(html), `${path}: unfinished content`);
  assert(html.includes('rel="canonical"'), `${path}: canonical missing`);
  if (path === '/about') {
    const portraits = [...html.matchAll(/src="(\/redesign\/team-[^"]+)"/g)];
    assert.equal(portraits.length, 7);
    for (const [, src] of portraits) assert.equal((await fetch(new URL(src, origin))).status, 200, src);
  }
  console.log(`PASS ${path}`);
}
for (const path of ['/privacy', '/terms', '/water-treatment', '/admin/login']) {
  assert.equal((await fetch(new URL(path, origin))).status, 200, path);
  console.log(`PASS retained route ${path}`);
}
const protectedRoute = await fetch(new URL('/admin/content', origin), { redirect: 'manual' });
assert.equal(protectedRoute.status, 303, 'Admin content stays session protected');
assert.equal(protectedRoute.headers.get('location'), '/admin/login');
console.log('PASS admin authentication boundary');
const invalid = await fetch(new URL('/api/contact', origin), {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: new URL(origin).origin }, body: '{}'
});
assert.equal(invalid.status, 400, 'Invalid contact request must fail before database/email writes');
console.log('PASS non-sending contact API validation (400)');

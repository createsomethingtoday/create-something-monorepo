#!/usr/bin/env node

const base = (process.env.TEMPLATE_ROUTE_BASE ?? 'https://webflow.com').replace(/\/+$/, '');

const expectedLiveRoutes = [
  '/templates/all',
  '/templates/featured',
  '/templates/free-website-templates',
  '/templates/landing-page',
  '/templates/category/community-and-nonprofit-websites',
  '/templates/category/documentation-websites',
  '/templates/category/technology-websites',
  '/templates/style/light-websites',
];

const intentionallyBlockedRoutes = [
  // Child/niche category slugs are valid search filters but not Webflow category pages.
  '/templates/category/activism-and-non-profit-websites',
];

async function checkRoute(path, shouldResolve) {
  const url = `${base}${path}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'create-something-template-route-smoke/1.0',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'manual',
  });
  const resolved = response.status >= 200 && response.status < 400;
  return {
    path,
    status: response.status,
    ok: shouldResolve ? resolved : !resolved,
    expected: shouldResolve ? '2xx/3xx' : 'not 2xx/3xx',
  };
}

const results = [];
for (const path of expectedLiveRoutes) {
  results.push(await checkRoute(path, true));
}
for (const path of intentionallyBlockedRoutes) {
  results.push(await checkRoute(path, false));
}

const failures = results.filter((result) => !result.ok);
for (const result of results) {
  const marker = result.ok ? 'OK' : 'FAIL';
  console.log(`${marker} ${result.path} status=${result.status} expected=${result.expected}`);
}

if (failures.length > 0) {
  process.exitCode = 1;
}

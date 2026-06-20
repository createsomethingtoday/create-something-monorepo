#!/usr/bin/env node

import { collectIoPaperCycleContext } from './io-paper-cycle-context.mjs';
import { execFileSync } from 'node:child_process';

function parseArgs(argv) {
  const args = {
    base: '',
    head: '',
    baseUrl: 'https://createsomething.io',
    format: 'text',
    intervalSeconds: 15,
    rangeMode: 'direct',
    routes: [],
    skipContentAssertions: false,
    timeoutSeconds: 900,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--base' && argv[i + 1]) {
      args.base = argv[++i];
      continue;
    }
    if (arg === '--head' && argv[i + 1]) {
      args.head = argv[++i];
      continue;
    }
    if (arg === '--base-url' && argv[i + 1]) {
      args.baseUrl = argv[++i];
      continue;
    }
    if (arg === '--routes' && argv[i + 1]) {
      args.routes.push(...argv[++i].split(',').map((value) => value.trim()).filter(Boolean));
      continue;
    }
    if (arg === '--format' && argv[i + 1]) {
      args.format = argv[++i];
      continue;
    }
    if (arg === '--timeout-seconds' && argv[i + 1]) {
      args.timeoutSeconds = Number(argv[++i]);
      continue;
    }
    if (arg === '--interval-seconds' && argv[i + 1]) {
      args.intervalSeconds = Number(argv[++i]);
      continue;
    }
    if (arg === '--range-mode' && argv[i + 1]) {
      args.rangeMode = argv[++i];
      continue;
    }
    if (arg === '--skip-content-assertions') {
      args.skipContentAssertions = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!['text', 'json'].includes(args.format)) {
    throw new Error(`Unsupported format: ${args.format}`);
  }
  if (!['direct', 'merge-base'].includes(args.rangeMode)) {
    throw new Error(`Unsupported range mode: ${args.rangeMode}`);
  }
  if (!Number.isFinite(args.timeoutSeconds) || args.timeoutSeconds <= 0) {
    throw new Error('--timeout-seconds must be a positive number.');
  }
  if (!Number.isFinite(args.intervalSeconds) || args.intervalSeconds <= 0) {
    throw new Error('--interval-seconds must be a positive number.');
  }

  return args;
}

function printUsage() {
  console.log(`Usage:
  node scripts/io-paper-cycle-verify.mjs --routes /papers/foo,/experiments/bar [--base-url https://createsomething.io]
  node scripts/io-paper-cycle-verify.mjs --base <sha> --head <sha> [--range-mode direct|merge-base]`);
}

function uniqueSorted(values) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function diffFiles(base, head, rangeMode) {
  if (!base || !head) return [];
  const args = rangeMode === 'merge-base'
    ? ['diff', '--name-only', `${base}...${head}`]
    : ['diff', '--name-only', base, head];
  const output = execFileSync('git', args, { encoding: 'utf8' });
  return uniqueSorted(output.split(/\r?\n/u));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function routeSlug(route, prefix) {
  if (!route.startsWith(prefix)) return '';

  const slug = route.slice(prefix.length).split('/')[0]?.trim() ?? '';
  return slug && !slug.startsWith('[') ? slug : '';
}

function buildRouteExpectations(routes) {
  const paperRoutes = uniqueSorted(routes.filter((route) => routeSlug(route, '/papers/')));
  const experimentRoutes = uniqueSorted(routes.filter((route) => routeSlug(route, '/experiments/')));
  const paperSlugs = paperRoutes.map((route) => routeSlug(route, '/papers/')).filter(Boolean);
  const experimentSlugs = experimentRoutes.map((route) => routeSlug(route, '/experiments/')).filter(Boolean);

  return new Map(routes.map((route) => {
    if (routeSlug(route, '/papers/')) {
      return [route, []];
    }

    if (routeSlug(route, '/experiments/')) {
      return [route, []];
    }

    if (route === '/papers') {
      return [route, paperSlugs];
    }

    if (route === '/experiments') {
      return [route, experimentSlugs];
    }

    if (route === '/api/manifest') {
      return [route, [...paperSlugs, ...experimentSlugs]];
    }

    if (route === '/sitemap.xml') {
      return [route, [...paperRoutes, ...experimentRoutes]];
    }

    return [route, []];
  }));
}

async function fetchRoute(baseUrl, route, expectedFragments = []) {
  const url = new URL(route, baseUrl);
  url.searchParams.set('__paper_cycle_verify', `${Date.now()}`);

  try {
    const response = await fetch(url, {
      headers: {
        'cache-control': 'no-cache',
      },
      redirect: 'follow',
    });
    const body = await response.text();
    const missingFragments = expectedFragments.filter((fragment) => !body.includes(fragment));
    const contentOk = missingFragments.length === 0;

    return {
      content_ok: contentOk,
      missing_fragments: missingFragments,
      ok: response.ok && contentOk,
      status: response.status,
      status_text: response.statusText,
      url: url.toString(),
    };
  } catch (error) {
    return {
      content_ok: false,
      missing_fragments: expectedFragments,
      ok: false,
      status: 0,
      status_text: error instanceof Error ? error.message : String(error),
      url: url.toString(),
    };
  }
}

async function verifyRoutes({ baseUrl, routes, timeoutSeconds, intervalSeconds, skipContentAssertions }) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  const expectations = skipContentAssertions ? new Map() : buildRouteExpectations(routes);
  const state = new Map(
    routes.map((route) => [
      route,
      {
        attempts: 0,
        content_ok: skipContentAssertions || (expectations.get(route)?.length ?? 0) === 0,
        missing_fragments: [],
        ok: false,
        last_status: 0,
        last_status_text: 'pending',
      },
    ]),
  );

  while (Date.now() <= deadline) {
    const pendingRoutes = [...state.entries()].filter(([, value]) => !value.ok).map(([route]) => route);
    if (pendingRoutes.length === 0) {
      break;
    }

    const results = await Promise.all(
      pendingRoutes.map((route) => fetchRoute(baseUrl, route, expectations.get(route) ?? [])),
    );
    for (let i = 0; i < pendingRoutes.length; i += 1) {
      const route = pendingRoutes[i];
      const result = results[i];
      const current = state.get(route);
      state.set(route, {
        attempts: (current?.attempts ?? 0) + 1,
        content_ok: result.content_ok,
        ok: result.ok,
        missing_fragments: result.missing_fragments,
        last_status: result.status,
        last_status_text: result.status_text,
        url: result.url,
      });
    }

    if ([...state.values()].every((entry) => entry.ok)) {
      break;
    }

    if (Date.now() + intervalSeconds * 1000 <= deadline) {
      await sleep(intervalSeconds * 1000);
    } else {
      break;
    }
  }

  const routesSummary = [...state.entries()].map(([route, result]) => ({
    route,
    ...result,
  }));

  return {
    passed: routesSummary.every((result) => result.ok),
    routes: routesSummary,
  };
}

function printText(summary) {
  if (summary.routes.length === 0) {
    console.log('No publishable routes detected; skipping route verification.');
    return;
  }

  console.log(`Route verification ${summary.passed ? 'passed' : 'failed'} for ${summary.routes.length} route(s).`);
  for (const route of summary.routes) {
    console.log(`- ${route.route}: ${route.ok ? 'ok' : 'failed'} after ${route.attempts} attempt(s) [${route.last_status} ${route.last_status_text}]`);
    if (route.missing_fragments?.length > 0) {
      console.log(`  missing content: ${route.missing_fragments.join(', ')}`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const changedFiles = diffFiles(args.base, args.head, args.rangeMode);
  const derivedRoutes = changedFiles.length > 0
    ? collectIoPaperCycleContext(changedFiles).verification_routes
    : [];
  const routes = uniqueSorted([...args.routes, ...derivedRoutes]);

  const summary = routes.length === 0
    ? { passed: true, routes: [] }
    : await verifyRoutes({
        baseUrl: args.baseUrl,
        routes,
        timeoutSeconds: args.timeoutSeconds,
        intervalSeconds: args.intervalSeconds,
        skipContentAssertions: args.skipContentAssertions,
      });

  if (args.format === 'json') {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    printText(summary);
  }

  if (!summary.passed) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

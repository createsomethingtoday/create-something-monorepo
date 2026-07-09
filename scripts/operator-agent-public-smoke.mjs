#!/usr/bin/env node

const DEFAULTS = Object.freeze({
  url: 'https://operator-agent.createsomething.agency/health',
  expectedAccessHost: 'createsomething.cloudflareaccess.com',
  timeoutMs: 15_000,
});

export function parseArgs(argv) {
  const options = { json: false, ...DEFAULTS };
  const args = [...argv];
  while (args.length > 0) {
    const arg = args.shift();
    if (arg === '--') continue;
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    const option = arg.startsWith('--') ? arg.slice(2) : '';
    const equalsIndex = option.indexOf('=');
    const rawKey = equalsIndex === -1 ? option : option.slice(0, equalsIndex);
    const inlineValue = equalsIndex === -1 ? undefined : option.slice(equalsIndex + 1);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const value = inlineValue ?? args.shift();
    if (!value) throw new Error(`Missing value for --${rawKey}`);
    if (!['url', 'expectedAccessHost', 'timeoutMs'].includes(key)) {
      throw new Error(`Unsupported option: --${rawKey}`);
    }
    options[key] = key === 'timeoutMs' ? Number(value) : value;
  }
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1000 || options.timeoutMs > 60_000) {
    throw new Error('--timeout-ms must be an integer between 1000 and 60000');
  }
  return options;
}

function headerValue(headers, name) {
  return headers?.get?.(name) ?? null;
}

function locationHost(location) {
  if (!location) return null;
  try {
    return new URL(location).host;
  } catch {
    return null;
  }
}

export function classifyAccessResponse(response, options) {
  const location = headerValue(response.headers, 'location');
  const authenticate = headerValue(response.headers, 'www-authenticate');
  const redirectHost = locationHost(location);
  const redirectsToAccess = Boolean(
    [302, 303, 307, 308].includes(response.status) &&
      redirectHost === options.expectedAccessHost &&
      location?.includes('/cdn-cgi/access/login/')
  );
  const challengesAccess = Boolean(authenticate?.includes('Cloudflare-Access'));
  const accessProtected = redirectsToAccess || challengesAccess;

  return {
    status: response.status,
    accessProtected,
    redirectsToAccess,
    challengesAccess,
    locationHost: redirectHost,
    cloudflareRayPresent: Boolean(headerValue(response.headers, 'cf-ray')),
    rawOriginExposed: response.status === 200 && !accessProtected,
  };
}

export async function smoke(options, fetchImpl = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetchImpl(options.url, {
      method: 'HEAD',
      redirect: 'manual',
      signal: controller.signal,
    });
    const classification = classifyAccessResponse(response, options);
    const ok = classification.accessProtected && !classification.rawOriginExposed;
    return {
      generatedAt: new Date().toISOString(),
      mode: 'public-gateway-smoke',
      ok,
      url: options.url,
      expectedAccessHost: options.expectedAccessHost,
      response: classification,
      nextActions: ok
        ? ['public gateway is protected by Cloudflare Access before origin reachability']
        : ['repair Cloudflare Access protection before relying on the public operator-agent hostname'],
    };
  } catch (error) {
    return {
      generatedAt: new Date().toISOString(),
      mode: 'public-gateway-smoke',
      ok: false,
      url: options.url,
      expectedAccessHost: options.expectedAccessHost,
      response: null,
      error: error instanceof Error ? error.message : String(error),
      nextActions: ['confirm DNS, tunnel, and Cloudflare Access before relying on the public operator-agent hostname'],
    };
  } finally {
    clearTimeout(timer);
  }
}

function print(report, asJson) {
  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log('# operator-agent public smoke');
  console.log(`Result: ${report.ok ? 'passed' : 'blocked'}`);
  console.log(`URL: ${report.url}`);
  if (report.response) {
    console.log(`HTTP status: ${report.response.status}`);
    console.log(`Access protected: ${report.response.accessProtected ? 'yes' : 'no'}`);
  }
  if (report.nextActions?.length) {
    console.log('\nNext actions:');
    for (const action of report.nextActions) console.log(`- ${action}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const report = await smoke(options);
    print(report, options.json);
    process.exit(report.ok ? 0 : 1);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

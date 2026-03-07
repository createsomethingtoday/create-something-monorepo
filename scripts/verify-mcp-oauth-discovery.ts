type CheckResult = {
  url: string;
  status: number;
  ok: boolean;
  detail: string;
};

const DEFAULT_HOSTS = [
  'https://lainy.mcp.createsomething.agency',
  'https://danny.mcp.createsomething.agency',
  'https://august.mcp.createsomething.agency',
  'https://c3denver.mcp.createsomething.agency',
  'https://aaron-outerfields.mcp.createsomething.agency',
  'https://andre-outerfields.mcp.createsomething.agency',
  'https://fillip.mcp.createsomething.agency',
  'https://leah.mcp.createsomething.agency',
  'https://mj.mcp.createsomething.agency',
  'https://cs-mcp-hub-remote.createsomething.workers.dev',
];

const REQUIRED_PATHS = [
  '/.well-known/oauth-authorization-server',
  '/mcp/.well-known/oauth-authorization-server',
  '/.well-known/oauth-protected-resource',
  '/mcp/.well-known/oauth-protected-resource',
];

function parseHosts(argv: string[]): string[] {
  const hostFlag = argv.find((arg) => arg.startsWith('--hosts='));
  if (!hostFlag) return DEFAULT_HOSTS;
  return hostFlag
    .slice('--hosts='.length)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

async function checkUrl(url: string): Promise<CheckResult> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });
    const contentType = response.headers.get('content-type') ?? '';
    const bodyText = await response.text();
    const ok = response.status === 200 && contentType.includes('application/json');
    const detail = ok
      ? 'ok'
      : `${contentType || 'unknown-content-type'} ${bodyText.slice(0, 180).replace(/\s+/g, ' ').trim()}`;
    return { url, status: response.status, ok, detail };
  } catch (error) {
    return {
      url,
      status: 0,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const hosts = parseHosts(process.argv.slice(2));
  const urls = hosts.flatMap((host) => REQUIRED_PATHS.map((path) => `${host}${path}`));
  const results = await Promise.all(urls.map((url) => checkUrl(url)));
  const failures = results.filter((result) => !result.ok);

  for (const result of results) {
    const marker = result.ok ? 'OK' : 'FAIL';
    console.log(`${marker} ${result.status || 'ERR'} ${result.url}`);
    if (!result.ok) {
      console.log(`  ${result.detail}`);
    }
  }

  if (failures.length > 0) {
    console.error(`\nOAuth discovery verification failed for ${failures.length} URL(s).`);
    process.exitCode = 1;
    return;
  }

  console.log(`\nOAuth discovery verification passed for ${results.length} URL(s).`);
}

await main();

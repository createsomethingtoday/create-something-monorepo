const ACCESS_ASSERTION_HEADER = 'cf-access-jwt-assertion';
const MCP_PROXY_PATH = '/mcp';
const UPSTREAM_MCP_PATH = '/access/mcp';
const REQUIRED_UPSTREAM_ORIGIN = 'https://webflow-template-review-mcp.createsomething.workers.dev';

const FORWARDED_REQUEST_HEADERS = [
  'accept',
  'content-type',
  'last-event-id',
  'mcp-protocol-version',
  'mcp-session-id',
] as const;

type AccessProxyOptions = {
  upstreamOrigin?: string;
  fetch?: (request: Request) => Promise<Response>;
};

function jsonError(status: number, error: string, message: string): Response {
  return Response.json({ error, message }, { status });
}

function normalizeUpstreamOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port) return null;
    if (parsed.pathname !== '/' || parsed.search || parsed.hash) return null;
    return parsed.origin === REQUIRED_UPSTREAM_ORIGIN ? parsed.origin : null;
  } catch {
    return null;
  }
}

export async function handleAccessProxyRequest(
  request: Request,
  options: AccessProxyOptions,
): Promise<Response> {
  const requestUrl = new URL(request.url);
  if (requestUrl.pathname !== MCP_PROXY_PATH) {
    return jsonError(404, 'not_found', 'Not found.');
  }

  const assertion = request.headers.get(ACCESS_ASSERTION_HEADER)?.trim();
  if (!assertion) {
    return jsonError(401, 'unauthorized', 'Missing Cloudflare Access application assertion.');
  }

  const upstreamOrigin = normalizeUpstreamOrigin(options.upstreamOrigin);
  if (!upstreamOrigin) {
    return jsonError(500, 'misconfigured', 'Access proxy upstream is not configured.');
  }

  const upstreamUrl = new URL(UPSTREAM_MCP_PATH, upstreamOrigin);
  upstreamUrl.search = requestUrl.search;

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set(ACCESS_ASSERTION_HEADER, assertion);

  const body = request.method === 'GET' || request.method === 'HEAD'
    ? undefined
    : await request.arrayBuffer();
  const upstreamRequest = new Request(upstreamUrl, {
    method: request.method,
    headers,
    body,
    redirect: 'manual',
  });
  const response = await (options.fetch ?? fetch)(upstreamRequest);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

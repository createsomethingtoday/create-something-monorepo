const RETIRED_AT = '2026-07-08';
const REPLACEMENT_SERVICE = 'webflow-template-review-mcp';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, Accept, Mcp-Session-Id, X-Requested-With, X-API-Key'
};

function json(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('X-Webflow-Site-Analyzer-Host', 'retired');

  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }

  return new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers
  });
}

function retiredBody(pathname: string): Record<string, unknown> {
  return {
    name: 'webflow-site-analyzer-mcp-remote',
    status: 'retired',
    retiredAt: RETIRED_AT,
    replacementService: REPLACEMENT_SERVICE,
    message:
      'The Webflow site analyzer remote runtime is retired and no longer accepts MCP traffic.',
    path: pathname
  };
}

export function retiredContainerResponse(request: Request): Response {
  const url = new URL(request.url);
  return json(
    {
      ...retiredBody(url.pathname),
      error: 'retired_container_runtime'
    },
    { status: 410 }
  );
}

export function retiredResponse(request: Request): Response {
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (url.pathname === '/' || url.pathname === '/health') {
    return json(retiredBody(url.pathname));
  }

  return json(
    {
      ...retiredBody(url.pathname),
      error: 'retired_mcp_runtime'
    },
    { status: 410 }
  );
}

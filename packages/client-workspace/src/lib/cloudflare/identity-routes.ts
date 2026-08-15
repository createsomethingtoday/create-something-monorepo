export interface IdentityRoutesOptions {
  identityApiUrl: string;
  fetch: typeof globalThis.fetch;
}

export interface IdentityRoutes {
  fetch(request: Request): Promise<Response | null>;
  refreshAccess(request: Request): Promise<{
    request: Request;
    setCookies: string[];
  } | null>;
}

type LoginBody = { email?: unknown; password?: unknown };

const signInHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sign in — Client Workspace</title>
    <style>
      :root {
        color-scheme: light;
        --color-performance-paper: #f3f3f0;
        --color-performance-panel: #ffffff;
        --color-performance-ink: #090909;
        --color-performance-muted: #5e6268;
        --color-performance-line: #d7d7d2;
        --color-performance-line-strong: #9c9c96;
        --color-performance-signal: #0057b8;
        --font-performance-display: "Satoshi", "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif;
        --font-performance-interface: var(--font-performance-display);
        --font-performance-mono: "IBM Plex Mono", "SFMono-Regular", Menlo, Monaco, Consolas, monospace;
        --space-performance-xs: 0.618rem;
        --space-performance-sm: 1rem;
        --space-performance-md: 1.618rem;
        --space-performance-lg: 2.618rem;
        --radius-performance-sm: 0;
        --radius-performance-md: 4px;
        --shadow-performance-panel: none;
        font-family: var(--font-performance-interface);
        background: var(--color-performance-paper);
        color: var(--color-performance-ink);
      }
      * { box-sizing: border-box; }
      body {
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
        padding: var(--space-performance-md);
        background: var(--color-performance-paper);
      }
      main {
        width: min(100%, 26.18rem);
        padding: var(--space-performance-lg);
        background: var(--color-performance-panel);
        border: 1px solid var(--color-performance-line);
        border-top: 4px solid var(--color-performance-signal);
        border-radius: var(--radius-performance-md);
        box-shadow: var(--shadow-performance-panel);
      }
      h1 {
        margin: 0 0 var(--space-performance-xs);
        font-family: var(--font-performance-display);
        font-size: 1.618rem;
        font-weight: 500;
        line-height: 1.15;
      }
      p { margin: 0 0 var(--space-performance-md); color: var(--color-performance-muted); }
      label {
        display: grid;
        gap: var(--space-performance-xs);
        margin-top: var(--space-performance-sm);
        font-family: var(--font-performance-mono);
        font-size: 0.85rem;
      }
      input {
        padding: var(--space-performance-xs);
        border: 1px solid var(--color-performance-line-strong);
        border-radius: var(--radius-performance-sm);
        background: var(--color-performance-panel);
        color: var(--color-performance-ink);
        font: inherit;
      }
      input:focus-visible, button:focus-visible { outline: 2px solid var(--color-performance-signal); outline-offset: 2px; }
      button {
        width: 100%;
        margin-top: var(--space-performance-md);
        padding: var(--space-performance-xs) var(--space-performance-sm);
        border: 1px solid var(--color-performance-ink);
        border-radius: var(--radius-performance-sm);
        background: var(--color-performance-ink);
        color: var(--color-performance-panel);
        font: inherit;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Sign in to Client Workspace</h1>
      <p>Operator-only production pilot.</p>
      <form method="post" action="/api/auth/login">
        <label>Email <input name="email" type="email" autocomplete="username" required /></label>
        <label>Password <input name="password" type="password" autocomplete="current-password" required /></label>
        <button type="submit">Continue</button>
      </form>
    </main>
  </body>
</html>`;

function cookie(name: string, value: string, maxAge: number): string {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function requestCookies(request: Request): Map<string, string> {
  const values = new Map<string, string>();
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const separator = part.indexOf('=');
    if (separator <= 0) continue;
    values.set(part.slice(0, separator).trim(), part.slice(separator + 1).trim());
  }
  return values;
}

async function readLoginBody(request: Request): Promise<LoginBody> {
  if (request.headers.get('content-type')?.includes('application/json')) {
    return (await request.json()) as LoginBody;
  }
  const form = await request.formData();
  return { email: form.get('email'), password: form.get('password') };
}

function authError(status = 400, code = 'invalid_credentials'): Response {
  return Response.json({ error: code }, { status });
}

export function createIdentityRoutes(options: IdentityRoutesOptions): IdentityRoutes {
  const identityApiUrl = options.identityApiUrl.replace(/\/+$/, '');
  const fetchIdentity = options.fetch.bind(globalThis);

  return {
    async refreshAccess(request) {
      const cookies = requestCookies(request);
      const refreshToken = cookies.get('cs_refresh_token');
      if (!refreshToken) return null;
      let response: Response;
      try {
        response = await fetchIdentity(`${identityApiUrl}/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken })
        });
      } catch {
        return null;
      }
      if (!response.ok) return null;
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (
        typeof data.access_token !== 'string' ||
        typeof data.refresh_token !== 'string' ||
        typeof data.expires_in !== 'number'
      ) {
        return null;
      }

      cookies.set('cs_access_token', data.access_token);
      cookies.set('cs_refresh_token', data.refresh_token);
      const headers = new Headers(request.headers);
      headers.set(
        'cookie',
        [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ')
      );
      return {
        request: new Request(request, { headers }),
        setCookies: [
          cookie('cs_access_token', data.access_token, data.expires_in),
          cookie('cs_refresh_token', data.refresh_token, 7 * 24 * 60 * 60)
        ]
      };
    },
    async fetch(request) {
      const url = new URL(request.url);
      if (request.method === 'GET' && url.pathname === '/sign-in') {
        return new Response(signInHtml, {
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-store',
            'x-content-type-options': 'nosniff',
            'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
          }
        });
      }

      if (request.method === 'POST' && url.pathname === '/api/auth/login') {
        let body: LoginBody;
        try {
          body = await readLoginBody(request);
        } catch {
          return authError(400, 'invalid_request');
        }
        if (typeof body.email !== 'string' || typeof body.password !== 'string') {
          return authError(400, 'invalid_request');
        }

        let response: Response;
        try {
          response = await fetchIdentity(`${identityApiUrl}/v1/auth/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: body.email, password: body.password, audience: 'client-workspace' })
          });
        } catch {
          return authError(503, 'identity_unavailable');
        }
        const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        if (!response.ok) {
          const error = typeof data.error === 'string' ? data.error : 'invalid_credentials';
          return authError(response.status, error);
        }
        if (
          typeof data.access_token !== 'string' ||
          typeof data.refresh_token !== 'string' ||
          typeof data.expires_in !== 'number'
        ) {
          return authError(502, 'identity_response_invalid');
        }

        const headers = new Headers({
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store'
        });
        headers.append('set-cookie', cookie('cs_access_token', data.access_token, data.expires_in));
        headers.append('set-cookie', cookie('cs_refresh_token', data.refresh_token, 7 * 24 * 60 * 60));
        if (!request.headers.get('content-type')?.includes('application/json')) {
          headers.set('location', '/');
          return new Response(null, { status: 303, headers });
        }
        return new Response(JSON.stringify({ success: true }), { status: 200, headers });
      }

      if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
        const headers = new Headers({
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store'
        });
        for (const name of ['cs_access_token', 'cs_refresh_token', 'cs_workspace_instance']) {
          headers.append('set-cookie', cookie(name, '', 0));
        }
        return new Response(JSON.stringify({ success: true }), { status: 200, headers });
      }

      return null;
    }
  };
}

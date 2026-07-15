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
      :root { color-scheme: light; font: 16px/1.45 system-ui, sans-serif; background: #f5f2ec; color: #17201f; }
      body { min-height: 100vh; margin: 0; display: grid; place-items: center; padding: 1.5rem; }
      main { width: min(100%, 25rem); background: white; border: 1px solid #d9d4ca; padding: 2rem; box-shadow: 0 1rem 3rem #17201f12; }
      h1 { font: 500 1.6rem/1.15 Georgia, serif; margin: 0 0 .5rem; }
      p { color: #53605e; margin: 0 0 1.5rem; }
      label { display: grid; gap: .4rem; margin-top: 1rem; font-size: .85rem; }
      input { font: inherit; padding: .75rem; border: 1px solid #b9b4aa; border-radius: .25rem; }
      button { width: 100%; margin-top: 1.25rem; padding: .8rem; border: 0; border-radius: .25rem; background: #2f6f68; color: white; font: inherit; }
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

  return {
    async refreshAccess(request) {
      const cookies = requestCookies(request);
      const refreshToken = cookies.get('cs_refresh_token');
      if (!refreshToken) return null;
      const response = await options.fetch(`${identityApiUrl}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
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

        const response = await options.fetch(`${identityApiUrl}/v1/auth/login`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: body.email, password: body.password })
        });
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

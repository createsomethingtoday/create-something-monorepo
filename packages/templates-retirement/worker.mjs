const headers = {
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; style-src 'self'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer'
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const read = request.method === 'GET' || request.method === 'HEAD';
    // No request body, cookies, credentials, database, storage or upstream commerce.
    if (!read || url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      return new Response(request.method === 'HEAD' ? null : JSON.stringify({
        error: 'storefront_retired',
        message: 'The Templates storefront has retired. No purchase or account action was performed.',
        contact: 'https://createsomething.agency/contact'
      }), { status: 410, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } });
    }
    const asset = ['/styles.css', '/tokens.css'].includes(url.pathname);
    const target = new URL(asset ? url.pathname : '/', url.origin);
    // Only the platform's static asset binding is used. Drop caller headers/query.
    const response = await env.ASSETS.fetch(new Request(target, { method: 'GET' }));
    if (response.status !== 200) {
      return new Response(request.method === 'HEAD' ? null : 'Templates has retired. Contact https://createsomething.agency/contact', {
        status: 503, headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
    return new Response(request.method === 'HEAD' ? null : response.body, {
      status: asset || url.pathname === '/' ? 200 : 410,
      headers: { ...headers, 'Content-Type': asset ? 'text/css; charset=utf-8' : 'text/html; charset=utf-8' }
    });
  }
};

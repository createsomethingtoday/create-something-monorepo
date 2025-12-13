/**
 * Router Worker
 *
 * Routes *.createsomething.space to appropriate tenant Workers.
 * Embodies Zuhandenheit: the router recedes, the site appears.
 *
 * Canon: Maximum work, minimum chrome. The infrastructure disappears.
 */

interface Env {
	DB: D1Database;
	DISPATCH_NAMESPACE: DispatchNamespace;
	CONFIG_CACHE: KVNamespace;
	SITE_BUCKET: R2Bucket;
}

interface DispatchNamespace {
	get(name: string): { fetch: typeof fetch } | null;
}

interface TenantRecord {
	id: string;
	subdomain: string;
	template_id: string;
	template_version: string | null; // e.g., "1.0.0", "1.2.3", or null for latest
	config: string;
	status: string;
	worker_id: string | null;
	custom_domain: string | null;
}

// Reserved subdomains - protected from user registration
const RESERVED_SUBDOMAINS = new Set([
	// Platform
	'www',
	'api',
	'app',
	'admin',
	'dashboard',
	// Auth
	'auth',
	'login',
	'signup',
	'sso',
	// Infrastructure
	'mail',
	'smtp',
	'imap',
	'cdn',
	'assets',
	'static',
	'custom',
	// Environments
	'dev',
	'staging',
	'test',
	'beta',
	'preview',
	// Support
	'help',
	'support',
	'docs',
	'status',
	// Financial
	'billing',
	'payment',
	'checkout',
	// Content
	'blog',
	'news',
	// CREATE SOMETHING properties
	'space',
	'io',
	'agency',
	'ltd',
	'templates',
	'id',
	'learn',
	// Common squatting targets
	'root',
	'system',
	'null',
	'undefined'
]);

const PLATFORM_DOMAINS = ['createsomething.space'];

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const hostname = url.hostname;

		// Extract subdomain or check custom domain
		const subdomain = extractSubdomain(hostname);
		const isCustomDomain = !subdomain && !isPlatformRoot(hostname);

		let tenant: TenantRecord | null = null;

		if (subdomain) {
			// Check reserved subdomains - pass through to origin (Pages) for platform subdomains
			if (RESERVED_SUBDOMAINS.has(subdomain.toLowerCase())) {
				// Let Cloudflare Pages handle platform subdomains like 'templates'
				return fetch(request);
			}

			// Subdomain lookup
			tenant = await lookupTenantBySubdomain(env, subdomain);
		} else if (isCustomDomain) {
			// Custom domain lookup
			tenant = await lookupTenantByCustomDomain(env, hostname);
		} else {
			// Platform root - redirect to main site
			return Response.redirect('https://createsomething.space', 302);
		}

		if (!tenant) {
			return renderNotFound();
		}

		// Check status
		if (tenant.status !== 'active') {
			return renderStatusPage(tenant.status);
		}

		// Serve directly from R2 (simpler than dispatch namespace for now)
		return serveFromR2(request, env, tenant);
	}
};

/**
 * Extract subdomain from hostname
 */
function extractSubdomain(hostname: string): string | null {
	for (const domain of PLATFORM_DOMAINS) {
		if (hostname.endsWith(domain) && hostname !== domain) {
			const parts = hostname.replace(`.${domain}`, '').split('.');
			const subdomain = parts[parts.length - 1];
			return subdomain && subdomain !== 'www' ? subdomain : null;
		}
	}
	return null;
}

/**
 * Check if hostname is platform root
 */
function isPlatformRoot(hostname: string): boolean {
	return PLATFORM_DOMAINS.includes(hostname) || PLATFORM_DOMAINS.some((d) => hostname === `www.${d}`);
}

/**
 * Lookup tenant by subdomain (cached)
 */
async function lookupTenantBySubdomain(env: Env, subdomain: string): Promise<TenantRecord | null> {
	const cacheKey = `tenant:subdomain:${subdomain}`;

	// Check cache first
	const cached = await env.CONFIG_CACHE.get(cacheKey, 'json');
	if (cached) {
		return cached as TenantRecord;
	}

	// Query D1
	const tenant = await env.DB.prepare(
		`
    SELECT id, subdomain, template_id, template_version, config, status, worker_id, custom_domain
    FROM tenants
    WHERE subdomain = ? AND status != 'suspended'
  `
	)
		.bind(subdomain)
		.first<TenantRecord>();

	if (tenant) {
		// Cache for 5 minutes
		await env.CONFIG_CACHE.put(cacheKey, JSON.stringify(tenant), {
			expirationTtl: 300
		});
	}

	return tenant;
}

/**
 * Lookup tenant by custom domain (cached)
 */
async function lookupTenantByCustomDomain(env: Env, hostname: string): Promise<TenantRecord | null> {
	const cacheKey = `tenant:domain:${hostname}`;

	// Check cache first
	const cached = await env.CONFIG_CACHE.get(cacheKey, 'json');
	if (cached) {
		return cached as TenantRecord;
	}

	// Query D1 via custom_domains join
	const tenant = await env.DB.prepare(
		`
    SELECT t.id, t.subdomain, t.template_id, t.template_version, t.config, t.status, t.worker_id, t.custom_domain
    FROM tenants t
    JOIN custom_domains cd ON cd.tenant_id = t.id
    WHERE cd.domain = ? AND cd.status = 'active' AND t.status != 'suspended'
  `
	)
		.bind(hostname)
		.first<TenantRecord>();

	if (tenant) {
		// Cache for 5 minutes
		await env.CONFIG_CACHE.put(cacheKey, JSON.stringify(tenant), {
			expirationTtl: 300
		});
	}

	return tenant;
}

/**
 * Serve site directly from R2
 *
 * Templates are stored as: {templateId}/{version}/{path}
 * Version can be:
 *   - Specific: "1.0.0", "1.2.3"
 *   - Latest: null or "latest" (resolves to most recent)
 *
 * Config is injected into HTML at runtime
 */
async function serveFromR2(request: Request, env: Env, tenant: TenantRecord): Promise<Response> {
	const url = new URL(request.url);
	let path = url.pathname;

	// Normalize path
	if (path === '/') path = '/index.html';
	if (!path.includes('.') && !path.endsWith('/')) path = `${path}/index.html`;
	if (path.endsWith('/')) path = `${path}index.html`;

	// Resolve version - use tenant's pinned version or "latest"
	const version = tenant.template_version || 'latest';

	// Try to fetch from R2: {templateId}/{version}/{path}
	const assetKey = `${tenant.template_id}/${version}${path}`;
	let asset = await env.SITE_BUCKET.get(assetKey);

	// SPA fallback - try index.html for routes
	if (!asset && !path.match(/\.(js|css|png|jpg|jpeg|webp|svg|ico|woff2?|json|txt|xml)$/i)) {
		asset = await env.SITE_BUCKET.get(`${tenant.template_id}/${version}/index.html`);
	}

	if (!asset) {
		return new Response('Not Found', { status: 404 });
	}

	const contentType = getContentType(path);

	// For HTML files, inject tenant config
	if (contentType === 'text/html') {
		const html = await asset.text();
		const config = JSON.parse(tenant.config || '{}');
		const injectedHtml = injectConfig(html, config, tenant);

		return new Response(injectedHtml, {
			headers: {
				'Content-Type': 'text/html; charset=utf-8',
				'Cache-Control': 'public, max-age=60'
			}
		});
	}

	// For immutable assets (_app/immutable/), cache forever
	const isImmutable = path.includes('/_app/immutable/');
	const cacheControl = isImmutable ? 'public, max-age=31536000, immutable' : 'public, max-age=3600';

	return new Response(asset.body, {
		headers: {
			'Content-Type': contentType,
			'Cache-Control': cacheControl,
			ETag: asset.etag
		}
	});
}

/**
 * Inject tenant config into HTML
 *
 * Security: Sanitize config to prevent XSS via JSON injection.
 * JSON.stringify escapes most characters, but we additionally
 * escape </script> sequences that could break out of the script tag.
 */
function injectConfig(html: string, config: Record<string, unknown>, tenant: TenantRecord): string {
	const siteConfig = {
		...config,
		_tenant: {
			id: tenant.id,
			subdomain: tenant.subdomain,
			templateId: tenant.template_id
		}
	};

	// Sanitize: escape </script> and <!-- sequences to prevent injection
	const sanitizedJson = JSON.stringify(siteConfig)
		.replace(/</g, '\\u003c')
		.replace(/>/g, '\\u003e')
		.replace(/&/g, '\\u0026');

	const script = `<script>window.__SITE_CONFIG__=${sanitizedJson};</script>`;
	return html.replace('</head>', `${script}</head>`);
}

/**
 * Get content type from path
 */
function getContentType(path: string): string {
	const ext = path.split('.').pop()?.toLowerCase() || '';
	const types: Record<string, string> = {
		html: 'text/html',
		css: 'text/css',
		js: 'application/javascript',
		mjs: 'application/javascript',
		json: 'application/json',
		png: 'image/png',
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		webp: 'image/webp',
		avif: 'image/avif',
		svg: 'image/svg+xml',
		ico: 'image/x-icon',
		woff2: 'font/woff2',
		woff: 'font/woff',
		ttf: 'font/ttf',
		txt: 'text/plain',
		xml: 'application/xml'
	};
	return types[ext] || 'application/octet-stream';
}

/**
 * Render 404 page
 */
function renderNotFound(): Response {
	return new Response(
		`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Site Not Found</title>
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          background: #000;
          color: #fff;
        }
        .content {
          text-align: center;
          max-width: 400px;
          padding: 2rem;
        }
        h1 {
          font-size: 1.5rem;
          font-weight: 400;
          margin-bottom: 1rem;
        }
        p {
          color: rgba(255,255,255,0.6);
          line-height: 1.6;
        }
        a {
          color: #fff;
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="content">
        <h1>Site not found</h1>
        <p>This subdomain hasn't been claimed yet.</p>
        <p><a href="https://createsomething.space">Create your site →</a></p>
      </div>
    </body>
    </html>
  `,
		{
			status: 404,
			headers: { 'Content-Type': 'text/html' }
		}
	);
}

/**
 * Render status page for non-active sites
 */
function renderStatusPage(status: string): Response {
	const messages: Record<string, { title: string; message: string }> = {
		configuring: {
			title: 'Setting up...',
			message: 'This site is being configured.'
		},
		queued: {
			title: 'In queue',
			message: 'Your site is queued for deployment.'
		},
		building: {
			title: 'Building...',
			message: 'Your site is being built. This usually takes less than a minute.'
		},
		deploying: {
			title: 'Deploying...',
			message: 'Almost there! Your site is being deployed.'
		},
		error: {
			title: 'Deployment issue',
			message: 'There was a problem deploying this site. Please try again or contact support.'
		}
	};

	const { title, message } = messages[status] || {
		title: 'Unavailable',
		message: 'This site is currently unavailable.'
	};

	return new Response(
		`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${title}</title>
      <meta http-equiv="refresh" content="5">
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          background: #000;
          color: #fff;
        }
        .content {
          text-align: center;
          max-width: 400px;
          padding: 2rem;
        }
        h1 {
          font-size: 1.5rem;
          font-weight: 400;
          margin-bottom: 1rem;
        }
        p {
          color: rgba(255,255,255,0.6);
          line-height: 1.6;
        }
        .spinner {
          width: 24px;
          height: 24px;
          border: 2px solid rgba(255,255,255,0.2);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="content">
        <div class="spinner"></div>
        <h1>${title}</h1>
        <p>${message}</p>
      </div>
    </body>
    </html>
  `,
		{
			status: 200,
			headers: {
				'Content-Type': 'text/html',
				'Cache-Control': 'no-cache'
			}
		}
	);
}

/**
 * Check if subdomain is reserved (exported for use in site creation API)
 */
export function isReservedSubdomain(subdomain: string): boolean {
	return RESERVED_SUBDOMAINS.has(subdomain.toLowerCase());
}

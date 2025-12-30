/**
 * Court Reserve Router Worker
 *
 * Routes *.courtreserve.createsomething.space to appropriate facility sites.
 * The infrastructure disappears; courts get booked.
 *
 * Subdomain pattern: thestack.courtreserve.createsomething.space
 */

interface Env {
	DB: D1Database;
	FACILITY_CACHE: KVNamespace;
	SITE_BUCKET: R2Bucket;
}

interface FacilityRecord {
	id: string;
	name: string;
	slug: string;
	timezone: string;
	status: string;
	opening_time: string;
	closing_time: string;
	slot_duration_minutes: number;
	advance_booking_days: number;
	cancellation_hours: number;
	email: string | null;
	phone: string | null;
	address: string | null;
	stripe_account_id: string | null;
	config: string;
}

// Reserved subdomains - protected from facility registration
const RESERVED_SUBDOMAINS = new Set([
	// Platform
	'www',
	'api',
	'app',
	'admin',
	'dashboard',
	'onboard',
	// Auth
	'auth',
	'login',
	'signup',
	// Infrastructure
	'assets',
	'static',
	'cdn',
	// Environments
	'dev',
	'staging',
	'test',
	'beta',
	// Support
	'help',
	'support',
	'docs',
	'status',
	// Financial
	'billing',
	'payment',
	'checkout',
	// Demo
	'demo',
	'example'
]);

const PLATFORM_DOMAIN = 'courtreserve.createsomething.space';

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const hostname = url.hostname;

		// Handle API routes - pass through to main app
		if (url.pathname.startsWith('/api/')) {
			return fetch(request);
		}

		// Extract facility slug from subdomain
		const facilitySlug = extractSubdomain(hostname);

		// Platform root - serve landing page
		if (!facilitySlug || hostname === PLATFORM_DOMAIN || hostname === `www.${PLATFORM_DOMAIN}`) {
			return fetch(request);
		}

		// Check reserved subdomains - pass through to platform
		if (RESERVED_SUBDOMAINS.has(facilitySlug.toLowerCase())) {
			return fetch(request);
		}

		// Lookup facility
		const facility = await lookupFacilityBySlug(env, facilitySlug);

		if (!facility) {
			return renderNotFound(facilitySlug);
		}

		// Check status
		if (facility.status !== 'active') {
			return renderStatusPage(facility.status, facility.name);
		}

		// Serve facility booking page with config injection
		return serveFacilityPage(request, env, facility);
	}
};

/**
 * Extract subdomain from hostname
 * e.g., "thestack.courtreserve.createsomething.space" -> "thestack"
 */
function extractSubdomain(hostname: string): string | null {
	if (hostname.endsWith(PLATFORM_DOMAIN) && hostname !== PLATFORM_DOMAIN) {
		const subdomain = hostname.replace(`.${PLATFORM_DOMAIN}`, '');
		// Handle nested subdomains - take the first part
		const parts = subdomain.split('.');
		return parts[0] || null;
	}
	return null;
}

/**
 * Lookup facility by slug (cached)
 */
async function lookupFacilityBySlug(env: Env, slug: string): Promise<FacilityRecord | null> {
	const cacheKey = `facility:slug:${slug}`;

	// Check cache first
	const cached = await env.FACILITY_CACHE.get(cacheKey, 'json');
	if (cached) {
		return cached as FacilityRecord;
	}

	// Query D1
	const facility = await env.DB.prepare(
		`
    SELECT id, name, slug, timezone, status,
           opening_time, closing_time, slot_duration_minutes,
           advance_booking_days, cancellation_hours,
           email, phone, address, stripe_account_id, config
    FROM facilities
    WHERE slug = ? AND status != 'suspended'
  `
	)
		.bind(slug)
		.first<FacilityRecord>();

	if (facility) {
		// Cache for 5 minutes
		await env.FACILITY_CACHE.put(cacheKey, JSON.stringify(facility), {
			expirationTtl: 300
		});
	}

	return facility;
}

/**
 * Serve facility booking page from R2
 */
async function serveFacilityPage(
	request: Request,
	env: Env,
	facility: FacilityRecord
): Promise<Response> {
	const url = new URL(request.url);
	let path = url.pathname;

	// All facilities use the standard booking interface
	const basePath = 'booking-widget/latest';

	let asset: R2ObjectBody | null = null;
	let resolvedPath = path;

	// Handle root path
	if (path === '/') {
		resolvedPath = '/index.html';
		asset = await env.SITE_BUCKET.get(`${basePath}/index.html`);
	}
	// Handle paths with extensions (static assets)
	else if (path.includes('.')) {
		resolvedPath = path;
		asset = await env.SITE_BUCKET.get(`${basePath}${path}`);
	}
	// Handle clean URLs - try .html first, then /index.html
	else {
		resolvedPath = `${path}.html`;
		asset = await env.SITE_BUCKET.get(`${basePath}${path}.html`);

		if (!asset) {
			resolvedPath = `${path}/index.html`;
			asset = await env.SITE_BUCKET.get(`${basePath}${path}/index.html`);
		}
	}

	// SPA fallback for client routes
	if (!asset && !path.match(/\.(js|css|png|jpg|jpeg|webp|svg|ico|woff2?|json|txt|xml)$/i)) {
		asset = await env.SITE_BUCKET.get(`${basePath}/200.html`);
		if (!asset) {
			asset = await env.SITE_BUCKET.get(`${basePath}/index.html`);
		}
		resolvedPath = '/200.html';
	}

	if (!asset) {
		return new Response('Asset Not Found', { status: 404 });
	}

	const contentType = getContentType(resolvedPath);

	// For HTML files, inject facility config
	if (contentType === 'text/html') {
		const html = await asset.text();
		const injectedHtml = injectFacilityConfig(html, facility);

		return new Response(injectedHtml, {
			headers: {
				'Content-Type': 'text/html; charset=utf-8',
				'Cache-Control': 'public, max-age=60'
			}
		});
	}

	// For immutable assets, cache forever
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
 * Inject facility config into HTML
 */
function injectFacilityConfig(html: string, facility: FacilityRecord): string {
	const config = JSON.parse(facility.config || '{}');

	const facilityConfig = {
		...config,
		_facility: {
			id: facility.id,
			name: facility.name,
			slug: facility.slug,
			timezone: facility.timezone,
			openingTime: facility.opening_time,
			closingTime: facility.closing_time,
			slotDurationMinutes: facility.slot_duration_minutes,
			advanceBookingDays: facility.advance_booking_days,
			cancellationHours: facility.cancellation_hours,
			email: facility.email,
			phone: facility.phone,
			address: facility.address,
			hasPayments: !!facility.stripe_account_id
		}
	};

	// Sanitize JSON to prevent XSS
	const sanitizedJson = JSON.stringify(facilityConfig)
		.replace(/</g, '\\u003c')
		.replace(/>/g, '\\u003e')
		.replace(/&/g, '\\u0026');

	const script = `<script>window.__COURT_RESERVE__=${sanitizedJson};</script>`;
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
function renderNotFound(slug: string): Response {
	return new Response(
		`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Facility Not Found | Court Reserve</title>
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
        .logo {
          width: 48px;
          height: 48px;
          margin: 0 auto 1.5rem;
        }
        .logo svg {
          width: 100%;
          height: 100%;
        }
        h1 {
          font-size: 1.5rem;
          font-weight: 500;
          margin: 0 0 0.5rem;
        }
        .slug {
          font-family: monospace;
          color: #10b981;
        }
        p {
          color: rgba(255,255,255,0.6);
          line-height: 1.6;
          margin: 0.5rem 0;
        }
        a {
          color: #10b981;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="content">
        <div class="logo">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="6" fill="#000" stroke="#10b981" stroke-width="1"/>
            <circle cx="16" cy="16" r="8" stroke="#10b981" stroke-width="2"/>
            <path d="M16 10 L16 22 M10 16 L22 16" stroke="#10b981" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <h1>Facility not found</h1>
        <p>No facility exists at <span class="slug">${slug}</span></p>
        <p><a href="https://courtreserve.createsomething.space">Get started with Court Reserve</a></p>
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
 * Render status page for non-active facilities
 */
function renderStatusPage(status: string, facilityName: string): Response {
	const messages: Record<string, { title: string; message: string }> = {
		configuring: {
			title: 'Setting up...',
			message: `${facilityName} is being configured. Check back soon!`
		},
		building: {
			title: 'Building...',
			message: 'Your booking page is being prepared.'
		},
		error: {
			title: 'Temporarily unavailable',
			message: 'This booking system is experiencing issues. Please try again later.'
		}
	};

	const { title, message } = messages[status] || {
		title: 'Unavailable',
		message: 'This facility is currently unavailable.'
	};

	return new Response(
		`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${title} | Court Reserve</title>
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
          border-top-color: #10b981;
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
 * Check if subdomain is reserved (exported for use in facility creation API)
 */
export function isReservedSubdomain(subdomain: string): boolean {
	return RESERVED_SUBDOMAINS.has(subdomain.toLowerCase());
}

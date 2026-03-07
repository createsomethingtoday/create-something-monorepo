
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/about" | "/account" | "/admin" | "/admin/community" | "/admin/funnel" | "/admin/funnel/leads" | "/admin/funnel/leads/new" | "/admin/funnel/record" | "/admin/security" | "/admin/security/audit" | "/admin/security/bearer-tokens" | "/admin/security/commercial" | "/admin/security/contracts" | "/admin/security/partners" | "/admin/social" | "/api" | "/api/abundance" | "/api/abundance/convert" | "/api/abundance/match" | "/api/abundance/match/[id]" | "/api/abundance/seekers" | "/api/abundance/seekers/[id]" | "/api/abundance/talent" | "/api/abundance/talent/[id]" | "/api/abundance/whatsapp" | "/api/admin" | "/api/admin/contracts" | "/api/admin/mcp-entitlements" | "/api/agent-kit" | "/api/agent-kit/validate" | "/api/analytics" | "/api/analytics/events" | "/api/analytics/track" | "/api/auth" | "/api/auth/cross-domain" | "/api/auth/login" | "/api/auth/logout" | "/api/auth/magic-login" | "/api/auth/signup" | "/api/booking" | "/api/booking/create" | "/api/booking/slots" | "/api/community" | "/api/community/draft" | "/api/community/monitors" | "/api/community/queue" | "/api/community/relationships" | "/api/community/review" | "/api/community/signals" | "/api/contact" | "/api/content" | "/api/content/ideas" | "/api/content/rhythm" | "/api/funnel" | "/api/funnel/leads" | "/api/funnel/leads/[id]" | "/api/internal" | "/api/internal/mcp-entitlements" | "/api/internal/mcp-entitlements/check" | "/api/manifest" | "/api/me" | "/api/me/mcp-token" | "/api/me/mcp-token/regenerate" | "/api/me/mcp-token/revoke" | "/api/newsletter" | "/api/partners" | "/api/partners/half-dozen" | "/api/partners/half-dozen/clients" | "/api/partners/half-dozen/clients/[slug]" | "/api/partners/half-dozen/clients/[slug]/access" | "/api/partners/half-dozen/clients/[slug]/access/mint" | "/api/partners/half-dozen/clients/[slug]/bearer-token" | "/api/partners/half-dozen/clients/[slug]/bearer-token/issue" | "/api/partners/half-dozen/clients/[slug]/init" | "/api/partners/half-dozen/clients/[slug]/legacy-key" | "/api/partners/half-dozen/clients/[slug]/legacy-key/issue" | "/api/partners/half-dozen/clients/[slug]/notion" | "/api/partners/half-dozen/clients/[slug]/notion/accounts" | "/api/partners/half-dozen/clients/[slug]/notion/accounts/[accountSlug]" | "/api/partners/half-dozen/clients/[slug]/notion/accounts/[accountSlug]/connect-link" | "/api/partners/half-dozen/clients/[slug]/notion/accounts/[accountSlug]/disable" | "/api/partners/half-dozen/clients/[slug]/notion/accounts/[accountSlug]/pin" | "/api/partners/half-dozen/clients/[slug]/toolkits" | "/api/partners/half-dozen/clients/[slug]/toolkits/status" | "/api/partners/half-dozen/clients/[slug]/toolkits/[toolkit]" | "/api/partners/half-dozen/clients/[slug]/toolkits/[toolkit]/accounts" | "/api/partners/half-dozen/clients/[slug]/toolkits/[toolkit]/accounts/[accountSlug]" | "/api/partners/half-dozen/clients/[slug]/toolkits/[toolkit]/accounts/[accountSlug]/connect-link" | "/api/partners/half-dozen/clients/[slug]/toolkits/[toolkit]/accounts/[accountSlug]/disable" | "/api/partners/half-dozen/clients/[slug]/toolkits/[toolkit]/accounts/[accountSlug]/pin" | "/api/partners/half-dozen/clients/[slug]/toolkits/[toolkit]/connect-link" | "/api/products" | "/api/products/[productId]" | "/api/products/[productId]/download" | "/api/social" | "/api/social/cancel" | "/api/social/gaps" | "/api/social/intelligence" | "/api/social/rhythm" | "/api/social/schedule" | "/api/social/status" | "/api/social/suggest" | "/api/stripe" | "/api/stripe/checkout" | "/api/stripe/webhook" | "/api/terminal" | "/api/user" | "/api/user/analytics" | "/auth" | "/auth/callback" | "/auth/cross-domain" | "/bearer-token-policy" | "/book" | "/contact" | "/dashboard" | "/experiments" | "/experiments/[slug]" | "/login" | "/mcp-access" | "/methodology" | "/privacy" | "/products" | "/products/ground" | "/products/loom" | "/security" | "/services" | "/terms" | "/use-cases" | "/use-cases/business" | "/use-cases/enterprise";
		RouteParams(): {
			"/api/abundance/match/[id]": { id: string };
			"/api/abundance/seekers/[id]": { id: string };
			"/api/abundance/talent/[id]": { id: string };
			"/api/funnel/leads/[id]": { id: string };
			"/api/partners/half-dozen/clients/[slug]": { slug: string };
			"/api/partners/half-dozen/clients/[slug]/access": { slug: string };
			"/api/partners/half-dozen/clients/[slug]/access/mint": { slug: string };
			"/api/partners/half-dozen/clients/[slug]/bearer-token": { slug: string };
			"/api/partners/half-dozen/clients/[slug]/bearer-token/issue": { slug: string };
			"/api/partners/half-dozen/clients/[slug]/init": { slug: string };
			"/api/partners/half-dozen/clients/[slug]/legacy-key": { slug: string };
			"/api/partners/half-dozen/clients/[slug]/legacy-key/issue": { slug: string };
			"/api/partners/half-dozen/clients/[slug]/notion": { slug: string };
			"/api/partners/half-dozen/clients/[slug]/notion/accounts": { slug: string };
			"/api/partners/half-dozen/clients/[slug]/notion/accounts/[accountSlug]": { slug: string; accountSlug: string };
			"/api/partners/half-dozen/clients/[slug]/notion/accounts/[accountSlug]/connect-link": { slug: string; accountSlug: string };
			"/api/partners/half-dozen/clients/[slug]/notion/accounts/[accountSlug]/disable": { slug: string; accountSlug: string };
			"/api/partners/half-dozen/clients/[slug]/notion/accounts/[accountSlug]/pin": { slug: string; accountSlug: string };
			"/api/partners/half-dozen/clients/[slug]/toolkits": { slug: string };
			"/api/partners/half-dozen/clients/[slug]/toolkits/status": { slug: string };
			"/api/partners/half-dozen/clients/[slug]/toolkits/[toolkit]": { slug: string; toolkit: string };
			"/api/partners/half-dozen/clients/[slug]/toolkits/[toolkit]/accounts": { slug: string; toolkit: string };
			"/api/partners/half-dozen/clients/[slug]/toolkits/[toolkit]/accounts/[accountSlug]": { slug: string; toolkit: string; accountSlug: string };
			"/api/partners/half-dozen/clients/[slug]/toolkits/[toolkit]/accounts/[accountSlug]/connect-link": { slug: string; toolkit: string; accountSlug: string };
			"/api/partners/half-dozen/clients/[slug]/toolkits/[toolkit]/accounts/[accountSlug]/disable": { slug: string; toolkit: string; accountSlug: string };
			"/api/partners/half-dozen/clients/[slug]/toolkits/[toolkit]/accounts/[accountSlug]/pin": { slug: string; toolkit: string; accountSlug: string };
			"/api/partners/half-dozen/clients/[slug]/toolkits/[toolkit]/connect-link": { slug: string; toolkit: string };
			"/api/products/[productId]": { productId: string };
			"/api/products/[productId]/download": { productId: string };
			"/experiments/[slug]": { slug: string }
		};
		LayoutParams(): {
			"/": { id?: string; slug?: string; accountSlug?: string; toolkit?: string; productId?: string };
			"/about": Record<string, never>;
			"/account": Record<string, never>;
			"/admin": Record<string, never>;
			"/admin/community": Record<string, never>;
			"/admin/funnel": Record<string, never>;
			"/admin/funnel/leads": Record<string, never>;
			"/admin/funnel/leads/new": Record<string, never>;
			"/admin/funnel/record": Record<string, never>;
			"/admin/security": Record<string, never>;
			"/admin/security/audit": Record<string, never>;
			"/admin/security/bearer-tokens": Record<string, never>;
			"/admin/security/commercial": Record<string, never>;
			"/admin/security/contracts": Record<string, never>;
			"/admin/security/partners": Record<string, never>;
			"/admin/social": Record<string, never>;
			"/api": { id?: string; slug?: string; accountSlug?: string; toolkit?: string; productId?: string };
			"/api/abundance": { id?: string };
			"/api/abundance/convert": Record<string, never>;
			"/api/abundance/match": { id?: string };
			"/api/abundance/match/[id]": { id: string };
			"/api/abundance/seekers": { id?: string };
			"/api/abundance/seekers/[id]": { id: string };
			"/api/abundance/talent": { id?: string };
			"/api/abundance/talent/[id]": { id: string };
			"/api/abundance/whatsapp": Record<string, never>;
			"/api/admin": Record<string, never>;
			"/api/admin/contracts": Record<string, never>;
			"/api/admin/mcp-entitlements": Record<string, never>;
			"/api/agent-kit": Record<string, never>;
			"/api/agent-kit/validate": Record<string, never>;
			"/api/analytics": Record<string, never>;
			"/api/analytics/events": Record<string, never>;
			"/api/analytics/track": Record<string, never>;
			"/api/auth": Record<string, never>;
			"/api/auth/cross-domain": Record<string, never>;
			"/api/auth/login": Record<string, never>;
			"/api/auth/logout": Record<string, never>;
			"/api/auth/magic-login": Record<string, never>;
			"/api/auth/signup": Record<string, never>;
			"/api/booking": Record<string, never>;
			"/api/booking/create": Record<string, never>;
			"/api/booking/slots": Record<string, never>;
			"/api/community": Record<string, never>;
			"/api/community/draft": Record<string, never>;
			"/api/community/monitors": Record<string, never>;
			"/api/community/queue": Record<string, never>;
			"/api/community/relationships": Record<string, never>;
			"/api/community/review": Record<string, never>;
			"/api/community/signals": Record<string, never>;
			"/api/contact": Record<string, never>;
			"/api/content": Record<string, never>;
			"/api/content/ideas": Record<string, never>;
			"/api/content/rhythm": Record<string, never>;
			"/api/funnel": { id?: string };
			"/api/funnel/leads": { id?: string };
			"/api/funnel/leads/[id]": { id: string };
			"/api/internal": Record<string, never>;
			"/api/internal/mcp-entitlements": Record<string, never>;
			"/api/internal/mcp-entitlements/check": Record<string, never>;
			"/api/manifest": Record<string, never>;
			"/api/me": Record<string, never>;
			"/api/me/mcp-token": Record<string, never>;
			"/api/me/mcp-token/regenerate": Record<string, never>;
			"/api/me/mcp-token/revoke": Record<string, never>;
			"/api/newsletter": Record<string, never>;
			"/api/partners": { slug?: string; accountSlug?: string; toolkit?: string };
			"/api/partners/half-dozen": { slug?: string; accountSlug?: string; toolkit?: string };
			"/api/partners/half-dozen/clients": { slug?: string; accountSlug?: string; toolkit?: string };
			"/api/partners/half-dozen/clients/[slug]": { slug: string; accountSlug?: string; toolkit?: string };
			"/api/partners/half-dozen/clients/[slug]/access": { slug: string };
			"/api/partners/half-dozen/clients/[slug]/access/mint": { slug: string };
			"/api/partners/half-dozen/clients/[slug]/bearer-token": { slug: string };
			"/api/partners/half-dozen/clients/[slug]/bearer-token/issue": { slug: string };
			"/api/partners/half-dozen/clients/[slug]/init": { slug: string };
			"/api/partners/half-dozen/clients/[slug]/legacy-key": { slug: string };
			"/api/partners/half-dozen/clients/[slug]/legacy-key/issue": { slug: string };
			"/api/partners/half-dozen/clients/[slug]/notion": { slug: string; accountSlug?: string };
			"/api/partners/half-dozen/clients/[slug]/notion/accounts": { slug: string; accountSlug?: string };
			"/api/partners/half-dozen/clients/[slug]/notion/accounts/[accountSlug]": { slug: string; accountSlug: string };
			"/api/partners/half-dozen/clients/[slug]/notion/accounts/[accountSlug]/connect-link": { slug: string; accountSlug: string };
			"/api/partners/half-dozen/clients/[slug]/notion/accounts/[accountSlug]/disable": { slug: string; accountSlug: string };
			"/api/partners/half-dozen/clients/[slug]/notion/accounts/[accountSlug]/pin": { slug: string; accountSlug: string };
			"/api/partners/half-dozen/clients/[slug]/toolkits": { slug: string; toolkit?: string; accountSlug?: string };
			"/api/partners/half-dozen/clients/[slug]/toolkits/status": { slug: string };
			"/api/partners/half-dozen/clients/[slug]/toolkits/[toolkit]": { slug: string; toolkit: string; accountSlug?: string };
			"/api/partners/half-dozen/clients/[slug]/toolkits/[toolkit]/accounts": { slug: string; toolkit: string; accountSlug?: string };
			"/api/partners/half-dozen/clients/[slug]/toolkits/[toolkit]/accounts/[accountSlug]": { slug: string; toolkit: string; accountSlug: string };
			"/api/partners/half-dozen/clients/[slug]/toolkits/[toolkit]/accounts/[accountSlug]/connect-link": { slug: string; toolkit: string; accountSlug: string };
			"/api/partners/half-dozen/clients/[slug]/toolkits/[toolkit]/accounts/[accountSlug]/disable": { slug: string; toolkit: string; accountSlug: string };
			"/api/partners/half-dozen/clients/[slug]/toolkits/[toolkit]/accounts/[accountSlug]/pin": { slug: string; toolkit: string; accountSlug: string };
			"/api/partners/half-dozen/clients/[slug]/toolkits/[toolkit]/connect-link": { slug: string; toolkit: string };
			"/api/products": { productId?: string };
			"/api/products/[productId]": { productId: string };
			"/api/products/[productId]/download": { productId: string };
			"/api/social": Record<string, never>;
			"/api/social/cancel": Record<string, never>;
			"/api/social/gaps": Record<string, never>;
			"/api/social/intelligence": Record<string, never>;
			"/api/social/rhythm": Record<string, never>;
			"/api/social/schedule": Record<string, never>;
			"/api/social/status": Record<string, never>;
			"/api/social/suggest": Record<string, never>;
			"/api/stripe": Record<string, never>;
			"/api/stripe/checkout": Record<string, never>;
			"/api/stripe/webhook": Record<string, never>;
			"/api/terminal": Record<string, never>;
			"/api/user": Record<string, never>;
			"/api/user/analytics": Record<string, never>;
			"/auth": Record<string, never>;
			"/auth/callback": Record<string, never>;
			"/auth/cross-domain": Record<string, never>;
			"/bearer-token-policy": Record<string, never>;
			"/book": Record<string, never>;
			"/contact": Record<string, never>;
			"/dashboard": Record<string, never>;
			"/experiments": { slug?: string };
			"/experiments/[slug]": { slug: string };
			"/login": Record<string, never>;
			"/mcp-access": Record<string, never>;
			"/methodology": Record<string, never>;
			"/privacy": Record<string, never>;
			"/products": Record<string, never>;
			"/products/ground": Record<string, never>;
			"/products/loom": Record<string, never>;
			"/security": Record<string, never>;
			"/services": Record<string, never>;
			"/terms": Record<string, never>;
			"/use-cases": Record<string, never>;
			"/use-cases/business": Record<string, never>;
			"/use-cases/enterprise": Record<string, never>
		};
		Pathname(): "/" | "/about" | "/about/" | "/account" | "/account/" | "/admin" | "/admin/" | "/admin/community" | "/admin/community/" | "/admin/funnel" | "/admin/funnel/" | "/admin/funnel/leads" | "/admin/funnel/leads/" | "/admin/funnel/leads/new" | "/admin/funnel/leads/new/" | "/admin/funnel/record" | "/admin/funnel/record/" | "/admin/security" | "/admin/security/" | "/admin/security/audit" | "/admin/security/audit/" | "/admin/security/bearer-tokens" | "/admin/security/bearer-tokens/" | "/admin/security/commercial" | "/admin/security/commercial/" | "/admin/security/contracts" | "/admin/security/contracts/" | "/admin/security/partners" | "/admin/security/partners/" | "/admin/social" | "/admin/social/" | "/api" | "/api/" | "/api/abundance" | "/api/abundance/" | "/api/abundance/convert" | "/api/abundance/convert/" | "/api/abundance/match" | "/api/abundance/match/" | `/api/abundance/match/${string}` & {} | `/api/abundance/match/${string}/` & {} | "/api/abundance/seekers" | "/api/abundance/seekers/" | `/api/abundance/seekers/${string}` & {} | `/api/abundance/seekers/${string}/` & {} | "/api/abundance/talent" | "/api/abundance/talent/" | `/api/abundance/talent/${string}` & {} | `/api/abundance/talent/${string}/` & {} | "/api/abundance/whatsapp" | "/api/abundance/whatsapp/" | "/api/admin" | "/api/admin/" | "/api/admin/contracts" | "/api/admin/contracts/" | "/api/admin/mcp-entitlements" | "/api/admin/mcp-entitlements/" | "/api/agent-kit" | "/api/agent-kit/" | "/api/agent-kit/validate" | "/api/agent-kit/validate/" | "/api/analytics" | "/api/analytics/" | "/api/analytics/events" | "/api/analytics/events/" | "/api/analytics/track" | "/api/analytics/track/" | "/api/auth" | "/api/auth/" | "/api/auth/cross-domain" | "/api/auth/cross-domain/" | "/api/auth/login" | "/api/auth/login/" | "/api/auth/logout" | "/api/auth/logout/" | "/api/auth/magic-login" | "/api/auth/magic-login/" | "/api/auth/signup" | "/api/auth/signup/" | "/api/booking" | "/api/booking/" | "/api/booking/create" | "/api/booking/create/" | "/api/booking/slots" | "/api/booking/slots/" | "/api/community" | "/api/community/" | "/api/community/draft" | "/api/community/draft/" | "/api/community/monitors" | "/api/community/monitors/" | "/api/community/queue" | "/api/community/queue/" | "/api/community/relationships" | "/api/community/relationships/" | "/api/community/review" | "/api/community/review/" | "/api/community/signals" | "/api/community/signals/" | "/api/contact" | "/api/contact/" | "/api/content" | "/api/content/" | "/api/content/ideas" | "/api/content/ideas/" | "/api/content/rhythm" | "/api/content/rhythm/" | "/api/funnel" | "/api/funnel/" | "/api/funnel/leads" | "/api/funnel/leads/" | `/api/funnel/leads/${string}` & {} | `/api/funnel/leads/${string}/` & {} | "/api/internal" | "/api/internal/" | "/api/internal/mcp-entitlements" | "/api/internal/mcp-entitlements/" | "/api/internal/mcp-entitlements/check" | "/api/internal/mcp-entitlements/check/" | "/api/manifest" | "/api/manifest/" | "/api/me" | "/api/me/" | "/api/me/mcp-token" | "/api/me/mcp-token/" | "/api/me/mcp-token/regenerate" | "/api/me/mcp-token/regenerate/" | "/api/me/mcp-token/revoke" | "/api/me/mcp-token/revoke/" | "/api/newsletter" | "/api/newsletter/" | "/api/partners" | "/api/partners/" | "/api/partners/half-dozen" | "/api/partners/half-dozen/" | "/api/partners/half-dozen/clients" | "/api/partners/half-dozen/clients/" | `/api/partners/half-dozen/clients/${string}` & {} | `/api/partners/half-dozen/clients/${string}/` & {} | `/api/partners/half-dozen/clients/${string}/access` & {} | `/api/partners/half-dozen/clients/${string}/access/` & {} | `/api/partners/half-dozen/clients/${string}/access/mint` & {} | `/api/partners/half-dozen/clients/${string}/access/mint/` & {} | `/api/partners/half-dozen/clients/${string}/bearer-token` & {} | `/api/partners/half-dozen/clients/${string}/bearer-token/` & {} | `/api/partners/half-dozen/clients/${string}/bearer-token/issue` & {} | `/api/partners/half-dozen/clients/${string}/bearer-token/issue/` & {} | `/api/partners/half-dozen/clients/${string}/init` & {} | `/api/partners/half-dozen/clients/${string}/init/` & {} | `/api/partners/half-dozen/clients/${string}/legacy-key` & {} | `/api/partners/half-dozen/clients/${string}/legacy-key/` & {} | `/api/partners/half-dozen/clients/${string}/legacy-key/issue` & {} | `/api/partners/half-dozen/clients/${string}/legacy-key/issue/` & {} | `/api/partners/half-dozen/clients/${string}/notion` & {} | `/api/partners/half-dozen/clients/${string}/notion/` & {} | `/api/partners/half-dozen/clients/${string}/notion/accounts` & {} | `/api/partners/half-dozen/clients/${string}/notion/accounts/` & {} | `/api/partners/half-dozen/clients/${string}/notion/accounts/${string}` & {} | `/api/partners/half-dozen/clients/${string}/notion/accounts/${string}/` & {} | `/api/partners/half-dozen/clients/${string}/notion/accounts/${string}/connect-link` & {} | `/api/partners/half-dozen/clients/${string}/notion/accounts/${string}/connect-link/` & {} | `/api/partners/half-dozen/clients/${string}/notion/accounts/${string}/disable` & {} | `/api/partners/half-dozen/clients/${string}/notion/accounts/${string}/disable/` & {} | `/api/partners/half-dozen/clients/${string}/notion/accounts/${string}/pin` & {} | `/api/partners/half-dozen/clients/${string}/notion/accounts/${string}/pin/` & {} | `/api/partners/half-dozen/clients/${string}/toolkits` & {} | `/api/partners/half-dozen/clients/${string}/toolkits/` & {} | `/api/partners/half-dozen/clients/${string}/toolkits/status` & {} | `/api/partners/half-dozen/clients/${string}/toolkits/status/` & {} | `/api/partners/half-dozen/clients/${string}/toolkits/${string}` & {} | `/api/partners/half-dozen/clients/${string}/toolkits/${string}/` & {} | `/api/partners/half-dozen/clients/${string}/toolkits/${string}/accounts` & {} | `/api/partners/half-dozen/clients/${string}/toolkits/${string}/accounts/` & {} | `/api/partners/half-dozen/clients/${string}/toolkits/${string}/accounts/${string}` & {} | `/api/partners/half-dozen/clients/${string}/toolkits/${string}/accounts/${string}/` & {} | `/api/partners/half-dozen/clients/${string}/toolkits/${string}/accounts/${string}/connect-link` & {} | `/api/partners/half-dozen/clients/${string}/toolkits/${string}/accounts/${string}/connect-link/` & {} | `/api/partners/half-dozen/clients/${string}/toolkits/${string}/accounts/${string}/disable` & {} | `/api/partners/half-dozen/clients/${string}/toolkits/${string}/accounts/${string}/disable/` & {} | `/api/partners/half-dozen/clients/${string}/toolkits/${string}/accounts/${string}/pin` & {} | `/api/partners/half-dozen/clients/${string}/toolkits/${string}/accounts/${string}/pin/` & {} | `/api/partners/half-dozen/clients/${string}/toolkits/${string}/connect-link` & {} | `/api/partners/half-dozen/clients/${string}/toolkits/${string}/connect-link/` & {} | "/api/products" | "/api/products/" | `/api/products/${string}` & {} | `/api/products/${string}/` & {} | `/api/products/${string}/download` & {} | `/api/products/${string}/download/` & {} | "/api/social" | "/api/social/" | "/api/social/cancel" | "/api/social/cancel/" | "/api/social/gaps" | "/api/social/gaps/" | "/api/social/intelligence" | "/api/social/intelligence/" | "/api/social/rhythm" | "/api/social/rhythm/" | "/api/social/schedule" | "/api/social/schedule/" | "/api/social/status" | "/api/social/status/" | "/api/social/suggest" | "/api/social/suggest/" | "/api/stripe" | "/api/stripe/" | "/api/stripe/checkout" | "/api/stripe/checkout/" | "/api/stripe/webhook" | "/api/stripe/webhook/" | "/api/terminal" | "/api/terminal/" | "/api/user" | "/api/user/" | "/api/user/analytics" | "/api/user/analytics/" | "/auth" | "/auth/" | "/auth/callback" | "/auth/callback/" | "/auth/cross-domain" | "/auth/cross-domain/" | "/bearer-token-policy" | "/bearer-token-policy/" | "/book" | "/book/" | "/contact" | "/contact/" | "/dashboard" | "/dashboard/" | "/experiments" | "/experiments/" | `/experiments/${string}` & {} | `/experiments/${string}/` & {} | "/login" | "/login/" | "/mcp-access" | "/mcp-access/" | "/methodology" | "/methodology/" | "/privacy" | "/privacy/" | "/products" | "/products/" | "/products/ground" | "/products/ground/" | "/products/loom" | "/products/loom/" | "/security" | "/security/" | "/services" | "/services/" | "/terms" | "/terms/" | "/use-cases" | "/use-cases/" | "/use-cases/business" | "/use-cases/business/" | "/use-cases/enterprise" | "/use-cases/enterprise/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/Micah_Johnson_Cover_Letter_Akkio.pdf" | "/Micah_Johnson_Cover_Letter_Braintrust.pdf" | "/Micah_Johnson_Cover_Letter_Centaur.pdf" | "/Micah_Johnson_Cover_Letter_HNB_API_Governance_Lead.pdf" | "/Micah_Johnson_Cover_Letter_Hightouch.pdf" | "/Micah_Johnson_Cover_Letter_Nava.pdf" | "/Micah_Johnson_Cover_Letter_OfficeHours.pdf" | "/Micah_Johnson_Cover_Letter_OpenAI.pdf" | "/Micah_Johnson_Cover_Letter_Optura.pdf" | "/Micah_Johnson_Cover_Letter_PandaDoc.pdf" | "/Micah_Johnson_Cover_Letter_Reveal.pdf" | "/Micah_Johnson_Cover_Letter_Sirona.pdf" | "/Micah_Johnson_Cover_Letter_SpruceID.pdf" | "/Micah_Johnson_Cover_Letter_Tomo.pdf" | "/Micah_Johnson_Cover_Letter_Webflow_SA.pdf" | "/Micah_Johnson_Cover_Letter_Wiz.pdf" | "/Micah_Johnson_IncludedHealth.pdf" | "/Micah_Johnson_Mainstay.pdf" | "/Micah_Johnson_MorningBrew.pdf" | "/Micah_Johnson_Resume.pdf" | "/Micah_Johnson_Resume_Braintrust.pdf" | "/Micah_Johnson_Resume_CV_Wiz.pdf" | "/Micah_Johnson_Resume_Centaur.pdf" | "/Micah_Johnson_Resume_HNB_API_Governance_Lead.pdf" | "/Micah_Johnson_Resume_Hightouch.pdf" | "/Micah_Johnson_Resume_Nava.pdf" | "/Micah_Johnson_Resume_OfficeHours.pdf" | "/Micah_Johnson_Resume_OpenAI.pdf" | "/Micah_Johnson_Resume_Optura.pdf" | "/Micah_Johnson_Resume_PandaDoc.pdf" | "/Micah_Johnson_Resume_Reveal.pdf" | "/Micah_Johnson_Resume_Sirona.pdf" | "/Micah_Johnson_Resume_SpruceID.pdf" | "/Micah_Johnson_Resume_Tomo.pdf" | "/Micah_Johnson_Resume_Webflow_SA.pdf" | "/Micah_Johnson_Resume_Wiz.pdf" | "/Micah_Johnson_Rockwell.pdf" | "/Micah_Johnson_SkySafe.pdf" | "/Micah_Johnson_Soris.pdf" | "/Micah_Johnson_SpruceID.pdf" | "/akkio-interview-prep.md" | "/cover-letter-akkio.html" | "/cover-letter-braintrust.html" | "/cover-letter-centaur.html" | "/cover-letter-hightouch.html" | "/cover-letter-hnb-api-governance-lead.html" | "/cover-letter-nava.html" | "/cover-letter-officehours.html" | "/cover-letter-openai.html" | "/cover-letter-optura.html" | "/cover-letter-pandadoc.html" | "/cover-letter-reveal.html" | "/cover-letter-sirona.html" | "/cover-letter-spruceid.html" | "/cover-letter-tomo.html" | "/cover-letter-webflow-sa.html" | "/cover-letter-wiz.html" | "/favicon.ico" | "/favicon.png" | "/favicon.svg" | "/includedhealth-combined.html" | "/job-applications/README.md" | "/job-applications/_shared/resume.pdf" | "/job-applications/akkio/cover-letter.html" | "/job-applications/akkio/cover-letter.pdf" | "/job-applications/akkio/interview-prep.md" | "/job-applications/akkio/resume.html" | "/job-applications/braintrust/cover-letter.html" | "/job-applications/braintrust/cover-letter.pdf" | "/job-applications/braintrust/resume.html" | "/job-applications/braintrust/resume.pdf" | "/job-applications/centaur/cover-letter.html" | "/job-applications/centaur/cover-letter.pdf" | "/job-applications/centaur/resume.html" | "/job-applications/centaur/resume.pdf" | "/job-applications/hightouch/cover-letter.html" | "/job-applications/hightouch/cover-letter.pdf" | "/job-applications/hightouch/resume.html" | "/job-applications/hightouch/resume.pdf" | "/job-applications/hnb-api-governance-lead/cover-letter.html" | "/job-applications/hnb-api-governance-lead/cover-letter.pdf" | "/job-applications/hnb-api-governance-lead/resume.html" | "/job-applications/hnb-api-governance-lead/resume.pdf" | "/job-applications/includedhealth/application.pdf" | "/job-applications/includedhealth/combined.html" | "/job-applications/mainstay/application.pdf" | "/job-applications/mainstay/combined.html" | "/job-applications/morningbrew/application.pdf" | "/job-applications/morningbrew/combined.html" | "/job-applications/nava/cover-letter.html" | "/job-applications/nava/cover-letter.pdf" | "/job-applications/nava/resume.html" | "/job-applications/nava/resume.pdf" | "/job-applications/officehours/cover-letter.html" | "/job-applications/officehours/cover-letter.pdf" | "/job-applications/officehours/resume.html" | "/job-applications/officehours/resume.pdf" | "/job-applications/openai/cover-letter.html" | "/job-applications/openai/cover-letter.pdf" | "/job-applications/openai/resume.html" | "/job-applications/openai/resume.pdf" | "/job-applications/optura/cover-letter.html" | "/job-applications/optura/cover-letter.pdf" | "/job-applications/optura/resume.html" | "/job-applications/optura/resume.pdf" | "/job-applications/pandadoc/cover-letter.html" | "/job-applications/pandadoc/cover-letter.pdf" | "/job-applications/pandadoc/resume.html" | "/job-applications/pandadoc/resume.pdf" | "/job-applications/reveal/cover-letter.html" | "/job-applications/reveal/cover-letter.pdf" | "/job-applications/reveal/resume.html" | "/job-applications/reveal/resume.pdf" | "/job-applications/rockwell/application.pdf" | "/job-applications/sirona/cover-letter.html" | "/job-applications/sirona/cover-letter.pdf" | "/job-applications/sirona/resume.html" | "/job-applications/sirona/resume.pdf" | "/job-applications/skysafe/application.pdf" | "/job-applications/soris/application.pdf" | "/job-applications/soris/combined.html" | "/job-applications/spruceid/application.pdf" | "/job-applications/spruceid/combined.html" | "/job-applications/spruceid/cover-letter.html" | "/job-applications/spruceid/cover-letter.pdf" | "/job-applications/spruceid/resume.html" | "/job-applications/spruceid/resume.pdf" | "/job-applications/techforce/resume.html" | "/job-applications/techforce/resume.pdf" | "/job-applications/tomo/cover-letter.html" | "/job-applications/tomo/cover-letter.pdf" | "/job-applications/tomo/resume.html" | "/job-applications/tomo/resume.pdf" | "/job-applications/webflow-sa/cover-letter.html" | "/job-applications/webflow-sa/cover-letter.pdf" | "/job-applications/webflow-sa/resume.html" | "/job-applications/webflow-sa/resume.pdf" | "/job-applications/wiz/combined-resume-cover.html" | "/job-applications/wiz/cover-letter.html" | "/job-applications/wiz/cover-letter.pdf" | "/job-applications/wiz/resume-cv.pdf" | "/job-applications/wiz/resume.html" | "/job-applications/wiz/resume.pdf" | "/mainstay-combined.html" | "/manifest.json" | "/morningbrew-combined.html" | "/og-image.svg" | "/openapi-abundance.yaml" | "/resume-akkio.html" | "/resume-braintrust.html" | "/resume-centaur.html" | "/resume-cv-wiz-combined.html" | "/resume-hightouch.html" | "/resume-hnb-api-governance-lead.html" | "/resume-nava.html" | "/resume-officehours.html" | "/resume-openai.html" | "/resume-optura.html" | "/resume-pandadoc.html" | "/resume-reveal.html" | "/resume-sirona.html" | "/resume-spruceid.html" | "/resume-tomo.html" | "/resume-webflow-sa.html" | "/resume-wiz.html" | "/robots.txt" | "/sitemap.xml" | "/soris-combined.html" | "/spruceid-combined.html" | string & {};
	}
}
export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["Micah_Johnson_Cover_Letter_Akkio.pdf","Micah_Johnson_Cover_Letter_Braintrust.pdf","Micah_Johnson_Cover_Letter_Centaur.pdf","Micah_Johnson_Cover_Letter_HNB_API_Governance_Lead.pdf","Micah_Johnson_Cover_Letter_Hightouch.pdf","Micah_Johnson_Cover_Letter_Nava.pdf","Micah_Johnson_Cover_Letter_OfficeHours.pdf","Micah_Johnson_Cover_Letter_OpenAI.pdf","Micah_Johnson_Cover_Letter_Optura.pdf","Micah_Johnson_Cover_Letter_PandaDoc.pdf","Micah_Johnson_Cover_Letter_Reveal.pdf","Micah_Johnson_Cover_Letter_Sirona.pdf","Micah_Johnson_Cover_Letter_SpruceID.pdf","Micah_Johnson_Cover_Letter_Tomo.pdf","Micah_Johnson_Cover_Letter_Webflow_SA.pdf","Micah_Johnson_Cover_Letter_Wiz.pdf","Micah_Johnson_IncludedHealth.pdf","Micah_Johnson_Mainstay.pdf","Micah_Johnson_MorningBrew.pdf","Micah_Johnson_Resume.pdf","Micah_Johnson_Resume_Braintrust.pdf","Micah_Johnson_Resume_CV_Wiz.pdf","Micah_Johnson_Resume_Centaur.pdf","Micah_Johnson_Resume_HNB_API_Governance_Lead.pdf","Micah_Johnson_Resume_Hightouch.pdf","Micah_Johnson_Resume_Nava.pdf","Micah_Johnson_Resume_OfficeHours.pdf","Micah_Johnson_Resume_OpenAI.pdf","Micah_Johnson_Resume_Optura.pdf","Micah_Johnson_Resume_PandaDoc.pdf","Micah_Johnson_Resume_Reveal.pdf","Micah_Johnson_Resume_Sirona.pdf","Micah_Johnson_Resume_SpruceID.pdf","Micah_Johnson_Resume_Tomo.pdf","Micah_Johnson_Resume_Webflow_SA.pdf","Micah_Johnson_Resume_Wiz.pdf","Micah_Johnson_Rockwell.pdf","Micah_Johnson_SkySafe.pdf","Micah_Johnson_Soris.pdf","Micah_Johnson_SpruceID.pdf","akkio-interview-prep.md","cover-letter-akkio.html","cover-letter-braintrust.html","cover-letter-centaur.html","cover-letter-hightouch.html","cover-letter-hnb-api-governance-lead.html","cover-letter-nava.html","cover-letter-officehours.html","cover-letter-openai.html","cover-letter-optura.html","cover-letter-pandadoc.html","cover-letter-reveal.html","cover-letter-sirona.html","cover-letter-spruceid.html","cover-letter-tomo.html","cover-letter-webflow-sa.html","cover-letter-wiz.html","favicon.ico","favicon.png","favicon.svg","includedhealth-combined.html","job-applications/README.md","job-applications/_shared/resume.pdf","job-applications/akkio/cover-letter.html","job-applications/akkio/cover-letter.pdf","job-applications/akkio/interview-prep.md","job-applications/akkio/resume.html","job-applications/braintrust/cover-letter.html","job-applications/braintrust/cover-letter.pdf","job-applications/braintrust/resume.html","job-applications/braintrust/resume.pdf","job-applications/centaur/cover-letter.html","job-applications/centaur/cover-letter.pdf","job-applications/centaur/resume.html","job-applications/centaur/resume.pdf","job-applications/hightouch/cover-letter.html","job-applications/hightouch/cover-letter.pdf","job-applications/hightouch/resume.html","job-applications/hightouch/resume.pdf","job-applications/hnb-api-governance-lead/cover-letter.html","job-applications/hnb-api-governance-lead/cover-letter.pdf","job-applications/hnb-api-governance-lead/resume.html","job-applications/hnb-api-governance-lead/resume.pdf","job-applications/includedhealth/application.pdf","job-applications/includedhealth/combined.html","job-applications/mainstay/application.pdf","job-applications/mainstay/combined.html","job-applications/morningbrew/application.pdf","job-applications/morningbrew/combined.html","job-applications/nava/cover-letter.html","job-applications/nava/cover-letter.pdf","job-applications/nava/resume.html","job-applications/nava/resume.pdf","job-applications/officehours/cover-letter.html","job-applications/officehours/cover-letter.pdf","job-applications/officehours/resume.html","job-applications/officehours/resume.pdf","job-applications/openai/cover-letter.html","job-applications/openai/cover-letter.pdf","job-applications/openai/resume.html","job-applications/openai/resume.pdf","job-applications/optura/cover-letter.html","job-applications/optura/cover-letter.pdf","job-applications/optura/resume.html","job-applications/optura/resume.pdf","job-applications/pandadoc/cover-letter.html","job-applications/pandadoc/cover-letter.pdf","job-applications/pandadoc/resume.html","job-applications/pandadoc/resume.pdf","job-applications/reveal/cover-letter.html","job-applications/reveal/cover-letter.pdf","job-applications/reveal/resume.html","job-applications/reveal/resume.pdf","job-applications/rockwell/application.pdf","job-applications/sirona/cover-letter.html","job-applications/sirona/cover-letter.pdf","job-applications/sirona/resume.html","job-applications/sirona/resume.pdf","job-applications/skysafe/application.pdf","job-applications/soris/application.pdf","job-applications/soris/combined.html","job-applications/spruceid/application.pdf","job-applications/spruceid/combined.html","job-applications/spruceid/cover-letter.html","job-applications/spruceid/cover-letter.pdf","job-applications/spruceid/resume.html","job-applications/spruceid/resume.pdf","job-applications/techforce/resume.html","job-applications/techforce/resume.pdf","job-applications/tomo/cover-letter.html","job-applications/tomo/cover-letter.pdf","job-applications/tomo/resume.html","job-applications/tomo/resume.pdf","job-applications/webflow-sa/cover-letter.html","job-applications/webflow-sa/cover-letter.pdf","job-applications/webflow-sa/resume.html","job-applications/webflow-sa/resume.pdf","job-applications/wiz/combined-resume-cover.html","job-applications/wiz/cover-letter.html","job-applications/wiz/cover-letter.pdf","job-applications/wiz/resume-cv.pdf","job-applications/wiz/resume.html","job-applications/wiz/resume.pdf","mainstay-combined.html","manifest.json","morningbrew-combined.html","og-image.svg","openapi-abundance.yaml","resume-akkio.html","resume-braintrust.html","resume-centaur.html","resume-cv-wiz-combined.html","resume-hightouch.html","resume-hnb-api-governance-lead.html","resume-nava.html","resume-officehours.html","resume-openai.html","resume-optura.html","resume-pandadoc.html","resume-reveal.html","resume-sirona.html","resume-spruceid.html","resume-tomo.html","resume-webflow-sa.html","resume-wiz.html","robots.txt","sitemap.xml","soris-combined.html","spruceid-combined.html"]),
	mimeTypes: {".pdf":"application/pdf",".md":"text/markdown",".html":"text/html",".png":"image/png",".svg":"image/svg+xml",".json":"application/json",".yaml":"text/yaml",".txt":"text/plain",".xml":"text/xml"},
	_: {
		client: {start:"_app/immutable/entry/start.C9YIHZZW.js",app:"_app/immutable/entry/app.Bw3hoTJX.js",imports:["_app/immutable/entry/start.C9YIHZZW.js","_app/immutable/chunks/BP6bmI2w.js","_app/immutable/chunks/ygKXnOhL.js","_app/immutable/chunks/tsl3k0Gx.js","_app/immutable/chunks/DphI8CAr.js","_app/immutable/chunks/xPDz-uK9.js","_app/immutable/entry/app.Bw3hoTJX.js","_app/immutable/chunks/tsl3k0Gx.js","_app/immutable/chunks/DphI8CAr.js","_app/immutable/chunks/xPDz-uK9.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/ygKXnOhL.js","_app/immutable/chunks/D97XJfqs.js","_app/immutable/chunks/isE-qIHw.js","_app/immutable/chunks/D4PzaJZq.js","_app/immutable/chunks/DqXJRMKf.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js')),
			__memo(() => import('./nodes/7.js')),
			__memo(() => import('./nodes/8.js')),
			__memo(() => import('./nodes/9.js')),
			__memo(() => import('./nodes/10.js')),
			__memo(() => import('./nodes/11.js')),
			__memo(() => import('./nodes/12.js')),
			__memo(() => import('./nodes/13.js')),
			__memo(() => import('./nodes/14.js')),
			__memo(() => import('./nodes/15.js')),
			__memo(() => import('./nodes/16.js')),
			__memo(() => import('./nodes/17.js')),
			__memo(() => import('./nodes/18.js')),
			__memo(() => import('./nodes/19.js')),
			__memo(() => import('./nodes/20.js')),
			__memo(() => import('./nodes/21.js')),
			__memo(() => import('./nodes/22.js')),
			__memo(() => import('./nodes/23.js')),
			__memo(() => import('./nodes/24.js')),
			__memo(() => import('./nodes/25.js')),
			__memo(() => import('./nodes/26.js')),
			__memo(() => import('./nodes/27.js')),
			__memo(() => import('./nodes/28.js')),
			__memo(() => import('./nodes/29.js')),
			__memo(() => import('./nodes/30.js')),
			__memo(() => import('./nodes/31.js')),
			__memo(() => import('./nodes/32.js')),
			__memo(() => import('./nodes/33.js')),
			__memo(() => import('./nodes/34.js')),
			__memo(() => import('./nodes/35.js')),
			__memo(() => import('./nodes/36.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/about",
				pattern: /^\/about\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/account",
				pattern: /^\/account\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/admin/community",
				pattern: /^\/admin\/community\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/admin/funnel",
				pattern: /^\/admin\/funnel\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/admin/funnel/leads/new",
				pattern: /^\/admin\/funnel\/leads\/new\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/admin/funnel/record",
				pattern: /^\/admin\/funnel\/record\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/admin/security",
				pattern: /^\/admin\/security\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 10 },
				endpoint: null
			},
			{
				id: "/admin/security/audit",
				pattern: /^\/admin\/security\/audit\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 11 },
				endpoint: null
			},
			{
				id: "/admin/security/bearer-tokens",
				pattern: /^\/admin\/security\/bearer-tokens\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 12 },
				endpoint: null
			},
			{
				id: "/admin/security/commercial",
				pattern: /^\/admin\/security\/commercial\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 13 },
				endpoint: null
			},
			{
				id: "/admin/security/contracts",
				pattern: /^\/admin\/security\/contracts\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 14 },
				endpoint: null
			},
			{
				id: "/admin/security/partners",
				pattern: /^\/admin\/security\/partners\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 15 },
				endpoint: null
			},
			{
				id: "/admin/social",
				pattern: /^\/admin\/social\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 16 },
				endpoint: null
			},
			{
				id: "/api/abundance/convert",
				pattern: /^\/api\/abundance\/convert\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/abundance/convert/_server.ts.js'))
			},
			{
				id: "/api/abundance/match",
				pattern: /^\/api\/abundance\/match\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/abundance/match/_server.ts.js'))
			},
			{
				id: "/api/abundance/match/[id]",
				pattern: /^\/api\/abundance\/match\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/abundance/match/_id_/_server.ts.js'))
			},
			{
				id: "/api/abundance/seekers",
				pattern: /^\/api\/abundance\/seekers\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/abundance/seekers/_server.ts.js'))
			},
			{
				id: "/api/abundance/seekers/[id]",
				pattern: /^\/api\/abundance\/seekers\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/abundance/seekers/_id_/_server.ts.js'))
			},
			{
				id: "/api/abundance/talent",
				pattern: /^\/api\/abundance\/talent\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/abundance/talent/_server.ts.js'))
			},
			{
				id: "/api/abundance/talent/[id]",
				pattern: /^\/api\/abundance\/talent\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/abundance/talent/_id_/_server.ts.js'))
			},
			{
				id: "/api/abundance/whatsapp",
				pattern: /^\/api\/abundance\/whatsapp\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/abundance/whatsapp/_server.ts.js'))
			},
			{
				id: "/api/admin/contracts",
				pattern: /^\/api\/admin\/contracts\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/admin/contracts/_server.ts.js'))
			},
			{
				id: "/api/admin/mcp-entitlements",
				pattern: /^\/api\/admin\/mcp-entitlements\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/admin/mcp-entitlements/_server.ts.js'))
			},
			{
				id: "/api/agent-kit/validate",
				pattern: /^\/api\/agent-kit\/validate\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/agent-kit/validate/_server.ts.js'))
			},
			{
				id: "/api/analytics/events",
				pattern: /^\/api\/analytics\/events\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/analytics/events/_server.ts.js'))
			},
			{
				id: "/api/analytics/track",
				pattern: /^\/api\/analytics\/track\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/analytics/track/_server.ts.js'))
			},
			{
				id: "/api/auth/cross-domain",
				pattern: /^\/api\/auth\/cross-domain\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/auth/cross-domain/_server.ts.js'))
			},
			{
				id: "/api/auth/login",
				pattern: /^\/api\/auth\/login\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/auth/login/_server.ts.js'))
			},
			{
				id: "/api/auth/logout",
				pattern: /^\/api\/auth\/logout\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/auth/logout/_server.ts.js'))
			},
			{
				id: "/api/auth/magic-login",
				pattern: /^\/api\/auth\/magic-login\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/auth/magic-login/_server.ts.js'))
			},
			{
				id: "/api/auth/signup",
				pattern: /^\/api\/auth\/signup\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/auth/signup/_server.ts.js'))
			},
			{
				id: "/api/booking/create",
				pattern: /^\/api\/booking\/create\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/booking/create/_server.ts.js'))
			},
			{
				id: "/api/booking/slots",
				pattern: /^\/api\/booking\/slots\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/booking/slots/_server.ts.js'))
			},
			{
				id: "/api/community/draft",
				pattern: /^\/api\/community\/draft\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/community/draft/_server.ts.js'))
			},
			{
				id: "/api/community/monitors",
				pattern: /^\/api\/community\/monitors\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/community/monitors/_server.ts.js'))
			},
			{
				id: "/api/community/queue",
				pattern: /^\/api\/community\/queue\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/community/queue/_server.ts.js'))
			},
			{
				id: "/api/community/relationships",
				pattern: /^\/api\/community\/relationships\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/community/relationships/_server.ts.js'))
			},
			{
				id: "/api/community/review",
				pattern: /^\/api\/community\/review\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/community/review/_server.ts.js'))
			},
			{
				id: "/api/community/signals",
				pattern: /^\/api\/community\/signals\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/community/signals/_server.ts.js'))
			},
			{
				id: "/api/contact",
				pattern: /^\/api\/contact\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/contact/_server.ts.js'))
			},
			{
				id: "/api/content/ideas",
				pattern: /^\/api\/content\/ideas\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/content/ideas/_server.ts.js'))
			},
			{
				id: "/api/content/rhythm",
				pattern: /^\/api\/content\/rhythm\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/content/rhythm/_server.ts.js'))
			},
			{
				id: "/api/funnel",
				pattern: /^\/api\/funnel\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/funnel/_server.ts.js'))
			},
			{
				id: "/api/funnel/leads",
				pattern: /^\/api\/funnel\/leads\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/funnel/leads/_server.ts.js'))
			},
			{
				id: "/api/funnel/leads/[id]",
				pattern: /^\/api\/funnel\/leads\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/funnel/leads/_id_/_server.ts.js'))
			},
			{
				id: "/api/internal/mcp-entitlements/check",
				pattern: /^\/api\/internal\/mcp-entitlements\/check\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/internal/mcp-entitlements/check/_server.ts.js'))
			},
			{
				id: "/api/manifest",
				pattern: /^\/api\/manifest\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/manifest/_server.ts.js'))
			},
			{
				id: "/api/me/mcp-token",
				pattern: /^\/api\/me\/mcp-token\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/me/mcp-token/_server.ts.js'))
			},
			{
				id: "/api/me/mcp-token/regenerate",
				pattern: /^\/api\/me\/mcp-token\/regenerate\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/me/mcp-token/regenerate/_server.ts.js'))
			},
			{
				id: "/api/me/mcp-token/revoke",
				pattern: /^\/api\/me\/mcp-token\/revoke\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/me/mcp-token/revoke/_server.ts.js'))
			},
			{
				id: "/api/newsletter",
				pattern: /^\/api\/newsletter\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/newsletter/_server.ts.js'))
			},
			{
				id: "/api/partners/half-dozen/clients/[slug]/access/mint",
				pattern: /^\/api\/partners\/half-dozen\/clients\/([^/]+?)\/access\/mint\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/partners/half-dozen/clients/_slug_/access/mint/_server.ts.js'))
			},
			{
				id: "/api/partners/half-dozen/clients/[slug]/bearer-token/issue",
				pattern: /^\/api\/partners\/half-dozen\/clients\/([^/]+?)\/bearer-token\/issue\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/partners/half-dozen/clients/_slug_/bearer-token/issue/_server.ts.js'))
			},
			{
				id: "/api/partners/half-dozen/clients/[slug]/init",
				pattern: /^\/api\/partners\/half-dozen\/clients\/([^/]+?)\/init\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/partners/half-dozen/clients/_slug_/init/_server.ts.js'))
			},
			{
				id: "/api/partners/half-dozen/clients/[slug]/legacy-key/issue",
				pattern: /^\/api\/partners\/half-dozen\/clients\/([^/]+?)\/legacy-key\/issue\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/partners/half-dozen/clients/_slug_/legacy-key/issue/_server.ts.js'))
			},
			{
				id: "/api/partners/half-dozen/clients/[slug]/notion/accounts",
				pattern: /^\/api\/partners\/half-dozen\/clients\/([^/]+?)\/notion\/accounts\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/partners/half-dozen/clients/_slug_/notion/accounts/_server.ts.js'))
			},
			{
				id: "/api/partners/half-dozen/clients/[slug]/notion/accounts/[accountSlug]/connect-link",
				pattern: /^\/api\/partners\/half-dozen\/clients\/([^/]+?)\/notion\/accounts\/([^/]+?)\/connect-link\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false},{"name":"accountSlug","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/partners/half-dozen/clients/_slug_/notion/accounts/_accountSlug_/connect-link/_server.ts.js'))
			},
			{
				id: "/api/partners/half-dozen/clients/[slug]/notion/accounts/[accountSlug]/disable",
				pattern: /^\/api\/partners\/half-dozen\/clients\/([^/]+?)\/notion\/accounts\/([^/]+?)\/disable\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false},{"name":"accountSlug","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/partners/half-dozen/clients/_slug_/notion/accounts/_accountSlug_/disable/_server.ts.js'))
			},
			{
				id: "/api/partners/half-dozen/clients/[slug]/notion/accounts/[accountSlug]/pin",
				pattern: /^\/api\/partners\/half-dozen\/clients\/([^/]+?)\/notion\/accounts\/([^/]+?)\/pin\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false},{"name":"accountSlug","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/partners/half-dozen/clients/_slug_/notion/accounts/_accountSlug_/pin/_server.ts.js'))
			},
			{
				id: "/api/partners/half-dozen/clients/[slug]/toolkits/status",
				pattern: /^\/api\/partners\/half-dozen\/clients\/([^/]+?)\/toolkits\/status\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/partners/half-dozen/clients/_slug_/toolkits/status/_server.ts.js'))
			},
			{
				id: "/api/partners/half-dozen/clients/[slug]/toolkits/[toolkit]/accounts",
				pattern: /^\/api\/partners\/half-dozen\/clients\/([^/]+?)\/toolkits\/([^/]+?)\/accounts\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false},{"name":"toolkit","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/partners/half-dozen/clients/_slug_/toolkits/_toolkit_/accounts/_server.ts.js'))
			},
			{
				id: "/api/partners/half-dozen/clients/[slug]/toolkits/[toolkit]/accounts/[accountSlug]/connect-link",
				pattern: /^\/api\/partners\/half-dozen\/clients\/([^/]+?)\/toolkits\/([^/]+?)\/accounts\/([^/]+?)\/connect-link\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false},{"name":"toolkit","optional":false,"rest":false,"chained":false},{"name":"accountSlug","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/partners/half-dozen/clients/_slug_/toolkits/_toolkit_/accounts/_accountSlug_/connect-link/_server.ts.js'))
			},
			{
				id: "/api/partners/half-dozen/clients/[slug]/toolkits/[toolkit]/accounts/[accountSlug]/disable",
				pattern: /^\/api\/partners\/half-dozen\/clients\/([^/]+?)\/toolkits\/([^/]+?)\/accounts\/([^/]+?)\/disable\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false},{"name":"toolkit","optional":false,"rest":false,"chained":false},{"name":"accountSlug","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/partners/half-dozen/clients/_slug_/toolkits/_toolkit_/accounts/_accountSlug_/disable/_server.ts.js'))
			},
			{
				id: "/api/partners/half-dozen/clients/[slug]/toolkits/[toolkit]/accounts/[accountSlug]/pin",
				pattern: /^\/api\/partners\/half-dozen\/clients\/([^/]+?)\/toolkits\/([^/]+?)\/accounts\/([^/]+?)\/pin\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false},{"name":"toolkit","optional":false,"rest":false,"chained":false},{"name":"accountSlug","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/partners/half-dozen/clients/_slug_/toolkits/_toolkit_/accounts/_accountSlug_/pin/_server.ts.js'))
			},
			{
				id: "/api/partners/half-dozen/clients/[slug]/toolkits/[toolkit]/connect-link",
				pattern: /^\/api\/partners\/half-dozen\/clients\/([^/]+?)\/toolkits\/([^/]+?)\/connect-link\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false},{"name":"toolkit","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/partners/half-dozen/clients/_slug_/toolkits/_toolkit_/connect-link/_server.ts.js'))
			},
			{
				id: "/api/products/[productId]/download",
				pattern: /^\/api\/products\/([^/]+?)\/download\/?$/,
				params: [{"name":"productId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/products/_productId_/download/_server.ts.js'))
			},
			{
				id: "/api/social/cancel",
				pattern: /^\/api\/social\/cancel\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/social/cancel/_server.ts.js'))
			},
			{
				id: "/api/social/gaps",
				pattern: /^\/api\/social\/gaps\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/social/gaps/_server.ts.js'))
			},
			{
				id: "/api/social/intelligence",
				pattern: /^\/api\/social\/intelligence\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/social/intelligence/_server.ts.js'))
			},
			{
				id: "/api/social/rhythm",
				pattern: /^\/api\/social\/rhythm\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/social/rhythm/_server.ts.js'))
			},
			{
				id: "/api/social/schedule",
				pattern: /^\/api\/social\/schedule\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/social/schedule/_server.ts.js'))
			},
			{
				id: "/api/social/status",
				pattern: /^\/api\/social\/status\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/social/status/_server.ts.js'))
			},
			{
				id: "/api/social/suggest",
				pattern: /^\/api\/social\/suggest\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/social/suggest/_server.ts.js'))
			},
			{
				id: "/api/stripe/checkout",
				pattern: /^\/api\/stripe\/checkout\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/stripe/checkout/_server.ts.js'))
			},
			{
				id: "/api/stripe/webhook",
				pattern: /^\/api\/stripe\/webhook\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/stripe/webhook/_server.ts.js'))
			},
			{
				id: "/api/terminal",
				pattern: /^\/api\/terminal\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/terminal/_server.ts.js'))
			},
			{
				id: "/api/user/analytics",
				pattern: /^\/api\/user\/analytics\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/user/analytics/_server.ts.js'))
			},
			{
				id: "/auth/callback",
				pattern: /^\/auth\/callback\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 17 },
				endpoint: null
			},
			{
				id: "/auth/cross-domain",
				pattern: /^\/auth\/cross-domain\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 18 },
				endpoint: null
			},
			{
				id: "/bearer-token-policy",
				pattern: /^\/bearer-token-policy\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 19 },
				endpoint: null
			},
			{
				id: "/book",
				pattern: /^\/book\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 20 },
				endpoint: null
			},
			{
				id: "/contact",
				pattern: /^\/contact\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 21 },
				endpoint: null
			},
			{
				id: "/dashboard",
				pattern: /^\/dashboard\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 22 },
				endpoint: null
			},
			{
				id: "/experiments",
				pattern: /^\/experiments\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 23 },
				endpoint: null
			},
			{
				id: "/experiments/[slug]",
				pattern: /^\/experiments\/([^/]+?)\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 24 },
				endpoint: null
			},
			{
				id: "/login",
				pattern: /^\/login\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 25 },
				endpoint: null
			},
			{
				id: "/mcp-access",
				pattern: /^\/mcp-access\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 26 },
				endpoint: null
			},
			{
				id: "/methodology",
				pattern: /^\/methodology\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 27 },
				endpoint: null
			},
			{
				id: "/privacy",
				pattern: /^\/privacy\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 28 },
				endpoint: null
			},
			{
				id: "/products",
				pattern: /^\/products\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 29 },
				endpoint: null
			},
			{
				id: "/products/ground",
				pattern: /^\/products\/ground\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 30 },
				endpoint: null
			},
			{
				id: "/products/loom",
				pattern: /^\/products\/loom\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 31 },
				endpoint: null
			},
			{
				id: "/security",
				pattern: /^\/security\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 32 },
				endpoint: null
			},
			{
				id: "/services",
				pattern: /^\/services\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 33 },
				endpoint: null
			},
			{
				id: "/terms",
				pattern: /^\/terms\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 34 },
				endpoint: null
			},
			{
				id: "/use-cases/business",
				pattern: /^\/use-cases\/business\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 35 },
				endpoint: null
			},
			{
				id: "/use-cases/enterprise",
				pattern: /^\/use-cases\/enterprise\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 36 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

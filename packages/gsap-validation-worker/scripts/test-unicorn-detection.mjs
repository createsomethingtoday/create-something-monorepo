import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { findProhibitedMarketplaceCustomCode } from '../src/font-custom-code-policy.js';

const source = fs.readFileSync(new URL('../src/worker.js', import.meta.url), 'utf8');
const start = source.indexOf('var IX2_REJECTION_MESSAGE');
const endMarker = '__name(containsPotentiallyHarmfulCode, "containsPotentiallyHarmfulCode");';
const end = source.indexOf(endMarker) + endMarker.length;

assert.notEqual(start, -1, 'validator slice start not found');
assert.notEqual(end, endMarker.length - 1, 'validator slice end not found');

const sandbox = {
  console,
  Set,
  URL,
  findProhibitedMarketplaceCustomCode,
  __name: (target) => target
};

vm.createContext(sandbox);
vm.runInContext(source.slice(start, end), sandbox);

const unicornHtml = `
<!doctype html>
<html>
	<head>
		<script>
			!function(){
				if(!window.UnicornStudio){
					window.UnicornStudio={isInitialized:!1};
					var i=document.createElement("script");
					i.src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.0.2/dist/unicornStudio.umd.js";
					i.onload=function(){UnicornStudio.init()};
					document.head.appendChild(i)
				}
			}();
		</script>
	</head>
	<body>
		<div data-us-project="i8fE2GGlbESKAYfr5ndJ"></div>
	</body>
</html>`;

const unicornResult = sandbox.validateGsapUsage(unicornHtml, 'https://maxx-template.webflow.io/');
const unicornFinding = unicornResult.details.flaggedCode.find(
  (issue) => issue.policy === 'custom-code-third-party-unicorn-studio'
);

assert.equal(unicornResult.passed, false);
assert.equal(unicornResult.summary.unicornStudioDetected, true);
assert.ok(unicornResult.summary.unicornStudioCount > 0);
assert.ok(unicornFinding, 'expected Unicorn Studio finding');
assert.ok(
  unicornResult.details.externalScripts.some(
    (script) =>
      script.source === 'dynamic-script-assignment' && /unicornStudio\.umd\.js/.test(script.src)
  ),
  'expected dynamically assigned Unicorn Studio script to be reported'
);

const textOnlyResult = sandbox.validateGsapUsage(
  '<main><p>Unicorn Studio is mentioned as plain text only.</p></main>',
  'https://example.webflow.io/'
);

assert.equal(textOnlyResult.summary.unicornStudioDetected, false);
assert.equal(textOnlyResult.summary.unicornStudioCount, 0);

const ix2Html = `
<!doctype html>
<html>
	<body>
		<div data-w-id="abc"></div>
		<script>Webflow.require("ix2").init({})</script>
	</body>
</html>`;

const nonExemptIx2Result = sandbox.validateGsapUsage(
  ix2Html,
  'https://non-exempt-template.webflow.io/'
);

assert.equal(nonExemptIx2Result.passed, false);
assert.equal(nonExemptIx2Result.summary.legacyIx2Detected, true);
assert.equal(nonExemptIx2Result.summary.legacyIx2Exempted, false);
assert.ok(
  nonExemptIx2Result.details.flaggedCode.some((issue) => issue.policy === 'ix2-rejected'),
  'expected non-exempt IX2 to be rejected'
);

const lottieHtml = `
<!doctype html>
<html>
  <body>
    <div data-w-id="lottie-1" data-is-ix2-target="0" data-animation-type="lottie" data-src="/animation.json" data-renderer="svg" data-default-duration="0"></div>
  </body>
</html>`;

const lottieResult = sandbox.validateGsapUsage(lottieHtml, 'https://lottie-template.webflow.io/');

assert.equal(lottieResult.passed, true);
assert.equal(lottieResult.summary.legacyIx2Detected, false);
assert.equal(lottieResult.summary.legacyIx2Count, 0);
assert.equal(
  lottieResult.details.flaggedCode.some((issue) => issue.policy === 'ix2-rejected'),
  false,
  'expected Webflow Lottie element markers to be allowed'
);

const schemaMarkupResult = sandbox.validateGsapUsage(
  `<!doctype html><html><head>
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "Webflow Template",
        "description": "Included Figma File"
      }
    </script>
  </head><body></body></html>`,
  'https://schema-template.webflow.io/'
);

assert.equal(schemaMarkupResult.passed, false);
assert.ok(
  schemaMarkupResult.details.flaggedCode.some(
    (issue) => issue.policy === 'custom-code-schema-markup-not-allowed'
  ),
  'expected JSON-LD schema markup to block new Marketplace submissions'
);

const lottieRuntimeDetection = sandbox.detectIx2Interactions(`
<!doctype html>
<html>
  <body>
    <div data-w-id="lottie-1" data-is-ix2-target="0" data-animation-type="lottie" data-src="/animation.json" data-renderer="svg" data-default-duration="0"></div>
    <script>Webflow.require("ix2").init({ events: { "e-1": { action: { actionTypeId: "PLUGIN_LOTTIE_EFFECT" } } }, actionLists: { pluginLottie: { actionItemGroups: [{ actionItems: [{ actionTypeId: "PLUGIN_LOTTIE" }] }] } } })</script>
  </body>
</html>`);

assert.equal(lottieRuntimeDetection.detected, false);
assert.equal(lottieRuntimeDetection.count, 0);

const markerOnlyResult = sandbox.validateGsapUsage(
  '<!doctype html><html><body><div data-w-id="decorative-motion"></div></body></html>',
  'https://marker-only-template.webflow.io/'
);

assert.equal(markerOnlyResult.passed, true);
assert.equal(markerOnlyResult.summary.legacyIx2Detected, false);
assert.equal(markerOnlyResult.summary.legacyIx2Count, 0);
assert.equal(
  markerOnlyResult.details.flaggedCode.some((issue) => issue.policy === 'ix2-rejected'),
  false,
  'expected bare Webflow DOM markers to require runtime/action evidence before rejection'
);

const mixedLottieIx2Result = sandbox.validateGsapUsage(
  `${lottieHtml}<div data-w-id="legacy-card"></div><script>Webflow.require("ix2").init({})</script>`,
  'https://mixed-template.webflow.io/'
);

assert.equal(mixedLottieIx2Result.passed, false);
assert.equal(mixedLottieIx2Result.summary.legacyIx2Detected, true);
assert.ok(
  mixedLottieIx2Result.details.flaggedCode.some((issue) => issue.policy === 'ix2-rejected'),
  'expected non-Lottie IX2 markers to remain rejected'
);

const exemptIx2Result = sandbox.validateGsapUsage(ix2Html, 'https://az-bergamo.webflow.io/');

assert.equal(exemptIx2Result.passed, true);
assert.equal(exemptIx2Result.summary.legacyIx2Detected, true);
assert.equal(exemptIx2Result.summary.legacyIx2Exempted, true);
assert.ok(
  exemptIx2Result.details.allowedCustomCode.some(
    (issue) => issue.policy === 'ix2-approved-exception'
  ),
  'expected approved IX2 exception to be recorded'
);
assert.equal(
  exemptIx2Result.details.flaggedCode.some((issue) => issue.policy === 'ix2-rejected'),
  false
);

const validatorBridgeHtml = `
<!doctype html>
<html>
  <head>
    <script>
      window.__WF_REVIEW_BRIDGE = {
        siteId: "69d649b3043481cc6f479fad",
        version: "0.3.0",
        marker: "__wf_review_snippet_v1",
        bridgeToken: "wfbt_0123456789abcdef0123456789abcdef",
        reviewSurface: "published-review",
        reviewScriptUrl: "https://validation-worker.createsomething.workers.dev/app-validator/snippet/review.js"
      };
    </script>
    <script src="https://validation-worker.createsomething.workers.dev/app-validator/snippet/review.js"></script>
  </head>
  <body></body>
</html>`;

const validatorBridgeResult = sandbox.validateGsapUsage(
  validatorBridgeHtml,
  'https://validator-bridge-template.webflow.io/'
);

assert.equal(validatorBridgeResult.passed, true);
assert.equal(validatorBridgeResult.summary.flaggedCodeCount, 0);
assert.ok(
  validatorBridgeResult.details.allowedCustomCode.some(
    (issue) => issue.policy === 'validator-review-bridge'
  ),
  'expected Webflow Way Validator bridge config to be allowed'
);

// Zendesk 1182472: snippet/status hands out a placeholder token for manual
// Site Settings installs, so published templates carry this exact shape.
const placeholderBridgeHtml = validatorBridgeHtml.replace(
  'bridgeToken: "wfbt_0123456789abcdef0123456789abcdef"',
  'bridgeToken: "__REPLACE_WITH_TOKEN__"'
);

const placeholderBridgeResult = sandbox.validateGsapUsage(
  placeholderBridgeHtml,
  'https://kora-west-template.webflow.io/'
);

assert.equal(placeholderBridgeResult.passed, true);
assert.equal(placeholderBridgeResult.summary.flaggedCodeCount, 0);
assert.ok(
  placeholderBridgeResult.details.allowedCustomCode.some(
    (issue) => issue.policy === 'validator-review-bridge'
  ),
  'expected pre-install bridge config (placeholder token) to be allowed'
);

const placeholderBridgeWithExtraCodeResult = sandbox.validateGsapUsage(
  placeholderBridgeHtml.replace(
    '</script>',
    'window.location = "https://example.com";</script>'
  ),
  'https://kora-west-template.webflow.io/'
);

assert.equal(placeholderBridgeWithExtraCodeResult.passed, false);
assert.ok(
  placeholderBridgeWithExtraCodeResult.details.flaggedCode.some(
    (issue) => issue.message === 'Custom script detected without approved GSAP patterns'
  ),
  'expected extra code appended to placeholder bridge config to remain blocked'
);

const bridgeWithExtraCodeResult = sandbox.validateGsapUsage(
  validatorBridgeHtml.replace(
    '</script>',
    'window.location = "https://example.com";</script>'
  ),
  'https://validator-bridge-template.webflow.io/'
);

assert.equal(bridgeWithExtraCodeResult.passed, false);
assert.ok(
  bridgeWithExtraCodeResult.details.flaggedCode.some(
    (issue) => issue.message === 'Custom script detected without approved GSAP patterns'
  ),
  'expected extra code appended to bridge config to remain blocked'
);

const googleTagHtml = `
<!doctype html>
<html>
  <head>
    <script>(function(w,i,g){w[g]=w[g]||[];if(typeof w[g].push=='function')w[g].push.apply(w[g],Array.isArray(i)?i:[i]);})(window,['G-EH11T52XR4'],'google_tags_first_party');</script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('set', 'developer_id.dZGVlNj', true);
      gtag('js', new Date());
      gtag('config', 'G-EH11T52XR4');
    </script>
  </head>
  <body></body>
</html>`;

const googleTagResult = sandbox.validateGsapUsage(
  googleTagHtml,
  'https://avix-studio.webflow.io/'
);

assert.equal(googleTagResult.passed, true);
assert.equal(googleTagResult.summary.flaggedCodeCount, 0);
assert.equal(
  googleTagResult.details.allowedCustomCode.filter(
    (issue) => issue.policy === 'analytics-google-tag'
  ).length,
  2,
  'expected Google tag bootstrap scripts to be allowed'
);

const googleTagWithExtraCodeResult = sandbox.validateGsapUsage(
  googleTagHtml.replace(
    "gtag('config', 'G-EH11T52XR4');",
    "gtag('config', 'G-EH11T52XR4');window.location = 'https://example.com';"
  ),
  'https://avix-studio.webflow.io/'
);

assert.equal(googleTagWithExtraCodeResult.passed, false);
assert.ok(
  googleTagWithExtraCodeResult.details.flaggedCode.some(
    (issue) => issue.message === 'Custom script detected without approved GSAP patterns'
  ),
  'expected custom code appended to Google tag bootstrap to remain blocked'
);

const manualGoogleFontLinkResult = sandbox.validateGsapUsage(
  `
<!doctype html>
<html>
  <head>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,100..900&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Geist:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Fragment+Mono:ital@0;1&display=swap" rel="stylesheet">
  </head>
  <body></body>
</html>`,
  'https://manual-font-links.webflow.io/'
);

assert.equal(manualGoogleFontLinkResult.passed, false);
assert.equal(manualGoogleFontLinkResult.summary.flaggedCodeCount, 3);
assert.equal(
  manualGoogleFontLinkResult.details.flaggedCode.filter(
    (issue) => issue.policy === 'custom-code-font-loading'
  ).length,
  3,
  'expected every manually inserted Google Fonts stylesheet to be blocked'
);

const manualGoogleFontImportResult = sandbox.validateGsapUsage(
  `
<!doctype html>
<html>
  <head>
    <style>
      @import url("https://fonts.googleapis.com/css2?family=Fraunces&display=swap");
    </style>
  </head>
  <body></body>
</html>`,
  'https://manual-font-import.webflow.io/'
);

assert.equal(manualGoogleFontImportResult.passed, false);
assert.ok(
  manualGoogleFontImportResult.details.flaggedCode.some(
    (issue) => issue.policy === 'custom-code-font-loading'
  ),
  'expected Google Fonts @import custom code to be blocked'
);

console.log('GSAP validation regression passed.');

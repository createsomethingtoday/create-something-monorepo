import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

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

const reviewBridgeHtml = `
<!doctype html>
<html>
	<head>
		<script>
			window.__WF_REVIEW_BRIDGE = {
				version: "2026-05-01",
				marker: "__wf_review_snippet_v1",
				bridgeToken: "wfbt_0123456789abcdef0123456789abcdef",
				reviewSurface: "published-review",
				reviewScriptUrl: "https://validation-worker.createsomething.workers.dev/app-validator/snippet/review.js"
			};
		</script>
		<script src="https://validation-worker.createsomething.workers.dev/app-validator/snippet/review.js"></script>
	</head>
	<body>
		<main>Template content</main>
	</body>
</html>`;

const reviewBridgeResult = sandbox.validateGsapUsage(
  reviewBridgeHtml,
  'https://review-bridge-template.webflow.io/'
);

assert.equal(reviewBridgeResult.passed, true);
assert.equal(reviewBridgeResult.summary.flaggedCodeCount, 0);
assert.ok(
  reviewBridgeResult.details.allowedCustomCode.some(
    (issue) => issue.policy === 'webflow-way-validator-bridge'
  ),
  'expected Webflow Way Validator bridge config to be allowed'
);

console.log('GSAP validation regression passed.');

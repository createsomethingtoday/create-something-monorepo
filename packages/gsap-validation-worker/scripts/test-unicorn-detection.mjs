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

console.log('Unicorn Studio validation regression passed.');

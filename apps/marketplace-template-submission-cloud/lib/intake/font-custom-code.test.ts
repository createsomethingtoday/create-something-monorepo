import assert from 'node:assert/strict';
import test from 'node:test';

import { runFreshFontCustomCodePreflight } from './font-custom-code';

test('checks the current published HTML and blocks manual font stylesheet links', async () => {
  const result = await runFreshFontCustomCodePreflight(
    'https://manual-font-links.webflow.io/',
    {
      fetchImpl: async () =>
        new Response(
          '<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces&display=swap"></head></html>',
          { status: 200 }
        )
    }
  );

  assert.equal(result.passed, false);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].policy, 'custom-code-font-loading');
});

test('does not reuse an earlier clean result when the published head changes', async () => {
  let fetchCount = 0;
  const fetchImpl = async () => {
    fetchCount += 1;
    return new Response(
      fetchCount === 1
        ? '<html><head></head></html>'
        : '<html><head><style>@font-face { font-family: "Manual"; src: url("/manual.woff2") }</style></head></html>',
      { status: 200 }
    );
  };

  const first = await runFreshFontCustomCodePreflight('https://fresh-check.webflow.io/', {
    fetchImpl
  });
  const second = await runFreshFontCustomCodePreflight('https://fresh-check.webflow.io/', {
    fetchImpl
  });

  assert.equal(first.passed, true);
  assert.equal(second.passed, false);
  assert.equal(fetchCount, 2);
});

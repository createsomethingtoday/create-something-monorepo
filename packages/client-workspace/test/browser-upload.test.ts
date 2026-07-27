import assert from 'node:assert/strict';
import test from 'node:test';

import { encodeBrowserMultipart } from '../src/lib/client/browser-upload.js';

test('browser multipart encoder terminates WebKit file uploads with a final boundary', async () => {
  const boundary = 'create-something-test-boundary';
  const delivery = new File(['signed delivery'], 'northstar.csworkspace', {
    type: 'application/json'
  });
  const encoded = encodeBrowserMultipart(
    [
      ['text', 'Preserve client work'],
      ['delivery', delivery]
    ],
    boundary
  );
  const body = await encoded.body.text();

  assert.equal(encoded.contentType, `multipart/form-data; boundary=${boundary}`);
  assert.match(body, /name="text"\r\n\r\nPreserve client work\r\n/);
  assert.match(
    body,
    /name="delivery"; filename="northstar\.csworkspace"\r\nContent-Type: application\/json/
  );
  assert.ok(body.endsWith(`--${boundary}--\r\n`));
});

test('browser multipart encoder removes header injection from file names', async () => {
  const encoded = encodeBrowserMultipart(
    [['delivery', new File(['x'], 'bad\r\nname".json')]],
    'create-something-safe-boundary'
  );
  const body = await encoded.body.text();
  assert.doesNotMatch(body, /bad\r\nname/);
  assert.match(body, /filename="badname%22\.json"/);
});

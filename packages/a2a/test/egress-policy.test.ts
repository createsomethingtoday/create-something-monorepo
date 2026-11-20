import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertPublicAddress, validateCallback, validateHeaders, MAX_REQUEST_BYTES } from '../sender/policy.mjs';

test('callback policy rejects alternate schemes, credentials, fragments, non-443 ports and IP literals', () => {
  for (const url of [
    'http://example.com/a', 'https://user:secret@example.com/', 'https://@example.com/', 'https://:@example.com/', 'https://example.com/#',
    'https://example.com/#x', 'https://example.com:444/', 'https://127.0.0.1/',
    'https://2130706433/', 'https://0x7f000001/', 'https://0177.0.0.1/',
    'https://[::1]/', 'https://[::ffff:127.0.0.1]/', 'https://localhost/',
    'https://metadata.google.internal/', 'https://example.com./',
    ' https://example.com/', 'https:\\example.com', 'https://example.com/\n',
    'https://example.com:0443/', 'https://example.com:443:443/',
  ]) assert.throws(() => validateCallback(url), { name: 'CallbackTransportError' }, url);
  assert.equal(validateCallback('https://hooks.example.com:443/events?tenant=1').hostname, 'hooks.example.com');
});

test('DNS policy denies special IPv4, IPv6, mapped and translation ranges', () => {
  for (const address of [
    '0.0.0.0', '10.0.0.1', '100.64.0.1', '127.0.0.1', '169.254.169.254',
    '172.16.0.1', '192.168.1.1', '192.0.0.9', '192.0.2.1', '192.88.99.1',
    '198.18.0.1', '198.51.100.1', '203.0.113.1', '224.0.0.1', '240.0.0.1',
    '255.255.255.255', '::', '::1', '::ffff:8.8.8.8', '64:ff9b::808:808',
    '64:ff9b:1::808:808', '100::1', 'fc00::1', 'fe80::1', 'ff02::1',
    '2001::1', '2001:db8::1', '2002:0808:0808::1', '3fff::1',
    'fec0::1', 'fe80::1%en0', 'not-an-ip',
  ]) assert.throws(() => assertPublicAddress(address), { name: 'CallbackTransportError' }, address);
  for (const address of ['1.1.1.1', '8.8.8.8', '104.18.7.80', '2606:4700:4700::1111']) {
    assert.doesNotThrow(() => assertPublicAddress(address));
  }
});

test('callback headers permit only JSON and Standard Webhooks signature fields', () => {
  assert.deepEqual(validateHeaders({ 'Content-Type': 'application/json', 'webhook-id': 'evt_1', 'webhook-timestamp': '123', 'webhook-signature': 'v1,abc', 'X-MCP-Subscription-Id': 'sub_1' }), {
    'content-type': 'application/json', 'webhook-id': 'evt_1', 'webhook-timestamp': '123', 'webhook-signature': 'v1,abc', 'x-mcp-subscription-id': 'sub_1',
  });
  const rejected: Record<string, string>[] = [
    { 'content-type': 'text/plain' }, { host: 'internal.example' },
    { authorization: 'Bearer secret' }, { 'content-type': 'application/json', cookie: 'x=y' },
    { 'webhook-id': 'event\r\nHost: internal' },
    { 'Content-Type': 'application/json', 'content-type': 'application/json' },
  ];
  for (const headers of rejected) assert.throws(() => validateHeaders(headers));
  assert.equal(MAX_REQUEST_BYTES, 256 * 1024);
});

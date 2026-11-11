import assert from 'node:assert/strict';
import test from 'node:test';
import { renderNpgDocument } from '../src/lib/server/npg/document.ts';
import { GET } from '../src/routes/delivery/abundance/healthcare-analyst/+server.ts';
const assets = {
  script: '/npg-chat/assets/main-safe.js',
  styles: ['/npg-chat/assets/main-safe.css']
};
test('private document serializes untrusted titles as data, with one truthful no-JS main', () => {
  const title = '</script><script>alert("x")</script>&\u2028';
  const boot = {
    owner: 'synthetic-owner',
    conversations: [{ id: 'abc', title, status: 'idle', updated_at: 1 }]
  };
  const html = renderNpgDocument(boot, assets);
  assert.equal((html.match(/<main\b/g) ?? []).length, 1);
  assert.ok(html.includes('<noscript>'));
  assert.doesNotMatch(html, /<script>alert|AgencyNavigation|sveltekit/);
  const serialized = html.match(/id="npg-bootstrap">([\s\S]*?)<\/script>/)![1];
  assert.deepEqual(JSON.parse(serialized), boot);
  assert.match(html, /interactive-widget=resizes-content/);
  for (const bad of [
    'https://evil.invalid/a.js',
    '/npg-chat/assets/../../private.js',
    '/npg-chat/assets/a" onload="evil.js'
  ])
    assert.throws(() => renderNpgDocument(boot, { ...assets, script: bad }));
});
test('document retains owner-scoped history and private headers without exposing runtime configuration', async () => {
  let bound: unknown[] = [];
  const db = {
    prepare(sql: string) {
      assert.match(sql, /owner_id=\? AND scope='npg'/);
      return {
        bind(...values: unknown[]) {
          bound = values;
          return {
            all: async () => ({
              results: [{ id: 'a', first_question: 'My question', status: 'idle', updated_at: 1 }]
            })
          };
        }
      };
    }
  };
  const headers: Record<string, string> = {};
  const result = await GET({
    locals: { user: { id: 'owner-a', email: 'operator@example.test' } },
    platform: {
      env: {
        NPG_HEALTHCARE_CHAT_ENABLED: 'true',
        AGENCY_OPERATOR_EMAILS: 'operator@example.test',
        DB: db
      }
    },
    setHeaders(next: Record<string, string>) {
      Object.assign(headers, next);
    }
  } as any);
  assert.deepEqual(bound, ['owner-a']);
  assert.equal(result.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.equal(headers['Cache-Control'], 'private, no-store');
  assert.equal(headers['X-Robots-Tag'], 'noindex, nofollow');
  assert.match(result.headers.get('content-security-policy')!, /connect-src 'self'/);
  const html = await result.text();
  assert.match(html, /My question/);
  assert.doesNotMatch(html, /NPG_HEALTHCARE|OPENAI|AGENCY_OPERATOR|operator@example/);
});
test('disabled and unauthorized documents establish private response headers before redirect or rejection', async () => {
  for (const locals of [{}, { user: { id: 'outside', email: 'outside@example.invalid' } }]) {
    const headers: Record<string, string> = {};
    await assert.rejects(
      async () =>
        GET({
          locals,
          setHeaders(next: Record<string, string>) {
            Object.assign(headers, next);
          }
        } as any),
      (error: any) => [401, 403].includes(error.status)
    );
    assert.equal(headers['Cache-Control'], 'private, no-store');
  }
  const headers: Record<string, string> = {};
  await assert.rejects(
    async () =>
      GET({
        locals: { user: { id: 'owner', email: 'operator@example.test' } },
        platform: {
          env: {
            AGENCY_OPERATOR_EMAILS: 'operator@example.test',
            NPG_HEALTHCARE_ANALYST_URL: 'https://udify.app/agent/retained'
          }
        },
        setHeaders(next: Record<string, string>) {
          Object.assign(headers, next);
        }
      } as any),
    (error: any) => error.status === 303 && error.location === 'https://udify.app/agent/retained'
  );
  assert.equal(headers['Cache-Control'], 'private, no-store');
  assert.equal(headers['Referrer-Policy'], 'same-origin');
});

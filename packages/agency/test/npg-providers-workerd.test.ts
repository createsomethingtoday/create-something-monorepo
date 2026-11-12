import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

// Bundle the production provider into Agency's pinned workerd, rather than testing
// fetch in Node (which accepts redirect: 'error'). All outbound I/O is local.
const require = createRequire(import.meta.url);
const wranglerRequire = createRequire(require.resolve('wrangler/package.json'));
const { Miniflare } = wranglerRequire('miniflare');
const { build } = wranglerRequire('esbuild');
const config = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
const mcpUrl = 'https://abundance-healthcare-mcp.createsomething.workers.dev/mcp';
const modelUrl = 'https://api.openai.com/v1/responses';
const tool = { name: 'search_registry_sourcing', inputSchema: { type: 'object', properties: {} } };

test(
  'NPG providers in workerd: supported requests and fail-closed redirects',
  { timeout: 60000 },
  async (t) => {
    const bundle = await build({
      stdin: {
        resolveDir: fileURLToPath(new URL('../', import.meta.url)),
        contents: `
        import { createProviders } from './src/lib/server/npg/providers.ts';
        export default { async fetch(request) {
          const mode = new URL(request.url).pathname.slice(1);
          if (mode === 'legacy') {
            try { await fetch('${mcpUrl}', { redirect: 'error' }); }
            catch (error) { return Response.json({ name: error.name, message: error.message }); }
            return Response.json({ unexpected: true });
          }
          const observed = { metadataReads: 0, bodyReads: 0, cancellations: 0 };
          // Observe the redirect boundary while retaining native workerd fetch.
          // Reading these fields fails the test even if the SDK would later reject.
          const checkedFetch = async (url, init) => {
            const response = await fetch(url, init);
            if (response.status < 300 || response.status >= 400) return response;
            return new Proxy(response, { get(target, property) {
              if (property === 'headers') {
                observed.metadataReads++;
                throw new Error('Untrusted metadata consumed');
              }
              if (['text', 'json', 'arrayBuffer', 'blob'].includes(property)) {
                observed.bodyReads++;
                throw new Error('Untrusted body consumed');
              }
              if (property === 'body' && target.body) return new Proxy(target.body, {
                get(body, key) {
                  if (key === 'cancel') return async () => { observed.cancellations++; await body.cancel(); };
                  observed.bodyReads++;
                  throw new Error('Untrusted body consumed');
                }
              });
              return Reflect.get(target, property, target);
            }});
          };
          const providers = createProviders({
            ABUNDANCE_HEALTHCARE_MCP_API_KEY: 'fixture-mcp',
            NPG_HEALTHCARE_OPENAI_API_KEY: 'fixture-model',
            NPG_HEALTHCARE_MODEL: 'fixture-model'
          }, mode.startsWith('aborted-') ? AbortSignal.abort() : AbortSignal.timeout(2000), checkedFetch);
          try {
            if (mode.endsWith('model')) return Response.json(await providers.respond([], undefined, []));
            const tools = await providers.tools();
            const result = await providers.call('search_registry_sourcing', {});
            return Response.json({ tools, result });
          } catch (error) {
            return Response.json({ name: error.name, message: error.message, observed }, { status: 500 });
          } finally { await providers.close(); }
        }};
      `
      },
      bundle: true,
      format: 'esm',
      platform: 'browser',
      write: false
    });
    let redirectMethod = '',
      redirectStatus = 0,
      modelStatus = 200,
      modelBodyless = false;
    let oversized = false;
    const requests: Array<{ url: string; method: string; rpc?: string; session: string | null }> =
      [];
    const mf = new Miniflare({
      modules: true,
      script: bundle.outputFiles[0].text,
      compatibilityDate: config.compatibility_date,
      compatibilityFlags: config.compatibility_flags,
      // No unhandled request can reach a provider, DNS or the public internet.
      outboundService: async (request: Request) => {
        assert.ok(
          [mcpUrl, modelUrl].includes(request.url),
          `Unexpected outbound URL: ${request.url}`
        );
        const rpc = request.method === 'POST' ? ((await request.json()) as any) : undefined;
        requests.push({
          url: request.url,
          method: request.method,
          rpc: rpc?.method,
          session: request.headers.get('mcp-session-id')
        });
        assert.equal(
          request.headers.get('authorization'),
          request.url === mcpUrl ? 'Bearer fixture-mcp' : 'Bearer fixture-model'
        );
        if (request.url === modelUrl) {
          return new Response(
            modelBodyless || modelStatus === 304
              ? null
              : JSON.stringify({
                  id: 'resp_fixture',
                  status: 'completed',
                  output: [
                    {
                      type: 'message',
                      role: 'assistant',
                      content: [
                        {
                          type: 'output_text',
                          text: oversized ? 'x'.repeat(180001) : 'Local model fixture'
                        }
                      ]
                    }
                  ]
                }),
            {
              status: modelStatus,
              headers: {
                'Content-Type': 'application/json',
                Location: 'https://redirect.invalid/model'
              }
            }
          );
        }
        if (request.method !== 'POST') return new Response(null, { status: 405 });
        if (rpc.method === redirectMethod)
          return new Response(redirectStatus === 304 ? null : 'untrusted redirect body', {
            status: redirectStatus,
            headers: {
              Location: 'https://redirect.invalid/mcp',
              'Content-Type': 'application/json',
              'Mcp-Session-Id': 'untrusted-redirect-session'
            }
          });
        if (rpc.method === 'notifications/initialized') return new Response(null, { status: 202 });
        const result =
          rpc.method === 'initialize'
            ? {
                protocolVersion: '2025-03-26',
                capabilities: { tools: {} },
                serverInfo: { name: 'fixture', version: '1' }
              }
            : rpc.method === 'tools/list'
              ? { tools: [tool] }
              : {
                  content: [{ type: 'text', text: oversized ? 'x'.repeat(180001) : '{"total":1}' }]
                };
        return Response.json({ jsonrpc: '2.0', id: rpc.id, result });
      }
    });
    const dispatch = async (mode: string) => {
      requests.length = 0;
      const response = await mf.dispatchFetch(`http://fixture.invalid/${mode}`);
      return { status: response.status, body: (await response.json()) as any };
    };
    try {
      await t.test(
        'legacy redirect:error throws TypeError before any outbound request',
        async () => {
          const { body } = await dispatch('legacy');
          assert.equal(body.name, 'TypeError');
          assert.match(body.message, /redirect|error/i);
          assert.equal(requests.length, 0);
        }
      );
      await t.test(
        'MCP initialize/list/call 200 and initialized notification bodyless 202',
        async () => {
          const { status, body } = await dispatch('mcp');
          assert.equal(status, 200, JSON.stringify(body));
          assert.deepEqual(body.tools, [tool]);
          assert.deepEqual(body.result, { total: 1 });
          assert.deepEqual(
            requests.filter((r) => r.method === 'POST').map((r) => r.rpc),
            ['initialize', 'notifications/initialized', 'tools/list', 'tools/call']
          );
          assert.equal(requests.filter((r) => r.method === 'GET').length, 1);
        }
      );
      await t.test('Responses 200 completes through the public provider interface', async () => {
        const { status, body } = await dispatch('model');
        assert.equal(status, 200, JSON.stringify(body));
        assert.deepEqual(body, { id: 'resp_fixture', text: 'Local model fixture' });
        assert.equal(requests.length, 1);
      });
      // Test the entire range, including 300/304/305/306/399, not just Location redirects.
      for (const method of ['initialize', 'tools/list', 'tools/call']) {
        await t.test(
          `MCP ${method} refuses every 3xx without following, retrying or trusting session metadata`,
          async () => {
            redirectMethod = method;
            for (redirectStatus = 300; redirectStatus < 400; redirectStatus++) {
              const { status, body } = await dispatch('mcp');
              assert.equal(status, 500);
              assert.match(
                body.message,
                /redirect/i,
                `${method} ${redirectStatus}: ${body.message}`
              );
              assert.equal(requests.filter((r) => r.rpc === method).length, 1);
              assert.equal(requests.filter((r) => r.method === 'POST').at(-1)?.rpc, method);
              assert.ok(requests.every((r) => r.session !== 'untrusted-redirect-session'));
              assert.deepEqual(body.observed, {
                metadataReads: 0,
                bodyReads: 0,
                cancellations: redirectStatus === 304 ? 0 : 1
              });
            }
            redirectMethod = '';
          }
        );
      }
      await t.test('Responses refuses every 3xx without following or retrying', async () => {
        for (modelStatus = 300; modelStatus < 400; modelStatus++) {
          const { status, body } = await dispatch('model');
          assert.equal(status, 500);
          assert.match(body.message, /redirect/i, `${modelStatus}: ${body.message}`);
          assert.equal(requests.length, 1);
          assert.deepEqual(body.observed, {
            metadataReads: 0,
            bodyReads: 0,
            cancellations: modelStatus === 304 ? 0 : 1
          });
        }
      });
      await t.test('bodyless Responses 202/204 fail closed without retrying', async () => {
        modelBodyless = true;
        for (modelStatus of [202, 204]) {
          const { status } = await dispatch('model');
          assert.equal(status, 500);
          assert.equal(requests.length, 1);
        }
      });
      await t.test(
        '180000-byte transport caps still reject oversized MCP and model bodies',
        async () => {
          modelStatus = 200;
          modelBodyless = false;
          oversized = true;
          for (const mode of ['mcp', 'model']) {
            const { status, body } = await dispatch(mode);
            assert.equal(status, 500);
            assert.match(body.message, /response too large/i);
            assert.equal(
              requests.filter((r) => (mode === 'mcp' ? r.rpc === 'tools/call' : r.url === modelUrl))
                .length,
              1
            );
          }
        }
      );
      await t.test('aborted caller signal stops MCP and model before outbound I/O', async () => {
        for (const mode of ['aborted-mcp', 'aborted-model']) {
          const { status, body } = await dispatch(mode);
          assert.equal(status, 500);
          assert.equal(body.name, 'AbortError');
          assert.equal(requests.length, 0);
        }
      });
    } finally {
      await mf.dispose();
    }
  }
);

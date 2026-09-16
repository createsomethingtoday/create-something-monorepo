import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { TemplateReviewHandoffSource } from './template-review-handoff-gateway.js';

const ENDPOINT = 'https://webflow-template-review-mcp.createsomething.workers.dev/mcp';
const TIMEOUT_MS = 30_000;
const MAX_RESPONSE_BYTES = 65_536;

function boundedResponse(response: Response, rejectTransport: () => void): Response {
  if (!response.body) return response;
  const reader = response.body.getReader();
  let bytes = 0;
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const chunk = await reader.read();
        if (chunk.done) { controller.close(); return; }
        bytes += chunk.value.byteLength;
        if (bytes > MAX_RESPONSE_BYTES) {
          rejectTransport();
          controller.error(new Error('source_response_too_large'));
          await reader.cancel().catch(() => undefined);
          return;
        }
        controller.enqueue(chunk.value);
      } catch (error) {
        controller.error(error);
        await reader.cancel().catch(() => undefined);
      }
    },
    cancel(reason) { return reader.cancel(reason); }
  });
  return new Response(body, {
    status: response.status, statusText: response.statusText, headers: response.headers
  });
}

/** Only the credential owner supplies tokens. This transport grants no access. */
export class AuthenticatedTemplateReviewHandoffSource implements TemplateReviewHandoffSource {
  constructor(
    private readonly accessToken: () => Promise<string>,
    private readonly request: typeof fetch = fetch
  ) {}

  async observe(parameters: { assetId: string; versionId: string }): Promise<unknown> {
    let client: Client | undefined;
    try {
      for (const value of [parameters.assetId, parameters.versionId])
        if (!/^rec[A-Za-z0-9]{14}$/.test(value)) throw new Error('invalid_parameters');
      const token = await this.accessToken();
      if (!token || /\s/.test(token)) throw new Error('invalid_token');
      client = new Client({ name: 'control-marketplace-reconciliation', version: '1.0.0' }, { capabilities: {} });
      let responseLimitExceeded = false;
      const transport = new StreamableHTTPClientTransport(new URL(ENDPOINT), {
        requestInit: { headers: { Authorization: `Bearer ${token}` }, redirect: 'manual' },
        reconnectionOptions: { maxRetries: 0, initialReconnectionDelay: 1000,
          maxReconnectionDelay: 1000, reconnectionDelayGrowFactor: 1 },
        fetch: async (url, init) => {
          if (responseLimitExceeded) throw new Error('source_response_too_large');
          if (String(url) !== ENDPOINT) throw new Error('source_origin_mismatch');
          const response = await this.request(ENDPOINT, { ...init, redirect: 'manual', signal: AbortSignal.any([...(init?.signal ? [init.signal] : []), AbortSignal.timeout(TIMEOUT_MS)]) });
          if (response.status >= 300 && response.status < 400) {
            await response.body?.cancel().catch(() => undefined);
            throw new Error('source_redirect_rejected');
          }
          return boundedResponse(response, () => { responseLimitExceeded = true; });
        }
      });
      await client.connect(transport, { timeout: TIMEOUT_MS });
      const result = await client.callTool({ name: 'template_review_observe_handoff',
        arguments: { assetId: parameters.assetId, versionId: parameters.versionId } },
        undefined, { timeout: TIMEOUT_MS });
      if (result.isError || !Array.isArray(result.content) || result.content.length !== 1)
        throw new Error('source_result_invalid');
      const content = result.content[0];
      if (content.type !== 'text' || typeof content.text !== 'string' || content.text.length > 8192)
        throw new Error('source_result_invalid');
      const envelope: unknown = JSON.parse(content.text);
      if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope) ||
          Object.keys(envelope).sort().join(',') !== 'data,ok' ||
          !('ok' in envelope) || envelope.ok !== true || !('data' in envelope))
        throw new Error('source_result_invalid');
      // The gateway validates the full redaction/schema/request/freshness contract
      // before persisting. No source text or credential is logged here.
      return envelope.data;
    } catch {
      throw new Error('handoff_source_unavailable');
    } finally {
      await client?.close().catch(() => undefined);
    }
  }
}

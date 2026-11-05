import { AgentInquiryError, getAgentInquiryCatalog, prepareAgentInquiry } from '$lib/server/agent-inquiry';

const headers = { 'cache-control': 'no-store' };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });

/** Public preparation only: no database, provider, model, analytics or contact calls. */
export function GET() { return reply(getAgentInquiryCatalog()); }

export async function POST({ request }: { request: Request }) {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return reply({ error: 'Use application/json.', submitted: false }, 415);
  }
  const reader = request.body?.getReader();
  if (!reader) return reply({ error: 'Expected an inquiry object.', submitted: false }, 400);
  try {
    const decoder = new TextDecoder();
    let size = 0;
    let text = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 48000) {
        // Cancelling SvelteKit's incoming Node stream destroys the socket before
        // the 413 response can be delivered. Stop reading and release the lock;
        // the HTTP runtime owns request teardown.
        return reply({ error: 'Request exceeds the 48,000-byte preparation limit.', submitted: false }, 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    let input: unknown;
    try { input = JSON.parse(text); }
    catch { return reply({ error: 'Invalid JSON.', submitted: false }, 400); }
    return reply(prepareAgentInquiry(input));
  } catch (error) {
    return reply({ error: error instanceof AgentInquiryError ? error.message : 'Could not read the inquiry. Prepare the request again.', submitted: false }, error instanceof AgentInquiryError ? error.status : 400);
  } finally { reader.releaseLock(); }
}

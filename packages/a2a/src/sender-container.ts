import { Container } from '@cloudflare/containers';
import { createHash, timingSafeEqual } from 'node:crypto';

interface SenderContainerEnv { CALLBACK_SENDER_TOKEN: string; }

/** Private DO binding only. Never route public Worker requests to this class. */
export class A2ACallbackSender extends Container<SenderContainerEnv> {
  defaultPort = 8080;
  sleepAfter = '1m';
  enableInternet = true;
  // No outbound HTTPS interception: Node owns the pinned TCP and TLS connection.
  envVars = { A2A_SENDER_TOKEN: this.env.CALLBACK_SENDER_TOKEN };

  override async fetch(request: Request): Promise<Response> {
    const token = this.env.CALLBACK_SENDER_TOKEN;
    if (!/^[A-Za-z0-9_-]{32,256}$/u.test(token ?? '')) return Response.json({ error: 'sender_not_configured' }, { status: 503 });
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/send' || url.search) return new Response(null, { status: 404 });
    const supplied = request.headers.get('authorization') ?? '';
    const digest = (value: string) => createHash('sha256').update(value).digest();
    if (supplied.length > 300 || !timingSafeEqual(digest(supplied), digest(`Bearer ${token}`))) return new Response(null, { status: 401 });
    const deadlineAt = Number(request.headers.get('x-a2a-deadline-at'));
    if (!Number.isSafeInteger(deadlineAt) || deadlineAt <= Date.now() || deadlineAt > Date.now() + 10_000) return new Response(null, { status: 408 });
    return this.containerFetch(request, 8080);
  }

  // Provider errors may contain request details. The caller records safe codes.
  override onError(_error: unknown): void {}
}

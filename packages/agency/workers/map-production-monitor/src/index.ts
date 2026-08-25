import { runScheduledMapMonitor, type MapMonitorEnv } from './monitor.ts';
import { executeMapProductionSynthetic } from './synthetic.ts';

function health(env: MapMonitorEnv): Response {
  const ready =
    /^[0-9a-f]{40}$/i.test(env.MAP_MONITOR_SOURCE_SHA?.trim() ?? '') &&
    env.MAP_MONITOR_BASE_URL === 'https://createsomething.agency' &&
    env.MAP_MONITOR_RECEIPT_RETENTION_DAYS === '30' &&
    Boolean(env.CF_VERSION_METADATA?.id);
  return Response.json(
    {
      schemaVersion: 1,
      status: ready ? 'ready' : 'degraded',
      worker: 'map-production-monitor',
      receiptStore: 'cloudflare-d1',
      scheduledOnly: true,
    },
    {
      status: ready ? 200 : 503,
      headers: { 'cache-control': 'no-store' },
    },
  );
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/health') return health(env);
    return new Response('Not Found', { status: 404 });
  },

  async scheduled(controller, env): Promise<void> {
    await runScheduledMapMonitor({
      scheduledAt: new Date(controller.scheduledTime).toISOString(),
      env,
      executeSynthetic: executeMapProductionSynthetic,
    });
  },
} satisfies ExportedHandler<MapMonitorEnv>;

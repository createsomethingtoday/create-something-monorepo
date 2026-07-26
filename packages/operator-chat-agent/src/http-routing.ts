export const TELEGRAM_WEBHOOK_PATH = '/messengers/telegram/webhook';

export type OperatorRoute =
  | 'health'
  | 'telegram_setup'
  | 'telegram_webhook'
  | 'service_info'
  | 'not_found';

export function resolveOperatorRoute(request: Request): OperatorRoute {
  const url = new URL(request.url);

  if (request.method === 'GET' && url.pathname === '/healthz') return 'health';
  if (request.method === 'POST' && url.pathname === '/admin/telegram/setup') {
    return 'telegram_setup';
  }
  if (request.method === 'POST' && url.pathname === TELEGRAM_WEBHOOK_PATH) {
    return 'telegram_webhook';
  }
  if (request.method === 'GET' && url.pathname === '/') return 'service_info';

  return 'not_found';
}

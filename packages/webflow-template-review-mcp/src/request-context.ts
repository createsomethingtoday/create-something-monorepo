import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  accountId?: string | null;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(context: RequestContext, callback: () => T): T {
  return storage.run(context, callback);
}

export function getRequestContext(): RequestContext {
  return storage.getStore() ?? {};
}

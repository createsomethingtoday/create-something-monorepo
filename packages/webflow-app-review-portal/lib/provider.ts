import { Data, Effect } from 'effect';
import { BundleError } from './bundle-contract';

export class ProviderFailure extends Data.TaggedError('ProviderFailure')<{
  provider: string;
  status: number;
  cause?: unknown;
  uncertain: boolean;
}> {}

// Writes are never automatically retried: a timeout can mean the write succeeded.
export async function providerFetch(
  provider: string,
  url: string,
  init: RequestInit = {},
  fetcher = fetch
): Promise<Response> {
  const write = !['GET', 'HEAD'].includes(init.method || 'GET');
  const operation = Effect.tryPromise({
    try: async (signal) => {
      const response = await fetcher(url, {
        ...init,
        redirect: 'error',
        signal: AbortSignal.any([signal, AbortSignal.timeout(25000)])
      });
      if (!response.ok)
        throw new ProviderFailure({
          provider,
          status: response.status,
          uncertain: write && response.status >= 500
        });
      return response;
    },
    catch: (cause) =>
      cause instanceof ProviderFailure
        ? cause
        : new ProviderFailure({ provider, status: 0, cause, uncertain: write })
  });
  const result = await Effect.runPromise(Effect.either(operation));
  if (result._tag === 'Left') throw result.left;
  return result.right;
}
export function providerError(error: unknown): BundleError {
  if (error instanceof ProviderFailure) {
    if (error.uncertain)
      return new BundleError(
        'OUTCOME_UNKNOWN',
        `${error.provider} did not confirm the outcome. Check the activity receipt before retrying.`,
        502
      );
    if (error.status === 401 || error.status === 403)
      return new BundleError(
        'CONNECTION_REQUIRED',
        `${error.provider} denied this request. Reconnect your account or check its access.`,
        403
      );
    return new BundleError(
      'PROVIDER_UNAVAILABLE',
      `${error.provider} returned ${error.status || 'a connection error'}.`,
      502
    );
  }
  return error instanceof BundleError
    ? error
    : new BundleError('SERVICE_UNAVAILABLE', 'The service could not complete this request.', 503);
}

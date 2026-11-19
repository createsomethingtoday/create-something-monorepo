export const BROWSER_ORIGIN: string;
export const ISOLATED_ORIGIN: string;
export const TARGET: string;
export function invokeSyntheticCoordinator(
  request: Request,
  cookies: { get(name: string): string | undefined },
  env: {
    GOLDIN_SYNTHETIC_ENABLED?: string;
    GOLDIN_SYNTHETIC_STARTED_AT?: string;
    GOLDIN_SYNTHETIC_EXPIRES_AT?: string;
  },
  identityFetch?: typeof globalThis.fetch,
  expectedOrigin?: string,
): Promise<Response>;

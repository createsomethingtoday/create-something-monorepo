interface LifecycleEnv {
  LIFECYCLE?: string;
}

export function isActiveLifecycle(env: LifecycleEnv): boolean {
  return env.LIFECYCLE?.trim().toLowerCase() === 'active';
}

export function retiredRouteResponse(url: URL): Response | null {
  if (url.pathname === '/' || url.pathname === '/health') return null;
  return Response.json(
    { error: 'This retired Gmail sync service is not available.' },
    { status: 410 }
  );
}

export function dormantHealthPayload() {
  return {
    name: 'halfdozen-gmail-sync-mcp',
    version: '4.0.0',
    lifecycle: 'dormant'
  } as const;
}

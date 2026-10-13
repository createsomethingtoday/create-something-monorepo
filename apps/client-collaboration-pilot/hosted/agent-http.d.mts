export function proposalHttp(request: Request, taskTools: { readContext(): Promise<unknown>; propose(a: Record<string, unknown>): Promise<unknown> }): Promise<Response>;

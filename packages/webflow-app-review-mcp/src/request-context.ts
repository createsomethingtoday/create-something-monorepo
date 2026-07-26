/**
 * Attach per-request MCP identity without cloning Cloudflare's runtime context.
 * ExecutionContext methods can live on the runtime object's prototype, so a
 * spread copy is not behaviorally equivalent to the original object.
 */
export function attachRequestProps<TContext extends object, TProps>(
  context: TContext,
  props: TProps,
): TContext & { props: TProps } {
  return Object.assign(context, { props });
}

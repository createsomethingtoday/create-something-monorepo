// ── Structured Logger ───────────────────────────────────────────────

type LogContext = Record<string, unknown>;

function log(level: "info" | "warn" | "error", msg: string, ctx?: LogContext): void {
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg,
  };
  if (ctx) Object.assign(entry, ctx);
  console.error(JSON.stringify(entry));
}

export const logger = {
  info: (msg: string, ctx?: LogContext) => log("info", msg, ctx),
  warn: (msg: string, ctx?: LogContext) => log("warn", msg, ctx),
  error: (msg: string, ctx?: LogContext) => log("error", msg, ctx),
};

import { report } from './report.ts';
// Binding types are generated from wrangler.jsonc; token is configured as a secret.
type RuntimeEnv = Env & { MONITOR_API_TOKEN?: string };
async function authorized(request: Request, token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const digest = async (value: string) => new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
  const [actual,expected]=await Promise.all([digest(request.headers.get('Authorization') ?? ''),digest(`Bearer ${token}`)]);
  let difference=0;
  for(let n=0;n<actual.length;n++) difference |= actual[n]^expected[n];
  return difference===0;
}
function json(body: unknown,status=200) { return Response.json(body,{status,headers:{'Cache-Control':'no-store'}}); }
function current(env: RuntimeEnv) {
  const grace=Number(env.GRACE_SECONDS);
  if (!Number.isInteger(grace) || grace<600 || grace>86400) throw new Error('invalid_grace');
  return report(env.DB,env.MONITOR_NOT_BEFORE,grace);
}
export default {
  async fetch(request,env) {
    if (!(await authorized(request,env.MONITOR_API_TOKEN))) return json({error:'unauthorized'},401);
    if (new URL(request.url).pathname!=='/status') return json({error:'not_found'},404);
    if (request.method!=='GET') return json({error:'method_not_allowed'},405);
    try { return json(await current(env)); } catch { return json({error:'monitor_check_failed'},503); }
  },
  async scheduled(_controller,env) {
    try {
      const result=await current(env);
      if (result.ok) console.log(JSON.stringify({event:'transcript_monitor',...result}));
      else console.error(JSON.stringify({event:'transcript_monitor_alert',...result}));
    } catch { console.error(JSON.stringify({event:'transcript_monitor_failed',error:'read_or_configuration_failed'})); throw new Error('transcript_monitor_failed'); }
  }
} satisfies ExportedHandler<RuntimeEnv>;

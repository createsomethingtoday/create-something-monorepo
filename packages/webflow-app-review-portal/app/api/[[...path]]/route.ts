import { platform, portalOrigin } from '@/lib/platform';
import { beginLogin, finishLogin, logout, session, readCookie } from '@/lib/auth';
import { withMcp, catalog, toolData } from '@/lib/mcp';
import {
  capabilities,
  performAction,
  requireTool,
  reconciliationContext,
  reconcileAction
} from '@/lib/reviews';
import { BundleError, MAX_UPLOAD_BYTES, readBoundedBody } from '@/lib/bundle-contract';
import { providerError } from '@/lib/provider';
import { bundleDetail, bundleDownload, listBundles, uploadBundle } from '@/lib/bundle-store';
import { pollAnalysis, publicJob, startAnalysis, recoverAnalysis } from '@/lib/analysis';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer'
    }
  });
async function handle(request: Request) {
  try {
    const path = new URL(request.url).pathname.replace(/^\/api\/?/, '').split('/'),
      method = request.method;
    if (!['auth', 'status'].includes(path[0]) && !readCookie(request, 'review_session'))
      throw new BundleError('SIGN_IN_REQUIRED', 'Sign in with your Webflow work account.', 401);
    const env = await platform();
    if (method === 'GET' && path.join('/') === 'status')
      return json({
        signInReady: Boolean(
          env.OAUTH_CLIENT_ID &&
          env.SESSION_ENCRYPTION_KEY &&
          env.PORTAL_ORIGIN &&
          env.PORTAL_ALLOWED_EMAILS
        )
      });
    if (method !== 'GET' && request.headers.get('origin') !== portalOrigin(env))
      throw new BundleError('ORIGIN_REQUIRED', 'Submit this request from the review portal.', 403);
    if (method === 'GET' && path.join('/') === 'auth/login') return await beginLogin(env);
    if (method === 'GET' && path.join('/') === 'auth/callback')
      return await finishLogin(env, request);
    if (method === 'POST' && path.join('/') === 'auth/logout') return await logout(env, request);
    const auth = await session(env, request),
      owner = auth.identity.accountId;
    return await withMcp(auth.accessToken, async (rpc) => {
      const tools = await catalog(rpc); // Revalidate the user's live MCP access on every protected request.
      if (method === 'GET' && path[0] === 'session')
        return json({
          user: auth.identity,
          capabilities: capabilities(tools),
          model: 'gpt-6-astra',
          analysisReady: Boolean(env.OPENAI_API_KEY)
        });
      const call = async (name: string, args: unknown = {}) => {
        requireTool(tools, name);
        return toolData(await rpc('tools/call', { name, arguments: args }));
      };
      if (method === 'GET' && path[0] === 'queue')
        return json(await call('app_review_list_queue', { limit: 100 }));
      if (method === 'GET' && path[0] === 'assets' && path[1])
        return json(
          await call('app_review_get_asset', {
            asset_id: z
              .string()
              .regex(/^rec[a-zA-Z0-9]{14}$/)
              .parse(path[1])
          })
        );
      if (method === 'GET' && path[0] === 'thread' && path[1])
        return json(
          await call('app_review_get_ticket_thread', {
            version_id: z
              .string()
              .regex(/^rec[a-zA-Z0-9]{14}$/)
              .parse(path[1]),
            include_internal_notes: false,
            limit: 50
          })
        );
      if (method === 'GET' && path[0] === 'actions' && path[1])
        return json(await reconciliationContext(env.DB, owner, path[1], rpc));
      if (method === 'POST' && path[0] === 'actions' && path[1] && path[2] === 'reconcile')
        return json(
          await reconcileAction(
            env.DB,
            owner,
            path[1],
            JSON.parse(new TextDecoder().decode(await readBoundedBody(request, 10000))),
            rpc
          )
        );
      if (method === 'POST' && path[0] === 'actions' && !path[1])
        return json(
          await performAction(
            env.DB,
            owner,
            JSON.parse(new TextDecoder().decode(await readBoundedBody(request, 30000))),
            rpc
          )
        );
      if (method === 'GET' && path[0] === 'activity')
        return json(
          (
            await env.DB.prepare(
              'SELECT id,action,target_id,status,result_json,created_at FROM portal_actions WHERE owner_id=? ORDER BY created_at DESC LIMIT 100'
            )
              .bind(owner)
              .all()
          ).results
        );
      if (path[0] === 'bundles') {
        if (method === 'GET' && !path[1]) return json({ bundles: await listBundles(env, owner) });
        if (method === 'POST' && !path[1])
          return json(
            {
              bundle: await uploadBundle(
                env,
                owner,
                request.headers,
                await readBoundedBody(request, MAX_UPLOAD_BYTES)
              )
            },
            201
          );
        if (method === 'GET' && path[1] && path[2] === 'download') {
          const { bundle, object } = await bundleDownload(env, owner, path[1]);
          return new Response(object.body, {
            headers: {
              'Content-Type': 'application/zip',
              'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(bundle.filename)}`,
              'Cache-Control': 'private, no-store',
              'X-Content-Type-Options': 'nosniff'
            }
          });
        }
        if (method === 'GET' && path[1]) {
          const detail = await bundleDetail(env, owner, path[1]);
          const jobs = await env.DB.prepare(
            'SELECT * FROM analysis_jobs WHERE owner_id=? AND bundle_id=? ORDER BY created_at DESC LIMIT 10'
          )
            .bind(owner, path[1])
            .all<any>();
          return json({ ...detail, jobs: jobs.results.map(publicJob) });
        }
        if (method === 'POST' && path[1] && path[2] === 'analyze') {
          const input = z
            .object({ id: z.string().uuid(), confirmed: z.literal(true) })
            .strict()
            .parse(JSON.parse(new TextDecoder().decode(await readBoundedBody(request, 1000))));
          return json(await startAnalysis(env, owner, path[1], input.id), 202);
        }
      }
      if (method === 'GET' && path[0] === 'analysis' && path[1])
        return json(await pollAnalysis(env, owner, path[1]));
      if (method === 'POST' && path[0] === 'analysis' && path[1] && path[2] === 'recover')
        return json(
          await recoverAnalysis(
            env,
            owner,
            path[1],
            JSON.parse(new TextDecoder().decode(await readBoundedBody(request, 1000)))
          )
        );
      throw new BundleError('NOT_FOUND', 'This endpoint does not exist.', 404);
    });
  } catch (error) {
    const e =
      error instanceof z.ZodError
        ? new BundleError('INVALID_INPUT', 'Check the required fields.', 400)
        : providerError(error);
    return json({ error: { code: e.code, message: e.message } }, e.status);
  }
}
export const GET = handle;
export const POST = handle;

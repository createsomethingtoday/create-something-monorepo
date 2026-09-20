import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { canPlay, canRead, isSameOrigin, normalizeEmail } from '$lib/server/policy';
import {
  createTusDirectUpload,
  createStreamPlaybackToken,
  buildSignedHlsUrl
} from '$lib/server/stream';
import type { StreamConfigEnv } from '$lib/server/stream';
import { boundedText } from '$lib/server/body';

type Video = {
  id: string;
  stream_uid: string;
  title: string;
  description: string;
  series: string;
  visibility: string;
  access: string;
  ingest_status: string;
  duration: number | null;
};
const fail = (error: string, status = 400) => json({ error }, { status });
const publicVideo = ({ stream_uid: _, ...video }: Video) => video;

export const GET: RequestHandler = async ({ params, platform, locals }) => {
  const db = platform?.env.DB;
  if (params.path === 'session') return json({ identity: locals.identity });
  if (!db) return fail('The library is temporarily unavailable.', 503);
  const role = locals.identity?.role;
  if (params.path === 'videos') {
    const { results } = await db
      .prepare('SELECT * FROM videos ORDER BY created_at DESC LIMIT 200')
      .all<Video>();
    return json({ videos: results.filter((video) => canRead(video, role)).map(publicVideo) });
  }
  if (params.path === 'admin') {
    if (role !== 'admin') return fail('Administrator access required.', 403);
    const [videos, members, receipts, plays] = await Promise.all([
      db.prepare('SELECT * FROM videos ORDER BY created_at DESC LIMIT 200').all<Video>(),
      db.prepare('SELECT email, active FROM members ORDER BY email LIMIT 500').all(),
      db
        .prepare(
          'SELECT action, target, created_at FROM receipts ORDER BY created_at DESC LIMIT 30'
        )
        .all(),
      db.prepare('SELECT video_id, COUNT(*) AS grants FROM playback_events GROUP BY video_id').all()
    ]);
    return json({
      videos: videos.results.map(publicVideo),
      members: members.results,
      receipts: receipts.results,
      plays: plays.results
    });
  }
  return fail('Not found.', 404);
};

export const POST: RequestHandler = async ({
  request,
  params,
  platform,
  locals,
  cookies,
  fetch: runtimeFetch
}) => {
  if (!isSameOrigin(request)) return fail('Same-origin request required.', 403);
  const path = params.path;
  let body: Record<string, unknown>;
  if (Number(request.headers.get('content-length') || 0) > 16384)
    return fail('Request too large.', 413);
  try {
    const raw = await boundedText(request);
    body = raw ? JSON.parse(raw) : {};
    if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('Invalid request.');
  } catch (error) {
    if (error instanceof RangeError) return fail('Request too large.', 413);
    return fail('Invalid JSON.');
  }

  if (path === 'login' || path === 'refresh' || path === 'logout') {
    const refresh = cookies.get('__Host-pcn_refresh');
    if (path === 'logout') {
      cookies.delete('__Host-pcn_access', { path: '/' });
      cookies.delete('__Host-pcn_refresh', { path: '/' });
      if (refresh)
        await runtimeFetch('https://id.createsomething.space/v1/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refresh }),
          signal: AbortSignal.timeout(8000)
        }).catch(() => null);
      return json({ success: true });
    }
    if (
      path === 'login' &&
      (!normalizeEmail(body.email) ||
        typeof body.password !== 'string' ||
        body.password.length > 1024)
    )
      return fail('Enter your email and password.');
    if (path === 'refresh' && !refresh) return fail('Sign in again.', 401);
    const payload =
      path === 'login'
        ? { email: normalizeEmail(body.email), password: body.password, audience: 'agency' }
        : { refresh_token: refresh };
    try {
      const response = await runtimeFetch(`https://id.createsomething.space/v1/auth/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok)
        return fail(
          'Unable to sign in. Check your credentials or request access.',
          response.status === 429 ? 429 : 401
        );
      const data = (await response.json()) as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };
      if (!data.access_token || !data.refresh_token)
        return fail('Sign-in is temporarily unavailable.', 503);
      const options = { path: '/', httpOnly: true, secure: true, sameSite: 'lax' as const };
      cookies.set('__Host-pcn_access', data.access_token, {
        ...options,
        maxAge: Math.min(data.expires_in, 900)
      });
      cookies.set('__Host-pcn_refresh', data.refresh_token, { ...options, maxAge: 604800 });
      return json({ success: true });
    } catch {
      return fail('Sign-in is temporarily unavailable.', 503);
    }
  }

  const db = platform?.env.DB;
  if (!db) return fail('The library is temporarily unavailable.', 503);
  const role = locals.identity?.role;
  const env = platform.env as unknown as StreamConfigEnv;
  if (path === 'playback') {
    if (typeof body.id !== 'string') return fail('Choose a video.');
    const video = await db
      .prepare('SELECT * FROM videos WHERE id = ?')
      .bind(body.id)
      .first<Video>();
    if (!video || !canPlay(video, role)) return fail('Video unavailable or access required.', 404);
    try {
      // All Stream originals remain signed, even explicitly public previews.
      const expiresAt = Math.floor(Date.now() / 1000) + 60;
      const token = await createStreamPlaybackToken(env, video.stream_uid, expiresAt);
      await db
        .prepare('INSERT INTO playback_events (id, video_id) VALUES (?, ?)')
        .bind(crypto.randomUUID(), video.id)
        .run();
      return json({ hlsUrl: buildSignedHlsUrl(token.token), expiresAt });
    } catch {
      return fail('Playback is temporarily unavailable. Please try again.', 503);
    }
  }
  if (role !== 'admin') return fail('Administrator access required.', 403);
  const actor = locals.identity!.subject;
  const receipt = (action: string, target: string) =>
    db
      .prepare('INSERT INTO receipts (id, actor, action, target) VALUES (?, ?, ?, ?)')
      .bind(crypto.randomUUID(), actor, action, target);
  if (path === 'members') {
    const email = normalizeEmail(body.email);
    if (!email || typeof body.active !== 'boolean')
      return fail('Enter a valid email and access state.');
    await db.batch([
      db
        .prepare(
          'INSERT INTO members (email, active) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET active = excluded.active, updated_at = CURRENT_TIMESTAMP'
        )
        .bind(email, body.active ? 1 : 0),
      receipt(body.active ? 'member.invited' : 'member.revoked', email)
    ]);
    return json({ success: true });
  }
  if (path === 'uploads') {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const size = body.size;
    if (
      !title ||
      title.length > 160 ||
      typeof size !== 'number' ||
      !Number.isSafeInteger(size) ||
      size < 1 ||
      size > 1024 ** 3
    )
      return fail('Add a title and a video up to 1 GB.');
    if (!env.CLOUDFLARE_STREAM_API_TOKEN) return fail('Uploads are not configured.', 503);
    const count = await db
      .prepare("SELECT COUNT(*) AS total FROM videos WHERE visibility != 'archived'")
      .first<{ total: number }>();
    if ((count?.total || 0) >= 20)
      return fail('Demo storage limit reached. Archive a video before adding another.', 409);
    const id = crypto.randomUUID();
    try {
      const upload = await createTusDirectUpload(env, {
        uploadLength: size,
        fileName: title,
        creatorId: id,
        maxDurationSeconds: 1800,
        playbackPolicy: 'private',
        meta: { network: 'cs-private-pcn', videoId: id }
      });
      await db.batch([
        db
          .prepare(
            'INSERT INTO videos (id, stream_uid, title, description, series) VALUES (?, ?, ?, ?, ?)'
          )
          .bind(
            id,
            upload.streamUid,
            title,
            String(body.description || '').slice(0, 2000),
            String(body.series || 'Field notes').slice(0, 100)
          ),
        receipt('upload.created', id)
      ]);
      return json({ id, uploadUrl: upload.uploadUrl });
    } catch {
      return fail('Upload could not be initialized. Please try again.', 503);
    }
  }
  if (path === 'videos/status' || path === 'videos/publish') {
    if (typeof body.id !== 'string') return fail('Choose a video.');
    const video = await db
      .prepare('SELECT * FROM videos WHERE id = ?')
      .bind(body.id)
      .first<Video>();
    if (!video) return fail('Video not found.', 404);
    if (path === 'videos/status') {
      try {
        const response = await runtimeFetch(
          `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream/${video.stream_uid}`,
          {
            headers: { Authorization: `Bearer ${env.CLOUDFLARE_STREAM_API_TOKEN}` },
            signal: AbortSignal.timeout(10000)
          }
        );
        const data = (await response.json()) as {
          success: boolean;
          result: {
            readyToStream: boolean;
            requireSignedURLs: boolean;
            duration?: number;
            status?: { state: string };
          };
        };
        if (!response.ok || !data.success || !data.result.requireSignedURLs)
          return fail('Private media configuration could not be verified.', 409);
        const status = data.result.readyToStream
          ? 'ready'
          : data.result.status?.state === 'error'
            ? 'failed'
            : 'processing';
        await db
          .prepare(
            'UPDATE videos SET ingest_status = ?, duration = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
          )
          .bind(status, data.result.duration || null, video.id)
          .run();
        return json({ status });
      } catch {
        return fail('Processing status is temporarily unavailable.', 503);
      }
    }
    if (
      !['draft', 'published', 'archived'].includes(String(body.visibility)) ||
      !['public', 'members'].includes(String(body.access))
    )
      return fail('Invalid publication settings.');
    if (body.visibility === 'published' && video.ingest_status !== 'ready')
      return fail('Wait for processing before publishing.', 409);
    await db.batch([
      db
        .prepare(
          'UPDATE videos SET visibility = ?, access = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        )
        .bind(body.visibility, body.access, video.id),
      receipt(`video.${body.visibility}`, video.id)
    ]);
    return json({ success: true });
  }
  return fail('Not found.', 404);
};

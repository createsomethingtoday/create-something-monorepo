import { withinDeliveryAllowance } from '$lib/server/usage';
import { paidAccess } from '$lib/server/billing';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
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
  const networkId = locals.network?.id || 'default';
  if (params.path === 'videos') {
    if (locals.network?.status !== 'active' && role !== 'admin' && locals.network)
      return json({ videos: [] });
    const { results } = await db
      .prepare('SELECT * FROM videos WHERE network_id = ? ORDER BY created_at DESC LIMIT 200')
      .bind(networkId)
      .all<Video>();
    return json({ videos: results.filter((video) => canRead(video, role)).map(publicVideo) });
  }
  if (params.path === 'admin') {
    if (role !== 'admin') return fail('Administrator access required.', 403);
    const [videos, members, receipts, plays, reservations] = await Promise.all([
      db
        .prepare('SELECT * FROM videos WHERE network_id = ? ORDER BY created_at DESC LIMIT 200')
        .bind(networkId)
        .all<Video>(),
      db
        .prepare('SELECT email, active FROM members WHERE network_id = ? ORDER BY email LIMIT 500')
        .bind(networkId)
        .all(),
      db
        .prepare(
          'SELECT action, target, created_at FROM receipts WHERE network_id = ? ORDER BY created_at DESC LIMIT 30'
        )
        .bind(networkId)
        .all(),
      db
        .prepare(
          'SELECT video_id, COUNT(*) AS grants FROM playback_events WHERE network_id = ? GROUP BY video_id'
        )
        .bind(networkId)
        .all(),
      db
        .prepare(
          'SELECT id,title,state,created_at FROM upload_reservations WHERE network_id=? ORDER BY created_at'
        )
        .bind(networkId)
        .all()
    ]);
    return json({
      videos: videos.results.map(publicVideo),
      members: members.results,
      receipts: receipts.results,
      plays: plays.results,
      reservations: reservations.results
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
  const networkId = locals.network?.id || 'default';
  const env = platform.env as unknown as StreamConfigEnv;
  if (path === 'playback') {
    if (locals.network && locals.network.status !== 'active')
      return fail('Network is not active.', 403);
    if (typeof body.id !== 'string') return fail('Choose a video.');
    const video = await db
      .prepare('SELECT * FROM videos WHERE id = ? AND network_id = ?')
      .bind(body.id, networkId)
      .first<Video>();
    if (!video || !canPlay(video, role)) return fail('Video unavailable or access required.', 404);
    try {
      if (locals.network && !(await paidAccess(platform!.env, locals.network)))
        return fail('This network needs an active subscription.', 403);
      if (!(await withinDeliveryAllowance(platform!.env, networkId)))
        return fail('This network has reached its monthly video delivery allowance.', 403);
      // All Stream originals remain signed, even explicitly public previews.
      const expiresAt = Math.floor(Date.now() / 1000) + 60;
      const token = await createStreamPlaybackToken(env, video.stream_uid, expiresAt);
      await db
        .prepare('INSERT INTO playback_events (id, video_id, network_id) VALUES (?, ?, ?)')
        .bind(crypto.randomUUID(), video.id, networkId)
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
      .prepare(
        'INSERT INTO receipts (id, actor, action, target, network_id) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(crypto.randomUUID(), actor, action, target, networkId);
  if (path === 'members') {
    const email = normalizeEmail(body.email);
    if (!email || typeof body.active !== 'boolean')
      return fail('Enter a valid email and access state.');
    try {
      await db.batch([
        db
          .prepare(
            'INSERT INTO members (network_id, email, active) VALUES (?, ?, ?) ON CONFLICT(network_id,email) DO UPDATE SET active = excluded.active, updated_at = CURRENT_TIMESTAMP'
          )
          .bind(networkId, email, body.active ? 1 : 0),
        receipt(body.active ? 'member.invited' : 'member.revoked', email)
      ]);
    } catch (error) {
      if (String(error).includes('member_capacity_reached'))
        return fail(
          'This network includes 100 active members. Revoke an existing membership before inviting someone else.',
          409
        );
      return fail('Membership could not be saved. Please try again.', 503);
    }
    return json({ success: true });
  }
  if (path === 'uploads') {
    if (locals.network && locals.network.status !== 'active')
      return fail('Publishing is not active for this network.', 403);
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
    try {
      if (locals.network && !(await paidAccess(platform!.env, locals.network)))
        return fail('This network needs an active subscription.', 403);
    } catch {
      return fail('Subscription status is temporarily unavailable.', 503);
    }
    const id = crypto.randomUUID();
    const reservation = await db
      .prepare(
        `INSERT INTO upload_reservations(id,network_id,title)
      SELECT ?,?,? WHERE (SELECT COUNT(*) FROM videos WHERE network_id=?) + (SELECT COUNT(*) FROM upload_reservations WHERE network_id=?) < 20`
      )
      .bind(id, networkId, title, networkId, networkId)
      .run();
    if (reservation.meta.changes !== 1)
      return fail(
        'Network storage is full or reserved by pending uploads. Remove stored media or resolve pending uploads before adding another session.',
        409
      );
    try {
      const upload = await createTusDirectUpload(env, {
        uploadLength: size,
        fileName: title,
        creatorId: networkId,
        maxDurationSeconds: 1800,
        playbackPolicy: 'private',
        meta: { network: networkId, videoId: id }
      });
      await db.batch([
        db
          .prepare(
            'INSERT INTO videos (id, stream_uid, title, description, series, network_id) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .bind(
            id,
            upload.streamUid,
            title,
            String(body.description || '').slice(0, 2000),
            String(body.series || 'Agent engineering').slice(0, 100),
            networkId
          ),
        receipt('upload.created', id),
        db
          .prepare('DELETE FROM upload_reservations WHERE id=? AND network_id=?')
          .bind(id, networkId)
      ]);
      return json({ id, uploadUrl: upload.uploadUrl });
    } catch {
      await db
        .prepare("UPDATE upload_reservations SET state='uncertain' WHERE id=?")
        .bind(id)
        .run();
      return fail(
        'Upload initialization could not be confirmed. Its storage slot is reserved until the provider result is reconciled. Contact support with reference ' +
          id +
          '.',
        503
      );
    }
  }
  if (path === 'uploads/reconcile') {
    if (typeof body.id !== 'string') return fail('Choose an upload reference.');
    const reservation = await db
      .prepare('SELECT * FROM upload_reservations WHERE id=? AND network_id=?')
      .bind(body.id, networkId)
      .first<{ id: string; title: string; created_at: string }>();
    if (!reservation) return json({ success: true });
    if (Date.now() - Date.parse(reservation.created_at.replace(' ', 'T') + 'Z') < 120000)
      return fail('Give the provider two minutes to finish initializing, then check again.', 409);
    try {
      const response = await runtimeFetch(
        `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream?creator=${encodeURIComponent(networkId)}&limit=1000`,
        {
          headers: { Authorization: `Bearer ${env.CLOUDFLARE_STREAM_API_TOKEN}` },
          signal: AbortSignal.timeout(10000)
        }
      );
      const result = (await response.json()) as {
        success: boolean;
        result: Array<{
          uid: string;
          creator: string;
          requireSignedURLs: boolean;
          meta?: { network?: string; videoId?: string };
        }>;
      };
      if (
        !response.ok ||
        !result.success ||
        !Array.isArray(result.result) ||
        result.result.length >= 1000
      )
        throw new Error('Provider inventory unavailable');
      const matches = result.result.filter((v) => v.meta?.videoId === reservation.id);
      if (matches.length > 1) throw new Error('Multiple assets require support');
      if (matches.length === 1) {
        const asset = matches[0];
        if (
          !asset.requireSignedURLs ||
          asset.creator !== networkId ||
          asset.meta?.network !== networkId
        )
          throw new Error('Asset ownership unavailable');
        await db.batch([
          db
            .prepare(
              'INSERT INTO videos(id,stream_uid,title,network_id) VALUES(?,?,?,?) ON CONFLICT(id) DO NOTHING'
            )
            .bind(reservation.id, asset.uid, reservation.title, networkId),
          db
            .prepare('DELETE FROM upload_reservations WHERE id=? AND network_id=?')
            .bind(reservation.id, networkId),
          receipt('upload.reconciled', reservation.id)
        ]);
      } else {
        await db.batch([
          db
            .prepare('DELETE FROM upload_reservations WHERE id=? AND network_id=?')
            .bind(reservation.id, networkId),
          receipt('upload.absent', reservation.id)
        ]);
      }
      return json({ success: true });
    } catch {
      return fail(
        'The provider result is still unconfirmed. Your storage reservation is preserved; try again later.',
        503
      );
    }
  }
  if (path === 'videos/delete') {
    if (typeof body.id !== 'string' || body.confirm !== true)
      return fail('Confirm permanent deletion of this session.');
    const video = await db
      .prepare('SELECT * FROM videos WHERE id=? AND network_id=?')
      .bind(body.id, networkId)
      .first<Video>();
    if (!video) return fail('Session not found.', 404);
    if (body.title !== video.title)
      return fail('The session changed. Refresh before confirming deletion.', 409);
    if (!env.CLOUDFLARE_STREAM_API_TOKEN) return fail('Media deletion is not configured.', 503);
    await db
      .prepare("UPDATE videos SET visibility='archived' WHERE id=? AND network_id=?")
      .bind(video.id, networkId)
      .run();
    try {
      const response = await runtimeFetch(
        `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream/${encodeURIComponent(video.stream_uid)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${env.CLOUDFLARE_STREAM_API_TOKEN}` },
          signal: AbortSignal.timeout(10000)
        }
      );
      if (response.status !== 404) {
        const result = (await response.json()) as { success?: boolean };
        if (!response.ok || result.success !== true) throw new Error('Deletion unconfirmed');
      }
      await db.batch([
        db
          .prepare('DELETE FROM playback_events WHERE video_id=? AND network_id=?')
          .bind(video.id, networkId),
        db.prepare('DELETE FROM videos WHERE id=? AND network_id=?').bind(video.id, networkId),
        receipt('video.deleted', video.id)
      ]);
      return json({ success: true });
    } catch {
      return fail(
        'The session is archived. Permanent deletion could not be confirmed; retry to finish removing it.',
        503
      );
    }
  }
  if (path === 'videos/status' || path === 'videos/publish') {
    if (typeof body.id !== 'string') return fail('Choose a video.');
    const video = await db
      .prepare('SELECT * FROM videos WHERE id = ? AND network_id = ?')
      .bind(body.id, networkId)
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
        if (
          data.result.readyToStream &&
          (typeof data.result.duration !== 'number' ||
            data.result.duration <= 0 ||
            data.result.duration > 1800)
        )
          return fail('Session duration must be confirmed and no longer than 30 minutes.', 409);
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
    if (
      body.access === 'public' &&
      locals.network?.access_model === 'members' &&
      locals.network.id !== 'default'
    )
      return fail('Enable public previews in network settings first.', 409);
    if (body.visibility === 'published' && locals.network && locals.network.status !== 'active')
      return fail('Publishing is not active for this network.', 403);
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

import { json } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';
import { canRead } from './policy';
import type { CatalogVideo } from '$lib/client';

export interface LearningPath {
  id: string;
  title: string;
  outcome: string;
  prerequisites: string;
  estimated_minutes: number;
  lesson_ids: string;
  visibility: string;
  revision: number;
}
const fail = (message: string, status = 400) => json({ error: message }, { status });
const network = (locals: App.Locals) => locals.network?.id || 'default';
const admitted = (locals: App.Locals) =>
  !!locals.identity &&
  (locals.identity.role === 'admin' ||
    (locals.identity.role === 'member' && (!locals.network || locals.network.status === 'active')));
const columns = 'id,title,description,series,access,visibility,ingest_status,duration';
async function pathView(
  db: D1Database,
  locals: App.Locals,
  path: LearningPath,
  available?: CatalogVideo[]
) {
  const admin = locals.identity?.role === 'admin';
  if (!admitted(locals) || (!admin && path.visibility !== 'published')) return null;
  const ids = JSON.parse(path.lesson_ids) as string[];
  const videos =
    available ||
    (
      await db
        .prepare(
          `SELECT ${columns} FROM videos WHERE network_id=? AND id IN (SELECT value FROM json_each(?))`
        )
        .bind(network(locals), path.lesson_ids)
        .all<CatalogVideo>()
    ).results;
  const lessons: CatalogVideo[] = [];
  for (const id of ids) {
    const video = videos.find((v) => v.id === id);
    if (!video) {
      if (admin) continue;
      return null;
    }
    if (!canRead(video, locals.identity?.role)) return null;
    lessons.push(video);
  }
  return { ...path, lesson_ids: ids, lessons, missingLessonCount: ids.length - lessons.length };
}
export async function learningGet(db: D1Database, locals: App.Locals, route: string) {
  if (route === 'learning/continue') {
    if (!admitted(locals)) return json({ lessons: [] });
    const rows = await db
      .prepare(
        `SELECT ${columns
          .split(',')
          .map((c) => 'v.' + c)
          .join(
            ','
          )},p.position,p.watched_at,p.practice_started_at,p.updated_at FROM lesson_progress p JOIN videos v ON v.id=p.video_id AND v.network_id=p.network_id WHERE p.network_id=? AND p.subject=? ORDER BY p.updated_at DESC,v.id LIMIT 100`
      )
      .bind(network(locals), locals.identity!.subject)
      .all<CatalogVideo & LessonProgress>();
    return json({
      lessons: rows.results.filter((v) => canRead(v, locals.identity!.role)).slice(0, 4)
    });
  }
  if (route === 'learning/paths') {
    if (!admitted(locals)) return json({ paths: [] });
    const rows = await db
      .prepare(
        'SELECT * FROM learning_paths WHERE network_id=? ORDER BY updated_at DESC,id LIMIT 50'
      )
      .bind(network(locals))
      .all<LearningPath>();
    const videos = await db
      .prepare(`SELECT ${columns} FROM videos WHERE network_id=?`)
      .bind(network(locals))
      .all<CatalogVideo>();
    const paths = (
      await Promise.all(rows.results.map((row) => pathView(db, locals, row, videos.results)))
    ).filter(Boolean);
    return json({ paths });
  }
  if (route.startsWith('learning/paths/')) {
    if (!admitted(locals)) return fail('Learning path unavailable or access required.', 404);
    const row = await db
      .prepare('SELECT * FROM learning_paths WHERE id=? AND network_id=?')
      .bind(route.slice('learning/paths/'.length), network(locals))
      .first<LearningPath>();
    const path = row ? await pathView(db, locals, row) : null;
    if (!path) return fail('Learning path unavailable or access required.', 404);
    const progress = await db
      .prepare(
        'SELECT video_id,position,watched_at,practice_started_at,updated_at FROM lesson_progress WHERE network_id=? AND subject=? AND video_id IN (SELECT value FROM json_each(?))'
      )
      .bind(network(locals), locals.identity!.subject, JSON.stringify(path.lesson_ids))
      .all<LessonProgress & { video_id: string }>();
    return json({
      ...path,
      lessons: path.lessons.map((v) => ({
        ...v,
        progress: progress.results.find((p) => p.video_id === v.id) || null
      }))
    });
  }
  return fail('Not found.', 404);
}
export async function learningPost(
  db: D1Database,
  locals: App.Locals,
  route: string,
  body: Record<string, unknown>
) {
  if (route === 'learning/progress') return progressWrite(db, locals, body);
  if (route !== 'learning/paths/save') return fail('Not found.', 404);
  if (
    locals.identity?.role !== 'admin' ||
    locals.impersonation ||
    locals.network?.kind === 'support'
  )
    return fail('Creator access required.', 403);
  const limits = { title: 120, outcome: 1000, prerequisites: 2000 };
  for (const [key, max] of Object.entries(limits))
    if (
      typeof body[key] !== 'string' ||
      body[key].length > max ||
      (key !== 'prerequisites' && !body[key].trim())
    )
      return fail('Check the path title, outcome and prerequisites.');
  if (
    !Number.isInteger(body.estimated_minutes) ||
    Number(body.estimated_minutes) < 1 ||
    Number(body.estimated_minutes) > 10000
  )
    return fail('Enter an estimated effort between 1 and 10,000 minutes.');
  if (
    !Array.isArray(body.lesson_ids) ||
    body.lesson_ids.length < 1 ||
    body.lesson_ids.length > 30 ||
    new Set(body.lesson_ids).size !== body.lesson_ids.length ||
    body.lesson_ids.some((id) => typeof id !== 'string' || id.length > 100)
  )
    return fail('Choose 1–30 distinct lessons in order.');
  if (!['draft', 'published', 'archived'].includes(String(body.visibility)))
    return fail('Choose a path visibility.');
  for (const id of body.lesson_ids) {
    const video = await db
      .prepare(`SELECT ${columns} FROM videos WHERE id=? AND network_id=?`)
      .bind(id, network(locals))
      .first<CatalogVideo>();
    if (!video) return fail('A selected lesson is unavailable in this network.', 400);
    if (
      body.visibility === 'published' &&
      (video.visibility !== 'published' ||
        video.ingest_status !== 'ready' ||
        !['members', 'public'].includes(video.access))
    )
      return fail('Publish each lesson for members or public preview before publishing this path.');
  }
  if (body.id !== undefined && (typeof body.id !== 'string' || body.id.length > 100))
    return fail('Invalid path.');
  const id = typeof body.id === 'string' && body.id ? body.id : crypto.randomUUID();
  const values = [
    String(body.title).trim(),
    String(body.outcome).trim(),
    String(body.prerequisites).trim(),
    body.estimated_minutes,
    JSON.stringify(body.lesson_ids),
    body.visibility
  ];
  if (body.id && !Number.isInteger(body.revision))
    return fail('Reload this path before saving.', 409);
  const mutation = body.id
    ? db
        .prepare(
          'UPDATE learning_paths SET title=?,outcome=?,prerequisites=?,estimated_minutes=?,lesson_ids=?,visibility=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND network_id=? AND revision=?'
        )
        .bind(...values, id, network(locals), body.revision)
    : db
        .prepare(
          'INSERT INTO learning_paths (id,network_id,title,outcome,prerequisites,estimated_minutes,lesson_ids,visibility) SELECT ?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM learning_paths WHERE network_id=?)<50'
        )
        .bind(id, network(locals), ...values, network(locals));
  // The mutation and its receipt commit together. A rejected stale/capacity write
  // must not create an audit receipt or an unreported partial save.
  const [result] = await db.batch([
    mutation,
    db
      .prepare(
        'INSERT INTO receipts(id,actor,action,target,network_id) SELECT ?,?,?,?,? WHERE changes()=1'
      )
      .bind(
        crypto.randomUUID(),
        locals.identity.subject,
        'learning_path.saved',
        id,
        network(locals)
      )
  ]);
  if (!result.meta.changes)
    return fail(
      body.id
        ? 'This path changed or is unavailable. Reload before saving.'
        : 'This network has reached its 50-path limit.',
      409
    );
  return json({ id });
}

export interface LessonProgress {
  position: number;
  watched_at: string | null;
  practice_started_at: string | null;
  updated_at: string;
}
export async function progressFor(db: D1Database, locals: App.Locals, videoId: string) {
  if (!admitted(locals)) return null;
  return (
    (await db
      .prepare(
        'SELECT position,watched_at,practice_started_at,updated_at FROM lesson_progress WHERE network_id=? AND subject=? AND video_id=?'
      )
      .bind(network(locals), locals.identity!.subject, videoId)
      .first<LessonProgress>()) || null
  );
}
async function progressWrite(db: D1Database, locals: App.Locals, body: Record<string, unknown>) {
  if (!admitted(locals) || locals.impersonation)
    return fail('Lesson unavailable or access required.', 404);
  if (typeof body.id !== 'string' || body.id.length > 100) return fail('Choose a lesson.');
  const video = await db
    .prepare(`SELECT ${columns} FROM videos WHERE id=? AND network_id=?`)
    .bind(body.id, network(locals))
    .first<CatalogVideo>();
  if (!video || !canRead(video, locals.identity!.role))
    return fail('Lesson unavailable or access required.', 404);
  const key = [network(locals), locals.identity!.subject, body.id];
  if (body.action === 'position') {
    if (
      typeof body.position !== 'number' ||
      !Number.isFinite(body.position) ||
      body.position < 0 ||
      !video.duration ||
      body.position > video.duration
    )
      return fail('Playback position is outside this lesson.');
    await db
      .prepare(
        `INSERT INTO lesson_progress(network_id,subject,video_id,position) VALUES(?,?,?,?)
      ON CONFLICT(network_id,subject,video_id) DO UPDATE SET position=excluded.position,updated_at=CURRENT_TIMESTAMP`
      )
      .bind(...key, body.position)
      .run();
  } else if (body.action === 'watched' && typeof body.watched === 'boolean') {
    await db
      .prepare(
        `INSERT INTO lesson_progress(network_id,subject,video_id,watched_at) VALUES(?,?,?,CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END)
      ON CONFLICT(network_id,subject,video_id) DO UPDATE SET watched_at=excluded.watched_at,updated_at=CURRENT_TIMESTAMP`
      )
      .bind(...key, body.watched ? 1 : 0)
      .run();
  } else if (body.action === 'practice') {
    const material = await db
      .prepare('SELECT practice FROM lesson_material WHERE network_id=? AND video_id=?')
      .bind(network(locals), body.id)
      .first<{ practice: string }>();
    if (!material?.practice) return fail('This lesson has no practice task yet.');
    await db
      .prepare(
        `INSERT INTO lesson_progress(network_id,subject,video_id,practice_started_at) VALUES(?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(network_id,subject,video_id) DO UPDATE SET practice_started_at=COALESCE(lesson_progress.practice_started_at,excluded.practice_started_at),updated_at=CURRENT_TIMESTAMP`
      )
      .bind(...key)
      .run();
  } else return fail('Choose a progress action.');
  return json({ progress: await progressFor(db, locals, body.id) });
}

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateManifest } from '$lib/assets';
import { findAsset, requireOwner } from '$lib/server/builder-assets';
import { isSameOrigin } from '$lib/server/policy';
const MAX = 16 * 1024 * 1024;
export const POST: RequestHandler = async ({ request, locals, platform, params }) => {
  if (!isSameOrigin(request))
    return json({ error: 'Same-origin request required.' }, { status: 403 });
  requireOwner(locals);
  const db = platform?.env.DB,
    bucket = platform?.env.ASSET_PACKAGES;
  if (!db || !bucket)
    return json(
      { error: 'Private package storage is not configured yet. Your draft is saved.' },
      { status: 503 }
    );
  const asset = await findAsset(db, locals.network!, params.id);
  if (!asset) return json({ error: 'Asset not found.' }, { status: 404 });
  // Bound bytes before multipart parsing; Content-Length alone is not trusted.
  const reader = request.body?.getReader();
  if (!reader) return json({ error: 'Choose a ZIP package.' }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX + 32768) {
        await reader.cancel();
        return json({ error: 'Package must be 16 MiB or smaller.' }, { status: 413 });
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  let form: FormData;
  try {
    form = await new Response(bytes, {
      headers: { 'Content-Type': request.headers.get('Content-Type') || '' }
    }).formData();
  } catch {
    return json(
      { error: 'Choose a ZIP package and complete the release details.' },
      { status: 400 }
    );
  }
  const file = form.get('package');
  const version = form.get('version');
  let manifest;
  try {
    manifest = validateManifest(JSON.parse(String(form.get('manifest'))));
  } catch {
    /* invalid */
  }
  if (
    !(file instanceof File) ||
    !file.name.toLowerCase().endsWith('.zip') ||
    file.size > MAX ||
    file.size < 4 ||
    typeof version !== 'string' ||
    !/^(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,3})$/.test(version) ||
    !manifest
  )
    return json(
      {
        error: 'Use a ZIP up to 16 MiB, a version such as 1.0.0, and complete every release field.'
      },
      { status: 400 }
    );
  const content = await file.arrayBuffer();
  const signature = new Uint8Array(content, 0, 4);
  if (signature[0] !== 0x50 || signature[1] !== 0x4b || signature[2] !== 3 || signature[3] !== 4)
    return json({ error: 'The file does not have a ZIP file signature.' }, { status: 400 });
  // A ZIP signature is a format check, not a security or compatibility certification.
  const existing = await db
    .prepare('SELECT id FROM asset_releases WHERE network_id=? AND asset_id=? AND version=?')
    .bind(asset.network_id, asset.id, version)
    .first();
  if (existing)
    return json(
      { error: 'That version already exists. Releases cannot be overwritten.' },
      { status: 409 }
    );
  const id = crypto.randomUUID(),
    key = `${asset.network_id}/${asset.id}/${id}.zip`;
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', content)), (v) =>
    v.toString(16).padStart(2, '0')
  ).join('');
  try {
    await db
      .prepare(
        'INSERT INTO asset_uploads(id,network_id,asset_id,version,manifest,object_key,sha256,size_bytes) VALUES(?,?,?,?,?,?,?,?)'
      )
      .bind(id, asset.network_id, asset.id, version, JSON.stringify(manifest), key, hash, file.size)
      .run();
  } catch (e) {
    if (/release_capacity|release_exists|UNIQUE constraint/.test(String(e)))
      return json(
        {
          error:
            'That version exists or is awaiting recovery, or the five-release limit has been reached.'
        },
        { status: 409 }
      );
    throw e;
  }
  try {
    await bucket.put(key, content, {
      httpMetadata: { contentType: 'application/zip' },
      customMetadata: { sha256: hash }
    });
  } catch {
    return json(
      { error: 'Upload could not be confirmed. Use Recover uploads before retrying this version.' },
      { status: 503 }
    );
  }
  try {
    await db.batch([
      db
        .prepare(
          'INSERT INTO asset_releases(id,network_id,asset_id,version,manifest,object_key,sha256,size_bytes) VALUES(?,?,?,?,?,?,?,?)'
        )
        .bind(
          id,
          asset.network_id,
          asset.id,
          version,
          JSON.stringify(manifest),
          key,
          hash,
          file.size
        ),
      db
        .prepare('INSERT INTO receipts(id,actor,action,target,network_id) VALUES(?,?,?,?,?)')
        .bind(crypto.randomUUID(), locals.identity!.subject, 'asset.release', id, asset.network_id),
      db.prepare('DELETE FROM asset_uploads WHERE id=?').bind(id)
    ]);
  } catch (e) {
    // Reconcile an uncertain DB commit before deleting the exact new object.
    const committed = await db
      .prepare('SELECT id FROM asset_releases WHERE id=? AND object_key=?')
      .bind(id, key)
      .first();
    if (!committed) {
      await bucket.delete(key);
      await db.prepare('DELETE FROM asset_uploads WHERE id=?').bind(id).run();
      if (/release_capacity|UNIQUE constraint/.test(String(e)))
        return json(
          {
            error: 'A release with that version exists, or the five-release limit has been reached.'
          },
          { status: 409 }
        );
      throw e;
    }
  }
  return json({ id }, { status: 201 });
};

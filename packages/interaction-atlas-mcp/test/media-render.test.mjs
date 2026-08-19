import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import { ATLAS_TRANSCRIPT_EDITOR_SCHEMA } from '@create-something/atlas-composition';
import { buildAtlasLocalRenderPlan, renderAtlasMediaProject, startAtlasLocalAssetServer } from '../dist/studio/media-render.js';

function projectFixture() {
  return {
    schema: ATLAS_TRANSCRIPT_EDITOR_SCHEMA,
    id: 'render-project',
    atlasSessionId: 'atlas-session',
    currentRevisionId: 'revision-1',
    sourceAssets: [{
      id: 'source-1', uri: 'fixture://private/source.mp4', sha256: 'fixture-hash',
      media: { durationUs: 5_000_000, width: 640, height: 360, hasAudio: true }
    }],
    transcriptSegments: [{
      id: 'segment-1', assetId: 'source-1', startUs: 0, endUs: 5_000_000, text: 'Synthetic source.'
    }],
    revisions: [{
      id: 'revision-1', parentRevisionId: null, createdAt: '2026-08-14T00:00:00.000Z', createdBy: 'operator',
      cutList: [{ id: 'keep-1', kind: 'keep', transcriptSegmentIds: ['segment-1'], startUs: 0, endUs: 5_000_000, reason: 'Keep source.' }],
      captions: [{ id: 'caption-1', segmentIds: ['segment-1'] }], overlays: [],
      graph: {
        nodes: [
          { id: 'source', kind: 'source-asset' },
          { id: 'transcript', kind: 'transcript' },
          { id: 'cut-list', kind: 'cut-list' },
          { id: 'timeline', kind: 'timeline' },
          { id: 'clip:keep-1', kind: 'clip', cutOperationId: 'keep-1', diffs: [{ id: 'diff:keep-1:created', at: '2026-08-14T00:00:00.000Z', event: 'created', actor: 'operator', summary: 'Created source clip.', after: { cutOperationId: 'keep-1' } }] }
        ],
        edges: [
          { id: 'source-to-transcript', source: 'source', target: 'transcript', port: 'produces' },
          { id: 'transcript-to-cut-list', source: 'transcript', target: 'cut-list', port: 'produces' },
          { id: 'cut-list-to-clip', source: 'cut-list', target: 'clip:keep-1', port: 'produces' },
          { id: 'clip-to-timeline', source: 'clip:keep-1', target: 'timeline', port: 'produces' }
        ]
      }
    }],
    proposals: [],
    receipts: []
  };
}

test('local render plans are deterministic and invalidate on renderer-relevant changes', () => {
  const project = projectFixture();
  const input = { requestId: 'request-1', requestedAt: '2026-08-14T00:00:01.000Z', width: 640, height: 360, fps: 30 };
  const first = buildAtlasLocalRenderPlan(project, input, '/tmp/atlas-render-plan-test');
  const same = buildAtlasLocalRenderPlan(project, { ...input, requestId: 'request-2' }, '/tmp/atlas-render-plan-test');
  const changedSize = buildAtlasLocalRenderPlan(project, { ...input, width: 1280 }, '/tmp/atlas-render-plan-test');
  const changedEdit = structuredClone(project);
  changedEdit.revisions[0].cutList[0].endUs = 4_000_000;
  const changedTimeline = buildAtlasLocalRenderPlan(changedEdit, input, '/tmp/atlas-render-plan-test');

  assert.equal(first.receipt.request.cacheKey, same.receipt.request.cacheKey);
  assert.notEqual(first.receipt.request.cacheKey, changedSize.receipt.request.cacheKey);
  assert.notEqual(first.receipt.request.cacheKey, changedTimeline.receipt.request.cacheKey);
  assert.equal(first.props.clips[0].nodeId, 'clip:keep-1');
  assert.equal(first.receipt.request.output.width, 640);
  assert.match(first.receipt.request.output.path, /media-projects\/render-project\/renders/);
});

test('a verified local render cache hit retains a distinct receipt for the repeat request', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'atlas-render-cache-'));
  const project = projectFixture();
  const initial = buildAtlasLocalRenderPlan(project, {
    requestId: 'request-first', requestedAt: '2026-08-14T00:00:01.000Z', width: 640, height: 360, fps: 30
  }, directory);
  const bytes = Buffer.from('verified-local-render');
  try {
    await mkdir(path.dirname(initial.receipt.request.output.path), { recursive: true });
    await writeFile(initial.receipt.request.output.path, bytes);
    project.receipts.push({
      ...initial.receipt,
      status: 'completed',
      completedAt: '2026-08-14T00:00:02.000Z',
      outputSha256: createHash('sha256').update(bytes).digest('hex'),
      inspection: {
        inspectedAt: '2026-08-14T00:00:02.000Z', tool: 'ffprobe', durationUs: 1_000_000,
        width: 640, height: 360, videoCodec: 'h264', audioStreams: 1
      }
    });
    const result = await renderAtlasMediaProject(project, {
      requestId: 'request-repeat', requestedAt: '2026-08-14T00:01:00.000Z', width: 640, height: 360, fps: 30
    }, directory);
    assert.equal(result.receipt.cacheHit, true);
    assert.equal(result.receipt.request.id, 'request-repeat');
    assert.equal(result.project.receipts.length, 2);
    assert.equal(result.project.receipts.at(-1)?.cacheHit, true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('local source server serves file assets without exposing a file URI to Remotion', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'atlas-local-asset-'));
  const sourcePath = path.join(directory, 'source.mp4');
  const content = Buffer.from('local-private-media-fixture');
  await writeFile(sourcePath, content);
  const project = projectFixture();
  project.sourceAssets[0].uri = pathToFileURL(sourcePath).href;
  const server = await startAtlasLocalAssetServer(project);
  try {
    const sourceUrl = server.sourceUrls.get('source-1');
    assert.match(sourceUrl, /^http:\/\/127\.0\.0\.1:\d+\/asset\/source-1$/);
    const full = await fetch(sourceUrl);
    assert.equal(full.status, 200);
    assert.deepEqual(Buffer.from(await full.arrayBuffer()), content);
    const ranged = await fetch(sourceUrl, { headers: { range: 'bytes=0-4' } });
    assert.equal(ranged.status, 206);
    assert.equal(ranged.headers.get('content-range'), `bytes 0-4/${content.length}`);
    assert.deepEqual(Buffer.from(await ranged.arrayBuffer()), content.subarray(0, 5));
  } finally {
    await server.close();
    await rm(directory, { recursive: true, force: true });
  }
});

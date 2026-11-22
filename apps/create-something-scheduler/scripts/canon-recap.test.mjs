import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, stat, writeFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectMeeting, renderRecap, savePrivate } from './canon-recap.mjs';
const conference = 'conferenceRecords/selected';
const transcript = `${conference}/transcripts/t1`;
function fixture({ state = 'FILE_GENERATED', end = true, failure = false, repeat = false } = {}) {
  const calls = [];
  return {
    calls,
    fetchImpl: async (url, options) => {
      calls.push([url.toString(), options]);
      if (failure) return { ok: false, status: 403 };
      const path = url.pathname.slice(4);
      const page = url.searchParams.get('pageToken');
      let data;
      if (path === conference)
        data = { name: conference, endTime: end ? '2026-11-22T12:00:00Z' : undefined };
      else if (path.endsWith('/participants'))
        data = {
          participants: [
            { name: `${conference}/participants/p1`, signedinUser: { displayName: 'Host' } }
          ]
        };
      else if (path.endsWith('/transcripts')) data = { transcripts: [{ name: transcript, state }] };
      else
        data = {
          transcriptEntries: [
            {
              name: `${transcript}/entries/${page ? 'e2' : 'e1'}`,
              participant: `${conference}/participants/p1`,
              startTime: page ? '2026-11-22T11:02:00Z' : '2026-11-22T11:01:00Z',
              text: page ? 'We agreed to review.' : 'I will send a draft.'
            }
          ],
          nextPageToken: !page || repeat ? 'next' : undefined
        };
      return { ok: true, json: async () => data };
    }
  };
}
test('explicit ended conference, pagination, speaker attribution and source quotes', async () => {
  const f = fixture();
  const meeting = await collectMeeting({ conference, token: 'secret', ...f });
  assert.equal(meeting.entries.length, 2);
  assert.equal(meeting.entries[0].speaker, 'Host');
  assert.ok(
    f.calls.every(
      ([url, o]) =>
        url.startsWith(`https://meet.googleapis.com/v2/${conference}`) &&
        o.method === 'GET' &&
        o.redirect === 'error'
    )
  );
  const recap = renderRecap(meeting);
  assert.match(recap, /Possible commitments — unconfirmed/);
  assert.match(recap, /entries\/e2/);
  assert.ok(!recap.includes('secret'));
});
test('reject invalid selection, unavailable transcript, live meeting, provider failure and pagination loop', async () => {
  await assert.rejects(collectMeeting({ conference: 'spaces/all', token: 'x' }), /exactly one/);
  for (const options of [{ state: 'STARTED' }, { end: false }, { failure: true }, { repeat: true }])
    await assert.rejects(collectMeeting({ conference, token: 'x', ...fixture(options) }));
});
test('private, deterministic, duplicate-safe local files refuse modified drafts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'canon-recap-'));
  try {
    const meeting = await collectMeeting({ conference, token: 'x', ...fixture() });
    const first = await savePrivate(meeting, root);
    assert.equal(first.duplicate, false);
    assert.equal((await stat(join(first.folder, 'recap.md'))).mode & 0o777, 0o600);
    const second = await savePrivate(meeting, root);
    assert.equal(second.duplicate, true);
    assert.equal(second.folder, first.folder);
    await writeFile(join(first.folder, 'recap.md'), 'reviewed private edits');
    await assert.rejects(savePrivate(meeting, root), /refusing overwrite/);
    await chmod(root, 0o755);
    await assert.rejects(savePrivate(meeting, root), /private/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('renders inert transcript text with local evidence anchors and trusted Docs only', async () => {
  const meeting = await collectMeeting({ conference, token: 'x', ...fixture() });
  meeting.entries[0].text = 'I will ![track](https://evil.test/a) <img src="https://evil.test/b">';
  meeting.entries[0].speaker = '[evil](https://evil.test)';
  meeting.transcriptSources = [
    { exportUri: 'https://docs.google.com/document/d/abc_123/edit' },
    { exportUri: 'https://docs.google.com.evil.test/document/d/x/edit' }
  ];
  const recap = renderRecap(meeting);
  assert.ok(!recap.includes('![track]'));
  assert.ok(!recap.includes('<img'));
  assert.match(recap, /\[Source 1\]\(#entry-1\)/);
  assert.match(recap, /<a id="entry-1"><\/a>/);
  assert.match(
    recap,
    /\[Google Docs transcript 1\]\(https:\/\/docs.google.com\/document\/d\/abc_123\/edit\)/
  );
  assert.ok(!recap.includes('docs.google.com.evil.test'));
  assert.match(recap, /CREATE SOMETHING/);
});
test('failed private file write leaves no published snapshot and retry succeeds', async () => {
  const root = await mkdtemp(join(tmpdir(), 'canon-recap-'));
  try {
    const meeting = await collectMeeting({ conference, token: 'x', ...fixture() });
    let count = 0;
    await assert.rejects(
      savePrivate(meeting, root, {
        writeFileImpl: async (...args) => {
          if (++count === 2) throw new Error('disk full');
          return writeFile(...args);
        }
      }),
      /disk full/
    );
    const { readdir } = await import('node:fs/promises');
    assert.deepEqual(await readdir(root), []);
    assert.equal((await savePrivate(meeting, root)).duplicate, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('standalone review embeds Canon artwork and escapes transcript text in every section', async () => {
  const meeting = await collectMeeting({ conference, token: 'x', ...fixture() });
  meeting.entries[0].text = 'I will <img src="https://example.com/tracker">.';
  const dir = await mkdtemp(join(tmpdir(), 'canon-review-'));
  try {
    const { folder } = await savePrivate(meeting, dir);
    const { readFile } = await import('node:fs/promises');
    const html = await readFile(join(folder, 'recap.html'), 'utf8');
    assert.match(html, /img alt="" src="data:image\/png;base64,/);
    assert.ok(!html.includes('<img src="https://example.com/tracker">'));
    assert.match(html, /href="#source-1"/);
    assert.match(html, /id="source-1"/);
    assert.equal((await stat(join(folder, 'recap.html'))).mode & 0o777, 0o600);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('host CLI makes a private branded review directly from on-device Swift segments', async () => {
  const { execFileSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const { readFile } = await import('node:fs/promises');
  const root = await mkdtemp(join(tmpdir(), 'canon-speech-review-'));
  try {
    const hash = 'a'.repeat(64);
    const segments = ['I', 'will', 'send', 'a', 'draft.'].map((text, i) => ({
      source: `local-audio-sha256:${hash}#segment-${i + 1}`,
      speaker: 'Unattributed speaker',
      startSeconds: i / 3,
      durationSeconds: 0.25,
      text
    }));
    const source = join(root, 'speech.json');
    await writeFile(
      source,
      JSON.stringify({
        schemaVersion: 1,
        provider: 'macOS Speech on-device',
        audience: 'host-only',
        testID: 'private-test',
        audioSHA256: hash,
        audioDurationSeconds: 5,
        requiresOnDeviceRecognition: true,
        speakerAttribution: 'unavailable-do-not-infer',
        segments
      }),
      { mode: 0o600 }
    );
    const cli = fileURLToPath(new URL('./canon-recap.mjs', import.meta.url));
    const { folder } = JSON.parse(
      execFileSync(
        process.execPath,
        [cli, '--local-transcript', source, '--host-confirmed', '--output', root],
        { encoding: 'utf8', env: {} }
      )
    );
    const html = await readFile(join(folder, 'recap.html'), 'utf8');
    assert.match(html, /I will send a draft/);
    assert.match(html, /Unattributed speaker/);
    assert.match(html, /href="#source-1"/);
    assert.match(await readFile(join(folder, 'transcript.json'), 'utf8'), /#segment-5/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

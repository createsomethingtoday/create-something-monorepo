#!/usr/bin/env node
/** Private operator utility. GET-only Google Meet reads; no scheduling or sharing writes. */
import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile, lstat, mkdtemp, rename, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { readPrivateSpeech } from './canon-speech-source.mjs';
import { renderReview } from './canon-recap-html.mjs';

const RECORD = /^conferenceRecords\/[A-Za-z0-9_-]+$/;
export async function collectMeeting({ conference, token, fetchImpl = fetch }) {
  if (!RECORD.test(conference)) throw new Error('Select exactly one conferenceRecords/<id>.');
  if (!token) throw new Error('Set GOOGLE_MEET_ACCESS_TOKEN to the host access token.');
  async function get(path, pageToken) {
    const url = new URL(`https://meet.googleapis.com/v2/${path}`);
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      redirect: 'error'
    });
    if (!response.ok)
      throw new Error(
        `Google Meet read failed (${response.status}); verify host access, Meet API enablement and OAuth scope.`
      );
    return response.json();
  }
  async function list(path, field) {
    const values = [];
    const seen = new Set();
    let pageToken;
    do {
      const page = await get(path, pageToken);
      values.push(...(page[field] || []));
      pageToken = page.nextPageToken;
      if (pageToken && seen.has(pageToken))
        throw new Error('Google Meet returned a repeated pagination token.');
      if (pageToken) seen.add(pageToken);
    } while (pageToken);
    return values;
  }
  const record = await get(conference);
  if (record.name !== conference || !record.endTime)
    throw new Error('Selected conference must exist and have ended.');
  const participants = await list(`${conference}/participants`, 'participants');
  const transcripts = await list(`${conference}/transcripts`, 'transcripts');
  if (!transcripts.length || transcripts.some((t) => t.state !== 'FILE_GENERATED'))
    throw new Error(
      'Transcript unavailable or still processing; retry after Google generates all transcripts.'
    );
  const speakers = new Map(
    participants.map((p) => [
      p.name,
      p.signedinUser?.displayName ||
        p.anonymousUser?.displayName ||
        p.phoneUser?.displayName ||
        'Unknown speaker'
    ])
  );
  const byName = new Map();
  for (const transcript of transcripts) {
    if (!new RegExp(`^${conference}/transcripts/[A-Za-z0-9_-]+$`).test(transcript.name))
      throw new Error('Unexpected transcript resource.');
    for (const entry of await list(`${transcript.name}/entries`, 'transcriptEntries')) {
      if (!entry.name?.startsWith(`${transcript.name}/entries/`) || typeof entry.text !== 'string')
        throw new Error('Invalid transcript entry.');
      const normalized = {
        source: entry.name,
        participant: entry.participant,
        speaker: speakers.get(entry.participant) || 'Unknown speaker',
        startTime: entry.startTime,
        endTime: entry.endTime,
        text: entry.text,
        languageCode: entry.languageCode
      };
      if (
        byName.has(entry.name) &&
        JSON.stringify(byName.get(entry.name)) !== JSON.stringify(normalized)
      )
        throw new Error('Conflicting transcript entry.');
      byName.set(entry.name, normalized);
    }
  }
  const entries = [...byName.values()].sort(
    (a, b) =>
      (a.startTime || '').localeCompare(b.startTime || '') || a.source.localeCompare(b.source)
  );
  if (!entries.length) throw new Error('Transcript has no entries; no recap created.');
  return {
    schemaVersion: 1,
    audience: 'host-only',
    status: 'private-draft-requires-human-review',
    conference,
    startTime: record.startTime,
    endTime: record.endTime,
    transcriptSources: transcripts
      .map((t) => ({
        name: t.name,
        document: t.docsDestination?.document,
        exportUri: t.docsDestination?.exportUri
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    entries
  };
}
// Encode punctuation as entities: provider text cannot create Markdown or HTML nodes.
const inert = (value) =>
  String(value ?? '')
    .replace(/[&<>!\[\]()`*_{}#|\\~]/g, (c) => `&#${c.codePointAt(0)};`)
    .replace(/\r?\n/g, ' ');
function trustedDocs(uri) {
  try {
    const url = new URL(uri);
    if (
      url.protocol === 'https:' &&
      url.hostname === 'docs.google.com' &&
      !url.port &&
      !url.username &&
      !url.password &&
      /^\/document\/d\/[A-Za-z0-9_-]+(?:\/edit)?$/.test(url.pathname)
    )
      return `https://docs.google.com${url.pathname}`;
  } catch {}
  return undefined;
}
function reviewCandidates(meeting) {
  const commitments = meeting.entries.filter((e) =>
    /\b(I will|I'll|we will|we'll|I can|action item|follow up|next step)\b/i.test(e.text)
  );
  const decisions = meeting.entries.filter((e) =>
    /\b(agreed|decided|decision|approved|let's go with)\b/i.test(e.text)
  );
  return { commitments, decisions };
}

export function renderRecap(meeting) {
  const indexes = new Map(meeting.entries.map((entry, index) => [entry.source, index + 1]));
  const quote = (e, full = false) => {
    const index = indexes.get(e.source);
    return `${full ? `<a id="entry-${index}"></a>\n\n` : ''}**${inert(e.speaker)}** · ${inert(e.startTime || 'Time unknown')}\n\n> ${inert(e.text)}\n\n${full ? `Source ${index}: ${inert(e.source)}` : `[Source ${index}](#entry-${index})`}`;
  };
  const { commitments, decisions } = reviewCandidates(meeting);
  const docs = (meeting.transcriptSources || []).flatMap((source, index) => {
    const url = trustedDocs(source.exportUri);
    return url ? [`[Google Docs transcript ${index + 1}](${url})`] : [];
  });
  return `# Canon Meeting Notes\n\nPrivate recap draft · Host review required\n\n**Conference:** ${inert(meeting.conference)}  \n**Ended:** ${inert(meeting.endTime)}\n\n${docs.join(' · ')}\n\n## Before using these notes\n\nReview every quote in context before sharing or acting. These keyword-selected candidates do not establish agreement, ownership or deadlines. Confirm speakers, negation, owners and dates against the full transcript. No tasks, messages or provider changes were created.\n\n## Possible commitments — unconfirmed\n\n${commitments.map((e) => quote(e)).join('\n\n') || 'No keyword candidates found. Review the full transcript.'}\n\n## Possible decisions — unconfirmed\n\n${decisions.map((e) => quote(e)).join('\n\n') || 'No keyword candidates found. Review the full transcript.'}\n\n## Full source transcript\n\n${meeting.entries.map((e) => quote(e, true)).join('\n\n---\n\n')}\n\n---\n\nPrepared privately with CREATE SOMETHING.\n`;
}
export async function savePrivate(meeting, outputRoot, { writeFileImpl = writeFile } = {}) {
  const root = resolve(outputRoot);
  await mkdir(root, { recursive: true, mode: 0o700 });
  const stat = await lstat(root);
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    stat.mode & 0o077 ||
    (process.getuid && stat.uid !== process.getuid())
  )
    throw new Error('Output directory must be owner-owned, private (0700), and not a symlink.');
  const digest = createHash('sha256').update(JSON.stringify(meeting)).digest('hex');
  const folder = join(root, `${meeting.conference.split('/')[1]}-${digest.slice(0, 16)}`);
  const files = {
    'transcript.json': JSON.stringify(meeting, null, 2) + '\n',
    'recap.md': renderRecap(meeting),
    'recap.html': renderReview(meeting, reviewCandidates(meeting))
  };
  async function verifyExisting() {
    const existing = await lstat(folder);
    if (!existing.isDirectory() || existing.isSymbolicLink() || existing.mode & 0o077)
      throw new Error('Unsafe existing recap directory.');
    for (const [name, content] of Object.entries(files)) {
      const fileStat = await lstat(join(folder, name));
      if (
        !fileStat.isFile() ||
        fileStat.isSymbolicLink() ||
        fileStat.mode & 0o077 ||
        (await readFile(join(folder, name), 'utf8')) !== content
      )
        throw new Error('Existing recap differs or is unsafe; refusing overwrite.');
    }
    return { folder, duplicate: true, digest };
  }
  try {
    await lstat(folder);
    return await verifyExisting();
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const staging = await mkdtemp(join(root, '.canon-recap-staging-'));
  try {
    for (const [name, content] of Object.entries(files))
      await writeFileImpl(join(staging, name), content, { mode: 0o600, flag: 'wx' });
    try {
      await rename(staging, folder);
    } catch (error) {
      if (!['EEXIST', 'ENOTEMPTY'].includes(error.code)) throw error;
      return await verifyExisting();
    }
    return { folder, duplicate: false, digest };
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

export async function main(args = process.argv.slice(2)) {
  if (args.includes('--help')) {
    console.log(
      'Usage: GOOGLE_MEET_ACCESS_TOKEN=... node canon-recap.mjs --conference conferenceRecords/<id> --output /private/host-directory --host-confirmed\nAlternatively use --local-transcript /private/speech.json in place of --conference, with no Google token. Google mode requires an ended, explicitly selected conference and host-authorized Meet readonly token. Never sends or publishes.'
    );
    return;
  }
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--host-confirmed') {
      options.host = true;
      continue;
    }
    if (
      !['--conference', '--output', '--local-transcript'].includes(args[i]) ||
      !args[i + 1] ||
      options[args[i]]
    )
      throw new Error('Invalid or duplicate arguments; use --help.');
    options[args[i]] = args[++i];
  }
  if (!options.host || !options['--output'])
    throw new Error('Explicit --host-confirmed and --output required.');
  if (Boolean(options['--local-transcript']) === Boolean(options['--conference']))
    throw Error('Select one Google conference or one local transcript.');
  const meeting = options['--local-transcript']
    ? await readPrivateSpeech(options['--local-transcript'])
    : await collectMeeting({
        conference: options['--conference'],
        token: process.env.GOOGLE_MEET_ACCESS_TOKEN
      });
  const result = await savePrivate(meeting, options['--output']);
  console.log(
    JSON.stringify({
      status: result.duplicate ? 'existing-private-draft' : 'private-draft-created',
      folder: result.folder,
      digest: result.digest
    })
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });

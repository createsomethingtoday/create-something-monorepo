import { open } from 'node:fs/promises';
import { constants } from 'node:fs';

// Speech emits word-level segments without identifying speakers. Group nearby words
// into short passages and retain the precise audio references for human review.
export async function readPrivateSpeech(path) {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  let source;
  try {
    const stat = await file.stat();
    if (
      !stat.isFile() ||
      stat.uid !== process.getuid() ||
      stat.mode & 0o077 ||
      stat.size > 8 * 1024 * 1024
    )
      throw Error('Select a private, owner-only local Speech transcript.');
    source = JSON.parse(await file.readFile('utf8'));
  } finally {
    await file.close();
  }
  const duration = source.audioDurationSeconds;
  if (
    source.schemaVersion !== 1 ||
    source.provider !== 'macOS Speech on-device' ||
    source.audience !== 'host-only' ||
    source.requiresOnDeviceRecognition !== true ||
    source.speakerAttribution !== 'unavailable-do-not-infer' ||
    !/^[0-9a-f]{64}$/.test(source.audioSHA256) ||
    !Array.isArray(source.segments) ||
    !source.segments.length ||
    !(duration > 0 && duration <= 600)
  )
    throw Error('Expected the private on-device transcript from the internal pilot.');
  const entries = [];
  let passage;
  let lastStart = -1;
  for (const [i, segment] of source.segments.entries()) {
    const start = segment.startSeconds;
    if (
      segment.source !== `local-audio-sha256:${source.audioSHA256}#segment-${i + 1}` ||
      !Number.isFinite(start) ||
      start < lastStart ||
      start < 0 ||
      start > duration ||
      !Number.isFinite(segment.durationSeconds) ||
      segment.durationSeconds < 0 ||
      typeof segment.text !== 'string' ||
      !segment.text.trim()
    )
      throw Error('Invalid local speech segment.');
    if (!passage || start - passage.endSeconds > 1.5 || start - passage.startSeconds >= 15) {
      passage = {
        source: segment.source,
        speaker: 'Unattributed speaker',
        startTime: `${start.toFixed(1)}s`,
        startSeconds: start,
        text: '',
        segmentSources: []
      };
      entries.push(passage);
    }
    passage.text = [passage.text, segment.text].filter(Boolean).join(' ');
    passage.endSeconds = start + segment.durationSeconds;
    passage.segmentSources.push(segment.source);
    lastStart = start;
  }
  return {
    schemaVersion: 1,
    audience: 'host-only',
    status: 'private-draft-requires-human-review',
    conference: `localAudio/${source.audioSHA256}`,
    testID: source.testID,
    endTime: 'Local audio · ' + duration.toFixed(1) + ' seconds',
    transcriptSources: [],
    entries
  };
}

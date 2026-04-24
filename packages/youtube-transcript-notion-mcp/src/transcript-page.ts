import type { TranscriptRecord } from './types.js';

export function resolveCaptionsSource(record: TranscriptRecord): string {
  if (record.extractionMethod === 'unavailable') {
    return 'none';
  }

  if (record.extractionMethod === 'supadata') {
    const transcriptMode = String(record.sourceDiagnostics?.transcriptMode ?? '').trim();
    if (transcriptMode === 'native') {
      return 'official';
    }
    if (transcriptMode === 'generate' || transcriptMode === 'auto') {
      return 'generated';
    }
  }

  return record.extractionMethod;
}

export function buildDefaultTranscriptHeaderLines(record: TranscriptRecord): string[] {
  const lines = [
    `Video title: ${record.title}`,
    `Video URL: ${record.url}`,
    record.channelName ? `Channel: ${record.channelName}` : null,
    record.publishedAt ? `Published at: ${record.publishedAt}` : null,
    `Captions source: ${record.captionsSource ?? resolveCaptionsSource(record)}`,
  ];

  if (record.playlistId || record.playlistTitle) {
    lines.push(
      record.playlistTitle
        ? `Playlist: ${record.playlistTitle} (${record.playlistId ?? 'unknown-playlist'})`
        : `Playlist: ${record.playlistId}`,
    );
  }

  if (record.dateAddedToPlaylist) {
    lines.push(`Date added to playlist: ${record.dateAddedToPlaylist}`);
  }

  return lines.filter(Boolean) as string[];
}

export function buildPlaylistTranscriptHeaderLines(record: TranscriptRecord): string[] {
  const playlistLabel = record.playlistTitle
    ? `${record.playlistTitle} (${record.playlistId ?? 'unknown-playlist'})`
    : record.playlistId ?? 'Unknown playlist';

  return [
    `Video title: ${record.title}`,
    `Video URL: ${record.url}`,
    `Playlist: ${playlistLabel}`,
    `Captions source: ${record.captionsSource ?? resolveCaptionsSource(record)}`,
    `Date added to playlist: ${record.dateAddedToPlaylist ?? 'Unknown'}`,
  ];
}

export function buildTranscriptBodyText(
  record: TranscriptRecord,
  unavailableReason?: string,
): string {
  if (record.transcript.trim()) {
    return record.transcript;
  }

  return unavailableReason
    ? `Transcript unavailable: ${unavailableReason}`
    : 'Transcript unavailable.';
}

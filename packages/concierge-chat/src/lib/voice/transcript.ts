export interface VoiceTranscriptEntry {
  id: string;
  speaker: 'Candidate' | 'Concierge';
  text: string;
  status: 'in_progress' | 'completed' | 'incomplete';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getContentText(content: unknown): string {
  if (!Array.isArray(content)) return '';

  return content
    .map((part) => {
      if (!isRecord(part)) return '';
      if (typeof part.transcript === 'string') return part.transcript;
      if (typeof part.text === 'string') return part.text;
      return '';
    })
    .join(' ')
    .trim();
}

export function toVoiceTranscriptEntries(history: readonly unknown[]): VoiceTranscriptEntry[] {
  return history.flatMap((item): VoiceTranscriptEntry[] => {
    if (!isRecord(item) || item.type !== 'message') return [];
    if (item.role !== 'user' && item.role !== 'assistant') return [];

    const text = getContentText(item.content);
    if (!text) return [];

    const rawStatus = item.status;
    const status: VoiceTranscriptEntry['status'] =
      rawStatus === 'in_progress' || rawStatus === 'incomplete' ? rawStatus : 'completed';

    return [
      {
        id: typeof item.itemId === 'string' ? item.itemId : crypto.randomUUID(),
        speaker: item.role === 'user' ? 'Candidate' : 'Concierge',
        text,
        status
      }
    ];
  });
}

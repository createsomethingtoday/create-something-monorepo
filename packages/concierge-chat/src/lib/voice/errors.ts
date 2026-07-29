const genericConnectionMessage =
  'Voice Concierge could not connect. Check microphone access and try again.';

export function toSafeVoiceError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : '';
  const rawMessage = error instanceof Error ? error.message : '';
  const normalized = `${name} ${rawMessage}`.toLowerCase();

  if (/\b429\b|quota|billing limit|rate limit/.test(normalized)) {
    return 'Voice Concierge is temporarily unavailable. Continue with the written application or try again later.';
  }

  if (/notallowederror|permission denied|microphone access denied/.test(normalized)) {
    return 'Microphone access is off. Allow microphone access for this page, then try again.';
  }

  if (/notfounderror|requested device not found|no microphone/.test(normalized)) {
    return 'No microphone was found. Connect a microphone, then try again.';
  }

  return genericConnectionMessage;
}

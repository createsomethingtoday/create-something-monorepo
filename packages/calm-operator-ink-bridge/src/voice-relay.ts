export interface VoiceTranscriberConfig {
  executable?: string;
  argsJson?: string;
}

export function voiceTranscriberCommand(
  audioPath: string,
  config: VoiceTranscriberConfig
): { executable: string; args: string[] } {
  const executable = config.executable?.trim() ?? '';
  if (!executable) throw new Error('OPERATOR_TRANSCRIBE_EXECUTABLE is required.');

  let args: unknown = ['{audio}'];
  if (config.argsJson?.trim()) {
    try {
      args = JSON.parse(config.argsJson);
    } catch {
      throw new Error('OPERATOR_TRANSCRIBE_ARGS_JSON must be a JSON array of strings.');
    }
  }
  if (!Array.isArray(args) || args.some((value) => typeof value !== 'string')) {
    throw new Error('OPERATOR_TRANSCRIBE_ARGS_JSON must be a JSON array of strings.');
  }

  const resolved = args.map((value) => value.replaceAll('{audio}', audioPath));
  if (!resolved.some((value) => value.includes(audioPath))) resolved.push(audioPath);
  return { executable, args: resolved };
}

export function boundedTranscript(stdout: string): string {
  const transcript = stdout.replace(/\s+/g, ' ').trim().slice(0, 500);
  if (!transcript) throw new Error('Transcriber returned an empty transcript.');
  return transcript;
}

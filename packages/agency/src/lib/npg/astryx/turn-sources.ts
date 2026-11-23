// Legacy history can only be attributed when it contains exactly one answer.
export function sourcesForMessage<T extends { tool: string; assistantMessageIndex?: number }>(
  messages: Array<{ role: string }>,
  sources: T[],
  index: number
): T[] {
  if (messages[index]?.role !== 'assistant') return [];
  const unambiguous =
    messages.length === 2 && messages[0]?.role === 'user' && messages[1]?.role === 'assistant';
  return sources.filter(
    (source) =>
      source.assistantMessageIndex === index ||
      (source.assistantMessageIndex === undefined && unambiguous)
  );
}

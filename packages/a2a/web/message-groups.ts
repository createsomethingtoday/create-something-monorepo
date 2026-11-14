type Message = {
  id: string;
  kind: string;
  author_agent_id: string | null;
  author_name: string;
};

type MessageGroup<T> =
  | { kind: 'message'; message: T }
  | { kind: 'notices'; id: string; messages: T[] };

export function isAuthorlessNotice(message: Omit<Message, 'id'>): boolean {
  return message.kind === 'notice' && !message.author_agent_id && !message.author_name;
}

/** Preserve source order and objects; a run describes quantity, never an inferred event. */
export function groupMessages<T extends Message>(messages: readonly T[]): MessageGroup<T>[] {
  const groups: MessageGroup<T>[] = [];
  for (let index = 0; index < messages.length;) {
    const first = messages[index];
    let end = index + 1;
    if (isAuthorlessNotice(first)) {
      while (end < messages.length && isAuthorlessNotice(messages[end])) end++;
    }
    if (end - index >= 2) {
      groups.push({ kind: 'notices', id: first.id, messages: messages.slice(index, end) });
    } else {
      groups.push({ kind: 'message', message: first });
    }
    index = end;
  }
  return groups;
}

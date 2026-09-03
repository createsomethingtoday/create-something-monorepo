export function createNoteInputBuffer(commit: (id: string, text: string) => void, delay = 80) {
  const pending = new Map<string, { text: string; timer: ReturnType<typeof setTimeout> }>();

  function flush(id: string) {
    const edit = pending.get(id);
    if (!edit) return;
    clearTimeout(edit.timer);
    pending.delete(id);
    commit(id, edit.text);
  }

  function schedule(id: string, text: string) {
    const previous = pending.get(id);
    if (previous) clearTimeout(previous.timer);
    pending.set(id, { text, timer: setTimeout(() => flush(id), delay) });
  }

  function flushAll() {
    for (const id of [...pending.keys()]) flush(id);
  }

  return { schedule, flush, flushAll };
}

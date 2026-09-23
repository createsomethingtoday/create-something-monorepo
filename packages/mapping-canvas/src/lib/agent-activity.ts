/** Ephemeral observability. Never part of a document, revision, or undo history. */
export type AgentTask = { id: string; label: string; state: 'working' | 'waiting' | 'completed' | 'failed'; updatedAt: number };
export type AgentAction = { id: number; label: string; state: 'running' | 'completed' | 'failed'; ids: string[]; updatedAt: number };
export type AgentActivity = { documentId: string; task: AgentTask | null; action: AgentAction | null };

export function createAgentActivity(documentId: () => string, notify: (value: AgentActivity) => void, now = Date.now) {
  let value: AgentActivity = { documentId: '', task: null, action: null };
  let sequence = 0;
  const publish = () => { notify(structuredClone(value)); return structuredClone(value); };
  const current = () => {
    if (value.documentId !== documentId()) value = { documentId: documentId(), task: null, action: null };
    return value;
  };
  return {
    read: () => structuredClone(current()),
    task(input: Record<string, unknown>, existingIds: Set<string>) {
      current();
      if (!['begin', 'working', 'waiting', 'completed', 'failed'].includes(String(input.state))) throw new Error('Unsupported activity state.');
      if (typeof input.label !== 'string' || !input.label.trim() || input.label.length > 160) throw new Error('An activity label of 1–160 characters is required.');
      if (!Array.isArray(input.ids) || input.ids.length > 100 || input.ids.some(id => typeof id !== 'string' || !existingIds.has(id))) throw new Error('Activity ids must contain at most 100 existing object IDs.');
      if (input.state === 'begin') {
        if (value.task && ['working', 'waiting'].includes(value.task.state)) throw new Error('Finish the current agent task before beginning another.');
        value.task = { id: crypto.randomUUID(), label: input.label.trim(), state: 'working', updatedAt: now() };
      } else {
        if (!value.task || input.taskId !== value.task.id || ['completed', 'failed'].includes(value.task.state)) throw new Error('An active matching taskId is required.');
        value.task = { ...value.task, label: input.label.trim(), state: input.state as AgentTask['state'], updatedAt: now() };
      }
      value.action = { id: ++sequence, label: input.label.trim(), ids: [...new Set(input.ids as string[])], state: input.state === 'failed' ? 'failed' : 'completed', updatedAt: now() };
      return publish();
    },
    begin(label: string, ids: string[]) {
      current();
      const token = { id: ++sequence, documentId: value.documentId };
      value.action = { id: token.id, label, ids: [...new Set(ids)].slice(0, 100), state: 'running', updatedAt: now() };
      publish();
      return token;
    },
    end(token: { id: number; documentId: string }, ids?: string[], failed = false) {
      current();
      // Late completions cannot overwrite a newer action or another project's activity.
      if (token.documentId !== value.documentId || value.action?.id !== token.id) return;
      value.action = { ...value.action, ...(ids ? { ids: [...new Set(ids)].slice(0, 100) } : {}), state: failed ? 'failed' : 'completed', updatedAt: now() };
      publish();
    }
  };
}

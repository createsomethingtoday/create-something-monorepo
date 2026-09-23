import { describe, expect, it, vi } from 'vitest';
import { createAgentActivity } from './agent-activity';

describe('ephemeral agent activity', () => {
  it('requires a matching live task, validates targets, and preserves state after rejected updates', () => {
    const notify = vi.fn(), activity = createAgentActivity(() => 'doc', notify, () => 10);
    const task = activity.task({ state: 'begin', label: 'Arrange cards', ids: ['one'] }, new Set(['one'])).task!;
    expect(() => activity.task({ state: 'begin', label: 'Other task', ids: [] }, new Set())).toThrow('Finish');
    expect(() => activity.task({ state: 'waiting', taskId: 'wrong', label: 'Review', ids: [] }, new Set())).toThrow('matching');
    expect(() => activity.task({ state: 'waiting', taskId: task.id, label: 'Review', ids: ['missing'] }, new Set())).toThrow('existing');
    expect(activity.read().task?.state).toBe('working');
    expect(activity.task({ state: 'waiting', taskId: task.id, label: 'Review layout', ids: [] }, new Set()).task?.state).toBe('waiting');
    expect(activity.task({ state: 'completed', taskId: task.id, label: 'Layout ready', ids: [] }, new Set()).task?.state).toBe('completed');
    expect(() => activity.task({ state: 'working', taskId: task.id, label: 'Late update', ids: [] }, new Set())).toThrow('active');
  });
  it('does not let late completions or project changes overwrite current attention', () => {
    let doc = 'one';
    const activity = createAgentActivity(() => doc, () => {});
    const first = activity.begin('First', ['a']);
    const second = activity.begin('Second', ['b']);
    activity.end(first, ['a']);
    expect(activity.read().action).toMatchObject({ label: 'Second', state: 'running', ids: ['b'] });
    activity.end(second, undefined, true);
    expect(activity.read().action?.state).toBe('failed');
    doc = 'two'; activity.end(second, ['b']);
    expect(activity.read()).toEqual({ documentId: 'two', task: null, action: null });
  });
  it('bounds automatic attention and returns independent snapshots', () => {
    const activity = createAgentActivity(() => 'doc', () => {});
    activity.begin('Inspect', Array.from({ length: 500 }, (_, i) => String(i)));
    const copy = activity.read(); expect(copy.action?.ids).toHaveLength(100);
    copy.action!.ids.length = 0;
    expect(activity.read().action?.ids).toHaveLength(100);
  });
});

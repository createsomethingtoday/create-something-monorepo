import { visibleObjects } from './editing';
import type { DrawController, DrawWebMcpTool } from './webmcp';

type Inspection = { revision: string; objects: Array<{ id: string; hidden: boolean }>; truncated?: boolean; stringsTruncated?: boolean };
type Mutation = { revision: string; changeId?: string; transition?: { affectedIds: string[]; affectedIdsTruncated?: boolean }; changedIds?: string[]; selectedIds?: string[] };
type Geometry = { revision: string; objects: Array<{ id: string }>; truncated?: boolean; summary: { unrenderedIdCount: number; missingIdCount: number } };

/** One browser command owns execution, activity and readback; no model between steps. */
export function fastExecutionTool(tools: DrawWebMcpTool[], controller: DrawController, inspect: DrawWebMcpTool['execute']): DrawWebMcpTool {
  const edit = tools.find(tool => tool.name === 'draw_edit')!;
  const call = async <T>(name: string, args: Record<string, unknown> = {}) =>
    await tools.find(tool => tool.name === name)!.execute(args) as T;
  return {
    name: 'draw_execute', title: 'Execute and verify Draw edits',
    description: 'Apply a revision-guarded atomic edit batch, then inspect and measure it in one command with real activity and timing. Returns applied and verification separately. Never replay an applied or uncertain result. Overlaps are reported, not automatically treated as errors.',
    inputSchema: edit.inputSchema,
    annotations: { readOnlyHint: false, openWorldHint: false },
    execute: async input => {
      if (!controller.renderedGeometry) throw new Error('Fast execution requires a rendered Draw canvas. No edits applied.');
      const started = performance.now();
      const timings: Record<string, number> = {};
      const timed = async <T>(name: string, action: () => Promise<T>) => {
        const start = performance.now();
        try { return await action(); } finally { timings[name] = performance.now() - start; }
      };
      const task = await call<{ task: { id: string } }>('draw_agent_activity', { state: 'begin', label: 'Inspecting and applying edits', ids: [] });
      const taskId = task.task.id;
      let mutation: Mutation | undefined;
      let phase = 'inspect';
      let ids: string[] = [];
      const finish = async (state: 'completed' | 'failed', label: string) => {
        const existing = new Set(controller.getState().document.objects.map(object => object.id));
        try {
          await call('draw_agent_activity', { state, taskId, label, ids: ids.filter(id => existing.has(id)).slice(0, 100) });
        } catch { /* Reload or a replaced task must not discard an applied receipt. */ }
      };
      try {
        // Mechanical reads must not trigger Follow agent and invalidate their own revision.
        const before = await timed('inspectMs', () => inspect({ limit: 1 }) as Promise<Inspection>);
        if (typeof input.expectedRevision !== 'string' || input.expectedRevision !== before.revision) throw new Error('Stale or missing expectedRevision. Inspect and replan; no edit applied.');
        phase = 'edit';
        mutation = await timed('editMs', () => call<Mutation>('draw_edit', input));
        ids = mutation.transition?.affectedIds ?? mutation.changedIds ?? mutation.selectedIds ?? [];
        phase = 'verify';
        const after = await timed('readbackMs', () => inspect({ ids, limit: 200 }) as Promise<Inspection>);
        // Verify the affected subgraph, not unrelated hidden/large document content.
        const document = controller.getState().document;
        const visibleIds = new Set(visibleObjects(document).map(object => object.id));
        const dependents = new Map<string, string[]>();
        for (const object of document.objects) if (object.kind === 'connector') {
          for (const endpoint of [object.fromId, object.toId]) {
            const linked = dependents.get(endpoint) ?? []; linked.push(object.id); dependents.set(endpoint, linked);
          }
        }
        const affected = new Set(ids), queue = [...ids];
        for (let index = 0; index < queue.length; index++) for (const id of dependents.get(queue[index]) ?? []) {
          if (!affected.has(id)) { affected.add(id); queue.push(id); }
        }
        const geometryIds = [...affected].filter(id => visibleIds.has(id));
        const geometry = await timed('geometryMs', () => call<Geometry>('draw_get_rendered_geometry', { ids: geometryIds.slice(0, 200), limit: 200 }));
        const stable = after.revision === mutation.revision && geometry.revision === mutation.revision;
        const rendered = new Set(geometry.objects.map(object => object.id));
        const visible = new Set(after.objects.filter(object => !object.hidden).map(object => object.id));
        const missing = ids.filter(id => visible.has(id) && !rendered.has(id));
        const verified = stable && geometryIds.length <= 200 && !mutation.transition?.affectedIdsTruncated && !after.truncated && !after.stringsTruncated && !geometry.truncated && missing.length === 0 && geometry.summary.unrenderedIdCount === 0 && geometry.summary.missingIdCount === 0;
        await finish(verified ? 'completed' : 'failed', verified ? 'Edits verified' : 'Edit applied; verification needs attention');
        return { ok: verified, applied: true, mutation, verification: { scope: 'visible-affected-subgraph', state: verified ? 'verified' : 'incomplete', stable, missingIds: missing, after, geometry }, timings: { ...timings, totalMs: performance.now() - started } };
      } catch (error) {
        // A failed readback is not a failed edit. Preserve the receipt for recovery.
        await finish('failed', mutation ? 'Edit applied; verification interrupted' : 'Edit stopped');
        return { ok: false, applied: mutation ? true : phase === 'edit' ? 'unknown' : false, ...(mutation ? { mutation } : {}), phase, error: error instanceof Error ? error.message : 'Execution failed', next: mutation || phase === 'edit' ? 'Inspect the canvas or revert the returned changeId if present. Do not replay the edit.' : 'Inspect and replan before submitting a new command.', timings: { ...timings, totalMs: performance.now() - started } };
      }
    }
  };
}

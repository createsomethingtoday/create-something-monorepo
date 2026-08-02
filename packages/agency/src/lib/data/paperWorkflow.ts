export type PaperWorkflowStageId = 'map' | 'build' | 'control';

export interface PaperWorkflowStage {
  id: PaperWorkflowStageId;
  index: string;
  verb: string;
  signal: string;
  title: string;
  detail: string;
  fields: readonly [string, string];
}

export const paperWorkflowStages: readonly PaperWorkflowStage[] = [
  {
    id: 'map',
    index: '01',
    verb: 'Map',
    signal: 'Signal',
    title: 'Gather the handoff.',
    detail: 'A loose request becomes one named starting point. Source and Owner stay legible.',
    fields: ['Source', 'Owner']
  },
  {
    id: 'build',
    index: '02',
    verb: 'Build',
    signal: 'Decision',
    title: 'Fold the route.',
    detail: 'The crease shows where the workflow may move and where named Authority must decide.',
    fields: ['Route', 'Authority']
  },
  {
    id: 'control',
    index: '03',
    verb: 'Control',
    signal: 'Proof',
    title: 'Stamp the result.',
    detail: 'The controlled edge can hold or stop. A Receipt stays attached to what happened next.',
    fields: ['State', 'Receipt']
  }
] as const;

export const initialPaperWorkflowStage: PaperWorkflowStageId = 'map';

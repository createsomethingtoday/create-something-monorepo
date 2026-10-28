import { briefMarkdown, emptyBrief, importBrief, parseBrief, type BriefField, type SupportBrief } from './contract';

type Context = { brief: SupportBrief; revision: number; notice: string };
export type BriefState = Context & (
  | { phase: 'editing'; error: ''; prepared: '' }
  | { phase: 'invalid'; error: string; prepared: '' }
  | { phase: 'prepared'; error: ''; prepared: string }
);
export type BriefEvent =
  | { type: 'edit'; field: BriefField; value: string }
  | { type: 'import'; text: string }
  | { type: 'prepare' }
  | { type: 'clear' }
  | { type: 'export-requested'; revision: number }
  | { type: 'export-failed'; revision: number };
export function initialBriefState(): BriefState {
  return { phase: 'editing', brief: emptyBrief(), revision: 0, error: '', prepared: '', notice: '' };
}
export function reduceBrief(state: BriefState, event: BriefEvent): BriefState {
  switch (event.type) {
    case 'edit': return { phase: 'editing', brief: { ...state.brief, [event.field]: event.value }, revision: state.revision + 1, error: '', prepared: '', notice: '' };
    case 'clear': return { ...initialBriefState(), revision: state.revision + 1, notice: 'Brief cleared from this page.' };
    case 'import':
      try { return { phase: 'editing', brief: importBrief(event.text), revision: state.revision + 1, error: '', prepared: '', notice: 'Imported into this page. Review every field before preparing.' }; }
      catch (cause) { return { ...state, phase: 'invalid', prepared: '', notice: '', error: cause instanceof Error ? cause.message : 'Import failed.' }; }
    case 'prepare':
      try { return { ...state, brief: parseBrief(state.brief), phase: 'prepared', prepared: briefMarkdown(state.brief), error: '', notice: 'Prepared locally. Review the brief before exporting.' }; }
      catch (cause) { return { ...state, phase: 'invalid', prepared: '', notice: '', error: cause instanceof Error ? cause.message : 'Preparation failed.' }; }
    case 'export-requested':
      return state.phase === 'prepared' && event.revision === state.revision ? { ...state, notice: 'Download requested. Nothing has been submitted to support.' } : state;
    case 'export-failed':
      return state.phase === 'prepared' && event.revision === state.revision ? { ...state, notice: 'Download could not be requested. Copy the reviewed text below instead.' } : state;
  }
}

import { findResults, validateSearch, type SearchCategory, type SearchEntry } from './catalog';
export type SearchState = { query: string; category: SearchCategory; results: SearchEntry[]; selectedId: string | null; status: 'ready' | 'searching' | 'cancelled'; source: 'human' | 'agent' | 'history'; revision: number };
export function createSearchController(render: (state: SearchState) => void, rendered: () => Promise<void>) {
  let state: SearchState = { query: '', category: 'all', results: findResults('', 'all'), selectedId: null, status: 'ready', source: 'human', revision: 0 };
  let generation = 0;
  let disposed = false;
  const publish = () => render({ ...state, results: [...state.results] });
  const snapshot = () => ({ ...state, results: state.results.map(({ keywords: _keywords, ...entry }) => entry) });
  publish();
  return {
    snapshot,
    async search(input: unknown, source: SearchState['source'], signal?: AbortSignal) {
      const args = validateSearch(input);
      if (disposed || signal?.aborted) return { status: 'cancelled' };
      const request = ++generation;
      state = { ...state, ...args, results: [], selectedId: null, status: 'searching', source, revision: request };
      publish();
      await rendered();
      if (disposed || request !== generation) return { status: 'superseded' };
      if (signal?.aborted) {
        state = { ...state, status: 'cancelled' };
        publish();
        await rendered();
        return { status: 'cancelled' };
      }
      state = { ...state, results: findResults(args.query, args.category), status: 'ready' };
      publish();
      await rendered();
      if (request !== generation || disposed) return { status: 'superseded' };
      if (signal?.aborted) {
        state = { ...state, results: [], status: 'cancelled' };
        publish();
        await rendered();
        return { status: 'cancelled' };
      }
      return snapshot();
    },
    async select(id: string | null, source: SearchState['source']) {
      if (disposed) throw new Error('Search preview is closed.');
      if (state.status !== 'ready' || (id !== null && !state.results.some((entry) => entry.id === id))) throw new Error('Select a result from the current completed search.');
      state = { ...state, selectedId: id, source };
      publish();
      await rendered();
      return snapshot();
    },
    cancel() {
      generation++;
      state = { ...state, status: 'cancelled', results: [], selectedId: null, revision: generation };
      publish();
    },
    dispose() { disposed = true; generation++; }
  };
}

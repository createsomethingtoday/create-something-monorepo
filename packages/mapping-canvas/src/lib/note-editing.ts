import type { NoteRun } from './note-content';

export type NoteMark = 'bold' | 'italic' | 'underline' | 'code';
export const runsText = (runs: NoteRun[]) => runs.map((run) => run.text).join('');

export function compactRuns(runs: NoteRun[]): NoteRun[] {
  const result: NoteRun[] = [];
  for (const run of runs) {
    const previous = result.at(-1);
    if (previous && ['bold', 'italic', 'underline', 'code', 'link'].every((key) => previous[key as keyof NoteRun] === run[key as keyof NoteRun])) previous.text += run.text;
    else result.push({ ...run });
  }
  return result;
}

function sliceRuns(runs: NoteRun[], start: number, end: number): NoteRun[] {
  let offset = 0;
  return runs.flatMap((run) => {
    const from = Math.max(0, start - offset), to = Math.min(run.text.length, end - offset);
    offset += run.text.length;
    return to > from ? [{ ...run, text: run.text.slice(from, to) }] : [];
  });
}

// Keep marks on untouched text; inserted text inherits the surrounding run.
export function replaceRunText(runs: NoteRun[], text: string): NoteRun[] {
  const before = runsText(runs);
  if (before === text) return runs;
  let start = 0, suffix = 0;
  while (start < before.length && start < text.length && before[start] === text[start]) start++;
  while (suffix < before.length - start && suffix < text.length - start && before[before.length - 1 - suffix] === text[text.length - 1 - suffix]) suffix++;
  const inherited = sliceRuns(runs, Math.max(0, start - 1), Math.max(1, start))[0] || runs[0];
  const inserted = text.slice(start, text.length - suffix);
  const result = [...sliceRuns(runs, 0, start), ...(inserted ? [{ ...inherited, text: inserted }] : []), ...sliceRuns(runs, before.length - suffix, before.length)];
  return result.length ? compactRuns(result) : [{ text: ' ' }];
}

export function toggleRunMark(runs: NoteRun[], start: number, end: number, mark: NoteMark): NoteRun[] {
  const selected = sliceRuns(runs, start, end);
  if (!selected.length) return runs;
  const remove = selected.every((run) => run[mark]);
  return compactRuns([...sliceRuns(runs, 0, start), ...selected.map((run) => {
    const next = { ...run };
    if (remove) delete next[mark]; else next[mark] = true;
    return next;
  }), ...sliceRuns(runs, end, runsText(runs).length)]);
}

export function setRunLink(runs: NoteRun[], start: number, end: number, link: string): NoteRun[] {
  return compactRuns([...sliceRuns(runs, 0, start), ...sliceRuns(runs, start, end).map((run) => {
    const next = { ...run };
    if (link) next.link = link; else delete next.link;
    return next;
  }), ...sliceRuns(runs, end, runsText(runs).length)]);
}

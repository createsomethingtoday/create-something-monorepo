import { error } from '@sveltejs/kit';
import { Marked } from 'marked';
import type { PageServerLoad } from './$types';
import { getReferenceLesson, loadReferenceLesson, referenceSourceUrl } from '$lib/content/reference';

const marked = new Marked({ gfm: true });

export const load: PageServerLoad = async ({ params }) => {
  const lesson = getReferenceLesson(params.phase, params.lesson);
  if (!lesson) throw error(404, 'Reference lesson not found');
  const markdown = await loadReferenceLesson(params.phase, params.lesson);
  if (!markdown) throw error(404, 'Reference document not found');

  // Upstream lesson links are relative to docs/en.md. Keep them attached to the
  // exact imported revision, so code and figures resolve to the matching source.
  const source = referenceSourceUrl(params.phase, params.lesson);
  const base = source.slice(0, source.lastIndexOf('/') + 1);
  const rawBase = base.replace('https://github.com/rohitg00/ai-engineering-from-scratch/blob/', 'https://raw.githubusercontent.com/rohitg00/ai-engineering-from-scratch/');
  const linked = markdown.replace(/(!?\[[^\]]*\]\()((?!https?:|mailto:|#|\/)[^)]+)(\))/g, (_match, open, href, close) => {
    try { return `${open}${new URL(href, open.startsWith('!') ? rawBase : base).toString()}${close}`; }
    catch { return `${open}${href}${close}`; }
  });
  const withFigures = linked.replace(/```figure\s*\r?\n([\s\S]*?)```/g, (_match, body) => {
    const id = body.trim().split(/\s+/)[0];
    if (!/^[a-z0-9-]+$/.test(id)) return '';
    return `<div class="lesson-figure" data-figure="${id}" aria-label="Interactive figure: ${id}"></div>`;
  });

  return {
    lesson,
    content: await marked.parse(withFigures),
    source,
    code: lesson.hasCode ? referenceSourceUrl(params.phase, params.lesson, 'code') : null,
    phaseLessons: (await import('$lib/content/reference')).REFERENCE_CATALOG.filter((item) => item.phase === params.phase)
  };
};

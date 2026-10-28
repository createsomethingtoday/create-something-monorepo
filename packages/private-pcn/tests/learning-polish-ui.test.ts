import { describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import Lesson from '../src/routes/lessons/[id]/+page.svelte';
import PathEditor from '../src/lib/components/PathEditor.svelte';
import Player from '../src/lib/components/Player.svelte';
vi.mock('$app/state', () => ({
  page: { params: {}, url: new URL('https://example.invalid/lessons/one?path=path-one') }
}));
vi.mock('$app/navigation', () => ({ goto: vi.fn(), invalidateAll: vi.fn() }));
const path = {
  id: 'path-one',
  title: 'Path',
  outcome: 'Verify',
  prerequisites: '',
  estimated_minutes: 10,
  visibility: 'published',
  revision: 1,
  lesson_ids: ['one', 'two'],
  missingLessonCount: 0,
  lessons: [
    { id: 'one', title: 'One' },
    { id: 'two', title: 'Two' }
  ]
};
describe('creator and learner decision clarity', () => {
  it.each([
    ['draft', 'Save draft', 'saved privately'],
    ['published', 'Save published changes', 'visible immediately'],
    ['archived', 'Archive path', 'hidden from members']
  ])('explains the effect of saving %s', (visibility, action, effect) => {
    const { body } = render(PathEditor, {
      props: { path: { ...path, visibility } as any, videos: [] }
    });
    expect(body).toContain(action);
    expect(body).toContain(effect);
    expect(body).not.toContain('>Save path<');
  });
  it('puts preparation before playback and continuation before long material in reading order', () => {
    const { body } = render(Lesson, {
      props: {
        data: {
          network: { slug: 'create-something', name: 'Test' },
          libraryPath: '/library',
          learningPath: path,
          canEdit: false,
          canSaveProgress: true,
          identity: { role: 'member' },
          lessonData: {
            video: {
              id: 'one',
              title: 'One',
              access: 'members',
              visibility: 'published',
              duration: 120
            },
            progress: null,
            release: null,
            lesson: {
              prerequisites: 'Required preparation',
              tools: 'Local tools',
              outcome: 'Outcome',
              practice: 'Long practice',
              transcript: 'Long transcript'
            }
          }
        }
      }
    });
    expect(body.indexOf('Required preparation')).toBeLessThan(body.indexOf('<video'));
    expect(body.indexOf('Next lesson')).toBeGreaterThan(body.indexOf('Mark as watched'));
    expect(body.indexOf('Next lesson')).toBeLessThan(body.indexOf('Read the transcript'));
    expect(body).toContain('/lessons/two?path=path-one');
  });
  it('does not advertise a fabricated caption track before media is available', () => {
    const { body } = render(Player, { props: { id: 'one', title: 'One' } });
    expect(body).toContain('Caption availability will be checked');
    expect(body).not.toContain('<track');
    expect(body).not.toContain('Captions ready');
  });
});

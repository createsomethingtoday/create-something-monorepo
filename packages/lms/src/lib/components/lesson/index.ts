/**
 * Interactive Lesson Components
 * 
 * Section components for building engaging, interactive lessons.
 * Three teaching tools: CanonReveal, Spritz, Remotion Player.
 */

export { default as LessonHero } from './LessonHero.svelte';
export { default as LessonPhilosophy } from './LessonPhilosophy.svelte';
export { default as LessonSpritz } from './LessonSpritz.svelte';
export { default as LessonSteps } from './LessonSteps.svelte';
export { default as LessonCode } from './LessonCode.svelte';
export { default as LessonReflection } from './LessonReflection.svelte';
export { default as LessonRemotion } from './LessonRemotion.svelte';
export { default as InteractiveLesson } from './InteractiveLesson.svelte';

// Types
export interface LessonSection {
  type: 'hero' | 'philosophy' | 'spritz' | 'steps' | 'code' | 'reflection' | 'remotion';
  [key: string]: unknown;
}

export interface InteractiveLessonData {
  sections: LessonSection[];
}

# Build a Component

## Objective

Create a component that embodies Canon principles—ready-to-hand, not present-at-hand.

## Context

You're building a "Progress Indicator" component for the LMS. It should show a learner's progress through a path, feeling natural and unobtrusive.

## Requirements

### Functional Requirements
- Display current progress as a visual bar
- Show numerical progress (e.g., "3 of 5 lessons")
- Indicate current lesson
- Allow clicking to navigate to any completed lesson

### Design Requirements
- Must use Canon CSS tokens
- Must use Svelte 5 runes (`$props`, `$state`, `$derived`)
- Must handle edge cases (0%, 100%, empty data)
- Animation should be subtle and functional

## Starter Template

```svelte
<script lang="ts">
  interface Lesson {
    id: string;
    title: string;
    completed: boolean;
    current: boolean;
  }

  interface Props {
    lessons: Lesson[];
    onNavigate?: (lessonId: string) => void;
  }

  let { lessons, onNavigate }: Props = $props();

  // Your implementation here
</script>

<!-- Your markup here -->

<style>
  /* Your Canon CSS here */
</style>
```

## Design Guidelines

### Zuhandenheit (Ready-to-Hand)

The component should "recede into use":
- Progress should be glanceable (understood in < 1 second)
- Navigation should be discoverable but not distracting
- States should be clear without labels

### Visual Language

Use Canon tokens to ensure consistency:
- Progress bar: `var(--color-fg-tertiary)` for incomplete, `var(--color-success)` for complete
- Current indicator: subtle glow or emphasis
- Text: `var(--color-fg-secondary)` for count, `var(--color-fg-muted)` for labels

### Animation

Follow restraint principles:
- Progress changes: `var(--duration-standard)`
- Hover states: `var(--duration-micro)`
- Respect `prefers-reduced-motion`

## Example API Usage

```svelte
<ProgressIndicator
  lessons={[
    { id: 'lesson-1', title: 'Introduction', completed: true, current: false },
    { id: 'lesson-2', title: 'Core Concepts', completed: true, current: false },
    { id: 'lesson-3', title: 'Advanced Topics', completed: false, current: true },
    { id: 'lesson-4', title: 'Practice', completed: false, current: false },
    { id: 'lesson-5', title: 'Assessment', completed: false, current: false }
  ]}
  onNavigate={(id) => goto(`/lessons/${id}`)}
/>
```

## Expected Behavior

1. **Visual**: A horizontal bar with segments for each lesson
2. **Completed lessons**: Filled with success color, clickable
3. **Current lesson**: Emphasized (border, glow, or size)
4. **Future lessons**: Muted, not clickable
5. **Progress text**: "3 of 5 lessons" or similar

## Hints

### Deriving Progress
```typescript
const completedCount = $derived(lessons.filter(l => l.completed).length);
const progressPercent = $derived((completedCount / lessons.length) * 100);
```

### Accessible Navigation
```svelte
<button
  onclick={() => onNavigate?.(lesson.id)}
  disabled={!lesson.completed && !lesson.current}
  aria-current={lesson.current ? 'step' : undefined}
>
  <!-- segment content -->
</button>
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  .progress-segment {
    transition: none;
  }
}
```

## Success Criteria

- [ ] Uses Svelte 5 runes correctly (`$props`, `$derived`)
- [ ] All styling uses Canon CSS tokens
- [ ] Component handles edge cases (0 lessons, all complete)
- [ ] Navigation works for completed lessons only
- [ ] Current lesson is visually emphasized
- [ ] Respects `prefers-reduced-motion`
- [ ] Component is accessible (keyboard navigation, ARIA)

## Evaluation Rubric

| Criterion | Points |
|-----------|--------|
| Correct Svelte 5 syntax | 2 |
| Canon token usage | 2 |
| Edge case handling | 2 |
| Accessibility | 2 |
| Visual clarity | 2 |
| **Total** | **10** |

## Reflection

After completing this exercise:
1. Did the component "recede into use" or demand attention?
2. What props did you consider adding but chose not to?
3. How would this component integrate with the broader LMS UI?

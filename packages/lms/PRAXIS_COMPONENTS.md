# Praxis Components Implementation

## Overview

Created hands-on exercise components for the CREATE SOMETHING LMS following Canon CSS design principles.

## Files Created

### Components (`src/lib/components/`)

1. **PraxisContainer.svelte** - Main container for exercises
   - Structured layout with header, exercise area, results, and actions
   - Configurable submit button with loading state
   - Snippet-based content slots for flexibility

2. **CodeEditor.svelte** - Code input component
   - Line numbers that sync with content
   - Monospace font with Canon styling
   - Tab support and proper whitespace handling

3. **PraxisResult.svelte** - Result display component
   - Three states: success, error, info
   - Semantic colors from Canon palette
   - Optional score display

4. **TriadAudit.svelte** - Subtractive Triad exercise
   - Three sections for DRY, Rams, Heidegger principles
   - Optional code display area
   - Keyword-based evaluation (placeholder for AI evaluation)
   - Integrated scoring and feedback

5. **index.ts** - Component exports

6. **README.md** - Component documentation with examples

### Routes

**`src/routes/praxis/+page.svelte`** - Praxis listing page
- Grid of available exercises
- Exercise metadata (path, difficulty, type)
- Interactive exercise viewer
- Example TriadAudit exercise with sample code

## Design Principles

### Canon CSS Compliance

All components follow the **"Tailwind for structure, Canon for aesthetics"** pattern:

**Structure (Tailwind):**
- `flex`, `grid` - Layout
- `items-*`, `justify-*` - Alignment
- `gap-*`, `p-*`, `m-*` - Spacing utilities
- `w-*`, `h-*` - Sizing utilities

**Design (CSS Variables in `<style>` blocks):**
- Colors: `var(--color-bg-*)`, `var(--color-fg-*)`
- Spacing: `var(--space-*)`
- Typography: `var(--text-*)`
- Borders: `var(--radius-*)`, `var(--color-border-*)`
- Transitions: `var(--duration-*)`, `var(--ease-standard)`

### Color Semantics

- **Background Hierarchy**: `pure` → `elevated` → `surface` → `subtle`
- **Foreground Hierarchy**: `primary` → `secondary` → `tertiary` → `muted`
- **States**: `success` (green), `error` (red), `info` (blue)
- **Paths**: `foundations`, `craft`, `infrastructure`, `agents`, `method`, `systems`

## Features

### 1. PraxisContainer
- Clean header with title and instructions
- Flexible content area using Svelte 5 snippets
- Optional result area
- Configurable submit button
- Loading states with disabled UI

### 2. CodeEditor
- Auto-syncing line numbers
- Monospace font (JetBrains Mono, SF Mono)
- Dark theme matching Canon
- Resizable textarea
- Tab key support

### 3. PraxisResult
- Icon-based state indicators (✓, ✗, ℹ)
- Color-coded backgrounds and borders
- Score display in header
- Feedback text area

### 4. TriadAudit
- **Educational Framework**: Teaches the Subtractive Triad
  - DRY (Implementation): "Have I built this before?" → Unify
  - Rams (Artifact): "Does this earn its existence?" → Remove
  - Heidegger (System): "Does this serve the whole?" → Reconnect
- Optional code sample display
- Three text input areas for analysis
- Keyword-based evaluation (can be replaced with AI)
- Graduated scoring (3/3, 2/3, <2)
- Contextual feedback

### 5. Praxis Page
- Exercise grid with cards
- Path-based color coding
- Difficulty indicators
- Exercise type badges
- Interactive exercise viewer
- Back navigation
- Example exercises included

## Example Usage

### Simple Code Exercise

```svelte
<script>
  import { PraxisContainer, CodeEditor, PraxisResult } from '$lib/components';

  let code = $state('');
  let result = $state(null);

  function evaluate() {
    // Evaluation logic
    result = {
      state: 'success',
      feedback: 'Great work!',
      score: 1
    };
  }
</script>

<PraxisContainer
  title="Write a Function"
  instructions="Create a function that adds two numbers"
  onsubmit={evaluate}
>
  {#snippet children()}
    <CodeEditor bind:value={code} />
  {/snippet}

  {#snippet result()}
    {#if result}
      <PraxisResult {...result} maxScore={1} />
    {/if}
  {/snippet}
</PraxisContainer>
```

### Triad Audit Exercise

```svelte
<script>
  import { TriadAudit } from '$lib/components';

  const code = `// Sample code to audit`;

  function handleComplete(score) {
    console.log('Score:', score);
  }
</script>

<TriadAudit
  scenario="Identify improvement opportunities"
  targetCode={code}
  onComplete={handleComplete}
/>
```

## Type Safety

All components use TypeScript with proper type definitions:
- Props interfaces for all components
- State typing with `$state<Type>()`
- Snippet types from `svelte`
- No TypeScript errors (verified with svelte-check)

## Next Steps

### Future Enhancements

1. **Syntax Highlighting** - Add proper code highlighting to CodeEditor
2. **AI Evaluation** - Replace keyword matching with Claude evaluation
3. **Progress Tracking** - Integrate with D1 progress system
4. **More Exercise Types**:
   - Multiple choice
   - Drag-and-drop ordering
   - Interactive diagrams
   - Fill-in-the-blank
5. **Hint System** - Progressive hints for stuck learners
6. **Real-time Validation** - Validate as user types
7. **Code Execution** - Run user code in sandbox
8. **Diff View** - Show before/after for refactoring exercises

### Integration Points

- **D1 Database**: Save user responses and scores
- **KV Namespace**: Cache exercise results
- **Cloudflare Workers**: Backend evaluation service
- **Components Package**: Share with other CREATE SOMETHING properties

## Testing

### Type Checking

```bash
pnpm --filter=lms run check
```

**Status**: ✅ All component files pass type checking
- 0 errors in praxis components
- Existing errors in other files (tracker.ts) not related to praxis work

### Manual Testing Checklist

- [ ] PraxisContainer renders with all slots
- [ ] CodeEditor shows line numbers
- [ ] PraxisResult displays all three states correctly
- [ ] TriadAudit evaluates responses
- [ ] Praxis page shows exercise grid
- [ ] Navigation between list and exercise works
- [ ] Submit buttons work with loading states

## Canon Reflection

These components embody the Subtractive Triad:

**DRY (Implementation)**:
- Shared PraxisContainer eliminates duplicate layout code
- Common result display across all exercise types
- Reusable CodeEditor for all code-based exercises

**Rams (Artifact)**:
- Each component does one thing well
- No decorative elements - only functional UI
- Minimal but sufficient interaction states

**Heidegger (System)**:
- Components compose naturally (TriadAudit uses PraxisContainer)
- Canon tokens ensure visual coherence across LMS
- Snippet-based API enables flexible composition
- Educational framework (Triad) encoded in the components themselves

The TriadAudit component is particularly Heideggerian - it teaches users to *see* through the framework by *using* the framework. The tool shapes perception through use.

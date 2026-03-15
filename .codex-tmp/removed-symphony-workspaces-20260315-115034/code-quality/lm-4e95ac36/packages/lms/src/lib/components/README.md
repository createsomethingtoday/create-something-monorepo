# Praxis Components

Interactive exercise components for the CREATE SOMETHING LMS, following Canon CSS design principles.

## Components

### PraxisContainer

Container component for exercises with structured layout, instructions, and submit button.

```svelte
<script>
  import { PraxisContainer } from '$lib/components';

  let submitting = $state(false);

  function handleSubmit() {
    submitting = true;
    // Evaluate the exercise
    submitting = false;
  }
</script>

<PraxisContainer
  title="Exercise Title"
  instructions="Detailed instructions for the learner"
  onsubmit={handleSubmit}
  {submitting}
>
  {#snippet children()}
    <!-- Exercise content goes here -->
  {/snippet}

  {#snippet result()}
    <!-- Optional result/feedback area -->
  {/snippet}
</PraxisContainer>
```

**Props:**
- `title: string` - Exercise title
- `instructions: string` - Instructions text
- `children?: Snippet` - Exercise content
- `result?: Snippet` - Result/feedback area
- `onsubmit?: () => void` - Submit handler
- `submitting?: boolean` - Loading state
- `showSubmit?: boolean` - Show/hide submit button (default: true)

---

### CodeEditor

Simple code input component with line numbers and monospace font.

```svelte
<script>
  import { CodeEditor } from '$lib/components';

  let code = $state('');
</script>

<CodeEditor
  bind:value={code}
  placeholder="// Your code here..."
  rows={15}
  language="typescript"
/>
```

**Props:**
- `value: string` (bindable) - Code content
- `placeholder?: string` - Placeholder text
- `language?: string` - Language hint (for future syntax highlighting)
- `rows?: number` - Number of visible rows (default: 10)

---

### PraxisResult

Result display component with success/error/info states and scoring.

```svelte
<script>
  import { PraxisResult } from '$lib/components';
</script>

<PraxisResult
  state="success"
  feedback="Great work! You correctly identified the pattern."
  score={3}
  maxScore={3}
/>
```

**Props:**
- `state: 'success' | 'error' | 'info'` - Result state
- `feedback: string` - Feedback message
- `score?: number` - Points earned
- `maxScore?: number` - Total possible points

---

### TriadAudit

Interactive exercise for auditing code through the Subtractive Triad framework.

```svelte
<script>
  import { TriadAudit } from '$lib/components';

  const code = `function Button({ text, onClick }) {
    return <button onClick={onClick}>{text}</button>;
  }`;

  function handleComplete(score: number) {
    console.log('Score:', score);
  }
</script>

<TriadAudit
  scenario="Identify opportunities for improvement using the Subtractive Triad."
  targetCode={code}
  onComplete={handleComplete}
/>
```

**Props:**
- `scenario: string` - Exercise scenario/instructions
- `targetCode?: string` - Code to audit
- `onComplete?: (score: number) => void` - Completion handler

**Framework:**

The TriadAudit guides learners through three levels:

1. **DRY (Implementation)** - "Have I built this before?" → Unify
2. **Rams (Artifact)** - "Does this earn its existence?" → Remove
3. **Heidegger (System)** - "Does this serve the whole?" → Reconnect

---

## Design Principles

All components follow **Canon CSS** patterns:

- **Tailwind for structure** - Layout utilities (flex, grid, spacing)
- **CSS variables for design** - Colors, typography, borders from Canon tokens
- **No inline design utilities** - All visual design in `<style>` blocks

### Color Tokens Used

```css
--color-bg-elevated    /* Component backgrounds */
--color-bg-surface     /* Nested backgrounds */
--color-bg-pure        /* Deep backgrounds (code) */
--color-fg-primary     /* Primary text */
--color-fg-secondary   /* Secondary text */
--color-fg-tertiary    /* De-emphasized text */
--color-fg-muted       /* Muted text */
--color-border-default /* Default borders */
--color-border-emphasis /* Emphasized borders */
--color-success        /* Success states */
--color-error          /* Error states */
--color-info           /* Info states */
```

### Spacing Tokens (Golden Ratio)

```css
--space-xs: 0.5rem
--space-sm: 1rem
--space-md: 1.618rem
--space-lg: 2.618rem
--space-xl: 4.236rem
```

### Typography Tokens

```css
--text-h3: clamp(1.25rem, 1.5vw + 0.5rem, 1.75rem)
--text-body: 1rem
--text-body-sm: 0.875rem
--text-caption: 0.75rem
--font-mono: 'JetBrains Mono', 'SF Mono', monospace
```

---

## Example: Complete Exercise

```svelte
<script lang="ts">
  import { PraxisContainer, CodeEditor, PraxisResult } from '$lib/components';

  let code = $state('');
  let result = $state<{
    state: 'success' | 'error' | 'info';
    feedback: string;
    score: number;
  } | null>(null);
  let submitting = $state(false);

  function evaluate() {
    submitting = true;

    // Simple evaluation logic
    const hasClass = code.includes('class');
    const hasExport = code.includes('export');

    if (hasClass && hasExport) {
      result = {
        state: 'success',
        feedback: 'Excellent! Your component follows best practices.',
        score: 2
      };
    } else {
      result = {
        state: 'error',
        feedback: 'Make sure to export your component class.',
        score: 0
      };
    }

    submitting = false;
  }
</script>

<PraxisContainer
  title="Create a Svelte Component"
  instructions="Write a simple Button component with a label and click handler."
  onsubmit={evaluate}
  {submitting}
>
  {#snippet children()}
    <CodeEditor bind:value={code} placeholder="// Your component here..." rows={12} />
  {/snippet}

  {#snippet result()}
    {#if result}
      <PraxisResult state={result.state} feedback={result.feedback} score={result.score} maxScore={2} />
    {/if}
  {/snippet}
</PraxisContainer>
```

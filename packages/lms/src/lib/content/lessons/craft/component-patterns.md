# Component Patterns

## The Principle

**Components should recede into use.**

When you're using a well-designed component, you think about what you're building—not about the component itself. The component disappears into the work.

This is Zuhandenheit (ready-to-hand) applied to component design.

## The Hammer Analogy

When a carpenter uses a hammer, she doesn't think about the hammer. She thinks about the nail. The hammer is transparent—an extension of her intention.

But give her a poorly balanced hammer, and suddenly she's thinking about the tool instead of the work.

**Good components are invisible. Bad components demand attention.**

## Props as Interface

The props are the surface where your component meets the world. They should:

1. **Be minimal** → Only expose what's necessary
2. **Have sensible defaults** → Work without configuration
3. **Be semantic** → Named for what they do, not how

### Before: Implementation-Exposed Props

```svelte
<Button
  backgroundColor="#111111"
  borderRadius="8px"
  padding="12px 24px"
  fontSize="14px"
  onClick={handleClick}
>
  Submit
</Button>
```

Every consumer makes design decisions. The component exposes implementation.

### After: Semantic Props

```svelte
<Button
  variant="primary"
  size="md"
  onclick={handleClick}
>
  Submit
</Button>
```

The consumer says what they want. The component decides how.

## Svelte 5 Props Pattern

Use TypeScript interfaces with sensible defaults:

```svelte
<script lang="ts">
  interface Props {
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    onclick?: () => void;
    children: import('svelte').Snippet;
  }

  let {
    variant = 'primary',
    size = 'md',
    disabled = false,
    onclick,
    children
  }: Props = $props();
</script>

<button
  class="button {variant} {size}"
  {disabled}
  {onclick}
>
  {@render children()}
</button>

<style>
  .button {
    font-family: var(--font-sans);
    font-weight: var(--font-medium);
    border: none;
    cursor: pointer;
    transition: all var(--duration-micro) var(--ease-standard);
  }

  /* Variants */
  .primary {
    background: var(--color-fg-primary);
    color: var(--color-bg-pure);
  }

  .secondary {
    background: var(--color-bg-surface);
    color: var(--color-fg-primary);
    border: 1px solid var(--color-border-default);
  }

  .ghost {
    background: transparent;
    color: var(--color-fg-secondary);
  }

  /* Sizes */
  .sm {
    padding: var(--space-xs) var(--space-sm);
    font-size: var(--text-body-sm);
    border-radius: var(--radius-sm);
  }

  .md {
    padding: var(--space-sm) var(--space-md);
    font-size: var(--text-body);
    border-radius: var(--radius-md);
  }

  .lg {
    padding: var(--space-sm) var(--space-lg);
    font-size: var(--text-body-lg);
    border-radius: var(--radius-md);
  }

  /* States */
  .button:hover:not(:disabled) {
    opacity: 0.9;
  }

  .button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
```

**Defaults make common cases automatic.** You can write just `<Button>Save</Button>` and get a sensible result.

## Composition Over Configuration

When props become complex, consider composition:

### Configuration Approach (Fragile)

```svelte
<Card
  title="My Card"
  subtitle="A subtitle"
  image="/image.jpg"
  imagePosition="top"
  actionLabel="Learn More"
  actionHref="/learn"
  secondaryActionLabel="Dismiss"
  secondaryActionOnClick={dismiss}
  variant="elevated"
  size="large"
/>
```

13 props. Hard to remember, easy to break.

### Composition Approach (Flexible)

```svelte
<Card variant="elevated" size="large">
  <Card.Image src="/image.jpg" />
  <Card.Content>
    <Card.Title>My Card</Card.Title>
    <Card.Subtitle>A subtitle</Card.Subtitle>
  </Card.Content>
  <Card.Actions>
    <Button href="/learn">Learn More</Button>
    <Button variant="ghost" onclick={dismiss}>Dismiss</Button>
  </Card.Actions>
</Card>
```

Flexible, readable, obvious. Each piece is a small component with minimal props.

## Implementing Compound Components

```svelte
<!-- Card.svelte -->
<script lang="ts">
  import CardImage from './CardImage.svelte';
  import CardContent from './CardContent.svelte';
  import CardTitle from './CardTitle.svelte';
  import CardSubtitle from './CardSubtitle.svelte';
  import CardActions from './CardActions.svelte';

  interface Props {
    variant?: 'default' | 'elevated';
    size?: 'sm' | 'md' | 'lg';
    children: import('svelte').Snippet;
  }

  let { variant = 'default', size = 'md', children }: Props = $props();

  // Export sub-components for composition
  export { CardImage as Image };
  export { CardContent as Content };
  export { CardTitle as Title };
  export { CardSubtitle as Subtitle };
  export { CardActions as Actions };
</script>

<article class="card {variant} {size}">
  {@render children()}
</article>

<style>
  .card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .elevated {
    box-shadow: var(--shadow-lg);
  }

  .sm { /* ... */ }
  .md { /* ... */ }
  .lg { /* ... */ }
</style>
```

## Slots vs Snippets

Svelte 5 uses snippets (typed slots):

```svelte
<script lang="ts">
  interface Props {
    header?: import('svelte').Snippet;
    children: import('svelte').Snippet;
    footer?: import('svelte').Snippet;
  }

  let { header, children, footer }: Props = $props();
</script>

<div class="layout">
  {#if header}
    <header>{@render header()}</header>
  {/if}

  <main>{@render children()}</main>

  {#if footer}
    <footer>{@render footer()}</footer>
  {/if}
</div>
```

Usage:

```svelte
<Layout>
  {#snippet header()}
    <h1>Page Title</h1>
  {/snippet}

  <p>Main content goes here.</p>

  {#snippet footer()}
    <p>Footer content</p>
  {/snippet}
</Layout>
```

**Snippets are typed and explicit.** The component declares what it accepts.

## The Component Checklist

Before finalizing a component, verify:

### 1. Does it recede?

Use the component in context. Are you thinking about the component or your work?

### 2. Are defaults sensible?

Can you use the component with minimal props?

```svelte
<!-- Should work with just children -->
<Button>Click</Button>
<Card><p>Content</p></Card>
<Input placeholder="Email" />
```

### 3. Are props semantic?

Names describe what, not how:

| Bad | Good |
|-----|------|
| `backgroundColor` | `variant` |
| `paddingX` | `size` |
| `isRounded` | (default behavior) |

### 4. Is styling internal?

Components own their appearance. Consumers configure, not style:

```svelte
<!-- Bad: Consumer styles -->
<Button class="bg-blue-500 rounded-lg p-4">Click</Button>

<!-- Good: Consumer configures -->
<Button variant="primary" size="lg">Click</Button>
```

### 5. Is composition possible?

If props exceed 5-6, consider breaking into sub-components.

## Pattern Library

### Input with Label

```svelte
<script lang="ts">
  interface Props {
    label: string;
    name: string;
    type?: 'text' | 'email' | 'password';
    required?: boolean;
    error?: string;
  }

  let {
    label,
    name,
    type = 'text',
    required = false,
    error
  }: Props = $props();
</script>

<div class="field" class:has-error={error}>
  <label for={name}>{label}{required ? ' *' : ''}</label>
  <input id={name} {name} {type} {required} />
  {#if error}
    <span class="error">{error}</span>
  {/if}
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  label {
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
  }

  input {
    background: var(--color-bg-subtle);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-sm);
    padding: var(--space-sm);
    color: var(--color-fg-primary);
    font-size: var(--text-body);
  }

  input:focus {
    outline: 2px solid var(--color-fg-muted);
    outline-offset: 2px;
  }

  .has-error input {
    border-color: var(--color-error);
  }

  .error {
    color: var(--color-error);
    font-size: var(--text-caption);
  }
</style>
```

Usage:

```svelte
<Input
  label="Email Address"
  name="email"
  type="email"
  required
  error={errors.email}
/>
```

**The component handles complexity. The consumer states intent.**

---

## Reflection

Before the praxis:

1. Find a component in your project with more than 6 props. Could it be simplified or composed?
2. What's the most "visible" component you use—one that makes you think about the component instead of your work?
3. How many of your component props have defaults?

**Praxis**: You'll build a component following these patterns and test it for "receding into use."

---

## Cross-Property References

> **Canon Reference**: See [Dwelling in Tools](https://createsomething.ltd/patterns/dwelling-in-tools) for the philosophical basis of "components that recede into use."
>
> **Canon Reference**: The prop design principles here mirror [Principled Defaults](https://createsomething.ltd/patterns/principled-defaults)—sensible defaults that guide toward the right outcome.
>
> **Practice**: Study the shared components package (`@create-something/components`) for real implementations of these patterns.

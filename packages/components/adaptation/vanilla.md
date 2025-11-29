# Vanilla Adaptation Guide

Implementing CREATE SOMETHING design principles with plain HTML, CSS, and JavaScript.

No framework. No build step required. Maximum simplicity.

## Setup

### Option 1: CDN (No Build)

```html
<!-- In your HTML <head> -->
<style>
  /* Paste output from generateAllTokensCSS() */
  :root {
    /* Colors */
    --color-bg-pure: #000000;
    --color-bg-elevated: #0a0a0a;
    --color-fg-primary: #ffffff;
    --color-fg-secondary: rgba(255, 255, 255, 0.8);
    /* ... etc */
  }
</style>
```

### Option 2: CSS File

Generate and include:

```bash
# Generate tokens
npx tsx -e "
import { generateAllTokensCSS } from '@create-something/components';
console.log(await generateAllTokensCSS());
" > tokens.css
```

```html
<link rel="stylesheet" href="tokens.css">
```

## Component Examples

### Button

```html
<button class="btn btn--primary">
  Primary Button
</button>

<button class="btn btn--secondary">
  Secondary Button
</button>

<button class="btn btn--ghost">
  Ghost Button
</button>

<style>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 var(--space-md);
  font-weight: 600;
  font-size: 0.875rem;
  font-family: inherit;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  transition: all var(--duration-micro) var(--ease-standard);
}

.btn:focus-visible {
  outline: 2px solid var(--color-fg-primary);
  outline-offset: 2px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn--primary {
  background: var(--color-fg-primary);
  color: var(--color-bg-pure);
}

.btn--primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn--primary:active:not(:disabled) {
  transform: scale(0.98);
}

.btn--secondary {
  background: transparent;
  border: 1px solid var(--color-border-emphasis);
  color: var(--color-fg-primary);
}

.btn--secondary:hover:not(:disabled) {
  background: var(--color-hover);
}

.btn--ghost {
  background: transparent;
  color: var(--color-fg-secondary);
}

.btn--ghost:hover:not(:disabled) {
  color: var(--color-fg-primary);
  background: var(--color-hover);
}
</style>
```

### Card

```html
<article class="card">
  <h3 class="card__title">Card Title</h3>
  <p class="card__description">Card description goes here.</p>
</article>

<article class="card card--elevated card--interactive">
  <h3 class="card__title">Interactive Card</h3>
  <p class="card__description">Click me!</p>
</article>

<style>
.card {
  border-radius: var(--radius-md);
  padding: var(--space-md);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-default);
  transition: all var(--duration-micro) var(--ease-standard);
}

.card--elevated {
  border: none;
  box-shadow: var(--shadow-md);
}

.card--interactive {
  cursor: pointer;
}

.card--interactive:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.card__title {
  margin: 0 0 var(--space-sm);
  font-size: var(--text-h4);
  font-weight: 600;
  color: var(--color-fg-primary);
}

.card__description {
  margin: 0;
  color: var(--color-fg-secondary);
  line-height: var(--leading-relaxed);
}
</style>
```

### Typography

```html
<h1 class="heading heading--h1">Heading 1</h1>
<h2 class="heading heading--h2">Heading 2</h2>
<h3 class="heading heading--h3">Heading 3</h3>

<p class="body">Body text with good readability.</p>
<p class="body body--muted">Muted body text for secondary content.</p>

<style>
.heading {
  font-weight: 600;
  color: var(--color-fg-primary);
  margin: 0;
}

.heading--h1 {
  font-size: var(--text-h1);
  letter-spacing: var(--tracking-tighter);
  line-height: var(--leading-tight);
}

.heading--h2 {
  font-size: var(--text-h2);
  letter-spacing: var(--tracking-tighter);
  line-height: var(--leading-tight);
}

.heading--h3 {
  font-size: var(--text-h3);
  letter-spacing: var(--tracking-tight);
  line-height: var(--leading-tight);
}

.body {
  font-size: var(--text-body);
  line-height: var(--leading-relaxed);
  color: var(--color-fg-primary);
}

.body--muted {
  color: var(--color-fg-secondary);
}
</style>
```

## Layout Utilities

```html
<!-- Container -->
<div class="container">
  <h1>Centered content</h1>
</div>

<!-- Stack (vertical spacing) -->
<div class="stack">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>

<!-- Cluster (horizontal with wrap) -->
<div class="cluster">
  <span class="tag">Tag 1</span>
  <span class="tag">Tag 2</span>
  <span class="tag">Tag 3</span>
</div>

<style>
.container {
  width: 100%;
  max-width: var(--container-xl);
  margin-left: auto;
  margin-right: auto;
  padding-left: var(--space-md);
  padding-right: var(--space-md);
}

.container--prose {
  max-width: var(--container-prose);
}

.stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.stack--tight { gap: var(--space-sm); }
.stack--loose { gap: var(--space-lg); }

.cluster {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  align-items: center;
}
</style>
```

## Form Elements

```html
<form class="form">
  <div class="field">
    <label for="email" class="field__label">Email</label>
    <input
      type="email"
      id="email"
      class="field__input"
      placeholder="you@example.com"
    >
    <span class="field__helper">We'll never share your email.</span>
  </div>

  <button type="submit" class="btn btn--primary">
    Subscribe
  </button>
</form>

<style>
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.field__label {
  font-size: var(--text-body-sm);
  font-weight: 500;
  color: var(--color-fg-primary);
}

.field__input {
  height: 44px;
  padding: 0 var(--space-sm);
  font-size: var(--text-body);
  font-family: inherit;
  color: var(--color-fg-primary);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  transition: border-color var(--duration-micro) var(--ease-standard);
}

.field__input:focus {
  outline: none;
  border-color: var(--color-border-emphasis);
}

.field__input::placeholder {
  color: var(--color-fg-muted);
}

.field__helper {
  font-size: var(--text-caption);
  color: var(--color-fg-muted);
}

.field__error {
  font-size: var(--text-caption);
  color: var(--color-error);
}
</style>
```

## JavaScript Helpers

### Media Query Helper

```javascript
// Check breakpoint
function matchesBreakpoint(breakpoint) {
  const breakpoints = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px'
  };
  return window.matchMedia(`(min-width: ${breakpoints[breakpoint]})`).matches;
}

// Usage
if (matchesBreakpoint('md')) {
  console.log('Tablet or larger');
}
```

### Reduced Motion Helper

```javascript
// Respect user preference
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Usage
if (!prefersReducedMotion()) {
  element.classList.add('animate');
}
```

## Complete Page Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CREATE SOMETHING</title>
  <link rel="stylesheet" href="tokens.css">
  <style>
    /* Base reset */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
    }

    body {
      font-family: var(--font-sans);
      background: var(--color-bg-pure);
      color: var(--color-fg-primary);
      line-height: var(--leading-normal);
    }

    /* Page layout */
    .page {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    .main {
      flex: 1;
      padding: var(--space-xl) 0;
    }
  </style>
</head>
<body>
  <div class="page">
    <header class="header">
      <!-- Navigation -->
    </header>

    <main class="main">
      <div class="container">
        <h1 class="heading heading--h1">Welcome</h1>
        <!-- Content -->
      </div>
    </main>

    <footer class="footer">
      <!-- Footer -->
    </footer>
  </div>
</body>
</html>
```

## Principles Applied

1. **No build step** — Works with just a browser
2. **CSS variables** — Same tokens, no JavaScript required
3. **Progressive enhancement** — Works without JS, enhanced with JS
4. **Semantic HTML** — Accessibility by default

*"Weniger, aber besser"* — The simplest implementation that works.

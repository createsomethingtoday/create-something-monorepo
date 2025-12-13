# Canon Quick Reference

## The Rule

**Tailwind for structure, Canon for aesthetics.**

## Do This

```svelte
<div class="flex items-center gap-4 p-6 card">
  <h2 class="title">{title}</h2>
</div>

<style>
  .card {
    background: var(--color-bg-surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border-default);
  }
  .title {
    font-size: var(--text-h2);
    color: var(--color-fg-primary);
  }
</style>
```

## Not This

```svelte
<!-- Mixing Tailwind design classes with Canon -->
<div class="flex items-center gap-4 p-6 bg-gray-900 rounded-lg border border-white/10">
  <h2 class="text-2xl text-white">{title}</h2>
</div>
```

---

## Spacing (Golden Ratio)

| Token | Value | Use For |
|-------|-------|---------|
| `--space-xs` | 0.5rem | Tight grouping |
| `--space-sm` | 1rem | Element gaps |
| `--space-md` | 1.618rem | Section padding |
| `--space-lg` | 2.618rem | Major sections |
| `--space-xl` | 4.236rem | Page sections |
| `--space-2xl` | 6.854rem | Hero spacing |

---

## Colors

| Token | Purpose |
|-------|---------|
| `--color-bg-pure` | Page background |
| `--color-bg-surface` | Card backgrounds |
| `--color-bg-elevated` | Raised elements |
| `--color-fg-primary` | Main text |
| `--color-fg-secondary` | Supporting text |
| `--color-fg-muted` | Deemphasized |
| `--color-border-default` | Subtle borders |
| `--color-border-emphasis` | Visible borders |

---

## Typography

| Token | Use For |
|-------|---------|
| `--text-display` | Hero headlines |
| `--text-h1` | Page titles |
| `--text-h2` | Section headers |
| `--text-h3` | Subsections |
| `--text-body` | Paragraphs |
| `--text-body-sm` | Captions, labels |

---

## Radii

| Token | Value | Use For |
|-------|-------|---------|
| `--radius-sm` | 6px | Small elements |
| `--radius-md` | 8px | Buttons |
| `--radius-lg` | 12px | Cards |
| `--radius-xl` | 16px | Large panels |
| `--radius-full` | 9999px | Pills, avatars |

---

## Motion

| Token | Duration | Use For |
|-------|----------|---------|
| `--duration-micro` | 200ms | Hover states |
| `--duration-fast` | 300ms | Transitions |
| `--duration-standard` | 400ms | Reveals |

**Always add:**
```css
@media (prefers-reduced-motion: reduce) {
  .element { animation: none; transition: none; }
}
```

---

## Shared Components

```typescript
import {
  PageLayout,
  Section,
  SectionHeader,
  Card,
  Button
} from '@create-something/verticals-shared';
```

| Component | Purpose |
|-----------|---------|
| `PageLayout` | Page wrapper |
| `Section` | Vertical section with spacing |
| `SectionHeader` | Title + subtitle block |
| `Card` | Content container |
| `Button` | Action trigger |

---

## Checklist

Before committing:

- [ ] No Tailwind color classes (`bg-*`, `text-*`)
- [ ] No Tailwind radius classes (`rounded-*`)
- [ ] No Tailwind shadow classes (`shadow-*`)
- [ ] All design values use Canon tokens
- [ ] Motion respects `prefers-reduced-motion`

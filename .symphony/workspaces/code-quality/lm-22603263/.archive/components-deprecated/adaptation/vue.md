# Vue Adaptation Guide

Implementing CREATE SOMETHING design principles in Vue 3.

## Setup

### 1. Install Tokens

```bash
npm install @create-something/components
```

### 2. Generate CSS

```typescript
// scripts/generate-tokens.ts
import { generateAllTokensCSS } from '@create-something/components';
import fs from 'fs';

const css = await generateAllTokensCSS();
fs.writeFileSync('src/styles/tokens.css', css);
```

### 3. Import in Main

```typescript
// src/main.ts
import './styles/tokens.css';
```

## Component Examples

### Button Component

```vue
<!-- src/components/Button.vue -->
<script setup lang="ts">
type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface Props {
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  loading: false,
  disabled: false
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();
</script>

<template>
  <button
    :class="['btn', `btn--${variant}`]"
    :disabled="disabled || loading"
    @click="emit('click', $event)"
  >
    <span v-if="loading" class="btn__spinner">⟳</span>
    <slot />
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 var(--space-md);
  font-weight: 600;
  font-size: var(--text-body-sm);
  border-radius: var(--radius-md);
  transition: all var(--duration-micro) var(--ease-standard);
  cursor: pointer;
  border: none;
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

.btn__spinner {
  margin-right: var(--space-xs);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
```

### Card Component

```vue
<!-- src/components/Card.vue -->
<script setup lang="ts">
type CardVariant = 'default' | 'elevated' | 'outlined';

interface Props {
  variant?: CardVariant;
  interactive?: boolean;
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
  interactive: false
});
</script>

<template>
  <div :class="['card', `card--${variant}`, { 'card--interactive': interactive }]">
    <slot />
  </div>
</template>

<style scoped>
.card {
  border-radius: var(--radius-md);
  padding: var(--space-md);
  transition: all var(--duration-micro) var(--ease-standard);
}

.card--default {
  border: 1px solid var(--color-border-default);
}

.card--elevated {
  box-shadow: var(--shadow-md);
}

.card--outlined {
  border: 1px solid var(--color-border-emphasis);
  background: transparent;
}

.card--interactive {
  cursor: pointer;
}

.card--interactive:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}
</style>
```

### Heading Component

```vue
<!-- src/components/Heading.vue -->
<script setup lang="ts">
type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

interface Props {
  level?: HeadingLevel;
  as?: HeadingLevel;
}

const props = withDefaults(defineProps<Props>(), {
  level: 'h2'
});

const tag = computed(() => props.as || props.level);
</script>

<template>
  <component :is="tag" :class="['heading', `heading--${level}`]">
    <slot />
  </component>
</template>

<style scoped>
.heading {
  font-weight: 600;
  color: var(--color-fg-primary);
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

.heading--h4 {
  font-size: var(--text-h4);
  letter-spacing: var(--tracking-tight);
  line-height: var(--leading-snug);
}

.heading--h5 {
  font-size: var(--text-h5);
  letter-spacing: normal;
  line-height: var(--leading-snug);
}

.heading--h6 {
  font-size: var(--text-h6);
  letter-spacing: normal;
  line-height: var(--leading-normal);
}
</style>
```

## Composables

### useMediaQuery

```typescript
// src/composables/useMediaQuery.ts
import { ref, onMounted, onUnmounted } from 'vue';
import { media } from '@create-something/components';

export function useMediaQuery(query: keyof typeof media) {
  const matches = ref(false);

  let mediaQuery: MediaQueryList;

  const handler = (e: MediaQueryListEvent) => {
    matches.value = e.matches;
  };

  onMounted(() => {
    mediaQuery = window.matchMedia(media[query]);
    matches.value = mediaQuery.matches;
    mediaQuery.addEventListener('change', handler);
  });

  onUnmounted(() => {
    mediaQuery?.removeEventListener('change', handler);
  });

  return matches;
}

// Usage:
// const isDesktop = useMediaQuery('lg');
```

### useTokens

```typescript
// src/composables/useTokens.ts
import { colors, typography, spacing } from '@create-something/components';

export function useTokens() {
  return {
    colors,
    typography,
    spacing
  };
}

// Usage in component:
// const { colors } = useTokens();
// style.color = colors.foreground.primary;
```

## Directory Structure

```
src/
├── components/
│   ├── Button.vue
│   ├── Card.vue
│   ├── Heading.vue
│   ├── Container.vue
│   └── Stack.vue
├── composables/
│   ├── useMediaQuery.ts
│   └── useTokens.ts
├── styles/
│   └── tokens.css        # Generated from @create-something/components
└── main.ts
```

## Principles Applied

1. **Scoped styles** — CSS variables work within scoped styles
2. **Composition API** — Clean, type-safe component logic
3. **Semantic slots** — Content projection follows patterns
4. **Minimal props** — Only what's needed, sensible defaults

*"Weniger, aber besser"* — Adapt what serves the project, not everything.

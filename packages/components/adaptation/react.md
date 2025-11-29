# React Adaptation Guide

Implementing CREATE SOMETHING design principles in React.

## Setup

### 1. Install Tokens

```bash
npm install @create-something/components
```

### 2. Generate CSS

Create a tokens CSS file:

```typescript
// scripts/generate-tokens.ts
import { generateAllTokensCSS } from '@create-something/components';
import fs from 'fs';

const css = await generateAllTokensCSS();
fs.writeFileSync('src/styles/tokens.css', css);
```

### 3. Import in App

```tsx
// src/App.tsx
import './styles/tokens.css';
```

## Component Examples

### Button Component

Following the button pattern from `patterns/forms.ts`:

```tsx
// src/components/Button.tsx
import { forwardRef, type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', loading, children, disabled, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center
      min-h-[44px] px-[var(--space-md)]
      font-semibold text-sm
      rounded-[var(--radius-md)]
      transition-all duration-[var(--duration-micro)]
      focus-visible:outline-2 focus-visible:outline-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

    const variantStyles = {
      primary: `
        bg-[var(--color-fg-primary)] text-[var(--color-bg-pure)]
        hover:opacity-90 active:scale-[0.98]
      `,
      secondary: `
        border border-[var(--color-border-emphasis)]
        text-[var(--color-fg-primary)]
        hover:bg-[var(--color-hover)]
      `,
      ghost: `
        text-[var(--color-fg-secondary)]
        hover:text-[var(--color-fg-primary)]
        hover:bg-[var(--color-hover)]
      `
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="animate-spin mr-2">⟳</span>
        ) : null}
        {children}
      </button>
    );
  }
);
```

### Card Component

Following the card pattern from `patterns/content.ts`:

```tsx
// src/components/Card.tsx
import { type HTMLAttributes, type ReactNode } from 'react';

type CardVariant = 'default' | 'elevated' | 'outlined';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  interactive?: boolean;
  children: ReactNode;
}

export function Card({
  variant = 'default',
  interactive = false,
  children,
  className = '',
  ...props
}: CardProps) {
  const baseStyles = `
    rounded-[var(--radius-md)]
    p-[var(--space-md)]
    transition-all duration-[var(--duration-micro)]
  `;

  const variantStyles = {
    default: 'border border-[var(--color-border-default)]',
    elevated: 'shadow-[var(--shadow-md)]',
    outlined: 'border border-[var(--color-border-emphasis)] bg-transparent'
  };

  const interactiveStyles = interactive
    ? 'cursor-pointer hover:translate-y-[-2px] hover:shadow-[var(--shadow-lg)]'
    : '';

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${interactiveStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
```

### Heading Component

Following the typography system:

```tsx
// src/components/Heading.tsx
import { type HTMLAttributes, type ElementType } from 'react';

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
  as?: ElementType;
}

const headingStyles: Record<HeadingLevel, string> = {
  h1: 'text-[var(--text-h1)] tracking-[var(--tracking-tighter)] leading-[var(--leading-tight)]',
  h2: 'text-[var(--text-h2)] tracking-[var(--tracking-tighter)] leading-[var(--leading-tight)]',
  h3: 'text-[var(--text-h3)] tracking-[var(--tracking-tight)] leading-[var(--leading-tight)]',
  h4: 'text-[var(--text-h4)] tracking-[var(--tracking-tight)] leading-[var(--leading-snug)]',
  h5: 'text-[var(--text-h5)] tracking-normal leading-[var(--leading-snug)]',
  h6: 'text-[var(--text-h6)] tracking-normal leading-[var(--leading-normal)]'
};

export function Heading({
  level = 'h2',
  as,
  className = '',
  children,
  ...props
}: HeadingProps) {
  const Component = as || level;

  return (
    <Component
      className={`font-semibold text-[var(--color-fg-primary)] ${headingStyles[level]} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
```

## Layout Patterns

### Stack Layout

```tsx
// src/components/Stack.tsx
import { type HTMLAttributes, type ReactNode } from 'react';

type StackSpacing = 'tight' | 'normal' | 'loose';

interface StackProps extends HTMLAttributes<HTMLDivElement> {
  spacing?: StackSpacing;
  children: ReactNode;
}

const spacingMap: Record<StackSpacing, string> = {
  tight: 'gap-[var(--space-sm)]',
  normal: 'gap-[var(--space-md)]',
  loose: 'gap-[var(--space-lg)]'
};

export function Stack({
  spacing = 'normal',
  children,
  className = '',
  ...props
}: StackProps) {
  return (
    <div className={`flex flex-col ${spacingMap[spacing]} ${className}`} {...props}>
      {children}
    </div>
  );
}
```

### Container Layout

```tsx
// src/components/Container.tsx
import { type HTMLAttributes, type ReactNode } from 'react';

type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'prose';

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: ContainerSize;
  children: ReactNode;
}

const sizeMap: Record<ContainerSize, string> = {
  sm: 'max-w-[var(--container-sm)]',
  md: 'max-w-[var(--container-md)]',
  lg: 'max-w-[var(--container-lg)]',
  xl: 'max-w-[var(--container-xl)]',
  prose: 'max-w-[var(--container-prose)]'
};

export function Container({
  size = 'xl',
  children,
  className = '',
  ...props
}: ContainerProps) {
  return (
    <div
      className={`w-full mx-auto px-[var(--space-md)] ${sizeMap[size]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
```

## Hooks

### useMediaQuery

```tsx
// src/hooks/useMediaQuery.ts
import { useState, useEffect } from 'react';
import { media } from '@create-something/components';

export function useMediaQuery(query: keyof typeof media): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(media[query]);
    setMatches(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// Usage:
// const isDesktop = useMediaQuery('lg');
```

## Principles Applied

1. **Tokens as CSS variables** — Framework-agnostic, works with any styling approach
2. **Patterns as guidelines** — Follow the principles, adapt the implementation
3. **Minimal dependencies** — Only what's needed for each project
4. **Accessibility built-in** — Focus states, ARIA, semantic HTML

## When NOT to Use This

- If you're using a full design system (Chakra, Radix) — don't duplicate
- If the project has existing tokens — extend, don't replace
- If time doesn't permit full implementation — use tokens only

*"Weniger, aber besser"* — Adapt what serves the project, not everything.

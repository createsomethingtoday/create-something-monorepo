# CREATE SOMETHING: Component Usage Guide

**Version:** 1.0
**Last Updated:** November 21, 2025
**Library:** `@create-something/components`

> Complete reference for using the CREATE SOMETHING shared component library

---

## Table of Contents

1. [Installation](#installation)
2. [Core Components](#core-components)
   - [Navigation](#navigation)
   - [Footer](#footer)
3. [UI Components](#ui-components)
   - [Button](#button)
   - [Heading](#heading)
   - [Card](#card)
4. [Utility Components](#utility-components)
   - [SEO](#seo)
   - [PaperCard](#papercard)
5. [Design Tokens](#design-tokens)
6. [Examples](#examples)
7. [Accessibility](#accessibility)
8. [Best Practices](#best-practices)

---

## Installation

The component library is automatically available in all workspace packages:

```typescript
import {
  Navigation,
  Footer,
  Button,
  Heading,
  Card,
  SEO
} from '@create-something/components';

// Design tokens
import {
  spacing,
  radius,
  animation,
  zIndex
} from '@create-something/components';
```

---

## Core Components

### Navigation

Unified navigation component with mobile responsiveness and 44px touch targets.

#### Props

```typescript
interface NavigationProps {
  logo: string;              // Main logo text
  logoSuffix?: string;       // Optional suffix (e.g., ".ltd")
  logoHref?: string;         // Logo link (default: "/")
  links: NavLink[];          // Navigation links
  currentPath?: string;      // Current page path for highlighting
  fixed?: boolean;           // Fixed positioning (default: false)
  ctaLabel?: string;         // Optional CTA button text
  ctaHref?: string;          // Optional CTA button link
}

interface NavLink {
  label: string;
  href: string;
}
```

#### Usage

**Basic Example:**
```svelte
<script>
  import { Navigation } from '@create-something/components';

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' }
  ];
</script>

<Navigation
  logo="CREATE SOMETHING"
  links={navLinks}
  currentPath={$page.url.pathname}
/>
```

**With All Options:**
```svelte
<Navigation
  logo="CREATE SOMETHING"
  logoSuffix=".ltd"
  logoHref="/"
  links={navLinks}
  currentPath="/about"
  fixed={true}
  ctaLabel="Contact"
  ctaHref="/contact"
/>
```

#### Features

- ✅ **44px minimum touch targets** (WCAG 2.1 AA compliant)
- ✅ Mobile responsive with hamburger menu
- ✅ Slide animation (200ms)
- ✅ Active link highlighting
- ✅ Fixed positioning option
- ✅ Optional CTA button
- ✅ Proper ARIA labels

#### When to Use Fixed Positioning

```svelte
<!-- For properties with long scrolling content -->
<Navigation fixed={true} ... />

<!-- Requires adding top padding to content -->
<div class="pt-[72px]">
  <!-- Your content -->
</div>
```

---

### Footer

Universal footer component with required "Modes of Being" section.

#### Props

```typescript
interface FooterProps {
  mode?: 'ltd' | 'io' | 'space' | 'agency';
  aboutText?: string;
  showNewsletter?: boolean;
  newsletterTitle?: string;
  newsletterDescription?: string;
  quickLinks?: QuickLink[];
  showRamsQuote?: boolean;
  copyrightText?: string;
  showSocial?: boolean;
}

interface QuickLink {
  label: string;
  href: string;
}
```

#### Usage

**Minimal (.ltd style):**
```svelte
<Footer
  mode="ltd"
  showRamsQuote={true}
/>
```

**Full Featured (.io style):**
```svelte
<script>
  const quickLinks = [
    { label: 'Home', href: '/' },
    { label: 'Experiments', href: '/experiments' },
    { label: 'About', href: '/about' }
  ];
</script>

<Footer
  mode="io"
  aboutText="AI-native development research with tracked experiments."
  showNewsletter={true}
  newsletterTitle="Stay updated"
  newsletterDescription="Get notified when new research is published."
  quickLinks={quickLinks}
  showSocial={true}
  copyrightText="© 2025 Your Name. All rights reserved."
/>
```

#### Features

- ✅ **Required "Modes of Being"** section (always included)
- ✅ Mode-aware highlighting (current property highlighted)
- ✅ Optional newsletter signup
- ✅ Optional social links (GitHub, LinkedIn)
- ✅ Optional quick links
- ✅ Optional Rams quote
- ✅ Configurable per property

#### Newsletter Integration

The newsletter feature expects a `/api/newsletter` endpoint:

```typescript
// src/routes/api/newsletter/+server.ts
export async function POST({ request }) {
  const { email } = await request.json();

  // Add to your newsletter service
  // Return { success: true, message: "Subscribed!" }

  return json({
    success: true,
    message: "Successfully subscribed!"
  });
}
```

---

## UI Components

### Button

Button component with guaranteed 44px touch targets.

#### Props

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  href?: string;             // Renders as link if provided
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  fullWidth?: boolean;
  onclick?: (event: MouseEvent) => void;
}
```

#### Usage

**Basic Buttons:**
```svelte
<Button variant="primary">
  Click me
</Button>

<Button variant="secondary" size="lg">
  Large Button
</Button>

<Button variant="ghost" disabled={true}>
  Disabled
</Button>
```

**As Link:**
```svelte
<Button href="/about" variant="primary">
  Learn More
</Button>
```

**With Click Handler:**
```svelte
<Button onclick={() => alert('Clicked!')}>
  Alert Button
</Button>
```

**Full Width:**
```svelte
<Button fullWidth={true} variant="primary">
  Submit Form
</Button>
```

#### Sizes & Touch Targets

All sizes guarantee 44px minimum touch target:

| Size | Typical Height | Touch Target |
|------|---------------|--------------|
| `sm` | 44px | 44px ✅ |
| `md` | 48px | 48px ✅ |
| `lg` | 56px | 56px ✅ |

#### Variants

**Primary (default):**
- White background
- Black text
- Best for main actions

**Secondary:**
- Transparent background
- White border
- White text
- Best for secondary actions

**Ghost:**
- Transparent background
- No border
- White text
- Subtle hover effect
- Best for tertiary actions

---

### Heading

Fluid typography component using clamp() for smooth scaling.

#### Props

```typescript
interface HeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  fluidScale?: 'canonical' | 'custom';
  min?: string;              // For custom scale
  max?: string;              // For custom scale
  class?: string;
}
```

#### Usage

**Canonical Scale (recommended):**
```svelte
<Heading level={1}>
  Main Page Title
</Heading>

<Heading level={2}>
  Section Heading
</Heading>

<Heading level={3}>
  Subsection Title
</Heading>
```

**Custom Scale:**
```svelte
<Heading
  level={1}
  fluidScale="custom"
  min="2rem"
  max="5rem"
>
  Custom Scaled Heading
</Heading>
```

**With Classes:**
```svelte
<Heading level={2} class="text-center mb-8">
  Centered Heading
</Heading>
```

#### Canonical Scales

| Level | Min Size | Max Size | Range |
|-------|----------|----------|-------|
| h1 | 56px | 112px | Mobile → Desktop |
| h2 | 32px | 56px | Mobile → Desktop |
| h3 | 24px | 36px | Mobile → Desktop |
| h4 | 20px | 28px | Mobile → Desktop |
| h5 | 18px | 24px | Mobile → Desktop |
| h6 | 16px | 20px | Mobile → Desktop |

#### Why Use This Component?

- ✅ Smooth scaling (no jarring breakpoint jumps)
- ✅ Consistent typography across properties
- ✅ Standards-compliant (per STANDARDS.md)
- ✅ Proper letter-spacing per level
- ✅ Semantic HTML elements

---

### Card

Versatile card component with standardized variants.

#### Props

```typescript
interface CardProps {
  variant?: 'standard' | 'elevated' | 'outlined';
  radius?: 'sm' | 'md' | 'lg' | 'xl';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;           // Lift effect on hover
  href?: string;             // Renders as link if provided
  class?: string;
  onclick?: (event: MouseEvent) => void;
}
```

#### Usage

**Basic Card:**
```svelte
<Card>
  <h3>Card Title</h3>
  <p>Card content goes here.</p>
</Card>
```

**With All Options:**
```svelte
<Card
  variant="elevated"
  radius="lg"
  padding="xl"
  hover={true}
>
  <Heading level={3}>Featured Item</Heading>
  <p>This card lifts on hover.</p>
</Card>
```

**As Link:**
```svelte
<Card href="/article/123" hover={true}>
  <h3>Read Article</h3>
  <p>Click anywhere to navigate.</p>
</Card>
```

**Clickable Card:**
```svelte
<Card onclick={() => console.log('Clicked!')} hover={true}>
  <p>This entire card is clickable.</p>
</Card>
```

#### Variants

**Standard (default):**
- Dark background (`#0a0a0a`)
- Subtle border
- Best for most use cases

**Elevated:**
- Dark background
- Border + shadow
- Best for featured content

**Outlined:**
- Transparent background
- Thicker border (2px)
- Best for emphasized containers

#### Padding Sizes

Uses golden ratio spacing:

| Size | Padding | Use Case |
|------|---------|----------|
| `none` | 0 | Custom padding |
| `sm` | 1rem | Compact cards |
| `md` | 1.5rem | Standard cards |
| `lg` | 2rem | Comfortable cards |
| `xl` | 3rem | Spacious cards |

---

## Utility Components

### SEO

Comprehensive SEO component with Open Graph and Twitter cards.

#### Props

```typescript
interface SEOProps {
  title: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  twitterCard?: 'summary' | 'summary_large_image';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}
```

#### Usage

**Basic Page:**
```svelte
<SEO
  title="About | CREATE SOMETHING"
  description="Learn about our AI-native development research."
  keywords={['AI', 'development', 'research']}
  canonical="https://createsomething.io/about"
/>
```

**Article/Blog Post:**
```svelte
<SEO
  title="Building with Claude Code | CREATE SOMETHING"
  description="A deep dive into AI-native development patterns."
  ogType="article"
  ogImage="https://createsomething.io/og-images/article-123.png"
  twitterCard="summary_large_image"
  author="Micah Johnson"
  publishedTime="2025-11-21T00:00:00Z"
  modifiedTime="2025-11-21T12:00:00Z"
/>
```

---

### PaperCard

Specialized card for displaying research papers (from .io).

#### Props

```typescript
interface PaperCardProps {
  paper: Paper;
  featured?: boolean;
}

interface Paper {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
  featured?: boolean;
}
```

#### Usage

```svelte
<script>
  import { PaperCard } from '@create-something/components';

  const paper = {
    id: '1',
    title: 'Building with Claude Code',
    slug: 'building-with-claude-code',
    excerpt: 'A comprehensive guide...',
    category: 'AI Development',
    readTime: '15 min',
    date: '2025-11-21',
    featured: true
  };
</script>

<PaperCard {paper} featured={true} />
```

---

## Design Tokens

### Importing Tokens

```typescript
import {
  spacing,
  radius,
  animation,
  zIndex,
  getSpacing,
  getRadius,
  getDuration,
  getZIndex
} from '@create-something/components';
```

### Spacing (Golden Ratio)

```typescript
// Direct access
spacing.xs   // '0.5rem'  (8px)
spacing.sm   // '1rem'    (16px)
spacing.md   // '1.618rem' (26px) φ¹
spacing.lg   // '2.618rem' (42px) φ²
spacing.xl   // '4.236rem' (68px) φ³
spacing['2xl'] // '6.854rem' (110px) φ⁴
spacing['3xl'] // '11.089rem' (177px) φ⁵

// Helper function
getSpacing('lg') // '2.618rem'
```

**Usage in Components:**
```svelte
<div style="padding: {spacing.lg}; margin-bottom: {spacing.md};">
  Content with token-based spacing
</div>
```

### Border Radius

```typescript
radius.sm   // '6px'    - Subtle
radius.md   // '8px'    - Standard
radius.lg   // '12px'   - Prominent
radius.xl   // '16px'   - Large
radius.full // '9999px' - Circular

// Helper
getRadius('lg') // '12px'
```

**Usage:**
```svelte
<div style="border-radius: {radius.lg};">
  Rounded content
</div>
```

### Animation

```typescript
// Easing
animation.ease.standard // 'cubic-bezier(0.4, 0.0, 0.2, 1)'

// Durations
animation.duration.micro    // '200ms'
animation.duration.standard // '300ms'
animation.duration.complex  // '500ms'

// Presets
transitions.opacity    // 'opacity 200ms cubic-bezier(...)'
transitions.colors     // 'color 300ms cubic-bezier(...)'
transitions.transform  // 'transform 300ms cubic-bezier(...)'
```

**Usage:**
```svelte
<style>
  .my-element {
    transition: var(--transition, {transitions.opacity});
  }

  .my-element:hover {
    opacity: 0.7;
  }
</style>
```

### Z-Index

```typescript
zIndex.base     // 0
zIndex.dropdown // 10
zIndex.sticky   // 20
zIndex.fixed    // 50
zIndex.modal    // 100
zIndex.popover  // 200
zIndex.tooltip  // 300

// Helper
getZIndex('fixed') // 50
```

**Usage:**
```svelte
<nav style="z-index: {zIndex.fixed};">
  Fixed navigation
</nav>
```

---

## Examples

### Complete Page Layout

```svelte
<script lang="ts">
  import {
    Navigation,
    Footer,
    Heading,
    Button,
    Card,
    SEO
  } from '@create-something/components';
  import { page } from '$app/stores';

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' }
  ];

  const quickLinks = [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' }
  ];
</script>

<SEO
  title="My Page | CREATE SOMETHING"
  description="Page description here"
  canonical="https://example.com/my-page"
/>

<Navigation
  logo="CREATE SOMETHING"
  logoSuffix=".ltd"
  links={navLinks}
  currentPath={$page.url.pathname}
  fixed={true}
  ctaLabel="Contact"
  ctaHref="/contact"
/>

<div class="pt-[72px]"> <!-- Account for fixed nav -->
  <section class="py-20 px-6">
    <div class="max-w-4xl mx-auto">
      <Heading level={1}>Welcome</Heading>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Card variant="elevated" hover={true} href="/article-1">
          <Heading level={3}>Article 1</Heading>
          <p>Description here.</p>
        </Card>

        <Card variant="elevated" hover={true} href="/article-2">
          <Heading level={3}>Article 2</Heading>
          <p>Description here.</p>
        </Card>
      </div>

      <div class="mt-8 flex gap-4">
        <Button variant="primary" href="/get-started">
          Get Started
        </Button>
        <Button variant="secondary" href="/learn-more">
          Learn More
        </Button>
      </div>
    </div>
  </section>
</div>

<Footer
  mode="ltd"
  showRamsQuote={true}
  quickLinks={quickLinks}
/>
```

### Form with Button

```svelte
<script>
  import { Button } from '@create-something/components';

  let email = '';
  let isSubmitting = false;

  async function handleSubmit() {
    isSubmitting = true;
    // Submit logic
    isSubmitting = false;
  }
</script>

<form onsubmit|preventDefault={handleSubmit}>
  <input
    type="email"
    bind:value={email}
    placeholder="Enter email"
    class="px-4 py-3 rounded-lg border border-white/10"
  />

  <Button
    type="submit"
    variant="primary"
    disabled={isSubmitting}
  >
    {isSubmitting ? 'Submitting...' : 'Subscribe'}
  </Button>
</form>
```

### Card Grid

```svelte
<script>
  import { Card, Heading } from '@create-something/components';

  const items = [
    { title: 'Item 1', desc: 'Description 1', link: '/1' },
    { title: 'Item 2', desc: 'Description 2', link: '/2' },
    { title: 'Item 3', desc: 'Description 3', link: '/3' }
  ];
</script>

<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
  {#each items as item}
    <Card
      variant="elevated"
      hover={true}
      href={item.link}
    >
      <Heading level={3}>{item.title}</Heading>
      <p class="text-white/70 mt-2">{item.desc}</p>
    </Card>
  {/each}
</div>
```

---

## Accessibility

All components follow WCAG 2.1 Level AA guidelines:

### Touch Targets
- ✅ Minimum 44px × 44px for all interactive elements
- ✅ Applies to buttons, links, and clickable cards

### Keyboard Navigation
- ✅ All interactive elements focusable
- ✅ Visible focus states (2px outline)
- ✅ Logical tab order

### ARIA Labels
- ✅ Navigation menu buttons have descriptive labels
- ✅ Links have meaningful text
- ✅ Interactive cards use semantic HTML

### Semantic HTML
- ✅ Proper heading hierarchy (h1-h6)
- ✅ Navigation wrapped in `<nav>`
- ✅ Buttons use `<button>` element
- ✅ Links use `<a>` element

### Color Contrast
- ✅ Pure black/white ensures maximum contrast
- ✅ Opacity modifiers maintain readability

---

## Best Practices

### 1. Use Semantic Components

```svelte
<!-- ✅ GOOD: Semantic heading -->
<Heading level={2}>Section Title</Heading>

<!-- ❌ BAD: Styled div -->
<div class="text-3xl font-bold">Section Title</div>
```

### 2. Leverage Design Tokens

```svelte
<!-- ✅ GOOD: Use tokens -->
<div style="padding: {spacing.lg}; border-radius: {radius.md};">

<!-- ❌ BAD: Arbitrary values -->
<div style="padding: 2rem; border-radius: 8px;">
```

### 3. Respect Touch Targets

```svelte
<!-- ✅ GOOD: Button component (guaranteed 44px) -->
<Button size="sm">Click</Button>

<!-- ❌ BAD: Custom button without size guarantee -->
<button class="p-1">Click</button>
```

### 4. Use Fixed Navigation Properly

```svelte
<!-- ✅ GOOD: Account for fixed nav -->
<Navigation fixed={true} ... />
<div class="pt-[72px]">
  <main>Content</main>
</div>

<!-- ❌ BAD: Content hidden under fixed nav -->
<Navigation fixed={true} ... />
<main>Content</main> <!-- Hidden under nav! -->
```

### 5. Include "Modes of Being"

```svelte
<!-- ✅ GOOD: Footer with mode -->
<Footer mode="io" ... />

<!-- ⚠️  WARNING: Footer without mode (defaults to 'ltd') -->
<Footer />
```

### 6. Use Fluid Typography

```svelte
<!-- ✅ GOOD: Fluid heading -->
<Heading level={1}>Title</Heading>

<!-- ❌ BAD: Fixed size with breakpoints -->
<h1 class="text-4xl md:text-6xl">Title</h1>
```

### 7. Consistent Spacing

```svelte
<!-- ✅ GOOD: Golden ratio spacing -->
<section class="py-20">
  <div class="space-y-8">

<!-- ❌ BAD: Arbitrary spacing -->
<section class="py-16">
  <div class="space-y-7">
```

---

## Testing Components

### Visual Testing

```bash
# Start development server
pnpm dev:ltd

# Check components at:
# - Mobile: 375px width
# - Tablet: 768px width
# - Desktop: 1440px width
```

### Accessibility Testing

```bash
# Run Lighthouse in Chrome DevTools
# Check for:
# - Accessibility score: 100
# - Touch targets: 44px minimum
# - Color contrast: AAA
```

### Type Checking

```bash
# Verify types compile
pnpm check
```

---

## Migration from Local Components

### Step 1: Install (Already Done)

Components are available in the workspace.

### Step 2: Replace Imports

```typescript
// OLD
import Navigation from '$lib/components/Navigation.svelte';
import Footer from '$lib/components/Footer.svelte';

// NEW
import { Navigation, Footer } from '@create-something/components';
```

### Step 3: Update Props

Check this guide for proper prop usage, especially:
- Navigation now requires `logo` and `links` props
- Footer has new `mode` prop

### Step 4: Remove Local Components

After migration, delete local component files.

---

## Support & Contributing

### Questions?
- Check `/STANDARDS.md` for design principles
- Check `/IMPLEMENTATION_SUMMARY.md` for changes
- Check examples in this guide

### Found a Bug?
- Verify it's not in your implementation
- Check if it follows WCAG 2.1 AA
- Create an issue with reproduction steps

### Contributing?
- Follow "less, but better" philosophy
- Maintain 44px touch targets
- Use golden ratio spacing
- Add TypeScript types
- Include usage examples

---

**"Weniger, aber besser"** - Dieter Rams

This component library embodies "less, but better" through:
- Minimal, purposeful components
- Standards-compliant implementation
- Accessibility-first design
- Mathematical elegance (golden ratio)
- Hermeneutic flexibility

---

**Last Updated:** November 21, 2025
**Version:** 1.0
**Status:** Production Ready ✅

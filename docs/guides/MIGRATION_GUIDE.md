# Migration Guide: .space and .agency to Monorepo

**Target Date:** TBD
**Status:** Ready to Execute
**Dependencies:** Component library complete ✅

---

## Overview

This guide provides step-by-step instructions for migrating CREATE SOMETHING.space and CREATE SOMETHING.agency into the monorepo with full standards compliance.

### What's Ready

✅ Component library (`@create-something/components`)
✅ Design tokens (spacing, radius, animation, zIndex)
✅ Standards documentation (`/STANDARDS.md`)
✅ Reference implementations (.ltd, .io)
✅ Hermeneutic validation process

### What's Needed

- [ ] Move .space codebase to `packages/space/`
- [ ] Move .agency codebase to `packages/agency/`
- [ ] Fix accessibility violations (44px touch targets)
- [ ] Implement fluid typography
- [ ] Verify golden ratio spacing
- [ ] Fix branding (.space → "CREATE SOMETHING.space")
- [ ] Migrate to shared components

---

## Pre-Migration Checklist

### For Both Properties

- [ ] Backup current deployments
- [ ] Document current functionality
- [ ] List all custom components
- [ ] Identify third-party dependencies
- [ ] Note environment variables
- [ ] Export content/data if needed

### Known Issues from Audit

#### .space
- ❌ Touch targets: 26px (needs 44px)
- ❌ Branding: "THE EXPERIMENTAL LAYER" (needs "CREATE SOMETHING.space")
- ⚠️  Typography: May not use clamp()
- ⚠️  Spacing: May not use golden ratio

#### .agency
- ❌ Touch targets: 26px (needs 44px)
- ⚠️  Typography: May not use clamp()
- ⚠️  Spacing: May not use golden ratio
- ✅ Branding: "CREATE SOMETHING AGENCY" (acceptable)

---

## Phase 1: Repository Setup

### Step 1.1: Add to Monorepo

```bash
# From monorepo root
cd packages/

# Option A: Clone existing repo
git clone https://github.com/your-org/create-something-space.git space
cd space
rm -rf .git  # Remove git history

# Option B: Copy from local
cp -r /path/to/create-something-space ./space

# Repeat for .agency
```

### Step 1.2: Update package.json

**packages/space/package.json:**
```json
{
  "name": "@create-something/space",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json"
  },
  "dependencies": {
    "@create-something/components": "workspace:*"
  },
  "devDependencies": {
    "@sveltejs/adapter-cloudflare": "^4.0.0",
    "@sveltejs/kit": "^2.0.0",
    "@sveltejs/vite-plugin-svelte": "^4.0.0",
    "svelte": "^5.0.0",
    "svelte-check": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

### Step 1.3: Update Root package.json

**package.json (root):**
```json
{
  "scripts": {
    "dev:space": "pnpm --filter @create-something/space dev",
    "dev:agency": "pnpm --filter @create-something/agency dev",
    "build:space": "pnpm --filter @create-something/space build",
    "build:agency": "pnpm --filter @create-something/agency build"
  }
}
```

### Step 1.4: Install Dependencies

```bash
# From monorepo root
pnpm install
```

---

## Phase 2: Fix Critical Issues

### Step 2.1: Fix Touch Targets

**Current (.space navigation):**
```svelte
<!-- ❌ BAD: 26px touch target -->
<button class="md:hidden p-2">
  <svg class="w-6 h-6">...</svg>
</button>
```

**Fixed (use shared Navigation):**
```svelte
<script>
  import { Navigation } from '@create-something/components';

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Experiments', href: '/experiments' },
    // ...
  ];
</script>

<Navigation
  logo="CREATE SOMETHING"
  logoSuffix=".space"
  links={navLinks}
  currentPath={$page.url.pathname}
  fixed={true}
/>
```

**Result:** ✅ 44px touch target guaranteed

### Step 2.2: Fix Branding (.space only)

**Current:**
```svelte
<div class="text-2xl font-bold">
  THE EXPERIMENTAL LAYER
</div>
```

**Fixed:**
```svelte
<Navigation
  logo="CREATE SOMETHING"
  logoSuffix=".space"
  ...
/>

<!-- Or if you want to keep subtitle: -->
<div>
  <div class="text-2xl font-bold">CREATE SOMETHING.space</div>
  <div class="text-sm opacity-60">The Experimental Layer</div>
</div>
```

### Step 2.3: Implement Fluid Typography

**Add to app.css:**
```css
/* Fluid Typography Scale - Standards Compliant */
h1 {
  font-size: clamp(3.5rem, 9vw, 7rem);    /* 56px → 112px */
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.2;
}

h2 {
  font-size: clamp(2rem, 5vw, 3.5rem);    /* 32px → 56px */
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

h3 {
  font-size: clamp(1.5rem, 3vw, 2.25rem); /* 24px → 36px */
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

h4 {
  font-size: clamp(1.25rem, 2.5vw, 1.75rem); /* 20px → 28px */
  font-weight: 700;
  letter-spacing: -0.015em;
  line-height: 1.2;
}

h5 {
  font-size: clamp(1.125rem, 2vw, 1.5rem); /* 18px → 24px */
  font-weight: 700;
  letter-spacing: -0.015em;
  line-height: 1.2;
}

h6 {
  font-size: clamp(1rem, 1.5vw, 1.25rem);  /* 16px → 20px */
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

p {
  font-size: clamp(1rem, 1.5vw, 1.25rem);  /* 16px → 20px */
  line-height: 1.6;
  letter-spacing: -0.01em;
}
```

### Step 2.4: Migrate to Golden Ratio Spacing

**Add to app.css:**
```css
:root {
  /* Spacing - Golden Ratio (φ = 1.618) */
  --space-xs: 0.5rem;      /* 8px */
  --space-sm: 1rem;        /* 16px */
  --space-md: 1.618rem;    /* ~26px - φ¹ */
  --space-lg: 2.618rem;    /* ~42px - φ² */
  --space-xl: 4.236rem;    /* ~68px - φ³ */
  --space-2xl: 6.854rem;   /* ~110px - φ⁴ */
  --space-3xl: 11.089rem;  /* ~177px - φ⁵ */

  /* Legacy aliases for backward compatibility (if needed) */
  --spacing-section: var(--space-2xl);
  --spacing-headline: var(--space-lg);
}
```

**Update usage:**
```css
/* Before */
section {
  padding-top: 7.5rem;
}

/* After */
section {
  padding-top: var(--space-2xl); /* 6.854rem ≈ 7.5rem */
}
```

---

## Phase 3: Migrate to Shared Components

### Step 3.1: Update Layout

**Before (packages/space/src/routes/+layout.svelte):**
```svelte
<script>
  import '../app.css';
  import Navigation from '$lib/components/Navigation.svelte';
  import Footer from '$lib/components/Footer.svelte';
</script>

<Navigation />
<main>
  {@render children()}
</main>
<Footer />
```

**After:**
```svelte
<script>
  import '../app.css';
  import { Navigation, Footer } from '@create-something/components';
  import { page } from '$app/stores';

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Experiments', href: '/experiments' },
    { label: 'Methodology', href: '/methodology' },
    { label: 'About', href: '/about' }
  ];

  const quickLinks = [
    { label: 'Home', href: '/' },
    { label: 'All Experiments', href: '/experiments' },
    { label: 'About', href: '/about' }
  ];
</script>

<!-- Add fonts, meta tags, etc. -->
<svelte:head>
  <meta name="theme-color" content="#000000" />
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    href="https://fonts.googleapis.com/css2?family=Stack+Sans+Notch:wght@200..700&family=JetBrains+Mono:wght@400;500;600&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="min-h-screen bg-black">
  <Navigation
    logo="CREATE SOMETHING"
    logoSuffix=".space"
    links={navLinks}
    currentPath={$page.url.pathname}
    fixed={true}
    ctaLabel="Contact"
    ctaHref="/contact"
  />

  <!-- Add padding for fixed nav -->
  <div class="pt-[72px]">
    <main class="flex-1">
      {@render children()}
    </main>
  </div>

  <Footer
    mode="space"
    aboutText="Interactive laboratory for hands-on practice with executable code environments."
    quickLinks={quickLinks}
    showSocial={true}
  />
</div>
```

### Step 3.2: Remove Old Components

After verifying everything works:

```bash
# Remove old local components
rm -rf packages/space/src/lib/components/Navigation.svelte
rm -rf packages/space/src/lib/components/Footer.svelte
```

### Step 3.3: Update Individual Pages

Remove any inline Navigation components:

```svelte
<!-- Before -->
<div class="min-h-screen bg-black">
  <Navigation />
  <main>
    <!-- content -->
  </main>
  <Footer />
</div>

<!-- After (Navigation and Footer now in layout) -->
<!-- content -->
```

---

## Phase 4: Testing & Validation

### Step 4.1: Type Checking

```bash
pnpm --filter @create-something/space check
pnpm --filter @create-something/agency check
```

Expected: 0 errors, 0 warnings

### Step 4.2: Build Test

```bash
pnpm build:space
pnpm build:agency
```

Expected: Successful builds

### Step 4.3: Visual Testing

```bash
pnpm dev:space
pnpm dev:agency
```

**Test Checklist:**
- [ ] Navigation displays correctly
- [ ] Mobile menu works (hamburger icon)
- [ ] Touch targets are 44px minimum
- [ ] Branding shows "CREATE SOMETHING.space/agency"
- [ ] Footer shows "Modes of Being"
- [ ] Typography scales smoothly
- [ ] Spacing looks consistent
- [ ] All pages accessible

### Step 4.4: Accessibility Audit

**Chrome DevTools > Lighthouse:**
- [ ] Performance: 90+
- [ ] Accessibility: 100
- [ ] Best Practices: 90+
- [ ] SEO: 90+

**Manual Checks:**
- [ ] Tab through all interactive elements
- [ ] Verify focus states visible
- [ ] Test on mobile device (real device preferred)
- [ ] Verify touch targets with finger
- [ ] Test with screen reader

### Step 4.5: Cross-Browser Testing

Test in:
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## Phase 5: Deployment

### Step 5.1: Update GitHub Actions

**.github/workflows/deploy-space.yml:**
```yaml
name: Deploy .space

on:
  push:
    branches: [main]
    paths:
      - 'packages/space/**'
      - 'packages/components/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build component library
        run: pnpm build:lib

      - name: Build .space
        run: pnpm build:space

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: create-something-space
          directory: packages/space/build
```

### Step 5.2: Configure Cloudflare

**Cloudflare Pages Settings:**
- Build command: `pnpm install && pnpm build:lib && pnpm build:space`
- Build output directory: `packages/space/build`
- Root directory: `/`
- Node version: 20

### Step 5.3: Deploy

```bash
# Test build locally first
pnpm build:lib && pnpm build:space

# If successful, push to trigger deployment
git add .
git commit -m "feat: migrate .space to monorepo"
git push origin main
```

---

## Troubleshooting

### Issue: Import errors for components

**Error:**
```
Cannot find module '@create-something/components'
```

**Solution:**
```bash
# Rebuild component library
pnpm build:lib

# Clear node_modules and reinstall
rm -rf node_modules packages/*/node_modules
pnpm install
```

### Issue: Touch targets still too small

**Check:**
1. Using shared `<Navigation>` component? (Not local version)
2. Deleted old local Navigation component?
3. Cleared browser cache?

**Verify:**
```bash
# In browser DevTools, inspect button
# Should see: w-11 h-11 (44px × 44px)
```

### Issue: Typography not fluid

**Check:**
1. Added clamp() styles to app.css?
2. Styles loading before Tailwind?
3. Not overriding with Tailwind classes?

**Verify:**
```bash
# In browser DevTools, inspect h1
# Should see: font-size: clamp(3.5rem, 9vw, 7rem)
```

### Issue: Footer not showing "Modes of Being"

**Check:**
1. Using shared `<Footer>` component?
2. Passed `mode` prop?

**Fix:**
```svelte
<Footer mode="space" ... />
```

### Issue: Build fails

**Common causes:**
1. Component library not built: Run `pnpm build:lib` first
2. Type errors: Run `pnpm check` to identify
3. Missing dependencies: Run `pnpm install`

---

## Rollback Plan

If migration fails:

### Step 1: Revert Code
```bash
git revert <commit-hash>
git push origin main
```

### Step 2: Redeploy Old Version
- Restore previous Cloudflare Pages deployment
- Or deploy from backup branch

### Step 3: Document Issues
- Note what failed
- Identify root cause
- Update migration guide

---

## Post-Migration Checklist

### Verification
- [ ] All pages load correctly
- [ ] Navigation works on mobile
- [ ] Footer shows all modes
- [ ] Forms submit properly
- [ ] Images load correctly
- [ ] Analytics tracking works
- [ ] Performance is acceptable
- [ ] No console errors

### Documentation
- [ ] Update README with new structure
- [ ] Document any property-specific components
- [ ] Note any deviations from standards
- [ ] Update deployment documentation

### Monitoring
- [ ] Set up error tracking
- [ ] Monitor performance metrics
- [ ] Watch for user feedback
- [ ] Track accessibility scores

---

## Timeline Estimate

### .space Migration
- **Phase 1** (Setup): 1-2 hours
- **Phase 2** (Fix Issues): 2-4 hours
- **Phase 3** (Migrate Components): 2-3 hours
- **Phase 4** (Testing): 2-4 hours
- **Phase 5** (Deployment): 1-2 hours
- **Total**: 8-15 hours

### .agency Migration
- Similar timeline: 8-15 hours

### Both Properties
- Can be done in parallel: 1-2 days
- Or sequentially (learn from first): 2-3 days

---

## Success Criteria

Migration is complete when:

✅ **Build & Deploy**
- [ ] Builds without errors
- [ ] Deploys successfully to Cloudflare Pages
- [ ] All pages accessible

✅ **Standards Compliance**
- [ ] Touch targets ≥ 44px
- [ ] Fluid typography implemented
- [ ] Golden ratio spacing used
- [ ] Proper branding
- [ ] "Modes of Being" in footer

✅ **Code Quality**
- [ ] Type checking passes (0 errors)
- [ ] Uses shared components
- [ ] No duplicate components
- [ ] Proper imports

✅ **User Experience**
- [ ] Navigation works on mobile
- [ ] Forms function correctly
- [ ] Performance acceptable
- [ ] Accessibility score: 100

✅ **Documentation**
- [ ] Migration documented
- [ ] Deviations noted
- [ ] Deployment updated

---

## Example: Complete .space Migration

### Before Structure
```
create-something-space/
├── src/
│   ├── lib/
│   │   └── components/
│   │       ├── Navigation.svelte  (local, 26px touch targets)
│   │       └── Footer.svelte      (local)
│   ├── routes/
│   └── app.css  (no fluid typography)
└── package.json
```

### After Structure
```
packages/
├── components/  (shared library)
├── space/
│   ├── src/
│   │   ├── routes/
│   │   │   └── +layout.svelte  (uses shared Navigation & Footer)
│   │   └── app.css  (has fluid typography)
│   └── package.json  (depends on @create-something/components)
```

### Key Changes
1. ✅ Removed local Navigation (now uses shared)
2. ✅ Removed local Footer (now uses shared)
3. ✅ Added fluid typography to app.css
4. ✅ Added golden ratio spacing variables
5. ✅ Fixed branding in layout
6. ✅ Updated all imports
7. ✅ Touch targets now 44px

---

## Support

If you encounter issues during migration:

1. **Check this guide** for troubleshooting steps
2. **Review `/STANDARDS.md`** for requirements
3. **Check `/COMPONENT_GUIDE.md`** for component usage
4. **Look at .io implementation** as reference
5. **Review git history** for similar fixes

---

**"Weniger, aber besser"** - Dieter Rams

This migration embodies "less, but better" by:
- Consolidating duplicate components
- Enforcing consistent standards
- Improving accessibility
- Maintaining ecosystem coherence
- Enabling shared improvements

---

**Status:** Ready to Execute
**Last Updated:** November 21, 2025
**Success Rate (similar migrations):** 100% (.ltd, .io)

# Animation Duration Token Audit
**Date**: 2025-12-18
**Scope**: Verify all animations use Canon duration tokens

---

## Executive Summary

```
╔══════════════════════════════════════════════════════════════════╗
║  ANIMATION COMPLIANCE ASSESSMENT                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Compliant Uses:     643 occurrences across 258 files           ║
║  Violations Found:   ~80+ hardcoded durations                   ║
║                                                                  ║
║  Primary Violator: packages/maverick (client project)           ║
║  Secondary:        packages/verticals/law-firm                  ║
║                    packages/agency/clients/the-stack            ║
║                                                                  ║
║  Core properties (.space, .io, .agency, .ltd): MOSTLY COMPLIANT ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## Canon Duration Tokens Reference

From `packages/verticals/shared/canon.css`:

| Token | Value | Use Case |
|-------|-------|----------|
| `--duration-instant` | 100ms | Perceived as instant |
| `--duration-micro` | 150ms | Quick feedback |
| `--duration-fast` | 200ms | Fast response |
| `--duration-standard` | 300ms | Default transitions |
| `--duration-complex` | 500ms | Significant state changes |
| `--duration-slow` | 700ms | Theatrical (requires justification) |

Easing tokens:
- `--ease-standard`: `cubic-bezier(0.4, 0.0, 0.2, 1)` - Natural deceleration
- `--ease-decelerate`: `cubic-bezier(0.0, 0.0, 0.2, 1)` - Begins instantly
- `--ease-accelerate`: `cubic-bezier(0.4, 0.0, 1, 1)` - Builds speed
- `--ease-sharp`: `cubic-bezier(0.4, 0.0, 0.6, 1)` - Punchy

---

## Violations by Package

### packages/maverick (Client Project - External)
**Status**: Heavy violations - client-specific styling, not governed by Canon

Violations include:
- `0.2s ease` patterns (should be `var(--duration-fast) var(--ease-standard)`)
- `0.3s ease` patterns (should be `var(--duration-standard) var(--ease-standard)`)
- `0.5s ease` patterns (should be `var(--duration-complex) var(--ease-standard)`)
- `0.7s ease-out` (should be `var(--duration-slow) var(--ease-decelerate)`)
- `0.8s ease-out` (exceeds Canon; needs justification)

Files affected:
- `src/routes/water-treatment/+page.svelte` (4 violations)
- `src/routes/news/+page.svelte` (3 violations)
- `src/routes/admin/+layout.svelte` (7 violations)
- `src/routes/admin/login/+page.svelte` (3 violations)
- `src/routes/admin/content/+page.svelte` (5 violations)
- `src/lib/components/ContactModal.svelte` (20+ violations)
- `src/lib/components/TabbedSolutions.svelte` (3 violations)
- `src/lib/components/Introduction.svelte` (2 violations)
- `src/lib/components/ProductShowcase.svelte` (4 violations)
- `src/lib/components/Header.svelte` (7 violations)
- `src/lib/components/OperationsHotspot.svelte` (3 violations)

### packages/verticals/law-firm
**Status**: Multiple violations

Files affected:
- `src/routes/about/+page.svelte:352` - `transition: opacity 0.2s;`
- `src/lib/components/Footer.svelte` (4 violations: `transition: color 0.2s;`)
- `src/lib/components/PracticeAreasSection.svelte` (3 violations)

### packages/verticals/personal-injury
**Status**: Multiple violations (mirrors law-firm)

Files affected:
- `src/routes/about/+page.svelte:352` - `transition: opacity 0.2s;`
- `src/lib/components/Footer.svelte` (4 violations)

### packages/agency/clients/the-stack (Client Project)
**Status**: Uses client-specific easing (`--ease-stack`), but hardcodes durations

Files affected:
- `src/routes/+error.svelte:133` - `0.3s var(--ease-stack)`
- `src/routes/contact/+page.svelte` (3 violations)
- `src/lib/components/VideoHero.svelte` - `0.3s var(--ease-stack)`
- `src/lib/components/SocialLinks.svelte` - `0.2s var(--ease-stack)`
- `src/lib/components/FAQItem.svelte` - `0.3s var(--ease-stack)`
- `src/lib/components/FeatureCard.svelte` - `0.6s var(--ease-stack)`
- `src/lib/components/Navigation.svelte` (2 violations)

### packages/ltd
**Status**: Minor violations

Files affected:
- `src/lib/components/MasterCard.svelte:30` - `transition: border-color 0.2s;`

### packages/agency (Core)
**Status**: Mostly compliant, one file with violations

Files affected:
- `src/lib/components/TextRevelation.svelte:147,164` - Uses `0.8s` and `0.6s` (exceeds Canon)

### packages/space
**Status**: Mostly compliant, experimental files with acceptable drift

Files affected:
- `src/lib/components/ExperimentCodeEditor.svelte` - `transition: all 0.2s;` (3 violations)

### packages/io
**Status**: Experimental route with acceptable drift

Files affected:
- `src/routes/experiments/text-revelation/+page.svelte:206` - `transition: all 0.8s`

### packages/components (Shared)
**Status**: Compliant with fallback patterns

Note: Some files use fallback syntax like:
```css
transition: fill var(--duration-micro, 200ms) var(--ease-standard, ease);
```
This is acceptable - it provides fallbacks when tokens aren't defined.

---

## Compliant Packages

The following packages are **fully compliant** with Canon duration tokens:

- `packages/verticals/medical-practice` ✓
- `packages/verticals/professional-services` ✓
- `packages/verticals/creative-portfolio` ✓
- `packages/verticals/creative-agency` ✓
- `packages/verticals/architecture-studio` ✓
- `packages/templates-platform` ✓
- `packages/lms` ✓
- `packages/maverick-admin` ✓

---

## Recommendations

### Priority 1: Core Properties
These should be fixed immediately as they represent Canon violations in CREATE SOMETHING properties:

1. **packages/ltd** - `MasterCard.svelte`
   - Change `0.2s` → `var(--duration-fast)`

2. **packages/agency** - `TextRevelation.svelte`
   - Complex animation exceeding Canon may be intentional (experimental component)
   - Consider documenting justification or using `--duration-slow`

### Priority 2: Vertical Templates
Fix before releasing to production:

1. **packages/verticals/law-firm** - Footer, PracticeAreasSection, about page
2. **packages/verticals/personal-injury** - Footer, about page

### Priority 3: Client Projects (Deferred)
These are external client projects with their own design systems:

- `packages/maverick` - Has its own motion language
- `packages/agency/clients/the-stack` - Uses custom `--ease-stack` easing

Client projects may intentionally deviate from Canon. Migration should be discussed with stakeholders.

### Priority 4: Experimental Routes (Acceptable Drift)
Per Canon rules, experimental routes may drift during development:

- `packages/space/src/lib/components/ExperimentCodeEditor.svelte`
- `packages/io/src/routes/experiments/text-revelation/+page.svelte`

These should be migrated before promotion to production.

---

## Subtractive Triad Reflection

| Level | Assessment |
|-------|------------|
| **DRY** | Good coverage. 643 uses of tokens vs ~80 hardcoded values (~89% compliance) |
| **Rams** | Token set is minimal and justified. Extended tokens (`instant`, `fast`, `slow`) in shared canon.css serve real use cases |
| **Heidegger** | Core properties mostly serve the whole. Client projects intentionally diverge. |

---

## Action Items

- [ ] Fix `MasterCard.svelte` in packages/ltd
- [ ] Review `TextRevelation.svelte` duration justification
- [ ] Fix law-firm and personal-injury Footer components
- [ ] Create migration ticket for maverick package (stakeholder discussion)
- [ ] Update `.claude/rules/css-canon.md` to include full duration scale from shared canon.css

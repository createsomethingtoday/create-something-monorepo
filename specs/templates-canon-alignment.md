# Templates Canon Alignment

Ensure all template verticals and the templates-platform follow CREATE SOMETHING Canon design principles consistently.

## Overview

Audit and align CSS/styling across template verticals to ensure:
- Consistent Canon token usage
- No hardcoded colors, spacing, or typography values
- Proper accessibility (skip-to-content, focus states, reduced-motion)
- DRY shared components where applicable

## Features

### Audit templates-platform for Canon compliance
- Check all components for hardcoded design values
- Verify Canon tokens are used for colors, spacing, typography
- Ensure no Tailwind design utilities (rounded-*, bg-*, text-*, shadow-*) override Canon

### Audit professional-services vertical for Canon compliance
- Check all components and pages for hardcoded values
- Verify consistent use of Canon tokens
- Check accessibility patterns (skip-to-content, focus states)

### Audit law-firm vertical for Canon compliance
- Check all components and pages for hardcoded values
- Verify consistent use of Canon tokens
- Check accessibility patterns

### Audit personal-injury vertical for Canon compliance
- Check all components and pages for hardcoded values
- Verify consistent use of Canon tokens
- Check accessibility patterns

### Add SkipToContent to all verticals missing it
- Check each vertical layout for SkipToContent component
- Add shared SkipToContent component from @create-something/components
- Ensure main content has id="main-content"

### Ensure consistent animation tokens across verticals
- Verify all animations use Canon duration tokens
- Check for prefers-reduced-motion compliance
- Remove any decorative animations

### Create shared Canon CSS import for verticals
- Extract common Canon token definitions to shared location
- Update verticals to import shared tokens
- Reduce duplication across vertical app.css files


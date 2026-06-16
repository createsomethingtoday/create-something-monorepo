---
description: Review a Webflow template against quality standards
argument-hint: "<template-url or template-name>"
---

Load the webflow-fleet skill, then review this Webflow template: **$@**

## Review Criteria

### 1. Design Quality
- Visual hierarchy and layout
- Typography and spacing
- Color usage and consistency
- Responsive behavior

### 2. Accessibility
- Alt text for images
- Color contrast ratios (WCAG AA minimum)
- Keyboard navigation
- Screen reader compatibility

### 3. Performance
- Image optimization
- Animation performance (prefer CSS, avoid heavy JS)
- Asset count and size
- Load time indicators

### 4. Code Quality
- Clean class naming
- DRY CSS patterns
- Proper semantic HTML
- No unnecessary custom code

## Output

```
## Template Review: [name]

### Score: [0-100]

### Design: [score] — [findings]
### Accessibility: [score] — [findings]
### Performance: [score] — [findings]
### Code Quality: [score] — [findings]

### Verdict: [✅ APPROVE | ⚠️ REVISIONS | ❌ REJECT]
### Required Changes: [if any]
```

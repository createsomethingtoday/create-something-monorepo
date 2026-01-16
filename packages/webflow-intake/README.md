# Webflow Intake Pipeline

> **IC MVP → Agentic Engineering → Webflow Code Components**

This directory supports the translation of Webflow IC MVPs into Code Components via DevLink.

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WEBFLOW IC MVP PIPELINE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  IC CREATION              AGENTIC ENGINEERING           PRODUCTION          │
│  ────────────             ───────────────────           ──────────          │
│                                                                             │
│  AI Studio                                              packages/[name]/    │
│  Cursor           ───→    Cursor / Claude Code   ───→   └── *.webflow.tsx   │
│  Claude Code              (direct translation)                              │
│  Lovable                                                DevLink Library     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Fast Path (Default)

Most MVPs go directly to agentic engineering:

```
"Review this codebase and create the Webflow Component version"
   └── Agent analyzes MVP
   └── Creates packages/[name]-core/ (if needed)
   └── Creates packages/[name]/
   └── Adds *.webflow.tsx wrappers
   └── Configures webflow.json
```

**No intake review needed** for straightforward projects.

## Slow Path (Complex Cases)

For complex MVPs that need evaluation, use `INTAKE_TEMPLATE.md`:

| Criterion | Question |
|-----------|----------|
| **React Compatibility** | Is it React-based or easily portable? |
| **Component Boundaries** | Can this be split into reusable components? |
| **Props Surface** | Are inputs clearly defined for Designer exposure? |
| **State Complexity** | Can state be managed within component scope? |
| **External Dependencies** | Are deps compatible with Webflow bundling? |

## Project Structure

```
webflow-intake/
├── README.md                    # This file
├── INTAKE_TEMPLATE.md           # Template for intake reviews
│
├── bundle-scanner/              # APPROVED → moved to packages/bundle-scanner
│   └── INTAKE.md                # Review notes (archived)
│
├── [next-project]/              # Pending review
│   ├── src/                     # Original MVP code
│   ├── package.json
│   └── INTAKE.md                # Review in progress
│
└── _archive/                    # Completed/rejected intakes
    └── [project]/
        └── INTAKE.md            # Final decision + rationale
```

## Current Projects

| Project | Source | Status | Decision |
|---------|--------|--------|----------|
| Bundle Scanner | App Reviewer IC | ✅ Complete | APPROVED → `packages/bundle-scanner` |

## Related Packages

- `packages/bundle-scanner/` - First graduated project
- `packages/bundle-scanner-core/` - Extracted core logic
- `packages/webflow-components/` - Production component library

## DevLink Reference

See [Webflow Code Components Documentation](https://developers.webflow.com/code-components/introduction) for:
- `declareComponent` API
- Prop type definitions
- Library sharing workflow

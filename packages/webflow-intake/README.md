# Webflow Intake Pipeline

> **IC MVP → Taste Maker Review → Webflow Code Components**

This directory houses projects from Webflow ICs that are candidates for translation into Webflow Code Components via DevLink.

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WEBFLOW IC MVP PIPELINE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. IC CREATION          2. INTAKE                3. TRANSLATION            │
│  ─────────────           ──────────               ──────────────            │
│                                                                             │
│  AI Studio               webflow-intake/          webflow-components/       │
│  Cursor                  └── [project]/           OR                        │
│  Claude Code                 ├── src/             standalone package        │
│  Lovable                     ├── package.json     └── *.webflow.tsx         │
│  (code exports)              └── INTAKE.md                                  │
│                                                                             │
│       ↓                        ↓                        ↓                   │
│  Raw MVP Code            Taste Maker Review       Production Components     │
│                          (Can this translate?)    (DevLink shared library)  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Intake Process

### Step 1: Receive MVP

When an IC submits a project:

```bash
# Copy MVP into intake
cp -r /path/to/ic-mvp packages/webflow-intake/[project-name]

# Create intake document
touch packages/webflow-intake/[project-name]/INTAKE.md
```

### Step 2: Taste Maker Review

Review the MVP against these criteria:

| Criterion | Question | Weight |
|-----------|----------|--------|
| **React Compatibility** | Is it React-based or easily portable? | High |
| **Component Boundaries** | Can this be split into reusable components? | High |
| **Props Surface** | Are inputs clearly defined for Designer exposure? | Medium |
| **State Complexity** | Can state be managed within component scope? | Medium |
| **External Dependencies** | Are deps compatible with Webflow bundling? | Medium |
| **Design System Fit** | Does it align with Canon/Webflow variables? | Low |

### Step 3: Translation Decision

| Verdict | Action |
|---------|--------|
| **APPROVE** | Move to dedicated package, create `.webflow.tsx` wrappers |
| **REFACTOR** | Work with IC to simplify before translation |
| **DEFER** | Park for future consideration |
| **REJECT** | Not suitable for Code Components (document why) |

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

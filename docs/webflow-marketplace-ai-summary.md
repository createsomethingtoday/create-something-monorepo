# How We're Using AI in the Marketplace

A summary for Paige — January 2026

---

## The Short Version

We use AI in two ways: **running operations** and **building tools**.

For operations, one agent handles email classification in production. For building, AI workflows helped us ship the Asset Dashboard, Bundle Scanner, and several internal tools faster than we could have manually.

---

## What's Running in Production

### Email Response Classification

When a creator replies to review feedback, we need to know: are they ready for re-review, or still working on changes?

An AI agent reads incoming emails and classifies them. If the creator says they're done, the agent updates their Asset Version status in Airtable. This saves reviewers from manually triaging email threads.

| Detail | Value |
|--------|-------|
| Platform | Zapier |
| Model | GPT-5.1 |
| What it does | Reads creator emails, updates asset status |
| When it runs | On new Zendesk message sync |

### Template Validation (Designer Extension)

Creators can validate their templates before submitting. The extension checks against Webflow Way guidelines and flags issues upfront—reducing back-and-forth during review.

### Bundle Scanner (Internal)

App Reviewers use this to scan submissions for security issues. It runs 18 rule-based checks plus AI analysis via Google Gemini.

---

## What AI Helped Us Build

These tools exist because AI workflows made development faster:

| Tool | What it does | Time saved |
|------|--------------|------------|
| Asset Dashboard | Creator-facing submission tracking, validation UI, marketplace insights | 12 hours → 83 minutes |
| Check-Asset-Name API | Validates asset names against naming rules | — |
| App Form | Standalone app submission form with auto-retry | — |
| Bundle Scanner | Translated from IC prototype to production component | 3.5 hours total |

The Asset Dashboard refactor is the clearest example. We had a 65% complete port that needed submission tracking, validation UI, and marketplace insights. AI workflows completed 14 implementation tasks autonomously.

---

## Current Numbers

| Metric | December 2025 |
|--------|---------------|
| Assets submitted | 382 |
| Templates | 95% of submissions |
| Apps | 5% of submissions |
| Active reviewers | 5-6 |
| Top 3 reviewers handle | 71% of volume |
| Median review turnaround | 2-3 days |
| Stuck 5+ days | 26 assets (7%) |

---

## What We're Exploring

We're looking at where AI could help more directly with review operations:

| Opportunity | Current state | Goal |
|-------------|---------------|------|
| Response classification accuracy | Unknown baseline | 95%+ |
| Review turnaround | 2-3 days | Under 1 day |
| 5+ day backlog | 26 assets | Under 5 |
| Security pre-scan | Manual | Automated |

The Response Classification agent is our first production use case. We're measuring its accuracy now to understand where it helps and where it doesn't.

---

## Questions?

Happy to dig deeper into any of these. We have documentation on the Dashboard refactor and Bundle Scanner translation if you want the technical details.

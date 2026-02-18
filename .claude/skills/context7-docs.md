---
name: context7-docs
description: Use Context7 MCP to pull up-to-date external library/API docs into context before generating code
category: quality-assurance
triggers:
  - "API docs"
  - "external library"
  - "SDK"
  - "setup"
  - "configuration"
  - "hallucinated API"
related:
  - ground-claims
  - subtractive-review
composable: true
priority: P1
tools: resolve-library-id, query-docs
---

# Context7 Docs

Use Context7 when you need **current** docs/examples for a third-party library. This prevents “looks right” code that fails because the API changed.

## What It Solves

- Outdated examples from training data
- Hallucinated methods/options/imports
- Version mismatches (major framework releases, SDK revs)

## Workflow

1. Identify the library/framework (e.g. “Next.js”, “Cloudflare Workers”, “Supabase JS”).
2. Resolve the Context7 library id (skip if you already know it).
3. Query docs with your exact task and constraints.
4. Implement using the returned, version-appropriate examples.

## Tools

### `resolve-library-id`

Use when you don’t know the Context7 library id.

Inputs:
- `libraryName`: the library name (“nextjs”, “cloudflare workers”, “supabase”)
- `query`: your task (used to rank results)

### `query-docs`

Use after you have a `libraryId`.

Inputs:
- `libraryId`: exact id (e.g. `/vercel/next.js`)
- `query`: your task (“middleware JWT cookie redirect”, “cache JSON responses 5 minutes”, etc.)

## Prompt Patterns

### Minimal

Add to the end of the request:

`use context7`

### Library-Pinned (Faster + Less Ambiguous)

`use library /vercel/next.js`

### Version-Pinned

Mention the version in the request:

“How do I set up Next.js 14 middleware? use context7”

## Boundaries

- **Context7 is for external libs.** For monorepo-local symbols, verify by reading source and/or `pnpm exports` (do not guess imports).
- For high-stakes behavior (security/auth), treat docs as guidance and still reason about threat model and edge cases.


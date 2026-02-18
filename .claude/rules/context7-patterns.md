# Context7 Patterns

When you need **external library/API documentation** (Next.js, Cloudflare Workers, Stripe, Supabase, etc.), use **Context7 MCP** to pull **up-to-date, version-specific docs and examples** into the model context.

This is the default defense against:
- Hallucinated APIs
- Outdated examples from training data
- “Generic” answers that don’t match the installed version

## When To Use Context7

Use Context7 when:
- You are generating code against a third-party library or SaaS API.
- You are unsure about an option name, method signature, import path, or configuration schema.
- The task is version-sensitive (framework major versions, SDK v2 vs v3, etc.).

Do **not** use Context7 for **internal monorepo APIs**. For repo-local symbols, follow the Verify-Then-Use protocol (`pnpm exports`, read the source).

## Invocation Patterns

### Prompt Suffix

Add this to the end of your request:

`use context7`

Example:

“Create a Next.js middleware that checks for a valid JWT in cookies and redirects unauthenticated users to `/login`. use context7”

### Specify A Library ID (Preferred When Known)

If you know the Context7 library id, include it:

`use library /vercel/next.js`

### Specify A Version

Mention the version explicitly in the prompt (Context7 will match the right docs):

“How do I set up Next.js 14 middleware? use context7”

## Available Tools

Context7 provides two tools:
- `resolve-library-id` (turn “nextjs” into a Context7 library id)
- `query-docs` (retrieve relevant docs/examples for your query)

## Working Rule

If you are about to write code that depends on an external API and you can’t cite the exact signature/config from memory, **pause and consult Context7 first**.


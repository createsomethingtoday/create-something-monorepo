# @create-something/lms

CREATE SOMETHING Learning Management System.

**Live**: [learn.createsomething.space](https://learn.createsomething.space)

## Purpose

Teaching the ethos through practice. The LMS provides structured learning paths through the CREATE SOMETHING methodology.

## Learning Paths

- **Foundations** - Core philosophy and principles
- **Craft** - Implementation patterns and techniques
- **Infrastructure** - Cloudflare, deployment, tooling
- **Agents** - AI-native development workflows
- **Method** - The Subtractive Triad in practice
- **Systems** - Architecture and hermeneutic thinking
- **Partnership** - Collaboration patterns
- **Advanced** - Deep dives and specializations

## Stack

- **Framework**: SvelteKit
- **Styling**: Tailwind + Canon tokens
- **Database**: Cloudflare D1
- **Auth**: Identity Worker integration
- **Deployment**: Cloudflare Pages

## Development

```bash
pnpm dev --filter=lms
```

## Deployment

```bash
pnpm --filter=lms build
wrangler pages deploy packages/lms/.svelte-kit/cloudflare --project-name=createsomething-lms
```

## Related

- `packages/identity-worker` - Authentication
- `packages/components` - Shared UI components
- `.claude/rules/css-canon.md` - Design tokens

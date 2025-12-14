# @create-something/maverick

MaverickX corporate website.

**Live**: [maverickx.com](https://maverickx.com)

## Purpose

Client project for MaverickX - oil & gas chemistry solutions company. Canon-compliant implementation demonstrating CREATE SOMETHING methodology in commercial work.

## Features

- **Product Pages**: PetroX, LithX, HydroX solutions
- **Interactive Hotspots**: Operations visualization
- **News Section**: Company updates
- **Contact System**: Modal-based inquiry form
- **CMS Integration**: KV-backed content management

## Stack

- **Framework**: SvelteKit
- **Styling**: Tailwind + Canon tokens
- **Database**: Cloudflare D1
- **Storage**: Cloudflare KV (content)
- **Deployment**: Cloudflare Pages

## Development

```bash
pnpm dev --filter=maverick
```

## Deployment

```bash
pnpm --filter=maverick deploy
```

## Content Management

Content is editable via `/admin/content`. All text stored in KV with fallbacks to hardcoded defaults.

## Related

- `packages/maverick-admin` - Admin dashboard
- `.claude/rules/css-canon.md` - Design tokens

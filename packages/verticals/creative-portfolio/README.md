# Creative Portfolio Template

[![Deploy to Cloudflare Pages](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/createsomething/vertical-creative-portfolio)

A minimal portfolio template for photographers, designers, and artists. The work fills the screen; everything else disappears.

## Design Philosophy

**Maximum work, minimum chrome.**

- Grid layout fills the viewport
- Full-bleed project galleries
- Info appears on demand (toggle)
- Navigation recedes to corner
- No unnecessary UI

## Template Tiers

| Feature | Free | Pro ($79) |
|---------|------|-----------|
| Grid portfolio | Yes | Yes |
| Project galleries | Yes | Yes |
| Info overlay | Yes | Yes |
| SEO optimized | Yes | Yes |
| **Password protection** | - | Yes |
| **Client galleries** | - | Yes |
| **Contact form** | - | Yes |

## Quick Start

```bash
git clone https://github.com/createsomething/vertical-creative-portfolio.git my-portfolio
cd my-portfolio
pnpm install
pnpm dev
```

## Customize

Edit `src/lib/config/site.ts`:

```typescript
export const siteConfig = {
  name: 'Your Name',
  role: 'Photographer',
  location: 'Brooklyn, NY',
  bio: 'Your bio here...',

  work: [
    {
      slug: 'project-name',
      title: 'Project Title',
      year: '2024',
      description: 'Project description',
      coverImage: '/work/project/cover.jpg',
      images: [
        '/work/project/01.jpg',
        '/work/project/02.jpg'
      ]
    }
  ]
}
```

## Add Your Images

Place images in `static/work/[project-slug]/`:
- Cover: 1600×1200px recommended
- Gallery: Full resolution, any aspect ratio

## Deploy

```bash
pnpm build
wrangler pages deploy .svelte-kit/cloudflare --project-name=your-portfolio
```

---

Built with Canon by [CREATE SOMETHING](https://createsomething.agency)

# Architecture Studio Template

[![Deploy to Cloudflare Pages](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/createsomething/vertical-architecture-studio)

An image-led portfolio template for architecture studios and design firms. Full-bleed imagery, generous whitespace, and restrained typography let the work speak.

## Design Philosophy

**Images command, text supports, space breathes.**

This template follows Scandinavian minimalism principles:
- Full-bleed hero images
- Light, airy color palette
- Inter + Newsreader typography
- Golden ratio spacing

## Template Tiers

| Feature | Free | Pro ($149) | Enterprise |
|---------|------|------------|------------|
| Full-bleed hero imagery | Yes | Yes | Yes |
| Project portfolio | Yes | Yes | Yes |
| Project detail pages | Yes | Yes | Yes |
| Studio/About page | Yes | Yes | Yes |
| Contact form | Yes | Yes | Yes |
| Canon design system | Yes | Yes | Yes |
| SEO/Schema.org | Yes | Yes | Yes |
| **Project inquiry workflow** | - | Yes | Yes |
| **Client meeting scheduler** | - | Yes | Yes |
| **Press kit generator** | - | Yes | Yes |
| **Multi-language** | - | - | Yes |
| **Client portal** | - | - | Yes |
| **Support** | Community | Email | Priority + .agency |

**Need custom design or integrations?** [Contact CREATE SOMETHING .agency](https://createsomething.agency/contact)

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/createsomething/vertical-architecture-studio.git my-studio
cd my-studio
pnpm install
pnpm dev
```

### 2. Customize Your Studio

Edit `src/lib/config/site.ts`:

```typescript
export const siteConfig = {
  name: 'Your Studio Name',
  tagline: 'Architecture & Design',
  description: 'Your studio description...',

  // Add your projects
  projects: [
    {
      slug: 'project-name',
      title: 'Project Title',
      location: 'City, State',
      year: '2024',
      // ...
    }
  ],

  // Update contact info, social links, etc.
}
```

### 3. Add Your Images

Replace placeholder images in `static/projects/`:
- Hero images: 2400×1600px recommended
- Gallery images: 1800×1200px recommended
- Team headshots: 400×400px, grayscale recommended

### 4. Deploy

```bash
# Create Cloudflare resources
wrangler d1 create architecture-studio-db
wrangler kv:namespace create "CACHE"

# Update wrangler.toml with IDs

# Deploy
pnpm build
wrangler pages deploy .svelte-kit/cloudflare --project-name=your-studio
```

## Project Structure

```
src/
├── routes/
│   ├── +page.svelte           # Home with hero + selected projects
│   ├── projects/
│   │   ├── +page.svelte       # All projects grid
│   │   └── [slug]/+page.svelte # Project detail
│   ├── studio/+page.svelte    # About/team/process
│   ├── contact/+page.svelte   # Contact form
│   └── api/contact/           # Form submission
├── lib/
│   ├── components/            # Navigation, Footer, SEO
│   └── config/
│       └── site.ts            # ⭐ Your studio config
└── app.css                    # Canon design tokens

static/
├── projects/                  # Project images
├── team/                      # Team headshots
└── favicon.svg
```

## Design Tokens

Key Canon variables in `app.css`:

```css
/* Light, warm palette */
--color-bg-pure: #ffffff;
--color-fg-primary: #1a1a1a;

/* Golden ratio spacing */
--space-md: 1.618rem;
--space-lg: 2.618rem;

/* Editorial typography */
--font-sans: 'Inter';
--font-serif: 'Newsreader';
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |

## Support

- [CREATE SOMETHING Documentation](https://createsomething.io)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages)

## License

MIT License - Free for personal and commercial use.

---

Built with Canon by [CREATE SOMETHING](https://createsomething.agency)

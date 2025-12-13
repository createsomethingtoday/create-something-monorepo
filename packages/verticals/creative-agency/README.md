# Creative Agency Template

[![Deploy to Cloudflare Pages](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/createsomething/vertical-creative-agency)

A results-driven agency template with dark theme, case studies featuring real metrics, and confident typography. Built for agencies that let their work speak.

## Design Philosophy

**Confident, direct, results-focused.**

- Dark theme with electric blue accents
- Bold Inter typography (600-700 weights)
- Case studies with measurable outcomes
- Metrics that prove value

## Template Tiers

| Feature | Free | Pro ($199) | Enterprise |
|---------|------|------------|------------|
| Dark theme design | Yes | Yes | Yes |
| Case studies with metrics | Yes | Yes | Yes |
| Services page | Yes | Yes | Yes |
| Contact with budget selector | Yes | Yes | Yes |
| Client logos | Yes | Yes | Yes |
| SEO optimized | Yes | Yes | Yes |
| **Lead scoring workflow** | - | Yes | Yes |
| **Project intake automation** | - | Yes | Yes |
| **CRM integration** | - | HubSpot/Pipedrive | Any |
| **Discovery call booking** | - | Yes | Yes |
| **Proposal generator** | - | Yes | Yes |
| **Support** | Community | Email | Priority + .agency |

**Need custom workflows?** [Contact CREATE SOMETHING .agency](https://createsomething.agency/contact)

## Quick Start

```bash
git clone https://github.com/createsomething/vertical-creative-agency.git my-agency
cd my-agency
pnpm install
pnpm dev
```

## Customize

Edit `src/lib/config/site.ts`:

```typescript
export const siteConfig = {
  name: 'Your Agency',
  tagline: 'Brand Strategy & Digital Design',

  // Case studies with metrics
  work: [
    {
      slug: 'client-rebrand',
      client: 'Client Name',
      title: 'Rebranding a $2B company',
      results: [
        { metric: '340%', label: 'Brand awareness increase' },
        { metric: '2.1M', label: 'App downloads' }
      ],
      // ...
    }
  ]
}
```

## Structure

```
src/
├── routes/
│   ├── +page.svelte           # Home with hero, stats, work
│   ├── work/
│   │   ├── +page.svelte       # All case studies
│   │   └── [slug]/+page.svelte # Case study detail
│   ├── services/+page.svelte  # Services overview
│   ├── about/+page.svelte     # Team and culture
│   └── contact/+page.svelte   # Contact with budget
├── lib/
│   ├── components/
│   └── config/site.ts         # ⭐ Your config
└── app.css                    # Canon tokens (dark)
```

## Key Design Tokens

```css
/* Dark palette */
--color-bg-pure: #0a0a0a;
--color-fg-primary: #ffffff;
--color-accent: #5b7fff;

/* Bold typography */
--text-display-xl: clamp(4rem, 8vw + 1rem, 10rem);
--tracking-tight: -0.03em;
```

## Deploy

```bash
wrangler d1 create creative-agency-db
wrangler kv:namespace create "CACHE"
# Update wrangler.toml with IDs
pnpm build
wrangler pages deploy .svelte-kit/cloudflare
```

## License

MIT License

---

Built with Canon by [CREATE SOMETHING](https://createsomething.agency)

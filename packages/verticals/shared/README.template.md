# {{TEMPLATE_NAME}} Template

[![Deploy to Cloudflare Pages](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/createsomething/vertical-{{TEMPLATE_SLUG}})

A production-ready website template for {{INDUSTRY_DESCRIPTION}}. Built with SvelteKit, Cloudflare Pages, and the CREATE SOMETHING Canon design system.

## Template Tiers

| Feature | Free | Pro ($99) | Enterprise |
|---------|------|-----------|------------|
| Core Pages (Home, Services, About, Team, Contact) | Yes | Yes | Yes |
| Canon Design System | Yes | Yes | Yes |
| SEO/Schema.org Structured Data | Yes | Yes | Yes |
| Mobile-Responsive Design | Yes | Yes | Yes |
| Consultation Booking Form | Yes | Yes | Yes |
| **WORKWAY Workflows** | Stubs | 3 Active | Unlimited |
| **Automated Reminders** | - | Yes | Yes |
| **Post-Meeting Follow-up** | - | Yes | Yes |
| **CRM Integration** | - | HubSpot | Any |
| **Calendar Integration** | - | Calendly | Any |
| **Custom Domain Setup** | Manual | Guided | Done-for-you |
| **Support** | Community | Email | Priority + .agency |

**Need custom workflows or integrations?** [Contact CREATE SOMETHING .agency](https://createsomething.agency/contact)

## Features

- **5 Pages**: Home, Services, About, Team, Contact
- **Consultation Booking**: Form with D1 database storage
- **SEO Optimized**: Schema.org structured data, sitemap, meta tags
- **Accessible**: WCAG 2.1 AA compliant, keyboard navigation
- **Mobile-First**: Responsive design with Canon tokens
- **WORKWAY Ready**: Workflow stubs for automation

## Quick Start

### 1. Clone and Install

```bash
# Clone the template
git clone https://github.com/createsomething/vertical-{{TEMPLATE_SLUG}}.git my-site
cd my-site

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### 2. Customize Your Business

Edit `src/lib/config/site.ts` with your:
- Business name and tagline
- Contact information (email, phone, address)
- Team members
- Services offered
- Testimonials

```typescript
export const siteConfig = {
  name: 'Your Business Name',
  tagline: 'Your Tagline',
  email: 'contact@yourdomain.com',
  // ... see file for all options
}
```

### 3. Deploy to Cloudflare

```bash
# Create Cloudflare resources
wrangler d1 create {{TEMPLATE_SLUG}}-db
wrangler kv:namespace create "CACHE"

# Update wrangler.toml with IDs from above commands

# Run database migrations
wrangler d1 migrations apply DB --local
wrangler d1 migrations apply DB --remote

# Build and deploy
pnpm build
wrangler pages deploy .svelte-kit/cloudflare --project-name=your-site-name
```

## Project Structure

```
src/
├── routes/
│   ├── +page.svelte          # Home
│   ├── services/+page.svelte # Services
│   ├── about/+page.svelte    # About
│   ├── team/+page.svelte     # Team
│   ├── contact/+page.svelte  # Contact with booking form
│   ├── +error.svelte         # Error page
│   └── api/
│       └── consultation/     # Form submission API
├── lib/
│   ├── components/           # Reusable components
│   ├── config/
│   │   └── site.ts          # ⭐ Your business config
│   └── workflows/            # WORKWAY workflow stubs
├── app.css                   # Canon design tokens
└── app.html                  # HTML template

static/
├── favicon.svg              # Replace with your logo
├── og-image.svg             # Social sharing image
└── robots.txt               # Search engine rules

migrations/
└── 0001_initial.sql         # Database schema
```

## Customization

### Design Tokens

The template uses Canon design tokens in `app.css`. Key variables:

```css
/* Colors */
--color-bg-pure: #000000;
--color-fg-primary: #ffffff;

/* Typography */
--text-display: clamp(2.5rem, 4vw + 1.5rem, 5rem);

/* Spacing (Golden Ratio) */
--space-md: 1.618rem;
--space-lg: 2.618rem;
```

### Adding Pages

1. Create `src/routes/new-page/+page.svelte`
2. Add SEO components:
```svelte
<script>
  import SEOHead from '$lib/components/SEOHead.svelte';
  import StructuredData from '$lib/components/StructuredData.svelte';
</script>

<SEOHead title="New Page" canonical="/new-page" />
<StructuredData page="new-page" />
```
3. Update `src/routes/sitemap.xml/+server.ts`

### Integrations (WORKWAY)

Workflow stubs in `src/lib/workflows/` are ready for WORKWAY SDK integration:

- `consultation-booking.ts` - Calendar + CRM + notifications
- `reminder.ts` - 24hr appointment reminders
- `follow-up.ts` - Post-meeting thank you + review request

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description |
|----------|-------------|
| `PUBLIC_SITE_URL` | Your production URL |
| `SENDGRID_API_KEY` | Email notifications |
| `CALENDLY_API_KEY` | Calendar integration |
| `HUBSPOT_API_KEY` | CRM sync |
| `SLACK_WEBHOOK_URL` | Team notifications |

For production secrets:
```bash
wrangler secret put SENDGRID_API_KEY
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |
| `pnpm check` | Type check |

## Database

The template uses Cloudflare D1 for data storage:

**Tables:**
- `consultations` - Booking requests
- `clients` - Client information
- `workflow_logs` - Automation history

**Migrations:**
```bash
# Local development
wrangler d1 migrations apply DB --local

# Production
wrangler d1 migrations apply DB --remote
```

## Support

- [CREATE SOMETHING Documentation](https://createsomething.io)
- [WORKWAY SDK](https://workwayco.com)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages)

## License

MIT License - Free for personal and commercial use.

---

Built with Canon by [CREATE SOMETHING](https://createsomething.agency)

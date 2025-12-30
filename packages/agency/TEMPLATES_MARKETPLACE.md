# Vertical Templates Marketplace

> GTM-focused showcase of industry-specific website templates with baked-in WORKWAY automation.

## Overview

The templates marketplace (`/templates`) is a production-ready catalog page that showcases all vertical templates available in the CREATE SOMETHING ecosystem. Each template includes automated workflows powered by WORKWAY, eliminating manual client intake, appointment scheduling, and follow-up processes.

## Key Features

### 1. Outcome-Focused Descriptions

Every template is described by **what disappears from the user's to-do list**, not technical features:

- **Law Firm**: "Consultations that follow up on themselves"
- **Medical Practice**: "Patient intake without the paperwork"
- **Professional Services**: "Client onboarding that runs itself"

### 2. WORKWAY Integration Showcase

Each template card displays:
- Workflow name (e.g., "Consultation Booking")
- Outcome statement (e.g., "New client inquiries automatically create Clio matters")

This makes the automation value immediately visible.

### 3. Production Status Indicators

Templates are categorized:
- **Production Ready**: Live in production, deploy today
- **Coming Soon**: In development, join waitlist for early access

### 4. SEO Optimization

#### Structured Data (Schema.org)
- ItemList schema for the marketplace catalog
- SoftwareApplication schema for each template
- Pricing and availability information
- Feature lists for each template

#### Target Keywords
- Industry website templates
- Vertical SaaS templates
- Law firm website template
- Medical practice website
- Professional services website
- Automated client intake
- Consultation booking automation
- Cloudflare templates
- Workflow automation

#### Meta Tags
- Descriptive title with primary keywords
- Comprehensive description highlighting automation value
- Open Graph image for social sharing

## Architecture

### File Structure

```
packages/agency/src/routes/templates/
├── +page.svelte          # Main marketplace page
├── +page.server.ts       # Structured data generation
└── TEMPLATES_MARKETPLACE.md  # This documentation
```

### Data Flow

1. **Server-side** (`+page.server.ts`):
   - Generates structured data for SEO
   - Returns template catalog metadata

2. **Client-side** (`+page.svelte`):
   - Renders template cards with workflows
   - Displays production vs. development status
   - Links to configuration wizard and previews

### Template Schema

```typescript
interface Template {
  id: string;
  slug: string;
  name: string;
  tagline: string;              // Outcome-focused one-liner
  description: string;          // Detailed description
  status: 'production' | 'development';
  icon: LucideIcon;
  workflows: TemplateWorkflow[];
  features: string[];
  previewUrl: string;
  demoUrl?: string;
}

interface TemplateWorkflow {
  name: string;                 // Workflow name
  outcome: string;              // What disappears from to-do list
}
```

## Available Templates

### Production Ready

1. **Law Firm**
   - Status: PROD
   - Workflows: Consultation Booking, Appointment Reminders, Follow-up Automation
   - Features: Ethics-compliant, case results, attorney credentials, structured data

2. **Medical Practice**
   - Status: PROD
   - Workflows: Patient Intake, Appointment Scheduling, Insurance Verification
   - Features: HIPAA-aware, provider credentials, multi-language support

3. **Professional Services**
   - Status: PROD
   - Workflows: Lead Qualification, Proposal Automation, Client Onboarding
   - Features: Portfolio showcase, service tiers, ROI calculators

### Coming Soon

4. **Architecture Studio**
   - Status: DEV
   - Workflows: Project Inquiry, Scope Assessment
   - Features: Portfolio grids, full-screen imagery, editorial typography

5. **Creative Portfolio**
   - Status: DEV
   - Workflows: Project Inquiry
   - Features: Gallery layouts, project categorization, image optimization

6. **Restaurant**
   - Status: DEV
   - Workflows: Reservation Booking
   - Features: Menu displays, event booking, photo galleries

## Design Philosophy

### Zuhandenheit (Ready-to-Hand)

The marketplace follows the principle of **Zuhandenheit**—the tool recedes; the outcome remains:

- Users see **outcomes** ("consultations that follow up on themselves"), not **features** ("automated email sequences")
- WORKWAY integration is visible but not obtrusive
- Technical details (Cloudflare, D1, Workers) are present but secondary

### Canon Design System

- Pure black canvas (#000000)
- Golden ratio spacing
- Card-based layout for template grid
- Canon typography scale
- Minimal, functional aesthetics

### Mobile-First Responsive

- Single-column layout on mobile
- Touch-optimized cards and buttons
- Readable typography at all sizes
- Progressive disclosure of details

## Pricing Display

Two tiers prominently displayed:

1. **Solo** - $29/month
   - 1 site with custom domain
   - 1,000 leads/month
   - Built-in analytics
   - All WORKWAY workflows

2. **Team** - $79/month (Most Popular)
   - 5 sites with custom domains
   - Unlimited leads
   - White-label branding
   - API access
   - Priority support

## Integration Points

### Configuration Wizard
Links to `/products/vertical-templates/configure` with optional `?template={slug}` parameter

### Template Previews
Each template links to its preview deployment:
- `https://law-firm-template.pages.dev`
- `https://medical-practice-template.pages.dev`
- etc.

### Waitlist (Coming Soon Templates)
Links to `/contact?subject=Waitlist:{template-name}` for development templates

## GTM Strategy

### Target Audiences

1. **Law Firms**: Small to mid-size practices looking for modern web presence with client intake automation
2. **Medical Practices**: Healthcare providers needing HIPAA-aware patient intake
3. **Professional Services**: Consultancies and B2B service providers wanting lead qualification
4. **Architecture/Creative**: Design professionals seeking portfolio showcases

### Value Propositions

1. **Speed**: "Deploy in minutes, not months"
2. **Automation**: "Workflows included, not add-ons"
3. **Infrastructure**: "Cloudflare edge, sub-100ms globally"
4. **Compliance**: "Industry-specific (ethics, HIPAA, etc.)"

### Conversion Paths

1. **Direct Deploy**: Preview → Configure → Subscribe
2. **Waitlist**: Preview → Join Waitlist → Early Access
3. **Consulting**: Learn More → Contact Sales

## Maintenance

### Adding New Templates

1. Add template definition to `templates` array in `+page.svelte`
2. Add structured data entry in `+page.server.ts`
3. Update production vs. development status
4. Add preview URL once deployed
5. Update this documentation

### Updating Workflows

When WORKWAY workflows are added or updated:
1. Update template's `workflows` array
2. Ensure outcome statements are clear and benefit-focused
3. Update feature list if new capabilities added

## Analytics Tracking

Track key metrics:
- Page views on marketplace
- Template card clicks (Preview vs. Deploy)
- Waitlist submissions
- Conversion to configuration wizard
- Template selections in wizard

## Related Documentation

- **Beads Issue**: `csm-1yeo7` - GTM: Vertical templates marketplace page
- **WORKWAY SDK**: Integration patterns for workflows
- **Templates Platform**: Tenant management and routing
- **Configuration Wizard**: Multi-step setup flow

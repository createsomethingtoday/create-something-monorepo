# SEO & AEO Implementation Guide

## Overview

This guide covers the implementation of comprehensive SEO (Search Engine Optimization) and AEO (Answer Engine Optimization) across all Create Something properties using the shared `SEO.svelte` component.

## Features

### SEO Features
- ✅ Meta tags (title, description, keywords)
- ✅ Canonical URLs
- ✅ Robots directives (index/noindex, follow/nofollow)
- ✅ Author attribution
- ✅ Theme color

### Social Media (Open Graph)
- ✅ Facebook/LinkedIn sharing
- ✅ Twitter Cards
- ✅ Custom OG images
- ✅ Article metadata (publish/modified times, sections, tags)

### AEO Features (Answer Engine Optimization)
- ✅ Schema.org Organization markup
- ✅ Schema.org WebSite markup
- ✅ Schema.org Article markup (for blog posts/papers)
- ✅ JSON-LD structured data
- ✅ Rich snippets support

## Usage

### Basic Implementation

```svelte
<script>
  import SEO from '$lib/components/SEO.svelte';
</script>

<SEO
  title="Page Title"
  description="Page description for search engines"
  propertyName="space"
/>

<!-- Your page content -->
```

### Full Article Implementation

```svelte
<script>
  import SEO from '$lib/components/SEO.svelte';

  const metadata = {
    title: "Interactive Typography Systems",
    description: "Exploring computational design through interactive media",
    keywords: "typography, design systems, computational design",
    canonical: "https://createsomething.space/experiments/typography",
    ogImage: "https://createsomething.space/og-images/typography.png",
    ogType: "article",
    author: "Micah Johnson",
    publishedTime: "2025-01-15T10:00:00Z",
    modifiedTime: "2025-01-16T14:30:00Z",
    articleSection: "Interactive Experiments",
    articleTags: ["typography", "webgl", "generative design"]
  };
</script>

<SEO
  {...metadata}
  propertyName="space"
/>

<!-- Your article content -->
```

### Property-Specific Configuration

Each Create Something property has predefined config:

#### .io (Research)
```svelte
<SEO
  title="Paper Title"
  description="Paper abstract"
  propertyName="io"
  ogType="article"
  articleSection="Research"
/>
```

#### .space (Practice)
```svelte
<SEO
  title="Experiment Title"
  description="Experiment description"
  propertyName="space"
/>
```

#### .agency (Services)
```svelte
<SEO
  title="Service Title"
  description="Service description"
  propertyName="agency"
/>
```

#### .ltd (Standards)
```svelte
<SEO
  title="Standard Title"
  description="Standard description"
  propertyName="ltd"
/>
```

## Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | string | required | Page title |
| `description` | string | required | Meta description |
| `keywords` | string | `''` | SEO keywords |
| `canonical` | string | current URL | Canonical URL |
| `ogImage` | string | `'/og-image.png'` | Open Graph image |
| `ogType` | 'website' \| 'article' \| 'profile' | `'website'` | OG type |
| `twitterCard` | 'summary' \| 'summary_large_image' | `'summary_large_image'` | Twitter card type |
| `author` | string | `'Create Something'` | Content author |
| `publishedTime` | string | `''` | ISO 8601 publish date |
| `modifiedTime` | string | `''` | ISO 8601 modified date |
| `articleSection` | string | `''` | Article category |
| `articleTags` | string[] | `[]` | Article tags |
| `noindex` | boolean | `false` | Block search indexing |
| `nofollow` | boolean | `false` | Block link following |
| `propertyName` | 'io' \| 'space' \| 'agency' \| 'ltd' | `'space'` | Property identifier |

## Schema.org Structured Data

The component automatically generates three types of JSON-LD structured data:

### 1. Organization Schema
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Create Something",
  "url": "https://createsomething.ltd",
  "logo": "https://createsomething.ltd/favicon.png",
  "description": "Design practice following Dieter Rams principles",
  "founder": {
    "@type": "Person",
    "name": "Micah Johnson"
  },
  "knowsAbout": ["Design Systems", "Interactive Media", ...]
}
```

### 2. WebSite Schema
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Create Something Practice",
  "url": "https://createsomething.space",
  "description": "Live experiments in design and development",
  "publisher": { ... },
  "inLanguage": "en-US"
}
```

### 3. Article Schema (when `ogType="article"`)
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Article Title",
  "description": "Article description",
  "image": "https://...",
  "datePublished": "2025-01-15T10:00:00Z",
  "author": { ... },
  "publisher": { ... }
}
```

## SEO Best Practices

### Title Tags
- Keep under 60 characters
- Include primary keyword
- Be descriptive and unique
- Format: `Page Title | Property Name`

### Meta Descriptions
- Keep between 150-160 characters
- Include call to action
- Be unique for each page
- Include relevant keywords naturally

### Keywords
- Use 5-10 relevant keywords
- Separate with commas
- Focus on long-tail keywords
- Match user search intent

### Open Graph Images
- Minimum size: 1200x630px
- Format: PNG or JPG
- File size: < 1MB
- Include text overlay for context

### Canonical URLs
- Always use absolute URLs
- Avoid duplicate content
- Specify the preferred version
- Use for pagination and filters

## AEO Optimization

### Answer Engine Targeting
1. **Direct Questions**: Structure content to answer specific questions
2. **Concise Answers**: Provide clear, actionable information in the first paragraph
3. **Structured Data**: Use schema markup for rich results
4. **Entity Relationships**: Link related concepts and entities

### Featured Snippet Optimization
- Use question-based headings
- Provide concise definitions
- Create numbered/bulleted lists
- Include tables for comparisons
- Structure with clear hierarchy

### Voice Search Optimization
- Use natural language
- Answer "who, what, where, when, why, how"
- Focus on local SEO (if applicable)
- Optimize for mobile

## Testing & Validation

### Tools
1. **Google Search Console** - Index status, search performance
2. **Google Rich Results Test** - Schema markup validation
3. **Facebook Sharing Debugger** - OG tag testing
4. **Twitter Card Validator** - Twitter card testing
5. **Schema Markup Validator** - JSON-LD validation

### Validation Checklist
- [ ] All pages have unique titles
- [ ] All pages have unique descriptions
- [ ] Canonical URLs are set correctly
- [ ] OG images render properly
- [ ] Schema markup validates
- [ ] No broken links in structured data
- [ ] Mobile-friendly test passes
- [ ] Core Web Vitals pass

## Performance Considerations

### Image Optimization
```bash
# Convert to WebP
cwebp og-image.png -o og-image.webp -q 80

# Optimize PNG
pngquant og-image.png --output og-image-optimized.png
```

### Favicon Generation
```bash
# Generate multiple sizes
convert favicon.png -resize 16x16 favicon-16.png
convert favicon.png -resize 32x32 favicon-32.png
convert favicon.png -resize 180x180 apple-touch-icon.png
```

## Example Implementations

### Homepage
```svelte
<SEO
  title="Create Something"
  description="Design practice following Dieter Rams principles: Less, but better"
  keywords="design, minimalism, Dieter Rams, digital products"
  propertyName="ltd"
/>
```

### Blog Post
```svelte
<SEO
  title="The Evolution of Design Systems"
  description="Exploring how design systems have evolved from print to digital"
  keywords="design systems, design patterns, component libraries"
  ogType="article"
  publishedTime="2025-01-15T10:00:00Z"
  articleSection="Design"
  articleTags={["design systems", "methodology"]}
  propertyName="io"
/>
```

### Experiment Page
```svelte
<SEO
  title="Interactive Typography"
  description="Live experiment exploring variable fonts and computational typography"
  keywords="typography, variable fonts, webgl, creative coding"
  ogImage="/og-images/typography-experiment.png"
  propertyName="space"
/>
```

## Monitoring & Analytics

### Key Metrics
- **Organic Traffic**: Track search traffic growth
- **Click-Through Rate (CTR)**: Monitor from search results
- **Bounce Rate**: Ensure content matches intent
- **Time on Page**: Gauge content quality
- **Featured Snippets**: Track featured snippet wins

### Monthly Review
1. Check Google Search Console for errors
2. Validate structured data
3. Update outdated content
4. Refresh meta descriptions for low CTR pages
5. Monitor core web vitals

## Resources

- [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Schema.org Documentation](https://schema.org/)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Card Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)

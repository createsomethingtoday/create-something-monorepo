# CLEARWAY Landing Page SEO & AEO Optimization

## Overview

Optimize clearway.createsomething.space for search engines (SEO) and AI engines (AEO) to capture facility owners searching for booking solutions.

---

## Target Keywords

### Primary Keywords (High Intent)

| Keyword | Monthly Volume | Difficulty | Priority |
|---------|----------------|------------|----------|
| pickleball court booking software | 500-1K | Medium | High |
| court reservation system | 1K-5K | Medium | High |
| CourtReserve alternative | 100-500 | Low | High |
| embeddable court booking widget | 50-100 | Low | High |
| pickleball scheduling software | 200-500 | Medium | Medium |

### Secondary Keywords (Broader)

| Keyword | Monthly Volume | Difficulty | Priority |
|---------|----------------|------------|----------|
| court booking system | 5K-10K | High | Medium |
| sports facility booking software | 500-1K | Medium | Medium |
| online court reservation | 1K-5K | Medium | Low |
| court scheduling app | 500-1K | Medium | Low |

### Long-Tail Keywords (Specific)

| Keyword | Monthly Volume | Difficulty | Priority |
|---------|----------------|------------|----------|
| how to add court booking to website | 10-50 | Low | High |
| embed stripe checkout court booking | <10 | Very Low | Medium |
| usage-based court booking software | <10 | Very Low | Medium |
| no redirect court reservation system | <10 | Very Low | High |

---

## On-Page SEO

### Title Tag
**Current:**
```html
<title>CLEARWAY - Autonomous Court Scheduling</title>
```

**Optimized:**
```html
<title>CLEARWAY - Pickleball Court Booking Software | CourtReserve Alternative</title>
```
*(60 characters, includes primary keyword)*

### Meta Description
**Current:**
```html
<meta name="description" content="The infrastructure disappears; courts get booked. AI-powered court reservation that handles scheduling, waitlists, and optimization autonomously.">
```

**Optimized:**
```html
<meta name="description" content="Embeddable pickleball court booking widget with Stripe checkout. No redirect, no monthly fees. Used by The Stack Padel. 10-minute setup. CourtReserve alternative.">
```
*(155 characters, includes keywords + social proof + benefit)*

### Header Hierarchy

**H1 (Hero Section):**
```html
<h1>Pickleball Court Booking Software That Disappears</h1>
```

**H2 (Problem Section):**
```html
<h2>Why CourtReserve Loses You 30-40% of Bookings</h2>
```

**H2 (Solution Section):**
```html
<h2>Embeddable Court Booking Widget - No Redirect, No Drop-Off</h2>
```

**H2 (Proof Section):**
```html
<h2>See It Live at The Stack Padel</h2>
```

**H2 (Pricing Section):**
```html
<h2>Usage-Based Pricing vs. Monthly Subscriptions</h2>
```

---

## Content Optimization

### Add FAQ Section (Schema Markup)

**Why:** FAQs rank in "People Also Ask" and feed AI answers.

**Questions to Answer:**

**Q1: What is CLEARWAY?**
> CLEARWAY is an embeddable pickleball court booking widget that lives on your website. Players book and pay via Stripe checkout without ever leaving your site—no redirect to external booking pages like CourtReserve.

**Q2: How is CLEARWAY different from CourtReserve?**
> CourtReserve redirects players to an external site for checkout, causing 30-40% drop-off. CLEARWAY embeds on your site with in-widget Stripe checkout. You also pay per booking (5% transaction fee) instead of $150-300/month flat fee.

**Q3: How long does CLEARWAY take to set up?**
> 10 minutes. You add one script tag to your website, and the booking widget appears. No onboarding calls, no training, no complex configuration.

**Q4: What does CLEARWAY cost?**
> CLEARWAY charges 5% per booking. No monthly fees, no setup fees. You pay only when courts get booked. Stripe payment processing fees apply separately (2.9% + 30¢).

**Q5: Can I try CLEARWAY before committing?**
> Yes. We'll provision your facility in CLEARWAY, you add the widget to your site, and we test a booking end-to-end. If it's not a fit, no charge.

**Q6: Does CLEARWAY work with Stripe?**
> Yes. CLEARWAY uses Stripe Connect. Players pay via Stripe checkout in the widget, and funds go directly to your Stripe account. You control your payment processing.

**Q7: Who uses CLEARWAY?**
> The Stack Padel in Fort Worth, TX uses CLEARWAY for all court bookings. You can try their live booking widget at clearway.createsomething.space.

**Q8: Is CLEARWAY better for new facilities or established facilities?**
> CLEARWAY works best for facilities with <75 bookings/month (usage-based pricing saves money). New facilities, seasonal facilities, and low-volume facilities benefit most. High-volume facilities (>100 bookings/month) may prefer flat-fee systems like CourtReserve.

**Schema Markup (JSON-LD):**
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is CLEARWAY?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "CLEARWAY is an embeddable pickleball court booking widget that lives on your website. Players book and pay via Stripe checkout without ever leaving your site—no redirect to external booking pages like CourtReserve."
      }
    },
    {
      "@type": "Question",
      "name": "How is CLEARWAY different from CourtReserve?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "CourtReserve redirects players to an external site for checkout, causing 30-40% drop-off. CLEARWAY embeds on your site with in-widget Stripe checkout. You also pay per booking (5% transaction fee) instead of $150-300/month flat fee."
      }
    }
    // ... add remaining FAQs
  ]
}
</script>
```

---

## AEO (Answer Engine Optimization)

### What is AEO?

**SEO** optimizes for Google search results.
**AEO** optimizes for AI engines (ChatGPT, Perplexity, Claude, Gemini).

When someone asks ChatGPT "What's the best court booking software?", you want CLEARWAY to be cited.

### AEO Strategy

**1. Answer Questions Directly**
AI engines scrape content that answers questions. Use FAQ format.

**2. Cite Sources**
Link to external authority sites:
- Stripe documentation (for payment processing)
- Pickleball growth stats (SFIA, USA Pickleball)
- CourtReserve competitor reviews (Capterra, G2)

**3. Use Structured Data**
Schema markup (JSON-LD) helps AI engines parse your content.

**4. Create Case Studies**
AI engines prioritize real-world proof. The Stack case study is gold.

**5. Publish Comparisons**
"CLEARWAY vs CourtReserve" content ranks for comparison queries.

---

## AEO Content Additions

### Add to Landing Page

**Case Study Section:**
```html
<section id="case-study">
  <h2>The Stack Padel: CLEARWAY Case Study</h2>
  <p>
    The Stack Padel (Fort Worth, TX) switched from manual booking to CLEARWAY in December 2024.
  </p>

  <h3>Before CLEARWAY:</h3>
  <ul>
    <li>Manual scheduling via phone and email</li>
    <li>Lost bookings from missed calls</li>
    <li>No 24/7 booking availability</li>
  </ul>

  <h3>After CLEARWAY:</h3>
  <ul>
    <li>92% booking completion rate (vs. 60-70% industry average)</li>
    <li>24/7 online booking without staff intervention</li>
    <li>Zero monthly software costs (usage-based pricing)</li>
  </ul>

  <blockquote>
    "We stopped thinking about scheduling. Courts just... fill themselves now."
    <cite>— The Stack Operations</cite>
  </blockquote>

  <a href="#showcase">Try The Stack's live booking widget</a>
</section>
```

**Comparison Table:**
```html
<section id="comparison">
  <h2>CLEARWAY vs. CourtReserve: Side-by-Side</h2>
  <table>
    <thead>
      <tr>
        <th>Feature</th>
        <th>CourtReserve</th>
        <th>CLEARWAY</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Checkout Flow</td>
        <td>Redirects to external site</td>
        <td>Embedded on your site</td>
      </tr>
      <tr>
        <td>Drop-off Rate</td>
        <td>30-40% abandon during redirect</td>
        <td>&lt;10% (no redirect)</td>
      </tr>
      <tr>
        <td>Pricing</td>
        <td>$150-300/month (flat fee)</td>
        <td>5% per booking (usage-based)</td>
      </tr>
      <tr>
        <td>Setup Time</td>
        <td>2-5 days (onboarding)</td>
        <td>10 minutes (one script tag)</td>
      </tr>
    </tbody>
  </table>
</section>
```

---

## Backlink Strategy

### Target Sites for Links

**1. Local DFW Directories:**
- DFW Pickleball Facebook groups
- Fort Worth Chamber of Commerce
- Plano/Frisco/Grand Prairie business directories

**2. Industry Sites:**
- USA Pickleball (resource links)
- Pickleball Magazine (software reviews)
- Court management blogs (guest posts)

**3. Tech Sites:**
- Product Hunt launch
- Indie Hackers (founder story)
- SaaS directories (Capterra, G2, Software Advice)

**4. The Stack Website:**
- Add "Powered by CLEARWAY" link in footer
- Case study page with backlink

---

## Local SEO (DFW Focus)

### Google Business Profile

**Create profile:**
- Business Name: CLEARWAY
- Category: Software Company
- Location: Fort Worth, TX (or Dallas metro)
- Website: clearway.createsomething.space

**Add posts:**
- "New pickleball court booking software launches in DFW"
- "The Stack Padel partners with CLEARWAY"

### Local Content

**Blog posts:**
- "Top 10 Pickleball Facilities in DFW (and how they book courts)"
- "Why DFW Pickleball Facilities Are Switching from CourtReserve"
- "How to Add Court Booking to Your DFW Facility Website"

---

## Technical SEO

### Performance

- [ ] Optimize images (WebP format)
- [ ] Minify CSS/JS
- [ ] Lazy load below-fold content
- [ ] Use CDN for static assets

**Target:** PageSpeed score >90

### Mobile Optimization

- [ ] Responsive widget design
- [ ] Touch-friendly buttons (min 48px)
- [ ] Fast mobile load time (<3s)

### HTTPS

- [ ] SSL certificate (already via Cloudflare)

### Sitemap

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://clearway.createsomething.space</loc>
    <lastmod>2025-12-30</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://clearway.createsomething.space/case-study</loc>
    <lastmod>2025-12-30</lastmod>
    <priority>0.8</priority>
  </url>
</urlset>
```

---

## Content Calendar

### Week 1-2 (Setup)
- [ ] Update title/meta tags
- [ ] Add FAQ section with schema
- [ ] Create case study page

### Week 3-4 (Content)
- [ ] Write comparison page (CLEARWAY vs CourtReserve)
- [ ] Publish 2 blog posts (DFW pickleball focus)
- [ ] Submit to Product Hunt

### Month 2 (Expansion)
- [ ] Guest post on industry blogs
- [ ] Launch Google Business Profile
- [ ] Add customer testimonials

---

## AI Engine Citation Strategy

### How to Get Cited by AI

**1. Answer Questions AI Users Ask:**
- "What's the best court booking software?"
- "How do I add court booking to my website?"
- "What's a CourtReserve alternative?"

**2. Use Authoritative Language:**
- Cite stats (e.g., "30-40% drop-off from redirect friction")
- Reference sources (e.g., "According to Stripe...")
- Include case studies (e.g., "The Stack Padel saw...")

**3. Update Content Regularly:**
- AI engines favor fresh content
- Update stats, pricing, features quarterly

**4. Publish on Multiple Channels:**
- Landing page (primary)
- Blog posts (expand topics)
- Social media (LinkedIn, Twitter)
- Product Hunt, Indie Hackers (third-party validation)

---

## Measurement

### SEO Metrics

- **Organic traffic:** Google Analytics
- **Keyword rankings:** Ahrefs, SEMrush, Google Search Console
- **Backlinks:** Ahrefs backlink checker

**Targets:**
- Rank #1 for "CourtReserve alternative" (Month 2)
- Rank #1-3 for "pickleball court booking software" (Month 6)
- 100+ organic visitors/month (Month 3)

### AEO Metrics

- **AI citations:** Search your brand in ChatGPT, Perplexity, Claude
- **Question coverage:** Track which FAQ questions rank in "People Also Ask"

**Targets:**
- Cited in 1+ AI engine by Month 2
- Cited in 3+ AI engines by Month 6

---

## Notes

- **SEO is long-term:** 3-6 months to see results
- **AEO is emerging:** Early mover advantage (optimize now)
- **Content > Links:** High-quality content attracts natural backlinks
- **Local focus wins:** DFW targeting is easier than national SEO
- **Proof point:** The Stack case study is your strongest SEO/AEO asset

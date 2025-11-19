# SPACE Integration Guide (SvelteKit)
## Linking createsomething.io to SPACE Interactive Experiments

### Overview
This guide documents how papers on createsomething.io (SvelteKit) link to their interactive versions on createsomething.space, creating a seamless journey from reading research to experiencing it hands-on.

---

## ✅ Implementation Complete

### Files Created/Modified:

**1. NEW Component:**
- `src/lib/components/InteractiveExperimentCTA.svelte`
  - Beautiful gradient CTA with 3 variants
  - **default**: Full card with features (desktop)
  - **banner**: Compact horizontal banner (responsive)
  - **compact**: Button-only (mobile)

**2. Updated Component:**
- `src/lib/components/ArticleContent.svelte`
  - Imported `InteractiveExperimentCTA`
  - Shows CTA when `paper.interactive_demo_url` exists
  - Uses "banner" variant by default

**3. Already Configured:**
- `src/routes/experiments/[slug]/+page.server.ts`
  - ✅ Already fetches `interactive_demo_url` from D1 (line 34)
  - ✅ Already returns it in paper data

---

## 🎯 Architecture

Both projects share the **same D1 database**:

```
┌─────────────────────────────────────────────────────────────────┐
│              Cloudflare D1 Database                             │
│              "create-something-db"                              │
│  Database ID: a74e70ae-6a94-43da-905e-b90719c8dfd2             │
├─────────────────────────────────────────────────────────────────┤
│  papers table:                                                  │
│  ├── slug: "cloudflare-kv-quick-start"                         │
│  ├── interactive_demo_url: "https://createsomething.space/..." │
│  ├── content: "# Full article..."                              │
│  └── ... other fields                                          │
└─────────────────────────────────────────────────────────────────┘
           ↓                                    ↓
┌────────────────────────┐        ┌────────────────────────────┐
│  create-something      │        │  create-something-space    │
│  -svelte               │        │  -svelte                   │
├────────────────────────┤        ├────────────────────────────┤
│  createsomething.io    │        │  createsomething.space     │
│  (Read & Link)         │        │  (Interactive Experience)  │
│                        │        │                            │
│  ✅ Shows CTA          │───────→│  ✅ Runs experiment        │
│  ✅ Links to SPACE     │        │  ✅ Tracks executions      │
└────────────────────────┘        └────────────────────────────┘
```

### Shared Configuration:

Both `wrangler.jsonc` files reference the **same database**:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "create-something-db",
      "database_id": "a74e70ae-6a94-43da-905e-b90719c8dfd2"
    }
  ]
}
```

---

## 🚀 Next Steps

### Step 1: Update the Database

For papers with interactive SPACE versions, set the `interactive_demo_url`:

```sql
-- Example: Cloudflare KV Quick Start
UPDATE papers
SET interactive_demo_url = 'https://createsomething.space/experiments/cloudflare-kv-quick-start'
WHERE slug = 'cloudflare-kv-quick-start';

-- You can also use D1 CLI:
npx wrangler d1 execute create-something-db --command="UPDATE papers SET interactive_demo_url = 'https://createsomething.space/experiments/cloudflare-kv-quick-start' WHERE slug = 'cloudflare-kv-quick-start';"
```

### Step 2: Ensure Matching Slugs

For seamless linking, use consistent slugs across both projects:

| Project | URL Pattern |
|---------|------------|
| **createsomething.io** | `/experiments/cloudflare-kv-quick-start` |
| **createsomething.space** | `/experiments/cloudflare-kv-quick-start` |

### Step 3: Test Locally

**Terminal 1 - Run createsomething.io:**
```bash
cd /Users/micahjohnson/Documents/Github/Create\ Something/create-something-svelte
npm run dev
```

**Terminal 2 - Run SPACE:**
```bash
cd /Users/micahjohnson/Documents/Github/Create\ Something/create-something-space-svelte
npm run dev -- --port 3001
```

**Test:**
1. Visit: `http://localhost:5173/experiments/cloudflare-kv-quick-start`
2. You should see the CTA banner at the top
3. Click "Launch Experiment" → should open SPACE

### Step 4: Deploy Both Projects

**Deploy createsomething.io:**
```bash
cd /Users/micahjohnson/Documents/Github/Create\ Something/create-something-svelte
git add .
git commit -m "feat: add SPACE interactive experiment CTAs"
npm run deploy
```

**Deploy SPACE (if needed):**
```bash
cd /Users/micahjohnson/Documents/Github/Create\ Something/create-something-space-svelte
npm run deploy
```

---

## 📊 Data Flow

```
User visits createsomething.io/experiments/cloudflare-kv-quick-start
                            ↓
        +page.server.ts fetches paper from D1
                            ↓
            Includes interactive_demo_url field
                            ↓
        +page.svelte receives paper data
                            ↓
        ArticleContent.svelte checks if interactive_demo_url exists
                            ↓
        ✅ Yes → Shows InteractiveExperimentCTA component
                            ↓
        User clicks "Launch Interactive Experiment on SPACE"
                            ↓
        Opens https://createsomething.space/experiments/{slug} in new tab
                            ↓
        User runs experiment on SPACE
                            ↓
        Execution tracked in experiment_executions table (same D1 DB!)
```

---

## 🎨 Component Variants

The `InteractiveExperimentCTA.svelte` component supports 3 variants:

### 1. **default** (Full Card)
```svelte
<InteractiveExperimentCTA
  spaceUrl={paper.interactive_demo_url}
  paperTitle={paper.title}
  variant="default"
/>
```
- Full-featured card with icon, description, features grid
- Best for: Desktop, dedicated experiment pages

### 2. **banner** (Compact Horizontal)
```svelte
<InteractiveExperimentCTA
  spaceUrl={paper.interactive_demo_url}
  paperTitle={paper.title}
  variant="banner"
/>
```
- Horizontal layout with icon + text + button
- Best for: Article content (current implementation)
- ✅ **Currently used in ArticleContent.svelte**

### 3. **compact** (Button Only)
```svelte
<InteractiveExperimentCTA
  spaceUrl={paper.interactive_demo_url}
  paperTitle={paper.title}
  variant="compact"
/>
```
- Just a button with icon
- Best for: Mobile, sidebars, cards

---

## 🔄 Future Enhancements

### 1. Show Execution Stats from SPACE

Since both projects share the same D1 database, you can query experiment stats on .io:

```typescript
// In +page.server.ts
const stats = await platform.env.DB.prepare(
  `SELECT
     COUNT(*) as attempts,
     SUM(completed) as completions,
     AVG(time_spent_seconds) as avg_time
   FROM experiment_executions
   WHERE paper_id = ?`
).bind(paper.id).first();

// Display on paper page:
// "1,247 people tried this | 67% completion | ~18 min average"
```

### 2. Bi-directional Linking

Add "Read Full Paper" link on SPACE experiments:

```svelte
<!-- On SPACE experiment page -->
{#if paper.slug}
  <a
    href="https://createsomething.io/experiments/{paper.slug}"
    class="text-cyan-400 hover:text-cyan-300"
  >
    ← Read the full research paper
  </a>
{/if}
```

### 3. Smart Recommendations

If user completes experiment on SPACE, show related papers on .io.

### 4. Cross-Platform User Journey

Track users across both sites to understand the complete learning journey.

---

## 🧪 Testing Checklist

- [ ] CTA appears on papers with `interactive_demo_url` set
- [ ] CTA does NOT appear on papers without URL
- [ ] CTA link opens in new tab (`target="_blank"`)
- [ ] CTA link points to correct SPACE URL
- [ ] Clicking CTA navigates to SPACE successfully
- [ ] SPACE experiment loads and works
- [ ] Gradient styling renders correctly
- [ ] Icons display properly
- [ ] Responsive design works on mobile
- [ ] Banner variant displays correctly in article
- [ ] No console errors

---

## 📝 Papers to Link

Based on your SPACE experiments, set `interactive_demo_url` for these papers:

```sql
-- Cloudflare KV Quick Start
UPDATE papers
SET interactive_demo_url = 'https://createsomething.space/experiments/cloudflare-kv-quick-start'
WHERE slug = 'cloudflare-kv-quick-start';

-- D1 Database Tutorial
UPDATE papers
SET interactive_demo_url = 'https://createsomething.space/experiments/d1-database-tutorial'
WHERE slug = 'd1-database-tutorial';

-- Workers AI Getting Started
UPDATE papers
SET interactive_demo_url = 'https://createsomething.space/experiments/workers-ai-getting-started'
WHERE slug = 'workers-ai-getting-started';

-- R2 Storage Basics
UPDATE papers
SET interactive_demo_url = 'https://createsomething.space/experiments/r2-storage-basics'
WHERE slug = 'r2-storage-basics';
```

---

## 🐛 Troubleshooting

**CTA not appearing:**
- Check if `interactive_demo_url` is set in D1:
  ```bash
  npx wrangler d1 execute create-something-db \
    --command="SELECT slug, interactive_demo_url FROM papers WHERE slug = 'cloudflare-kv-quick-start';"
  ```
- Verify field is not null/empty
- Check browser console for errors

**CTA appears but link doesn't work:**
- Verify SPACE experiment exists at URL
- Check for typos in `interactive_demo_url`
- Ensure SPACE is deployed

**Styling issues:**
- Tailwind classes should auto-compile
- Check `tailwind.config.js` content paths
- Restart dev server: `npm run dev`

**Icons not showing:**
- SVG paths are inline (no external deps needed)
- Check browser console for SVG errors

---

## 🔗 Related Files

**Main Project (createsomething.io):**
- `/src/lib/components/InteractiveExperimentCTA.svelte` - CTA component
- `/src/lib/components/ArticleContent.svelte` - Displays CTA
- `/src/routes/experiments/[slug]/+page.svelte` - Experiment page
- `/src/routes/experiments/[slug]/+page.server.ts` - Fetches data
- `/src/lib/types/paper.ts` - Paper interface
- `/wrangler.jsonc` - Cloudflare config

**SPACE Project:**
- `/src/routes/experiments/[slug]/+page.svelte` - Interactive runtime
- `/src/lib/components/ExperimentRuntime.svelte` - Terminal experience
- `/src/lib/components/ExperimentCodeEditor.svelte` - Code lessons
- `/db/schema.sql` - Shared database schema

---

## 📈 Success Metrics

Track these to measure integration success:

1. **Click-through Rate**: % of readers who click CTA
2. **Completion Rate**: % who finish experiment after clicking
3. **Return Rate**: % who return to paper after experiment
4. **Time to Interactive**: How fast SPACE loads
5. **Cross-platform Engagement**: Users active on both sites

You can query this data from D1:

```sql
-- Papers driving most experiment attempts
SELECT
  p.title,
  COUNT(e.id) as attempts,
  SUM(e.completed) / COUNT(e.id) * 100 as completion_rate
FROM papers p
JOIN experiment_executions e ON p.id = e.paper_id
GROUP BY p.id
ORDER BY attempts DESC
LIMIT 10;
```

---

## 🎯 Quick Reference

**What changed:**
- ✅ Added `InteractiveExperimentCTA.svelte` component
- ✅ Updated `ArticleContent.svelte` to show CTA
- ✅ Database already configured (no changes needed!)

**What you need to do:**
1. Update D1 database with SPACE URLs
2. Test locally
3. Deploy both projects

**URLs:**
- Main site: `https://createsomething.io`
- SPACE site: `https://createsomething.space`
- Shared DB: `create-something-db`

---

**Status:** ✅ Ready for Database Updates & Deployment
**Last Updated:** November 2025
**Next Step:** Run the UPDATE queries to link papers to SPACE experiments

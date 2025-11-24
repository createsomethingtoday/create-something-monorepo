# Database Seeds for CREATE SOMETHING.ltd

This directory contains SQL seed scripts for populating the CREATE SOMETHING.ltd database with master data.

## Available Seeds

- **`seed-dieter-rams.sql`** — Dieter Rams (Industrial Design) + 10 Principles of Good Design
- **`seed-mies-van-der-rohe.sql`** — Ludwig Mies van der Rohe (Architecture)
- **`seed-edward-tufte.sql`** — Edward Tufte (Data Visualization) + 10 Principles

## Running Seeds

### Local Development

```bash
# Run individual seed
wrangler d1 execute DB --local --file=scripts/seed-dieter-rams.sql

# Run all seeds
wrangler d1 execute DB --local --file=scripts/seed-dieter-rams.sql
wrangler d1 execute DB --local --file=scripts/seed-mies-van-der-rohe.sql
wrangler d1 execute DB --local --file=scripts/seed-edward-tufte.sql
```

### Production

```bash
# Run individual seed (CAREFUL - this affects production)
wrangler d1 execute DB --file=scripts/seed-edward-tufte.sql

# Verify before running
wrangler d1 execute DB --command="SELECT * FROM masters;"
```

## Seed Structure

Each master seed includes:

1. **Master record** — Name, tagline, birth/death years, discipline, biography, legacy
2. **Principles** — Core principles/rules (usually 10) with descriptions and categories
3. **Quotes** — Notable quotes with context
4. **Resources** — Books, documentaries, websites (with featured flag)

## Database Schema

Refer to `migrations/0001_create_ltd_tables.sql` for the complete schema.

**Tables:**
- `masters` — Master creators/designers
- `principles` — Principles associated with each master
- `quotes` — Quotes from masters
- `examples` — Real-world examples of principles applied
- `resources` — Books, videos, articles about masters

## Adding a New Master

1. Create a new file: `scripts/seed-[master-slug].sql`
2. Follow the structure in existing seeds
3. Use single quotes for SQL strings
4. Escape single quotes with double single quotes (`''`)
5. Include:
   - Full biography (HTML allowed in `<p>` tags)
   - Legacy/impact section
   - 5-10 core principles
   - 3-5 notable quotes
   - 3-5 key resources

## Voice Compliance

Master content should align with CREATE SOMETHING voice guidelines:

- **Direct, declarative language** — No marketing fluff
- **Specific examples** — Cite real work, real dates, real impact
- **Philosophical grounding** — Connect principles to their philosophy
- **Honest assessment** — Acknowledge limitations and context
- **Useful over interesting** — Focus on application, not biography trivia

**Example:**
```
✅ "His 10 Principles of Good Design remain the gold standard"
❌ "An amazing visionary who revolutionized design"
```

## Canonical Entry Requirements

From `packages/ltd/src/routes/voice/+page.svelte`:

1. **Foundational impact** — Established principles we build upon
2. **Practical application** — Not just theory; implemented in work
3. **Evidence-based approach** — Research-backed, not opinion
4. **Timeless relevance** — Principles that withstand technological change

## Testing Seeds

```bash
# Test locally first
wrangler d1 execute DB --local --file=scripts/seed-edward-tufte.sql

# Query to verify
wrangler d1 execute DB --local --command="
SELECT m.name, COUNT(p.id) as principle_count
FROM masters m
LEFT JOIN principles p ON m.id = p.master_id
GROUP BY m.id;
"

# Check for Edward Tufte specifically
wrangler d1 execute DB --local --command="
SELECT * FROM masters WHERE slug = 'edward-tufte';
"
```

## Troubleshooting

**Error: "UNIQUE constraint failed"**
- Master already exists. Check with: `SELECT * FROM masters WHERE slug = 'edward-tufte';`
- Delete if needed: `DELETE FROM masters WHERE id = 'edward-tufte';`

**Error: "no such table: masters"**
- Run migrations first: `wrangler d1 migrations apply DB --local`

**Quote/principle not appearing**
- Verify `master_id` matches the master's `id` field (not slug)
- Check for SQL syntax errors (missing commas, unescaped quotes)

## Next Steps

After seeding:
1. Verify in UI: `http://localhost:5173/masters/edward-tufte`
2. Check all principles loaded
3. Verify resources are clickable
4. Test quote display

## Production Deployment

```bash
# 1. Test locally
wrangler d1 execute DB --local --file=scripts/seed-edward-tufte.sql

# 2. Verify locally
wrangler d1 execute DB --local --command="SELECT * FROM masters WHERE slug = 'edward-tufte';"

# 3. Deploy to production (CAREFUL)
wrangler d1 execute DB --file=scripts/seed-edward-tufte.sql

# 4. Verify production
wrangler d1 execute DB --command="SELECT * FROM masters WHERE slug = 'edward-tufte';"

# 5. Check live site
# Visit: https://createsomething.ltd/masters/edward-tufte
```

---

**Note:** Always test seeds locally before running in production. Database changes are not easily reversible.

# Hints Deployment Guide

## Overview

The game-theoretic mechanism design system is **100% complete** with comprehensive hints for all learning experiences.

This guide shows how to deploy the hints to production.

---

## What's Ready to Deploy

### ✅ Infrastructure (Already Deployed)
- Learning analytics service (`src/lib/services/learning-analytics.ts`)
- Mechanism design engine (`src/lib/services/mechanism-design.ts`)
- Contextual hint UI component (`src/lib/components/ContextualHint.svelte`)
- Integration in ExperimentRuntime and ExperimentCodeEditor
- API endpoints for tracking and insights

### ✅ Content (Ready to Deploy)
- **6 comprehensive lessons** with progressive hints
- **3-6 hints per lesson** (escalating specificity)
- **1-3 alternative approaches per lesson** (multiple solution paths)
- Expected output for each lesson
- Aligned with Heidegger's hermeneutic circle philosophy

---

## Deployment Steps

### Option 1: Automated Deployment (Recommended)

```bash
# Navigate to project root
cd /Users/micahjohnson/Documents/Github/Create\ Something/create-something-space-svelte

# Run migration script (applies both learning analytics + hints)
./scripts/apply-migrations.sh remote

# Verify deployment
npx wrangler d1 execute create-something-db --remote --command \
  "SELECT slug, json_extract(code_lessons, '$[0].hints') as lesson_1_hints \
   FROM papers WHERE slug = 'cloudflare-kv-quick-start'"
```

### Option 2: Manual Deployment

```bash
# Apply hints migration only
npx wrangler d1 execute create-something-db --remote \
  --file=migrations/0004_add_hints_to_kv_lessons.sql

# Verify
npx wrangler d1 execute create-something-db --remote --command \
  "SELECT COUNT(*) as lesson_count FROM papers WHERE slug = 'cloudflare-kv-quick-start'"
```

---

## What Changes After Deployment

### Before Hints:
```
User struggles on Lesson 5 → No guidance → 40% abandon
```

### After Hints (Game Theory):
```
User struggles on Lesson 5 (time > 2x median + errors ≥ 3)
  ↓
Mechanism design detects P(giving up) > P(breakthrough)
  ↓
Shows contextual hint: "Use JSON.stringify(user) to convert object to string"
  ↓
User tries hint → Success → Feedback tracked
  ↓
Analytics improve median time for future learners
```

---

## Hint Content Preview

### Lesson 1: Reading from KV
**Hints**:
1. Use env.CACHE.get('key-name') to read from KV
2. Don't forget the 'await' keyword - KV operations are asynchronous
3. The key you're looking for is called 'welcome-message'

**Alternative Approach**:
- You can also use env.KV.get() - both CACHE and KV point to the same namespace

---

### Lesson 2: Writing to KV
**Hints**:
1. Use env.CACHE.put('my-name', 'Your Name') to store your name
2. After putting the value, use env.CACHE.get('my-name') to read it back
3. Don't forget 'await' for both put() and get() operations
4. Combine the retrieved name in a template string: \`Hello, ${name}!\`

**Alternative Approaches**:
- You can store any string value, not just names
- You can use regular string concatenation: 'Hello, ' + name + '!'

---

### Lesson 3: Listing Keys
**Hints**:
1. Use env.CACHE.list() to get all keys in the namespace
2. The list() method returns an object with a 'keys' array
3. Use JSON.stringify(keys, null, 2) to format the output nicely
4. Don't forget 'await' since list() is asynchronous

**Alternative Approaches**:
- Filter by prefix: env.CACHE.list({ prefix: 'user-' })
- Limit results: env.CACHE.list({ limit: 10 })
- Iterate: keys.keys.map(k => k.name).join(', ')

---

### Lesson 4: Deleting Keys
**Hints**:
1. Use env.CACHE.delete('temp-data') to delete the key
2. After deleting, env.CACHE.get() will return null
3. Use ternary operator: result === null ? 'Deleted!' : 'Still exists'
4. Don't forget 'await' for the delete() operation

**Alternative Approaches**:
- Delete multiple keys with sequential delete() calls
- Check existence before deleting: if (await env.CACHE.get('key')) { ... }

---

### Lesson 5: Working with JSON
**Hints**:
1. Use JSON.stringify(user) to convert object to string
2. Store: env.CACHE.put('user', JSON.stringify(user))
3. Retrieve: const stored = await env.CACHE.get('user')
4. Parse: const parsed = JSON.parse(stored)
5. Access: parsed.name and parsed.score

**Alternative Approaches**:
- Store arrays: JSON.stringify([1, 2, 3])
- Destructure: const { name, score } = JSON.parse(stored)
- One-liner: JSON.parse(await env.CACHE.get('user'))

---

### Lesson 6: Building an API
**Hints**:
1. Parse URL: const url = new URL(request.url)
2. Check pathname: if (url.pathname === '/set') { ... }
3. For /set: Store '0' as initial counter
4. For /increment: parseInt(current) + 1, convert back to string
5. For /get: Read and display counter
6. Use || '0' for default value

**Alternative Approaches**:
- Use switch statement: switch(url.pathname) { ... }
- Store as JSON: { count: 0 }
- Add endpoints: /decrement, /reset
- Query params: /set?value=5

---

## Verification After Deployment

### Test the Full Flow

1. **Visit the experiment**:
   ```
   https://createsomething.space/experiments/cloudflare-kv-quick-start
   ```

2. **Trigger a hint** (manual testing):
   - Start Lesson 5
   - Wait ~2 minutes without submitting code
   - Make 2-3 intentional errors
   - Hint should appear: "Use JSON.stringify(user)..."

3. **Check hint feedback**:
   - Click "Yes, this helped" or "No"
   - Verify feedback is tracked in analytics

4. **Monitor analytics** (browser console):
   ```javascript
   // View all learning events
   fetch('/api/analytics/learning?paperId=cloudflare-kv-quick-start')
     .then(r => r.json())
     .then(console.log)

   // View aggregate insights for Lesson 5
   fetch('/api/analytics/insights?paperId=cloudflare-kv-quick-start&stepIndex=4')
     .then(r => r.json())
     .then(console.log)
   ```

### Expected Analytics Output

```json
{
  "total_attempts": 12,
  "success_rate": 0.75,
  "avg_time": 180000,
  "medianTimeToComplete": 120000,
  "struggle_rate": 0.25,
  "events": [
    { "action": "step_start", "stepIndex": 4, "timestamp": 1700000000 },
    { "action": "step_error", "stepIndex": 4, "errorCount": 1 },
    { "action": "hint_shown", "stepIndex": 4, "timeOnStep": 140000 },
    { "action": "hint_helpful", "stepIndex": 4 },
    { "action": "step_complete", "stepIndex": 4, "timeOnStep": 180000 }
  ]
}
```

---

## Rollback Plan (If Needed)

If hints cause issues:

```bash
# Remove hints from lessons (revert migration)
npx wrangler d1 execute create-something-db --remote --command \
  "UPDATE papers SET code_lessons = '[original_lessons_without_hints]' WHERE slug = 'cloudflare-kv-quick-start'"
```

The mechanism design system will gracefully handle missing hints by:
- Still tracking analytics
- Still detecting struggle
- Not showing hints (silent failure)

---

## Success Metrics

After deployment, monitor:

### Learning Efficiency
- **Median time to complete per lesson** (should decrease over time)
- **Success rate per lesson** (should increase)
- **Abandonment rate** (should decrease)

### Hint Effectiveness
- **% who find hints helpful** (target: >70%)
- **Time to complete after hint** (should decrease)
- **Completion rate after hint shown** (should increase)

### System Health
- **Hint trigger accuracy** (not too early, not too late)
- **API response times** (<100ms)
- **Event tracking success rate** (>95%)

---

## Philosophy Alignment

**Heidegger's Hermeneutic Circle** ✅
- Hints inform part from whole
- Preserve productive struggle
- Don't provide complete solutions

**Game Theory (Nash Equilibrium)** ✅
- Intervene when P(giving up) > P(breakthrough)
- Optimize for: Understanding × Retention
- Invisible scaffolding, not gamification

**DRY Development** ✅
- Single analytics service (reused across all experiments)
- Single decision engine (reused for terminal + code)
- Single hint component (reused everywhere)
- Single migration script (deploys all hints)

---

## Next Steps After Deployment

1. **Monitor analytics for 1 week**
   - Collect baseline metrics
   - Identify which lessons trigger most hints
   - Measure hint effectiveness

2. **Iterate on hint content** (if needed)
   - Adjust specificity based on effectiveness data
   - Add/remove alternative approaches
   - Refine trigger thresholds

3. **Expand to other experiments**
   - Terminal experiments (wrangler commands)
   - Future code experiments
   - Apply same hint philosophy

---

## Files Reference

```
src/lib/data/kv-lessons-with-hints.json          # Complete lesson structure
migrations/0004_add_hints_to_kv_lessons.sql      # D1 migration
migrations/README.md                              # Migration docs
scripts/apply-migrations.sh                       # Deployment script
GAME_THEORY_IMPLEMENTATION.md                     # Full architecture
HINTS_DEPLOYMENT_GUIDE.md                         # This file
```

---

**Ready to deploy?** Run:
```bash
./scripts/apply-migrations.sh remote
```

**Status**: 🟢 Ready for Production
**Estimated Deployment Time**: 2 minutes
**Risk Level**: Low (graceful degradation if issues)

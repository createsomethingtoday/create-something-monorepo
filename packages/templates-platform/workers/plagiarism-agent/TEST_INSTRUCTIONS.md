# 🧪 Testing Vector Convergence with Two Templates

Quick guide to test if the vector space captures meaningful HTML/CSS insights.

---

## Prerequisites

You need to set the `OPENAI_API_KEY` secret first:

```bash
cd packages/templates-platform/workers/plagiarism-agent

# Option 1: Echo the key (secure in terminal)
echo "your-openai-api-key-here" | wrangler secret put OPENAI_API_KEY

# Option 2: Interactive (paste and press CTRL+D)
wrangler secret put OPENAI_API_KEY
```

Get your API key from: https://platform.openai.com/api-keys

---

## Run the Test

### **Option 1: Automated Test (Padelthon vs Brave Studio)**

```bash
cd packages/templates-platform/workers/plagiarism-agent
./test-two-templates.sh
```

This will:
1. Index Padelthon template
2. Index Brave Studio template
3. Query each to find similar templates
4. Show if they converge in vector space

**Expected behavior:**
- If similar: Templates appear in each other's top results
- If different: Templates don't appear in each other's results
- Either result is informative!

### **Option 2: Interactive Test (Choose Your Own Templates)**

```bash
cd packages/templates-platform/workers/plagiarism-agent
./test-convergence.sh
```

You'll be prompted to enter:
- Template URL
- Template name

---

## What the Test Reveals

### **1. Feature Extraction Works**
Watch the logs to see features extracted:
- HTML structure (elements, classes, layout)
- CSS patterns (selectors, properties, animations)
- Webflow interactions (IX2, node IDs)
- DOM hierarchy (structural relationships)

### **2. Embeddings Capture Meaning**
The vector space should capture:
- **Similar layouts** → High similarity (>0.85)
- **Similar CSS approaches** → Moderate similarity (0.70-0.85)
- **Completely different designs** → Low similarity (<0.70)

### **3. Convergence Validates the System**

**If templates ARE similar:**
```
Query: "Find similar to Padelthon"
Results:
  1. Padelthon (1.00) ← itself
  2. Brave Studio (0.88) ← CONVERGED!
```

**If templates are NOT similar:**
```
Query: "Find similar to Padelthon"
Results:
  1. Padelthon (1.00) ← itself
  (no other results >0.70)
```

Both outcomes are valuable!

---

## Manual Testing (cURL)

### **1. Index a Template**

```bash
curl -X POST https://plagiarism-agent.createsomething.workers.dev/index \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-template-1",
    "url": "https://your-template.webflow.io/",
    "name": "Your Template",
    "creator": "Your Name"
  }' | jq .
```

**Expected output:**
```json
{
  "success": true,
  "message": "Template test-template-1 indexed successfully"
}
```

### **2. Query for Similar Templates**

```bash
curl -X POST https://plagiarism-agent.createsomething.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-template.webflow.io/",
    "topK": 5
  }' | jq .
```

**Expected output:**
```json
{
  "query_url": "https://your-template.webflow.io/",
  "results": [
    {
      "id": "test-template-1",
      "similarity": 1.0,
      "name": "Your Template",
      "url": "https://your-template.webflow.io/",
      "creator": "Your Name",
      "indexed_at": 1736683200000
    }
  ],
  "count": 1
}
```

### **3. Check Index Stats**

```bash
curl https://plagiarism-agent.createsomething.workers.dev/stats | jq .
```

---

## Monitoring (Watch Logs)

```bash
wrangler tail plagiarism-agent --format=pretty
```

Look for:
```
[Indexer] Indexing template-id: Template Name...
[Indexer] Content fetched for template-id
[Indexer] Features extracted for template-id
[Indexer] Embedding computed for template-id (512 dimensions)
[Indexer] ✅ Successfully indexed template-id
```

Or errors:
```
[Indexer] ❌ Error indexing template-id: [reason]
```

---

## What to Look For

### **✅ Success Indicators:**

1. **Indexing completes**
   - `"success": true`
   - Features extracted
   - 512-dimension embedding computed

2. **Queries return results**
   - Template finds itself with similarity = 1.0
   - Similar templates appear with similarity >0.70

3. **Convergence observed**
   - Similar designs cluster together
   - Different designs stay apart

### **⚠️ Troubleshooting:**

**Error: "OPENAI_API_KEY environment variable is missing"**
```bash
# Solution: Set the API key
echo "your-key" | wrangler secret put OPENAI_API_KEY
```

**Error: "Failed to fetch content"**
```bash
# Cause: URL inaccessible or 404
# Solution: Use a published, accessible URL
# Good: https://template.webflow.io/
# Bad: https://preview.webflow.com/preview/... (requires auth)
```

**No similar templates found**
```bash
# This is actually good! It means:
# - The templates are genuinely different
# - The system can distinguish them
# - Vector space is working correctly
```

---

## Interpreting Results

### **Similarity Score Guide:**

| Score | Meaning | Interpretation |
|-------|---------|----------------|
| **1.00** | Identical | Same template (expected for self-query) |
| **0.95-0.99** | Extremely similar | Likely copied or minimal variation |
| **0.85-0.95** | High similarity | Significant structural overlap |
| **0.70-0.85** | Moderate similarity | Some common patterns/approaches |
| **<0.70** | Low similarity | Different designs |

### **Example Scenarios:**

**Scenario 1: Plagiarism Detection**
```
Template A: Original design
Template B: Copy with renamed classes
Vector similarity: 0.93 ← HIGH!
Verdict: Likely plagiarism detected ✅
```

**Scenario 2: Common Patterns**
```
Template A: Uses CSS Grid, flexbox, modern layout
Template B: Also uses CSS Grid, flexbox, modern layout
Vector similarity: 0.78 ← MODERATE
Verdict: Similar modern patterns, but not copying
```

**Scenario 3: Different Designs**
```
Template A: Minimalist portfolio
Template B: Complex e-commerce site
Vector similarity: 0.42 ← LOW
Verdict: Completely different approaches ✅
```

---

## What You'll Learn

### **1. HTML/CSS Structure is Captured**
The embeddings understand:
- Element hierarchy (nav > ul > li)
- Class naming patterns
- Layout methods (grid vs flex)
- Semantic structure

### **2. Meaningful Similarities Emerge**
Templates with similar:
- CSS approaches
- Layout structures
- Webflow interaction patterns
- DOM hierarchies

...will converge in vector space!

### **3. System Distinguishes Designs**
Truly different templates:
- Won't appear in each other's results
- Remain distant in vector space
- Proves the system works both ways

---

## Expected Outcomes

### **Best Case: Clear Convergence**
```
Padelthon ↔ Similar Template: 0.88 similarity
→ Vector space captures meaningful patterns!
→ System can detect structural similarities!
```

### **Also Good: Clear Divergence**
```
Padelthon ↔ Different Template: 0.45 similarity
→ Vector space distinguishes different designs!
→ System won't create false positives!
```

### **Most Insightful: Moderate Similarity**
```
Padelthon ↔ Another Template: 0.75 similarity
→ Some common patterns (modern CSS, flexbox)
→ But clearly different overall designs
→ System captures nuance!
```

---

## Cost

- **Indexing**: $0.002 per template
- **Querying**: $0.002 per query
- **This test**: ~$0.008 total (4 operations)

**Negligible cost for validation!**

---

## Next Steps

After running the test:

1. **If convergence works well:**
   - Index more templates (5-10)
   - Build template catalog
   - Enable proactive scanning

2. **If results need tuning:**
   - Adjust feature extraction weights
   - Modify similarity thresholds
   - Experiment with different template types

3. **Production deployment:**
   - Index all marketplace templates
   - Integrate into Tier 3 analysis
   - Enable automatic discovery

---

## Quick Start (Copy/Paste)

```bash
# 1. Set API key (if not already set)
cd packages/templates-platform/workers/plagiarism-agent
echo "your-openai-key" | wrangler secret put OPENAI_API_KEY

# 2. Run test
./test-two-templates.sh

# 3. Watch results and convergence analysis!
```

---

**Ready to see convergence in action!** 🚀

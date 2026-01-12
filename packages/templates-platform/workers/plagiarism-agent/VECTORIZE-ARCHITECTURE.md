# Vector Database Architecture for Plagiarism Detection

**Paradigm Shift**: From pairwise comparison to similarity search

---

## 🎯 Concept

### **Current System (Pairwise)**
```
Report: Template A copied Template B
→ Fetch A and B
→ Compute embeddings for both
→ Compare A vs B
→ Return similarity score
```

**Problem**: O(n²) for all comparisons, reactive only

### **New System (Vector Search)**
```
Index Phase (Run Once):
→ Fetch all published templates
→ Extract features for each
→ Compute embeddings
→ Store in Cloudflare Vectorize

Query Phase (On Report):
→ Compute embedding for alleged copy
→ Query vector DB for nearest neighbors
→ Return top N most similar templates
→ Automatic discovery of copying!
```

**Benefits**: O(log n) queries, proactive detection

---

## 🏗️ Architecture

### **Components**

```
┌─────────────────────────────────────────────────────┐
│  1. INDEXING PIPELINE (Batch Job)                   │
│     ├── Fetch all Webflow templates                 │
│     ├── Extract features (HTML/CSS/JS/Webflow)      │
│     ├── Compute embeddings (OpenAI)                 │
│     └── Store in Vectorize                          │
│                                                      │
│  Input: Webflow template catalog                    │
│  Output: Vector index                               │
│  Frequency: Daily/weekly                            │
└─────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│  2. CLOUDFLARE VECTORIZE (Vector Database)          │
│     ├── Stores embeddings for all templates         │
│     ├── Enables fast similarity search              │
│     └── Returns nearest neighbors                   │
│                                                      │
│  Schema:                                             │
│    - id: template_id                                │
│    - values: [512-dim embedding]                    │
│    - metadata: {name, url, creator, timestamp}      │
└─────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│  3. QUERY SERVICE (Plagiarism Detection)            │
│     ├── Receive plagiarism report                   │
│     ├── Compute embedding for alleged copy          │
│     ├── Query Vectorize for similar templates       │
│     └── Return matches with similarity scores       │
│                                                      │
│  Input: Single template URL                         │
│  Output: List of similar templates (ranked)         │
│  Latency: <500ms                                    │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Implementation Plan

### **Phase 1: Vector Index Setup**

1. **Create Vectorize Index**
```bash
wrangler vectorize create plagiarism-templates \
  --dimensions 512 \
  --metric cosine
```

2. **Update wrangler.toml**
```toml
[[vectorize]]
binding = "VECTORIZE"
index_name = "plagiarism-templates"
```

3. **Create Indexing Worker**
```typescript
// src/indexer.ts
export async function indexTemplate(
  templateUrl: string,
  templateId: string,
  metadata: TemplateMetadata,
  env: Env
): Promise<void> {
  // 1. Fetch content
  const content = await fetchPublishedContent(templateUrl);
  if (!content) return;

  // 2. Extract features
  const features = extractCodeFeatures(content);

  // 3. Compute embedding (combined)
  const combined = `
    ${features.html_structure}
    ${features.css_patterns}
    ${features.js_logic}
    ${features.webflow_interactions}
    ${features.dom_hierarchy}
  `.trim();

  const embedding = await computeEmbedding(combined, env.OPENAI_API_KEY);

  // 4. Store in Vectorize
  await env.VECTORIZE.upsert([{
    id: templateId,
    values: embedding,
    metadata: {
      name: metadata.name,
      url: templateUrl,
      creator: metadata.creator,
      indexed_at: Date.now()
    }
  }]);

  console.log(`[Index] Indexed ${templateId}: ${metadata.name}`);
}
```

### **Phase 2: Batch Indexing**

```typescript
// src/batch-index.ts
export async function indexAllTemplates(env: Env): Promise<void> {
  // Fetch template catalog from Airtable or Webflow API
  const templates = await fetchTemplatesCatalog(env);

  console.log(`[Batch] Indexing ${templates.length} templates...`);

  // Process in batches to avoid rate limits
  const BATCH_SIZE = 10;
  for (let i = 0; i < templates.length; i += BATCH_SIZE) {
    const batch = templates.slice(i, i + BATCH_SIZE);
    
    await Promise.all(
      batch.map(t => indexTemplate(t.url, t.id, t.metadata, env))
    );

    // Rate limit: Wait between batches
    await sleep(1000);
  }

  console.log(`[Batch] Indexed ${templates.length} templates`);
}
```

### **Phase 3: Similarity Query**

```typescript
// src/query.ts
export async function findSimilarTemplates(
  allegedCopyUrl: string,
  env: Env,
  topK: number = 10
): Promise<SimilarTemplate[]> {
  // 1. Fetch and extract features
  const content = await fetchPublishedContent(allegedCopyUrl);
  if (!content) return [];

  const features = extractCodeFeatures(content);
  const combined = `
    ${features.html_structure}
    ${features.css_patterns}
    ${features.js_logic}
    ${features.webflow_interactions}
    ${features.dom_hierarchy}
  `.trim();

  // 2. Compute embedding
  const embedding = await computeEmbedding(combined, env.OPENAI_API_KEY);

  // 3. Query Vectorize for nearest neighbors
  const results = await env.VECTORIZE.query(embedding, {
    topK,
    returnValues: false,
    returnMetadata: true
  });

  // 4. Return matches with similarity scores
  return results.matches.map(match => ({
    id: match.id,
    similarity: match.score,
    name: match.metadata.name,
    url: match.metadata.url,
    creator: match.metadata.creator,
    verdict: classifySimilarity(match.score)
  }));
}

function classifySimilarity(score: number): string {
  if (score >= 0.95) return 'extremely_similar';
  if (score >= 0.85) return 'high_similarity';
  if (score >= 0.70) return 'moderate_similarity';
  return 'low_similarity';
}
```

### **Phase 4: Integration**

```typescript
// src/index.ts - Enhanced Tier 3
async function runTier3Judgment(
  plagiarismCase: PlagiarismCase,
  tier2Result: any,
  env: Env
): Promise<void> {
  // ... existing code ...

  // NEW: Find ALL similar templates
  const similarTemplates = await findSimilarTemplates(
    plagiarismCase.allegedCopyUrl,
    env,
    10 // Top 10 matches
  );

  console.log('[Tier 3] Similar templates found:', similarTemplates);

  // Check if original template is in top matches
  const originalMatch = similarTemplates.find(
    t => t.url === plagiarismCase.originalUrl
  );

  const prompt = `Make final judgment on plagiarism case:

Original: ${plagiarismCase.originalUrl}
Alleged copy: ${plagiarismCase.allegedCopyUrl}

Vector Similarity Analysis (ALL Templates):
${similarTemplates.map((t, i) => `
${i + 1}. ${t.name} (${t.creator})
   URL: ${t.url}
   Similarity: ${(t.similarity * 100).toFixed(1)}%
   Verdict: ${t.verdict}
   ${t.url === plagiarismCase.originalUrl ? '← REPORTED ORIGINAL' : ''}
`).join('\n')}

${originalMatch ? `
ORIGINAL TEMPLATE FOUND: Rank #${similarTemplates.indexOf(originalMatch) + 1}
Similarity: ${(originalMatch.similarity * 100).toFixed(1)}%

If original is top match → Strong evidence of copying
If original is lower → May be common patterns or coincidence
` : `
WARNING: Original template NOT in top 10 matches!
This suggests the alleged copy is NOT similar to the original.
Consider: No violation OR false positive report.
`}

CRITICAL INSIGHT: Vector search reveals the FULL landscape.
- If original is #1 match → Clear copying
- If different template is #1 → May have copied someone else!
- If no high matches → Likely original work

Make decision considering ALL similar templates, not just pairwise comparison.
`;

  // ... rest of existing Tier 3 logic ...
}
```

---

## 💡 Key Insights

### **1. Discovery, Not Just Verification**

**Before**: "Did A copy B?" (pairwise verification)  
**After**: "Who did A copy from?" (discovery)

The system now finds the ACTUAL source, even if the reporter got it wrong!

### **2. Proactive Detection**

```typescript
// Cron job: Check new submissions
export async function scanNewTemplates(env: Env): Promise<void> {
  const newTemplates = await fetchRecentlyPublished(env);

  for (const template of newTemplates) {
    const similar = await findSimilarTemplates(template.url, env, 5);
    
    // If ANY existing template is >90% similar → Flag for review
    const highSimilarity = similar.filter(s => s.similarity > 0.90);
    
    if (highSimilarity.length > 0) {
      await createAutomaticPlagiarismCase(template, highSimilarity, env);
      console.log(`[Proactive] Flagged ${template.name} - similar to ${highSimilarity.length} templates`);
    }
  }
}
```

### **3. Network Analysis**

```typescript
// Find plagiarism networks
export async function detectPlagiarismRings(env: Env): Promise<void> {
  const allTemplates = await fetchAllTemplateIds(env);
  const clusters: TemplateCluster[] = [];

  for (const templateId of allTemplates) {
    const embedding = await env.VECTORIZE.getByIds([templateId]);
    const similar = await env.VECTORIZE.query(embedding[0].values, { topK: 5 });
    
    // If 3+ templates are >85% similar → Cluster
    const highSimilar = similar.matches.filter(m => m.score > 0.85);
    if (highSimilar.length >= 3) {
      clusters.push({
        templates: highSimilar.map(m => m.id),
        avgSimilarity: average(highSimilar.map(m => m.score))
      });
    }
  }

  console.log(`[Network] Found ${clusters.length} potential plagiarism rings`);
}
```

### **4. Convergence Detection**

You're absolutely right: similar templates will **converge** in vector space!

```
Vector Space Visualization:

  Template A (original) ●
                        |
                        | 95% similar
                        |
  Template B (copy 1)   ●
                        |
                        | 92% similar
                        |
  Template C (copy 2)   ●

→ All cluster together in vector space
→ Automatic detection without reports!
```

---

## 📊 Performance & Cost

### **Indexing Cost**

```
Initial index (1000 templates):
- Embeddings: 1000 × $0.002 = $2.00
- Time: ~30 minutes (with rate limits)
- Frequency: Weekly or on new submissions

Monthly maintenance (50 new templates):
- Embeddings: 50 × $0.002 = $0.10/month
```

### **Query Cost**

```
Per plagiarism report:
- Previous: $0.172 (compare A vs B)
- New: $0.002 (query pre-computed index)
- Savings: $0.17 per query

→ 99% cost reduction on queries!
→ All comparison cost moved to index phase
```

### **Vectorize Pricing**

```
Cloudflare Vectorize (free tier):
- 30M queried vectors/month
- 5M stored vectors
- More than enough for templates platform

Paid tier (if needed):
- $0.04 per million queried vectors
- Negligible cost for this use case
```

---

## 🎯 Migration Strategy

### **Phase 1: Parallel Run** (Week 1-2)
- Keep existing pairwise comparison
- Build and populate Vectorize index
- Compare results side-by-side
- Tune similarity thresholds

### **Phase 2: Enhanced Detection** (Week 3-4)
- Add vector search to Tier 3 prompt
- Show AI both pairwise AND similar templates
- Measure improvement in accuracy

### **Phase 3: Full Switch** (Week 5+)
- Make vector search primary detection
- Use pairwise as fallback only
- Enable proactive scanning

### **Phase 4: Network Analysis** (Future)
- Detect plagiarism rings
- Visualize template similarity clusters
- Proactive enforcement

---

## 🚀 Immediate Next Steps

### **1. Create Vectorize Index**
```bash
cd packages/templates-platform/workers/plagiarism-agent
wrangler vectorize create plagiarism-templates --dimensions 512 --metric cosine
```

### **2. Build Indexer**
- Create `src/indexer.ts`
- Implement `indexTemplate()` function
- Add batch processing logic

### **3. Populate Index**
- Fetch template catalog (Airtable/Webflow API)
- Run batch indexing job
- Verify embeddings stored correctly

### **4. Test Query**
- Query for Padelthon template
- Check top matches
- Validate similarity scores

### **5. Integrate into Tier 3**
- Add vector search results to prompt
- Test with real cases
- Compare vs pairwise results

---

## 💡 Advanced Features (Future)

### **1. Multi-Index Strategy**
```typescript
// Separate indices for different signal types
await env.VECTORIZE_VISUAL.upsert(...);  // Screenshot embeddings
await env.VECTORIZE_CODE.upsert(...);    // Code embeddings
await env.VECTORIZE_LAYOUT.upsert(...);  // Layout embeddings

// Query all and combine scores
const results = await Promise.all([
  env.VECTORIZE_VISUAL.query(visualEmbedding),
  env.VECTORIZE_CODE.query(codeEmbedding),
  env.VECTORIZE_LAYOUT.query(layoutEmbedding)
]);

// Weighted combination
const combined = combineScores(results, { visual: 0.4, code: 0.4, layout: 0.2 });
```

### **2. Temporal Analysis**
```typescript
// Track how templates evolve
const versions = await env.VECTORIZE.query(embedding, {
  filter: { template_id: 'template_123' }
});

// Detect gradual copying over time
if (versions.length > 1) {
  const similarity = cosineSimilarity(
    versions[0].values,
    versions[versions.length - 1].values
  );
  if (similarity > 0.95) {
    console.log('Template converged to existing design over time');
  }
}
```

### **3. Creator Fingerprinting**
```typescript
// Find creator's style patterns
const creatorTemplates = await env.VECTORIZE.query(embedding, {
  filter: { creator: 'john_doe' }
});

// Compute creator's "signature" (average embedding)
const signature = averageEmbeddings(creatorTemplates.map(t => t.values));

// Detect style copying
const styleSimilarity = cosineSimilarity(newTemplate, signature);
if (styleSimilarity > 0.90) {
  console.log('New template matches creator style');
}
```

---

## ✅ Summary

**Your insight is brilliant!** Moving from pairwise comparison to vector database:

| Aspect | Pairwise | Vector DB |
|--------|----------|-----------|
| **Comparison** | A vs B only | A vs ALL |
| **Discovery** | Reactive | Proactive |
| **Cost/query** | $0.17 | $0.002 |
| **Latency** | 2-3s | <500ms |
| **Scale** | O(n²) | O(log n) |
| **Network analysis** | No | Yes |

**Next**: Create Vectorize index and build indexer worker!

---

**Paradigm**: From "compare these two" to "show me everything similar"  
**Result**: Automatic plagiarism discovery, not just verification  
**Impact**: 🚀 **Game changer for enforcement**

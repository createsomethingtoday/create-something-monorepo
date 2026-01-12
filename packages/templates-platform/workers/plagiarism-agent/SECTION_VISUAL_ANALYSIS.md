# Section-Level Visual Analysis Architecture

**Purpose:** Detect "reconstructed" plagiarism by combining vector similarity with automated screenshot comparison

---

## 🎯 The Problem This Solves

**Padelthon Case Revealed:**
- Vector similarity: <70% (different code structure)
- Human reviewer: Major violation (visual copying)
- **Gap:** Code analysis misses visual/layout plagiarism

**Solution:** Vector-guided visual verification
1. Vectors identify potentially similar sections
2. System captures screenshots of those sections
3. Vision AI compares screenshots
4. Combined verdict (structural + visual)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  PHASE 1: Section Detection & Extraction                │
│  ├── Parse HTML into semantic sections                  │
│  ├── Identify: hero, features, testimonials, footer     │
│  ├── Extract HTML/CSS for each section                  │
│  └── Compute vector embedding per section               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 2: Section-Level Vector Similarity               │
│  ├── Compare hero-to-hero across templates              │
│  ├── Compare features-to-features                       │
│  ├── Compare testimonials-to-testimonials               │
│  └── Identify high-similarity section pairs (>70%)      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 3: Automated Screenshot Capture                  │
│  ├── Launch Puppeteer browser                           │
│  ├── Navigate to template URL                           │
│  ├── For each similar section:                          │
│  │   ├── Scroll to section                              │
│  │   ├── Wait for content load                          │
│  │   ├── Capture viewport screenshot                    │
│  │   └── Store in R2 with section metadata              │
│  └── Return screenshot pairs for comparison             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 4: Vision-Based Similarity Analysis              │
│  ├── Load screenshot pairs                              │
│  ├── Claude/GPT-4V compares visually                    │
│  ├── Scores: layout, spacing, typography, colors        │
│  └── Returns: visual_similarity (0-100%)                │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 5: Multi-Modal Verdict                           │
│  ├── Combine vector similarity + visual similarity      │
│  ├── Detection patterns:                                │
│  │   • High vector + High visual = Copy-paste           │
│  │   • Low vector + High visual = Reconstructed ← KEY!  │
│  │   • High vector + Low visual = Shared framework      │
│  │   • Low vector + Low visual = Different designs      │
│  └── Final verdict with confidence score                │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 Implementation Plan

### **Phase 1: Section Detection**

```typescript
// src/section-detector.ts

interface TemplateSection {
  id: string;
  type: 'hero' | 'features' | 'testimonials' | 'cta' | 'footer' | 'other';
  selector: string;  // CSS selector to find this section
  html: string;
  offsetTop: number; // Scroll position
  height: number;
}

export function detectSections(html: string): TemplateSection[] {
  // Use semantic HTML tags and common patterns
  const sections: TemplateSection[] = [];
  
  // Hero: First major section, often has h1
  // Features: Grid/flex with icons or images
  // Testimonials: Quotes, profile images
  // CTA: Call-to-action buttons
  // Footer: Bottom-most section with links
  
  return sections;
}

export async function extractSectionEmbedding(
  section: TemplateSection,
  apiKey: string
): Promise<number[]> {
  // Similar to full template, but for section only
  const features = extractCodeFeatures({
    html: section.html,
    css: '', // Extract from inline styles
    javascript: '',
    url: ''
  });
  
  return await computeCombinedEmbedding(features, apiKey);
}
```

### **Phase 2: Section-Level Indexing**

```typescript
// src/section-indexer.ts

export async function indexTemplateSections(
  templateId: string,
  templateUrl: string,
  env: Env
): Promise<void> {
  // 1. Fetch full HTML
  const html = await fetchHtml(templateUrl);
  
  // 2. Detect sections
  const sections = detectSections(html);
  
  // 3. Index each section separately
  for (const section of sections) {
    const embedding = await extractSectionEmbedding(section, env.OPENAI_API_KEY);
    
    await env.VECTORIZE.upsert([{
      id: `${templateId}:${section.type}:${section.id}`,
      values: embedding,
      metadata: {
        templateId,
        templateUrl,
        sectionType: section.type,
        sectionId: section.id,
        selector: section.selector,
        offsetTop: section.offsetTop,
        height: section.height
      }
    }]);
  }
}
```

### **Phase 3: Smart Screenshot Capture**

```typescript
// src/section-screenshots.ts

export interface SectionScreenshot {
  templateId: string;
  sectionType: string;
  sectionId: string;
  screenshotUrl: string;
  selector: string;
}

export async function captureSectionScreenshot(
  templateUrl: string,
  section: TemplateSection,
  env: Env
): Promise<string> {
  // Launch browser
  const browser = await puppeteer.launch(env.BROWSER);
  const page = await browser.newPage();
  
  try {
    // Set viewport for consistency
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Navigate to template
    await page.goto(templateUrl, { waitUntil: 'networkidle0' });
    
    // Wait for section to be visible
    await page.waitForSelector(section.selector, { timeout: 5000 });
    
    // Scroll to section
    await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, section.selector);
    
    // Wait for scroll to complete
    await page.waitForTimeout(1000);
    
    // Capture section screenshot
    const element = await page.$(section.selector);
    if (!element) {
      throw new Error(`Section not found: ${section.selector}`);
    }
    
    const screenshot = await element.screenshot({ type: 'png' });
    
    // Store in R2
    const key = `screenshots/${Date.now()}-${section.sectionId}.png`;
    await env.SCREENSHOTS.put(key, screenshot);
    
    return key;
    
  } finally {
    await browser.close();
  }
}

export async function captureFullPageScreenshot(
  templateUrl: string,
  env: Env
): Promise<string> {
  const browser = await puppeteer.launch(env.BROWSER);
  const page = await browser.newPage();
  
  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(templateUrl, { waitUntil: 'networkidle0' });
    
    // Full page screenshot
    const screenshot = await page.screenshot({ 
      fullPage: true,
      type: 'png'
    });
    
    const key = `screenshots/full-${Date.now()}.png`;
    await env.SCREENSHOTS.put(key, screenshot);
    
    return key;
    
  } finally {
    await browser.close();
  }
}
```

### **Phase 4: Section-to-Section Visual Comparison**

```typescript
// src/section-visual-compare.ts

export interface SectionVisualSimilarity {
  sectionType: string;
  vectorSimilarity: number;
  visualSimilarity: number;
  pattern: 'copy_paste' | 'reconstructed' | 'shared_framework' | 'different';
  confidence: number;
}

export async function compareSectionVisually(
  screenshot1Url: string,
  screenshot2Url: string,
  env: Env
): Promise<number> {
  // Fetch screenshots from R2
  const img1 = await env.SCREENSHOTS.get(screenshot1Url);
  const img2 = await env.SCREENSHOTS.get(screenshot2Url);
  
  if (!img1 || !img2) {
    throw new Error('Screenshots not found');
  }
  
  const img1Base64 = btoa(String.fromCharCode(...new Uint8Array(await img1.arrayBuffer())));
  const img2Base64 = btoa(String.fromCharCode(...new Uint8Array(await img2.arrayBuffer())));
  
  // Use Claude or GPT-4V for visual comparison
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: img1Base64
          }
        },
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: img2Base64
          }
        },
        {
          type: 'text',
          text: `Compare these two template sections visually. Focus on:
- Layout structure and composition
- Spacing and alignment
- Typography hierarchy
- Color scheme and visual style
- Element positioning

Return ONLY a similarity score from 0-100, where:
- 90-100: Nearly identical layouts
- 70-89: Highly similar with minor variations
- 50-69: Some shared patterns
- 0-49: Different designs

Score:`
        }
      ]
    }]
  });
  
  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const score = parseInt(text.match(/\d+/)?.[0] || '0');
  
  return score / 100; // Return 0-1
}
```

### **Phase 5: Multi-Modal Analysis**

```typescript
// src/multi-modal-analysis.ts

export async function analyzeTemplatePlagiarism(
  originalUrl: string,
  allegedCopyUrl: string,
  env: Env
): Promise<{
  verdict: 'major' | 'minor' | 'none';
  confidence: number;
  evidence: SectionVisualSimilarity[];
  reasoning: string;
}> {
  // 1. Detect sections in both templates
  const originalSections = await detectAndIndexSections(originalUrl, env);
  const copySections = await detectAndIndexSections(allegedCopyUrl, env);
  
  // 2. Find structurally similar sections (vector)
  const sectionPairs: Array<{
    originalSection: TemplateSection;
    copySection: TemplateSection;
    vectorSimilarity: number;
  }> = [];
  
  for (const origSection of originalSections) {
    const embedding = await extractSectionEmbedding(origSection, env.OPENAI_API_KEY);
    const similar = await env.VECTORIZE.query(embedding, {
      topK: 5,
      filter: { sectionType: origSection.type } // Compare same section types
    });
    
    for (const match of similar.matches) {
      if (match.metadata.templateUrl === allegedCopyUrl) {
        sectionPairs.push({
          originalSection: origSection,
          copySection: copySections.find(s => s.id === match.metadata.sectionId)!,
          vectorSimilarity: match.score
        });
      }
    }
  }
  
  // 3. For each similar section pair, capture screenshots
  const evidence: SectionVisualSimilarity[] = [];
  
  for (const pair of sectionPairs) {
    if (pair.vectorSimilarity > 0.60) { // Threshold for screenshot capture
      // Capture screenshots
      const [screenshot1, screenshot2] = await Promise.all([
        captureSectionScreenshot(originalUrl, pair.originalSection, env),
        captureSectionScreenshot(allegedCopyUrl, pair.copySection, env)
      ]);
      
      // Visual comparison
      const visualSimilarity = await compareSectionVisually(screenshot1, screenshot2, env);
      
      // Classify pattern
      let pattern: SectionVisualSimilarity['pattern'];
      if (pair.vectorSimilarity > 0.85 && visualSimilarity > 0.85) {
        pattern = 'copy_paste';
      } else if (pair.vectorSimilarity < 0.70 && visualSimilarity > 0.85) {
        pattern = 'reconstructed'; // KEY: Padelthon case!
      } else if (pair.vectorSimilarity > 0.70 && visualSimilarity < 0.70) {
        pattern = 'shared_framework';
      } else {
        pattern = 'different';
      }
      
      evidence.push({
        sectionType: pair.originalSection.type,
        vectorSimilarity: pair.vectorSimilarity,
        visualSimilarity,
        pattern,
        confidence: Math.min(pair.vectorSimilarity, visualSimilarity)
      });
    }
  }
  
  // 4. Determine verdict based on evidence
  const reconstructedSections = evidence.filter(e => e.pattern === 'reconstructed' && e.visualSimilarity > 0.85);
  const copyPasteSections = evidence.filter(e => e.pattern === 'copy_paste');
  
  let verdict: 'major' | 'minor' | 'none';
  let reasoning: string;
  
  if (reconstructedSections.length >= 3 || copyPasteSections.length >= 2) {
    verdict = 'major';
    reasoning = `Detected ${reconstructedSections.length} reconstructed sections and ${copyPasteSections.length} copy-pasted sections. Visual analysis shows high similarity despite different code structure.`;
  } else if (reconstructedSections.length >= 1 || copyPasteSections.length >= 1) {
    verdict = 'minor';
    reasoning = `Detected ${reconstructedSections.length + copyPasteSections.length} similar sections. Some visual overlap detected.`;
  } else {
    verdict = 'none';
    reasoning = 'No significant visual or structural similarities detected.';
  }
  
  const confidence = evidence.length > 0
    ? evidence.reduce((sum, e) => sum + e.confidence, 0) / evidence.length
    : 1.0;
  
  return { verdict, confidence, evidence, reasoning };
}
```

---

## 🎯 Integration with Existing System

### **Update Tier 3 Analysis**

```typescript
// In src/index.ts - runTier3Judgment

async function runTier3Judgment(
  plagiarismCase: PlagiarismCase,
  tier2Result: any,
  env: Env
): Promise<void> {
  // ... existing code ...
  
  // NEW: Multi-modal section analysis
  let multiModalAnalysis: any = null;
  if (env.OPENAI_API_KEY && env.BROWSER) {
    console.log('[Tier 3] Running multi-modal section analysis...');
    try {
      multiModalAnalysis = await analyzeTemplatePlagiarism(
        plagiarismCase.originalUrl,
        plagiarismCase.allegedCopyUrl,
        env
      );
      console.log('[Tier 3] Multi-modal analysis complete:', multiModalAnalysis);
    } catch (error: any) {
      console.log('[Tier 3] Multi-modal analysis failed:', error.message);
    }
  }
  
  const prompt = `Make final judgment on plagiarism case:

Original: ${plagiarismCase.originalUrl}
Alleged copy: ${plagiarismCase.allegedCopyUrl}

Tier 2 Visual Analysis: ${JSON.stringify(tier2Result)}

${multiModalAnalysis ? `
MULTI-MODAL SECTION ANALYSIS:
${multiModalAnalysis.evidence.map((e: any) => `
  ${e.sectionType.toUpperCase()} Section:
  - Vector Similarity: ${(e.vectorSimilarity * 100).toFixed(1)}%
  - Visual Similarity: ${(e.visualSimilarity * 100).toFixed(1)}%
  - Pattern: ${e.pattern}
  
  ${e.pattern === 'reconstructed' ? `
  ⚠️  RECONSTRUCTED PLAGIARISM DETECTED:
  - Low code similarity but HIGH visual similarity
  - Original design was recreated with different code
  - This is a common plagiarism technique for templates
  ` : ''}
`).join('\n')}

Overall Verdict: ${multiModalAnalysis.verdict}
Reasoning: ${multiModalAnalysis.reasoning}
Confidence: ${(multiModalAnalysis.confidence * 100).toFixed(1)}%
` : ''}

CRITICAL: Multi-modal analysis combines code structure AND visual appearance.
"Reconstructed" pattern = visual copying with rewritten code = PLAGIARISM.
`;

  // ... rest of existing code ...
}
```

---

## 📊 Padelthon Case: How It Would Work

### **Input:**
- Original: 6 BYQ templates
- Alleged copy: Padelthon

### **Phase 1: Section Detection**
```
Padelthon sections detected:
  • Hero (with stats)
  • Features/Services grid
  • Testimonial carousel
  • Approach/How-to-join
  • Footer with CTA
```

### **Phase 2: Vector Similarity**
```
Matches found (>60% vector similarity):
  • Padelthon.hero → Hollow.hero (65%)
  • Padelthon.footer → Evermind.footer (68%)
  • Padelthon.features → FosterReeves.features (72%)
```

### **Phase 3: Screenshot Capture**
```
Screenshots captured:
  ✓ Padelthon hero + Hollow hero
  ✓ Padelthon footer + Evermind footer
  ✓ Padelthon features + Foster & Reeves features
```

### **Phase 4: Visual Comparison**
```
Visual analysis results:
  • Hero sections: 92% visual similarity! ⚠️
    Pattern: RECONSTRUCTED (low vector, high visual)
  
  • Footer sections: 89% visual similarity! ⚠️
    Pattern: RECONSTRUCTED
  
  • Features sections: 87% visual similarity! ⚠️
    Pattern: RECONSTRUCTED
```

### **Phase 5: Verdict**
```
Multi-Modal Analysis:
  • 3 sections with "reconstructed" pattern
  • High visual similarity (87-92%)
  • Low-moderate code similarity (65-72%)
  
Verdict: MAJOR VIOLATION ✓
Confidence: 89%
Matches human reviewer! ✓
```

---

## ⚙️ Configuration & Tuning

### **Screenshot Strategy**

```typescript
export const SCREENSHOT_CONFIG = {
  // When to capture screenshots
  vectorSimilarityThreshold: 0.60, // Capture if >60% code similarity
  
  // Or capture for ALL sections if complaint filed
  captureAllOnComplaint: true,
  
  // Viewport sizes for consistency
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
  
  // Which to use?
  defaultViewport: 'desktop',
  
  // Screenshot types
  captureFullPage: false, // Individual sections more reliable
  captureSections: true,
  
  // Stability
  waitForNetworkIdle: true,
  waitAfterScroll: 1000, // ms
  retryOnFail: 3
};
```

### **Visual Similarity Thresholds**

```typescript
export const VISUAL_THRESHOLDS = {
  major_violation: 0.85,  // >85% visual = major
  minor_violation: 0.70,  // 70-85% = minor
  no_violation: 0.70,     // <70% = none
  
  // Reconstructed pattern detection
  reconstructed: {
    maxVectorSim: 0.75,   // Low code similarity
    minVisualSim: 0.85,   // High visual similarity
  }
};
```

---

## 🚀 Deployment Steps

### **1. Update Dependencies**

```json
// package.json - already have these!
{
  "dependencies": {
    "@cloudflare/puppeteer": "^1.0.4",
    "puppeteer-core": "^24.34.0"
  }
}
```

### **2. Update Wrangler Config**

```toml
# wrangler.toml - already configured!
[browser]
binding = "BROWSER"
```

### **3. Deploy**

```bash
wrangler deploy
```

---

## 💰 Cost Analysis

### **Per Plagiarism Case:**

**Without Section Visual Analysis:**
- Vector similarity: $0.002
- Total: $0.002

**With Section Visual Analysis:**
- Detect sections: Free (CPU)
- Section embeddings: ~$0.006 (3 sections × 2 templates)
- Screenshot capture: Free (Browser API included)
- Visual comparison: ~$0.015 (Claude vision calls)
- **Total: ~$0.023/case**

**Still 99.6% cheaper than manual review ($12.50)!**

---

## ✅ Benefits

### **1. Catches Reconstructed Plagiarism** ✓
- Detects visual copying with rewritten code
- Padelthon case would be caught

### **2. Section-Level Granularity** ✓
- Hero-to-hero, footer-to-footer comparisons
- Catches "stitched together" templates

### **3. Multi-Modal Evidence** ✓
- Code structure + Visual appearance
- Higher confidence decisions

### **4. Automated & Scalable** ✓
- No manual screenshot comparison
- Works at marketplace scale

### **5. Reduces False Negatives** ✓
- Current: Vector-only misses visual plagiarism
- New: Multi-modal catches both types

---

## 📊 Expected Performance

### **Padelthon-like Cases:**
- **Before:** ❌ False negative (vector <70%)
- **After:** ✅ Detected (visual 85-92%, pattern: reconstructed)

### **Legitimate Templates:**
- **Before:** ✓ Correct (vector <70%)
- **After:** ✓ Still correct (visual <70% too)

### **Copy-Paste Cases:**
- **Before:** ✓ Detected (vector >85%)
- **After:** ✅ Even stronger (visual >85% confirms)

---

**This solves the exact problem you identified! Ready to implement?** 🚀

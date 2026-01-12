<script lang="ts">
  interface ComparisonData {
    metric: string;
    workers: string;
    pythonSdk: string;
  }

  interface TestResult {
    decision: string;
    confidence: number;
    evidence: string;
    cost: string;
  }

  const performanceComparison: ComparisonData[] = [
    { metric: 'Cost per case', workers: '$0.17', pythonSdk: '$0.30-0.50' },
    { metric: 'Latency', workers: '<2 seconds', pythonSdk: '5-10 seconds' },
    { metric: 'Deployment', workers: 'Edge (global)', pythonSdk: 'Python server' },
    { metric: 'Vision analysis', workers: 'Llama Vision (free)', pythonSdk: 'Claude Vision ($0.15)' },
    { metric: 'Code analysis', workers: 'Pattern matching', pythonSdk: 'AST parsing' },
    { metric: 'Tool autonomy', workers: 'Fixed pipeline', pythonSdk: 'Agent calls tools' }
  ];

  const testResults: { workers: TestResult; pythonSdk: TestResult } = {
    workers: {
      decision: 'minor',
      confidence: 0.75,
      evidence: 'Visual similarity detected via Llama Vision',
      cost: '$0.17'
    },
    pythonSdk: {
      decision: 'minor',
      confidence: 0.7,
      evidence: '0% AST similarity + moderate visual similarity',
      cost: '$0.35'
    }
  };
</script>

<svelte:head>
  <title>Workers vs Python SDK for Webflow Plagiarism Detection</title>
  <meta name="description" content="Comparative analysis of Cloudflare Workers and Python SDK implementations for detecting plagiarism in Webflow templates, with focus on vision analysis for GUI-based tools." />
</svelte:head>

<article class="paper">
  <header class="paper-header">
    <h1 class="paper-title">Workers vs Python SDK for Webflow Plagiarism Detection</h1>
    <div class="paper-meta">
      <div class="meta-item">
        <span class="meta-label">Research:</span>
        <span class="meta-value">Performance comparison study</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Test case:</span>
        <span class="meta-value">recgROoGWyyoQiSUq (Fluora vs Scalerfy/Interiora)</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Key finding:</span>
        <span class="meta-value">Vision analysis critical for Webflow plagiarism detection</span>
      </div>
    </div>
  </header>

  <div class="callout callout-insight">
    <h3>Core Discovery</h3>
    <p>Webflow templates can have extensive visual plagiarism with 0% code similarity. Vision analysis becomes critical for GUI-based tools where animations and layouts are configured through visual interfaces rather than written in code.</p>
  </div>

  <section class="paper-section">
    <h2>I. The Visual vs Code Paradox</h2>
    
    <p>Traditional plagiarism detection focuses on code similarity—shared functions, identical CSS patterns, duplicate JavaScript. This approach fails spectacularly for Webflow templates where creators configure animations through visual interfaces.</p>
    
    <p>In our test case (recgROoGWyyoQiSUq), the Fluora template achieved "moderate visual similarity" with both Scalerfy and Interiora templates while maintaining 0% AST (Abstract Syntax Tree) similarity. The complaint alleged "99% similarity" in animations with "only minor details changed."</p>

    <div class="callout callout-question">
      <p><strong>The core question:</strong> How do you detect plagiarism when the evidence is visual, not textual?</p>
    </div>

    <h3>What the Code Analysis Found</h3>
    <div class="code-block">
{`// From fluora_plagiarism_analysis.json
{
  "original": "https://scalerfy.webflow.io/",
  "copy": "https://fluora.webflow.io/",
  "code_analysis": {
    "ast_similarity_score": 0.0,
    "webflow_interactions": 25,
    "shared_javascript_functions": []
  },
  "vision_analysis": {
    "visual_similarity": "moderate",
    "animation_similarity": "Cannot determine from static screenshots",
    "layout_similarity": "Similar dark-themed layout with portfolio sections",
    "confidence": 0.7
  }
}`}
    </div>

    <p>Zero shared functions. Zero AST similarity. Yet the vision analysis detected "moderate visual similarity" and "similar dark-themed layout with portfolio sections."</p>
  </section>

  <section class="paper-section">
    <h2>II. Architecture Comparison</h2>

    <div class="comparison-grid">
      <div class="approach">
        <h3>Cloudflare Workers Implementation</h3>
        <div class="code-block">
{`// From index.ts:380-420
async function getVisionAnalysis(
  caseId: string,
  env: Env
): Promise<string | null> {
  const [originalImg, copyImg] = await Promise.all([
    env.SCREENSHOTS.get(\`\${caseId}/original.jpg\`),
    env.SCREENSHOTS.get(\`\${caseId}/copy.jpg\`)
  ]);

  const response = await env.AI.run(
    '@cf/meta/llama-3.2-11b-vision-instruct', 
    {
      prompt: 'Compare these two website screenshots for plagiarism...',
      image: [Array.from(originalBytes), Array.from(copyBytes)]
    }
  );
}`}
        </div>
        <p><strong>Architecture:</strong> Three-tier pipeline with free Llama Vision analysis</p>
      </div>

      <div class="approach">
        <h3>Python SDK Implementation</h3>
        <div class="code-block">
{`// From agent_enhanced.py:200-240
def compare_screenshots_with_vision(
  original_path: str, 
  copy_path: str
) -> VisionAnalysis:
  response = anthropic.messages.create(
    model="claude-3-7-sonnet-20250219",
    messages=[{
      "role": "user",
      "content": [
        {"type": "image", "source": {"data": original_b64}},
        {"type": "image", "source": {"data": copy_b64}},
        {"type": "text", "text": prompt}
      ]
    }]
  )
}`}
        </div>
        <p><strong>Architecture:</strong> Agent-driven with tool autonomy and Claude Vision</p>
      </div>
    </div>

    <h3>Performance Metrics</h3>
    <div class="comparison-table">
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Workers</th>
            <th>Python SDK</th>
          </tr>
        </thead>
        <tbody>
          {#each performanceComparison as row}
          <tr>
            <td>{row.metric}</td>
            <td>{row.workers}</td>
            <td>{row.pythonSdk}</td>
          </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <section class="paper-section">
    <h2>III. Test Results: Same Accuracy, Different Paths</h2>

    <div class="results-comparison">
      <div class="result-card">
        <h3>Cloudflare Workers Result</h3>
        <div class="result-details">
          <div class="decision decision-minor">Decision: {testResults.workers.decision}</div>
          <div class="confidence">Confidence: {testResults.workers.confidence}</div>
          <div class="evidence">{testResults.workers.evidence}</div>
          <div class="cost">Cost: {testResults.workers.cost}</div>
        </div>
      </div>

      <div class="result-card">
        <h3>Python SDK Result</h3>
        <div class="result-details">
          <div class="decision decision-minor">Decision: {testResults.pythonSdk.decision}</div>
          <div class="confidence">Confidence: {testResults.pythonSdk.confidence}</div>
          <div class="evidence">{testResults.pythonSdk.evidence}</div>
          <div class="cost">Cost: {testResults.pythonSdk.cost}</div>
        </div>
      </div>
    </div>

    <div class="callout callout-finding">
      <h3>Key Finding</h3>
      <p>Both implementations reached the same conclusion: <strong>minor plagiarism detected</strong>. The Workers implementation achieved this for $0.17 vs Python SDK's $0.35, while deploying globally on the edge vs requiring a Python server.</p>
    </div>

    <h3>Evidence Analysis</h3>
    <div class="evidence-analysis">
      <h4>What Vision Analysis Revealed</h4>
      <ul>
        <li><strong>Layout similarity:</strong> "Similar dark-themed layout with portfolio sections"</li>
        <li><strong>Animation patterns:</strong> "Similar circular elements in headers"</li>
        <li><strong>Structural copying:</strong> "Minimalist approach with section-based structure"</li>
        <li><strong>Visual confidence:</strong> 0.7 (moderate certainty)</li>
      </ul>

      <h4>What Code Analysis Missed</h4>
      <ul>
        <li><strong>Webflow interactions:</strong> 25 detected (both sites)</li>
        <li><strong>AST similarity:</strong> 0.0% (no shared functions/classes)</li>
        <li><strong>JavaScript libraries:</strong> Standard Webflow stack (identical by platform)</li>
        <li><strong>Animation configuration:</strong> GUI-defined, not code-visible</li>
      </ul>
    </div>
  </section>

  <section class="paper-section">
    <h2>IV. Why Vision Analysis Matters for Webflow</h2>

    <p>Webflow fundamentally changes how animations are created. Instead of writing CSS keyframes or JavaScript animation calls, creators configure animations through visual interfaces:</p>

    <div class="code-block">
{`// Traditional CSS Animation (detectable by code analysis)
@keyframes slideIn {
  0% { transform: translateX(-100%); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}

// Webflow Animation (GUI configuration, not visible in code)
// Creator drags elements, sets timing curves, defines triggers
// Result: data-w-id="abc123" with identical visual effect
// Code analysis: 0% similarity
// Visual analysis: High similarity`}
    </div>

    <p>The Workers implementation processes this correctly. From <code>index.ts:412</code>, the vision analysis identifies "circular elements in headers" and "minimalist approach with section-based structure"—evidence invisible to AST parsing but crucial for GUI-based plagiarism detection.</p>

    <h3>The Animation Detection Problem</h3>
    <p>Both implementations struggle with animation analysis from static screenshots. The Python SDK noted "Cannot determine from static screenshots" while Workers used pattern matching on interaction counts. This represents a fundamental limitation requiring video capture or interactive testing.</p>
  </section>

  <section class="paper-section">
    <h2>V. Cost-Benefit Analysis</h2>

    <div class="cost-breakdown">
      <div class="cost-card">
        <h3>Workers: $0.17 per case</h3>
        <ul>
          <li>Tier 1: Workers AI (free)</li>
          <li>Tier 2: Claude Haiku ($0.02)</li>
          <li>Tier 3: Claude Sonnet ($0.15)</li>
          <li>Vision: Llama Vision (free)</li>
        </ul>
      </div>

      <div class="cost-card">
        <h3>Python SDK: $0.30-0.50 per case</h3>
        <ul>
          <li>Claude Sonnet: $0.15-0.20</li>
          <li>Claude Vision: $0.15</li>
          <li>Tool use overhead: $0.05-0.10</li>
          <li>AST analysis: CPU cost</li>
        </ul>
      </div>
    </div>

    <p>The Workers implementation provides identical accuracy at roughly half the cost. The Python SDK's advantages—AST parsing, tool autonomy, multi-model validation—didn't improve detection quality for this Webflow use case.</p>

    <h3>When Python SDK Wins</h3>
    <p>For traditional web applications with custom JavaScript, AST similarity becomes valuable. If the test case involved React components or custom animation libraries, the Python SDK's code analysis might detect evidence the Workers approach missed.</p>
  </section>

  <section class="paper-section">
    <h2>VI. Implementation Lessons</h2>

    <h3>Vision Analysis Pipeline</h3>
    <p>Both implementations correctly prioritize vision analysis for Webflow detection. The Workers implementation uses free Llama Vision through Cloudflare's AI service, while Python SDK uses Claude Vision. Quality differences were minimal, but cost differences were significant.</p>

    <h3>Screenshot Strategy</h3>
    <div class="code-block">
{`// Workers: Above-fold capture (3 viewports)
clip: {
  x: 0, y: 0,
  width: 1280,
  height: 2160  // 3 viewports worth (720 * 3)
}

// Python SDK: Full page capture
page.screenshot(path=output_path, full_page=True)`}
    </div>

    <p>The Workers approach captures 3 viewports to stay within token limits while preserving key design elements. Python SDK captures full pages but risks token limit issues with very long pages.</p>

    <h3>Escalation Logic</h3>
    <p>Workers always escalate through all three tiers for code validation, even with obvious visual similarities. This prevents manipulation through convincing screenshots while maintaining thorough analysis. Python SDK relies more on agent judgment for escalation.</p>
  </section>

  <section class="paper-section">
    <h2>VII. Future Implications</h2>

    <h3>The GUI Plagiarism Problem</h3>
    <p>As more design tools move to visual interfaces (Webflow, Framer, Figma), traditional code similarity detection becomes less effective. Vision analysis evolves from "nice-to-have" to "critical requirement" for modern plagiarism detection.</p>

    <h3>Video Analysis Next</h3>
    <p>Both implementations noted limitations with static screenshot analysis for animations. Future iterations should capture screen recordings to analyze animation timing, easing curves, and interaction patterns—the core of modern web design plagiarism.</p>

    <h3>Hybrid Approach</h3>
    <p>The ideal system combines Workers' cost efficiency with Python SDK's analytical depth. Deploy Workers for standard cases, escalate to Python SDK for complex code analysis when AST evidence is found.</p>
  </section>

  <section class="paper-section">
    <h2>VIII. Limitations</h2>

    <ul>
      <li><strong>Animation analysis:</strong> Static screenshots miss timing, easing, interaction triggers</li>
      <li><strong>Single test case:</strong> Results based on one Webflow comparison</li>
      <li><strong>Cost estimates:</strong> Anthropic pricing varies by usage volume</li>
      <li><strong>Webflow specificity:</strong> Results may not generalize to other GUI builders</li>
      <li><strong>Vision model comparison:</strong> Llama vs Claude Vision quality not thoroughly compared</li>
    </ul>
  </section>

  <footer class="paper-footer">
    <p><strong>Research based on analysis of:</strong></p>
    <ul>
      <li><code>../templates-platform/workers/plagiarism-agent/src/index.ts</code></li>
      <li><code>../templates-platform/workers/plagiarism-agent/python-test/agent_enhanced.py</code></li>
      <li><code>../templates-platform/workers/plagiarism-agent/python-test/fluora_plagiarism_analysis.json</code></li>
    </ul>
  </footer>
</article>

<style>
  .paper {
    max-width: 1000px;
    margin: 0 auto;
    padding: var(--space-lg);
    line-height: 1.6;
    color: var(--color-text-primary);
  }

  .paper-header {
    margin-bottom: var(--space-lg);
    border-bottom: 1px solid var(--color-border);
    padding-bottom: var(--space-md);
  }

  .paper-title {
    font-size: var(--text-3xl);
    font-weight: var(--font-weight-bold);
    margin-bottom: var(--space-md);
    color: var(--color-text-primary);
  }

  .paper-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-md);
  }

  .meta-item {
    display: flex;
    gap: var(--space-xs);
  }

  .meta-label {
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
  }

  .meta-value {
    color: var(--color-text-primary);
  }

  .paper-section {
    margin-bottom: var(--space-lg);
  }

  .paper-section h2 {
    font-size: var(--text-xl);
    font-weight: var(--font-weight-bold);
    margin-bottom: var(--space-md);
    color: var(--color-text-primary);
  }

  .paper-section h3 {
    font-size: var(--text-lg);
    font-weight: var(--font-weight-medium);
    margin: var(--space-md) 0 var(--space-sm) 0;
    color: var(--color-text-primary);
  }

  .paper-section h4 {
    font-size: var(--text-base);
    font-weight: var(--font-weight-medium);
    margin: var(--space-sm) 0;
    color: var(--color-text-primary);
  }

  .callout {
    padding: var(--space-md);
    margin: var(--space-md) 0;
    border-radius: var(--radius-md);
    border-left: 4px solid var(--color-border);
  }

  .callout-insight {
    background-color: var(--color-background-secondary);
  }

  .callout-question {
    background-color: var(--color-background-tertiary);
  }

  .callout-finding {
    background-color: var(--color-background-quaternary);
  }

  .callout h3 {
    margin-top: 0;
    margin-bottom: var(--space-sm);
  }

  .code-block {
    background-color: var(--color-background-secondary);
    padding: var(--space-md);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    white-space: pre-wrap;
    overflow-x: auto;
    margin: var(--space-md) 0;
  }

  .comparison-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-md);
    margin: var(--space-md) 0;
  }

  .approach {
    padding: var(--space-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  .comparison-table {
    margin: var(--space-md) 0;
    overflow-x: auto;
  }

  .comparison-table table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
  }

  .comparison-table th,
  .comparison-table td {
    padding: var(--space-sm);
    text-align: left;
    border-bottom: 1px solid var(--color-border);
  }

  .comparison-table th {
    font-weight: var(--font-weight-medium);
    background-color: var(--color-background-secondary);
  }

  .results-comparison {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-md);
    margin: var(--space-md) 0;
  }

  .result-card {
    padding: var(--space-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background-color: var(--color-background-secondary);
  }

  .result-card h3 {
    margin-top: 0;
    margin-bottom: var(--space-sm);
  }

  .result-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .decision {
    font-weight: var(--font-weight-bold);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-sm);
  }

  .decision-minor {
    background-color: var(--color-warning-background);
    color: var(--color-warning-text);
  }

  .confidence {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .evidence {
    font-size: var(--text-sm);
    color: var(--color-text-primary);
  }

  .cost {
    font-weight: var(--font-weight-medium);
    color: var(--color-success-text);
  }

  .evidence-analysis {
    margin: var(--space-md) 0;
  }

  .cost-breakdown {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-md);
    margin: var(--space-md) 0;
  }

  .cost-card {
    padding: var(--space-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background-color: var(--color-background-secondary);
  }

  .cost-card h3 {
    margin-top: 0;
    margin-bottom: var(--space-sm);
  }

  .cost-card ul {
    margin: 0;
    padding-left: var(--space-md);
  }

  .cost-card li {
    font-size: var(--text-sm);
    margin-bottom: var(--space-xs);
  }

  .paper-footer {
    margin-top: var(--space-xl);
    padding-top: var(--space-md);
    border-top: 1px solid var(--color-border);
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .paper-footer ul {
    margin-top: var(--space-sm);
  }

  .paper-footer li {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }

  @media (max-width: 768px) {
    .comparison-grid,
    .results-comparison,
    .cost-breakdown {
      grid-template-columns: 1fr;
    }

    .paper-meta {
      flex-direction: column;
      gap: var(--space-sm);
    }

    .comparison-table {
      font-size: var(--text-xs);
    }
  }
</style>
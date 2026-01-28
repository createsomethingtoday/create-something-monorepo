<script lang="ts">
  import { Upload, Play, AlertTriangle, CheckCircle, Loader2, FileJson, Grid3X3, BarChart3, AlertCircle } from 'lucide-svelte';
  
  const API_URL = 'https://webflow-apps-audit-agent.createsomething.workers.dev';
  
  // Types
  interface WebflowApp {
    name: string;
    slug: string;
    clientId: string;
    workspaceId: string;
    error: string | null;
    editUrl: string;
  }
  
  interface CategorizedApp extends WebflowApp {
    category: string;
    confidence: number;
    reasoning: string;
  }
  
  interface Issue {
    appSlug: string;
    appName: string;
    type: 'archived' | 'test' | 'duplicate-client-id' | 'naming-anomaly';
    severity: 'low' | 'medium' | 'high';
    description: string;
  }
  
  interface AuditReport {
    id: string;
    generatedAt: string;
    inputSummary: { totalApps: number; duplicateGroups: number };
    categories: Record<string, CategorizedApp[]>;
    categoryCounts: Record<string, number>;
    issues: Issue[];
    issueCounts: Record<string, number>;
    processingTimeMs: number;
  }
  
  // State
  let auditData = $state<any>(null);
  let report = $state<AuditReport | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let progress = $state({ current: 0, total: 0, status: '' });
  let activeTab = $state<'categories' | 'issues'>('categories');
  let selectedCategory = $state<string | null>(null);
  
  // File upload handler
  async function handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      auditData = JSON.parse(text);
      error = null;
    } catch (e) {
      error = 'Failed to parse JSON file';
      auditData = null;
    }
  }
  
  // Run analysis
  async function runAnalysis() {
    if (!auditData) return;
    
    loading = true;
    error = null;
    progress = { current: 0, total: auditData.allApps?.length || 0, status: 'Starting analysis...' };
    
    try {
      progress.status = 'Sending data to Workers AI...';
      
      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auditData)
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Analysis failed');
      }
      
      report = result.report;
      progress.status = 'Complete!';
    } catch (e) {
      error = e instanceof Error ? e.message : 'Analysis failed';
    } finally {
      loading = false;
    }
  }
  
  // Category display names
  const categoryLabels: Record<string, string> = {
    'integration': 'Integration',
    'analytics': 'Analytics',
    'forms-data': 'Forms & Data',
    'ai-automation': 'AI & Automation',
    'developer-tools': 'Developer Tools',
    'ecommerce': 'E-Commerce',
    'marketing': 'Marketing',
    'localization': 'Localization',
    'accessibility': 'Accessibility',
    'other': 'Other'
  };
  
  // Issue type labels
  const issueLabels: Record<string, string> = {
    'archived': 'Archived Apps',
    'test': 'Test/Dev Apps',
    'duplicate-client-id': 'Duplicate Client IDs',
    'naming-anomaly': 'Naming Issues'
  };
  
  // Get color class for category
  function getCategoryClass(cat: string): string {
    return `category-${cat}`;
  }
  
  // Format processing time
  function formatTime(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }
</script>

<svelte:head>
  <title>Webflow Apps Audit Agent</title>
</svelte:head>

<div class="dashboard">
  <!-- Hero Section -->
  <section class="hero">
    <h1 class="hero-title">Webflow Apps Audit</h1>
    <p class="hero-subtitle">
      AI-powered categorization and issue detection using Cloudflare Workers AI
    </p>
  </section>
  
  <!-- Upload Section -->
  {#if !report}
    <section class="upload-section glass-card" style="--index: 0">
      <div class="upload-header">
        <FileJson size={24} class="upload-icon" />
        <div>
          <h2 class="section-title">Upload Audit Data</h2>
          <p class="section-desc">Upload the webflow-apps-audit JSON file to analyze</p>
        </div>
      </div>
      
      <div class="upload-area">
        <label class="upload-dropzone" class:has-file={auditData}>
          <input 
            type="file" 
            accept=".json"
            onchange={handleFileUpload}
            class="sr-only"
          />
          {#if auditData}
            <CheckCircle size={32} class="upload-check" />
            <span class="upload-status">
              {auditData.allApps?.length || 0} apps loaded
            </span>
            <span class="upload-hint">
              {auditData.duplicateClientIds?.length || 0} duplicate groups detected
            </span>
          {:else}
            <Upload size={32} />
            <span class="upload-status">Drop JSON file or click to browse</span>
            <span class="upload-hint">webflow-apps-audit-*.json</span>
          {/if}
        </label>
      </div>
      
      {#if error}
        <div class="error-banner">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      {/if}
      
      <button 
        class="analyze-btn"
        disabled={!auditData || loading}
        onclick={runAnalysis}
      >
        {#if loading}
          <Loader2 size={18} class="spin" />
          <span>Analyzing...</span>
        {:else}
          <Play size={18} />
          <span>Run Analysis</span>
        {/if}
      </button>
      
      {#if loading}
        <div class="progress-section">
          <div class="progress-text">{progress.status}</div>
          <div class="progress-track">
            <div class="progress-bar"></div>
          </div>
        </div>
      {/if}
    </section>
  {/if}
  
  <!-- Results Section -->
  {#if report}
    <!-- Summary Cards -->
    <section class="summary-grid">
      <div class="summary-card stagger-enter" style="--index: 0">
        <div class="summary-label">Apps Analyzed</div>
        <div class="summary-value">{Object.values(report.categoryCounts).reduce((a, b) => a + b, 0)}</div>
        <div class="summary-meta">of {report.inputSummary.totalApps} total</div>
      </div>
      
      <div class="summary-card stagger-enter" style="--index: 1">
        <div class="summary-label">Categories</div>
        <div class="summary-value">{Object.keys(report.categoryCounts).filter(k => report.categoryCounts[k] > 0).length}</div>
        <div class="summary-meta">distinct types</div>
      </div>
      
      <div class="summary-card stagger-enter" style="--index: 2">
        <div class="summary-label">Issues Found</div>
        <div class="summary-value">{report.issues.length}</div>
        <div class="summary-meta">{report.issues.filter(i => i.severity === 'high').length} high severity</div>
      </div>
      
      <div class="summary-card stagger-enter" style="--index: 3">
        <div class="summary-label">Processing Time</div>
        <div class="summary-value">{formatTime(report.processingTimeMs)}</div>
        <div class="summary-meta">via Workers AI</div>
      </div>
    </section>
    
    <!-- Tab Navigation -->
    <div class="tabs">
      <button 
        class="tab" 
        class:active={activeTab === 'categories'}
        onclick={() => activeTab = 'categories'}
      >
        <Grid3X3 size={16} />
        <span>Categories</span>
      </button>
      <button 
        class="tab"
        class:active={activeTab === 'issues'}
        onclick={() => activeTab = 'issues'}
      >
        <AlertCircle size={16} />
        <span>Issues ({report.issues.length})</span>
      </button>
    </div>
    
    <!-- Categories View -->
    {#if activeTab === 'categories'}
      <section class="categories-section">
        <!-- Category Cards -->
        <div class="category-grid">
          {#each Object.entries(report.categoryCounts) as [category, count], i}
            {#if count > 0}
              <button 
                class="category-card stagger-enter {getCategoryClass(category)}"
                class:selected={selectedCategory === category}
                style="--index: {i}"
                onclick={() => selectedCategory = selectedCategory === category ? null : category}
              >
                <div class="category-dot"></div>
                <div class="category-info">
                  <span class="category-name">{categoryLabels[category] || category}</span>
                  <span class="category-count">{count} apps</span>
                </div>
              </button>
            {/if}
          {/each}
        </div>
        
        <!-- Selected Category Apps -->
        {#if selectedCategory && report.categories[selectedCategory]}
          <div class="apps-list stagger-enter" style="--index: 0">
            <h3 class="apps-list-title">{categoryLabels[selectedCategory]} Apps</h3>
            <div class="apps-table">
              <div class="table-header">
                <span>App Name</span>
                <span>Confidence</span>
                <span>Reasoning</span>
              </div>
              {#each report.categories[selectedCategory] as app, i}
                <div class="table-row stagger-enter" style="--index: {i}">
                  <div class="app-name">
                    <a href={app.editUrl} target="_blank" rel="noopener">{app.name}</a>
                  </div>
                  <div class="confidence">
                    <div class="confidence-bar" style="--width: {app.confidence * 100}%"></div>
                    <span>{Math.round(app.confidence * 100)}%</span>
                  </div>
                  <div class="reasoning">{app.reasoning}</div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </section>
    {/if}
    
    <!-- Issues View -->
    {#if activeTab === 'issues'}
      <section class="issues-section">
        <!-- Issue Summary -->
        <div class="issue-summary">
          {#each Object.entries(report.issueCounts) as [type, count], i}
            <div class="issue-type-card stagger-enter" style="--index: {i}">
              <span class="issue-type-label">{issueLabels[type] || type}</span>
              <span class="issue-type-count">{count}</span>
            </div>
          {/each}
        </div>
        
        <!-- Issues Table -->
        <div class="issues-table">
          <div class="table-header">
            <span>App Name</span>
            <span>Issue Type</span>
            <span>Severity</span>
            <span>Description</span>
          </div>
          {#each report.issues.slice(0, 50) as issue, i}
            <div class="table-row stagger-enter" style="--index: {i}">
              <div class="app-name">{issue.appName}</div>
              <div class="issue-type">{issueLabels[issue.type] || issue.type}</div>
              <div class="severity">
                <span class="severity-badge severity-{issue.severity}">
                  {issue.severity}
                </span>
              </div>
              <div class="description">{issue.description}</div>
            </div>
          {/each}
        </div>
        
        {#if report.issues.length > 50}
          <p class="truncation-note">Showing first 50 of {report.issues.length} issues</p>
        {/if}
      </section>
    {/if}
    
    <!-- New Analysis Button -->
    <div class="new-analysis">
      <button class="reset-btn" onclick={() => { report = null; auditData = null; }}>
        <Upload size={16} />
        <span>New Analysis</span>
      </button>
    </div>
  {/if}
</div>

<style>
  .dashboard {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }
  
  /* Hero */
  .hero {
    text-align: center;
    padding: var(--space-xl) 0;
  }
  
  .hero-title {
    font-size: var(--text-display);
    font-weight: 700;
    color: var(--color-fg-primary);
    margin-bottom: var(--space-xs);
  }
  
  .hero-subtitle {
    font-size: var(--text-body-lg);
    color: var(--color-fg-tertiary);
  }
  
  /* Upload Section */
  .upload-section {
    padding: var(--space-lg);
    border-radius: var(--radius-xl);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
  }
  
  .upload-header {
    display: flex;
    align-items: flex-start;
    gap: var(--space-sm);
    margin-bottom: var(--space-md);
  }
  
  .upload-header :global(svg) {
    color: var(--color-fg-tertiary);
    flex-shrink: 0;
    margin-top: 2px;
  }
  
  .section-title {
    font-size: var(--text-h2);
    font-weight: 600;
    color: var(--color-fg-primary);
    margin-bottom: 0.25rem;
  }
  
  .section-desc {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }
  
  .upload-area {
    margin-bottom: var(--space-md);
  }
  
  .upload-dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: var(--space-xl) var(--space-md);
    border: 2px dashed var(--color-border-emphasis);
    border-radius: var(--radius-lg);
    background: var(--color-bg-subtle);
    cursor: pointer;
    transition: all var(--duration-micro) var(--ease-standard);
  }
  
  .upload-dropzone:hover {
    border-color: var(--color-border-strong);
    background: var(--color-hover);
  }
  
  .upload-dropzone.has-file {
    border-color: var(--color-success-border);
    background: var(--color-success-muted);
  }
  
  .upload-dropzone :global(svg) {
    color: var(--color-fg-muted);
  }
  
  .upload-dropzone.has-file :global(svg) {
    color: var(--color-success);
  }
  
  .upload-status {
    font-size: var(--text-body);
    color: var(--color-fg-secondary);
  }
  
  .upload-hint {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }
  
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }
  
  .error-banner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: var(--color-error-muted);
    border: 1px solid var(--color-error-border);
    border-radius: var(--radius-md);
    color: var(--color-error);
    font-size: var(--text-body-sm);
    margin-bottom: var(--space-md);
  }
  
  .analyze-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.875rem 1.5rem;
    background: var(--color-fg-primary);
    color: var(--color-bg-pure);
    border: none;
    border-radius: var(--radius-lg);
    font-size: var(--text-body);
    font-weight: 600;
    cursor: pointer;
    transition: all var(--duration-micro) var(--ease-standard);
  }
  
  .analyze-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }
  
  .analyze-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .progress-section {
    margin-top: var(--space-md);
  }
  
  .progress-text {
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
    margin-bottom: 0.5rem;
  }
  
  .progress-track {
    height: 4px;
    background: var(--color-bg-subtle);
    border-radius: var(--radius-full);
    overflow: hidden;
  }
  
  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--color-data-1), var(--color-data-3));
    width: 100%;
    transform-origin: left;
    animation: progress-pulse 1.5s ease-in-out infinite;
  }
  
  /* Summary Grid */
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: var(--space-sm);
  }
  
  .summary-card {
    padding: var(--space-md);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    transition: all var(--duration-micro) var(--ease-standard);
  }
  
  .summary-card:hover {
    border-color: var(--color-border-emphasis);
  }
  
  .summary-label {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.25rem;
  }
  
  .summary-value {
    font-size: var(--text-h1);
    font-weight: 700;
    color: var(--color-fg-primary);
    line-height: 1.2;
  }
  
  .summary-meta {
    font-size: var(--text-caption);
    color: var(--color-fg-tertiary);
    margin-top: 0.25rem;
  }
  
  /* Tabs */
  .tabs {
    display: flex;
    gap: 0.5rem;
    padding: 0.25rem;
    background: var(--color-bg-subtle);
    border-radius: var(--radius-lg);
    width: fit-content;
  }
  
  .tab {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    color: var(--color-fg-tertiary);
    font-size: var(--text-body-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--duration-micro) var(--ease-standard);
  }
  
  .tab:hover {
    color: var(--color-fg-secondary);
  }
  
  .tab.active {
    background: var(--color-bg-surface);
    color: var(--color-fg-primary);
    box-shadow: var(--shadow-sm);
  }
  
  /* Categories */
  .category-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--space-sm);
  }
  
  .category-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    cursor: pointer;
    text-align: left;
    transition: all var(--duration-micro) var(--ease-standard);
  }
  
  .category-card:hover {
    border-color: var(--color-border-emphasis);
    transform: translateY(-2px);
  }
  
  .category-card.selected {
    border-color: var(--category-color, var(--color-border-strong));
    background: color-mix(in srgb, var(--category-color, var(--color-fg-muted)) 10%, transparent);
  }
  
  .category-dot {
    width: 12px;
    height: 12px;
    border-radius: var(--radius-full);
    background: var(--category-color, var(--color-fg-muted));
    flex-shrink: 0;
  }
  
  .category-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }
  
  .category-name {
    font-size: var(--text-body);
    font-weight: 500;
    color: var(--color-fg-primary);
  }
  
  .category-count {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }
  
  /* Apps List */
  .apps-list {
    margin-top: var(--space-lg);
  }
  
  .apps-list-title {
    font-size: var(--text-h3);
    font-weight: 600;
    color: var(--color-fg-primary);
    margin-bottom: var(--space-sm);
  }
  
  .apps-table,
  .issues-table {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }
  
  .table-header {
    display: grid;
    grid-template-columns: 1.5fr 0.75fr 2fr;
    gap: 1rem;
    padding: 0.75rem 1rem;
    background: var(--color-bg-subtle);
    border-bottom: 1px solid var(--color-border-default);
    font-size: var(--text-caption);
    font-weight: 600;
    color: var(--color-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .issues-table .table-header {
    grid-template-columns: 1.5fr 1fr 0.75fr 2fr;
  }
  
  .table-row {
    display: grid;
    grid-template-columns: 1.5fr 0.75fr 2fr;
    gap: 1rem;
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--color-border-default);
    align-items: center;
    transition: background var(--duration-micro) var(--ease-standard);
  }
  
  .issues-table .table-row {
    grid-template-columns: 1.5fr 1fr 0.75fr 2fr;
  }
  
  .table-row:last-child {
    border-bottom: none;
  }
  
  .table-row:hover {
    background: var(--color-hover);
  }
  
  .app-name {
    font-size: var(--text-body-sm);
    font-weight: 500;
    color: var(--color-fg-primary);
  }
  
  .app-name a {
    color: inherit;
    text-decoration: none;
    transition: color var(--duration-micro) var(--ease-standard);
  }
  
  .app-name a:hover {
    color: var(--color-data-1);
  }
  
  .confidence {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: var(--text-caption);
    color: var(--color-fg-secondary);
  }
  
  .confidence-bar {
    width: 50px;
    height: 4px;
    background: var(--color-bg-subtle);
    border-radius: var(--radius-full);
    overflow: hidden;
    position: relative;
  }
  
  .confidence-bar::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: var(--width, 0%);
    background: var(--color-success);
    border-radius: var(--radius-full);
  }
  
  .reasoning {
    font-size: var(--text-caption);
    color: var(--color-fg-tertiary);
    line-height: 1.4;
  }
  
  /* Issues */
  .issue-summary {
    display: flex;
    gap: var(--space-sm);
    flex-wrap: wrap;
    margin-bottom: var(--space-md);
  }
  
  .issue-type-card {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
  }
  
  .issue-type-label {
    font-size: var(--text-caption);
    color: var(--color-fg-tertiary);
  }
  
  .issue-type-count {
    font-size: var(--text-body);
    font-weight: 600;
    color: var(--color-fg-primary);
  }
  
  .issue-type {
    font-size: var(--text-caption);
    color: var(--color-fg-tertiary);
  }
  
  .severity-badge {
    display: inline-flex;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
    font-size: var(--text-caption);
    font-weight: 500;
    text-transform: capitalize;
  }
  
  .description {
    font-size: var(--text-caption);
    color: var(--color-fg-tertiary);
    line-height: 1.4;
  }
  
  .truncation-note {
    text-align: center;
    padding: var(--space-sm);
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }
  
  /* New Analysis */
  .new-analysis {
    display: flex;
    justify-content: center;
    padding-top: var(--space-md);
  }
  
  .reset-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: transparent;
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--duration-micro) var(--ease-standard);
  }
  
  .reset-btn:hover {
    border-color: var(--color-border-emphasis);
    background: var(--color-hover);
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .table-header,
    .table-row {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .issues-table .table-header,
    .issues-table .table-row {
      display: flex;
      flex-direction: column;
    }
    
    .table-header {
      display: none;
    }
    
    .table-row {
      padding: 1rem;
    }
    
    .summary-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>

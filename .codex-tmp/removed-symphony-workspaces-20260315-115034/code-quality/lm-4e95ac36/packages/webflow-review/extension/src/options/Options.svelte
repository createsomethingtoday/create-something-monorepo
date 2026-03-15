<script lang="ts">
  import { onMount } from 'svelte';

  let apiUrl = '';
  let apiKey = '';
  let enabledChecks = {
    seo: true,
    links: true,
    a11y: false,
    performance: false,
  };
  let autoReview = true;

  let saveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  let errorMessage = '';

  onMount(async () => {
    // Load settings
    const response = await chrome.runtime.sendMessage({ action: 'getSettings' });

    if (response) {
      apiUrl = response.apiUrl || '';
      apiKey = response.apiKey || '';
      autoReview = response.autoReview !== false;

      // Parse enabled checks
      const checks = response.enabledChecks || ['seo', 'links'];
      enabledChecks = {
        seo: checks.includes('seo'),
        links: checks.includes('links'),
        a11y: checks.includes('a11y'),
        performance: checks.includes('performance'),
      };
    }
  });

  async function saveSettings() {
    saveStatus = 'saving';
    errorMessage = '';

    try {
      // Build enabled checks array
      const checksArray = Object.entries(enabledChecks)
        .filter(([_, enabled]) => enabled)
        .map(([check]) => check);

      const settings = {
        apiUrl,
        apiKey,
        enabledChecks: checksArray,
        autoReview,
      };

      const response = await chrome.runtime.sendMessage({
        action: 'saveSettings',
        settings,
      });

      if (response.success) {
        saveStatus = 'saved';
        setTimeout(() => {
          saveStatus = 'idle';
        }, 2000);
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      saveStatus = 'error';
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  function resetToDefaults() {
    apiUrl = 'https://webflow-review-orchestrator.YOUR_SUBDOMAIN.workers.dev';
    apiKey = '';
    enabledChecks = {
      seo: true,
      links: true,
      a11y: false,
      performance: false,
    };
    autoReview = true;
  }
</script>

<div class="options-page">
  <header class="header">
    <div class="logo">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" fill="currentColor"/>
      </svg>
      <h1>Webflow Review Settings</h1>
    </div>
  </header>

  <main class="content">
    <!-- API Configuration -->
    <section class="section">
      <h2>API Configuration</h2>

      <div class="form-group">
        <label for="apiUrl">API URL</label>
        <input
          id="apiUrl"
          type="url"
          bind:value={apiUrl}
          placeholder="https://webflow-review-orchestrator.YOUR.workers.dev"
        />
        <p class="help-text">
          The Cloudflare Workers URL for your Webflow Review API
        </p>
      </div>

      <div class="form-group">
        <label for="apiKey">API Key (Optional)</label>
        <input
          id="apiKey"
          type="password"
          bind:value={apiKey}
          placeholder="Enter API key if required"
        />
        <p class="help-text">
          Leave blank if your API doesn't require authentication
        </p>
      </div>
    </section>

    <!-- Check Configuration -->
    <section class="section">
      <h2>Enabled Checks</h2>

      <div class="checkbox-group">
        <label class="checkbox">
          <input type="checkbox" bind:checked={enabledChecks.seo} />
          <span class="checkbox-label">
            <strong>SEO</strong> - Meta tags, headings, structured data
          </span>
        </label>

        <label class="checkbox">
          <input type="checkbox" bind:checked={enabledChecks.links} />
          <span class="checkbox-label">
            <strong>Links</strong> - Broken links, missing URLs
          </span>
        </label>

        <label class="checkbox disabled">
          <input type="checkbox" bind:checked={enabledChecks.a11y} disabled />
          <span class="checkbox-label">
            <strong>Accessibility</strong> - WCAG AA compliance <span class="badge">Phase 3</span>
          </span>
        </label>

        <label class="checkbox disabled">
          <input type="checkbox" bind:checked={enabledChecks.performance} disabled />
          <span class="checkbox-label">
            <strong>Performance</strong> - Core Web Vitals <span class="badge">Phase 3</span>
          </span>
        </label>
      </div>
    </section>

    <!-- Behavior Configuration -->
    <section class="section">
      <h2>Behavior</h2>

      <label class="checkbox">
        <input type="checkbox" bind:checked={autoReview} />
        <span class="checkbox-label">
          <strong>Auto-review</strong> - Automatically review pages when you navigate
        </span>
      </label>
    </section>

    <!-- Actions -->
    <div class="actions">
      <button class="btn-secondary" on:click={resetToDefaults}>
        Reset to Defaults
      </button>

      <button class="btn-primary" on:click={saveSettings} disabled={saveStatus === 'saving'}>
        {#if saveStatus === 'saving'}
          Saving...
        {:else if saveStatus === 'saved'}
          ✓ Saved!
        {:else}
          Save Settings
        {/if}
      </button>
    </div>

    {#if saveStatus === 'error'}
      <div class="error-message">
        {errorMessage}
      </div>
    {/if}
  </main>
</div>

<style>
  .options-page {
    min-height: 100vh;
    background: #f9fafb;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .header {
    background: white;
    border-bottom: 1px solid #e5e7eb;
    padding: 24px;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 12px;
    max-width: 800px;
    margin: 0 auto;
  }

  .logo svg {
    color: #3b82f6;
  }

  .logo h1 {
    font-size: 24px;
    font-weight: 600;
    margin: 0;
  }

  .content {
    max-width: 800px;
    margin: 0 auto;
    padding: 32px 24px;
  }

  .section {
    background: white;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .section h2 {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 16px;
    color: #1f2937;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group:last-child {
    margin-bottom: 0;
  }

  label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    margin-bottom: 8px;
  }

  input[type="url"],
  input[type="password"] {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.2s;
  }

  input[type="url"]:focus,
  input[type="password"]:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .help-text {
    font-size: 12px;
    color: #6b7280;
    margin: 6px 0 0;
  }

  .checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .checkbox {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .checkbox:hover:not(.disabled) {
    background: #f3f4f6;
  }

  .checkbox.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .checkbox input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    margin-top: 2px;
  }

  .checkbox.disabled input[type="checkbox"] {
    cursor: not-allowed;
  }

  .checkbox-label {
    flex: 1;
    font-size: 14px;
    color: #374151;
    line-height: 1.5;
  }

  .checkbox-label strong {
    color: #1f2937;
  }

  .badge {
    display: inline-block;
    padding: 2px 8px;
    background: #fbbf24;
    color: #78350f;
    font-size: 11px;
    font-weight: 600;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 24px;
  }

  .btn-primary,
  .btn-secondary {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #2563eb;
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .btn-secondary:hover {
    background: #f9fafb;
  }

  .error-message {
    margin-top: 16px;
    padding: 12px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 6px;
    color: #991b1b;
    font-size: 14px;
  }
</style>

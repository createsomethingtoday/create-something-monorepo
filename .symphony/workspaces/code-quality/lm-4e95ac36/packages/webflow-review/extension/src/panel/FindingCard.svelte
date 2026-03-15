<script lang="ts">
  import type { Finding } from '../../../shared/types';
  import { createEventDispatcher } from 'svelte';

  export let finding: Finding;

  const dispatch = createEventDispatcher();

  function handleClick() {
    dispatch('click');
  }

  function getCheckTypeIcon(type: string): string {
    switch (type) {
      case 'seo': return '🔍';
      case 'links': return '🔗';
      case 'a11y': return '♿';
      case 'performance': return '⚡';
      case 'interactions': return '✨';
      default: return '📋';
    }
  }

  function getCheckTypeLabel(type: string): string {
    switch (type) {
      case 'seo': return 'SEO';
      case 'links': return 'Links';
      case 'a11y': return 'Accessibility';
      case 'performance': return 'Performance';
      case 'interactions': return 'Interactions';
      default: return 'General';
    }
  }
</script>

<div
  class="finding-card {finding.severity}"
  class:clickable={finding.elementSelector}
  on:click={handleClick}
  role={finding.elementSelector ? 'button' : undefined}
  tabindex={finding.elementSelector ? 0 : undefined}
>
  <!-- Header -->
  <div class="finding-header">
    <div class="finding-type">
      <span class="type-icon">{getCheckTypeIcon(finding.checkType)}</span>
      <span class="type-label">{getCheckTypeLabel(finding.checkType)}</span>
    </div>

    {#if finding.autoFixable}
      <span class="auto-fix-badge">Auto-fixable</span>
    {/if}
  </div>

  <!-- Message -->
  <div class="finding-message">
    {finding.message}
  </div>

  <!-- Element Selector -->
  {#if finding.elementSelector}
    <div class="finding-selector">
      <code>{finding.elementSelector}</code>
      <span class="click-hint">Click to highlight</span>
    </div>
  {/if}

  <!-- Evidence -->
  {#if finding.evidence && Object.keys(finding.evidence).length > 0}
    <details class="finding-evidence">
      <summary>Details</summary>
      <div class="evidence-content">
        {#each Object.entries(finding.evidence) as [key, value]}
          <div class="evidence-item">
            <span class="evidence-key">{key}:</span>
            <span class="evidence-value">
              {typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
            </span>
          </div>
        {/each}
      </div>
    </details>
  {/if}
</div>

<style>
  .finding-card {
    padding: 16px;
    border-radius: 8px;
    border-left: 4px solid;
    margin-bottom: 12px;
    background: white;
    transition: all 0.2s;
  }

  .finding-card.critical {
    border-color: #ef4444;
    background: #fef2f2;
  }

  .finding-card.warning {
    border-color: #f59e0b;
    background: #fffbeb;
  }

  .finding-card.info {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .finding-card.clickable {
    cursor: pointer;
  }

  .finding-card.clickable:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .finding-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .finding-type {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 500;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .type-icon {
    font-size: 16px;
  }

  .auto-fix-badge {
    font-size: 10px;
    padding: 2px 8px;
    background: #10b981;
    color: white;
    border-radius: 4px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .finding-message {
    font-size: 14px;
    line-height: 1.5;
    color: #1f2937;
    margin-bottom: 8px;
  }

  .finding-selector {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
    margin-bottom: 8px;
    gap: 8px;
  }

  .finding-selector code {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 12px;
    color: #1f2937;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .click-hint {
    font-size: 11px;
    color: #6b7280;
    white-space: nowrap;
  }

  .finding-evidence {
    margin-top: 8px;
  }

  .finding-evidence summary {
    font-size: 12px;
    font-weight: 500;
    color: #6b7280;
    cursor: pointer;
    user-select: none;
  }

  .finding-evidence summary:hover {
    color: #1f2937;
  }

  .evidence-content {
    margin-top: 8px;
    padding: 12px;
    background: rgba(0, 0, 0, 0.02);
    border-radius: 4px;
    font-size: 12px;
  }

  .evidence-item {
    display: flex;
    gap: 8px;
    margin-bottom: 4px;
  }

  .evidence-key {
    font-weight: 500;
    color: #6b7280;
    min-width: 80px;
  }

  .evidence-value {
    color: #1f2937;
    word-break: break-word;
  }
</style>

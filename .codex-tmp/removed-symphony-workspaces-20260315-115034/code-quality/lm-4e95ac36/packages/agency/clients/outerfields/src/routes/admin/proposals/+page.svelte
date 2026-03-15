<!--
  Admin Proposals Dashboard
  
  Review and manage AI-proposed changes.
  All changes require human approval before going live.
-->
<script lang="ts">
  import { enhance } from '$app/forms';
  
  interface Props {
    data: {
      proposals: any[];
      stats: Record<string, number> | null;
    };
  }
  
  let { data }: Props = $props();
  
  let selectedProposal = $state<any>(null);
  let actionInProgress = $state(false);
  let rejectReason = $state('');
  
  // Using Canon semantic tokens via CSS custom properties
  const impactColors: Record<string, string> = {
    low: 'var(--color-success)',
    medium: 'var(--color-warning)',
    high: 'var(--color-error)'
  };
  
  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  async function approveProposal(id: string, autoApply: boolean = false) {
    actionInProgress = true;
    
    try {
      const response = await fetch(`/api/admin/proposals/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoApply })
      });
      
      if (response.ok) {
        // Refresh page to show updated list
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Failed to approve: ${error.error}`);
      }
    } catch (error) {
      alert('Failed to approve proposal');
    } finally {
      actionInProgress = false;
    }
  }
  
  async function rejectProposal(id: string) {
    if (!rejectReason || rejectReason.length < 5) {
      alert('Please provide a rejection reason (min 5 characters)');
      return;
    }
    
    actionInProgress = true;
    
    try {
      const response = await fetch(`/api/admin/proposals/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason })
      });
      
      if (response.ok) {
        rejectReason = '';
        selectedProposal = null;
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Failed to reject: ${error.error}`);
      }
    } catch (error) {
      alert('Failed to reject proposal');
    } finally {
      actionInProgress = false;
    }
  }
</script>

<svelte:head>
  <title>Admin - Proposals | OUTERFIELDS</title>
</svelte:head>

<div class="admin-container">
  <header class="admin-header">
    <h1>Proposal Review</h1>
    <p class="subtitle">AI-suggested changes awaiting your approval</p>
  </header>
  
  {#if data.stats}
    <div class="stats-bar">
      <div class="stat">
        <span class="stat-value">{data.stats.pending || 0}</span>
        <span class="stat-label">Pending</span>
      </div>
      <div class="stat">
        <span class="stat-value">{data.stats.approved || 0}</span>
        <span class="stat-label">Approved</span>
      </div>
      <div class="stat">
        <span class="stat-value">{data.stats.applied || 0}</span>
        <span class="stat-label">Applied</span>
      </div>
      <div class="stat">
        <span class="stat-value">{data.stats.rejected || 0}</span>
        <span class="stat-label">Rejected</span>
      </div>
    </div>
  {/if}
  
  {#if data.proposals.length === 0}
    <div class="empty-state">
      <div class="empty-icon">✓</div>
      <h2>All caught up</h2>
      <p>No pending proposals to review</p>
    </div>
  {:else}
    <div class="proposals-list">
      {#each data.proposals as proposal}
        <article class="proposal-card" class:selected={selectedProposal?.id === proposal.id}>
          <div class="proposal-header">
            <span 
              class="impact-badge" 
              style="background: {impactColors[proposal.impact_level]}"
            >
              {proposal.impact_level}
            </span>
            <span class="change-type">{proposal.change_type}</span>
            <span class="timestamp">{formatDate(proposal.created_at)}</span>
          </div>
          
          <h3 class="proposal-title">{proposal.title}</h3>
          <p class="proposal-description">{proposal.description}</p>
          
          <div class="proposal-change">
            <div class="change-row">
              <span class="change-label">Current:</span>
              <code>{proposal.current_value}</code>
            </div>
            <div class="change-row">
              <span class="change-label">Proposed:</span>
              <code class="proposed">{proposal.proposed_value}</code>
            </div>
          </div>
          
          <details class="justification">
            <summary>Justification</summary>
            <p>{proposal.justification}</p>
          </details>
          
          <div class="proposal-actions">
            <button 
              class="btn-approve"
              onclick={() => approveProposal(proposal.id, true)}
              disabled={actionInProgress}
            >
              Approve & Apply
            </button>
            <button 
              class="btn-approve-only"
              onclick={() => approveProposal(proposal.id, false)}
              disabled={actionInProgress}
            >
              Approve
            </button>
            <button 
              class="btn-reject"
              onclick={() => selectedProposal = selectedProposal?.id === proposal.id ? null : proposal}
              disabled={actionInProgress}
            >
              Reject
            </button>
          </div>
          
          {#if selectedProposal?.id === proposal.id}
            <div class="reject-form">
              <textarea 
                bind:value={rejectReason}
                placeholder="Why are you rejecting this proposal?"
                rows="2"
              ></textarea>
              <button 
                class="btn-confirm-reject"
                onclick={() => rejectProposal(proposal.id)}
                disabled={actionInProgress || rejectReason.length < 5}
              >
                Confirm Rejection
              </button>
            </div>
          {/if}
        </article>
      {/each}
    </div>
  {/if}
</div>

<style>
  .admin-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  .admin-header {
    margin-bottom: 2rem;
  }
  
  .admin-header h1 {
    font-size: var(--text-heading-lg, 1.5rem);
    font-weight: 600;
    color: var(--color-fg-primary, #fff);
    margin: 0 0 0.5rem;
  }
  
  .subtitle {
    color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
    margin: 0;
  }
  
  .stats-bar {
    display: flex;
    gap: 1.5rem;
    margin-bottom: 2rem;
    padding: 1rem;
    background: var(--color-bg-surface, rgba(255, 255, 255, 0.03));
    border-radius: var(--radius-lg, 12px);
  }
  
  .stat {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .stat-value {
    font-size: var(--text-heading-md, 1.25rem);
    font-weight: 600;
    color: var(--color-fg-primary, #fff);
  }
  
  .stat-label {
    font-size: var(--text-body-sm, 0.875rem);
    color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
  }
  
  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
  }
  
  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }
  
  .empty-state h2 {
    color: var(--color-fg-primary, #fff);
    margin: 0 0 0.5rem;
  }
  
  .empty-state p {
    color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
    margin: 0;
  }
  
  .proposals-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .proposal-card {
    background: var(--color-bg-surface, rgba(255, 255, 255, 0.03));
    border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
    border-radius: var(--radius-lg, 12px);
    padding: 1.5rem;
    transition: all var(--duration-micro, 200ms) var(--ease-standard, ease);
  }
  
  .proposal-card:hover {
    border-color: var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
  }
  
  .proposal-card.selected {
    border-color: var(--color-error);
  }
  
  .proposal-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }
  
  .impact-badge {
    font-size: var(--text-body-xs, 0.75rem);
    font-weight: 600;
    text-transform: uppercase;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm, 4px);
    color: var(--color-bg-pure);
  }
  
  .change-type {
    font-size: var(--text-body-sm, 0.875rem);
    color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
  }
  
  .timestamp {
    margin-left: auto;
    font-size: var(--text-body-sm, 0.875rem);
    color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
  }
  
  .proposal-title {
    font-size: var(--text-body-lg, 1.125rem);
    font-weight: 600;
    color: var(--color-fg-primary, #fff);
    margin: 0 0 0.5rem;
  }
  
  .proposal-description {
    color: var(--color-fg-secondary, rgba(255, 255, 255, 0.7));
    margin: 0 0 1rem;
    font-size: var(--text-body-md, 1rem);
  }
  
  .proposal-change {
    background: rgba(0, 0, 0, 0.2);
    border-radius: var(--radius-md, 8px);
    padding: 0.75rem;
    margin-bottom: 1rem;
  }
  
  .change-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .change-row + .change-row {
    margin-top: 0.5rem;
  }
  
  .change-label {
    font-size: var(--text-body-sm, 0.875rem);
    color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
    width: 70px;
  }
  
  .change-row code {
    font-family: monospace;
    font-size: var(--text-body-sm, 0.875rem);
    color: var(--color-fg-secondary, rgba(255, 255, 255, 0.7));
  }
  
  .change-row code.proposed {
    color: var(--color-brand, #7c2bee);
    font-weight: 500;
  }
  
  .justification {
    margin-bottom: 1rem;
  }
  
  .justification summary {
    cursor: pointer;
    color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
    font-size: var(--text-body-sm, 0.875rem);
  }
  
  .justification p {
    margin: 0.5rem 0 0;
    padding-left: 1rem;
    border-left: 2px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
    color: var(--color-fg-secondary, rgba(255, 255, 255, 0.7));
    font-size: var(--text-body-sm, 0.875rem);
  }
  
  .proposal-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .btn-approve, .btn-approve-only, .btn-reject, .btn-confirm-reject {
    padding: 0.5rem 1rem;
    border-radius: var(--radius-md, 8px);
    font-size: var(--text-body-sm, 0.875rem);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--duration-micro, 200ms) var(--ease-standard, ease);
  }
  
  .btn-approve {
    background: var(--color-brand, #7c2bee);
    color: var(--color-fg-primary);
    border: none;
  }
  
  .btn-approve:hover:not(:disabled) {
    filter: brightness(1.1);
  }
  
  .btn-approve-only {
    background: transparent;
    color: var(--color-brand, #7c2bee);
    border: 1px solid var(--color-brand, #7c2bee);
  }
  
  .btn-approve-only:hover:not(:disabled) {
    background: var(--color-hover);
  }
  
  .btn-reject {
    background: transparent;
    color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
    border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
  }
  
  .btn-reject:hover:not(:disabled) {
    border-color: var(--color-error);
    color: var(--color-error);
  }
  
  .btn-confirm-reject {
    background: var(--color-error);
    color: var(--color-fg-primary);
    border: none;
  }
  
  .btn-confirm-reject:hover:not(:disabled) {
    filter: brightness(0.9);
  }
  
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .reject-form {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
  }
  
  .reject-form textarea {
    width: 100%;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
    border-radius: var(--radius-md, 8px);
    padding: 0.75rem;
    color: var(--color-fg-primary, #fff);
    font-size: var(--text-body-sm, 0.875rem);
    resize: vertical;
    margin-bottom: 0.75rem;
  }
  
  .reject-form textarea:focus {
    outline: none;
    border-color: var(--color-error);
  }
</style>

<!--
  How We Improve Component
  
  User-facing explanation of the AI-native improvement system.
  Uses Nicely Said writing style: clear, honest, user-focused.
-->
<script lang="ts">
  import { ChevronDown, BarChart3, Lightbulb, Shield } from 'lucide-svelte';
  
  let expanded = $state(false);
</script>

<section class="how-we-improve">
  <button class="toggle" onclick={() => expanded = !expanded}>
    <span class="label">How we improve</span>
    <ChevronDown size={16} class="icon {expanded ? 'rotated' : ''}" />
  </button>
  
  {#if expanded}
    <div class="content">
      <p class="intro">
        The platform learns from patterns, not people.
      </p>
      
      <div class="details">
        <div class="detail-item">
          <span class="detail-icon"><BarChart3 size={18} /></span>
          <div>
            <strong>We watch what works</strong>
            <p>When 100 users hit the same friction point, we notice. Anonymous patterns, not individual tracking.</p>
          </div>
        </div>
        
        <div class="detail-item">
          <span class="detail-icon"><Lightbulb size={18} /></span>
          <div>
            <strong>Small fixes, human-approved</strong>
            <p>The system suggests small adjustments—like timing tweaks or clearer buttons. A human reviews every change.</p>
          </div>
        </div>
        
        <div class="detail-item">
          <span class="detail-icon"><Shield size={18} /></span>
          <div>
            <strong>Your experience, protected</strong>
            <p>Pricing, account settings, and core features never change automatically. That's a promise.</p>
          </div>
        </div>
      </div>
      
      <p class="footer">
        Questions? <a href="/contact">Let us know</a>.
      </p>
    </div>
  {/if}
</section>

<style>
  .how-we-improve {
    border-top: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
    padding-top: 1rem;
    margin-top: 2rem;
  }
  
  .toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: none;
    color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
    font-size: var(--text-body-sm, 0.875rem);
    cursor: pointer;
    padding: 0;
    transition: color var(--duration-micro, 200ms) var(--ease-standard, ease);
  }
  
  .toggle:hover {
    color: var(--color-fg-secondary, rgba(255, 255, 255, 0.7));
  }
  
  .toggle :global(.icon) {
    transition: transform var(--duration-micro, 200ms) var(--ease-standard, ease);
  }
  
  .toggle :global(.icon.rotated) {
    transform: rotate(180deg);
  }
  
  .content {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--color-bg-surface, rgba(255, 255, 255, 0.03));
    border-radius: var(--radius-md, 8px);
  }
  
  .intro {
    font-size: var(--text-body-md, 1rem);
    color: var(--color-fg-primary, #fff);
    margin: 0 0 1rem;
  }
  
  .details {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .detail-item {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
  }
  
  .detail-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }
  
  .detail-item strong {
    display: block;
    color: var(--color-fg-primary, #fff);
    font-size: var(--text-body-sm, 0.875rem);
    margin-bottom: 0.25rem;
  }
  
  .detail-item p {
    color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
    font-size: var(--text-body-sm, 0.875rem);
    margin: 0;
    line-height: 1.5;
  }
  
  .footer {
    margin: 1rem 0 0;
    padding-top: 0.75rem;
    border-top: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
    font-size: var(--text-body-sm, 0.875rem);
    color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
  }
  
  .footer a {
    color: var(--color-brand, #7c2bee);
    text-decoration: none;
  }
  
  .footer a:hover {
    text-decoration: underline;
  }
</style>

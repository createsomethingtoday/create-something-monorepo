<script lang="ts">
  import '../app.css';
  import { Bot, Github, ExternalLink } from 'lucide-svelte';
  
  let { children } = $props();
</script>

<div class="app">
  <!-- Navigation -->
  <header class="nav">
    <div class="nav-inner">
      <a href="/" class="logo">
        <Bot size={20} />
        <span>Audit Agent</span>
      </a>
      
      <nav class="nav-links">
        <a 
          href="https://webflow-apps-audit-agent.createsomething.workers.dev/health" 
          target="_blank"
          rel="noopener"
          class="nav-link"
        >
          <span>API</span>
          <ExternalLink size={14} />
        </a>
        <a 
          href="https://github.com/create-something" 
          target="_blank"
          rel="noopener"
          class="nav-link"
        >
          <Github size={16} />
        </a>
      </nav>
    </div>
  </header>
  
  <!-- Main content -->
  <main class="main">
    {@render children()}
  </main>
  
  <!-- Footer -->
  <footer class="footer">
    <p class="footer-text">
      Powered by <span class="highlight">Cloudflare Workers AI</span> — Llama 3.1 8B
    </p>
  </footer>
</div>

<style>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--color-bg-pure);
  }
  
  .nav {
    position: sticky;
    top: 0;
    z-index: 40;
    backdrop-filter: blur(var(--glass-blur-lg)) var(--glass-saturate-lg);
    background-color: var(--glass-bg-light);
    border-bottom: 1px solid var(--glass-border-light);
  }
  
  .nav-inner {
    max-width: 80rem;
    margin: 0 auto;
    padding: 0.875rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-fg-primary);
    font-weight: 600;
    font-size: var(--text-body);
    text-decoration: none;
    transition: opacity var(--duration-micro) var(--ease-standard);
  }
  
  .logo:hover {
    opacity: 0.8;
  }
  
  .nav-links {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .nav-link {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    color: var(--color-fg-tertiary);
    font-size: var(--text-body-sm);
    text-decoration: none;
    transition: color var(--duration-micro) var(--ease-standard);
  }
  
  .nav-link:hover {
    color: var(--color-fg-primary);
  }
  
  .main {
    flex: 1;
    max-width: 80rem;
    margin: 0 auto;
    padding: 2rem 1.5rem;
    width: 100%;
  }
  
  .footer {
    padding: 1.5rem;
    text-align: center;
    border-top: 1px solid var(--color-border-default);
  }
  
  .footer-text {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }
  
  .highlight {
    color: var(--color-fg-secondary);
  }
</style>

<script lang="ts">
  import '../app.css';

  interface Props {
    children: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<div class="min-h-screen flex flex-col">
  <!-- Navigation -->
  <header class="header">
    <nav class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
      <a href="/" class="flex items-center gap-3">
        <div class="logo-box">
          <span class="logo-text">CS</span>
        </div>
        <span class="nav-title">LMS</span>
      </a>

      <div class="flex items-center gap-6">
        <a href="/paths" class="nav-link">Paths</a>
        <a href="/progress" class="nav-link">Progress</a>
        <a href="/praxis" class="nav-link">Praxis</a>
      </div>
    </nav>
  </header>

  <!-- Main Content -->
  <main class="flex-1">
    {@render children()}
  </main>

  <!-- Footer -->
  <footer class="footer">
    <div class="max-w-6xl mx-auto px-6 text-center">
      <p class="footer-text">
        CREATE SOMETHING LMS — Learning the ethos through practice
      </p>
    </div>
  </footer>
</div>

<style>
  .header {
    border-bottom: 1px solid var(--color-border-default);
  }

  .logo-box {
    width: 2rem;
    height: 2rem;
    border: 1px solid var(--color-border-emphasis);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .logo-text {
    font-size: var(--text-caption);
  }

  .nav-title {
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
  }

  .nav-link {
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .nav-link:hover {
    color: var(--color-fg-primary);
  }

  .footer {
    border-top: 1px solid var(--color-border-default);
    padding: var(--space-lg) 0;
  }

  .footer-text {
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
  }
</style>

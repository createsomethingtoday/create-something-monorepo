<script lang="ts">
  import { browser } from '$app/environment';
  import { SEO } from '@create-something/canon';

  // V3 source assets are static, outlined files. The download links intentionally
  // target the canonical files rather than rebuilding a mark or wordmark at request time.
  const icons = [
    {
      name: 'Master Mark',
      file: 'create-something-mark-black.svg',
      description: 'Continuous double-ring master mark for light fields',
      bg: 'light'
    },
    {
      name: 'Reversed Master Mark',
      file: 'create-something-mark-white.svg',
      description: 'Continuous double-ring master mark for dark fields',
      bg: 'dark'
    },
    {
      name: 'Site Icon',
      file: 'create-something-site-icon.svg',
      description: 'Prepared micro mark on the owned near-black app field',
      bg: 'dark'
    }
  ];

  const wordmarks = [
    {
      name: 'Wordmark White',
      file: 'create-something-wordmark-white.svg',
      description: 'Outlined Arial Bold wordmark for dark backgrounds',
      bg: 'dark'
    },
    {
      name: 'Wordmark Black',
      file: 'create-something-wordmark-black.svg',
      description: 'Outlined Arial Bold wordmark for light backgrounds',
      bg: 'light'
    }
  ];

  const lockups = [
    {
      name: 'Horizontal Light',
      file: 'create-something-horizontal-white.svg',
      description: 'Shared ring geometry for dark backgrounds',
      bg: 'dark'
    },
    {
      name: 'Horizontal Dark',
      file: 'create-something-horizontal-black.svg',
      description: 'Shared ring geometry for light backgrounds',
      bg: 'light'
    },
    {
      name: 'Stacked Light',
      file: 'create-something-stacked-white.svg',
      description: 'Shared ring geometry for dark backgrounds',
      bg: 'dark'
    },
    {
      name: 'Stacked Dark',
      file: 'create-something-stacked-black.svg',
      description: 'Shared ring geometry for light backgrounds',
      bg: 'light'
    }
  ];

  const colors = [
    { name: 'Pure Black', value: '#000000', token: '--color-performance-bg-pure' },
    { name: 'Elevated', value: '#0a0a0a', token: '--color-performance-bg-elevated' },
    { name: 'Surface', value: '#111111', token: '--color-performance-bg-surface' },
    { name: 'Pure White', value: '#ffffff', token: '--color-performance-fg-primary' }
  ];

  function copyToClipboard(text: string) {
    if (browser) {
      navigator.clipboard.writeText(text);
    }
  }

  function downloadSvg(filename: string) {
    if (browser) {
      const link = document.createElement('a');
      link.href = `/brand/${filename}`;
      link.download = filename;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  }
</script>

<SEO
  title="Brand Assets"
  description="Official V3 brand assets for CREATE SOMETHING. Download outlined logos, wordmarks, and lockups."
  propertyName="ltd"
  breadcrumbs={[
    { name: 'Home', url: 'https://createsomething.ltd' },
    { name: 'Brand Assets', url: 'https://createsomething.ltd/brand' }
  ]}
/>

<main class="brand-page">
  <header class="brand-header">
    <h1 class="brand-title">Brand Assets</h1>
    <p class="brand-subtitle">Official V3 source assets for CREATE SOMETHING. Use responsibly.</p>
  </header>

  <!-- Icons Section -->
  <section class="asset-section">
    <h2 class="section-title">Icons</h2>
    <div class="asset-grid icons-grid">
      {#each icons as icon}
        <button class="asset-card" onclick={() => downloadSvg(icon.file)} type="button">
          <div class="asset-preview {icon.bg}">
            <img src="/brand/{icon.file}" alt={icon.name} class="preview-image" />
          </div>
          <div class="asset-info">
            <span class="asset-name">{icon.name}</span>
            <span class="asset-description">{icon.description}</span>
          </div>
        </button>
      {/each}
    </div>
  </section>

  <!-- Lockups Section -->
  <section class="asset-section">
    <h2 class="section-title">Lockups</h2>
    <div class="asset-grid lockups-grid">
      {#each lockups as lockup}
        <button class="asset-card" onclick={() => downloadSvg(lockup.file)} type="button">
          <div class="asset-preview {lockup.bg}">
            <img src="/brand/{lockup.file}" alt={lockup.name} class="preview-image lockup" />
          </div>
          <div class="asset-info">
            <span class="asset-name">{lockup.name}</span>
            <span class="asset-description">{lockup.description}</span>
          </div>
        </button>
      {/each}
    </div>
  </section>

  <!-- Wordmarks Section -->
  <section class="asset-section">
    <h2 class="section-title">Wordmarks</h2>
    <div class="asset-grid wordmarks-grid">
      {#each wordmarks as wordmark}
        <button class="asset-card" onclick={() => downloadSvg(wordmark.file)} type="button">
          <div class="asset-preview {wordmark.bg}">
            <img src="/brand/{wordmark.file}" alt={wordmark.name} class="preview-image wordmark" />
          </div>
          <div class="asset-info">
            <span class="asset-name">{wordmark.name}</span>
            <span class="asset-description">{wordmark.description}</span>
          </div>
        </button>
      {/each}
    </div>
  </section>

  <!-- Colors Section -->
  <section class="asset-section">
    <h2 class="section-title">Colors</h2>
    <div class="colors-grid">
      {#each colors as color}
        <button
          class="color-card"
          onclick={() => copyToClipboard(color.value)}
          type="button"
          title="Click to copy"
        >
          <div class="color-swatch" style="background-color: {color.value}"></div>
          <div class="color-info">
            <span class="color-name">{color.name}</span>
            <span class="color-value">{color.value}</span>
            <span class="color-token">{color.token}</span>
          </div>
        </button>
      {/each}
    </div>
  </section>

  <!-- Typography Section -->
  <section class="asset-section">
    <h2 class="section-title">Typography</h2>
    <div class="typography-grid">
      <div class="type-card">
        <span class="type-sample sans">Canon Sans</span>
        <span class="type-meta">Arial / Helvetica / system · Weight 700 · Neutral tracking</span>
      </div>
      <div class="type-card">
        <span class="type-sample mono">Canon Mono</span>
        <span class="type-meta">Platform monospace · Operational state and technical content</span>
      </div>
    </div>
  </section>

  <!-- Guidelines Section -->
  <section class="asset-section guidelines-section">
    <h2 class="section-title">Usage Guidelines</h2>
    <ul class="guidelines-list">
      <li>Match logo variant to background (light logo on dark, dark on light)</li>
      <li>Maintain clear space around the master mark equal to at least one ring band width</li>
      <li>Do not rotate, skew, or apply effects to the logo</li>
      <li>Do not change the logo colors or opacity values</li>
      <li>Do not place on busy or patterned backgrounds</li>
      <li>
        Use the full master mark at 40 CSS px or larger; use prepared micro marks only from 16–32
        CSS px
      </li>
    </ul>
  </section>
</main>

<style>
  .brand-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--space-performance-xl) var(--space-performance-lg);
  }

  .brand-header {
    text-align: center;
    margin-bottom: var(--space-performance-2xl);
    padding-bottom: var(--space-performance-xl);
  }

  .brand-title {
    font-size: var(--text-performance-display);
    font-weight: var(--font-performance-bold);
    color: var(--color-performance-fg-primary);
    margin-bottom: var(--space-performance-sm);
  }

  .brand-subtitle {
    font-size: var(--text-performance-body-lg);
    color: var(--color-performance-fg-muted);
  }

  .asset-section {
    margin-bottom: var(--space-performance-2xl);
  }

  .section-title {
    font-size: var(--text-performance-h2);
    font-weight: var(--font-performance-semibold);
    color: var(--color-performance-fg-primary);
    margin-bottom: var(--space-performance-lg);
  }

  .asset-grid {
    display: grid;
    gap: var(--space-performance-md);
  }

  .icons-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .lockups-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .wordmarks-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .asset-card {
    display: flex;
    flex-direction: column;
    background: transparent;
    border-radius: var(--radius-performance-scale-lg);
    overflow: hidden;
    cursor: pointer;
    transition: border-color var(--duration-performance-micro) var(--ease-performance-standard);
    text-align: left;
  }

  .asset-card:hover {
    border-color: var(--color-performance-border-emphasis);
  }

  .asset-card:focus-visible {
    outline: 2px solid var(--color-performance-focus);
    outline-offset: 2px;
  }

  .asset-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-performance-xl);
    min-height: 160px;
  }

  .asset-preview.dark {
    background: var(--color-performance-bg-pure);
  }

  .asset-preview.light {
    background: #ffffff;
  }

  .preview-image {
    max-width: 100%;
    max-height: 80px;
    object-fit: contain;
  }

  .preview-image.lockup {
    max-height: 60px;
  }

  .preview-image.wordmark {
    max-height: 32px;
  }

  .asset-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: var(--space-performance-md);
  }

  .asset-name {
    font-size: var(--text-performance-body);
    font-weight: var(--font-performance-medium);
    color: var(--color-performance-fg-primary);
  }

  .asset-description {
    font-size: var(--text-performance-caption);
    color: var(--color-performance-fg-muted);
  }

  /* Colors */
  .colors-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-performance-md);
  }

  .color-card {
    display: flex;
    flex-direction: column;
    background: transparent;
    border-radius: var(--radius-performance-scale-lg);
    overflow: hidden;
    cursor: pointer;
    transition: border-color var(--duration-performance-micro) var(--ease-performance-standard);
    text-align: left;
  }

  .color-card:hover {
    border-color: var(--color-performance-border-emphasis);
  }

  .color-swatch {
    height: 80px;
  }

  .color-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: var(--space-performance-sm);
  }

  .color-name {
    font-size: var(--text-performance-body-sm);
    font-weight: var(--font-performance-medium);
    color: var(--color-performance-fg-primary);
  }

  .color-value {
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    color: var(--color-performance-fg-secondary);
  }

  .color-token {
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    color: var(--color-performance-fg-muted);
  }

  /* Typography */
  .typography-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-performance-md);
  }

  .type-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-performance-sm);
    padding: var(--space-performance-lg);
    border-radius: var(--radius-performance-scale-lg);
  }

  .type-sample {
    font-size: var(--text-performance-h2);
    color: var(--color-performance-fg-primary);
  }

  .type-sample.sans {
    font-family: var(--font-performance-sans);
    font-weight: var(--font-performance-semibold);
    letter-spacing: var(--tracking-performance-tight);
  }

  .type-sample.mono {
    font-family: var(--font-performance-mono);
    font-weight: var(--font-performance-regular);
  }

  .type-meta {
    font-size: var(--text-performance-caption);
    color: var(--color-performance-fg-muted);
  }

  /* Guidelines */
  .guidelines-section {
    padding: var(--space-performance-lg);
    background: var(--color-performance-bg-surface);
    border-radius: var(--radius-performance-scale-lg);
  }

  .guidelines-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-performance-sm);
  }

  .guidelines-list li {
    font-size: var(--text-performance-body);
    color: var(--color-performance-fg-secondary);
    padding-left: var(--space-performance-md);
    position: relative;
  }

  .guidelines-list li::before {
    content: '—';
    position: absolute;
    left: 0;
    color: var(--color-performance-fg-muted);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .brand-page {
      padding: var(--space-performance-lg) var(--space-performance-md);
    }

    .icons-grid,
    .lockups-grid,
    .wordmarks-grid,
    .colors-grid,
    .typography-grid {
      grid-template-columns: 1fr;
    }
  }
</style>

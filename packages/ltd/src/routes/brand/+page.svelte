<script lang="ts">
  import { browser } from '$app/environment';
  import { SEO } from '@create-something/canon';

  type BrandAsset = {
    name: string;
    file: string;
    description: string;
    preview: 'dark' | 'light';
    size: 'icon' | 'lockup' | 'wordmark';
  };

  const assetGroups: Array<{ title: string; guidance: string; assets: BrandAsset[] }> = [
    {
      title: 'Icons',
      guidance: 'Use an icon for avatars, app tiles, and small square placements.',
      assets: [
        {
          name: 'Icon with Background',
          file: 'icon-with-bg.svg',
          description: '512×512 with a black background',
          preview: 'dark',
          size: 'icon'
        },
        {
          name: 'Icon Circular',
          file: 'icon-circular.svg',
          description: 'Circular variant for avatars',
          preview: 'dark',
          size: 'icon'
        },
        {
          name: 'Icon Only',
          file: 'icon-only.svg',
          description: 'Transparent and scalable',
          preview: 'dark',
          size: 'icon'
        }
      ]
    },
    {
      title: 'Lockups',
      guidance: 'Use a lockup when the mark and name must appear together.',
      assets: [
        {
          name: 'Horizontal Light',
          file: 'lockup-horizontal-light.svg',
          description: 'For dark backgrounds',
          preview: 'dark',
          size: 'lockup'
        },
        {
          name: 'Horizontal Dark',
          file: 'lockup-horizontal-dark.svg',
          description: 'For light backgrounds',
          preview: 'light',
          size: 'lockup'
        },
        {
          name: 'Stacked Light',
          file: 'lockup-stacked-light.svg',
          description: 'For dark, narrow placements',
          preview: 'dark',
          size: 'lockup'
        },
        {
          name: 'Stacked Dark',
          file: 'lockup-stacked-dark.svg',
          description: 'For light, narrow placements',
          preview: 'light',
          size: 'lockup'
        }
      ]
    },
    {
      title: 'Wordmarks',
      guidance: 'Use a wordmark when the name matters more than the cube.',
      assets: [
        {
          name: 'Wordmark White',
          file: 'wordmark-white.svg',
          description: 'For dark backgrounds',
          preview: 'dark',
          size: 'wordmark'
        },
        {
          name: 'Wordmark Black',
          file: 'wordmark-black.svg',
          description: 'For light backgrounds',
          preview: 'light',
          size: 'wordmark'
        }
      ]
    }
  ];

  const colors = [
    {
      name: 'Pure background',
      token: '--color-performance-bg-pure',
      dark: '#000000',
      light: '#ffffff'
    },
    {
      name: 'Elevated background',
      token: '--color-performance-bg-elevated',
      dark: '#0a0a0a',
      light: '#fafafa'
    },
    {
      name: 'Surface background',
      token: '--color-performance-bg-surface',
      dark: '#111111',
      light: '#f5f5f5'
    },
    {
      name: 'Primary foreground',
      token: '--color-performance-fg-primary',
      dark: '#ffffff',
      light: '#1a1a1a'
    }
  ];

  let copyResult = $state<{ token: string; status: 'copied' | 'failed' } | null>(null);

  async function copyToken(token: string) {
    if (!browser) return;

    try {
      await navigator.clipboard.writeText(token);
      copyResult = { token, status: 'copied' };
    } catch {
      copyResult = { token, status: 'failed' };
    }
  }
</script>

<SEO
  title="Brand Assets"
  description="Choose and download official CREATE SOMETHING brand assets, then check their usage rules."
  propertyName="ltd"
  breadcrumbs={[
    { name: 'Home', url: 'https://createsomething.ltd' },
    { name: 'Brand Assets', url: 'https://createsomething.ltd/brand' }
  ]}
/>

<div class="brand-page">
  <section class="chapter intro" data-performance-chapter="task-state">
    <p class="eyebrow">Brand kit</p>
    <h1>Choose the asset that fits the placement.</h1>
    <p class="lede">
      Download an SVG below. Use a light asset on a dark background and a dark asset on a light
      background.
    </p>
    <noscript>
      <p class="notice">JavaScript is off. The direct download links remain available.</p>
    </noscript>
  </section>

  <section class="chapter" data-performance-chapter="workspace">
    <div class="section-heading">
      <p class="eyebrow">Assets</p>
      <h2>Download an SVG</h2>
    </div>

    {#each assetGroups as group}
      <div class="asset-group">
        <div class="group-heading">
          <h3>{group.title}</h3>
          <p>{group.guidance}</p>
        </div>
        <div class="asset-grid">
          {#each group.assets as asset}
            <a class="asset-card" href="/brand/{asset.file}?download=1" download={asset.file}>
              <span class="asset-preview {asset.preview}">
                <img src="/brand/{asset.file}" alt="" class={asset.size} />
              </span>
              <span class="asset-copy">
                <strong>{asset.name}</strong>
                <span>{asset.description}</span>
                <span class="download-label">Download SVG</span>
              </span>
            </a>
          {/each}
        </div>
      </div>
    {/each}

    <div class="system-grid">
      <div>
        <div class="group-heading">
          <h3>Color tokens</h3>
          <p>
            These are Canon defaults. A token can resolve differently by theme and property overlay,
            so copy the token—not a fixed color—into product code.
          </p>
        </div>
        <div class="token-list">
          {#each colors as color}
            <div class="token-card">
              <div class="swatches" aria-hidden="true">
                <span style={`background-color: ${color.dark}`}></span>
                <span style={`background-color: ${color.light}`}></span>
              </div>
              <div class="token-copy">
                <strong>{color.name}</strong>
                <code>{color.token}</code>
                <span>Dark theme {color.dark} · Light theme {color.light}</span>
              </div>
              <button type="button" onclick={() => copyToken(color.token)}>
                {#if copyResult?.token === color.token && copyResult.status === 'copied'}
                  Copied
                {:else if copyResult?.token === color.token && copyResult.status === 'failed'}
                  Could not copy
                {:else}
                  Copy token
                {/if}
              </button>
            </div>
          {/each}
        </div>
        <noscript>
          <p class="notice">
            Copy the token text manually. Color values remain readable without JavaScript.
          </p>
        </noscript>
      </div>

      <div>
        <div class="group-heading">
          <h3>Typography</h3>
          <p>Use the shared stacks so type remains stable across platforms.</p>
        </div>
        <div class="type-card">
          <strong class="sans">Canon Sans</strong>
          <span>Arial / Helvetica / system · Weight 700 · Neutral tracking</span>
        </div>
        <div class="type-card">
          <strong class="mono">Canon Mono</strong>
          <span>Platform monospace · Operational state and technical content</span>
        </div>
      </div>
    </div>
  </section>

  <section class="chapter receipt" data-performance-chapter="decision-receipt">
    <div>
      <p class="eyebrow">Before publishing</p>
      <h2>Usage Guidelines</h2>
      <ul>
        <li>Match the asset to its background: light on dark, dark on light.</li>
        <li>Keep clear space around the logo equal to the cube height.</li>
        <li>Do not rotate, skew, or add effects.</li>
        <li>Do not change logo colors or opacity.</li>
        <li>Do not place the logo on a busy or patterned background.</li>
      </ul>
    </div>
    <div class="handoff">
      <p>Need implementation details?</p>
      <a href="/canon/foundations/colors">Check Canon color tokens</a>
      <a href="/canon/foundations/typography">Check Canon typography</a>
    </div>
  </section>
</div>

<style>
  .brand-page {
    width: min(1120px, calc(100% - 2rem));
    margin: 0 auto;
    padding: clamp(2rem, 6vw, 5rem) 0;
  }

  .chapter {
    padding: clamp(2rem, 5vw, 4rem) 0;
    border-top: 1px solid var(--color-performance-border-default);
  }

  .intro {
    padding-top: 0;
    border-top: 0;
  }

  .eyebrow {
    margin: 0 0 0.75rem;
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    color: var(--color-performance-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  h1,
  h2,
  h3,
  p {
    margin-top: 0;
  }

  h1 {
    max-width: 15ch;
    margin-bottom: 1rem;
    font-size: clamp(2.5rem, 7vw, 5.5rem);
    line-height: 0.95;
    letter-spacing: -0.055em;
  }

  h2 {
    font-size: clamp(1.75rem, 4vw, 3rem);
    letter-spacing: -0.035em;
  }

  h3 {
    margin-bottom: 0.35rem;
    font-size: var(--text-performance-h3);
  }

  .lede,
  .group-heading p {
    max-width: 62ch;
    color: var(--color-performance-fg-secondary);
    line-height: 1.6;
  }

  .lede {
    font-size: var(--text-performance-body-lg);
  }

  .notice {
    margin-top: 1rem;
    padding: 0.75rem 1rem;
    background: var(--color-performance-bg-surface);
    color: var(--color-performance-fg-secondary);
  }

  .section-heading,
  .asset-group,
  .system-grid {
    margin-bottom: clamp(2rem, 5vw, 4rem);
  }

  .group-heading {
    margin-bottom: 1rem;
  }

  .asset-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1px;
    background: var(--color-performance-border-default);
    border: 1px solid var(--color-performance-border-default);
  }

  .asset-card {
    display: grid;
    grid-template-columns: minmax(8rem, 0.9fr) minmax(10rem, 1.1fr);
    min-height: 12rem;
    background: var(--color-performance-bg-pure);
    color: var(--color-performance-fg-primary);
    text-decoration: none;
  }

  .asset-card:focus-visible,
  .asset-card:hover {
    outline: 2px solid var(--color-performance-focus);
    outline-offset: -2px;
  }

  .asset-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 10rem;
    padding: 1.5rem;
  }

  .asset-preview.dark {
    background: #000;
  }

  .asset-preview.light {
    background: #fff;
  }

  .asset-preview img {
    max-width: 100%;
    max-height: 5rem;
  }

  .asset-preview img.lockup {
    max-height: 4rem;
  }

  .asset-preview img.wordmark {
    max-height: 2rem;
  }

  .asset-copy {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.4rem;
    padding: 1.25rem;
  }

  .asset-copy > span:not(.download-label) {
    color: var(--color-performance-fg-muted);
    font-size: var(--text-performance-body-sm);
  }

  .download-label {
    margin-top: 0.6rem;
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
  }

  .system-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) minmax(16rem, 0.5fr);
    gap: clamp(2rem, 5vw, 4rem);
  }

  .token-list {
    border-top: 1px solid var(--color-performance-border-default);
  }

  .token-card {
    display: grid;
    grid-template-columns: 4rem minmax(0, 1fr) auto;
    gap: 1rem;
    align-items: center;
    padding: 1rem 0;
    border-bottom: 1px solid var(--color-performance-border-default);
  }

  .swatches {
    display: grid;
    grid-template-columns: 1fr 1fr;
    height: 3rem;
    border: 1px solid var(--color-performance-border-default);
  }

  .token-copy {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 0.2rem;
  }

  .token-copy code,
  .token-copy span {
    font-size: var(--text-performance-caption);
    color: var(--color-performance-fg-muted);
  }

  .token-copy code {
    overflow-wrap: anywhere;
  }

  .token-card button,
  .handoff a {
    border: 1px solid var(--color-performance-border-emphasis);
    background: transparent;
    color: var(--color-performance-fg-primary);
    padding: 0.65rem 0.8rem;
    font: inherit;
    font-size: var(--text-performance-body-sm);
    cursor: pointer;
  }

  .type-card {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 1rem 0;
    border-top: 1px solid var(--color-performance-border-default);
  }

  .type-card strong {
    font-size: var(--text-performance-h3);
  }

  .type-card span {
    color: var(--color-performance-fg-muted);
    font-size: var(--text-performance-body-sm);
  }

  .sans {
    font-family: var(--font-performance-sans);
  }

  .mono {
    font-family: var(--font-performance-mono);
  }

  .receipt {
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) minmax(16rem, 0.5fr);
    gap: clamp(2rem, 6vw, 5rem);
  }

  .receipt ul {
    padding-left: 1.2rem;
    color: var(--color-performance-fg-secondary);
    line-height: 1.7;
  }

  .handoff {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .handoff a {
    display: block;
    width: 100%;
    box-sizing: border-box;
    text-decoration: none;
  }

  @media (max-width: 760px) {
    .asset-grid,
    .system-grid,
    .receipt {
      grid-template-columns: 1fr;
    }

    .asset-card {
      grid-template-columns: 1fr;
    }

    .token-card {
      grid-template-columns: 3rem minmax(0, 1fr);
    }

    .token-card button {
      grid-column: 2;
      justify-self: start;
    }
  }
</style>

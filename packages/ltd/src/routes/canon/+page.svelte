<script lang="ts">
  import {
    CanonCollectionRail,
    CanonIndexOpening,
    type CanonCollectionItem
  } from '$lib/components';
  import {
    PerformanceNarrativeStage,
    SEO,
    type PerformanceNarrativeScene
  } from '@create-something/canon';

  const canonCollections: CanonCollectionItem[] = [
    {
      eyebrow: 'Start here',
      title: 'Foundations',
      detail:
        'Colors, typography, spacing, and motion tokens you can copy directly into your project.',
      href: '/canon/foundations/colors',
      points: ['Color', 'Type', 'Space', 'Motion']
    },
    {
      eyebrow: 'Build',
      title: 'Components',
      detail: 'Ready-to-use buttons, cards, navigation, and form elements with code examples.',
      href: '/canon/components',
      points: ['Clear components', 'Content', 'Data', 'Feedback']
    },
    {
      eyebrow: 'Compose',
      title: 'Patterns',
      detail: 'How to handle forms, loading states, and navigation across your application.',
      href: '/canon/patterns',
      points: ['Forms', 'Loading', 'Accessibility']
    },
    {
      eyebrow: 'Understand',
      title: 'Philosophy',
      detail: 'Why we made these choices. The principles that guide every design decision.',
      href: '/canon/foundations/philosophy',
      points: ['Less, but better', 'Tool transparency', 'The whole']
    }
  ];

  const doctrineScenes: PerformanceNarrativeScene[] = [
    {
      id: 'decide',
      label: 'Decide',
      summary: 'Use three subtractive questions.',
      title: 'How we decide what stays.',
      detail: 'Before adding to Canon, test duplication, purpose, and connection to the whole.',
      tone: 'review',
      evidence: [
        'Unify existing work',
        'Remove unjustified elements',
        'Reconnect every part to the system'
      ]
    },
    {
      id: 'tokens',
      label: 'Tokens',
      summary: 'Make the decision reusable.',
      title: 'Spacing and color carry the same judgment.',
      detail:
        'The golden-ratio spacing scale and functional color hierarchy turn philosophy into repeatable interface choices.',
      tone: 'allow',
      evidence: [
        'Golden-ratio spacing',
        'Functional color hierarchy',
        'Shared performance vocabulary'
      ],
      actions: [{ label: 'Inspect all tokens', href: '/canon/resources/tokens' }]
    }
  ];
</script>

<SEO
  title="Canon"
  description="Everything you need to build interfaces that feel right. Colors, typography, components, and the thinking behind each decision."
  propertyName="ltd"
  breadcrumbs={[
    { name: 'Home', url: 'https://createsomething.ltd' },
    { name: 'Canon', url: 'https://createsomething.ltd/canon' }
  ]}
/>

<CanonIndexOpening
  current="canon"
  title="Canon"
  description="Everything you need to build interfaces that feel right: the foundations, components, patterns, and judgment behind each decision."
  recommendation={{
    label: 'Begin with Foundations',
    detail:
      'Start with the shared tokens before choosing a component or inventing another pattern.',
    href: '/canon/foundations/colors'
  }}
/>

<CanonCollectionRail
  id="canon-working-surfaces"
  title="Choose a working surface."
  description="Each source has one job. Start with foundations, then move to components, composition patterns, or the governing philosophy."
  items={canonCollections}
  columns={4}
/>

<PerformanceNarrativeStage
  id="canon-operating-doctrine"
  eyebrow="One doctrine"
  title="Use the system, then test the whole."
  description="Weniger, aber besser — less, but better — becomes useful when it changes what the team keeps and how the interface behaves."
  scenes={doctrineScenes}
  ariaLabel="Canon operating doctrine"
>
  {#snippet artifact(scene)}
    {#if scene.id === 'decide'}
      <div class="decision-artifact">
        <blockquote>
          <p>“Weniger, aber besser”</p>
          <cite>— Dieter Rams (Less, but better)</cite>
        </blockquote>
        <div class="triad-grid">
          <article>
            <span>First · Unify</span>
            <strong>Does it already exist?</strong>
            <p>If we have built something similar, combine the work into one source.</p>
          </article>
          <article>
            <span>Second · Remove</span>
            <strong>Does it earn its place?</strong>
            <p>Every element needs a clear purpose. Decoration without function gets cut.</p>
          </article>
          <article>
            <span>Third · Reconnect</span>
            <strong>Does it fit the whole?</strong>
            <p>Each piece should work with everything else. If it does not, rethink it.</p>
          </article>
        </div>
      </div>
    {:else}
      <div class="token-artifact">
        <article>
          <span>Spacing Scale</span>
          <div class="spacing-demo" aria-label="Golden ratio spacing scale">
            <i style="--size: 0.382rem">xs</i>
            <i style="--size: 0.618rem">sm</i>
            <i style="--size: 1rem">md</i>
            <i style="--size: 1.618rem">lg</i>
            <i style="--size: 2.618rem">xl</i>
          </div>
        </article>
        <article>
          <span>Color Hierarchy</span>
          <div class="color-demo" aria-label="Functional color hierarchy">
            <i style="--tone: var(--color-performance-ink, #090909)">Ink</i>
            <i style="--tone: var(--color-performance-muted, #5e6268)">Muted</i>
            <i style="--tone: var(--color-performance-line, #d7d7d2)">Line</i>
            <i style="--tone: var(--color-performance-panel, #fff)">Panel</i>
          </div>
        </article>
      </div>
    {/if}
  {/snippet}
</PerformanceNarrativeStage>

<style>
  .decision-artifact,
  .token-artifact {
    min-width: 0;
  }

  .decision-artifact {
    display: grid;
    gap: 1rem;
  }

  blockquote {
    display: grid;
    gap: 0.35rem;
    margin: 0;
    padding: 1rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-ink, #090909);
    color: #fff;
  }

  blockquote p,
  blockquote cite {
    margin: 0;
  }

  blockquote p {
    font-size: clamp(1.5rem, 3vw, 2.4rem);
  }

  blockquote cite,
  .triad-grid span,
  .token-artifact article > span {
    font-family: var(--font-performance-mono);
    font-size: 0.7rem;
    font-style: normal;
    text-transform: uppercase;
  }

  .triad-grid,
  .token-artifact {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .triad-grid article,
  .token-artifact article {
    display: grid;
    align-content: start;
    gap: 0.65rem;
    min-width: 0;
    padding: 1rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-panel, #fff);
  }

  .triad-grid strong {
    font-size: 1.05rem;
    font-weight: var(--font-performance-medium, 500);
  }

  .triad-grid p {
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.9rem;
    line-height: 1.45;
  }

  .token-artifact {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .spacing-demo,
  .color-demo {
    display: flex;
    min-width: 0;
    align-items: end;
    gap: 0.45rem;
    overflow-x: auto;
  }

  .spacing-demo i {
    display: grid;
    width: calc(1.5rem + var(--size));
    height: calc(1.5rem + var(--size));
    flex: 0 0 auto;
    place-items: center;
    border: 1px solid var(--color-performance-line-strong, #9c9c96);
    font-family: var(--font-performance-mono);
    font-size: 0.62rem;
    font-style: normal;
  }

  .color-demo i {
    display: grid;
    width: 4rem;
    height: 4rem;
    flex: 0 0 auto;
    place-items: end start;
    padding: 0.35rem;
    border: 1px solid var(--color-performance-line-strong, #9c9c96);
    background: var(--tone);
    color: var(--color-performance-ink, #090909);
    font-family: var(--font-performance-mono);
    font-size: 0.6rem;
    font-style: normal;
    mix-blend-mode: difference;
  }

  @media (max-width: 720px) {
    .triad-grid,
    .token-artifact {
      grid-template-columns: 1fr;
    }
  }
</style>

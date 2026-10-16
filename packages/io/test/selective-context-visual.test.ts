import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import ArtifactVisualSummary from '../../canon/src/lib/domains/io/ArtifactVisualSummary.svelte';
import { getFileBasedPaper } from '../src/lib/config/fileBasedPapers';
import { defineArtifactVisuals } from '../src/lib/config/visualCommunication';

describe('research diagrams preserve the textual explanation', () => {
  it('renders the synthetic context diagram with source and projection dates', () => {
    const visual = getFileBasedPaper('selective-context')!.visual_summary!;
    const { body } = render(ArtifactVisualSummary, { props: { visual } });
    expect(body).toContain('<svg');
    expect(body).toContain('static-diagram');
    expect(body).not.toContain('<animate');
    expect(body).toContain('Observed Oct 1');
    expect(body).toContain('Rebuilt Oct 15');
    expect(body).toContain('Still inspect');
    expect(body).toContain('When were the underlying facts checked?');
    expect(body).toContain('Does the local index match its inputs?');
    expect(body).toContain('role="list"');
  });

  it('keeps diagrams optional for existing summaries and never generates an image', () => {
    const definition = defineArtifactVisuals({ kind: 'flow', title: 'Existing summary',
      nodes: [{ label: 'Read', detail: 'Inspect source evidence.' }],
      subject: 'A source', motifs: ['receipt'], alt: 'A receipt' });
    const { body } = render(ArtifactVisualSummary, { props: { visual: definition.visual_summary } });
    expect(body).not.toContain('<svg');
    expect(body).toContain('Inspect source evidence.');
    expect(definition.generated_brand_image.status).toBe('prompt-only');
  });
});

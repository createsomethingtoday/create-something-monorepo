// @vitest-environment node
import { readFileSync } from 'node:fs';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import PerformanceNarrativeStage from './PerformanceNarrativeStage.svelte';

const componentSource = readFileSync(
  new URL('./PerformanceNarrativeStage.svelte', import.meta.url),
  'utf8'
);

describe('PerformanceNarrativeStage SSR', () => {
  it('renders every complete scene in document order before JavaScript enhances it', () => {
    const { body } = render(PerformanceNarrativeStage, {
      props: {
        id: 'workflow-story',
        title: 'Map. Decide. Prove.',
        scenes: [
          {
            id: 'map',
            label: 'Map',
            summary: 'Boundary visible',
            title: 'See the whole workflow.',
            detail: 'Name the systems, owner, risk, and proof before implementation.'
          },
          {
            id: 'decide',
            label: 'Decide',
            summary: 'Authority routed',
            title: 'Keep consequential judgment.',
            detail: 'Safe work runs and exceptions reach a named operator.'
          },
          {
            id: 'prove',
            label: 'Prove',
            summary: 'Receipt attached',
            title: 'Leave an inspectable wake.',
            detail: 'Source evidence, policy, action, and recovery remain connected.'
          }
        ]
      }
    });

    expect(body.match(/role="tabpanel"/g)).toHaveLength(3);
    expect(body).not.toContain(' hidden');
    expect(body.indexOf('See the whole workflow.')).toBeLessThan(
      body.indexOf('Keep consequential judgment.')
    );
    expect(body.indexOf('Keep consequential judgment.')).toBeLessThan(
      body.indexOf('Leave an inspectable wake.')
    );
  });

  it('lets every unenhanced panel contribute to document height', () => {
    expect(componentSource).toMatch(
      /data-enhanced='false'[\s\S]*?performance-narrative-stage__panel[\s\S]*?min-height:\s*0/
    );
  });
});

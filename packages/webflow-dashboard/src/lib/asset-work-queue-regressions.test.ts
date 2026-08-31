import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const assetWorkQueueSource = readFileSync(
  new URL('./components/AssetWorkQueue.svelte', import.meta.url),
  'utf8'
);

describe('asset work queue disclosure regressions', () => {
  it('starts collapsed and exposes an explicit accessible disclosure control', () => {
    expect(assetWorkQueueSource).toContain('let isExpanded = $state(false);');
    expect(assetWorkQueueSource).toContain('aria-expanded={isExpanded}');
    expect(assetWorkQueueSource).toContain('aria-controls="asset-work-queue-content"');
    expect(assetWorkQueueSource).toContain('role="heading"');
    expect(assetWorkQueueSource).toContain('aria-level="2"');
    expect(assetWorkQueueSource).toContain(
      "aria-label={`${isExpanded ? 'Collapse' : 'Expand'} portfolio triage. ${items.length} ${items.length === 1 ? 'asset has' : 'assets have'} a next action.`}"
    );
    expect(assetWorkQueueSource).toContain('onclick={() => (isExpanded = !isExpanded)}');
    expect(assetWorkQueueSource).toContain('{#if isExpanded}');
    expect(assetWorkQueueSource).toContain('id="asset-work-queue-content"');
  });

  it('keeps the actionable count visible without persisting disclosure state', () => {
    expect(assetWorkQueueSource).toContain(
      "{items.length === 1 ? 'asset has' : 'assets have'} a next action."
    );
    expect(assetWorkQueueSource).not.toContain('localStorage');
    expect(assetWorkQueueSource).not.toContain('sessionStorage');
  });
});

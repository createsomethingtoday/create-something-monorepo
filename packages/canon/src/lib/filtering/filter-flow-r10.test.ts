import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
const panel=readFileSync(new URL('./FilterTogglePanel.svelte',import.meta.url),'utf8');
const flow=readFileSync(new URL('../interactive/IntegrationFlow.svelte',import.meta.url),'utf8');
it('names price controls and exposes collapse state',()=>{expect(panel).toContain('aria-label="Minimum price"');expect(panel).toContain('aria-label="Maximum price"');expect(panel).toContain('aria-expanded={isExpanded}');});
it('uses visible wrapping labels and comfortable focusable targets',()=>{expect(panel.match(/<label class="toggle-row">/g)).toHaveLength(3);expect(panel).toContain('min-height: 44px');expect(panel).toContain(':focus-visible');});
it('owns a semantic solid flow by default while retaining glass opt in',()=>{expect(flow).toContain("glassMode === 'solid'");expect(flow).toContain('class="solid-flow ');expect(flow).toContain('class="service-name"');expect(flow).toContain('role="listitem"');expect(flow).toContain('var(--color-performance-bg-subtle)');expect(flow).not.toContain('rgba(255, 255, 255');});

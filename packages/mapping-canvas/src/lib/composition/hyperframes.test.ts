import { describe, expect, it } from 'vitest';
import { createDocument } from './model';
import { handoff, parseHandoff, sequences } from './motion';
import { unzipSync, strFromU8 } from 'fflate';
import { exportHyperframesBundle, exportHyperframes, validateFrames } from './hyperframes';

describe('offline HyperFrames export contract', () => {
  it.each(['context', 'detail'] as const)('binds %s to its validated composition and finite paused timeline', async (id) => {
    const packet = await handoff(createDocument());
    const html = await exportHyperframes(JSON.stringify(packet), id, Array(4).fill('<div>Scripted Canon fixture</div>'));
    expect(html).toContain(`data-composition-id="draw-${id}"`);
    expect(html).toContain('data-duration="18"');
    expect(html).toContain('gsap.timeline({paused:true})');
    expect(html).toContain(`window.__timelines['draw-${id}']=timeline`);
    expect(html).toContain(packet.compositionSha256);
    expect(html).toContain("connect-src 'none'");
    expect(html).not.toMatch(/<script\s+src=/i);
    expect(html).toContain('camera cuts');
  });
  it('packages only fixed local assets and binds the original validated handoff', async () => {
    const packet = JSON.stringify(await handoff(createDocument()));
    const files = unzipSync(await exportHyperframesBundle(packet, 'context', Array(4).fill('<div>scripted</div>')));
    expect(Object.keys(files).sort()).toEqual(['README.txt', 'assets/gsap.min.js', 'draw-handoff.json', 'hyperframes.json', 'index.html']);
    expect(strFromU8(files['index.html'])).toContain('<script src="assets/gsap.min.js"></script>');
    expect(strFromU8(files['index.html'])).not.toContain('Math.random()');
    expect(strFromU8(files['assets/gsap.min.js'])).toContain('GSAP 3.14.2');
    expect(strFromU8(files['draw-handoff.json'])).toBe(packet);
  });
  it('refuses digest substitution before compiling motion', async () => {
    const packet = await handoff(createDocument());
    packet.composition.content.title = 'Substituted';
    await expect(exportHyperframes(JSON.stringify(packet), 'context', Array(4).fill('<div>fixture</div>'))).rejects.toThrow('digest');
  });
  it.each(['<script>alert(1)</script>', '<div onclick="evil()">x</div>', '<div><img src="https://example.invalid/x"></div>', '<div style="background:url(https://example.invalid)">x</div>'])('rejects active frame content', (html) => {
    expect(() => validateFrames(sequences(createDocument())[0], Array(4).fill(html))).toThrow();
  });
  it('requires one frame for every beat and bounds frame size', () => {
    const seq = sequences(createDocument())[0];
    expect(() => validateFrames(seq, ['<div>x</div>'])).toThrow();
    expect(() => validateFrames(seq, Array(4).fill('<div>' + 'x'.repeat(4_000_000) + '</div>'))).toThrow();
  });
  it('still reads the earlier DOM-only handoff without claiming it was rendered', async () => {
    const packet = { ...await handoff(createDocument()), hyperframes: { status: 'adapter-not-implemented' } };
    expect((await parseHandoff(JSON.stringify(packet))).hyperframes.status).toBe('adapter-not-implemented');
  });
});

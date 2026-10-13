import { zipSync, strToU8 } from 'fflate';
import gsapSource from '../../../../agency/static/films/forms/assets/gsap.min.js?raw';
import { parseHandoff, type Sequence } from './motion';

export const HYPERFRAMES_ADAPTER = 'draw.canon-snapshot.v1';
const tags = new Set('div span p h1 h2 h3 h4 h5 h6 form input textarea button label svg path circle rect line polyline polygon g title desc aside section main strong small br output'.split(' '));

/** Freeze only the scripted Canon subtree, never the interactive form or page.
 * Styles are computed from the live Canon components, not a second stylesheet.
 */
export function captureCanonFrame(viewport: HTMLElement, expectedState: string): string {
  if (viewport.querySelector('form')?.dataset.state !== expectedState || !viewport.querySelector('form[inert]')) {
    throw Error('Scripted Canon frame has not settled.');
  }
  const clone = viewport.cloneNode(true) as HTMLElement;
  const originals = [viewport, ...viewport.querySelectorAll<HTMLElement>('*')];
  const copies = [clone, ...clone.querySelectorAll<HTMLElement>('*')];
  if (originals.length > 400) throw Error('Rendered frame exceeds the adapter limit.');
  originals.forEach((original, index) => {
    const copy = copies[index];
    if (!tags.has(original.tagName.toLowerCase())) throw Error('Unsupported element in Canon frame.');
    for (const attribute of [...copy.attributes]) {
      if (/^on/i.test(attribute.name) || ['src', 'srcset', 'href', 'xlink:href', 'action', 'formaction'].includes(attribute.name)) {
        throw Error('Active content is not allowed in a frame.');
      }
    }
    const computed = getComputedStyle(original);
    copy.removeAttribute('style');
    for (const property of computed) {
      if (property.startsWith('--') || /^(animation|transition)/.test(property)) continue;
      const value = computed.getPropertyValue(property);
      if (/url\s*\(/i.test(value)) throw Error('External or referenced assets are not supported by this adapter.');
      copy.style.setProperty(property, value);
    }
    copy.style.setProperty('animation', 'none', 'important');
    copy.style.setProperty('transition', 'none', 'important');
    if (original instanceof HTMLInputElement) copy.setAttribute('value', original.value);
    if (original instanceof HTMLTextAreaElement) copy.textContent = original.value;
  });
  clone.style.margin = '0';
  return clone.outerHTML;
}

export function validateFrames(sequence: Sequence, frames: string[]) {
  if (frames.length !== sequence.beats.length) throw Error('Every beat needs an exact rendered frame.');
  for (const html of frames) {
    if (typeof html !== 'string' || html.length > 4_000_000 || !html.startsWith('<div') || /<(script|iframe|object|embed|link|style|img|video|audio)\b|\son[a-z]+\s*=|\b(?:src|href|action)\s*=|url\s*\(/i.test(html)) {
      throw Error('Unsafe or oversized rendered frame.');
    }
  }
}

/** Internal export boundary. Frames must come from captureCanonFrame in this app. */
export async function exportHyperframes(packetText: string, sequenceId: 'context' | 'detail', frames: string[]) {
  const packet = await parseHandoff(packetText);
  const sequence: Sequence = packet.sequences.find((s: Sequence) => s.id === sequenceId);
  if (!sequence) throw Error('Unknown camera sequence.');
  validateFrames(sequence, frames);
  const id = `draw-${sequence.id}`;
  const metadata = JSON.stringify({ adapter: HYPERFRAMES_ADAPTER, compositionSha256: packet.compositionSha256, source: packet.composition.source, sequence, renderer: packet.renderer, gsap: '3.14.2', mode: 'scripted Canon snapshots; deterministic camera cuts; no live form entries' }).replace(/</g, '\\u003c');
  const clips = frames.map((html, i) => {
    return `<div id="frame-${i}" class="snapshot" style="position:absolute;inset:0;display:${i === 0 ? 'block' : 'none'}">${html}</div>`;
  }).join('');
  const steps = sequence.beats.slice(1).map((beat, i) => `timeline.set('#frame-${i}',{display:'none'},${beat.time});timeline.set('#frame-${i + 1}',{display:'block'},${beat.time});`).join('\n');
  // Only trusted repository-owned GSAP/code executes. User copy stays in escaped DOM text.
  const runtime = gsapSource.replace(/\/\/# sourceMappingURL=.*$/gm, '');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=1200"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'"><title>Draw ${sequence.id} — local scripted demonstration</title><style>html,body{margin:0;width:1200px;height:900px;overflow:hidden}#root{position:relative;width:1200px;height:900px;overflow:hidden}</style></head><body><div id="root" data-composition-id="${id}" data-start="0" data-duration="${sequence.duration}" data-width="1200" data-height="900" data-fps="30" inert>${clips}</div><script type="application/json" id="draw-handoff">${metadata}</script><script>${runtime}</script><script>const timeline=gsap.timeline({paused:true});${steps}timeline.to({}, {duration:${sequence.duration}},0);window.__timelines=window.__timelines||{};window.__timelines['${id}']=timeline;</script></body></html>`;
}

/** HyperFrames treats vendor code as an external local asset, matching its own
 * authoring contract. Keep the library unmodified and ship it with the HTML. */
export async function exportHyperframesBundle(packetText: string, sequenceId: 'context' | 'detail', frames: string[]) {
  const html = await exportHyperframes(packetText, sequenceId, frames);
  const runtime = gsapSource.replace(/\/\/# sourceMappingURL=.*$/gm, '');
  const entry = html.replace(`<script>${runtime}</script>`, '<script src="assets/gsap.min.js"></script>').replace("script-src 'unsafe-inline'", "script-src 'self' 'unsafe-inline'");
  return zipSync({
    'index.html': strToU8(entry),
    'assets/gsap.min.js': strToU8(runtime),
    'hyperframes.json': strToU8(JSON.stringify({ version: 1 })),
    'draw-handoff.json': strToU8(packetText),
    'README.txt': strToU8('Draw local scripted Canon handoff. Extract this folder, then run HyperFrames against it. No live form entries; no remote assets. Camera cuts, not interpolated motion. Not an encoded video. GSAP license is retained in assets/gsap.min.js.\n')
  }, { level: 6 });
}

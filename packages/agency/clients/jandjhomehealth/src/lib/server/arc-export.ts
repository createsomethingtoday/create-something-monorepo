import type { ArcDocument } from '@create-something/arc/model';
import type { ArcReceipt } from './arc-store';

export type ArcExportRoute = 'app-review-governance-arc' | 'app-review-governance-playbook' | 'app-review-governance-runbook';

const allowedRoutes = new Set<ArcExportRoute>([
  'app-review-governance-arc',
  'app-review-governance-playbook',
  'app-review-governance-runbook'
]);

export function parseArcExportRoute(value: string | null): ArcExportRoute {
  return allowedRoutes.has(value as ArcExportRoute)
    ? (value as ArcExportRoute)
    : 'app-review-governance-arc';
}

function scenesFor(document: ArcDocument, routeId: ArcExportRoute) {
  const route = document.composition.routes.find((candidate) => candidate.id === routeId);
  if (!route) throw new Error(`Arc route not found: ${routeId}.`);
  return {
    route,
    scenes: route.sceneIds.flatMap((sceneId) => {
      if (document.sceneMeta[sceneId]?.hidden) return [];
      const scene = document.composition.scenes.find((candidate) => candidate.id === sceneId);
      return scene ? [scene] : [];
    })
  };
}

function html(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderArcWebExport(document: ArcDocument, routeId: ArcExportRoute, receipt?: ArcReceipt): string {
  const { route, scenes } = scenesFor(document, routeId);
  const slides = scenes.map((scene, index) => {
    const mediaId = scene.presentation.media?.artifactId;
    const media = mediaId ? document.composition.artifacts.find((artifact) => artifact.id === mediaId) : undefined;
    const image = media?.provenance.source.startsWith('data:image/')
      ? `<figure><img src="${html(media.provenance.source)}" alt="${html(media.provenance.alt)}"><figcaption>${html(scene.presentation.media?.caption)}</figcaption></figure>`
      : media
        ? `<aside><strong>Media evidence</strong><p>${html(media.provenance.alt)}</p><small>${html(media.provenance.rights)}</small></aside>`
        : '';
    const capabilities = (scene.presentation.capabilities ?? []).map((item) => `<li><strong>${html(item.title)}</strong><p>${html(item.can)}</p><small>Produces: ${html(item.produces)} · Boundary: ${html(item.boundary)}</small></li>`).join('');
    return `<section class="slide" id="${html(scene.id)}"><header><span>${String(index + 1).padStart(2, '0')} / ${String(scenes.length).padStart(2, '0')} · ${html(scene.label)}</span><em>${html(scene.presentation.reader.takeaway)}</em></header><div class="copy"><h2>${html(scene.presentation.reader.heading)}</h2><p>${html(scene.presentation.reader.explanation)}</p></div>${image}${capabilities ? `<ul>${capabilities}</ul>` : ''}<footer>${html(document.sceneMeta[scene.id]?.notes || scene.detail)}</footer></section>`;
  }).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${html(route.title)}</title><style>*{box-sizing:border-box}html{scroll-snap-type:y mandatory;background:#f4f0e8;color:#15130f;font-family:Arial,sans-serif}body{margin:0}.slide{min-height:100svh;padding:clamp(1.25rem,5vw,5rem);display:grid;grid-template-rows:auto 1fr auto;gap:2rem;scroll-snap-align:start;border-bottom:1px solid #aaa49a;background:linear-gradient(90deg,rgba(9,9,9,.055) 1px,transparent 1px) 0 0/3.75rem 3.75rem,#f4f0e8}.slide>header{display:flex;justify-content:space-between;gap:1rem;font:650 .72rem/1.3 ui-monospace,monospace;text-transform:uppercase}.copy{align-self:center;max-width:72rem}.copy h2{margin:0 0 1.5rem;font:500 clamp(3rem,8vw,8rem)/.93 Georgia,serif;letter-spacing:-.05em}.copy p{max-width:58rem;font-size:clamp(1rem,2vw,1.5rem);line-height:1.5}figure{margin:0;display:grid;gap:.5rem}img{max-width:100%;max-height:42vh;object-fit:contain}ul{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:1px;margin:0;padding:1px;background:#aaa49a;list-style:none}li,aside{padding:1rem;background:#fffdf8}footer,small,figcaption{font:.72rem/1.4 ui-monospace,monospace;color:#5f5a52}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}</style></head><body data-arc-id="${html(document.id)}" data-revision="${document.revision}" data-receipt-id="${html(receipt?.id ?? 'not-recorded')}">${slides}</body></html>`;
}

function ascii(value: string): string {
  return value.normalize('NFKD').replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
}

function pdfText(value: string): string {
  return ascii(value).replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
}

function wrap(value: string, width = 82): string[] {
  const words = ascii(value).split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (!line) line = word;
    else if (`${line} ${word}`.length <= width) line += ` ${word}`;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

export function renderArcPdfExport(document: ArcDocument, routeId: ArcExportRoute, receipt?: ArcReceipt): ArrayBuffer {
  const { route, scenes } = scenesFor(document, routeId);
  const encoder = new TextEncoder();
  const objects: string[] = ['', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  const pageRefs: string[] = [];

  scenes.forEach((scene, index) => {
    const pageObject = objects.length + 1;
    const contentObject = objects.length + 2;
    pageRefs.push(`${pageObject} 0 R`);
    const lines = [
      `${String(index + 1).padStart(2, '0')} / ${String(scenes.length).padStart(2, '0')} - ${scene.label}`,
      '',
      ...wrap(scene.presentation.reader.heading, 54),
      '',
      ...wrap(scene.presentation.reader.explanation),
      '',
      `Takeaway: ${scene.presentation.reader.takeaway}`,
      ...scene.evidence.flatMap((item) => wrap(`Evidence: ${item}`)),
      '',
      `Arc ${document.id} - revision ${document.revision} - ${document.status}`,
      `Receipt ${receipt?.id ?? 'not-recorded'} - route ${route.id}`
    ].slice(0, 27);
    const commands = lines.map((line, lineIndex) => lineIndex === 0
      ? `(${pdfText(line)}) Tj`
      : `0 -24 Td (${pdfText(line)}) Tj`).join('\n');
    const stream = `BT\n/F1 14 Tf\n54 738 Td\n${commands}\nET`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObject} 0 R >>`);
    objects.push(`<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`);
  });

  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[1] = `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pageRefs.length} >>`;

  let output = '%PDF-1.4\n% Arc governed export\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(encoder.encode(output).length);
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = encoder.encode(output).length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info << /Title (${pdfText(route.title)}) /Subject (Arc revision ${document.revision}; receipt ${pdfText(receipt?.id ?? 'not-recorded')}) >> >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return encoder.encode(output).buffer as ArrayBuffer;
}

export function renderArcJsonExport(document: ArcDocument, routeId: ArcExportRoute, receipt?: ArcReceipt) {
  const { route } = scenesFor(document, routeId);
  return {
    schema: 'create-something/arc-export@1',
    exportedAt: new Date().toISOString(),
    identity: { arcId: document.id, revision: document.revision, status: document.status, routeId: route.id, receiptId: receipt?.id ?? null },
    document
  };
}

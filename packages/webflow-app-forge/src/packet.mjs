// `wf-forge packet <project> <listing.json> [--out dir]`: assemble the
// submission packet. Runs the doctor and the listing kit, maps every registry
// requirement to what was established, prefills the submission form fields
// by their real names, and lists the gates only a person can close.
//
// It never submits. The form at developers.webflow.com/submit is the gate,
// and the submit click stays with the developer.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { runDoctor } from './doctor.mjs';
import { runListingKit } from './listing-kit.mjs';
import { coverage, loadRegistry } from './lib/registry.mjs';
import { renderText, sortFindings, summarize } from './lib/report.mjs';

export function buildPacket({ projectDir, listingPath }) {
  const doctor = runDoctor(projectDir);
  const listing = runListingKit(listingPath);
  const registry = loadRegistry();
  const findings = [...doctor.findings, ...listing.findings];

  const cov = coverage(findings);
  const humanGates = registry.requirements.filter((r) => r.enforcedBy.includes('human'));

  const l = listing.listing;
  const formFields = {
    submissionType: 'New',
    appName: l.appName || '',
    clientId: l.clientId || '',
    appCapabilities: 'Designer Extension',
    appAvatarAltText: l.icon?.altText || '',
    paymentType: Array.isArray(l.paymentType) ? l.paymentType : [l.paymentType].filter(Boolean),
    visibility: l.visibility || 'Public',
    appCategory: Array.isArray(l.categories) ? l.categories : [l.categories].filter(Boolean),
    creatorName: l.creatorName || '',
    appPreviewDescription: l.shortDescription || '',
    appDetailDescription: l.longDescription || '',
    appFeaturesOverview: Array.isArray(l.features) ? l.features : [],
    appWebsiteUrl: l.websiteUrl || '',
    testingSiteUrl: l.testingSiteUrl || '',
    appAccessCredentials: l.accessCredentials || '',
    appDemoVideoUrl: l.demoVideoUrl || '',
    appVideoUrl: l.promoVideoUrl || '',
    appDocumentationUrl: l.documentationUrl || '',
    appPrivacyPolicyUrl: l.privacyPolicyUrl || '',
    appTermsUrl: l.termsUrl || '',
    appSupportEmail: l.supportEmail || '',
    appSupportUrl: l.supportUrl || '',
    appDeveloperNotes: [l.developerNotes, l.pricingNotes].filter(Boolean).join('\n\n'),
    appScreenshotAltTexts: (l.screenshots || []).map((s) => s?.altText || ''),
    preflightReceipt: '',
    uploads: {
      appAvatarImage: l.icon?.path || '',
      appScreenshots: (l.screenshots || []).map((s) => s?.path || ''),
      bundleZip: doctor.bundle ? relative(process.cwd(), doctor.bundle.path) : '',
      sourceMapArtifact: doctor.bundle ? relative(process.cwd(), join(doctor.root, 'review-artifacts')) : '',
    },
  };

  const privacyOutline = [
    'What the App collects (be specific; "none" is a valid answer for a Designer Extension that makes no network requests).',
    'Where it is stored and for how long.',
    'How it is used, and whether any third party receives it (name the vendor).',
    'How a user withdraws consent or has data deleted.',
    'The contact for privacy questions (match the support email).',
  ];

  return {
    generatedAt: new Date().toISOString(),
    registryVersion: registry.version,
    summary: {
      doctor: summarize(doctor.findings),
      listing: summarize(listing.findings),
      overall: summarize(findings),
    },
    project: doctor.root,
    bundle: doctor.bundle ? { path: doctor.bundle.path, bytes: doctor.bundle.bytes, files: doctor.bundle.files } : null,
    formFields,
    humanGates: humanGates.map((r) => ({ id: r.id, title: r.title, provenance: r.provenance, severity: r.severity, note: r.note || '' })),
    privacyDisclosureOutline: privacyOutline,
    coverage: cov,
    findings: sortFindings(findings),
  };
}

export function writePacket(packet, outDir) {
  const out = resolve(outDir);
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'packet.json'), JSON.stringify(packet, null, 2) + '\n');
  writeFileSync(join(out, 'CHECKLIST.md'), renderChecklist(packet));
  return { out, files: ['packet.json', 'CHECKLIST.md'] };
}

export function renderChecklist(packet) {
  const s = packet.summary.overall;
  const lines = [];
  lines.push(`# Submission packet`);
  lines.push('');
  lines.push(`Generated ${packet.generatedAt.slice(0, 16).replace('T', ' ')} UTC against requirements registry ${packet.registryVersion}.`);
  lines.push('');
  lines.push(`**Automated checks:** ${s.ready ? 'ready' : 'not ready'}. ${s.blockers} blocker, ${s.required} required, ${s.warnings} suggested, ${s.passed} passed.`);
  lines.push('');
  lines.push('This packet does not submit anything. Work the human gates, run App Review Preflight on the exact bundle and source map, then fill the form at <https://developers.webflow.com/submit> from the field values below.');
  lines.push('');
  lines.push('## Human gates');
  lines.push('');
  for (const g of packet.humanGates) {
    lines.push(`- [ ] **${g.title}** (${g.severity}, ${g.provenance})${g.note ? ` — ${g.note}` : ''}`);
  }
  lines.push('');
  lines.push('## Privacy disclosure outline');
  lines.push('');
  lines.push('This tool does not write legal text. Give this outline to whoever owns the privacy policy and confirm each point is covered.');
  lines.push('');
  for (const p of packet.privacyDisclosureOutline) lines.push(`- ${p}`);
  lines.push('');
  lines.push('## Findings to fix');
  lines.push('');
  const open = packet.findings.filter((f) => f.status === 'fail' || f.status === 'warn');
  if (open.length === 0) lines.push('None.');
  for (const f of open) {
    lines.push(`- **${f.check}** [${f.severity}] ${f.title}${f.detail ? ` — ${f.detail}` : ''}`);
    for (const e of (f.evidence || []).slice(0, 5)) lines.push(`  - ${e}`);
  }
  lines.push('');
  lines.push('## Form fields');
  lines.push('');
  lines.push('Field names match the submission form (`wf-app-form-cloud`, contract app-governance-v4).');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  for (const [k, v] of Object.entries(packet.formFields)) {
    if (k === 'uploads') continue;
    const text = Array.isArray(v) ? v.join('; ') : String(v ?? '');
    lines.push(`| ${k} | ${escapeCell(text.length > 160 ? `${text.slice(0, 157)}...` : text)} |`);
  }
  lines.push('');
  lines.push('Uploads:');
  lines.push('');
  for (const [k, v] of Object.entries(packet.formFields.uploads)) lines.push(`- ${k}: ${Array.isArray(v) ? v.join(', ') : v || '(none)'}`);
  lines.push('');
  lines.push('## Requirement coverage');
  lines.push('');
  lines.push('| Requirement | Provenance | Severity | Status |');
  lines.push('| --- | --- | --- | --- |');
  for (const c of packet.coverage) lines.push(`| ${c.id} | ${c.provenance} | ${c.severity} | ${c.status} |`);
  lines.push('');
  return lines.join('\n');
}

function escapeCell(text) {
  return text.replace(/\|/g, '\\|').replace(/\n+/g, ' ');
}

export { renderText };

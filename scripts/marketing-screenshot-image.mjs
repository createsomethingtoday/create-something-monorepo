#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const CANVAS = { width: 1080, height: 1350 };
const SCREENSHOT_FRAME = { left: 72, top: 420, width: 936, height: 690 };

function usage() {
  return `Usage:
  pnpm marketing:image:screenshot -- \\
    --input <screenshot.png> \\
    --output-dir <directory> \\
    --slug <asset-slug> \\
    --redact <x,y,width,height> \\
    --headline <text> \\
    --dek <text> \\
    --proof <text> \\
    --owner <name> \\
    --review-status <draft|approved> \\
    --rights-note <text> \\
    --source-url <url> \\
    --checked-date <YYYY-MM-DD> \\
    --refresh-due <YYYY-MM-DD>

Coordinates are normalized from 0 to 1. Repeat --redact and --proof as needed.
Use --allow-unredacted only after confirming the screenshot contains no private,
personal, secret, or client-only information. Optional: --background <image>.`;
}

function takeValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value.`);
  return value;
}

function parseArgs(argv) {
  const args = { redactions: [], proofs: [], allowUnredacted: false };

  for (let index = 2; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--') continue;
    if (flag === '--help' || flag === '-h') return { help: true };
    if (flag === '--allow-unredacted') {
      args.allowUnredacted = true;
      continue;
    }

    const value = takeValue(argv, index, flag);
    index += 1;
    if (flag === '--input') args.input = value;
    else if (flag === '--output-dir') args.outputDir = value;
    else if (flag === '--slug') args.slug = value;
    else if (flag === '--redact') args.redactions.push(parseRegion(value));
    else if (flag === '--headline') args.headline = value;
    else if (flag === '--dek') args.dek = value;
    else if (flag === '--proof') args.proofs.push(value);
    else if (flag === '--owner') args.owner = value;
    else if (flag === '--review-status') args.reviewStatus = value;
    else if (flag === '--rights-note') args.rightsNote = value;
    else if (flag === '--source-url') args.sourceUrl = value;
    else if (flag === '--checked-date') args.checkedDate = value;
    else if (flag === '--refresh-due') args.refreshDue = value;
    else if (flag === '--background') args.background = value;
    else throw new Error(`Unknown argument: ${flag}`);
  }

  if (args.redactions.length === 0 && !args.allowUnredacted) {
    throw new Error(
      'At least one --redact region is required. Use --allow-unredacted only after a privacy review.'
    );
  }

  for (const field of [
    'input',
    'outputDir',
    'slug',
    'headline',
    'dek',
    'owner',
    'reviewStatus',
    'rightsNote',
    'sourceUrl',
    'checkedDate',
    'refreshDue'
  ]) {
    if (!args[field])
      throw new Error(
        `--${field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} is required.`
      );
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(args.slug)) {
    throw new Error('--slug must contain lowercase letters, numbers, and hyphens only.');
  }
  if (args.proofs.length === 0 || args.proofs.length > 3) {
    throw new Error('Provide between one and three --proof values.');
  }
  if (!['draft', 'approved'].includes(args.reviewStatus)) {
    throw new Error('--review-status must be draft or approved.');
  }
  for (const [flag, value] of [
    ['checked-date', args.checkedDate],
    ['refresh-due', args.refreshDue]
  ]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`--${flag} must use YYYY-MM-DD.`);
  }
  return args;
}

function parseRegion(value) {
  const values = value.split(',').map(Number);
  if (values.length !== 4 || values.some((item) => !Number.isFinite(item))) {
    throw new Error(`Invalid redaction region "${value}". Expected x,y,width,height.`);
  }
  const [x, y, width, height] = values;
  if (x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 1 || y + height > 1) {
    throw new Error(`Redaction region "${value}" must stay within normalized image bounds.`);
  }
  return { x, y, width, height };
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function wrapText(value, maxCharacters) {
  const words = value.trim().split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxCharacters && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function textLines(lines, { x, y, size, lineHeight, weight = 400, color = '#0a0e19' }) {
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" font-size="${size}" font-weight="${weight}" fill="${color}">${escapeXml(line)}</text>`
    )
    .join('\n');
}

async function sha256(filePath) {
  return createHash('sha256')
    .update(await readFile(filePath))
    .digest('hex');
}

async function redactSource(input, output, redactions) {
  const metadata = await sharp(input).metadata();
  if (!metadata.width || !metadata.height)
    throw new Error(`Unable to read image dimensions: ${input}`);

  if (redactions.length === 0) {
    await sharp(input).png().toFile(output);
    return { width: metadata.width, height: metadata.height };
  }

  const rectangles = redactions.map((region) => {
    const x = Math.round(region.x * metadata.width);
    const y = Math.round(region.y * metadata.height);
    const width = Math.max(1, Math.round(region.width * metadata.width));
    const height = Math.max(1, Math.round(region.height * metadata.height));
    const label =
      width >= 600 && height >= 120
        ? `<text x="${x + width / 2}" y="${y + height / 2}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="${Math.max(18, Math.min(32, Math.round(width / 25)))}" font-weight="700" letter-spacing="1.2" fill="#8d929d">REDACTED · PUBLIC MARKETING VIEW</text>`
        : '';
    return `<g><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="12" fill="#15171c" stroke="#30333b" stroke-width="2"/>${label}</g>`;
  });
  const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${metadata.width}" height="${metadata.height}">${rectangles.join('')}</svg>`;
  await sharp(input)
    .composite([{ input: Buffer.from(overlay) }])
    .png()
    .toFile(output);
  return { width: metadata.width, height: metadata.height };
}

function canvasSvg(args) {
  const headline = wrapText(args.headline, 29).slice(0, 2);
  const dek = wrapText(args.dek, 55).slice(0, 2);
  const chipWidth = Math.floor((936 - (args.proofs.length - 1) * 16) / args.proofs.length);
  const chips = args.proofs.map((proof, index) => {
    const x = 72 + index * (chipWidth + 16);
    return `<g>
      <rect x="${x}" y="1160" width="${chipWidth}" height="74" rx="8" fill="#ffffff" stroke="#d9dce3"/>
      <circle cx="${x + 24}" cy="1197" r="6" fill="#0048ff"/>
      <text x="${x + 40}" y="1205" font-size="18" font-weight="650" fill="#0a0e19">${escapeXml(proof)}</text>
    </g>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
    <style>text { font-family: Arial, Helvetica, sans-serif; }</style>
    <rect width="1080" height="1350" fill="#f4f4f1"/>
    <rect x="72" y="64" width="224" height="34" rx="17" fill="#0a0e19"/>
    <text x="92" y="87" font-size="14" font-weight="700" letter-spacing="1.4" fill="#ffffff">CREATE SOMETHING</text>
    ${textLines(headline, { x: 72, y: 172, size: 62, lineHeight: 68, weight: 700 })}
    ${textLines(dek, { x: 72, y: 330, size: 27, lineHeight: 38, color: '#4b4f58' })}
    <rect x="64" y="412" width="952" height="706" rx="18" fill="#0a0e19" opacity="0.13"/>
    <rect x="70" y="418" width="940" height="694" rx="14" fill="#ffffff" stroke="#d9dce3"/>
    ${chips.join('\n')}
    <text x="72" y="1300" font-size="16" font-weight="650" fill="#636363">SCREENSHOT EVIDENCE · CHECKED ${escapeXml(args.checkedDate)}</text>
    <text x="1008" y="1300" text-anchor="end" font-size="16" font-weight="650" fill="#0048ff">CREATE.SOMETHING</text>
  </svg>`;
}

async function composeLinkedIn(args, redactedPath, outputPath) {
  let base;
  if (args.background) {
    const wash = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><rect width="1080" height="1350" fill="rgba(244,244,241,0.88)"/></svg>'
    );
    base = sharp(args.background)
      .resize(CANVAS.width, CANVAS.height, { fit: 'cover' })
      .composite([{ input: wash }]);
  } else {
    base = sharp({ create: { ...CANVAS, channels: 4, background: '#f4f4f1' } });
  }

  const screenshot = await sharp(redactedPath)
    .resize(SCREENSHOT_FRAME.width, SCREENSHOT_FRAME.height, {
      fit: 'contain',
      background: '#111318'
    })
    .png()
    .toBuffer();
  await base
    .composite([
      { input: Buffer.from(canvasSvg(args)), left: 0, top: 0 },
      { input: screenshot, left: SCREENSHOT_FRAME.left, top: SCREENSHOT_FRAME.top }
    ])
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const outputDir = path.resolve(args.outputDir);
  await mkdir(outputDir, { recursive: true });
  const redactedPath = path.join(outputDir, `${args.slug}-redacted.png`);
  const linkedinPath = path.join(outputDir, `${args.slug}-linkedin.png`);
  const manifestPath = path.join(outputDir, `${args.slug}-manifest.json`);
  const sourceDimensions = await redactSource(
    path.resolve(args.input),
    redactedPath,
    args.redactions
  );
  await composeLinkedIn(args, redactedPath, linkedinPath);

  const manifest = {
    schemaVersion: 1,
    assetType: 'screenshot-annotation',
    surface: 'linkedin',
    generatedAt: new Date().toISOString(),
    renderer: 'sharp',
    generatedImage: false,
    evidenceContract:
      'Source pixels are preserved outside declared redactions; the public composition resizes but does not regenerate the evidence layer.',
    owner: args.owner,
    reviewStatus: args.reviewStatus,
    rightsNote: args.rightsNote,
    source: {
      file: path.basename(args.input),
      sha256: await sha256(path.resolve(args.input)),
      width: sourceDimensions.width,
      height: sourceDimensions.height
    },
    redactions: args.redactions,
    copy: { headline: args.headline, dek: args.dek, proofs: args.proofs },
    provenance: {
      sourceUrl: args.sourceUrl,
      checkedDate: args.checkedDate,
      refreshDue: args.refreshDue
    },
    outputs: {
      redacted: { file: path.basename(redactedPath), sha256: await sha256(redactedPath) },
      linkedin: { file: path.basename(linkedinPath), sha256: await sha256(linkedinPath), ...CANVAS }
    }
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        surface: 'linkedin',
        redactedPath,
        linkedinPath,
        manifestPath,
        sha256: manifest.outputs.linkedin.sha256
      },
      null,
      2
    )}\n`
  );
}

main().catch((error) => {
  process.stderr.write(`marketing:image:screenshot failed: ${error.message}\n\n${usage()}\n`);
  process.exitCode = 1;
});

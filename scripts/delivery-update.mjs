#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECTS_DIR = join(ROOT, 'config/delivery/projects');
const DEFAULT_OUT_DIR = join(ROOT, 'docs/deliveries');

function parseArgs(argv) {
  const args = {
    project: 'abundance',
    outDir: DEFAULT_OUT_DIR,
    date: new Date().toISOString().slice(0, 10),
    check: false,
    image2: false,
    forceImage2: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--project' && argv[i + 1]) {
      args.project = argv[i + 1];
      i += 1;
    } else if (arg === '--out' && argv[i + 1]) {
      args.outDir = resolve(ROOT, argv[i + 1]);
      i += 1;
    } else if (arg === '--date' && argv[i + 1]) {
      args.date = argv[i + 1];
      i += 1;
    } else if (arg === '--check') {
      args.check = true;
    } else if (arg === '--image2') {
      args.image2 = true;
    } else if (arg === '--force-image2') {
      args.image2 = true;
      args.forceImage2 = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/delivery-update.mjs --project abundance [--date YYYY-MM-DD] [--out docs/deliveries] [--check]

Generates a client-ready project update from config/delivery/projects/<project>.json.
The output includes Markdown plus repo-generated SVG evidence images.

Use --image2 to generate configured OpenAI gpt-image-2 images when OPENAI_API_KEY is available.`);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapText(text, maxLength = 46) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxLength && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines;
}

function loadProject(slug) {
  const path = join(PROJECTS_DIR, `${slug}.json`);
  if (!existsSync(path)) {
    throw new Error(`Delivery project not found: ${relative(ROOT, path)}`);
  }
  return { path, project: readJson(path) };
}

function resolveEvidencePath(evidencePath) {
  return resolve(ROOT, evidencePath);
}

function lineCount(path) {
  if (!existsSync(path) || statSync(path).isDirectory()) {
    return null;
  }
  return readFileSync(path, 'utf8').split(/\r?\n/).length;
}

function fileSummary(evidencePath) {
  const absolutePath = resolveEvidencePath(evidencePath);
  if (!existsSync(absolutePath)) {
    return {
      path: evidencePath,
      exists: false,
      kind: 'missing',
      details: 'missing',
    };
  }

  const stats = statSync(absolutePath);
  if (stats.isDirectory()) {
    const files = readdirSync(absolutePath, { recursive: true })
      .filter((entry) => {
        const entryPath = join(absolutePath, String(entry));
        return existsSync(entryPath) && statSync(entryPath).isFile();
      });

    return {
      path: evidencePath,
      exists: true,
      kind: 'directory',
      details: `${files.length} files`,
    };
  }

  const lines = lineCount(absolutePath);
  return {
    path: evidencePath,
    exists: true,
    kind: 'file',
    details: lines === null ? `${stats.size} bytes` : `${lines} lines`,
  };
}

function collectEvidence(project) {
  return project.components.flatMap((component) =>
    component.evidence.map((evidencePath) => ({
      component,
      ...fileSummary(evidencePath),
    })),
  );
}

function validateProject(project) {
  const errors = [];

  for (const field of ['slug', 'title', 'client', 'headline']) {
    if (!project[field]) {
      errors.push(`Missing required project field: ${field}`);
    }
  }

  const tiers = new Set(project.components?.map((component) => component.tier));
  for (const tier of ['Database', 'Automation', 'Judgment']) {
    if (!tiers.has(tier)) {
      errors.push(`Missing delivery tier component: ${tier}`);
    }
  }

  for (const evidence of collectEvidence(project)) {
    if (!evidence.exists) {
      errors.push(`Missing evidence path: ${evidence.path}`);
    }
  }

  return errors;
}

function gitLogFor(project) {
  const paths = project.recentChangePaths?.length
    ? project.recentChangePaths
    : [...new Set(project.components.flatMap((component) => component.evidence))];

  try {
    return execFileSync(
      'git',
      ['log', '--date=short', '--pretty=format:%h %ad %s', '--', ...paths],
      { cwd: ROOT, encoding: 'utf8' },
    )
      .split('\n')
      .filter(Boolean)
      .slice(0, 8);
  } catch (error) {
    return [`git log unavailable: ${error instanceof Error ? error.message : String(error)}`];
  }
}

function markdownLink(fromFile, targetPath, label = targetPath) {
  const absoluteTarget = resolve(ROOT, targetPath);
  const href = relative(dirname(fromFile), absoluteTarget).replaceAll('\\', '/');
  return `[${label}](${href})`;
}

function renderMarkdown(project, outputPath, imagePaths, date, image2PromptPaths = []) {
  const evidence = collectEvidence(project);
  const recentCommits = gitLogFor(project);

  const lines = [
    `# ${project.title} Project Update`,
    '',
    `**Client:** ${project.client}`,
    `**Audience:** ${project.audience}`,
    `**Generated:** ${date}`,
    '',
    project.headline,
    '',
    '## Client Summary',
    '',
    ...project.summary.flatMap((item) => [item, '']),
    '## DB, MCP, and Agent Map',
    '',
    '| Layer | Status | What changed | Evidence |',
    '| --- | --- | --- | --- |',
    ...project.components.map((component) => {
      const evidenceLinks = component.evidence
        .slice(0, 2)
        .map((evidencePath) => markdownLink(outputPath, evidencePath, evidencePath.split('/').slice(-2).join('/')))
        .join('<br>');
      return `| ${component.label} | ${component.status} | ${component.summary} | ${evidenceLinks} |`;
    }),
    '',
    '## Delivery Images',
    '',
    `![${project.imageSpecs[0]?.title ?? 'Delivery graph'}](${relative(dirname(outputPath), imagePaths.graph).replaceAll('\\', '/')})`,
    '',
    `![${project.imageSpecs[1]?.title ?? 'Evidence map'}](${relative(dirname(outputPath), imagePaths.evidence).replaceAll('\\', '/')})`,
    '',
    ...(image2PromptPaths.length > 0 ? [
      '### Image 2 Prompt Sources',
      '',
      `These image prompts target ${project.imageGeneration?.model ?? 'gpt-image-2'} and are stored with the delivery assets.`,
      '',
      ...image2PromptPaths.map((promptPath) => `- ${markdownLink(outputPath, promptPath, promptPath.split('/').slice(-1)[0])}`),
      '',
    ] : []),
    '## Client-Ready Update',
    '',
    ...project.clientUpdate.flatMap((item) => [item, '']),
    '## Repo Evidence',
    '',
    '| Component | Path | Type | Details |',
    '| --- | --- | --- | --- |',
    ...evidence.map((item) => {
      const link = markdownLink(outputPath, item.path);
      return `| ${item.component.label} | ${link} | ${item.kind} | ${item.details} |`;
    }),
    '',
    '## Recent Related Commits',
    '',
    ...recentCommits.map((commit) => `- ${commit}`),
    '',
    '## Next Review',
    '',
    ...project.nextReview.map((item) => `- ${item}`),
    '',
    '## Regenerate',
    '',
    '```bash',
    `pnpm delivery:${project.slug}`,
    '```',
    '',
  ];

  return lines.join('\n');
}

function renderTextBlock({ lines, x, y, size = 18, fill = '#0f172a', lineHeight = 24 }) {
  return lines
    .map((line, index) => {
      const escaped = escapeHtml(line);
      return `<text x="${x}" y="${y + index * lineHeight}" font-size="${size}" fill="${fill}">${escaped}</text>`;
    })
    .join('\n');
}

function renderDeliveryGraphSvg(project, date) {
  const cardWidth = 330;
  const cardHeight = 300;
  const top = 155;
  const lefts = [60, 435, 810];
  const colors = ['#0f766e', '#2563eb', '#a16207'];

  const cards = project.components.map((component, index) => {
    const x = lefts[index] ?? 60 + index * 375;
    const summaryLines = wrapText(component.summary, 39).slice(0, 7);
    return `
<rect x="${x}" y="${top}" width="${cardWidth}" height="${cardHeight}" rx="10" fill="#ffffff" stroke="${colors[index] ?? '#334155'}" stroke-width="3"/>
<text x="${x + 24}" y="${top + 42}" font-size="17" font-weight="700" fill="${colors[index] ?? '#334155'}">${escapeHtml(component.tier)}</text>
<text x="${x + 24}" y="${top + 76}" font-size="26" font-weight="700" fill="#0f172a">${escapeHtml(component.label)}</text>
<text x="${x + 24}" y="${top + 108}" font-size="17" fill="#475569">${escapeHtml(component.status)}</text>
${renderTextBlock({ lines: summaryLines, x: x + 24, y: top + 148, size: 15, fill: '#334155', lineHeight: 22 })}`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="620" viewBox="0 0 1200 620">
<rect width="1200" height="620" fill="#f8fafc"/>
<text x="60" y="72" font-size="34" font-weight="800" fill="#0f172a">${escapeHtml(project.title)}</text>
<text x="60" y="108" font-size="18" fill="#475569">Generated ${escapeHtml(date)} - DB, MCP/API, and agent delivery relationship</text>
<line x1="390" y1="305" x2="435" y2="305" stroke="#64748b" stroke-width="3"/>
<polygon points="435,305 421,296 421,314" fill="#64748b"/>
<line x1="765" y1="305" x2="810" y2="305" stroke="#64748b" stroke-width="3"/>
<polygon points="810,305 796,296 796,314" fill="#64748b"/>
${cards.join('\n')}
<rect x="60" y="505" width="1080" height="64" rx="8" fill="#e2e8f0"/>
<text x="84" y="545" font-size="18" fill="#0f172a">Delivery rule: repo artifacts stay authoritative; the client surface renders the current state instead of becoming the source of truth.</text>
</svg>`;
}

function renderEvidenceMapSvg(project, date) {
  const rows = project.components.map((component, index) => {
    const y = 165 + index * 138;
    const titleLines = wrapText(`${component.label}: ${component.title}`, 48).slice(0, 2);
    const evidenceLines = component.evidence.slice(0, 3).map((path) => `- ${path}`);
    return `
<rect x="70" y="${y}" width="1060" height="116" rx="9" fill="#ffffff" stroke="#cbd5e1"/>
${renderTextBlock({ lines: titleLines, x: 96, y: y + 34, size: 19, fill: '#0f172a', lineHeight: 24 })}
<text x="96" y="${y + 90}" font-size="15" fill="#475569">${escapeHtml(component.status)} - ${escapeHtml(component.tier)}</text>
${renderTextBlock({ lines: evidenceLines, x: 660, y: y + 34, size: 14, fill: '#334155', lineHeight: 22 })}`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="620" viewBox="0 0 1200 620">
<rect width="1200" height="620" fill="#f8fafc"/>
<text x="70" y="72" font-size="34" font-weight="800" fill="#0f172a">Abundance Evidence Map</text>
<text x="70" y="108" font-size="18" fill="#475569">Generated ${escapeHtml(date)} - client-facing proof paths from the monorepo</text>
<text x="96" y="146" font-size="14" font-weight="700" fill="#64748b">DELIVERED COMPONENT</text>
<text x="595" y="146" font-size="14" font-weight="700" fill="#64748b">REPO EVIDENCE</text>
${rows.join('\n')}
</svg>`;
}

function convertSvgToPng(svgPath, pngPath) {
  try {
    execFileSync('rsvg-convert', [
      '-w',
      '1200',
      '-h',
      '620',
      '-f',
      'png',
      '-o',
      pngPath,
      svgPath,
    ], { cwd: ROOT, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function writeImage2Prompts(project, assetsDir, date) {
  const imageGeneration = project.imageGeneration;
  if (!imageGeneration?.outputs?.length) {
    return [];
  }

  const promptsDir = join(assetsDir, 'prompts');
  mkdirSync(promptsDir, { recursive: true });

  return imageGeneration.outputs.map((output) => {
    const promptPath = join(promptsDir, `${output.outputName}-${date}.txt`);
    const prompt = [
      `Model: ${imageGeneration.model}`,
      imageGeneration.snapshot ? `Snapshot: ${imageGeneration.snapshot}` : null,
      `Quality: ${imageGeneration.quality ?? 'high'}`,
      `Size: ${imageGeneration.size ?? '1536x1024'}`,
      imageGeneration.sourceUrl ? `Source: ${imageGeneration.sourceUrl}` : null,
      '',
      output.prompt,
      '',
    ].filter((line) => line !== null).join('\n');
    writeFileSync(promptPath, prompt);

    return {
      ...output,
      promptPath,
      outputPath: join(assetsDir, `${output.outputName}-${date}.png`),
    };
  });
}

function generateImage2Assets(project, jobs, force) {
  const imageGeneration = project.imageGeneration;
  if (!imageGeneration?.model || jobs.length === 0) {
    return [];
  }

  const imageGenPath = join(
    process.env.CODEX_HOME || join(process.env.HOME || '', '.codex'),
    'skills/.system/imagegen/scripts/image_gen.py',
  );

  if (!existsSync(imageGenPath)) {
    throw new Error(`Image generation CLI not found: ${imageGenPath}`);
  }

  const runner = imageCliRunner();
  const generated = [];

  for (const job of jobs) {
    if (existsSync(job.outputPath) && !force) {
      generated.push(job.outputPath);
      continue;
    }

    try {
      execFileSync(runner.command, [
        ...runner.prefixArgs,
        imageGenPath,
        'generate',
        '--model',
        imageGeneration.model,
        '--prompt-file',
        job.promptPath,
        '--quality',
        imageGeneration.quality ?? 'high',
        '--size',
        imageGeneration.size ?? '1536x1024',
        '--out',
        job.outputPath,
        ...(force ? ['--force'] : []),
      ], { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' });

      generated.push(job.outputPath);
    } catch (error) {
      const stderr = error?.stderr ? String(error.stderr) : '';
      const stdout = error?.stdout ? String(error.stdout) : '';
      const note = image2FailureNote(project, job, stderr || stdout || String(error));
      const errorPath = job.outputPath.replace(/\.png$/, '.error.txt');
      writeFileSync(errorPath, note);
      console.warn(note);
    }
  }

  return generated;
}

function image2FailureNote(project, job, rawMessage) {
  const verificationMessage = rawMessage.includes('organization must be verified')
    ? 'OpenAI returned 403: the organization must be verified before it can use gpt-image-2.'
    : 'Image 2 generation failed. See the terminal output for the raw provider response.';

  return [
    `Image 2 generation did not complete for ${job.id}.`,
    `Requested model: ${project.imageGeneration?.model ?? 'gpt-image-2'}`,
    verificationMessage,
    'No fallback model was used.',
    `Prompt source: ${relative(ROOT, job.promptPath)}`,
    '',
  ].join('\n');
}

function findImage2DisplayPath(jobs, id) {
  const job = jobs.find((candidate) => candidate.id === id);
  if (job && existsSync(job.outputPath)) {
    return job.outputPath;
  }
  return null;
}

function findCommand(candidates) {
  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ['--version'], { cwd: ROOT, stdio: 'ignore' });
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error(`None of these commands are available: ${candidates.join(', ')}`);
}

function hasCommand(candidate) {
  try {
    execFileSync(candidate, ['--version'], { cwd: ROOT, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function imageCliRunner() {
  if (hasCommand('uv')) {
    return {
      command: 'uv',
      prefixArgs: ['run', '--with', 'openai', '--with', 'pillow', 'python'],
    };
  }

  return {
    command: findCommand(['python3', 'python']),
    prefixArgs: [],
  };
}

function writeDelivery(project, outDir, date, options = {}) {
  const projectDir = join(outDir, project.slug);
  const assetsDir = join(projectDir, 'assets');
  mkdirSync(assetsDir, { recursive: true });

  const graphPath = join(assetsDir, `${project.slug}-delivery-graph-${date}.svg`);
  const evidencePath = join(assetsDir, `${project.slug}-evidence-map-${date}.svg`);
  const graphPngPath = join(assetsDir, `${project.slug}-delivery-graph-${date}.png`);
  const evidencePngPath = join(assetsDir, `${project.slug}-evidence-map-${date}.png`);
  const outputPath = join(projectDir, `${date}-project-update.md`);
  const image2Jobs = writeImage2Prompts(project, assetsDir, date);

  writeFileSync(graphPath, renderDeliveryGraphSvg(project, date));
  writeFileSync(evidencePath, renderEvidenceMapSvg(project, date));

  if (options.image2) {
    generateImage2Assets(project, image2Jobs, Boolean(options.forceImage2));
  }

  const graphFallbackPath = convertSvgToPng(graphPath, graphPngPath) ? graphPngPath : graphPath;
  const evidenceFallbackPath = convertSvgToPng(evidencePath, evidencePngPath) ? evidencePngPath : evidencePath;
  const graphDisplayPath = findImage2DisplayPath(image2Jobs, 'delivery-graph') ?? graphFallbackPath;
  const evidenceDisplayPath = findImage2DisplayPath(image2Jobs, 'evidence-map') ?? evidenceFallbackPath;
  const image2PromptPaths = image2Jobs.map((job) => relative(ROOT, job.promptPath));

  writeFileSync(
    outputPath,
    renderMarkdown(
      project,
      outputPath,
      { graph: graphDisplayPath, evidence: evidenceDisplayPath },
      date,
      image2PromptPaths,
    ),
  );

  return {
    outputPath,
    images: [
      graphDisplayPath,
      evidenceDisplayPath,
      graphPath,
      evidencePath,
      ...image2Jobs.map((job) => job.outputPath.replace(/\.png$/, '.error.txt')).filter((path) => existsSync(path)),
      ...image2Jobs.map((job) => job.promptPath),
    ],
  };
}

function main() {
  const args = parseArgs(process.argv);
  const { path: projectPath, project } = loadProject(args.project);
  const errors = validateProject(project);

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  if (args.check) {
    console.log(`Delivery project OK: ${relative(ROOT, projectPath)}`);
    return;
  }

  const result = writeDelivery(project, args.outDir, args.date, {
    image2: args.image2,
    forceImage2: args.forceImage2,
  });
  console.log(JSON.stringify({
    project: project.slug,
    update: relative(ROOT, result.outputPath),
    images: result.images.map((imagePath) => relative(ROOT, imagePath)),
  }, null, 2));
}

main();

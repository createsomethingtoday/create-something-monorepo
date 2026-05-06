#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECTS_DIR = join(ROOT, 'config/delivery/projects');
const AGENT_CONFIG_PATH = join(ROOT, 'config/delivery/agent.json');
const DELIVERIES_DIR = join(ROOT, 'docs/deliveries');
const DEFAULT_OUT_DIR = join(ROOT, '.cloudflare/delivery-site');

function parseArgs(argv) {
  const args = {
    outDir: DEFAULT_OUT_DIR,
    project: null,
    check: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--out' && argv[index + 1]) {
      args.outDir = resolve(ROOT, argv[index + 1]);
      index += 1;
    } else if (arg === '--project' && argv[index + 1]) {
      args.project = argv[index + 1];
      index += 1;
    } else if (arg === '--check') {
      args.check = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/delivery-page.mjs [--project slug] [--out .cloudflare/delivery-site] [--check]

Builds static client delivery pages from config/delivery/projects/*.json.
The monorepo remains the source of truth; this script only renders a delivery surface.`);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeSlug(value) {
  return String(value).replace(/[^a-z0-9-]/gi, '-').toLowerCase();
}

function projectManifestPaths() {
  if (!existsSync(PROJECTS_DIR)) return [];
  return readdirSync(PROJECTS_DIR)
    .filter((entry) => entry.endsWith('.json'))
    .map((entry) => join(PROJECTS_DIR, entry))
    .sort();
}

function loadProjects(projectSlug = null) {
  const manifests = projectManifestPaths()
    .map((path) => ({ path, project: readJson(path) }))
    .filter(({ project }) => !projectSlug || project.slug === projectSlug);

  if (projectSlug && manifests.length === 0) {
    throw new Error(`Delivery project not found: ${projectSlug}`);
  }

  return manifests;
}

function relativePath(path) {
  return relative(ROOT, path).replaceAll('\\', '/');
}

function latestProjectUpdate(slug) {
  const projectDir = join(DELIVERIES_DIR, slug);
  if (!existsSync(projectDir)) return null;

  const updates = readdirSync(projectDir)
    .filter((entry) => entry.endsWith('-project-update.md'))
    .sort();

  return updates.length > 0 ? join(projectDir, updates.at(-1)) : null;
}

function listFiles(path) {
  if (!existsSync(path)) return [];

  return readdirSync(path, { recursive: true })
    .map((entry) => join(path, String(entry)))
    .filter((entryPath) => existsSync(entryPath) && statSync(entryPath).isFile())
    .sort();
}

function firstMeaningfulLine(path) {
  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0) ?? '';
}

function latestMatchingFile(files, matcher) {
  return files.filter(matcher).sort().at(-1) ?? null;
}

function imageStatus(slug) {
  const assetsDir = join(DELIVERIES_DIR, slug, 'assets');
  const files = listFiles(assetsDir);
  const image2Images = files.filter((file) => file.includes('image2') && file.endsWith('.png'));
  const errorFiles = files.filter((file) => file.includes('image2') && file.endsWith('.error.txt'));
  const promptFiles = files.filter((file) => file.includes('/prompts/') && file.endsWith('.txt'));

  if (image2Images.length > 0) {
    return {
      state: 'generated',
      detail: `${image2Images.length} Image 2 image(s) generated`,
      promptFiles,
      errorFiles,
      image2Images,
    };
  }

  if (errorFiles.length > 0) {
    return {
      state: 'blocked',
      detail: errorFiles.map((file) => firstMeaningfulLine(file)).join('; '),
      promptFiles,
      errorFiles,
      image2Images,
    };
  }

  if (promptFiles.length > 0) {
    return {
      state: 'prompted',
      detail: `${promptFiles.length} Image 2 prompt file(s) ready`,
      promptFiles,
      errorFiles,
      image2Images,
    };
  }

  return {
    state: 'not_configured',
    detail: 'No Image 2 delivery assets found',
    promptFiles,
    errorFiles,
    image2Images,
  };
}

function deliveryImages(slug) {
  const assetsDir = join(DELIVERIES_DIR, slug, 'assets');
  const files = listFiles(assetsDir);

  const graph =
    latestMatchingFile(files, (file) => file.includes('image2-delivery-graph') && file.endsWith('.png')) ??
    latestMatchingFile(files, (file) => file.includes('delivery-graph') && file.endsWith('.png')) ??
    latestMatchingFile(files, (file) => file.includes('delivery-graph') && file.endsWith('.svg'));

  const evidence =
    latestMatchingFile(files, (file) => file.includes('image2-evidence-map') && file.endsWith('.png')) ??
    latestMatchingFile(files, (file) => file.includes('evidence-map') && file.endsWith('.png')) ??
    latestMatchingFile(files, (file) => file.includes('evidence-map') && file.endsWith('.svg'));

  return { graph, evidence };
}

function gitOutput(args, fallback = '') {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return fallback;
  }
}

function gitState() {
  return {
    branch: gitOutput(['rev-parse', '--abbrev-ref', 'HEAD'], 'unknown'),
    sha: gitOutput(['rev-parse', 'HEAD'], 'unknown'),
    shortSha: gitOutput(['rev-parse', '--short', 'HEAD'], 'unknown'),
    remote: gitOutput(['config', '--get', 'remote.origin.url'], 'unknown'),
    status: gitOutput(['status', '--short'], ''),
  };
}

function gitLogFor(project) {
  const paths = project.recentChangePaths?.length
    ? project.recentChangePaths
    : [...new Set(project.components.flatMap((component) => component.evidence))];

  const log = gitOutput(
    ['log', '--date=short', '--pretty=format:%h|%ad|%s', '--', ...paths],
    '',
  );

  return log
    .split('\n')
    .filter(Boolean)
    .slice(0, 12)
    .map((line) => {
      const [hash, date, ...subject] = line.split('|');
      return { hash, date, subject: subject.join('|') };
    });
}

function evidenceStatus(project) {
  return project.components.flatMap((component) =>
    component.evidence.map((evidencePath) => {
      const absolutePath = join(ROOT, evidencePath);
      const exists = existsSync(absolutePath);
      const stats = exists ? statSync(absolutePath) : null;

      return {
        component: component.label,
        path: evidencePath,
        exists,
        kind: !exists ? 'missing' : stats.isDirectory() ? 'directory' : 'file',
      };
    }),
  );
}

function publicNotionContext(context) {
  if (!context) return null;

  return {
    source: context.source,
    workspaceRoot: context.workspaceRoot,
    sourceDatabases: context.sourceDatabases,
    engagementTitle: context.engagementTitle,
    clientRecord: context.clientRecord,
    phase: context.phase,
    status: context.status,
    reviewedAt: context.reviewedAt,
  };
}

function validate({ agent, projects }) {
  const errors = [];

  if (agent.sourceOfTruth !== 'monorepo') {
    errors.push('Delivery agent sourceOfTruth must be monorepo.');
  }

  if (!agent.approvalRequired?.includes('send_client_email_or_message')) {
    errors.push('Delivery agent must require approval before sending client messages.');
  }

  if (!agent.approvalRequired?.includes('promote_to_client_portal')) {
    errors.push('Delivery agent must require approval before portal promotion.');
  }

  for (const project of projects) {
    for (const field of ['slug', 'title', 'client', 'headline']) {
      if (!project[field]) errors.push(`${project.slug ?? 'unknown'}: missing ${field}`);
    }

    for (const tier of ['Database', 'Automation', 'Judgment']) {
      if (!project.components?.some((component) => component.tier === tier)) {
        errors.push(`${project.slug}: missing ${tier} component`);
      }
    }

    for (const evidence of evidenceStatus(project)) {
      if (!evidence.exists) errors.push(`${project.slug}: missing evidence path ${evidence.path}`);
    }
  }

  return errors;
}

function siteAssetPath(project, sourcePath) {
  if (!sourcePath) return null;
  return `assets/${relative(join(DELIVERIES_DIR, project.slug, 'assets'), sourcePath).replaceAll('\\', '/')}`;
}

function copyProjectAssets(project, outputDir) {
  const sourceAssetsDir = join(DELIVERIES_DIR, project.slug, 'assets');
  const targetAssetsDir = join(outputDir, 'projects', project.slug, 'assets');

  if (existsSync(sourceAssetsDir)) {
    cpSync(sourceAssetsDir, targetAssetsDir, { recursive: true });
  }
}

function tag(label, tone = '') {
  return `<span class="tag ${tone}">${escapeHtml(label)}</span>`;
}

function renderLayout({ title, body, basePath = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

    :root {
      color-scheme: dark;
      --ink: #f6f7fb;
      --muted: #aab4c5;
      --line: rgba(255, 255, 255, 0.14);
      --paper: #000000;
      --panel: rgba(255, 255, 255, 0.055);
      --panel-strong: rgba(255, 255, 255, 0.095);
      --teal: #5eead4;
      --blue: #a7b8ff;
      --amber: #f7c873;
      --red: #ff8a7a;
      --shadow: 0 22px 70px rgba(0, 0, 0, 0.36);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background:
        radial-gradient(circle at top right, rgba(49, 92, 255, 0.16), transparent 30%),
        radial-gradient(circle at top left, rgba(94, 234, 212, 0.09), transparent 24%),
        linear-gradient(180deg, #0c0c10 0%, #060608 48%, #000000 100%);
      color: var(--ink);
      font-family: "IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
      letter-spacing: -0.015em;
    }
    a { color: inherit; }
    .shell { max-width: 1180px; margin: 0 auto; padding: 32px 20px 52px; }
    .topbar {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
      border-bottom: 1px solid var(--line);
      padding-bottom: 18px;
      margin-bottom: 34px;
    }
    .brand { font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 800; }
    .nav { display: flex; gap: 14px; flex-wrap: wrap; color: var(--muted); font-size: 14px; }
    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(240px, 360px);
      gap: 34px;
      align-items: start;
      margin-bottom: 34px;
    }
    h1 { font-size: clamp(36px, 7vw, 72px); line-height: 0.96; letter-spacing: 0; margin: 0 0 18px; max-width: 820px; }
    h2 { font-size: 24px; margin: 0 0 16px; letter-spacing: 0; }
    h3 { font-size: 17px; margin: 0 0 8px; letter-spacing: 0; }
    p { margin: 0 0 14px; }
    .lede { font-size: 20px; color: #cbd5e1; max-width: 790px; }
    .meta {
      border-left: 4px solid var(--teal);
      background: rgba(255, 255, 255, 0.04);
      padding: 16px 0 16px 18px;
      color: var(--muted);
      font-size: 14px;
    }
    .meta strong { color: var(--ink); }
    .section { margin: 42px 0; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
    .grid.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .grid.auto { grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
    .card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 20px;
      box-shadow: var(--shadow);
    }
    .card.teal { border-top: 5px solid var(--teal); }
    .card.blue { border-top: 5px solid var(--blue); }
    .card.amber { border-top: 5px solid var(--amber); }
    .card.red { border-top: 5px solid var(--red); }
    .tag {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 4px 9px;
      font-size: 12px;
      font-weight: 750;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--muted);
      background: rgba(255, 255, 255, 0.06);
    }
    .tag.teal { color: var(--teal); border-color: rgba(15, 118, 110, 0.28); }
    .tag.blue { color: var(--blue); border-color: rgba(37, 99, 235, 0.28); }
    .tag.amber { color: var(--amber); border-color: rgba(161, 98, 7, 0.28); }
    .tag.red { color: var(--red); border-color: rgba(180, 35, 24, 0.28); }
    .stack { display: grid; gap: 12px; }
    .muted { color: var(--muted); }
    .proof-image {
      width: 100%;
      height: auto;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.04);
      box-shadow: var(--shadow);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
      background: #fff;
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
      display: table;
    }
    th, td { padding: 12px 14px; text-align: left; border-bottom: 1px solid var(--line); vertical-align: top; }
    th { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
    tr:last-child td { border-bottom: 0; }
    code {
      font-family: "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
      font-size: 0.92em;
      color: #e5edf8;
      background: rgba(255, 255, 255, 0.09);
      padding: 2px 5px;
      border-radius: 4px;
      word-break: break-word;
    }
    .footer { border-top: 1px solid var(--line); padding-top: 22px; margin-top: 46px; color: var(--muted); font-size: 13px; }
    @media (max-width: 840px) {
      .hero, .grid, .grid.two { grid-template-columns: 1fr; }
      .topbar { align-items: flex-start; flex-direction: column; }
      h1 { font-size: 42px; }
      table { display: block; overflow-x: auto; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <header class="topbar">
      <div class="brand">CREATE SOMETHING .agency Delivery</div>
      <nav class="nav">
        <a href="${basePath}index.html">Projects</a>
        <a href="${basePath}data/delivery.json">Machine data</a>
      </nav>
    </header>
    ${body}
  </main>
</body>
</html>`;
}

function renderIndex({ projects, agent, git }) {
  const rows = projects.map((project) => {
    const evidence = evidenceStatus(project);
    const missing = evidence.filter((item) => !item.exists).length;
    const image = imageStatus(project.slug);
    const commits = gitLogFor(project);
    return `<a class="card ${missing ? 'red' : 'teal'}" href="projects/${project.slug}/index.html">
      <div class="stack">
        ${tag(project.targetKind ?? 'project', missing ? 'red' : 'teal')}
        <h3>${escapeHtml(project.title)}</h3>
        <p><strong>${escapeHtml(project.client)}</strong>${project.deliveryPartner ? ` via ${escapeHtml(project.deliveryPartner)}` : ''}</p>
        <p class="muted">${escapeHtml(project.headline)}</p>
        <p><strong>${project.components.length}</strong> components - <strong>${missing}</strong> missing evidence - <strong>${commits.length}</strong> git commits</p>
        <p class="muted">Image 2: ${escapeHtml(image.state)}</p>
      </div>
    </a>`;
  }).join('\n');

  const body = `
    <section class="hero">
      <div>
        <h1>Delivery surfaces generated from the monorepo.</h1>
        <p class="lede">Each project or package gets a client-ready page backed by manifests, repo evidence, Git history, Loom coordination, and Linear work tracking.</p>
      </div>
      <aside class="meta">
        <p><strong>Agent mode:</strong> ${escapeHtml(agent.mode)}</p>
        <p><strong>Source of truth:</strong> ${escapeHtml(agent.sourceOfTruth)}</p>
        <p><strong>Commit:</strong> <code>${escapeHtml(git.shortSha)}</code></p>
        <p><strong>Branch:</strong> <code>${escapeHtml(git.branch)}</code></p>
      </aside>
    </section>

    <section class="section">
      <h2>Active Deliveries</h2>
      <div class="grid auto">${rows}</div>
    </section>

    <section class="section">
      <h2>Operating Rule</h2>
      <div class="grid two">
        <div class="card blue">
          <h3>Agents can draft and stage.</h3>
          <p class="muted">${escapeHtml(agent.publishRule)}</p>
        </div>
        <div class="card amber">
          <h3>Approval still gates client send.</h3>
          <p class="muted">Sending, public publishing, portal promotion, sensitive data inclusion, and scope-changing language require human approval.</p>
        </div>
      </div>
    </section>

    <footer class="footer">Generated by <code>pnpm delivery:site</code>. Repo remote: <code>${escapeHtml(git.remote)}</code>.</footer>`;

  return renderLayout({ title: 'CREATE SOMETHING Delivery', body, basePath: '' });
}

function renderComponentCards(project) {
  const tones = ['teal', 'blue', 'amber'];
  return project.components.map((component, index) => `
    <article class="card ${tones[index] ?? 'blue'}">
      ${tag(component.tier, tones[index] ?? 'blue')}
      <h3>${escapeHtml(component.label)}</h3>
      <p><strong>${escapeHtml(component.status)}</strong></p>
      <p class="muted">${escapeHtml(component.summary)}</p>
    </article>
  `).join('\n');
}

function renderEvidenceTable(project) {
  return evidenceStatus(project).map((item) => `
    <tr>
      <td>${escapeHtml(item.component)}</td>
      <td><code>${escapeHtml(item.path)}</code></td>
      <td>${item.exists ? tag(item.kind, 'teal') : tag('missing', 'red')}</td>
    </tr>
  `).join('\n');
}

function renderCommitRows(commits) {
  if (commits.length === 0) {
    return '<tr><td colspan="3">No related commits found for configured paths.</td></tr>';
  }

  return commits.map((commit) => `
    <tr>
      <td><code>${escapeHtml(commit.hash)}</code></td>
      <td>${escapeHtml(commit.date)}</td>
      <td>${escapeHtml(commit.subject)}</td>
    </tr>
  `).join('\n');
}

function renderCoordination(project) {
  const loomIds = project.coordination?.loomTaskIds ?? [];
  const linearIds = project.coordination?.linearIssueIds ?? [];
  const linearUrls = project.coordination?.linearUrls ?? [];

  return `
    <div class="grid two">
      <div class="card blue">
        <h3>Loom</h3>
        ${loomIds.length > 0
          ? `<p class="muted">${loomIds.map((id) => `<code>${escapeHtml(id)}</code>`).join(' ')}</p>`
          : '<p class="muted">No Loom task IDs recorded in the manifest yet.</p>'}
      </div>
      <div class="card teal">
        <h3>Linear</h3>
        ${linearIds.length > 0
          ? linearIds.map((id, index) => {
            const url = linearUrls[index];
            return url
              ? `<p><a href="${escapeHtml(url)}">${escapeHtml(id)}</a></p>`
              : `<p><code>${escapeHtml(id)}</code></p>`;
          }).join('\n')
          : '<p class="muted">No Linear issue IDs recorded in the manifest yet.</p>'}
      </div>
    </div>`;
}

function renderProjectPage({ project, agent, git, outputDir }) {
  copyProjectAssets(project, outputDir);

  const images = deliveryImages(project.slug);
  const graph = siteAssetPath(project, images.graph);
  const evidence = siteAssetPath(project, images.evidence);
  const image = imageStatus(project.slug);
  const commits = gitLogFor(project);
  const updatePath = latestProjectUpdate(project.slug);

  const body = `
    <section class="hero">
      <div>
        <h1>${escapeHtml(project.title)}</h1>
        <p class="lede">${escapeHtml(project.headline)}</p>
      </div>
      <aside class="meta">
        <p><strong>Client:</strong> ${escapeHtml(project.client)}</p>
        ${project.clientShortName ? `<p><strong>Client shorthand:</strong> ${escapeHtml(project.clientShortName)}</p>` : ''}
        ${project.deliveryPartner ? `<p><strong>Delivery partner:</strong> ${escapeHtml(project.deliveryPartner)}</p>` : ''}
        <p><strong>Audience:</strong> ${escapeHtml(project.audience)}</p>
        <p><strong>Target:</strong> ${escapeHtml(project.targetKind ?? 'project')}</p>
        <p><strong>Commit:</strong> <code>${escapeHtml(git.shortSha)}</code></p>
        <p><strong>Linear:</strong> ${project.coordination?.linearIssueIds?.map((id) => `<code>${escapeHtml(id)}</code>`).join(' ') ?? 'not linked'}</p>
      </aside>
    </section>

    ${project.notionContext ? `<section class="section">
      <h2>Client Context</h2>
      <div class="card blue">
        <h3>${escapeHtml(project.notionContext.engagementTitle ?? project.client)}</h3>
        <p class="muted">Reviewed from ${escapeHtml(project.notionContext.source ?? 'private Notion context')} under ${escapeHtml(project.notionContext.workspaceRoot ?? 'CREATE SOMETHING')}. Phase: ${escapeHtml(project.notionContext.phase ?? 'unknown')}. Status: ${escapeHtml(project.notionContext.status ?? 'unknown')}.</p>
        ${project.notionContext.sourceDatabases?.length ? `<p class="muted">Agency Ops records checked: ${project.notionContext.sourceDatabases.map((item) => `<code>${escapeHtml(item)}</code>`).join(' ')}</p>` : ''}
        <p class="muted">Private Notion URLs, contacts, and raw workspace data are intentionally excluded from this public delivery surface.</p>
      </div>
    </section>` : ''}

    <section class="section">
      <h2>DB, MCP, and Agent Map</h2>
      <div class="grid">${renderComponentCards(project)}</div>
    </section>

    <section class="section">
      <h2>Client Summary</h2>
      <div class="stack">${project.summary.map((item) => `<p>${escapeHtml(item)}</p>`).join('\n')}</div>
    </section>

    <section class="section">
      <h2>Delivery Images</h2>
      <div class="grid two">
        ${graph ? `<img class="proof-image" src="${escapeHtml(graph)}" alt="Delivery graph for ${escapeHtml(project.title)}">` : '<div class="card red">Missing delivery graph</div>'}
        ${evidence ? `<img class="proof-image" src="${escapeHtml(evidence)}" alt="Evidence map for ${escapeHtml(project.title)}">` : '<div class="card red">Missing evidence map</div>'}
      </div>
      <p class="muted">Image 2 state: ${escapeHtml(image.state)}. ${escapeHtml(image.detail)}</p>
    </section>

    <section class="section">
      <h2>Client-Ready Update</h2>
      <div class="stack">${project.clientUpdate.map((item) => `<p>${escapeHtml(item)}</p>`).join('\n')}</div>
    </section>

    <section class="section">
      <h2>Evidence Ledger</h2>
      <table>
        <thead><tr><th>Component</th><th>Path</th><th>Status</th></tr></thead>
        <tbody>${renderEvidenceTable(project)}</tbody>
      </table>
    </section>

    <section class="section">
      <h2>Recent Git History</h2>
      <table>
        <thead><tr><th>Commit</th><th>Date</th><th>Subject</th></tr></thead>
        <tbody>${renderCommitRows(commits)}</tbody>
      </table>
    </section>

    <section class="section">
      <h2>Loom and Linear</h2>
      ${renderCoordination(project)}
    </section>

    <section class="section">
      <h2>Next Review</h2>
      <div class="grid auto">${project.nextReview.map((item) => `<div class="card amber"><p>${escapeHtml(item)}</p></div>`).join('\n')}</div>
    </section>

    <section class="section">
      <h2>Agent Boundary</h2>
      <div class="grid two">
        <div class="card teal">
          <h3>Allowed</h3>
          <p class="muted">${agent.allowedActions.map((action) => escapeHtml(action)).join(', ')}</p>
        </div>
        <div class="card red">
          <h3>Approval Required</h3>
          <p class="muted">${agent.approvalRequired.map((action) => escapeHtml(action)).join(', ')}</p>
        </div>
      </div>
    </section>

    <footer class="footer">
      ${updatePath ? `Markdown source: <code>${escapeHtml(relativePath(updatePath))}</code>. ` : ''}
      Generated by <code>pnpm delivery:site --project ${escapeHtml(project.slug)}</code> from monorepo manifests.
    </footer>`;

  return renderLayout({ title: `${project.title} Delivery`, body, basePath: '../../' });
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

function buildSite({ projects, agent, outputDir }) {
  const git = gitState();

  if (existsSync(outputDir)) {
    rmSync(outputDir, { recursive: true, force: true });
  }

  mkdirSync(join(outputDir, 'projects'), { recursive: true });
  mkdirSync(join(outputDir, 'data'), { recursive: true });

  writeFileSync(join(outputDir, 'index.html'), renderIndex({ projects, agent, git }));

  for (const project of projects) {
    const projectDir = join(outputDir, 'projects', safeSlug(project.slug));
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(
      join(projectDir, 'index.html'),
      renderProjectPage({ project, agent, git, outputDir }),
    );
  }

  writeJson(join(outputDir, 'data/delivery.json'), {
    generatedAt: new Date().toISOString(),
    git,
    agent: {
      id: agent.id,
      mode: agent.mode,
      sourceOfTruth: agent.sourceOfTruth,
    },
    projects: projects.map((project) => ({
      slug: project.slug,
      title: project.title,
      client: project.client,
      clientShortName: project.clientShortName ?? null,
      deliveryPartner: project.deliveryPartner ?? null,
      audience: project.audience,
      targetKind: project.targetKind ?? 'project',
      components: project.components.map((component) => ({
        id: component.id,
        tier: component.tier,
        label: component.label,
        status: component.status,
      })),
      coordination: project.coordination ?? {},
      notionContext: publicNotionContext(project.notionContext),
      imageStatus: imageStatus(project.slug),
      latestUpdate: latestProjectUpdate(project.slug)
        ? relativePath(latestProjectUpdate(project.slug))
        : null,
    })),
  });

  writeFileSync(join(outputDir, '_headers'), [
    '/*',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: no-referrer-when-downgrade',
    '  Permissions-Policy: camera=(), microphone=(), geolocation=()',
    '',
  ].join('\n'));

  return { outputDir, git };
}

function main() {
  const args = parseArgs(process.argv);
  const agent = readJson(AGENT_CONFIG_PATH);
  const projects = loadProjects(args.project).map(({ project }) => project);
  const errors = validate({ agent, projects });

  if (errors.length > 0) {
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  if (args.check) {
    console.log(`Delivery site config OK: ${projects.length} project(s)`);
    return;
  }

  const result = buildSite({ projects, agent, outputDir: args.outDir });
  console.log(JSON.stringify({
    out: relativePath(result.outputDir),
    projects: projects.map((project) => project.slug),
    commit: result.git.shortSha,
  }, null, 2));
}

main();

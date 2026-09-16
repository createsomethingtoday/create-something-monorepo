import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const baseUrl = process.env.CANVAS_URL ?? 'http://localhost:8793';
const runLabel = process.env.CANVAS_RUN_LABEL ?? 'shared-background-local';
const canvasColor = '#123abc';
const motionColor = '#fedcba';
const output = fileURLToPath(new URL(`../output/${runLabel}/`, import.meta.url));
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  serviceWorkers: 'block'
});
await context.addInitScript(() => {
  window.__drawWebMcpTools = {};
  Object.defineProperty(document, 'modelContext', {
    configurable: true,
    value: {
      registerTool(tool) {
        window.__drawWebMcpTools[tool.name] = tool;
      }
    }
  });
});

const page = await context.newPage();
const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => consoleErrors.push(error.message));

const waitForCanvas = async () => {
  await page.waitForFunction(
    () => typeof window.__drawWebMcpTools?.draw_get_state?.execute === 'function'
  );
  await page.getByLabel('Canvas background color').waitFor();
  await page.waitForFunction(() => !document.querySelector('.statusbar')?.textContent?.includes('Loading'));
};

const canvasReceipt = async () =>
  page.evaluate(async () => {
    const state = await window.__drawWebMcpTools.draw_get_state.execute({});
    return {
      projectId: state.document.id,
      background: state.document.background,
      renderedBackground: document.querySelector('[data-testid="canvas-background"]')?.getAttribute('fill'),
      controlBackground: document.querySelector('[aria-label="Canvas background color"]')?.value
    };
  });

const waitForMotion = async (projectId) => {
  await page.getByRole('status').filter({ hasText: `Canvas + Motion · ${projectId}` }).waitFor();
  await page.waitForFunction(
    () => typeof window.__drawWebMcpTools?.draw_animation_inspect?.execute === 'function'
  );
};

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await waitForCanvas();
  const initial = await canvasReceipt();

  const backgroundControl = page.getByLabel('Canvas background color');
  await backgroundControl.fill(canvasColor);
  await backgroundControl.press('Tab');
  await page.waitForFunction(
    async (color) =>
      (await window.__drawWebMcpTools.draw_get_state.execute({})).document.background === color,
    canvasColor
  );

  const composed = await page.evaluate(async () => {
    const tools = window.__drawWebMcpTools;
    const result = await tools.draw_compose.execute({
      placement: 'visible-center',
      layout: { direction: 'row', gap: 96 },
      nodes: [
        { ref: 'canvas', text: 'Canvas background' },
        { ref: 'motion', text: 'Motion background' }
      ],
      edges: [{ ref: 'shared', from: 'canvas', to: 'motion', label: 'one project' }]
    });
    return result.refs;
  });
  await page.waitForFunction(
    () => document.querySelector('.statusbar')?.textContent?.includes('Saved on this device')
  );
  await page.screenshot({ path: `${output}/canvas-selected.png`, fullPage: true });

  await page.reload({ waitUntil: 'networkidle' });
  await waitForCanvas();
  const canvasReload = await canvasReceipt();
  if (
    canvasReload.projectId !== initial.projectId ||
    canvasReload.background !== canvasColor ||
    canvasReload.renderedBackground !== canvasColor ||
    canvasReload.controlBackground !== canvasColor
  ) {
    throw new Error(`Canvas background did not persist through reload: ${JSON.stringify(canvasReload)}`);
  }

  await page.getByRole('link', { name: 'Motion', exact: true }).click();
  await page.waitForURL(
    (url) => url.pathname === '/animate' && url.searchParams.get('project') === initial.projectId
  );
  await waitForMotion(initial.projectId);
  const motionBefore = await page.evaluate(async () => {
    const project = await window.__drawWebMcpTools.draw_animation_inspect.execute({});
    return {
      projectId: project.id,
      background: project.background,
      controlBackground: document.querySelector('[aria-label="Paper color"]')?.value
    };
  });
  if (motionBefore.background !== canvasColor || motionBefore.controlBackground !== canvasColor) {
    throw new Error(`Motion did not inherit the Canvas background: ${JSON.stringify(motionBefore)}`);
  }

  const paperControl = page.getByLabel('Paper color');
  await paperControl.fill(motionColor);
  await paperControl.press('Tab');
  await page.waitForFunction(
    async (color) =>
      (await window.__drawWebMcpTools.draw_animation_inspect.execute({})).background === color,
    motionColor
  );
  await page.screenshot({ path: `${output}/motion-selected.png`, fullPage: true });
  await page.reload({ waitUntil: 'networkidle' });
  await waitForMotion(initial.projectId);
  await page.waitForFunction(async ({ projectId, color }) => {
    try {
      const project = await window.__drawWebMcpTools?.draw_animation_inspect?.execute({});
      return project?.id === projectId && project.background === color;
    } catch {
      return false;
    }
  }, { projectId: initial.projectId, color: motionColor });

  await page.getByRole('link', { name: 'Canvas', exact: true }).click();
  await page.waitForURL(
    (url) => url.pathname === '/' && url.searchParams.get('project') === initial.projectId
  );
  await waitForCanvas();
  const returnedCanvas = await canvasReceipt();
  if (
    returnedCanvas.background !== motionColor ||
    returnedCanvas.renderedBackground !== motionColor ||
    returnedCanvas.controlBackground !== motionColor
  ) {
    throw new Error(`Canvas did not receive the Motion background: ${JSON.stringify(returnedCanvas)}`);
  }

  const published = await page.evaluate(async (expiresAt) =>
    window.__drawWebMcpTools.draw_publish_snapshot.execute({ expiresAt }),
    new Date(Date.now() + 5 * 60_000).toISOString()
  );
  const anonymous = await browser.newContext({
    viewport: { width: 980, height: 720 },
    serviceWorkers: 'block'
  });
  const snapshot = await anonymous.newPage();
  await snapshot.goto(published.url, { waitUntil: 'networkidle' });
  const snapshotBackground = await snapshot
    .locator('[data-testid="snapshot-background"]')
    .getAttribute('fill');
  if (snapshotBackground !== motionColor) {
    throw new Error(`View-only snapshot background mismatch: ${snapshotBackground}`);
  }
  await snapshot.screenshot({ path: `${output}/view-only-snapshot.png`, fullPage: true });
  await anonymous.close();

  await page.evaluate(() =>
    window.__drawWebMcpTools.draw_revoke_snapshot.execute({ confirmation: 'REVOKE SNAPSHOT' })
  );
  const revoked = await context.request.get(published.url);
  if (revoked.status() !== 404) throw new Error(`Disposable snapshot remained public: ${revoked.status()}`);
  if (consoleErrors.length) throw new Error(`Browser console errors: ${consoleErrors.join(' | ')}`);

  console.log(
    JSON.stringify(
      {
        baseUrl,
        runLabel,
        projectId: initial.projectId,
        canvasColor,
        canvasReloadBackground: canvasReload.background,
        motionInheritedBackground: motionBefore.background,
        motionColor,
        returnedCanvasBackground: returnedCanvas.background,
        canvasObjectIds: Object.values(composed),
        snapshotUrl: published.url,
        snapshotBackground,
        snapshotRevoked: true,
        screenshots: [
          `${output}/canvas-selected.png`,
          `${output}/motion-selected.png`,
          `${output}/view-only-snapshot.png`
        ],
        result: 'pass'
      },
      null,
      2
    )
  );
} finally {
  await context.close();
  await browser.close();
}

import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const baseUrl = process.env.PLAYBOOK_BASE_URL ?? 'http://127.0.0.1:5173';
const outputRoot = resolve(
  process.cwd(),
  process.env.PLAYBOOK_EVIDENCE_DIR ?? 'output/playwright/cre-1642-playbook-identity'
);

const routes = [
  {
    path: '/',
    variant: 'home',
    title: 'Your people and AI need the same playbook.',
    links: ['/map', '/proof/marketplace-workflow']
  },
  {
    path: '/services',
    variant: 'services',
    title: 'Map the operation. Install the playbook.',
    links: ['/map', '/book?source=services&intent=workflow-mapping&lane=workflow_infrastructure']
  },
  {
    path: '/products',
    variant: 'products',
    title: 'One playbook. Three operating paths.',
    links: ['#choose-product']
  },
  {
    path: '/map',
    variant: 'map',
    title: 'See the whole operation before AI runs the play.',
    links: ['#canvas', '/book?source=agency&intent=workflow-mapping&lane=workflow_infrastructure']
  },
  {
    path: '/control',
    variant: 'control',
    title: 'Run offense and defense from one playbook.',
    links: ['/map', '/book?source=agency&intent=workflow-mapping&lane=workflow_infrastructure']
  },
  {
    path: '/field-reports',
    variant: 'proof',
    title: 'Review the film. Improve the playbook.',
    links: ['#reports', '/map']
  },
  {
    path: '/about',
    variant: null,
    title: 'I build calm, transparent workflow systems for operator-owned outcomes.',
    links: []
  }
];

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 }
];

const receipt = {
  contract: 'create-something-playbook-identity.v1',
  baseUrl,
  generatedAt: new Date().toISOString(),
  routes: [],
  failures: []
};

await mkdir(outputRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });

function expect(condition, message) {
  if (!condition) receipt.failures.push(message);
}

async function inspectRoute(page, route, viewport) {
  const runtimeErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => runtimeErrors.push(`page: ${error.message}`));

  const response = await page.goto(new URL(route.path, baseUrl).href, {
    waitUntil: 'networkidle'
  });

  const state = await page.evaluate(() => {
    const opening = document.querySelector('.performance-campaign-opening');
    const field = document.querySelector('[data-playbook-field]');
    const title = document.querySelector('h1');
    const actions = opening?.querySelector('.performance-campaign-opening__actions');
    const routePath = document.querySelector('.playbook-field__routes path');
    const rect = (element) => {
      if (!element) return null;
      const value = element.getBoundingClientRect();
      return {
        left: Math.round(value.left),
        top: Math.round(value.top),
        right: Math.round(value.right),
        bottom: Math.round(value.bottom),
        width: Math.round(value.width),
        height: Math.round(value.height)
      };
    };

    return {
      path: location.pathname,
      title: title?.textContent?.trim() ?? null,
      titleRect: rect(title),
      openingRect: rect(opening),
      actionsRect: rect(actions),
      field: field?.getAttribute('data-playbook-field') ?? null,
      fieldLabel: field?.getAttribute('aria-label') ?? null,
      fieldRect: rect(field),
      mode: opening?.getAttribute('data-mode') ?? null,
      fallbackPictures: opening?.querySelectorAll('picture').length ?? 0,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      routeAnimation: routePath ? getComputedStyle(routePath).animationName : null,
      links: [...(opening?.querySelectorAll('a') ?? [])].map((anchor) => ({
        text: anchor.textContent?.trim() ?? '',
        href: anchor.getAttribute('href')
      })),
      aboutOrigin: document.body.textContent?.includes('Division III basketball') ?? false
    };
  });

  let focus = null;
  if (route.variant) {
    for (let index = 0; index < 24; index += 1) {
      await page.keyboard.press('Tab');
      focus = await page.evaluate(() => {
        const active = document.activeElement;
        const style = active ? getComputedStyle(active) : null;
        return {
          href: active?.getAttribute('href') ?? null,
          text: active?.textContent?.trim() ?? null,
          outlineStyle: style?.outlineStyle ?? null,
          outlineWidth: style?.outlineWidth ?? null
        };
      });
      if (focus.href && route.links.includes(focus.href)) break;
    }
  }

  const slug = route.path === '/' ? 'home' : route.path.slice(1).replaceAll('/', '-');
  const screenshot = `${viewport.name}-${slug}.png`;
  await page.screenshot({
    path: resolve(outputRoot, screenshot),
    fullPage: false
  });

  expect(response?.ok(), `${viewport.name} ${route.path}: HTTP ${response?.status() ?? 'missing'}`);
  expect(state.title === route.title, `${viewport.name} ${route.path}: title mismatch`);
  expect(state.overflow <= 0, `${viewport.name} ${route.path}: horizontal overflow ${state.overflow}`);
  expect(runtimeErrors.length === 0, `${viewport.name} ${route.path}: ${runtimeErrors.join(' | ')}`);

  if (route.variant) {
    expect(state.field === route.variant, `${viewport.name} ${route.path}: field variant mismatch`);
    expect(Boolean(state.fieldLabel), `${viewport.name} ${route.path}: field description missing`);
    expect(state.mode !== 'paper', `${viewport.name} ${route.path}: Paper mode returned`);
    expect(state.fallbackPictures === 0, `${viewport.name} ${route.path}: fallback media returned`);
    const fieldOverlapsTitle = state.fieldRect && state.titleRect
      ? !(
          state.fieldRect.right <= state.titleRect.left ||
          state.fieldRect.left >= state.titleRect.right ||
          state.fieldRect.bottom <= state.titleRect.top ||
          state.fieldRect.top >= state.titleRect.bottom
        )
      : true;
    expect(!fieldOverlapsTitle, `${viewport.name} ${route.path}: field overlaps the headline lane`);
    expect(
      route.links.every((href) => state.links.some((link) => link.href === href)),
      `${viewport.name} ${route.path}: CTA destination drift`
    );
    expect(
      viewport.name !== 'desktop' || (state.actionsRect && state.actionsRect.bottom <= viewport.height),
      `${viewport.name} ${route.path}: actions fall below the first viewport`
    );
    expect(
      focus && route.links.includes(focus.href),
      `${viewport.name} ${route.path}: keyboard did not reach a hero action`
    );
    expect(
      focus?.outlineStyle !== 'none' && focus?.outlineWidth !== '0px',
      `${viewport.name} ${route.path}: hero action lacks visible focus`
    );
  } else {
    expect(state.aboutOrigin, `${viewport.name} /about: Division III origin missing`);
  }

  return { ...state, screenshot, runtimeErrors, focus };
}

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height }
    });
    const page = await context.newPage();

    for (const route of routes) {
      receipt.routes.push({
        viewport: viewport.name,
        ...(await inspectRoute(page, route, viewport))
      });
    }

    await context.close();
  }

  const reducedContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce'
  });
  const reducedPage = await reducedContext.newPage();
  const reducedMotion = [];

  for (const route of routes.filter((item) => item.variant)) {
    await reducedPage.goto(new URL(route.path, baseUrl).href, { waitUntil: 'networkidle' });
    const state = await reducedPage.evaluate(() => {
      const field = document.querySelector('[data-playbook-field]');
      const routePath = document.querySelector('.playbook-field__routes path');
      return {
        field: field?.getAttribute('data-playbook-field') ?? null,
        description: field?.getAttribute('aria-label') ?? null,
        animationName: routePath ? getComputedStyle(routePath).animationName : null,
        opacity: routePath ? getComputedStyle(routePath).opacity : null
      };
    });
    reducedMotion.push({ path: route.path, ...state });
    expect(state.field === route.variant, `reduced ${route.path}: field missing`);
    expect(state.animationName === 'none', `reduced ${route.path}: route animation remains active`);
    expect(state.opacity !== '0', `reduced ${route.path}: route meaning is hidden`);
  }

  receipt.reducedMotion = reducedMotion;
  await reducedContext.close();

  const ssrContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    javaScriptEnabled: false
  });
  const ssrPage = await ssrContext.newPage();
  const ssr = [];

  for (const route of routes.filter((item) => item.variant)) {
    await ssrPage.goto(new URL(route.path, baseUrl).href, { waitUntil: 'domcontentloaded' });
    const state = await ssrPage.evaluate(() => ({
      field: document.querySelector('[data-playbook-field]')?.getAttribute('data-playbook-field') ?? null,
      title: document.querySelector('h1')?.textContent?.trim() ?? null
    }));
    ssr.push({ path: route.path, ...state });
    expect(state.field === route.variant, `SSR ${route.path}: field missing without JavaScript`);
    expect(state.title === route.title, `SSR ${route.path}: title missing without JavaScript`);
  }

  receipt.ssr = ssr;
  await ssrContext.close();
} finally {
  await browser.close();
}

receipt.status = receipt.failures.length === 0 ? 'passed' : 'failed';
await writeFile(resolve(outputRoot, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);

if (receipt.failures.length > 0) {
  throw new Error(`Playbook verifier failed:\n- ${receipt.failures.join('\n- ')}`);
}

console.log(`Playbook verifier passed: ${resolve(outputRoot, 'receipt.json')}`);

/*
 * Webflow Review Snippet (POC)
 *
 * Paste into: Webflow -> Site Settings -> Custom Code -> Head Code
 *
 * Exposes:
 * - window.__wfReview: local API for humans/agents
 * - window.postMessage bridge for extensions (marker: __wf_review_snippet_v1)
 * - WebMCP registration when navigator.modelContext is available
 */
(() => {
  'use strict';

  const VERSION = '0.2.0';
  const MESSAGE_MARKER = '__wf_review_snippet_v1';

  /** @type {any | null} */
  let ix2InitPayload = null;
  /** @type {number | null} */
  let ix2CapturedAt = null;

  /** @type {{ interactions: any[], timelines: any[] } | null} */
  let ix3RegisterPayload = null;
  /** @type {number | null} */
  let ix3CapturedAt = null;

  const patchedWebflowRequireFns = new WeakSet();
  const wrappedIx2Modules = new WeakMap();
  const wrappedIx3Modules = new WeakMap();
  const wrappedIx3Instances = new WeakMap();

  function defineDataProp(obj, key, value) {
    // Some Webflow modules are module-namespace-like objects whose exports are getter-only.
    // Using assignment can throw in strict mode due to prototype accessors with no setter.
    Object.defineProperty(obj, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value,
    });
  }

  function wrapIx2Module(ix2) {
    if (!ix2) return ix2;
    const initFn = ix2.init;
    if (typeof initFn !== 'function') return ix2;

    const cached = wrappedIx2Modules.get(ix2);
    if (cached) return cached;

    const wrapped = Object.create(ix2);
    defineDataProp(wrapped, 'init', (...args) => {
      ix2InitPayload = args[0] ?? null;
      ix2CapturedAt = Date.now();

      const currentInit = ix2.init;
      if (typeof currentInit !== 'function') return undefined;
      return currentInit.apply(ix2, args);
    });

    wrappedIx2Modules.set(ix2, wrapped);
    return wrapped;
  }

  function wrapIx3Instance(inst) {
    if (!inst) return inst;
    if (typeof inst.register !== 'function') return inst;

    const cached = wrappedIx3Instances.get(inst);
    if (cached) return cached;

    const wrapped = Object.create(inst);
    defineDataProp(wrapped, 'register', (...args) => {
      const interactions = args[0];
      const timelines = args[1];

      if (Array.isArray(interactions) && Array.isArray(timelines)) {
        ix3RegisterPayload = { interactions, timelines };
        ix3CapturedAt = Date.now();
      }

      const currentRegister = inst.register;
      if (typeof currentRegister !== 'function') return undefined;
      return currentRegister.apply(inst, args);
    });

    wrappedIx3Instances.set(inst, wrapped);
    return wrapped;
  }

  function wrapIx3Module(ix3) {
    if (!ix3) return ix3;
    if (typeof ix3.getInstance !== 'function') return ix3;

    const cached = wrappedIx3Modules.get(ix3);
    if (cached) return cached;

    const wrapped = Object.create(ix3);
    defineDataProp(wrapped, 'getInstance', (...args) => {
      const currentGetInstance = ix3.getInstance;
      if (typeof currentGetInstance !== 'function') return null;
      const inst = currentGetInstance.apply(ix3, args);
      return wrapIx3Instance(inst);
    });

    wrappedIx3Modules.set(ix3, wrapped);
    return wrapped;
  }

  function patchWebflowRequire(webflow) {
    if (!webflow || typeof webflow.require !== 'function') return false;
    if (patchedWebflowRequireFns.has(webflow.require)) return true;

    const originalRequire = webflow.require.bind(webflow);
    const wrappedRequire = (name) => {
      const mod = originalRequire(name);
      if (name === 'ix2') return wrapIx2Module(mod);
      if (name === 'ix3') return wrapIx3Module(mod);
      return mod;
    };

    try {
      webflow.require = wrappedRequire;
      patchedWebflowRequireFns.add(wrappedRequire);
      return true;
    } catch {
      // Fall back to defining an own property if assignment fails (e.g. accessor with no setter).
    }

    try {
      defineDataProp(webflow, 'require', wrappedRequire);
      patchedWebflowRequireFns.add(wrappedRequire);
      return true;
    } catch {
      // If `require` is read-only, we can't patch. (We still attempt store-based reads later.)
      return false;
    }
  }

  let webflowHookInstalled = false;
  function installWebflowHook() {
    if (webflowHookInstalled) return;
    webflowHookInstalled = true;

    try {
      const desc = Object.getOwnPropertyDescriptor(window, 'Webflow');
      if (desc && desc.configurable === false) return;
      if (desc && (typeof desc.get === 'function' || typeof desc.set === 'function')) return;

      let current = window.Webflow;
      Object.defineProperty(window, 'Webflow', {
        configurable: true,
        enumerable: true,
        get() {
          return current;
        },
        set(v) {
          current = v;
          try {
            patchWebflowRequire(v);
          } catch {
            // ignore
          }
        },
      });

      if (current) patchWebflowRequire(current);
    } catch {
      // ignore
    }
  }

  function tryPatchWebflowNow() {
    try {
      return patchWebflowRequire(window.Webflow);
    } catch {
      return false;
    }
  }

  installWebflowHook();

  // Best-effort: keep trying for a short window in case Webflow loads later.
  // This is needed because published Webflow bundles call Webflow.require("ix2").init(...) during load.
  const patchStart = Date.now();
  const patchTimer = setInterval(() => {
    const patched = tryPatchWebflowNow();
    if (patched) clearInterval(patchTimer);
    if (Date.now() - patchStart > 15_000) clearInterval(patchTimer);
  }, 50);
  tryPatchWebflowNow();

  function getIx2Payload() {
    if (ix2InitPayload && typeof ix2InitPayload === 'object') {
      return { source: 'init', payload: ix2InitPayload, capturedAt: ix2CapturedAt };
    }

    try {
      // eslint-disable-next-line no-undef
      const wf = window.Webflow;
      if (!wf || typeof wf.require !== 'function') return { source: 'none', payload: null, capturedAt: null };
      const ix2 = wf.require('ix2');
      const store = ix2 && (ix2.store || ix2._store || ix2.__store);
      if (!store || typeof store.getState !== 'function') {
        return { source: 'none', payload: null, capturedAt: null };
      }

      const state = store.getState();
      if (state && state.ixData && state.ixData.events && state.ixData.actionLists) {
        return { source: 'store.ixData', payload: state.ixData, capturedAt: Date.now() };
      }
      if (state && state.events && state.actionLists) {
        return { source: 'store', payload: state, capturedAt: Date.now() };
      }

      return { source: 'none', payload: null, capturedAt: null };
    } catch {
      return { source: 'none', payload: null, capturedAt: null };
    }
  }

  function getIx3Payload() {
    if (ix3RegisterPayload) {
      return { source: 'register', payload: ix3RegisterPayload, capturedAt: ix3CapturedAt };
    }
    return { source: 'none', payload: null, capturedAt: null };
  }

  function collectWIdSet() {
    const set = new Set();
    const nodes = document.querySelectorAll('[data-w-id]');
    for (const node of nodes) {
      const id = node.getAttribute('data-w-id');
      if (id) set.add(id);
    }
    return set;
  }

  function normalizeText(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function truncateText(value, maxLen) {
    const s = normalizeText(value);
    if (!Number.isFinite(maxLen) || maxLen <= 0) return s;
    if (s.length <= maxLen) return s;
    return `${s.slice(0, Math.max(0, maxLen - 3))}...`;
  }

  function cssEscape(value) {
    try {
      // eslint-disable-next-line no-undef
      if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(String(value));
    } catch {
      // ignore
    }
    return String(value);
  }

  function getSimpleSelector(el) {
    try {
      if (!el || !(el instanceof Element)) return null;
      const tag = el.tagName.toLowerCase();
      const id = el.getAttribute('id');
      if (id) return `#${cssEscape(id)}`;

      const cls = normalizeText(el.getAttribute('class') || '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 3);
      if (cls.length) return `${tag}.${cls.map(cssEscape).join('.')}`;
      return tag;
    } catch {
      return null;
    }
  }

  function describeEl(el, { maxText = 140 } = {}) {
    if (!el || !(el instanceof Element)) return null;
    return {
      tag: el.tagName.toLowerCase(),
      id: el.getAttribute('id') || null,
      className: el.getAttribute('class') || null,
      text: truncateText(el.textContent || '', maxText) || null,
      selector: getSimpleSelector(el),
    };
  }

  const tools = Object.create(null);

  function registerTool(tool) {
    if (!tool || typeof tool.name !== 'string' || typeof tool.execute !== 'function') {
      throw new Error('Invalid tool');
    }
    tools[tool.name] = tool;
  }

  function listTools() {
    return Object.values(tools).map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));
  }

  async function callTool(name, input) {
    const tool = tools[name];
    if (!tool) throw new Error(`Unknown tool: ${name}`);
    return await tool.execute(input);
  }

  registerTool({
    name: 'get_site_info',
    description: 'Return basic information about the current Webflow-published page.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    execute: async () => {
      const root = document.documentElement;
      const generator = document.querySelector('meta[name="generator"]')?.getAttribute('content') || null;
      return {
        version: VERSION,
        url: window.location.href,
        origin: window.location.origin,
        pathname: window.location.pathname,
        title: document.title,
        generator,
        webflow: {
          domain: root.getAttribute('data-wf-domain') || null,
          siteId: root.getAttribute('data-wf-site') || null,
          pageId: root.getAttribute('data-wf-page') || null,
        },
        timestamp: Date.now(),
      };
    },
  });

  registerTool({
    name: 'get_sitemap_urls',
    description: 'Fetch and parse the site sitemap.xml and return the discovered URLs.',
    inputSchema: {
      type: 'object',
      properties: {
        sitemapPath: {
          type: 'string',
          description: 'Path or absolute URL to the sitemap.xml',
          default: '/sitemap.xml',
        },
        maxUrls: {
          type: 'integer',
          description: 'Maximum URLs to return',
          default: 500,
        },
      },
      additionalProperties: false,
    },
    execute: async ({ sitemapPath = '/sitemap.xml', maxUrls = 500 } = {}) => {
      const url = new URL(sitemapPath, window.location.origin).toString();
      const resp = await fetch(url, { method: 'GET' });
      if (!resp.ok) {
        throw new Error(`Failed to fetch sitemap: ${resp.status} ${resp.statusText}`);
      }
      const text = await resp.text();
      const doc = new DOMParser().parseFromString(text, 'application/xml');
      const locs = Array.from(doc.querySelectorAll('urlset > url > loc'));
      const urls = [];
      for (const loc of locs) {
        const v = (loc.textContent || '').trim();
        if (v) urls.push(v);
        if (urls.length >= maxUrls) break;
      }
      return { sitemapUrl: url, count: urls.length, urls };
    },
  });

  registerTool({
    name: 'audit_dom',
    description: 'Run lightweight DOM checks (images alt text, empty links) on the current page.',
    inputSchema: {
      type: 'object',
      properties: {
        maxExamples: {
          type: 'integer',
          description: 'Maximum examples to include per check',
          default: 20,
        },
      },
      additionalProperties: false,
    },
    execute: async ({ maxExamples = 20 } = {}) => {
      const imagesMissingAlt = Array.from(document.querySelectorAll('img:not([alt]), img[alt=""]'));
      const linksMissingHref = Array.from(document.querySelectorAll('a:not([href]), a[href=""]'));

      const imgExamples = imagesMissingAlt.slice(0, maxExamples).map((img) => ({
        src: img.getAttribute('src') || null,
        alt: img.getAttribute('alt'),
        className: img.getAttribute('class') || null,
      }));

      const linkExamples = linksMissingHref.slice(0, maxExamples).map((a) => ({
        text: (a.textContent || '').trim().slice(0, 120),
        href: a.getAttribute('href'),
        className: a.getAttribute('class') || null,
      }));

      return {
        imagesMissingAlt: {
          count: imagesMissingAlt.length,
          examples: imgExamples,
        },
        linksMissingHref: {
          count: linksMissingHref.length,
          examples: linkExamples,
        },
      };
    },
  });

  registerTool({
    name: 'audit_headings',
    description: 'Audit heading structure (H1 count, skipped levels, empty headings) on the current page.',
    inputSchema: {
      type: 'object',
      properties: {
        maxItems: {
          type: 'integer',
          description: 'Maximum items to include in each list',
          default: 50,
        },
      },
      additionalProperties: false,
    },
    execute: async ({ maxItems = 50 } = {}) => {
      const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'));

      const items = [];
      const emptyHeadings = [];
      const skippedHeadingLevels = [];

      let prev = null;
      for (const el of headings) {
        const tag = el.tagName.toLowerCase();
        const level = Number(tag.slice(1));
        const desc = describeEl(el, { maxText: 180 }) || { tag, id: null, className: null, text: null, selector: null };

        if (items.length < maxItems) items.push({ level, ...desc });

        if (!desc.text) {
          if (emptyHeadings.length < maxItems) emptyHeadings.push({ level, ...desc });
        }

        if (prev && Number.isFinite(prev.level) && Number.isFinite(level) && level > prev.level + 1) {
          if (skippedHeadingLevels.length < maxItems) {
            skippedHeadingLevels.push({
              fromLevel: prev.level,
              toLevel: level,
              previous: prev,
              current: { level, ...desc },
            });
          }
        }

        prev = { level, ...desc };
      }

      const h1Count = headings.filter((h) => h.tagName === 'H1').length;

      return {
        summary: {
          headings: headings.length,
          h1: h1Count,
          missingH1: h1Count === 0,
          multipleH1: h1Count > 1,
          skippedHeadingLevels: skippedHeadingLevels.length,
          emptyHeadings: emptyHeadings.length,
        },
        headings: items,
        skippedHeadingLevels,
        emptyHeadings,
      };
    },
  });

  registerTool({
    name: 'audit_meta',
    description: 'Audit SEO metadata on the current page (title, description, Open Graph, canonical, robots).',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    execute: async () => {
      const title = normalizeText(document.title || '');
      const description = normalizeText(
        document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
      );

      const canonical = normalizeText(document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '');
      const robots = normalizeText(document.querySelector('meta[name="robots"]')?.getAttribute('content') || '');
      const generator = normalizeText(
        document.querySelector('meta[name="generator"]')?.getAttribute('content') || ''
      );

      const ogTitle = normalizeText(
        document.querySelector('meta[property="og:title"]')?.getAttribute('content') || ''
      );
      const ogDescription = normalizeText(
        document.querySelector('meta[property="og:description"]')?.getAttribute('content') || ''
      );
      const ogImage = normalizeText(
        document.querySelector('meta[property="og:image"]')?.getAttribute('content') || ''
      );
      const ogUrl = normalizeText(
        document.querySelector('meta[property="og:url"]')?.getAttribute('content') || ''
      );
      const ogType = normalizeText(
        document.querySelector('meta[property="og:type"]')?.getAttribute('content') || ''
      );

      const warnings = [];
      if (title && title.length > 60) warnings.push({ code: 'title_too_long', length: title.length });
      if (description && (description.length < 50 || description.length > 170)) {
        warnings.push({ code: 'description_length_out_of_range', length: description.length });
      }

      const missing = [];
      if (!title) missing.push('title');
      if (!description) missing.push('description');
      if (!ogTitle) missing.push('og:title');
      if (!ogDescription) missing.push('og:description');
      if (!ogImage) missing.push('og:image');

      return {
        url: window.location.href,
        title: { present: Boolean(title), value: title || null, length: title.length },
        description: { present: Boolean(description), value: description || null, length: description.length },
        canonical: { present: Boolean(canonical), href: canonical || null },
        robots: { present: Boolean(robots), content: robots || null },
        generator: generator || null,
        openGraph: {
          title: ogTitle || null,
          description: ogDescription || null,
          image: ogImage || null,
          url: ogUrl || null,
          type: ogType || null,
        },
        missing,
        warnings,
      };
    },
  });

  registerTool({
    name: 'audit_links',
    description:
      'Audit links on the current page (empty/placeholder href, target=_blank rel=noopener, missing accessible name).',
    inputSchema: {
      type: 'object',
      properties: {
        maxExamples: {
          type: 'integer',
          description: 'Maximum examples to include per check',
          default: 20,
        },
      },
      additionalProperties: false,
    },
    execute: async ({ maxExamples = 20 } = {}) => {
      const links = Array.from(document.querySelectorAll('a'));

      const emptyHref = [];
      const placeholderHref = [];
      const blankTargetMissingRel = [];
      const missingAccessibleName = [];

      for (const a of links) {
        const href = (a.getAttribute('href') || '').trim();
        const target = (a.getAttribute('target') || '').trim();
        const rel = (a.getAttribute('rel') || '').trim();

        const text = truncateText(a.textContent || '', 120);
        const ariaLabel = normalizeText(a.getAttribute('aria-label') || '');
        const title = normalizeText(a.getAttribute('title') || '');
        const hasName = Boolean(text || ariaLabel || title);

        const desc = {
          ...describeEl(a, { maxText: 120 }),
          href: href || null,
          target: target || null,
          rel: rel || null,
        };

        if (!href) {
          if (emptyHref.length < maxExamples) emptyHref.push(desc);
        } else {
          const lower = href.toLowerCase();
          if (href === '#' || lower.startsWith('javascript:')) {
            if (placeholderHref.length < maxExamples) placeholderHref.push(desc);
          }
        }

        if (target === '_blank') {
          const hasNoopener = /\bnoopener\b/i.test(rel);
          if (!hasNoopener) {
            if (blankTargetMissingRel.length < maxExamples) blankTargetMissingRel.push(desc);
          }
        }

        if (!hasName) {
          if (missingAccessibleName.length < maxExamples) missingAccessibleName.push(desc);
        }
      }

      return {
        summary: {
          links: links.length,
          emptyHref: emptyHref.length,
          placeholderHref: placeholderHref.length,
          blankTargetMissingRel: blankTargetMissingRel.length,
          missingAccessibleName: missingAccessibleName.length,
        },
        emptyHref,
        placeholderHref,
        blankTargetMissingRel,
        missingAccessibleName,
      };
    },
  });

  function getUrlExtension(url) {
    try {
      if (!url) return null;
      if (url.startsWith('data:')) return 'data';
      const u = new URL(url, window.location.origin);
      const m = u.pathname.toLowerCase().match(/\.([a-z0-9]+)$/);
      return m ? m[1] : null;
    } catch {
      return null;
    }
  }

  function hasExplicitImageDimensions(img) {
    try {
      if (!img || !(img instanceof HTMLImageElement)) return false;
      if (img.hasAttribute('width') && img.hasAttribute('height')) return true;
      const style = window.getComputedStyle(img);
      const ar = style ? String(style.getPropertyValue('aspect-ratio') || '').trim() : '';
      if (ar && ar !== 'auto') return true;
      return false;
    } catch {
      return false;
    }
  }

  registerTool({
    name: 'audit_images',
    description:
      'Audit images on the current page (alt text, loading behavior, width/height or aspect-ratio hints).',
    inputSchema: {
      type: 'object',
      properties: {
        maxExamples: {
          type: 'integer',
          description: 'Maximum examples to include per check',
          default: 20,
        },
        aboveFoldThresholdPx: {
          type: 'integer',
          description: 'Pixels from top of viewport considered above-the-fold',
          default: 0,
        },
      },
      additionalProperties: false,
    },
    execute: async ({ maxExamples = 20, aboveFoldThresholdPx = 0 } = {}) => {
      const imgs = Array.from(document.querySelectorAll('img'));
      const viewport = { width: window.innerWidth, height: window.innerHeight };

      const missingAlt = [];
      const missingDimensions = [];
      const aboveFoldLazy = [];
      const belowFoldNotLazy = [];

      const formats = Object.create(null);

      for (const img of imgs) {
        const src = img.currentSrc || img.getAttribute('src') || '';
        const ext = getUrlExtension(src) || 'unknown';
        formats[ext] = (formats[ext] || 0) + 1;

        const alt = (img.getAttribute('alt') || '').trim();
        const loading = img.loading || img.getAttribute('loading') || null;

        const rect = img.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        const aboveFold = isVisible && rect.top <= viewport.height + Math.max(0, aboveFoldThresholdPx) && rect.bottom > 0;

        const desc = {
          ...describeEl(img, { maxText: 0 }),
          src: src || null,
          alt: alt || null,
          loading: loading || null,
          widthAttr: img.getAttribute('width') || null,
          heightAttr: img.getAttribute('height') || null,
        };

        if (!alt) {
          if (missingAlt.length < maxExamples) missingAlt.push(desc);
        }

        if (!hasExplicitImageDimensions(img)) {
          if (missingDimensions.length < maxExamples) missingDimensions.push(desc);
        }

        if (aboveFold && loading === 'lazy') {
          if (aboveFoldLazy.length < maxExamples) aboveFoldLazy.push(desc);
        }

        if (!aboveFold && isVisible && loading !== 'lazy') {
          if (belowFoldNotLazy.length < maxExamples) belowFoldNotLazy.push(desc);
        }
      }

      return {
        viewport,
        summary: {
          images: imgs.length,
          missingAlt: missingAlt.length,
          missingDimensions: missingDimensions.length,
          aboveFoldLazy: aboveFoldLazy.length,
          belowFoldNotLazy: belowFoldNotLazy.length,
        },
        formats,
        missingAlt,
        missingDimensions,
        aboveFoldLazy,
        belowFoldNotLazy,
      };
    },
  });

  function fieldHasLabel(field) {
    try {
      if (!field || !(field instanceof Element)) return false;
      const tag = field.tagName.toLowerCase();
      if (tag === 'input') {
        const type = (field.getAttribute('type') || '').toLowerCase();
        if (type === 'hidden') return true;
      }

      const ariaLabel = normalizeText(field.getAttribute('aria-label') || '');
      const ariaLabelledBy = normalizeText(field.getAttribute('aria-labelledby') || '');
      if (ariaLabel || ariaLabelledBy) return true;

      if (field.closest('label')) return true;

      const id = field.getAttribute('id');
      if (id) {
        const lbl = document.querySelector(`label[for="${cssEscape(id)}"]`);
        if (lbl) return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  registerTool({
    name: 'audit_forms',
    description: 'Audit forms for basic accessibility (labels / aria-labels on fields).',
    inputSchema: {
      type: 'object',
      properties: {
        maxExamples: {
          type: 'integer',
          description: 'Maximum examples to include',
          default: 20,
        },
      },
      additionalProperties: false,
    },
    execute: async ({ maxExamples = 20 } = {}) => {
      const fields = Array.from(document.querySelectorAll('input, select, textarea'));
      const missingLabels = [];

      for (const field of fields) {
        if (fieldHasLabel(field)) continue;
        if (missingLabels.length >= maxExamples) break;

        const tag = field.tagName.toLowerCase();
        const type = tag === 'input' ? (field.getAttribute('type') || 'text') : null;
        const name = field.getAttribute('name') || null;
        const placeholder = field.getAttribute('placeholder') || null;

        missingLabels.push({
          ...describeEl(field, { maxText: 0 }),
          fieldTag: tag,
          fieldType: type,
          name,
          placeholder,
        });
      }

      return {
        summary: {
          fields: fields.length,
          missingLabels: missingLabels.length,
        },
        missingLabels,
      };
    },
  });

  registerTool({
    name: 'audit_media',
    description: 'Audit video elements for autoplay/controls and background video pause controls.',
    inputSchema: {
      type: 'object',
      properties: {
        maxExamples: {
          type: 'integer',
          description: 'Maximum examples to include',
          default: 20,
        },
      },
      additionalProperties: false,
    },
    execute: async ({ maxExamples = 20 } = {}) => {
      const videos = Array.from(document.querySelectorAll('video'));
      const autoplayWithoutControls = [];
      const backgroundVideosMissingControl = [];

      for (const video of videos) {
        const autoplay = video.autoplay || video.hasAttribute('autoplay');
        const controls = video.controls || video.hasAttribute('controls');

        const wrapper = video.closest('.w-background-video');
        const isBackground = Boolean(wrapper);
        const hasControl = wrapper
          ? Boolean(
              wrapper.querySelector('.w-background-video--control, [data-w-bg-video-control], button')
            )
          : false;

        const src = video.currentSrc || video.getAttribute('src') || video.querySelector('source')?.getAttribute('src') || null;

        const desc = {
          ...describeEl(video, { maxText: 0 }),
          src,
          autoplay,
          controls,
          muted: video.muted || video.hasAttribute('muted'),
          loop: video.loop || video.hasAttribute('loop'),
          playsInline: video.playsInline || video.hasAttribute('playsinline'),
          isBackground,
          hasBackgroundControl: hasControl,
        };

        if (autoplay && !controls && !isBackground) {
          if (autoplayWithoutControls.length < maxExamples) autoplayWithoutControls.push(desc);
        }

        if (isBackground && autoplay && !hasControl) {
          if (backgroundVideosMissingControl.length < maxExamples) backgroundVideosMissingControl.push(desc);
        }
      }

      return {
        summary: {
          videos: videos.length,
          autoplayWithoutControls: autoplayWithoutControls.length,
          backgroundVideosMissingControl: backgroundVideosMissingControl.length,
        },
        autoplayWithoutControls,
        backgroundVideosMissingControl,
      };
    },
  });

  registerTool({
    name: 'audit_404',
    description: 'Probe a non-existent path to confirm the site serves a 404 page (status + basic structure).',
    inputSchema: {
      type: 'object',
      properties: {
        probePath: {
          type: 'string',
          description: 'Optional path to request (defaults to a random non-existent path)',
        },
      },
      additionalProperties: false,
    },
    execute: async ({ probePath } = {}) => {
      const rnd = Math.random().toString(36).slice(2);
      const path = probePath && typeof probePath === 'string' && probePath ? probePath : `/__wf_review_404_probe_${rnd}__`;
      const url = new URL(path, window.location.origin).toString();

      const resp = await fetch(url, { method: 'GET', redirect: 'follow' });
      const text = await resp.text().catch(() => '');

      let navCount = 0;
      let linkCount = 0;
      let h1Count = 0;
      let title = null;

      try {
        const doc = new DOMParser().parseFromString(text, 'text/html');
        title = normalizeText(doc.title || '') || null;
        navCount = doc.querySelectorAll('nav').length;
        linkCount = doc.querySelectorAll('a[href]').length;
        h1Count = doc.querySelectorAll('h1').length;
      } catch {
        // ignore
      }

      return {
        url,
        status: resp.status,
        ok: resp.status === 404,
        title,
        navCount,
        linkCount,
        h1Count,
      };
    },
  });

  registerTool({
    name: 'audit_webflow_way',
    description:
      'Run a consolidated Webflow Way-focused audit (published-site checks): meta, headings, DOM, links, images, forms, media, interactions.',
    inputSchema: {
      type: 'object',
      properties: {
        maxExamples: {
          type: 'integer',
          description: 'Maximum examples to include per check',
          default: 20,
        },
        includeSitemap: {
          type: 'boolean',
          description: 'Whether to include sitemap URLs in the output',
          default: false,
        },
        sitemapMaxUrls: {
          type: 'integer',
          description: 'Maximum sitemap URLs to include if includeSitemap is true',
          default: 200,
        },
      },
      additionalProperties: false,
    },
    execute: async ({ maxExamples = 20, includeSitemap = false, sitemapMaxUrls = 200 } = {}) => {
      const site = await callTool('get_site_info', {});
      const meta = await callTool('audit_meta', {});
      const headings = await callTool('audit_headings', { maxItems: maxExamples });
      const dom = await callTool('audit_dom', { maxExamples });
      const links = await callTool('audit_links', { maxExamples });
      const images = await callTool('audit_images', { maxExamples });
      const forms = await callTool('audit_forms', { maxExamples });
      const media = await callTool('audit_media', { maxExamples });

      const ix2 = await callTool('audit_ix2', { maxItems: maxExamples });
      const ix3 = await callTool('audit_ix3', { maxItems: maxExamples });

      const sitemap = includeSitemap
        ? await callTool('get_sitemap_urls', { maxUrls: sitemapMaxUrls })
        : null;

      return {
        site,
        meta,
        headings,
        dom,
        links,
        images,
        forms,
        media,
        interactions: { ix2, ix3 },
        sitemap,
      };
    },
  });

  registerTool({
    name: 'audit_ix2',
    description:
      'Audit Webflow Interactions (IX2) on this page: unused action lists, missing action lists, and missing target elements.',
    inputSchema: {
      type: 'object',
      properties: {
        maxItems: {
          type: 'integer',
          description: 'Maximum items to include in each list',
          default: 50,
        },
      },
      additionalProperties: false,
    },
    execute: async ({ maxItems = 50 } = {}) => {
      const { source, payload, capturedAt } = getIx2Payload();
      if (!payload) {
        return {
          source,
          capturedAt,
          available: false,
          summary: {
            events: 0,
            actionLists: 0,
            usedActionLists: 0,
            unusedActionLists: 0,
            missingTargets: 0,
            missingActionLists: 0,
          },
          unusedActionLists: [],
          missingTargets: [],
          missingActionLists: [],
        };
      }

      const events = payload.events && typeof payload.events === 'object' ? payload.events : {};
      const actionLists =
        payload.actionLists && typeof payload.actionLists === 'object' ? payload.actionLists : {};

      const wIds = collectWIdSet();

      const usedActionListIds = new Set();
      const missingActionLists = [];
      const missingTargets = [];

      for (const [eventId, event] of Object.entries(events)) {
        const actionListId = event?.action?.config?.actionListId;
        if (typeof actionListId === 'string' && actionListId) {
          usedActionListIds.add(actionListId);
          if (!Object.prototype.hasOwnProperty.call(actionLists, actionListId)) {
            missingActionLists.push({ eventId, actionListId });
          }
        }

        const targetIds = [];
        const target = event?.target;
        if (target?.appliesTo === 'ELEMENT' && typeof target.id === 'string' && target.id) {
          targetIds.push(target.id);
        }
        if (Array.isArray(event?.targets)) {
          for (const t of event.targets) {
            if (t?.appliesTo === 'ELEMENT' && typeof t.id === 'string' && t.id) {
              targetIds.push(t.id);
            }
          }
        }

        for (const targetId of targetIds) {
          if (!wIds.has(targetId)) {
            missingTargets.push({
              eventId,
              targetId,
              eventTypeId: event?.eventTypeId || null,
            });
          }
        }
      }

      const unusedActionLists = [];
      for (const [actionListId, actionList] of Object.entries(actionLists)) {
        if (!usedActionListIds.has(actionListId)) {
          unusedActionLists.push({
            id: actionListId,
            title: typeof actionList?.title === 'string' ? actionList.title : null,
          });
        }
      }

      return {
        source,
        capturedAt,
        available: true,
        summary: {
          events: Object.keys(events).length,
          actionLists: Object.keys(actionLists).length,
          usedActionLists: usedActionListIds.size,
          unusedActionLists: unusedActionLists.length,
          missingTargets: missingTargets.length,
          missingActionLists: missingActionLists.length,
        },
        unusedActionLists: unusedActionLists.slice(0, maxItems),
        missingTargets: missingTargets.slice(0, maxItems),
        missingActionLists: missingActionLists.slice(0, maxItems),
      };
    },
  });

  function extractIx3Selectors(interaction) {
    const out = [];
    if (!interaction || !Array.isArray(interaction.triggers)) return out;

    for (const trigger of interaction.triggers) {
      if (!Array.isArray(trigger) || trigger.length < 3) continue;
      const targetSpec = trigger[2];
      if (!Array.isArray(targetSpec) || targetSpec.length < 2) continue;

      const kind = targetSpec[0];
      if (kind === 'wf:class' && Array.isArray(targetSpec[1])) {
        for (const cls of targetSpec[1]) {
          if (typeof cls === 'string' && cls) out.push(`.${cls}`);
        }
      } else if (kind === 'wf:selector' && typeof targetSpec[1] === 'string') {
        out.push(targetSpec[1]);
      }
    }

    return out;
  }

  registerTool({
    name: 'audit_ix3',
    description:
      'Audit Webflow Interactions (IX3) on this page: missing timelines, deleted interactions, and selectors that match nothing on the current page.',
    inputSchema: {
      type: 'object',
      properties: {
        maxItems: {
          type: 'integer',
          description: 'Maximum items to include in each list',
          default: 50,
        },
      },
      additionalProperties: false,
    },
    execute: async ({ maxItems = 50 } = {}) => {
      const { source, payload, capturedAt } = getIx3Payload();
      if (!payload) {
        return {
          source,
          capturedAt,
          available: false,
          summary: {
            interactions: 0,
            timelines: 0,
            missingTimelines: 0,
            deletedInteractions: 0,
            missingTargetSelectors: 0,
          },
          missingTimelines: [],
          deletedInteractions: [],
          missingTargetSelectors: [],
        };
      }

      const interactions = Array.isArray(payload.interactions) ? payload.interactions : [];
      const timelines = Array.isArray(payload.timelines) ? payload.timelines : [];

      const timelineIds = new Set(timelines.map((t) => t?.id).filter((id) => typeof id === 'string'));

      const missingTimelines = [];
      const deletedInteractions = [];
      const missingTargetSelectors = [];

      for (const interaction of interactions) {
        const interactionId = interaction?.id;
        if (interaction?.deleted && typeof interactionId === 'string') {
          deletedInteractions.push({ interactionId });
        }

        const tids = Array.isArray(interaction?.timelineIds) ? interaction.timelineIds : [];
        for (const tid of tids) {
          if (typeof tid !== 'string') continue;
          if (!timelineIds.has(tid)) {
            missingTimelines.push({
              interactionId: typeof interactionId === 'string' ? interactionId : null,
              timelineId: tid,
            });
          }
        }

        const selectors = extractIx3Selectors(interaction);
        for (const selector of selectors) {
          try {
            if (!document.querySelector(selector)) {
              missingTargetSelectors.push({
                interactionId: typeof interactionId === 'string' ? interactionId : null,
                selector,
              });
            }
          } catch {
            // Invalid selector; ignore.
          }
        }
      }

      return {
        source,
        capturedAt,
        available: true,
        summary: {
          interactions: interactions.length,
          timelines: timelines.length,
          missingTimelines: missingTimelines.length,
          deletedInteractions: deletedInteractions.length,
          missingTargetSelectors: missingTargetSelectors.length,
        },
        missingTimelines: missingTimelines.slice(0, maxItems),
        deletedInteractions: deletedInteractions.slice(0, maxItems),
        missingTargetSelectors: missingTargetSelectors.slice(0, maxItems),
      };
    },
  });

  // Human/agent-friendly global
  // eslint-disable-next-line no-undef
  window.__wfReview = {
    version: VERSION,
    listTools,
    callTool,
    auditAll: async ({ maxExamples = 20, includeSitemap = false } = {}) => {
      return await callTool('audit_webflow_way', { maxExamples, includeSitemap });
    },
  };

  // postMessage bridge (for content scripts living in an "isolated world")
  window.addEventListener('message', async (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data[MESSAGE_MARKER] !== true) return;
    if (data.type !== 'call_tool') return;

    const id = data.id;
    const toolName = data.tool;
    const input = data.input;

    if (typeof id !== 'string' || typeof toolName !== 'string') return;

    try {
      const result = await callTool(toolName, input);
      window.postMessage(
        { [MESSAGE_MARKER]: true, type: 'tool_result', id, ok: true, result },
        '*'
      );
    } catch (err) {
      window.postMessage(
        {
          [MESSAGE_MARKER]: true,
          type: 'tool_result',
          id,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        },
        '*'
      );
    }
  });

  // WebMCP registration (future-facing; no-op in browsers without the proposal implemented)
  try {
    // eslint-disable-next-line no-undef
    const modelContext = window.navigator && window.navigator.modelContext;

    const toWebMcpTool = (t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      execute: async (input, agent) => {
        const raw = await t.execute(input, agent);

        // If a tool already returns a WebMCP-style response, pass it through.
        if (raw && typeof raw === 'object' && Array.isArray(raw.content)) return raw;

        let text;
        try {
          text = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
        } catch {
          text = raw == null ? String(raw) : '[unserializable tool result]';
        }

        return { content: [{ type: 'text', text }] };
      },
    });

    if (modelContext && typeof modelContext.provideContext === 'function') {
      modelContext.provideContext({
        tools: Object.values(tools).map(toWebMcpTool),
      });
    } else if (modelContext && typeof modelContext.registerTool === 'function') {
      for (const t of Object.values(tools)) {
        modelContext.registerTool(toWebMcpTool(t));
      }
    }
  } catch {
    // Ignore WebMCP registration failures.
  }
})();

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

  const VERSION = '0.1.1';
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
    auditAll: async () => {
      const dom = await callTool('audit_dom', {});
      const ix2 = await callTool('audit_ix2', {});
      const ix3 = await callTool('audit_ix3', {});
      return { dom, ix2, ix3 };
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
    if (modelContext && typeof modelContext.provideContext === 'function') {
      modelContext.provideContext({
        tools: Object.values(tools).map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
          execute: t.execute,
        })),
      });
    } else if (modelContext && typeof modelContext.registerTool === 'function') {
      for (const t of Object.values(tools)) {
        modelContext.registerTool({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
          execute: t.execute,
        });
      }
    }
  } catch {
    // Ignore WebMCP registration failures.
  }
})();

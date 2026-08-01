export function extractOfferSavingsWidgetResult(
  payload: unknown
): Record<string, unknown> | null {
  const queue: unknown[] = [payload];
  const seen = new Set<unknown>();
  while (queue.length > 0) {
    const candidate = queue.shift();
    if (!candidate || typeof candidate !== 'object' || seen.has(candidate)) continue;
    seen.add(candidate);
    const record = candidate as Record<string, unknown>;
    if (typeof record.operation === 'string') return record;
    for (const key of [
      'structuredContent',
      'result',
      'mcp_tool_result',
      'call_tool_result',
      'toolOutput'
    ]) {
      if (record[key] !== undefined) queue.push(record[key]);
    }
  }
  return null;
}

const WIDGET_RESULT_EXTRACTOR = extractOfferSavingsWidgetResult.toString();

export const OFFER_SAVINGS_WIDGET_HTML = String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <title>Offer Savings</title>
    <style>
      :root {
        color: #182018;
        background: #f5f2e9;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-synthesis: none;
      }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; padding: 18px; background: radial-gradient(circle at 85% 0, #d8e5c8, transparent 42%), #f5f2e9; }
      main { width: min(100%, 720px); margin: 0 auto; }
      .shell { overflow: hidden; border: 1px solid #d3d5c5; border-radius: 24px; background: rgba(255,255,255,.9); box-shadow: 0 18px 50px rgba(49,57,42,.12); }
      header { display: flex; justify-content: space-between; gap: 16px; padding: 22px 22px 18px; border-bottom: 1px solid #e2e3d8; }
      .eyebrow { margin: 0 0 5px; color: #526149; font-size: 11px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
      h1 { margin: 0; font: 650 27px/1.08 Georgia, serif; letter-spacing: -.02em; }
      .search-order { align-self: start; padding: 7px 10px; border-radius: 999px; background: #edf3e8; color: #3d5638; font-size: 12px; font-weight: 750; white-space: nowrap; }
      #summary { margin: 0; padding: 14px 22px; color: #4d5549; font-size: 14px; line-height: 1.45; }
      #offers { display: grid; gap: 12px; padding: 0 14px 14px; }
      #evidence-section { margin: 0 14px 14px; padding-top: 4px; border-top: 1px solid #e2e3d8; }
      .section-title { margin: 14px 3px 10px; font-size: 14px; }
      #evidence { display: grid; gap: 8px; }
      .evidence { padding: 13px; border: 1px dashed #cfd2c8; border-radius: 14px; background: #f8f8f3; }
      .offer { padding: 17px; border: 1px solid #dedfd6; border-radius: 18px; background: #fff; }
      .offer[data-best="true"] { border-color: #768f68; box-shadow: inset 0 0 0 1px #768f68; }
      .offer-top { display: flex; align-items: start; justify-content: space-between; gap: 14px; }
      .lane { margin: 0 0 3px; color: #667061; font-size: 11px; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; }
      h2 { margin: 0; font-size: 17px; line-height: 1.25; }
      .confidence { flex: none; padding: 5px 8px; border-radius: 999px; background: #f0f1ec; color: #4d5549; font-size: 11px; font-weight: 800; }
      .confidence[data-level="Verified"] { background: #dcebd5; color: #275629; }
      .confidence[data-level="High confidence"] { background: #e8efd9; color: #435d25; }
      .confidence[data-level="Worth trying"] { background: #fff0c9; color: #775400; }
      .confidence[data-level="Do not use"] { background: #f6dedd; color: #862b27; }
      .offer-value { display: flex; align-items: baseline; gap: 10px; margin: 16px 0 7px; }
      .code { font: 750 20px/1 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .03em; }
      .savings { color: #2f6635; font-weight: 800; }
      .disclosure { margin: 0; color: #5d6559; font-size: 13px; line-height: 1.45; }
      .source { display: inline-block; margin-top: 9px; color: #435d3f; font-size: 12px; }
      .freshness { margin: 9px 0 0; color: #667061; font-size: 12px; font-weight: 700; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 15px; }
      button { min-height: 38px; border: 0; border-radius: 999px; padding: 9px 14px; font: inherit; font-size: 13px; font-weight: 800; cursor: pointer; }
      button.primary { background: #233d26; color: #fff; }
      button.secondary { background: #edf0e8; color: #29422c; }
      button:disabled { cursor: not-allowed; opacity: .5; }
      #status { min-height: 42px; margin: 0; padding: 12px 22px 18px; color: #4c5848; font-size: 13px; }
      #empty { padding: 24px; color: #5d6559; }
      @media (max-width: 520px) { body { padding: 0; } .shell { border-radius: 0; border-left: 0; border-right: 0; } header { align-items: start; flex-direction: column; } }
      @media (prefers-color-scheme: dark) {
        :root { color: #ecf0e8; background: #161a15; }
        body { background: radial-gradient(circle at 85% 0, #2b3a27, transparent 42%), #161a15; }
        .shell { border-color: #3d453b; background: rgba(30,35,29,.95); }
        header { border-color: #3d453b; } .search-order { background: #2d3d29; color: #cfe0c7; }
        #summary, .disclosure, #status, #empty { color: #bcc5b7; }
        .offer { border-color: #454c42; background: #242a23; }
        .evidence { border-color: #50584d; background: #20251f; }
        .offer[data-best="true"] { border-color: #91aa83; box-shadow: inset 0 0 0 1px #91aa83; }
        .lane { color: #aab5a5; } .source { color: #b8cdb1; } button.secondary { background: #394237; color: #edf2e9; }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="shell" aria-labelledby="title">
        <header><div><p class="eyebrow">Public offer intelligence</p><h1 id="title">Offer Savings</h1></div><span class="search-order">LTK coupons first</span></header>
        <p id="summary">Waiting for a public offer result.</p>
        <div id="offers" aria-live="polite"></div>
        <p id="empty" hidden>No LTK coupon or supplemental fallback offer was returned. A watch can still check again before the deadline.</p>
        <section id="evidence-section" hidden aria-labelledby="evidence-title">
          <h2 id="evidence-title" class="section-title">Evidence-only sources</h2>
          <div id="evidence"></div>
        </section>
        <p id="status" role="status" aria-live="polite"></p>
      </section>
    </main>
    <script type="module">
      const standalone = window.__OFFER_SAVINGS_STANDALONE__ ?? null;
      const extractOfferSavingsWidgetResult = ${WIDGET_RESULT_EXTRACTOR};
      let toolOutput = extractOfferSavingsWidgetResult(window.openai?.toolOutput)
        ?? extractOfferSavingsWidgetResult(window.openai?.toolResponseMetadata)
        ?? extractOfferSavingsWidgetResult(standalone?.initialResult);
      let rpcId = 0;
      const pending = new Map();
      const offersEl = document.querySelector('#offers');
      const evidenceSectionEl = document.querySelector('#evidence-section');
      const evidenceEl = document.querySelector('#evidence');
      const summaryEl = document.querySelector('#summary');
      const emptyEl = document.querySelector('#empty');
      const statusEl = document.querySelector('#status');

      function node(tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
      }

      function formatMoney(value) {
        if (!value || typeof value.amount !== 'number') return null;
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: value.currency }).format(value.amount);
      }

      function applyToolResult(result) {
        const nextResult = extractOfferSavingsWidgetResult(result);
        if (nextResult) toolOutput = nextResult;
        if (toolOutput?.operation === 'watch_offers') {
          statusEl.textContent = toolOutput.created ? 'Watch active. We will keep the same watch if this action is retried.' : 'This watch was already active; no duplicate was created.';
          document.body.dataset.watchId = toolOutput.watch?.id ?? '';
        }
        render();
      }

      function applyHostGlobals(globals) {
        applyToolResult(
          extractOfferSavingsWidgetResult(globals?.toolOutput)
            ?? extractOfferSavingsWidgetResult(globals?.toolResponseMetadata)
        );
      }

      function render() {
        const result = toolOutput?.operation === 'find_offers' ? toolOutput : toolOutput?.watch?.latestResult;
        const offers = Array.isArray(result?.offers) ? result.offers : [];
        const evidence = Array.isArray(result?.evidence) ? result.evidence : [];
        offersEl.replaceChildren();
        evidenceEl.replaceChildren();
        if (!result) {
          emptyEl.hidden = true;
          evidenceSectionEl.hidden = true;
          summaryEl.textContent = 'Search in progress. Waiting for a completed offer result.';
          return;
        }
        const ltkCount = result?.counts?.ltk ?? offers.filter((offer) => offer.source?.lane === 'ltk').length;
        const supplementalCount = result?.counts?.supplemental ?? offers.filter((offer) => offer.source?.lane !== 'ltk').length;
        const run = String(result?.receiptHash ?? '').replace(/^sha256:/, '').slice(0, 10) || 'pending';
        emptyEl.hidden = offers.length > 0;
        evidenceSectionEl.hidden = evidence.length === 0;
        summaryEl.textContent = String(ltkCount) + ' LTK coupon candidate' + (ltkCount === 1 ? '' : 's') + '; ' + String(supplementalCount) + ' supplemental fallback offer' + (supplementalCount === 1 ? '' : 's') + '; ' + String(evidence.length) + ' evidence-only source' + (evidence.length === 1 ? '' : 's') + '. Search run ' + run + '.';

        offers.forEach((offer, index) => {
          const card = node('article', 'offer');
          card.dataset.best = String(index === 0 && offer.status !== 'rejected');
          card.dataset.confidence = offer.confidence?.label ?? 'Uncertain';
          const top = node('div', 'offer-top');
          const names = node('div');
          names.append(node('p', 'lane', offer.source?.lane === 'ltk' ? 'LTK coupon' : 'Supplemental fallback'));
          names.append(node('h2', '', offer.merchant + ' — ' + offer.title));
          const confidence = node('span', 'confidence', offer.confidence?.label ?? 'Uncertain');
          confidence.dataset.level = offer.confidence?.label ?? 'Uncertain';
          confidence.title = 'Reliability score ' + String(offer.confidence?.score ?? 0) + ' out of 100';
          top.append(names, confidence);
          card.append(top);

          const value = node('div', 'offer-value');
          value.append(node('span', 'code', offer.code ?? 'No code'));
          const savings = formatMoney(offer.projectedSavings);
          if (savings) value.append(node('span', 'savings', 'Save about ' + savings));
          card.append(value, node('p', 'disclosure', offer.disclosure ?? 'Review retailer terms before relying on this offer.'));
          card.append(node('p', 'freshness', 'Freshness ' + String(offer.freshness?.score ?? 0) + '/100'));

          const source = node('a', 'source', 'View public source');
          source.href = offer.source?.url ?? '#';
          source.target = '_blank';
          source.rel = 'noreferrer';
          source.addEventListener('click', (event) => {
            if (window.openai?.openExternal && offer.source?.url) {
              event.preventDefault();
              void window.openai.openExternal({ href: offer.source.url });
            }
          });
          card.append(source);

          const actions = node('div', 'actions');
          const tryButton = node('button', 'primary', 'Try this code');
          tryButton.type = 'button';
          tryButton.disabled = !offer.actions?.canCopyCode || !offer.code;
          tryButton.addEventListener('click', async () => {
            try {
              await navigator.clipboard.writeText(offer.code);
              statusEl.textContent = 'Code copied. Checkout verification is still required.';
            } catch {
              statusEl.textContent = 'Copy was unavailable. Select the visible code manually.';
            }
          });
          const watchButton = node('button', 'secondary', 'Watch for a better offer');
          watchButton.type = 'button';
          watchButton.disabled = !offer.actions?.canWatch || !result?.resolution?.request;
          watchButton.addEventListener('click', async () => {
            watchButton.disabled = true;
            statusEl.textContent = 'Starting a bounded offer watch…';
            try {
              const request = result.resolution.request;
              const input = standalone?.watchInput ?? {
                request,
                until: request.deadline + 'T23:59:59.000Z',
                idempotencyKey: 'widget-' + String(offer.receiptHash ?? request.deadline).replace(/[^a-z0-9]/gi, '').slice(-40)
              };
              applyToolResult(await callTool('watch_offers', input));
            } catch (error) {
              statusEl.textContent = 'The watch could not be started: ' + (error?.message ?? 'unknown error');
            } finally {
              watchButton.disabled = false;
            }
          });
          actions.append(tryButton, watchButton);
          card.append(actions);
          offersEl.append(card);
        });

        evidence.forEach((item) => {
          const card = node('article', 'evidence');
          const top = node('div', 'offer-top');
          const names = node('div');
          names.append(node('p', 'lane', 'Not an offer'));
          names.append(node('h2', '', item.merchant + ' — ' + item.title));
          const confidence = node('span', 'confidence', 'Evidence only');
          confidence.dataset.level = 'Evidence only';
          top.append(names, confidence);
          card.append(top, node('p', 'disclosure', item.disclosure ?? 'This source did not contain a concrete coupon or discount.'));
          const source = node('a', 'source', 'View supporting source');
          source.href = item.source?.url ?? '#';
          source.target = '_blank';
          source.rel = 'noreferrer';
          source.addEventListener('click', (event) => {
            if (window.openai?.openExternal && item.source?.url) {
              event.preventDefault();
              void window.openai.openExternal({ href: item.source.url });
            }
          });
          card.append(source);
          evidenceEl.append(card);
        });
      }

      function notify(method, params) {
        window.parent.postMessage({ jsonrpc: '2.0', method, params }, '*');
      }

      function request(method, params) {
        return new Promise((resolve, reject) => {
          const id = ++rpcId;
          const timeout = setTimeout(() => { pending.delete(id); reject(new Error('Host bridge timed out.')); }, 10000);
          pending.set(id, { resolve, reject, timeout });
          window.parent.postMessage({ jsonrpc: '2.0', id, method, params }, '*');
        });
      }

      window.addEventListener('message', (event) => {
        if (event.source !== window.parent) return;
        const message = event.data;
        if (!message || message.jsonrpc !== '2.0') return;
        if (typeof message.id === 'number') {
          const item = pending.get(message.id);
          if (!item) return;
          clearTimeout(item.timeout);
          pending.delete(message.id);
          if (message.error) item.reject(new Error(message.error.message ?? 'Host request failed.'));
          else item.resolve(message.result);
          return;
        }
        if (message.method === 'ui/notifications/tool-result') applyToolResult(message.params);
      }, { passive: true });

      window.addEventListener('openai:set_globals', (event) => {
        applyHostGlobals(event.detail?.globals);
      }, { passive: true });

      const bridgeReady = window.parent === window
        ? Promise.resolve()
        : request('ui/initialize', {
            appInfo: { name: 'offer-savings-widget', version: '0.2.1' },
            appCapabilities: {},
            protocolVersion: '2026-01-26'
          }).then(() => {
            notify('ui/notifications/initialized', {});
            applyHostGlobals(window.openai);
          });

      async function callTool(name, argumentsValue) {
        if (window.parent !== window) {
          await bridgeReady;
          return request('tools/call', { name, arguments: argumentsValue });
        }
        if (standalone) {
          const response = await fetch('/v1/watches', {
            method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(argumentsValue)
          });
          const body = await response.json();
          if (!response.ok) throw new Error(body.message ?? 'Standalone tool call failed.');
          return { structuredContent: body };
        }
        if (window.openai?.callTool) return window.openai.callTool(name, argumentsValue);
        throw new Error('No MCP Apps host or standalone development data is available.');
      }

      render();
    </script>
  </body>
</html>`;

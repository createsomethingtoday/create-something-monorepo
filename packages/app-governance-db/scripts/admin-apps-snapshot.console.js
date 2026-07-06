/**
 * Webflow Apps Admin Snapshot
 *
 * Run in the browser console at https://webflow.com/apps (ADMIN VIEW, logged in
 * via Okta, device on Tailscale). Loads every app card, captures listing state
 * (name, slug, visibility, review status), optionally enriches with
 * clientId/workspaceId from each edit page, then downloads a JSON snapshot.
 *
 * Feed the downloaded file to scripts/push-admin-apps.mjs to sync into the
 * app-governance-db D1 layer.
 *
 * Lineage: packages/webflow-apps-admin/src/console/client-id-audit.js
 */

(async function snapshotAdminApps() {
  const CONFIG = {
    RATE_LIMIT_MS: 500,
    LOAD_MORE_WAIT_MS: 1500,
    LOAD_MORE_SELECTOR: '[data-automation-id="collection-list-load-more"]',
    APP_LINK_SELECTOR: 'a[href^="/apps/detail/"]',
    CLIENT_ID_SELECTOR: '#clientId',
    WORKSPACE_ID_SELECTOR: '#workspaceId',
    // Set false for a fast listing-only snapshot (no per-app edit-page fetches).
    ENRICH_FROM_EDIT_PAGES: true,
    VISIBILITY_TOKENS: ['PUBLIC', 'PRIVATE'],
    STATUS_TOKENS: ['APPROVED', 'PENDING', 'DENIED', 'IN REVIEW', 'DRAFT', 'ARCHIVED'],
  };

  async function loadAllApps() {
    console.log('🔄 Loading all apps…');
    let clicks = 0;
    while (true) {
      const btn = document.querySelector(CONFIG.LOAD_MORE_SELECTOR);
      if (!btn || btn.disabled) break;
      const style = window.getComputedStyle(btn);
      if (style.display === 'none' || style.visibility === 'hidden') break;
      btn.click();
      clicks++;
      await new Promise((r) => setTimeout(r, CONFIG.LOAD_MORE_WAIT_MS));
    }
    console.log(`✅ Loaded (${clicks} "Show more" clicks)`);
  }

  function extractBadges(container) {
    const text = (container?.innerText || '').toUpperCase();
    const visibility = CONFIG.VISIBILITY_TOKENS.find((t) => text.includes(t)) ?? null;
    const review_status = CONFIG.STATUS_TOKENS.find((t) => text.includes(t)) ?? null;
    return { visibility, review_status };
  }

  function collectApps() {
    const seen = new Set();
    const apps = [];
    for (const link of document.querySelectorAll(CONFIG.APP_LINK_SELECTOR)) {
      const match = (link.getAttribute('href') || '').match(/^\/apps\/detail\/([^\/]+)$/);
      if (!match || seen.has(match[1])) continue;
      seen.add(match[1]);
      const card = link.closest('li, article, [class*="card"], [class*="Card"]') || link;
      const img = link.querySelector('img[alt]');
      const { visibility, review_status } = extractBadges(card);
      apps.push({
        slug: match[1],
        name: img?.alt || link.textContent?.trim() || match[1],
        visibility,
        review_status,
        detail_url: `${location.origin}/apps/detail/${match[1]}`,
      });
    }
    return apps;
  }

  async function enrich(app) {
    try {
      const res = await fetch(`${app.detail_url}/edit`, { credentials: 'include', headers: { Accept: 'text/html' } });
      if (!res.ok) return { ...app, enrich_error: `HTTP ${res.status}` };
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      return {
        ...app,
        client_id: doc.querySelector(CONFIG.CLIENT_ID_SELECTOR)?.value || null,
        workspace_id: doc.querySelector(CONFIG.WORKSPACE_ID_SELECTOR)?.value || null,
      };
    } catch (err) {
      return { ...app, enrich_error: String(err) };
    }
  }

  await loadAllApps();
  let apps = collectApps();
  console.log(`📋 ${apps.length} apps collected from listing.`);

  if (CONFIG.ENRICH_FROM_EDIT_PAGES) {
    const enriched = [];
    for (let i = 0; i < apps.length; i++) {
      enriched.push(await enrich(apps[i]));
      if ((i + 1) % 25 === 0) console.log(`  …${i + 1}/${apps.length}`);
      await new Promise((r) => setTimeout(r, CONFIG.RATE_LIMIT_MS));
    }
    apps = enriched;
  }

  const snapshot = {
    captured_at: new Date().toISOString(),
    source: 'webflow.com/apps (admin view)',
    count: apps.length,
    apps,
  };
  window.adminAppsSnapshot = snapshot;

  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `admin-apps-snapshot-${snapshot.captured_at.slice(0, 10)}.json`;
  a.click();
  console.log(`✅ Snapshot downloaded (${apps.length} apps). Also on window.adminAppsSnapshot`);
})();

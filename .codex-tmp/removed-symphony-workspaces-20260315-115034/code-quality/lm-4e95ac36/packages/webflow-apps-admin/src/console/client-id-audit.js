/**
 * Webflow Apps Client ID Audit Script
 * 
 * Scans all apps in the Webflow Marketplace to detect duplicate Client IDs.
 * Run this in the browser console while logged into https://webflow.com/apps
 * 
 * @version 2.0.0
 * @author CREATE SOMETHING
 * @see https://github.com/create-something/create-something-monorepo/tree/main/packages/webflow-apps-admin
 */

(async function checkDuplicateClientIds() {
  const results = [];
  const baseUrl = window.location.origin;
  
  // Configuration
  const CONFIG = {
    RATE_LIMIT_MS: 500,       // Delay between requests
    LOAD_MORE_WAIT_MS: 1500,  // Wait after clicking load more
    LOAD_MORE_SELECTOR: '[data-automation-id="collection-list-load-more"]',
    APP_LINK_SELECTOR: 'a[href^="/apps/detail/"]',
    CLIENT_ID_SELECTOR: '#clientId',
    WORKSPACE_ID_SELECTOR: '#workspaceId',
    APP_NAME_SELECTOR: '#name'
  };
  
  // Step 1: Load all apps by clicking "Show more"
  async function loadAllApps() {
    console.log('🔄 Loading all apps...');
    let clickCount = 0;
    
    while (true) {
      const loadMoreBtn = document.querySelector(CONFIG.LOAD_MORE_SELECTOR);
      
      if (!loadMoreBtn) break;
      
      // Check visibility
      const style = window.getComputedStyle(loadMoreBtn);
      if (style.display === 'none' || style.visibility === 'hidden') break;
      if (loadMoreBtn.disabled) break;
      
      loadMoreBtn.click();
      clickCount++;
      console.log(`  Clicked "Show more" (${clickCount})`);
      
      await new Promise(r => setTimeout(r, CONFIG.LOAD_MORE_WAIT_MS));
    }
    
    console.log(`✅ Finished loading (${clickCount} clicks)`);
  }
  
  // Step 2: Collect all app URLs
  function getAppUrls() {
    const apps = [];
    const seen = new Set();
    
    // Find all app links (excluding /edit paths)
    const appLinks = document.querySelectorAll(CONFIG.APP_LINK_SELECTOR);
    
    for (const link of appLinks) {
      const href = link.getAttribute('href');
      const match = href.match(/^\/apps\/detail\/([^\/]+)$/);
      
      if (!match || seen.has(match[1])) continue;
      seen.add(match[1]);
      
      // Get app name from img alt or link text
      const img = link.querySelector('img[alt]');
      const name = img?.alt || link.textContent?.trim() || match[1];
      
      apps.push({
        slug: match[1],
        name: name,
        detailUrl: `${baseUrl}/apps/detail/${match[1]}`,
        editUrl: `${baseUrl}/apps/detail/${match[1]}/edit`
      });
    }
    
    return apps;
  }
  
  // Step 3: Fetch edit page and extract data
  async function getAppData(app) {
    try {
      const response = await fetch(app.editUrl, {
        credentials: 'include',
        headers: { 'Accept': 'text/html' }
      });
      
      if (response.status === 401 || response.status === 403) {
        return { ...app, clientId: null, workspaceId: null, error: 'No edit access' };
      }
      
      if (!response.ok) {
        return { ...app, clientId: null, workspaceId: null, error: `HTTP ${response.status}` };
      }
      
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Extract fields using exact selectors
      const clientId = doc.querySelector(CONFIG.CLIENT_ID_SELECTOR)?.value || null;
      const workspaceId = doc.querySelector(CONFIG.WORKSPACE_ID_SELECTOR)?.value || null;
      const appName = doc.querySelector(CONFIG.APP_NAME_SELECTOR)?.value || app.name;
      
      // Fallback: regex extraction if DOM parsing fails
      if (!clientId) {
        const match = html.match(/id="clientId"[^>]*value="([^"]+)"/);
        if (match) {
          return { 
            ...app, 
            name: appName,
            clientId: match[1], 
            workspaceId: workspaceId 
          };
        }
      }
      
      return { 
        ...app, 
        name: appName,
        clientId, 
        workspaceId,
        error: clientId ? null : 'Client ID not found'
      };
      
    } catch (error) {
      return { ...app, clientId: null, workspaceId: null, error: error.message };
    }
  }
  
  // Main execution
  console.clear();
  console.log('%c🔍 Webflow Apps Client ID Audit', 'font-size: 18px; font-weight: bold;');
  console.log('%c   by CREATE SOMETHING', 'font-size: 12px; color: #666;');
  console.log('━'.repeat(50));
  
  // Verify we're on the right page
  if (!window.location.href.includes('/apps')) {
    console.error('❌ Please navigate to https://webflow.com/apps first');
    return;
  }
  
  // Load all apps
  await loadAllApps();
  
  // Get app URLs
  const apps = getAppUrls();
  console.log(`\n📋 Found ${apps.length} apps\n`);
  
  if (apps.length === 0) {
    console.error('❌ No apps found. Are you logged in?');
    return;
  }
  
  // Fetch data for each app
  console.log('🔍 Fetching Client IDs...\n');
  
  for (let i = 0; i < apps.length; i++) {
    const app = apps[i];
    const progress = `[${String(i + 1).padStart(3)}/${apps.length}]`;
    
    const result = await getAppData(app);
    results.push(result);
    
    if (result.clientId) {
      console.log(`${progress} ✓ ${result.name}`);
    } else {
      console.log(`${progress} ✗ ${result.name} — ${result.error}`);
    }
    
    if (i < apps.length - 1) {
      await new Promise(r => setTimeout(r, CONFIG.RATE_LIMIT_MS));
    }
  }
  
  // Analyze results
  console.log('\n' + '━'.repeat(50));
  console.log('%c📊 ANALYSIS', 'font-size: 14px; font-weight: bold;');
  console.log('━'.repeat(50));
  
  const byClientId = {};
  const byWorkspaceId = {};
  const accessible = [];
  const noAccess = [];
  const errors = [];
  
  for (const r of results) {
    if (r.error === 'No edit access') {
      noAccess.push(r);
    } else if (r.error) {
      errors.push(r);
    } else if (r.clientId) {
      accessible.push(r);
      
      // Group by Client ID
      if (!byClientId[r.clientId]) byClientId[r.clientId] = [];
      byClientId[r.clientId].push(r);
      
      // Group by Workspace ID
      if (r.workspaceId) {
        if (!byWorkspaceId[r.workspaceId]) byWorkspaceId[r.workspaceId] = [];
        byWorkspaceId[r.workspaceId].push(r);
      }
    }
  }
  
  // Find duplicates
  const clientIdDupes = Object.entries(byClientId).filter(([_, apps]) => apps.length > 1);
  const workspaceDupes = Object.entries(byWorkspaceId).filter(([_, apps]) => apps.length > 1);
  
  // Report Client ID duplicates
  if (clientIdDupes.length > 0) {
    console.log('\n%c🚨 DUPLICATE CLIENT IDs:', 'color: red; font-weight: bold;');
    for (const [clientId, apps] of clientIdDupes) {
      console.log(`\n  Client ID: ${clientId}`);
      const workspaces = new Set(apps.map(a => a.workspaceId));
      if (workspaces.size > 1) {
        console.log('%c  ⚠️ CROSS-WORKSPACE DUPLICATE', 'color: orange; font-weight: bold;');
      }
      for (const app of apps) {
        console.log(`    • ${app.name} (workspace: ${app.workspaceId || 'N/A'})`);
      }
    }
  } else {
    console.log('\n%c✅ No duplicate Client IDs found', 'color: green; font-weight: bold;');
  }
  
  // Report Workspace ID groupings (info, not necessarily errors)
  if (workspaceDupes.length > 0) {
    console.log('\n%c📁 Apps sharing Workspace IDs:', 'color: blue;');
    for (const [workspaceId, apps] of workspaceDupes.slice(0, 10)) {
      console.log(`\n  Workspace: ${workspaceId} (${apps.length} apps)`);
      for (const app of apps.slice(0, 5)) {
        console.log(`    • ${app.name}`);
      }
      if (apps.length > 5) {
        console.log(`    ... and ${apps.length - 5} more`);
      }
    }
    if (workspaceDupes.length > 10) {
      console.log(`\n  ... and ${workspaceDupes.length - 10} more workspaces`);
    }
  }
  
  // Summary
  console.log('\n' + '━'.repeat(50));
  console.log('%c📈 SUMMARY', 'font-size: 14px; font-weight: bold;');
  console.log('━'.repeat(50));
  console.log(`  Total apps:           ${results.length}`);
  console.log(`  Accessible (edit):    ${accessible.length}`);
  console.log(`  No edit access:       ${noAccess.length}`);
  console.log(`  Errors:               ${errors.length}`);
  console.log(`  Unique Client IDs:    ${Object.keys(byClientId).length}`);
  console.log(`  Duplicate Client IDs: ${clientIdDupes.length} groups (${clientIdDupes.reduce((sum, [_, a]) => sum + a.length, 0)} apps)`);
  console.log(`  Unique Workspaces:    ${Object.keys(byWorkspaceId).length}`);
  
  // Store results globally
  window.clientIdResults = {
    all: results,
    accessible,
    noAccess,
    errors,
    byClientId,
    byWorkspaceId,
    duplicates: {
      clientId: clientIdDupes.map(([id, apps]) => ({ id, apps })),
      workspaceId: workspaceDupes.map(([id, apps]) => ({ id, apps }))
    }
  };
  
  // Download function
  window.downloadReport = function() {
    const report = {
      generated: new Date().toISOString(),
      tool: '@create-something/webflow-apps-admin',
      version: '2.0.0',
      summary: {
        total: results.length,
        accessible: accessible.length,
        noAccess: noAccess.length,
        errors: errors.length,
        uniqueClientIds: Object.keys(byClientId).length,
        duplicateClientIdGroups: clientIdDupes.length
      },
      duplicateClientIds: clientIdDupes.map(([clientId, apps]) => ({
        clientId,
        appCount: apps.length,
        workspaceCount: new Set(apps.map(a => a.workspaceId)).size,
        apps: apps.map(a => ({ name: a.name, slug: a.slug, workspaceId: a.workspaceId }))
      })),
      allApps: results.map(r => ({
        name: r.name,
        slug: r.slug,
        clientId: r.clientId,
        workspaceId: r.workspaceId,
        error: r.error,
        editUrl: r.editUrl
      }))
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `webflow-apps-audit-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    console.log('✅ Report downloaded');
  };
  
  console.log('\n💾 Data: window.clientIdResults');
  console.log('📥 Download: downloadReport()');
  console.log('━'.repeat(50));
  
  return results;
})();

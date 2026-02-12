// CREATE SOMETHING — Zen Browser Profile
// Weniger, aber besser.
//
// Based on Better Zen (Codextor/better-zen), tuned for the CREATE SOMETHING
// Automation Infrastructure workflow: MCP development, Cloudflare Workers,
// SvelteKit, multiple IDE tabs, and long sessions.
//
// Philosophy: The browser recedes into use. Performance serves the work.
// Privacy serves autonomy. Nothing decorative.
//
// Install: Copy into your Zen profile root directory (about:profiles → Show in Finder)
// Restart Zen to apply.


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: FASTBACK — Speed & Performance
// The engine must be responsive. Eliminate friction.
// ═══════════════════════════════════════════════════════════════════════════

// --- Painting & Rendering ---

/* Reduce reflow delay for faster perceived page loads */
user_pref("content.notify.interval", 100000);

/* Larger canvas cache for graphics-heavy pages (Figma, Pencil, dashboards) */
user_pref("gfx.canvas.accelerated.cache-size", 512);

/* Conserve memory on font caching — we use few fonts intentionally */
user_pref("gfx.content.skia-font-cache-size", 20);

/* Force WebRender compositor for smooth scrolling and GPU acceleration */
user_pref("gfx.webrender.all", true);

// --- Network ---

/* Double max connections for parallel resource loading */
user_pref("network.http.max-connections", 1800);

/* More persistent connections per server — fewer handshakes */
user_pref("network.http.max-persistent-connections-per-server", 10);

/* Disable request pacing — let requests fly */
user_pref("network.http.pacing.requests.enabled", false);

// --- Session & Disk ---

/* Save session every 60s instead of 15s — reduces disk I/O */
user_pref("browser.sessionstore.interval", 60000);

/* Disable disk cache — use memory only. Faster, more private. */
user_pref("browser.cache.disk.enable", false);

/* Increase memory cache to 512MB — we have the RAM, use it for speed */
user_pref("browser.cache.memory.capacity", 524288);

// --- Media ---

/* Reasonable media read-ahead — don't hoard bandwidth */
user_pref("media.cache_readahead_limit", 7200);

/* Cap media memory cache — prevent YouTube/Loom from eating RAM */
user_pref("media.memory_cache_max_size", 65536);

// --- SSL ---

/* Smaller SSL token cache — balance memory with HTTPS perf */
user_pref("network.ssl_tokens_cache_capacity", 10240);


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: PRIVACY — Trust Boundaries
// The MCP-First Thesis: connectivity with boundaries.
// ═══════════════════════════════════════════════════════════════════════════

/* Strict content blocking — enhanced tracking protection */
user_pref("browser.contentblocking.category", "strict");

/* Disable captive portal detection — no phone-home */
user_pref("captivedetect.canonicalURL", "");
user_pref("network.captive-portal-service.enabled", false);

/* Disable network connectivity checks */
user_pref("network.connectivity-service.enabled", false);

/* Disable DNS prefetching — don't leak intent */
user_pref("network.dns.disablePrefetch", true);
user_pref("network.dns.disablePrefetchFromHTTPS", true);

/* Disable predictive networking */
user_pref("network.predictor.enabled", false);
user_pref("network.prefetch-next", false);

/* Trim cross-origin referers to scheme+host+port */
user_pref("network.http.referer.XOriginTrimmingPolicy", 2);

/* Block desktop notifications by default */
user_pref("permissions.default.desktop-notification", 2);

/* Block geolocation by default */
user_pref("permissions.default.geo", 2);

/* Clear default permissions URL */
user_pref("permissions.manager.defaultsUrl", "");

/* Disable remote safe-browsing lookups for downloads */
user_pref("browser.safebrowsing.downloads.remote.enabled", false);

/* Disable search engine auto-updates */
user_pref("browser.search.update", false);

/* Disable new tab weather (location tracking) */
user_pref("browser.newtabpage.activity-stream.showWeather", false);

// --- Certificate Handling ---

/* Use CRLite enforcement instead of OCSP — faster, more private */
user_pref("security.OCSP.enabled", 0);
user_pref("security.pki.crlite_mode", 2);

/* Block mixed content display */
user_pref("security.mixed_content.block_display_content", true);

// --- Password & Forms ---

/* Disable formless password capture */
user_pref("signon.formlessCapture.enabled", false);

/* No password capture in private browsing */
user_pref("signon.privateBrowsingCapture.enabled", false);


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: INTERFACE — Weniger, aber besser
// The browser disappears. Only the work remains.
// ═══════════════════════════════════════════════════════════════════════════

/* No about:config warning — we know what we're doing */
user_pref("browser.aboutConfig.showWarning", false);

/* Enable profile switching */
user_pref("browser.profiles.enabled", true);

/* End Private Session button */
user_pref("browser.privatebrowsing.resetPBM.enabled", true);

/* Downloads via temp dir first (security) */
user_pref("browser.download.start_downloads_in_tmp_dir", true);

/* No default browser check */
user_pref("browser.shell.checkDefaultBrowser", false);

/* Don't truncate pasted text */
user_pref("editor.truncate_user_pastes", false);

/* Auto-reject cookie banners — tool recedes */
user_pref("cookiebanners.service.mode", 1);
user_pref("cookiebanners.service.mode.privateBrowsing", 1);

/* HTTP auth in same-origin subresources only */
user_pref("network.auth.subresource-http-auth-allow", 1);

// --- Theming ---

/* Enable userChrome.css and userContent.css */
user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);

/* Enable browser chrome debugging (for live theme editing) */
user_pref("devtools.debugger.remote-enabled", true);
user_pref("devtools.chrome.enabled", true);

/* System color scheme: dark (Canon default is dark) */
user_pref("ui.systemUsesDarkTheme", 1);
user_pref("browser.theme.content-theme", 0);
user_pref("browser.theme.toolbar-theme", 0);

// --- DevTools (our primary workflow) ---

/* Dark theme for DevTools — matches Canon */
user_pref("devtools.theme", "dark");

/* Enable source maps for better debugging */
user_pref("devtools.source-map.client-service.enabled", true);

/* Show user agent shadow DOM in inspector */
user_pref("devtools.inspector.showUserAgentShadowRoots", true);


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: MEMORY — Gelassenheit
// Neither rejection nor submission. Full engagement without capture.
//
// Aggressive memory management for multi-tool workflows:
// Zen + Cursor + Zed running simultaneously means the browser must yield
// RAM to the IDEs. Background tabs are evicted early and hard.
// ═══════════════════════════════════════════════════════════════════════════

// --- Tab Unloading (proactive eviction) ---

/* Unload tabs when memory pressure is detected */
user_pref("browser.tabs.unloadOnLowMemory", true);

/* Start unloading when free memory drops below 4GB — aggressive threshold
   since Cursor and Zed need breathing room for LSP, indexing, and AI */
user_pref("browser.low_commit_space_threshold_mb", 4096);

/* Enable tab discarding infrastructure */
user_pref("browser.tabs.discard_enabled", true);

/* Unload background tabs after 5 minutes of inactivity (300000ms)
   Default is 10 minutes. Aggressive but recoverable — click to reload. */
user_pref("browser.tabs.min_inactive_duration_before_unload", 300000);

// --- Process & Memory Limits ---

/* Limit content processes to 4 (default 8). Each process has its own
   memory overhead. Fewer processes = less RAM, slight tab isolation tradeoff.
   Still enough for smooth tab switching on a multi-tool workstation. */
user_pref("dom.ipc.processCount", 4);

/* Cap WebExtension processes at 2 (default 4) — extensions share slots */
user_pref("extensions.webextensions.remote.processCount", 2);

/* Limit privileged content processes (about: pages) */
user_pref("dom.ipc.processCount.privilegedabout", 1);

// --- Cache Limits (prevent silent bloat) ---

/* Image cache: 64MB (default 256MB) — aggressive but sufficient
   for typical web browsing. Revisiting image-heavy pages may re-fetch. */
user_pref("image.mem.surfacecache.max_size_kb", 65536);

/* Decoded image limit per tab: smaller pool */
user_pref("image.mem.decode_bytes_at_a_time", 16384);

/* Media memory cache: 32MB cap (prevents YouTube/Loom RAM accumulation) */
user_pref("media.memory_cache_max_size", 32768);

// --- JavaScript GC (garbage collection) ---

/* Smaller GC slices — more frequent, shorter pauses instead of
   large infrequent collections that let heap bloat between cycles */
user_pref("javascript.options.mem.gc_incremental_slice_ms", 5);

/* Lower GC trigger threshold — start collecting sooner */
user_pref("javascript.options.mem.gc_max_empty_chunk_count", 30);

/* Compact memory more aggressively on idle */
user_pref("javascript.options.mem.gc_compacting", true);

// --- Session Restore Memory ---

/* Don't pre-load tabs on session restore — load on demand only.
   Prevents the RAM spike when Zen starts with 15+ tabs from last session. */
user_pref("browser.sessionstore.restore_on_demand", true);
user_pref("browser.sessionstore.restore_pinned_tabs_on_demand", true);

// --- Background Tab Throttling ---

/* Aggressively throttle timers in background tabs (ms) */
user_pref("dom.min_background_timeout_value", 10000);

/* Throttle tracking scripts in background tabs */
user_pref("dom.timeout.throttling_delay", 30000);

/* Suspend background tabs' requestAnimationFrame entirely */
user_pref("dom.requestAnimationFrame.enabled.in-background-tabs", false);

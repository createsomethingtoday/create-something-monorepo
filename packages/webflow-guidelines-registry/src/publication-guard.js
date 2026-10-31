// Shared browser/CLI preservation gate. Latest readback is not server CAS.
const PublicationGuard = (() => {
  function readData(html) {
    const match = html.match(/<script id="wfgr-data" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) throw new Error('Live readback is missing the registry data island; refusing reset');
    let data;
    try { data = JSON.parse(match[1].replace(/<\\\/script/gi, '</script')); }
    catch { throw new Error('Live readback contains invalid registry JSON; refusing reset'); }
    const working = data?.working;
    if (!working || !Array.isArray(working.pages) || working.pages.length === 0 ||
        !working.pages.every(p => typeof p.slug === 'string' && Array.isArray(p.sections) && p.sections.every(s => typeof s.id === 'string' && typeof s.raw === 'string')) ||
        !working.registry || typeof working.registry !== 'object' || Array.isArray(working.registry) || !Array.isArray(working.changelog)) {
      throw new Error('Live readback contains invalid working data; refusing reset');
    }
    return data;
  }
  function assertVersion(meta, expected) {
    if (!Number.isInteger(expected) || expected < 1 || meta?.latest_version !== expected) {
      throw new Error('Published version changed. Preserve drafts, reload latest, and reconcile before publishing.');
    }
  }
  async function publishExisting({ expectedVersion, readLatest, readRaw, transform, write }) {
    assertVersion(await readLatest(), expectedVersion);
    const response = await readRaw(expectedVersion);
    if (!response.ok) throw new Error(`Live readback failed (HTTP ${response.status}); refusing publish`);
    const html = await response.text();
    const data = readData(html);
    const replacement = await transform({ html, data });
    assertVersion(await readLatest(), expectedVersion);
    return write(replacement);
  }
  return { readData, assertVersion, publishExisting };
})();

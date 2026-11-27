const API = 'https://api.webflow.com/v2';
const LOADER_URL = 'https://cdn.example.com/formlight/latest/loader.js';
const SCRIPT_VERSION = '1.0.0';

function headers(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function registerLoader(siteId: string, token: string) {
  const res = await fetch(`${API}/sites/${siteId}/registered_scripts/hosted`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      displayName: 'Formlight loader',
      version: SCRIPT_VERSION,
      hostedLocation: LOADER_URL,
      canCopy: false,
    }),
  });
  return res.json();
}

export async function applyLoader(siteId: string, token: string, scriptId: string) {
  await fetch(`${API}/sites/${siteId}/custom_code`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify({
      scripts: [{ id: scriptId, location: 'footer', version: SCRIPT_VERSION }],
    }),
  });
}

export async function pushUpdate(siteId: string, token: string, sourceCode: string) {
  const res = await fetch(`${API}/sites/${siteId}/registered_scripts/inline`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      displayName: 'Formlight badge',
      version: SCRIPT_VERSION,
      sourceCode,
      canCopy: false,
    }),
  });
  return res.json();
}

export async function cleanUpScripts(siteId: string, token: string) {
  await fetch(`${API}/sites/${siteId}/custom_code`, {
    method: 'DELETE',
    headers: headers(token),
  });
}

